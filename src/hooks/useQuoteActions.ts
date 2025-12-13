import { useCallback } from 'react';
import { Quote, QuoteUpdatePayload, AuditResult } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import api, { updateQuote, extractFromUrl } from '../utils/api';
import { loadFromStorage } from '../utils/localStorage';

export function useQuoteActions(
  quotes: Quote[],
  setQuotes: (quotes: Quote[] | ((prev: Quote[]) => Quote[])) => void,
  setError: (error: string | null) => void,
  setRawApiResponseError: (error: string | null) => void,
  handleLogout: () => void
) {
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
          analysisContext: quote.analysisContext,
          links: quote.links,
          apiKeys,
        });
        // Server now returns AuditResult instead of AnalysisResult
        const audit: AuditResult = response.data;

        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { 
            ...q, 
            analysisContext: quote.analysisContext,
            links: quote.links,
            draft: { ...q, audit }, 
            isAnalyzing: false 
          } : q))
        );
      } catch (e: any) {
        setError(`Analysis failed: ${e.response?.data?.message || e.message}`);
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, isAnalyzing: false } : q))
        );
      }
    },
    [setQuotes, setError, setRawApiResponseError]
  );

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
          prev.map((q) => (q.id === quote.id ? { ...q, draft: { ...q, ...improvedQuote }, isImproving: false } : q))
        );
      } catch (e: any) {
        setError(`Quote improvement failed: ${e.response?.data?.message || e.message}`);
        setQuotes((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, isImproving: false } : q))
        );
      }
    },
    [setQuotes, setError, setRawApiResponseError]
  );

  const handleAcceptQuote = useCallback(async (quote: Quote, selectedAI?: string) => {
    if (!quote.draft) return;

    const updatedQuote = { 
      ...quote, 
      ...quote.draft, 
      draft: undefined,
      isAnalyzing: false,
      isImproving: false
    };
    setQuotes((prev) => prev.map((q) => (q.id === quote.id ? updatedQuote : q)));

    if (quote.isStored) {
      try {
        const updatePayload: QuoteUpdatePayload = {
          text: updatedQuote.text,
          analysisContext: updatedQuote.analysisContext,
          sourceUrl: updatedQuote.source,
          date: updatedQuote.date,
          metadata: {
            // Support both legacy analysis and new audit
            ...(updatedQuote.analysis ? { analysis: updatedQuote.analysis } : {}),
            ...(updatedQuote.audit ? { audit: updatedQuote.audit } : {}),
            languageCode: updatedQuote.languageCode,
            languageName: updatedQuote.languageName,
            title: updatedQuote.title,
            links: updatedQuote.links
          }
        };

        const auditPayload = {
          ...updatePayload,
          ...(selectedAI ? { analyzedByProvider: selectedAI } : {}),
          analyzedAt: new Date().toISOString()
        };

        await updateQuote(quote.id, auditPayload);
      } catch (e: any) {
        console.error('Failed to persist accepted quote:', e);
        setError('Failed to save analysis to the server.');
      }
    }
  }, [setQuotes, setError]);

  const handleDiscardQuote = useCallback((quote: Quote) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === quote.id ? { ...q, draft: undefined } : q))
    );
  }, [setQuotes]);

  const handleRemoveQuote = useCallback((quote: Quote) => {
    setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
  }, [setQuotes]);

  return {
    handleAnalyzeQuote,
    handleImproveQuote,
    handleAcceptQuote,
    handleDiscardQuote,
    handleRemoveQuote,
  };
}
