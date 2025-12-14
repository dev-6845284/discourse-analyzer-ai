import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/localStorage';
import { STORAGE_KEYS, FILTER_DEBOUNCE_MS } from '../config/app.config';
import { AnalysisRating, SeverityLevel } from '../types';

export type SortField = 'savedAt' | 'analyzedAt' | 'improvedAt' | 'date';
export type SortOrder = 'newest' | 'oldest';

export interface StoredQuoteFilters {
  text: string;
  personId: string;
  dateFrom: string;
  dateTo: string;
  savedAtFrom: string;
  savedAtTo: string;
  analyzedAtFrom: string;
  analyzedAtTo: string;
  improvedAtFrom: string;
  improvedAtTo: string;
  isAnalyzed: 'all' | 'true' | 'false';
  isImproved: 'all' | 'true' | 'false';
  rating: SeverityLevel | AnalysisRating | 'all';
  language: string;
  provider: string;
  sortField: SortField;
  sortOrder: SortOrder;
}

const DEFAULT_FILTERS: StoredQuoteFilters = {
  text: '',
  personId: '',
  dateFrom: '',
  dateTo: '',
  savedAtFrom: '',
  savedAtTo: '',
  analyzedAtFrom: '',
  analyzedAtTo: '',
  improvedAtFrom: '',
  improvedAtTo: '',
  isAnalyzed: 'all',
  isImproved: 'all',
  rating: 'all',
  language: 'all',
  provider: 'all',
  sortField: 'savedAt',
  sortOrder: 'newest',
};

export function useStoredQuoteFilters(initialOverrides?: Partial<StoredQuoteFilters>) {
  const [filters, setFilters] = useState<StoredQuoteFilters>(() => {
    const saved = loadFromStorage<StoredQuoteFilters>(STORAGE_KEYS.STORED_QUOTE_FILTERS);
    return {
      ...DEFAULT_FILTERS,
      ...(saved || {}),
      ...(initialOverrides || {})
    };
  });
  
  const [debouncedText, setDebouncedText] = useState<string>(filters.text);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce text filter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedText(filters.text);
    }, FILTER_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters.text]);

  // Update a single filter value
  const updateFilter = useCallback(<K extends keyof StoredQuoteFilters>(
    key: K,
    value: StoredQuoteFilters[K]
  ) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      saveToStorage(STORAGE_KEYS.STORED_QUOTE_FILTERS, newFilters);
      return newFilters;
    });
  }, []);

  // Update multiple filter values at once
  const updateFilters = useCallback((updates: Partial<StoredQuoteFilters>) => {
    setFilters(prev => {
      const newFilters = { ...prev, ...updates };
      saveToStorage(STORAGE_KEYS.STORED_QUOTE_FILTERS, newFilters);
      return newFilters;
    });
  }, []);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedText('');
    saveToStorage(STORAGE_KEYS.STORED_QUOTE_FILTERS, DEFAULT_FILTERS);
  }, []);

  // Check if any filters are active (different from defaults)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.text !== '' ||
      filters.personId !== '' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== '' ||
      filters.savedAtFrom !== '' ||
      filters.savedAtTo !== '' ||
      filters.analyzedAtFrom !== '' ||
      filters.analyzedAtTo !== '' ||
      filters.improvedAtFrom !== '' ||
      filters.improvedAtTo !== '' ||
      filters.isAnalyzed !== 'all' ||
      filters.isImproved !== 'all' ||
      filters.rating !== 'all' ||
      filters.language !== 'lt' || // Compare to default
      filters.provider !== 'all'
    );
  }, [filters]);

  // Build query params for API call (uses debounced text)
  const queryParams = useMemo(() => {
    return {
      text: debouncedText,
      personId: filters.personId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      savedAtFrom: filters.savedAtFrom,
      savedAtTo: filters.savedAtTo,
      analyzedAtFrom: filters.analyzedAtFrom,
      analyzedAtTo: filters.analyzedAtTo,
      improvedAtFrom: filters.improvedAtFrom,
      improvedAtTo: filters.improvedAtTo,
      isAnalyzed: filters.isAnalyzed,
      isImproved: filters.isImproved,
      rating: filters.rating,
      language: filters.language,
      provider: filters.provider,
      sortField: filters.sortField,
      sortOrder: filters.sortOrder,
    };
  }, [debouncedText, filters.personId, filters.dateFrom, filters.dateTo, filters.savedAtFrom, filters.savedAtTo, filters.analyzedAtFrom, filters.analyzedAtTo, filters.improvedAtFrom, filters.improvedAtTo, filters.isAnalyzed, filters.isImproved, filters.rating, filters.language, filters.provider, filters.sortField, filters.sortOrder]);

  return {
    filters,
    queryParams,
    debouncedText,
    hasActiveFilters,
    updateFilter,
    updateFilters,
    resetFilters,
  };
}
