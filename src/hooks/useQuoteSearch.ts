import { useState, useCallback, useRef } from 'react';
import { Quote, ArticleRecommendation, Person } from '../types';
import { TimePeriodResult } from '../utils/timePeriod';
import { AnalysisCategory, AnalysisRating } from '../types';
import api, { agenticSearch, formatApiError } from '../utils/api';
import { loadFromStorage } from '../utils/localStorage';

export function useQuoteSearch(handleLogout: () => void) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [articles, setArticles] = useState<ArticleRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponseError, setRawApiResponseError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError('Search cancelled by user.');
    }
  }, []);

  const handleError = (e: any, context: string) => {
    if (e.response?.status === 401) {
      setError('Authentication failed. Please log in again.');
      handleLogout();
    } else {
      setError(formatApiError(e, `${context} failed`));

      if (e.response?.data?.rawResponse) {
        setRawApiResponseError(e.response.data.rawResponse);
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
      sortOrder: 'newest' | 'oldest',
      isAgentic: boolean = false,
      agenticMode: 'quotes' | 'articles' = 'quotes',
      person?: Person
    ) => {
      if (!personName) {
        setError("Please enter a person's name.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setRawApiResponseError(null);
      setArticles([]);

      abortControllerRef.current = new AbortController();

      try {
        const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
        const personPayload = person || (personName ? { name: personName } : undefined);

        if (isAgentic) {
          const response = await agenticSearch(
            personName,
            timePeriod,
            selectedLanguages,
            { mode: agenticMode },
            apiKeys,
            abortControllerRef.current.signal
          );

          if (response.data.type === 'quotes') {
            const quotesWithPerson = (response.data.data as Quote[]).map((q) => ({
              ...q,
              personName: q.personName || personPayload?.name || personName,
              person: (q as any).person || personPayload,
            }));
            setQuotes(quotesWithPerson);
          } else if (response.data.type === 'articles') {
            setArticles(response.data.data as ArticleRecommendation[]);
            setQuotes([]);
          }
        } else {
          const existingQuotesText = quotes.map((q) => q.text);
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
          }, { signal: abortControllerRef.current.signal });

          const newQuotes = (response.data as Quote[]).map((q) => ({
            ...q,
            personName: q.personName || personPayload?.name || personName,
            person: (q as any).person || personPayload,
          }));
          setQuotes(newQuotes);
        }
      } catch (e: any) {
        if (e.name === 'CanceledError' || e.message === 'canceled') {
          return;
        }
        handleError(e, 'Search');
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [quotes, handleLogout]
  );

  const handleClearQuotes = useCallback(() => {
    setQuotes([]);
    setArticles([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRawApiResponseError(null);
  }, []);

  return {
    quotes,
    setQuotes,
    articles,
    setArticles,
    isLoading,
    error,
    rawApiResponseError,
    handleSearch,
    handleCancelSearch,
    handleClearQuotes,
    clearError,
  };
}
