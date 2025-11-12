import { Quote, AnalysisCategory, AnalysisRating, AnalysisDetail } from '../types';

/**
 * Filters quotes by category
 */
export function filterByCategory(
  quotes: Quote[],
  category: AnalysisCategory | 'all'
): Quote[] {
  if (category === 'all') return quotes;
  
  return quotes.filter(
    (q) =>
      q.analysis &&
      q.analysis[category]?.rating !== 'None' &&
      q.analysis[category]?.rating !== undefined
  );
}

/**
 * Filters quotes by rating
 */
export function filterByRating(
  quotes: Quote[],
  rating: AnalysisRating | 'all'
): Quote[] {
  if (rating === 'all') return quotes;
  
  return quotes.filter(
    (q) =>
      q.analysis &&
      Object.values(q.analysis).some(
        (detail: AnalysisDetail) => detail.rating === rating
      )
  );
}

/**
 * Sorts quotes by date
 */
export function sortQuotesByDate(
  quotes: Quote[],
  order: 'newest' | 'oldest'
): Quote[] {
  const sorted = [...quotes].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    // Handle invalid dates by moving them to the end
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;

    if (order === 'oldest') {
      return dateA.getTime() - dateB.getTime();
    }
    // Default to newest
    return dateB.getTime() - dateA.getTime();
  });

  return sorted;
}

/**
 * Checks if a quote is a duplicate
 */
export function isQuoteDuplicate(quote: Quote, existingQuotes: Quote[]): boolean {
  return existingQuotes.some((existing) => existing.text === quote.text);
}

/**
 * Filters and sorts quotes
 */
export function filterAndSortQuotes(
  quotes: Quote[],
  filterCategory: AnalysisCategory | 'all',
  filterRating: AnalysisRating | 'all',
  sortOrder: 'newest' | 'oldest'
): Quote[] {
  let filtered = filterByCategory(quotes, filterCategory);
  filtered = filterByRating(filtered, filterRating);
  return sortQuotesByDate(filtered, sortOrder);
}
