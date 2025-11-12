import { useState, useMemo } from 'react';
import { Quote, AnalysisCategory, AnalysisRating } from '../types';
import { filterAndSortQuotes } from '../utils/quotes';

export function useQuoteFilters(quotes: Quote[]) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterCategory, setFilterCategory] = useState<AnalysisCategory | 'all'>('all');
  const [filterRating, setFilterRating] = useState<AnalysisRating | 'all'>('all');

  const filteredAndSortedQuotes = useMemo(() => {
    return filterAndSortQuotes(quotes, filterCategory, filterRating, sortOrder);
  }, [quotes, filterCategory, filterRating, sortOrder]);

  return {
    sortOrder,
    setSortOrder,
    filterCategory,
    setFilterCategory,
    filterRating,
    setFilterRating,
    filteredAndSortedQuotes,
  };
}
