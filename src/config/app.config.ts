// IMPORTANT: YOU MUST SET THIS ENVIRONMENT VARIABLE.
// This is a placeholder and will not work in production.
// 1. Create a .env file in the root of your project.
// 2. Add the following line to your .env file:
//    VITE_GOOGLE_CLIENT_ID=your-google-client-id
// 3. Go to https://console.cloud.google.com/apis/credentials
// 4. Create an "OAuth client ID" for a "Web application".
// 5. Under "Authorized JavaScript origins", add your production URL
// 6. Copy the generated Client ID and use it as the value for VITE_GOOGLE_CLIENT_ID.
const _viteClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GOOGLE_CLIENT_ID = _viteClientId || (typeof process !== 'undefined' && process.env ? (process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) : undefined) || 'missing-client-id';

export const DEFAULT_AI_PROVIDER = 'chatgpt';

export const DEFAULT_SEARCH_PARAMS = {
  resultCount: 10,
  temperature: 0.7,
  maxQuoteLength: 90,
  timePeriodType: 'months' as const,
  timePeriodValue: 6,
};

export const STORAGE_KEYS = {
  SELECTED_AI: 'selectedAI',
  TIME_PERIOD_TYPE: 'timePeriodType',
  TIME_PERIOD_VALUE: 'timePeriodValue',
  STORED_QUOTE_FILTERS: 'storedQuoteFilters',
} as const;

// Debounce delay for text search filters (milliseconds)
export const FILTER_DEBOUNCE_MS = 500;