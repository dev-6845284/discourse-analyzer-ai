import { useState, useCallback } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants';
import { DEFAULT_SEARCH_PARAMS, DEFAULT_AI_PROVIDER } from '../config/app.config';

export function useSearchParams() {
  const [personName, setPersonName] = useState<string>('');
  const [selectedAI, setSelectedAI] = useState<string>(DEFAULT_AI_PROVIDER);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['lt']);
  const [resultCount, setResultCount] = useState<number>(DEFAULT_SEARCH_PARAMS.resultCount);
  const [temperature, setTemperature] = useState<number>(DEFAULT_SEARCH_PARAMS.temperature);
  const [maxQuoteLength, setMaxQuoteLength] = useState<number>(DEFAULT_SEARCH_PARAMS.maxQuoteLength);
  const [textToExtract, setTextToExtract] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isAgentic, setIsAgentic] = useState<boolean>(false);
  const [agenticMode, setAgenticMode] = useState<'quotes' | 'articles'>('quotes');

  // Status filters
  const [isAnalyzed, setIsAnalyzed] = useState<'all' | 'true' | 'false'>('all');
  const [isImproved, setIsImproved] = useState<'all' | 'true' | 'false'>('all');

  const handleAISelectionChange = useCallback((ai: string) => {
    setSelectedAI(ai);
    if (ai === 'grok') {
      setIsAgentic(false);
    }
  }, []);

  const handleLanguageChange = useCallback((langCode: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langCode) ? prev.filter((l) => l !== langCode) : [...prev, langCode]
    );
  }, []);

  const clearTextToExtract = useCallback(() => {
    setTextToExtract('');
  }, []);

  return {
    personName,
    setPersonName,
    selectedAI,
    handleAISelectionChange,
    selectedLanguages,
    setSelectedLanguages,
    resultCount,
    setResultCount,
    temperature,
    setTemperature,
    maxQuoteLength,
    setMaxQuoteLength,
    textToExtract,
    setTextToExtract,
    isExtracting,
    setIsExtracting,
    isAgentic,
    setIsAgentic,
    agenticMode,
    setAgenticMode,
    handleLanguageChange,
    clearTextToExtract,
    // Status filters
    isAnalyzed,
    setIsAnalyzed,
    isImproved,
    setIsImproved,
  };
}
