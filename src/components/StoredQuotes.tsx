import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Quote, Person, QuoteUpdatePayload } from '../types';
import QuoteCard from './QuoteCard';
import Spinner from './Spinner';
import EditQuoteModal from './EditQuoteModal';
import { useI18n } from '../i18n';

/*
 * ⚠️ NOTE: StoredQuotes and SearchResults share similar UI and behavior for displaying quotes
 * and handling AI-model related actions (e.g., the `selectedAI` prop, `onAnalyze` payloads,
 * and how analysis results are processed/saved).
 *
 * When you update model selection UI, API payload shapes, or analysis/save logic in one
 * component, please check and apply equivalent changes to the other component to keep
 * behavior consistent and avoid subtle bugs.
 */

import { StoredQuoteFilterBar } from './StoredQuoteFilterBar';
import { useStoredQuoteFilters } from '../hooks/useStoredQuoteFilters';
import api, { getStoredQuotes, updateQuote, deleteQuote, formatApiError } from '../utils/api';

import { SUPPORTED_LANGUAGES } from '../constants';

interface StoredQuotesProps {
  selectedPerson: Person | null;
  selectedAI: string;
  isApiKeySet: boolean;

  userRole?: string;
  refreshTrigger?: number;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport?: () => void;
}

const StoredQuotes: React.FC<StoredQuotesProps> = ({ selectedPerson, selectedAI, isApiKeySet, userRole, refreshTrigger, onImport, onExport }) => {
  const { t } = useI18n();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  const overrides = useMemo(() => {
    return selectedPerson ? { personId: selectedPerson._id } : {};
  }, [selectedPerson]);

  // Filter state
  const { filters, queryParams, hasActiveFilters, updateFilter, resetFilters } = useStoredQuoteFilters(overrides);
  const [personFilterName, setPersonFilterName] = useState(selectedPerson?.name || '');
  const [selectedFilterPerson, setSelectedFilterPerson] = useState<Person | null>(selectedPerson);

  // Sync selectedPerson prop with filter state
  useEffect(() => {
    if (selectedPerson && selectedPerson._id !== filters.personId) {
      setPersonFilterName(selectedPerson.name);
      setSelectedFilterPerson(selectedPerson);
      updateFilter('personId', selectedPerson._id || '');
    }
  }, [selectedPerson, filters.personId, updateFilter]);

  const handlePersonSelect = useCallback((person: Person | null) => {
    setSelectedFilterPerson(person);
    updateFilter('personId', person?._id || '');
  }, [updateFilter]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setPersonFilterName('');
    setSelectedFilterPerson(null);
  }, [resetFilters]);

  const handleAnalyze = async (quote: Quote, model: string, analysisType?: 'audit' | 'flaws') => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: true } : q));
    const personId = (quote.person && typeof quote.person === 'object')
      ? (quote.person as Person)._id
      : (typeof quote.person === 'string' ? quote.person : selectedPerson?._id);
    const personName = (quote.person && typeof quote.person === 'object')
      ? (quote.person as Person).name
      : quote.personName || selectedPerson?.name;

    try {
      const response = await api.post('/quotes/analyze', {
        model,
        analysisType,
        quoteText: quote.text,
        quoteLanguageCode: quote.languageCode,
        quoteLanguageName: quote.languageName,
        personId,
        personName,
        analysisContext: quote.analysisContext,
        links: quote.links,
      });
      // Server now returns AuditResult
      const audit = response.data;
      setQuotes(prev => prev.map(q => q.id === quote.id ? {
        ...q,
        analysisContext: quote.analysisContext,
        links: quote.links,
        draft: { ...q, audit },
        isAnalyzing: false
      } : q));
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: false } : q));
      setError(formatApiError(err, 'Analysis failed'));
    }
  };

  const handleImprove = async (quote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isImproving: true } : q));
    try {
      const personName = (quote.person && typeof quote.person === 'object')
        ? (quote.person as Person).name
        : quote.personName || selectedPerson?.name || 'Unknown';
      const response = await api.post('/quotes/improve', {
        model: selectedAI,
        quote,
        personName,
      });
      const improvedQuote = response.data;
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, draft: { ...q, ...improvedQuote }, isImproving: false } : q));
    } catch (err: any) {
      console.error('Improvement failed:', err);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isImproving: false } : q));
      setError(formatApiError(err, 'Improvement failed'));
    }
  };

  const handleAccept = async (quote: Quote) => {
    if (!quote.draft) return;

    // Ensure we reset loading states when merging draft
    const updatedQuoteData = {
      ...quote,
      ...quote.draft,
      draft: undefined,
      isAnalyzing: false,
      isImproving: false
    };

    // Optimistic update
    setQuotes(prev => prev.map(q => q.id === quote.id ? updatedQuoteData : q));

    try {
      // Persist to backend
      // We need to map the frontend Quote structure back to what the backend expects for update
      // Or simply send the fields we want to update.
      // The backend updateQuote expects the body to be the fields to update.

      const updatePayload: QuoteUpdatePayload = {
        text: updatedQuoteData.text,
        analysisContext: updatedQuoteData.analysisContext,
        sourceUrl: updatedQuoteData.source,
        date: updatedQuoteData.date,
        metadata: {
          // Support both legacy analysis and new audit
          ...(updatedQuoteData.analysis ? { analysis: updatedQuoteData.analysis } : {}),
          ...(updatedQuoteData.audit ? { audit: updatedQuoteData.audit } : {}),
          languageCode: updatedQuoteData.languageCode,
          languageName: updatedQuoteData.languageName,
          title: updatedQuoteData.title,
          links: updatedQuoteData.links
        }
      };

      // Include audit metadata for analysis
      const auditPayload = {
        ...updatePayload,
        analyzedByProvider: selectedAI,
        analyzedAt: new Date().toISOString()
      };

      await updateQuote(quote.id, auditPayload);

    } catch (err: any) {
      console.error('Failed to persist accepted quote:', err);
      setError(formatApiError(err, 'Failed to save changes'));
      // Revert optimistic update? Or just show error.
      // For now, just show error.
    }
  };

  const handleDiscard = (quote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, draft: undefined } : q));
  };

  const handleLanguageChange = async (quoteId: string, newLanguageCode: string) => {
    try {
      // Find the quote to get its current data
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) return;

      // Find the language name from supported languages
      const selectedLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === newLanguageCode);
      const newLanguageName = selectedLanguage?.name || quote.languageName;

      // Optimistic update
      setQuotes(prev => prev.map(q =>
        q.id === quoteId
          ? {
            ...q,
            languageCode: newLanguageCode,
            languageName: newLanguageName,
            metadata: { ...q.metadata, languageCode: newLanguageCode, languageName: newLanguageName }
          }
          : q
      ));

      // Update on backend
      const updatePayload: QuoteUpdatePayload = {
        text: quote.text,
        analysisContext: quote.analysisContext,
        sourceUrl: quote.source,
        date: quote.date,
        metadata: {
          ...quote.metadata,
          languageCode: newLanguageCode,
          languageName: newLanguageName,
          title: quote.title,
          links: quote.links
        }
      };

      await updateQuote(quoteId, updatePayload);
    } catch (err) {
      console.error('Failed to update quote language:', err);
      setError('Failed to update quote language.');
      // Revert optimistic update
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        setQuotes(prev => prev.map(q =>
          q.id === quoteId
            ? {
              ...q,
              languageCode: quote.languageCode,
              languageName: quote.languageName,
              metadata: { ...q.metadata, languageCode: quote.languageCode, languageName: quote.languageName }
            }
            : q
        ));
      }
    }
  };

  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);
  };

  const handleSaveEdit = async (updatedQuote: Quote) => {
    setIsLoading(true);
    try {
      // Optimistic update
      setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));

      const updatePayload: QuoteUpdatePayload = {
        text: updatedQuote.text,
        person: typeof updatedQuote.person === 'object' ? (updatedQuote.person as Person)._id : updatedQuote.person,
        sourceUrl: updatedQuote.source,
        analysisContext: updatedQuote.analysisContext,
        date: updatedQuote.date,
        metadata: {
          ...updatedQuote.metadata,
          title: updatedQuote.title
        },
        // Audit fields if present
        ...(updatedQuote.audit ? {
          analyzedByProvider: updatedQuote.analyzedByProvider, // Preserve provider if not changed
          analyzedAt: updatedQuote.analyzedAt
        } : {})
      };

      if (updatedQuote.audit) {
        updatePayload.metadata = {
          ...updatePayload.metadata,
          audit: updatedQuote.audit
        };
      }

      await updateQuote(updatedQuote.id!, updatePayload);
      setEditingQuote(null);
    } catch (err) {
      console.error('Failed to update quote:', err);
      setError('Failed to save quote changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (quote: Quote) => {
    if (!window.confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteQuote(quote.id);
      setQuotes(prev => prev.filter(q => q.id !== quote.id));
    } catch (err) {
      console.error('Failed to delete quote:', err);
      setError('Failed to delete quote from the server.');
    }
  };

  const handleVisibilityChange = async (quoteId: string, visibility: 'public' | 'private') => {
    try {
      // Optimistic update
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, visibility } : q));

      await updateQuote(quoteId, { visibility });
    } catch (err) {
      console.error('Failed to update quote visibility:', err);
      setError('Failed to update quote visibility.');
      // Revert optimistic update
      // (This would require re-fetching or knowing previous state, simplifying for now by just logging)
    }
  };

  useEffect(() => {
    const fetchQuotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Log request details
        const debugInfo = {
          timestamp: new Date().toISOString(),
          action: 'FETCH_STORED_QUOTES',
          queryParams,
          credentials: 'include'
        };
        // console.log('[FETCH_QUOTES]', JSON.stringify(debugInfo, null, 2));

        const response = await getStoredQuotes(queryParams);

        // console.log('[FETCH_QUOTES_SUCCESS]', {
        //   timestamp: new Date().toISOString(),
        //   quotesCount: response.data?.length || 0,
        //   status: response.status
        // });

        // Map backend quotes to frontend Quote interface
        const mappedQuotes: Quote[] = response.data.map((q: any) => ({
          id: q._id,
          text: q.text,
          source: q.sourceUrl || '',
          title: q.metadata?.title || 'Stored Quote',
          date: q.date,
          languageCode: q.metadata?.languageCode || 'en',
          languageName: q.metadata?.languageName || 'English',
          analysis: q.metadata?.analysis,
          audit: q.metadata?.audit,
          personName: q.person?.name,
          person: q.person,
          analysisContext: q.analysisContext,
          links: q.metadata?.links,
          metadata: q.metadata,
          // New fields for edit functionality
          contentAnalysisId: q.contentAnalysisId,
          originIds: q.originIds,
          isDeprecated: q.isDeprecated,
          // Audit fields
          savedByUser: q.savedByUser,
          savedByName: q.savedByName,
          savedAt: q.savedAt,
          analyzedByUser: q.analyzedByUser,
          analyzedByName: q.analyzedByName,
          analyzedByProvider: q.analyzedByProvider,
          analyzedAt: q.analyzedAt,
          improvedByUser: q.improvedByUser,
          improvedByName: q.improvedByName,
          improvedByProvider: q.improvedByProvider,
          improvedAt: q.improvedAt,
          visibility: q.visibility || 'private', // Default to private if missing
        }));
        setQuotes(mappedQuotes);
      } catch (err: any) {
        const errorInfo = {
          timestamp: new Date().toISOString(),
          action: 'FETCH_QUOTES_ERROR',
          error: err.message,
          response: {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data
          },
          requestDetails: {
            url: err.config?.url,
            method: err.config?.method,
            withCredentials: err.config?.withCredentials
          }
        };
        console.error('[FETCH_QUOTES_ERROR]', JSON.stringify(errorInfo, null, 2));
        setError('Failed to load stored quotes.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [queryParams, refreshTrigger]); // Re-fetch when filters change or refreshTrigger updates

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
          {selectedFilterPerson ? t('storedQuotesFor', { name: selectedFilterPerson.name }) : t('allStoredQuotes')}
        </h2>
        <div className="flex gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm border border-gray-300 dark:border-transparent"
              title={t('exportToJSON')}
            >
              {t('export')}
            </button>
          )}
          {onImport && (
            <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm cursor-pointer border border-gray-300 dark:border-transparent" title={t('importFromJSON')}>
              {t('import')}
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <StoredQuoteFilterBar
        filters={filters}
        personName={personFilterName}
        onPersonNameChange={setPersonFilterName}
        onPersonSelect={handlePersonSelect}
        onFilterChange={updateFilter}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters || !!selectedFilterPerson}
      />

      {isLoading && <div className="flex justify-center p-8 text-cyan-600 dark:text-cyan-400"><Spinner /></div>}
      {error && <div className="text-red-500 p-4">{error}</div>}

      {!isLoading && !error && quotes.length === 0 ? (
        <p className="text-gray-500">{hasActiveFilters ? t('noQuotesMatchingFilters') : t('noQuotesFound')}.</p>
      ) : !isLoading && !error && (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={{ ...quote, isStored: true }}
              onAnalyze={handleAnalyze}
              onImprove={handleImprove}
              onSave={() => { }} // Stored quotes are already saved
              onLanguageChange={handleLanguageChange}
              onAccept={handleAccept}
              onDiscard={handleDiscard}
              onDelete={handleDelete}
              onEdit={handleEdit}

              onVisibilityChange={handleVisibilityChange}
              isApiKeySet={isApiKeySet}
              hideSaveButton={true}
              selectedAI={selectedAI}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {editingQuote && (
        <EditQuoteModal
          isOpen={true}
          onClose={() => setEditingQuote(null)}
          onSave={handleSaveEdit}
          quote={editingQuote}
        />
      )}
    </div>
  );
};

export default StoredQuotes;
