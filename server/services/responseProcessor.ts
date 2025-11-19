import { Quote } from '../types';

interface EnrichmentContext {
  source?: string;
  title?: string;
  date?: string;
  languageCode?: string;
  languageName?: string;
  [key: string]: any;
}

export const postProcessResponse = (operation: string, data: any, context: EnrichmentContext = {}): any => {
  switch (operation) {
    case 'extractQuotesFromText':
      return processExtractQuotes(data as Quote[], context);
    default:
      return data;
  }
};

const processExtractQuotes = (quotes: Quote[], context: EnrichmentContext): Quote[] => {
  if (!quotes || quotes.length === 0) {
    return [];
  }

  // 1. Extract distinct texts, trim them, and filter out empty ones
  const distinctTexts = Array.from(new Set(
    quotes
      .map(q => q.text)
      .filter(t => t && t.trim().length > 0)
      .map(t => t.trim())
  ));
  
  if (distinctTexts.length === 0) {
    return [];
  }

  // 2. Join distinct quotes with ' | '
  const joinedText = distinctTexts.join(' | ');

  // 3. Create base quote (take the first one as a template for other fields)
  const baseQuote = quotes[0];

  // 4. Apply enrichment and the joined text
  const processedQuote: Quote = {
    ...baseQuote,
    text: joinedText,
    source: context.source || baseQuote.source,
    title: context.title || baseQuote.title,
    date: context.date || baseQuote.date,
    languageCode: context.languageCode || baseQuote.languageCode,
    languageName: context.languageName || baseQuote.languageName,
  };

  // Return as an array to maintain Quote[] contract
  return [processedQuote];
};
