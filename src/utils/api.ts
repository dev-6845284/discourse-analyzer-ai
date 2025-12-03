import axios from 'axios';
import { QuoteUpdatePayload, AgenticSearchOptions, AgenticSearchResult } from '../types';
import { TimePeriodResult } from './timePeriod';

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

export const fetchArticle = async (url: string, language?: string) => {
  return api.post('/quotes/fetch-article', { url, language });
};

export const agenticSearch = async (
  personName: string,
  timePeriod: TimePeriodResult,
  languages: string[],
  options: AgenticSearchOptions,
  apiKeys: Record<string, string>,
  signal?: AbortSignal
) => {
  return api.post<AgenticSearchResult>('/quotes/agentic-search', {
    personName,
    timePeriod,
    languages,
    options,
    apiKeys,
  }, { signal });
};

export const createSession = async (sourceUrl: string, sourceType: 'youtube' | 'article' | 'text') => {
  return api.post('/analysis/sessions', { sourceUrl, sourceType });
};

export const getSessions = async () => {
  return api.get('/analysis/sessions');
};

export const getSession = async (sessionId: string) => {
  return api.get(`/analysis/sessions/${sessionId}`);
};

export const updateSessionStep = async (sessionId: string, step: string, data: any, status: string) => {
  return api.put(`/analysis/sessions/${sessionId}/step`, { step, data, status });
};

export default api;
