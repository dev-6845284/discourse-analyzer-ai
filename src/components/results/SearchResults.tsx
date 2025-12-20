import React from 'react';
import ErrorDisplay from './ErrorDisplay';
import QuoteCard from '../QuoteCard';
import { Quote } from '../../types';

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
  onAnalyze: (quote: Quote, model: string) => void;
  onImprove: (quote: Quote) => void;
  onSave: (quote: Quote) => void;
  onLanguageChange: (id: string, lang: string) => void;
  onAccept: (quote: Quote) => void;
  onDiscard: (quote: Quote) => void;
  onRemove: (quote: Quote) => void;
  onEditSource?: (quote: Quote) => void;
  clearError: () => void;
  selectedAI: string;
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
}) => {
  return (
    <>
      <ErrorDisplay
        error={error}
        rawApiResponseError={rawApiResponseError}
        clearError={clearError}
      />

      <div className="p-4 bg-gray-800/50 rounded-lg mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-cyan-300 mb-2">
            Results ({results.length})
          </h2>
          {personName && (
            <p className="text-gray-400">
              Showing quotes for:{' '}
              <span className="font-bold text-gray-300">{personName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <div className="flex rounded-md bg-gray-700">
              <button
                onClick={() => setSortOrder('newest')}
                className={`px-3 py-1 text-sm font-medium transition-colors rounded-l-md ${
                  sortOrder === 'newest'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortOrder('oldest')}
                className={`px-3 py-1 text-sm font-medium transition-colors rounded-r-md ${
                  sortOrder === 'oldest'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600'
                }`}
              >
                Oldest
              </button>
            </div>
          </div>
          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Clear All
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onAnalyze={(q) => onAnalyze(q, selectedAI)}
              onImprove={onImprove}
              onSave={onSave}
              onLanguageChange={onLanguageChange}
              onAccept={onAccept}
              onDiscard={onDiscard}
              onRemove={onRemove}
              isApiKeySet={true}
              selectedAI={selectedAI}
            />
          ))}
        </div>
      )}
    </>
  );
};
