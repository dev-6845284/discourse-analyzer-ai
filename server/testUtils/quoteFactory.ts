import { Quote } from '../types';

const defaultQuote: Quote = {
  id: 'quote-1',
  text: 'Default quote text',
  source: 'Default Source',
  title: 'Default Title',
  date: '2025-01-01',
  languageCode: 'en',
  languageName: 'English',
};

export const createQuoteFixture = (overrides: Partial<Quote> = {}): Quote => ({
  ...defaultQuote,
  ...overrides,
});
