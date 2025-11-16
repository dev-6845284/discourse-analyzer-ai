import { useState, useMemo } from 'react';
import { Quote, AnalysisCategory, AnalysisRating } from '../types';

export function useQuoteFilters(quotes: Quote[]) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterCategory, setFilterCategory] = useState<AnalysisCategory | 'all'>('all');
  const [filterRating, setFilterRating] = useState<AnalysisRating | 'all'>('all');

  // The filtering and sorting is now done on the backend.
  // This hook is now just for managing the filter state.
  const filteredAndSortedQuotes = quotes;

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
