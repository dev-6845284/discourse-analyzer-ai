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

export interface StoredQuoteQueryParams {
  personId?: string;
  text?: string;
  dateFrom?: string;
  dateTo?: string;
  savedAtFrom?: string;
  savedAtTo?: string;
  analyzedAtFrom?: string;
  analyzedAtTo?: string;
  improvedAtFrom?: string;
  improvedAtTo?: string;
  isAnalyzed?: 'all' | 'true' | 'false';
  isImproved?: 'all' | 'true' | 'false';
  rating?: string;
  language?: string;
  provider?: string;
  sortField?: string;
  sortOrder?: string;
}

export const getStoredQuotes = async (params: StoredQuoteQueryParams = {}) => {
  // Filter out empty/undefined values and 'all' values
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v && v !== 'all' && v.trim?.() !== '')
  );
  return api.get('/quotes', { params: cleanParams });
};

export const updateQuote = async (quoteId: string, quoteData: QuoteUpdatePayload) => {
  return api.put(`/quotes/${quoteId}`, quoteData);
};

export const deleteQuote = async (quoteId: string) => {
  return api.delete(`/quotes/${quoteId}`);
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

export const extractFromUrl = async (
  url: string,
  personName: string,
  model: string,
  temperature: number,
  apiKeys: Record<string, string>
) => {
  return api.post('/quotes/extract-from-url', {
    url,
    personName,
    model,
    temperature,
    apiKeys,
  });
};

export default api;
