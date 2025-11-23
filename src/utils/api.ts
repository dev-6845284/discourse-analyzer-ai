import axios from 'axios';
import { QuoteUpdatePayload } from '../types';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  } else {
    return `${window.location.protocol}//${window.location.hostname}/api`;
  }
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

export const saveQuote = async (quoteData: any) => {
  return api.post('/quotes', quoteData);
};

export const getStoredQuotes = async (personId?: string) => {
  const params = personId ? { personId } : {};
  return api.get('/quotes', { params });
};

export const updateQuote = async (quoteId: string, quoteData: QuoteUpdatePayload) => {
  return api.put(`/quotes/${quoteId}`, quoteData);
};

export const analyzeQuote = async (
  model: string,
  quoteText: string,
  quoteLanguageCode: string,
  quoteLanguageName: string,
  apiKeys: Record<string, string>,
  analysisContext?: string,
  links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>
) => {
  return api.post('/quotes/analyze', {
    model,
    quoteText,
    quoteLanguageCode,
    quoteLanguageName,
    apiKeys,
    analysisContext,
    links,
  });
};

export default api;
