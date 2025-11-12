import { useState, useCallback } from 'react';
import { Quote } from '../types';
import {
  fetchQuotesForPerson as fetchQuotesGemini,
  analyzeQuoteText as analyzeQuoteGemini,
  extractQuotesFromText as extractQuotesGemini,
  improveQuote as improveQuoteGemini,
  JsonParsingError as JsonParsingErrorGemini,
} from '../services/geminiService';
import {
  fetchQuotesForPerson as fetchQuotesGrok,
  analyzeQuoteText as analyzeQuoteGrok,
  extractQuotesFromText as extractQuotesGrok,
  improveQuote as improveQuoteGrok,
  JsonParsingError as JsonParsingErrorGrok,
} from '../services/grokService';
import { SUPPORTED_LANGUAGES } from '../constants';
import { AIProvider } from './useApiKeys';
import { TimePeriodResult } from '../utils/timePeriod';

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawApiResponseError, setRawApiResponseError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (
      apiKey: string,
      selectedAI: AIProvider,
      personName: string,
      selectedLanguages: string[],
      resultCount: number,
      temperature: number,
      maxQuoteLength: number,
      timePeriod: TimePeriodResult
    ) => {
      if (!apiKey) {
        setError(
          `Please enter your ${selectedAI === 'gemini' ? 'Gemini' : 'Grok'} API key in the Settings section.`
        );
        return;
      }
      if (!personName) {
        setError("Please enter a person's name.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setRawApiResponseError(null);

      try {
        const existingQuotesText = quotes.map((q) => q.text);
        const newQuotes =
          selectedAI === 'gemini'
            ? await fetchQuotesGemini(
                apiKey,
                personName,
                selectedLanguages,
                resultCount,
                existingQuotesText,
                temperature,
                maxQuoteLength,
                timePeriod
              )
            : await fetchQuotesGrok(
                apiKey,
                personName,
                selectedLanguages,
                resultCount,
                existingQuotesText,
                temperature,
                maxQuoteLength,
                timePeriod
              );

        const uniqueNewQuotes = newQuotes.filter(
          (nq) => !quotes.some((eq) => eq.text === nq.text)
        );

        if (uniqueNewQuotes.length === 0) {
          setError('No new quotes were found. Try a different search or clear existing quotes.');
        } else {
          setQuotes((prevQuotes) => [...prevQuotes, ...uniqueNewQuotes]);
        }
      } catch (e: any) {
        if (e instanceof JsonParsingErrorGemini || e instanceof JsonParsingErrorGrok) {
          setError(`Search failed: ${e.message}`);
          setRawApiResponseError(e.rawResponse);
        } else {
          setError(`Search failed: ${e.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [quotes]
  );

  const handleAnalyzeQuote = useCallback(
    async (quote: Quote, apiKey: string, selectedAI: AIProvider) => {
      if (!apiKey) {
        setError(
          `Please enter your ${selectedAI === 'gemini' ? 'Gemini' : 'Grok'} API key to analyze quotes.`
        );
        return;
      }

      setQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, isAnalyzing: true } : q))
      );
      setError(null);
      setRawApiResponseError(null);

      try {
        const analysis =
          selectedAI === 'gemini'
            ? await analyzeQuoteGemini(apiKey, quote.text, quote.languageCode, quote.languageName)
            : await analyzeQuoteGrok(apiKey, quote.text, quote.languageCode, quote.languageName);

        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, analysis, isAnalyzing: false } : q))
        );
      } catch (e: any) {
        if (e instanceof JsonParsingErrorGemini || e instanceof JsonParsingErrorGrok) {
          setError(`Analysis failed: ${e.message}`);
          setRawApiResponseError(e.rawResponse);
        } else {
          setError(`Analysis failed: ${e.message}`);
        }
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, isAnalyzing: false } : q))
        );
      }
    },
    []
  );

  const handleExtractQuotes = useCallback(
    async (
      apiKey: string,
      selectedAI: AIProvider,
      personName: string,
      textToExtract: string,
      onSuccess: () => void
    ) => {
      if (!apiKey) {
        setError(
          `Please enter your ${selectedAI === 'gemini' ? 'Gemini' : 'Grok'} API key to extract quotes.`
        );
        return;
      }
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
        const extractedQuotes =
          selectedAI === 'gemini'
            ? await extractQuotesGemini(apiKey, personName, textToExtract)
            : await extractQuotesGrok(apiKey, personName, textToExtract);

        const uniqueNewQuotes = extractedQuotes.filter(
          (nq) => !quotes.some((eq) => eq.text === nq.text)
        );

        if (uniqueNewQuotes.length === 0) {
          setError('No new, unique quotes were extracted from the text.');
        } else {
          setQuotes((prevQuotes) => [...prevQuotes, ...uniqueNewQuotes]);
          onSuccess();
        }
      } catch (e: any) {
        if (e instanceof JsonParsingErrorGemini || e instanceof JsonParsingErrorGrok) {
          setError(`Extraction failed: ${e.message}`);
          setRawApiResponseError(e.rawResponse);
        } else {
          setError(`Extraction failed: ${e.message}`);
        }
      }
    },
    [quotes]
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
    async (quote: Quote, apiKey: string, selectedAI: AIProvider, personName: string) => {
      if (!apiKey) {
        setError(
          `Please enter your ${selectedAI === 'gemini' ? 'Gemini' : 'Grok'} API key to improve quotes.`
        );
        return;
      }

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
        const improvedQuote =
          selectedAI === 'gemini'
            ? await improveQuoteGemini(apiKey, quote, personName)
            : await improveQuoteGrok(apiKey, quote, personName);

        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...improvedQuote, isImproving: false } : q))
        );
      } catch (e: any) {
        if (e instanceof JsonParsingErrorGemini || e instanceof JsonParsingErrorGrok) {
          setError(`Quote improvement failed: ${e.message}`);
          setRawApiResponseError(e.rawResponse);
        } else {
          setError(`Quote improvement failed: ${e.message}`);
        }
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, isImproving: false } : q))
        );
      }
    },
    []
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
  };
}
