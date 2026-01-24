import {
  Quote,
  AuditResult,
  AnalysisCategory,
  AnalysisRating,
  TopicAnalysisResult,
  PersonInfo,
} from '../types';
import { LlmService } from './LlmService';
import { fetchQuotesForPerson } from './chatGpt/fetchQuotes';
import { analyzeQuoteText } from './chatGpt/analyze';
import { extractQuotesFromText } from './chatGpt/extractFromText';
import { extractQuotesFromArticle } from './chatGpt/extractFromArticle';
import { improveQuote } from './chatGpt/improveQuote';
import { extractTopics } from './chatGpt/topicExtraction';
import { generateContent } from './chatGpt/api';

// Re-export constants and types for backward compatibility
export { CHATGPT_MODEL, CHATGPT_FORMATTER_MODEL, CHAT_GPT_MINI } from './chatGpt/constants';
export { callChatGptAPI } from './chatGpt/api';
export type { ChatGptCallOptions } from './chatGpt/api';

class ChatGptService implements LlmService {
  public async fetchQuotesForPerson(
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
  ): Promise<Quote[]> {
    return fetchQuotesForPerson(
      apiKey, personName, languages, maxQuotes, context, temperature,
      maxQuoteLength, timePeriod, category, rating, sortOrder, logId, sessionId
    );
  }

  public async analyzeQuoteText(
    apiKey: string,
    quoteText: string,
    quoteLanguageCode: string,
    quoteLanguageName: string,
    temperature: number,
    logId: string,
    sessionId: string,
    person?: PersonInfo,
    analysisContext?: string,
    links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>,
    analysisType: 'audit' | 'flaws' = 'audit'
  ): Promise<AuditResult> {
    return analyzeQuoteText(
      apiKey, quoteText, quoteLanguageCode, quoteLanguageName, temperature,
      logId, sessionId, person, analysisContext, links, analysisType
    );
  }

  public async extractQuotesFromText(
    apiKey: string,
    personName: string,
    textContent: string,
    temperature: number,
    logId: string,
    sessionId: string
  ): Promise<Quote[]> {
    return extractQuotesFromText(
      apiKey, personName, textContent, temperature, logId, sessionId
    );
  }

  public async extractQuotesFromArticle(
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
  ): Promise<Quote[]> {
    return extractQuotesFromArticle(
      apiKey, personName, articleContent, articleMetadata, temperature, logId, sessionId
    );
  }

  public async improveQuote(
    apiKey: string,
    quote: Quote,
    personName: string,
    temperature: number,
    logId: string,
    sessionId: string
  ): Promise<Partial<Quote>> {
    return improveQuote(
      apiKey, quote, personName, temperature, logId, sessionId
    );
  }

  public async extractTopics(
    apiKey: string,
    text: string,
    language: string,
    temperature: number,
    logId?: string,
    sessionId?: string
  ): Promise<TopicAnalysisResult> {
    return extractTopics(apiKey, text, language, temperature, logId, sessionId);
  }

  public async generateContent(
    apiKey: string,
    params: {
      model: string;
      prompt: string;
      temperature?: number;
      metadata?: Record<string, any>;
      logId?: string;
      sessionId?: string;
    }
  ): Promise<string> {
    return generateContent(apiKey, params);
  }
}

export default new ChatGptService();
