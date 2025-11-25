import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/localStorage';
import { STORAGE_KEYS, FILTER_DEBOUNCE_MS } from '../config/app.config';
import { AnalysisRating } from '../types';

export interface StoredQuoteFilters {
  text: string;
  personId: string;
  dateFrom: string;
  dateTo: string;
  rating: AnalysisRating | 'all';
  language: string;
  provider: string;
}

const DEFAULT_FILTERS: StoredQuoteFilters = {
  text: '',
  personId: '',
  dateFrom: '',
  dateTo: '',
  rating: 'all',
  language: 'lt', // Lithuanian default
  provider: 'all',
};

export function useStoredQuoteFilters() {
  const [filters, setFilters] = useState<StoredQuoteFilters>(DEFAULT_FILTERS);
  const [debouncedText, setDebouncedText] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage<StoredQuoteFilters>(STORAGE_KEYS.STORED_QUOTE_FILTERS);
    if (saved) {
      // Merge with defaults to handle any missing keys from older saved versions
      setFilters({ ...DEFAULT_FILTERS, ...saved });
      setDebouncedText(saved.text || '');
    }
  }, []);

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
      rating: filters.rating,
      language: filters.language,
      provider: filters.provider,
    };
  }, [debouncedText, filters.personId, filters.dateFrom, filters.dateTo, filters.rating, filters.language, filters.provider]);

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
