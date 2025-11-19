import { Quote } from '../types';

/**
 * Checks if a quote is a duplicate
 */
export function isQuoteDuplicate(quote: Quote, existingQuotes: Quote[]): boolean {
  return existingQuotes.some((existing) => existing.text === quote.text);
}
