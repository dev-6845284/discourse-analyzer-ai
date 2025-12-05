import React, { useEffect, useState, useCallback } from 'react';
import { Quote, Person, QuoteUpdatePayload } from '../types';
import QuoteCard from './QuoteCard';
import Spinner from './Spinner';
import { StoredQuoteFilterBar } from './StoredQuoteFilterBar';
import { useStoredQuoteFilters } from '../hooks/useStoredQuoteFilters';
import api, { getStoredQuotes, updateQuote, deleteQuote } from '../utils/api';
import { loadFromStorage } from '../utils/localStorage';
import { SUPPORTED_LANGUAGES } from '../constants';

interface StoredQuotesProps {
  selectedPerson: Person | null;
  selectedAI: string;
  isApiKeySet: boolean;
  onEditSource?: (quote: Quote) => void;
}

const StoredQuotes: React.FC<StoredQuotesProps> = ({ selectedPerson, selectedAI, isApiKeySet, onEditSource }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const { filters, queryParams, hasActiveFilters, updateFilter, resetFilters } = useStoredQuoteFilters();
  const [personFilterName, setPersonFilterName] = useState('');
  const [selectedFilterPerson, setSelectedFilterPerson] = useState<Person | null>(null);

  // Sync selectedPerson prop with filter state on mount
  useEffect(() => {
    if (selectedPerson) {
      setPersonFilterName(selectedPerson.name);
      setSelectedFilterPerson(selectedPerson);
      updateFilter('personId', selectedPerson._id || '');
    }
  }, []); // Only on mount

  const handlePersonSelect = useCallback((person: Person | null) => {
    setSelectedFilterPerson(person);
    updateFilter('personId', person?._id || '');
  }, [updateFilter]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setPersonFilterName('');
    setSelectedFilterPerson(null);
  }, [resetFilters]);

  const handleAnalyze = async (quote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: true } : q));
    try {
      const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
      const response = await api.post('/quotes/analyze', {
        model: selectedAI,
        quoteText: quote.text,
        quoteLanguageCode: quote.languageCode,
        quoteLanguageName: quote.languageName,
        analysisContext: quote.analysisContext,
        links: quote.links,
        apiKeys,
      });
      const analysis = response.data;
      setQuotes(prev => prev.map(q => q.id === quote.id ? { 
        ...q, 
        analysisContext: quote.analysisContext,
        links: quote.links,
        draft: { ...q, analysis }, 
        isAnalyzing: false 
      } : q));
    } catch (err) {
      console.error('Analysis failed:', err);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: false } : q));
      // Optionally set error state
    }
  };

  const handleImprove = async (quote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isImproving: true } : q));
    try {
      const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
      const response = await api.post('/quotes/improve', {
        model: selectedAI,
        quote,
        personName: quote.personName || selectedPerson?.name || 'Unknown',
        apiKeys,
      });
      const improvedQuote = response.data;
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, draft: { ...q, ...improvedQuote }, isImproving: false } : q));
    } catch (err) {
      console.error('Improvement failed:', err);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isImproving: false } : q));
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
            ...(updatedQuoteData.analysis ? { analysis: updatedQuoteData.analysis } : {}),
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
      
    } catch (err) {
      console.error('Failed to persist accepted quote:', err);
      setError('Failed to save changes to the server.');
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
        console.log('[FETCH_QUOTES]', JSON.stringify(debugInfo, null, 2));
        
        const response = await getStoredQuotes(queryParams);
        
        console.log('[FETCH_QUOTES_SUCCESS]', {
          timestamp: new Date().toISOString(),
          quotesCount: response.data?.length || 0,
          status: response.status
        });
        
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
          personName: q.person?.name,
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
  }, [queryParams]); // Re-fetch when filters change (uses debounced text)

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-2xl font-bold text-gray-100 mb-4">
        {selectedFilterPerson ? `Stored Quotes for ${selectedFilterPerson.name}` : 'All Stored Quotes'}
      </h2>
      
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

      {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
      {error && <div className="text-red-500 p-4">{error}</div>}
      
      {!isLoading && !error && quotes.length === 0 ? (
        <p className="text-gray-500">No quotes found{hasActiveFilters ? ' matching your filters' : ''}.</p>
      ) : !isLoading && !error && (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={{ ...quote, isStored: true }}
              onAnalyze={handleAnalyze}
              onImprove={handleImprove}
              onSave={() => {}} // Stored quotes are already saved
              onLanguageChange={handleLanguageChange}
              onAccept={handleAccept}
              onDiscard={handleDiscard}
              onDelete={handleDelete}
              onEditSource={onEditSource}
              isApiKeySet={isApiKeySet}
              hideSaveButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StoredQuotes;
