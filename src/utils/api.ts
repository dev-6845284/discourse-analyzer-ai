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

// Add request logging interceptor
api.interceptors.request.use((config) => {
  console.log('[API_REQUEST]', {
    timestamp: new Date().toISOString(),
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
    withCredentials: config.withCredentials,
    headers: {
      hasContentType: !!config.headers?.['Content-Type'],
      custom: Object.keys(config.headers || {}).filter(k => !['content-type', 'common', 'delete', 'get', 'head', 'post', 'put', 'patch'].includes(k.toLowerCase()))
    }
  });
  return config;
}, (error) => {
  console.error('[API_REQUEST_ERROR]', error);
  return Promise.reject(error);
});

// Add response logging interceptor
api.interceptors.response.use((response) => {
  console.log('[API_RESPONSE]', {
    timestamp: new Date().toISOString(),
    url: response.config.url,
    status: response.status,
    statusText: response.statusText
  });
  return response;
}, (error) => {
  console.error('[API_RESPONSE_ERROR]', {
    timestamp: new Date().toISOString(),
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    statusText: error.response?.statusText,
    message: error.message,
    data: error.response?.data
  });
  return Promise.reject(error);
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
  links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>,
  personId?: string,
  personName?: string,
  analysisType: 'audit'|'flaws' = 'audit'
) => {
  return api.post('/quotes/analyze', {
    model,
    quoteText,
    quoteLanguageCode,
    quoteLanguageName,
    apiKeys,
    analysisContext,
    links,
    personId,
    personName,
    analysisType,
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

export const deleteSession = async (sessionId: string) => {
  return api.delete(`/analysis/sessions/${sessionId}`);
};

export const promoteSession = async (sessionId: string, quoteGroups: any[], languageCode?: string) => {
  return api.post('/analysis/promote', { sessionId, quoteGroups, languageCode });
};

export const getContentAnalysis = async (id: string) => {
  return api.get(`/analysis/content/${id}`);
};

export const updateQuoteSource = async (quoteId: string, contentAnalysisId: string, statementIds: string[]) => {
  return api.post('/analysis/update-quote-source', { quoteId, contentAnalysisId, statementIds });
};

// Session-based analysis endpoints
export const analyzeSessionTopics = async (
  sessionId: string, 
  language: string, 
  model: string, 
  apiKeys: Record<string, string>
) => {
  return api.post(`/analysis/sessions/${sessionId}/analyze-topics`, { language, model, apiKeys });
};

export const saveSelectedBlocks = async (sessionId: string, selectedBlockIds: string[]) => {
  return api.put(`/analysis/sessions/${sessionId}/selected-blocks`, { selectedBlockIds });
};

export const analyzeSessionSpeakers = async (
  sessionId: string,
  language: string,
  model: string,
  apiKeys: Record<string, string>,
  speakerHint?: string
) => {
  return api.post(`/analysis/sessions/${sessionId}/analyze-speakers`, { language, model, apiKeys, speakerHint });
};

export const analyzeSessionDialog = async (
  sessionId: string,
  language: string,
  fastModel: string,
  betterModel: string,
  apiKeys: Record<string, string>
) => {
  return api.post(`/analysis/sessions/${sessionId}/analyze-dialog`, { language, fastModel, betterModel, apiKeys });
};

export const mergeSpeakers = async (
  sessionId: string,
  speakerIdsToMerge: string[],
  targetSpeakerId: string
) => {
  return api.post(`/analysis/sessions/${sessionId}/merge-speakers`, { speakerIdsToMerge, targetSpeakerId });
};

// Person similarity search
export interface PersonSimilarityMatch {
  personId: string;
  name: string;
  aliases: string[];
  similarity: number;
  isExact: boolean;
}

export const findSimilarPersons = async (name: string, threshold?: number) => {
  const params: Record<string, string> = { name };
  if (threshold !== undefined) {
    params.threshold = threshold.toString();
  }
  return api.get<{ matches: PersonSimilarityMatch[] }>('/people/find-similar', { params });
};

/**
 * Formats API error response into a user-friendly message.
 * Handles rate limiting, model errors, and other common API errors.
 */
export const formatApiError = (error: any, context?: string): string => {
  const errorData = error.response?.data;
  let message = errorData?.message || error.message || 'An unknown error occurred';
  
  // Check for rate limit errors (OpenAI, Gemini, etc.)
    if (message.toLowerCase().includes('rate limit')) {
    // Extract wait time if present (support decimals and multiple phrasings)
    const waitTimeMatch = message.match(/(?:please try again in|please wait|try again in)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:s|seconds?)/i);
    const waitTime = waitTimeMatch ? waitTimeMatch[1] : null;
    
    if (waitTime) {
      message = `⏳ Rate limit reached. Please wait ${waitTime} seconds and try again.`;
    } else {
      message = '⏳ Rate limit reached. Please wait a moment and try again.';
    }
  } else if (errorData?.errorType === 'ModelResponseError') {
    // Model blocked or failed to respond properly
    message = `🤖 AI model error: ${message}`;
  } else if (error.response?.status === 401) {
    message = 'Authentication failed. Please log in again.';
  } else if (error.response?.status === 403) {
    message = 'Access denied. You do not have permission for this action.';
  } else if (error.response?.status >= 500) {
    message = `Server error: ${message}`;
  }
  
  return context ? `${context}: ${message}` : message;
};

// Admin API endpoints
export const getAdminDashboardSummary = () => api.get('/admin/dashboard-summary');
export const getAdminUsageStats = (hours: number = 24) => api.get(`/admin/usage-stats?hours=${hours}`);
export const getAdminSecurityAlerts = (limit: number = 50) => api.get(`/admin/security-alerts?limit=${limit}`);
export const acknowledgeSecurityAlert = (alertId: string) => api.post(`/admin/security-alerts/${alertId}/acknowledge`);
export const getBlockedIPs = () => api.get('/admin/blocked-ips');
export const blockIP = (ipAddress: string, reason: string, expiresInMinutes?: number) => 
  api.post('/admin/blocked-ips', { ipAddress, reason, expiresInMinutes });
export const unblockIP = (ipAddress: string) => api.delete(`/admin/blocked-ips/${encodeURIComponent(ipAddress)}`);

export default api;

// Admin categories API
export const getAdminCategories = () => api.get('/admin/categories');
export const createAdminCategory = (category: any) => api.post('/admin/categories', category);
export const updateAdminCategory = (id: string, category: any) => api.put(`/admin/categories/${id}`, category);
export const deleteAdminCategory = (id: string) => api.delete(`/admin/categories/${id}`);
export const reloadAdminCategories = () => api.post('/admin/categories/reload');
