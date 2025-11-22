import React, { useEffect, useState } from 'react';
import { Quote, Person } from '../types';
import QuoteCard from './QuoteCard';
import Spinner from './Spinner';
import api, { getStoredQuotes, updateQuote } from '../utils/api';
import { loadFromStorage } from '../utils/localStorage';

interface StoredQuotesProps {
  selectedPerson: Person | null;
  selectedAI: string;
  isApiKeySet: boolean;
}

const StoredQuotes: React.FC<StoredQuotesProps> = ({ selectedPerson, selectedAI, isApiKeySet }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (quote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, isAnalyzing: true } : q));
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
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, draft: { ...q, analysis }, isAnalyzing: false } : q));
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
      
      const updatePayload: any = {
        text: updatedQuoteData.text,
        metadata: {
            ...updatedQuoteData.analysis ? { analysis: updatedQuoteData.analysis } : {},
            languageCode: updatedQuoteData.languageCode,
            languageName: updatedQuoteData.languageName,
            title: updatedQuoteData.title
        }
      };

      await updateQuote(quote.id, updatePayload);
      
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

  useEffect(() => {
    const fetchQuotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getStoredQuotes(selectedPerson?._id);
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
        }));
        setQuotes(mappedQuotes);
      } catch (err) {
        console.error('Error fetching stored quotes:', err);
        setError('Failed to load stored quotes.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotes();
  }, [selectedPerson]);

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {selectedPerson ? `Stored Quotes for ${selectedPerson.name}` : 'All Stored Quotes'}
      </h2>
      
      {quotes.length === 0 ? (
        <p className="text-gray-500">No quotes found.</p>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onAnalyze={handleAnalyze}
              onImprove={handleImprove}
              onSave={() => {}} // Stored quotes are already saved
              onLanguageChange={() => {}} // Implement if needed for stored quotes
              onAccept={handleAccept}
              onDiscard={handleDiscard}
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
