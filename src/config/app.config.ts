// IMPORTANT: YOU MUST REPLACE THIS VALUE.
// This is a placeholder and will not work in production.
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Create an "OAuth client ID" for a "Web application".
// 3. Under "Authorized JavaScript origins", add your production URL
// 4. Copy the generated Client ID and paste it here.
export const GOOGLE_CLIENT_ID = '850990674967-j8itp1dsvgv3cjefqd9jme9p7ksb46rq.apps.googleusercontent.com';

export const DEFAULT_SEARCH_PARAMS = {
  resultCount: 10,
  temperature: 0.7,
  maxQuoteLength: 90,
  timePeriodType: 'months' as const,
  timePeriodValue: 6,
};

export const STORAGE_KEYS = {
  GEMINI_API_KEY: 'geminiApiKey',
  GROK_API_KEY: 'grokApiKey',
  CHATGPT_API_KEY: 'chatGptApiKey',
  SELECTED_AI: 'selectedAI',
  TIME_PERIOD_TYPE: 'timePeriodType',
  TIME_PERIOD_VALUE: 'timePeriodValue',
} as const;