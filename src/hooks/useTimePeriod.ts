import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/localStorage';
import { getTimePeriodDescription, TimePeriodType, TimePeriodResult } from '../utils/timePeriod';
import { STORAGE_KEYS, DEFAULT_SEARCH_PARAMS } from '../config/app.config';

export function useTimePeriod() {
  const [timePeriodType, setTimePeriodType] = useState<TimePeriodType>(
    DEFAULT_SEARCH_PARAMS.timePeriodType
  );
  const [timePeriodValue, setTimePeriodValue] = useState<number>(
    DEFAULT_SEARCH_PARAMS.timePeriodValue
  );
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    const savedType = loadFromStorage(STORAGE_KEYS.TIME_PERIOD_TYPE);
    if (savedType && ['day', 'week', 'months', 'years', 'custom'].includes(savedType)) {
      setTimePeriodType(savedType as TimePeriodType);
    }

    const savedValue = loadFromStorage(STORAGE_KEYS.TIME_PERIOD_VALUE);
    if (savedValue) {
      const parsed = parseInt(savedValue, 10);
      if (!isNaN(parsed)) setTimePeriodValue(parsed);
    }
  }, []);

  const handleTimePeriodTypeChange = useCallback((type: TimePeriodType) => {
    setTimePeriodType(type);
    saveToStorage(STORAGE_KEYS.TIME_PERIOD_TYPE, type);
  }, []);

  const handleTimePeriodValueChange = useCallback((value: number) => {
    setTimePeriodValue(value);
    saveToStorage(STORAGE_KEYS.TIME_PERIOD_VALUE, value.toString());
  }, []);

  const getTimePeriod = useCallback((): TimePeriodResult => {
    return getTimePeriodDescription(
      timePeriodType,
      timePeriodValue,
      customDateFrom,
      customDateTo
    );
  }, [timePeriodType, timePeriodValue, customDateFrom, customDateTo]);

  return {
    timePeriodType,
    timePeriodValue,
    customDateFrom,
    customDateTo,
    setCustomDateFrom,
    setCustomDateTo,
    handleTimePeriodTypeChange,
    handleTimePeriodValueChange,
    getTimePeriod,
  };
}
