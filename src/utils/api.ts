import axios from 'axios';

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

export const updateQuote = async (quoteId: string, quoteData: any) => {
  return api.put(`/quotes/${quoteId}`, quoteData);
};

export default api;
