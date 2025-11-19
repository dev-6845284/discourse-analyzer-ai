import { useState, useCallback } from 'react';
import { Quote, AnalysisCategory, AnalysisRating, ExportData } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { TimePeriodResult } from '../utils/timePeriod';
import api from '../utils/api';
import { loadFromStorage } from '../utils/localStorage';

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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponseError, setRawApiResponseError] = useState<string | null>(null);

  const handleLoadQuotes = useCallback((data: ExportData) => {
    setQuotes(data.quotes);
    // This is a good place to also set the person's name in the main App component
    // but for now, we'll just load the quotes.
  }, []);

  const handleError = (e: any, context: string) => {
    if (e.response?.status === 401) {
      setError('Authentication failed. Please log in again.');
      handleLogout();
    } else {
      const errorData = e.response?.data;
      let message = errorData?.message || e.message;

      // Prepend a user-friendly message for model response errors
      if (errorData?.errorType === 'ModelResponseError') {
        message = `The AI model blocked the response. Details: ${message}`;
      }

      setError(`${context} failed: ${message}`);

      if (errorData?.rawResponse) {
        setRawApiResponseError(errorData.rawResponse);
      }
    }
  };

  const handleSearch = useCallback(
    async (
      selectedAI: string,
      personName: string,
      selectedLanguages: string[],
      resultCount: number,
      temperature: number,
      maxQuoteLength: number,
      timePeriod: TimePeriodResult,
      filterCategory: AnalysisCategory | 'all',
      filterRating: AnalysisRating | 'all',
      sortOrder: 'newest' | 'oldest'
    ) => {
      if (!personName) {
        setError("Please enter a person's name.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setRawApiResponseError(null);

      try {
        const existingQuotesText = quotes.map((q) => q.text);
        const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
        const response = await api.post('/quotes/search', {
          model: selectedAI,
          personName,
          languages: selectedLanguages,
          maxQuotes: resultCount,
          context: existingQuotesText,
          temperature,
          maxQuoteLength,
          timePeriod,
          category: filterCategory,
          rating: filterRating,
          sortBy: sortOrder,
          apiKeys,
        });

        const newQuotes = response.data;

        setQuotes(newQuotes);
      } catch (e: any) {
        handleError(e, 'Search');
      } finally {
        setIsLoading(false);
      }
    },
    [quotes, handleLogout]
  );

  const handleAnalyzeQuote = useCallback(
    async (quote: Quote, selectedAI: string) => {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, isAnalyzing: true } : q))
      );
      setError(null);
      setRawApiResponseError(null);

      try {
        const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
        const response = await api.post('/quotes/analyze', {
          model: selectedAI,
          quoteText: quote.text,
          quoteLanguageCode: quote.languageCode,
          quoteLanguageName: quote.languageName,
          apiKeys,
        });
        const analysis = response.data;

        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, analysis, isAnalyzing: false } : q))
        );
      } catch (e: any) {
        handleError(e, 'Analysis');
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, isAnalyzing: false } : q))
        );
      }
    },
    [handleLogout]
  );

  const handleExtractQuotes = useCallback(
    async (
      selectedAI: string,
      personName: string,
      textToExtract: string,
      onSuccess: () => void
    ) => {
      if (!personName) {
        setError("Please enter a person's name to attribute the extracted quotes.");
        return;
      }
      if (!textToExtract) {
        setError('Please enter text to extract quotes from.');
        return;
      }

      setError(null);
      setRawApiResponseError(null);

      try {
        const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
        const response = await api.post('/quotes/extract', {
          model: selectedAI,
          personName,
          textToExtract,
          apiKeys,
        });
        const extractedQuotes = response.data;

        setQuotes((prevQuotes) => [...prevQuotes, ...extractedQuotes]);
        onSuccess();
      } catch (e: any) {
        handleError(e, 'Extraction');
      }
    },
    [quotes, handleLogout]
  );

  const handleAddQuoteManually = useCallback(
    (
      personName: string,
      textToExtract: string,
      details: {
        source: string;
        title: string;
        date: string;
        languageCode: string;
        languageName: string;
      },
      onAnalyze: (quote: Quote) => void
    ) => {
      if (!textToExtract.trim() || !personName) {
        setError("Person's name and quote text must be present to add a quote.");
        return;
      }

      const trimmedText = textToExtract.trim();

      // Prevent adding duplicate quotes
      if (quotes.some((q) => q.text === trimmedText)) {
        setError('This exact quote already exists in the list.');
        return;
      }

      const newQuote: Quote = {
        id: `quote-manual-${Date.now()}`,
        text: trimmedText,
        source: details.source,
        title: details.title || details.source,
        date: details.date,
        languageCode: details.languageCode,
        languageName: details.languageName,
      };

      setQuotes((prevQuotes) => [newQuote, ...prevQuotes]);
      setError(null);
      setRawApiResponseError(null);

      // Immediately analyze the newly added quote
      onAnalyze(newQuote);
    },
    [quotes]
  );

  const handleUpdateQuoteLanguage = useCallback((quoteId: string, newLanguageCode: string) => {
    const newLanguageName =
      SUPPORTED_LANGUAGES.find((lang) => lang.code === newLanguageCode)?.name || '';
    setQuotes((prevQuotes) =>
      prevQuotes.map((q) =>
        q.id === quoteId ? { ...q, languageCode: newLanguageCode, languageName: newLanguageName } : q
      )
    );
  }, []);

  const handleClearQuotes = useCallback(() => {
    setQuotes([]);
  }, []);

  const handleImproveQuote = useCallback(
    async (quote: Quote, selectedAI: string, personName: string) => {
      if (!personName) {
        setError("Please enter a person's name to improve quotes.");
        return;
      }

      setQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, isImproving: true } : q))
      );
      setError(null);
      setRawApiResponseError(null);

      try {
        const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
        const response = await api.post('/quotes/improve', {
          model: selectedAI,
          quote,
          personName,
          apiKeys,
        });
        const improvedQuote = response.data;

        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...improvedQuote, isImproving: false } : q))
        );
      } catch (e: any) {
        handleError(e, 'Quote improvement');
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, isImproving: false } : q))
        );
      }
    },
    [handleLogout]
  );

  const clearError = useCallback(() => {
    setError(null);
    setRawApiResponseError(null);
  }, []);

  return {
    quotes,
    isLoading,
    error,
    rawApiResponseError,
    handleSearch,
    handleAnalyzeQuote,
    handleExtractQuotes,
    handleAddQuoteManually,
    handleUpdateQuoteLanguage,
    handleClearQuotes,
    handleImproveQuote,
    clearError,
    handleLoadQuotes,
  };
}