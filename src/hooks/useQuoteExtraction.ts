import { useCallback } from 'react';
import { Quote, ExportData, Person } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import api, { extractFromUrl } from '../utils/api';
import { loadFromStorage } from '../utils/localStorage';

export function useQuoteExtraction(
  quotes: Quote[],
  setQuotes: (quotes: Quote[] | ((prev: Quote[]) => Quote[])) => void,
  setError: (error: string | null) => void,
  setRawApiResponseError: (error: string | null) => void,
  handleLogout: () => void
) {
  const handleExtractQuotes = useCallback(
    async (
      selectedAI: string,
      personName: string,
      textToExtract: string,
      details: { source: string; title: string; date: string; languageCode: string; languageName: string; },
      onSuccess: () => void,
      person?: Person
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
        const personPayload = person || { name: personName };
        const response = await api.post('/quotes/extract', {
          model: selectedAI,
          personName,
          textContent: textToExtract,
          ...details,
          apiKeys,
        });
        const extractedQuotes = (response.data as Quote[]).map((q) => ({
          ...q,
          personName: q.personName || personPayload.name,
          person: (q as any).person || personPayload,
        }));

        setQuotes((prevQuotes) => [...prevQuotes, ...extractedQuotes]);
        onSuccess();
      } catch (e: any) {
        setError(`Extraction failed: ${e.response?.data?.message || e.message}`);
        if (e.response?.data?.rawResponse) {
          setRawApiResponseError(e.response.data.rawResponse);
        }
      }
    },
    [quotes, setQuotes, setError, setRawApiResponseError, handleLogout]
  );

  const handleExtractFromUrl = useCallback(
    async (
      selectedAI: string,
      personName: string,
      url: string,
      temperature: number,
      onStatusChange: (status: string) => void,
      onSuccess: () => void,
      person?: Person
    ) => {
      if (!personName) {
        setError("Please enter a person's name to attribute the extracted quotes.");
        return;
      }
      if (!url) {
        setError('Please enter a URL to extract quotes from.');
        return;
      }

      setError(null);
      setRawApiResponseError(null);

      try {
        onStatusChange('Fetching article...');
        const apiKeys = loadFromStorage<Record<string, string>>('apiKeys');
        
        onStatusChange('Extracting quotes from article...');
        const response = await extractFromUrl(url, personName, selectedAI, temperature, apiKeys || {});
        
        const { quotes: extractedQuotes } = response.data;

        if (extractedQuotes && extractedQuotes.length > 0) {
          const personPayload = person || { name: personName };
          const enrichedQuotes = (extractedQuotes as Quote[]).map((q) => ({
            ...q,
            personName: q.personName || personPayload.name,
            person: (q as any).person || personPayload,
          }));
          setQuotes((prevQuotes) => [...prevQuotes, ...enrichedQuotes]);
        }
        
        onSuccess();
      } catch (e: any) {
        setError(`URL extraction failed: ${e.response?.data?.message || e.message}`);
        if (e.response?.data?.rawResponse) {
          setRawApiResponseError(e.response.data.rawResponse);
        }
      }
    },
    [quotes, setQuotes, setError, setRawApiResponseError, handleLogout]
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
      onAnalyze: (quote: Quote, analysisType?: 'audit'|'flaws') => void,
      person?: Person
    ) => {
      if (!textToExtract.trim() || !personName) {
        setError("Person's name and quote text must be present to add a quote.");
        return;
      }

      const trimmedText = textToExtract.trim();

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
        personName,
        person: person || { name: personName },
      };

      setQuotes((prevQuotes) => [newQuote, ...prevQuotes]);
      setError(null);
      setRawApiResponseError(null);

      onAnalyze(newQuote);
    },
    [quotes, setQuotes, setError, setRawApiResponseError]
  );

  const handleUpdateQuoteLanguage = useCallback((quoteId: string, newLanguageCode: string) => {
    const newLanguageName =
      SUPPORTED_LANGUAGES.find((lang) => lang.code === newLanguageCode)?.name || '';
    setQuotes((prevQuotes) =>
      prevQuotes.map((q) =>
        q.id === quoteId ? { ...q, languageCode: newLanguageCode, languageName: newLanguageName } : q
      )
    );
  }, [setQuotes]);

  const markQuoteAsStored = useCallback((quoteId: string, dbId?: string) => {
    setQuotes((prevQuotes) =>
      prevQuotes.map((q) =>
        q.id === quoteId ? { ...q, isStored: true, id: dbId || q.id } : q
      )
    );
  }, [setQuotes]);

  const handleLoadQuotes = useCallback((data: ExportData) => {
    setQuotes(data.quotes);
  }, [setQuotes]);

  return {
    handleExtractQuotes,
    handleExtractFromUrl,
    handleAddQuoteManually,
    handleUpdateQuoteLanguage,
    markQuoteAsStored,
    handleLoadQuotes,
  };
}
