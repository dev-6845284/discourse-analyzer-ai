import { useState } from 'react';
import { useQuoteSearch } from './useQuoteSearch';
import { useQuoteActions } from './useQuoteActions';
import { useQuoteExtraction } from './useQuoteExtraction';

// Custom error class for JSON parsing failures from the backend
export class JsonParsingError extends Error {
  rawResponse?: string;

  constructor(message: string, rawResponse?: string) {
    super(message);
    this.name = 'JsonParsingError';
    this.rawResponse = rawResponse;
  }
}

export function useQuotes(handleLogout: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponseError, setRawApiResponseError] = useState<string | null>(null);

  const search = useQuoteSearch(handleLogout);
  const actions = useQuoteActions(
    search.quotes,
    search.setQuotes,
    setError,
    setRawApiResponseError,
    handleLogout
  );
  const extraction = useQuoteExtraction(
    search.setQuotes,
    setError,
    setRawApiResponseError
  );

  return {
    quotes: search.quotes,
    articles: search.articles,
    isLoading: search.isLoading,
    error: error || search.error,
    rawApiResponseError,
    handleSearch: search.handleSearch,
    handleCancelSearch: search.handleCancelSearch,
    handleAnalyzeQuote: actions.handleAnalyzeQuote,
    handleExtractQuotes: extraction.handleExtractQuotes,
    handleExtractFromUrl: extraction.handleExtractFromUrl,
    handleAddQuoteManually: extraction.handleAddQuoteManually,
    handleUpdateQuoteLanguage: extraction.handleUpdateQuoteLanguage,
    handleClearQuotes: search.handleClearQuotes,
    handleImproveQuote: actions.handleImproveQuote,
    handleAcceptQuote: actions.handleAcceptQuote,
    handleDiscardQuote: actions.handleDiscardQuote,
    handleRemoveQuote: actions.handleRemoveQuote,
    clearError: search.clearError,
    handleLoadQuotes: extraction.handleLoadQuotes,
    markQuoteAsStored: extraction.markQuoteAsStored
  };
}