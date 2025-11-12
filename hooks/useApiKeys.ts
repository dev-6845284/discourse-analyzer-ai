import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/localStorage';
import { STORAGE_KEYS } from '../config/app.config';

export type AIProvider = 'gemini' | 'grok';

export function useApiKeys() {
  const [apiKey, setApiKey] = useState<string>('');
  const [grokApiKey, setGrokApiKey] = useState<string>('');
  const [selectedAI, setSelectedAI] = useState<AIProvider>('gemini');

  // Load from localStorage on mount
  useEffect(() => {
    const savedApiKey = loadFromStorage(STORAGE_KEYS.GEMINI_API_KEY);
    if (savedApiKey) setApiKey(savedApiKey);

    const savedGrokApiKey = loadFromStorage(STORAGE_KEYS.GROK_API_KEY);
    if (savedGrokApiKey) setGrokApiKey(savedGrokApiKey);

    const savedSelectedAI = loadFromStorage(STORAGE_KEYS.SELECTED_AI);
    if (savedSelectedAI === 'gemini' || savedSelectedAI === 'grok') {
      setSelectedAI(savedSelectedAI);
    }
  }, []);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    saveToStorage(STORAGE_KEYS.GEMINI_API_KEY, key);
  }, []);

  const handleGrokApiKeyChange = useCallback((key: string) => {
    setGrokApiKey(key);
    saveToStorage(STORAGE_KEYS.GROK_API_KEY, key);
  }, []);

  const handleAISelectionChange = useCallback((ai: AIProvider) => {
    setSelectedAI(ai);
    saveToStorage(STORAGE_KEYS.SELECTED_AI, ai);
  }, []);

  const getCurrentApiKey = useCallback((): string => {
    return selectedAI === 'gemini' ? apiKey : grokApiKey;
  }, [selectedAI, apiKey, grokApiKey]);

  return {
    apiKey,
    grokApiKey,
    selectedAI,
    handleApiKeyChange,
    handleGrokApiKeyChange,
    handleAISelectionChange,
    getCurrentApiKey,
  };
}
