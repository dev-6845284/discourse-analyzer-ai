import {
  Quote,
  AnalysisResult,
  AnalysisCategory,
  AnalysisRating,
} from '../types';

export interface LlmService {
  fetchQuotesForPerson(
      apiKey: string,
      personName: string,
      languages: string[],
      maxQuotes: number,
      context: string[],
      temperature: number,
      maxQuoteLength: number,
      timePeriod: { description: string; startDate?: string; endDate?: string },
      category: AnalysisCategory | 'all',
      rating: AnalysisRating | 'all',
      sortOrder: 'newest' | 'oldest',
      logId: string,
      sessionId: string
  ): Promise<Quote[]>;

  analyzeQuoteText(
    apiKey: string,
    quoteText: string,
    quoteLanguageCode: string,
    quoteLanguageName: string,
    temperature: number,
    logId: string,
    sessionId: string,
    analysisContext?: string,
    links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>
  ): Promise<AnalysisResult>;

  extractQuotesFromText(
    apiKey: string,
    personName: string,
    textContent: string,
    temperature: number,
    logId: string,
    sessionId: string
  ): Promise<Quote[]>;

  improveQuote(
    apiKey: string,
    quote: Quote,
    personName: string,
    temperature: number,
    logId: string,
    sessionId: string
  ): Promise<Partial<Quote>>;
}
