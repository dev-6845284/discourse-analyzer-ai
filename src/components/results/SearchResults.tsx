/**
 * SearchResults Component
 *
 * Purpose:
 * - Displays a list of transient `Quote` objects resulting from a search or scrap operation.
 * - Similar to `StoredQuotes` but handles non-persisted data or temporary search results.
 *
 * Behavior:
 * - Renders a list of `QuoteCard` components.
 * - Provides controls for sorting, clearing results, and exporting/importing.
 * - Delegates analysis and save actions to parent handlers.
 *
 * Location: src/components/results/SearchResults.tsx
 */
import React from 'react';
import ErrorDisplay from './ErrorDisplay';
import QuoteCard from '../quotes/QuoteCard';
import { Quote } from '../../types';
import { useI18n } from '../../i18n';

/*
 * ⚠️ NOTE: SearchResults and StoredQuotes share similar UI and behavior for displaying quotes
 * and handling AI-model related actions (e.g., the `selectedAI` prop, `onAnalyze` payloads,
 * and how analysis results are processed/saved).
 *
 * When you update model selection UI, API payload shapes, or analysis/save logic in one
 * component, please check and apply equivalent changes to the other component to keep
 * behavior consistent and avoid subtle bugs.
 */

interface SearchResultsProps {
  results: Quote[];
  error: string | null;
  rawApiResponseError: string | null;
  personName: string;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (order: 'newest' | 'oldest') => void;
  onClear: () => void;
  onAnalyze: (quote: Quote, model: string, analysisType?: 'audit' | 'flaws') => void;
  onImprove: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
  onLanguageChange: (id: string, lang: string) => void;
  onAccept: (quote: Quote) => void;
  onDiscard: (quote: Quote) => void;
  onRemove: (quote: Quote) => void;
  onEditSource?: (quote: Quote) => void;
  clearError: () => void;
  selectedAI: string;
  statusFilters: {
    isAnalyzed: 'all' | 'true' | 'false';
    setIsAnalyzed: (value: 'all' | 'true' | 'false') => void;
    isImproved: 'all' | 'true' | 'false';
    setIsImproved: (value: 'all' | 'true' | 'false') => void;
  };
  onExport?: () => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userRole?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  error,
  rawApiResponseError,
  personName,
  sortOrder,
  setSortOrder,
  onClear,
  onAnalyze,
  onImprove,
  onSave,
  onLanguageChange,
  onAccept,
  onDiscard,
  onRemove,
  onEditSource,
  clearError,
  selectedAI,
  statusFilters,
  onExport,
  onImport,
  userRole,
}) => {
  const { t } = useI18n();
  const sf = statusFilters || { isAnalyzed: 'all' as const, setIsAnalyzed: (_: any) => { }, isImproved: 'all' as const, setIsImproved: (_: any) => { } };
  return (
    <>
      <ErrorDisplay
        error={error}
        rawApiResponseError={rawApiResponseError}
        clearError={clearError}
      />

      <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg mb-6 flex flex-wrap gap-4 items-center justify-between border border-gray-200 dark:border-transparent">
        <div>
          <h2 className="text-2xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
            {t('results', { count: results.length })}
          </h2>
          {personName && (
            <p className="text-gray-500 dark:text-gray-400">
              Showing quotes for:{' '}
              <span className="font-bold text-gray-700 dark:text-gray-300">{personName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('sortBy')}</span>
            <div className="flex rounded-md bg-gray-200 dark:bg-gray-700 p-0.5">
              <button
                onClick={() => setSortOrder('newest')}
                className={`px-3 py-1 text-sm font-medium transition-colors rounded-l-[4px] ${sortOrder === 'newest'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                {t('newest')}
              </button>
              <button
                onClick={() => setSortOrder('oldest')}
                className={`px-3 py-1 text-sm font-medium transition-colors rounded-r-[4px] ${sortOrder === 'oldest'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                {t('oldest')}
              </button>
            </div>
          </div>

          {/* Export / Import */}
          {onExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm border border-gray-300 dark:border-transparent"
            >
              {t('export')}
            </button>
          )}
          {onImport && (
            <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm cursor-pointer border border-gray-300 dark:border-transparent">
              {t('import')}
              <input type="file" accept=".json" onChange={onImport} className="hidden" />
            </label>
          )}

          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            {t('clearAll')}
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-800/40 rounded-md border border-gray-100 dark:border-transparent">
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('analyzed')}</label>
            <select
              value={sf.isAnalyzed}
              onChange={(e) => sf.setIsAnalyzed(e.target.value as 'all' | 'true' | 'false')}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            >
              <option value="all">{t('all')}</option>
              <option value="true">{t('analyzed')}</option>
              <option value="false">{`Not ${t('analyzed')}`}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('improved')}</label>
            <select
              value={sf.isImproved}
              onChange={(e) => sf.setIsImproved(e.target.value as 'all' | 'true' | 'false')}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            >
              <option value="all">{t('all')}</option>
              <option value="true">{t('improved')}</option>
              <option value="false">{`Not ${t('improved')}`}</option>
            </select>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onAnalyze={onAnalyze}
              onImprove={onImprove}
              onSave={onSave}
              onLanguageChange={onLanguageChange}
              onAccept={onAccept}
              onDiscard={onDiscard}
              onRemove={onRemove}
              isApiKeySet={true}
              selectedAI={selectedAI}
              userRole={userRole}
            />
          ))}
        </div>
      )}
    </>
  );
};
