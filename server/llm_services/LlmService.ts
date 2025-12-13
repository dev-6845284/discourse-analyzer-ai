import {
  Quote,
  AnalysisResult,
  AuditResult,
  AnalysisCategory,
  AnalysisRating,
  TopicAnalysisResult,
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
  ): Promise<AuditResult>;

  extractQuotesFromText(
    apiKey: string,
    personName: string,
    textContent: string,
    temperature: number,
    logId: string,
    sessionId: string
  ): Promise<Quote[]>;

  extractQuotesFromArticle(
    apiKey: string,
    personName: string,
    articleContent: string,
    articleMetadata: {
      url: string;
      title: string;
      byline: string | null;
      siteName: string | null;
    },
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

  generateContent(
    apiKey: string,
    params: {
      model: string;
      prompt: string;
      temperature?: number;
      metadata?: Record<string, any>;
      logId?: string;
      sessionId?: string;
    }
  ): Promise<string>;

  extractTopics(
    apiKey: string,
    text: string,
    language: string,
    temperature: number,
    logId?: string,
    sessionId?: string
  ): Promise<TopicAnalysisResult>;
}
