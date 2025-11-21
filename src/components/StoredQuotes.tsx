import React, { useEffect, useState } from 'react';
import { Quote, Person } from '../types';
import QuoteCard from './QuoteCard';
import Spinner from './Spinner';
import { getStoredQuotes } from '../utils/api';

interface StoredQuotesProps {
  selectedPerson: Person | null;
  onAnalyze: (quote: Quote) => void;
  onImprove: (quote: Quote) => void;
  isApiKeySet: boolean;
}

const StoredQuotes: React.FC<StoredQuotesProps> = ({ selectedPerson, onAnalyze, onImprove, isApiKeySet }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              onAnalyze={onAnalyze}
              onImprove={onImprove}
              onSave={() => {}} // No-op since button is hidden
              onLanguageChange={() => {}} // Not implemented for stored quotes yet
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
