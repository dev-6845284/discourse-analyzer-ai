import {
  Quote,
  AnalysisResult,
  AnalysisCategory,
  AnalysisRating,
} from '../types';
import * as geminiService from '../llm_services/geniniService';
import * as chatGptService from '../llm_services/chatGptService';
import * as grokService from '../llm_services/grokService';
import { addLogEntry, updateLogEntry } from './logService';

export { JsonParsingError, ModelResponseError } from '../llm_services/geniniService';

const getApiKey = (aiProvider: string): string => {
  const key = {
    gemini: process.env.GEMINI_API_KEY,
    grok: process.env.GROK_API_KEY,
    chatgpt: process.env.CHATGPT_API_KEY,
  }[aiProvider];

  if (!key) throw new Error(`API key for ${aiProvider} is not configured.`);
  return key;
};

export const fetchQuotesForPerson = async (
  aiProvider: string,
  personName: string,
  languages: string[],
  resultCount: number,
  existingQuotesText: string[],
  temperature: number,
  maxQuoteLength: number,
  timePeriod: { description: string; startDate?: string; endDate?: string },
  filterCategory: AnalysisCategory | 'all',
  filterRating: AnalysisRating | 'all',
  sortOrder: 'newest' | 'oldest'
): Promise<Quote[]> => {
  const apiKey = getApiKey(aiProvider);
  const logId = addLogEntry('fetchQuotes', {
    aiProvider,
    personName,
    languages,
    resultCount,
    existingQuotesText,
    temperature,
    maxQuoteLength,
    timePeriod,
    filterCategory,
    filterRating,
    sortOrder,
  });

  try {
    let quotes: Quote[];
    switch (aiProvider) {
      case 'gemini':
        quotes = await geminiService.fetchQuotesForPerson(
          apiKey,
          personName,
          languages,
          resultCount,
          existingQuotesText,
          temperature,
          maxQuoteLength,
          timePeriod,
          logId
        );
        break;
      case 'chatgpt':
        quotes = await chatGptService.fetchQuotesForPerson(
          apiKey,
          personName,
          languages,
          resultCount,
          existingQuotesText,
          temperature,
          maxQuoteLength,
          timePeriod,
          logId
        );
        break;
      case 'grok':
        quotes = await grokService.fetchQuotesForPerson(
          apiKey,
          personName,
          languages,
          resultCount,
          existingQuotesText,
          temperature,
          maxQuoteLength,
          timePeriod,
          logId
        );
        break;
      default:
        throw new Error('Invalid AI provider');
    }

    // Apply filtering and sorting
    let filteredQuotes = quotes;
    if (filterCategory && filterCategory !== 'all') {
      filteredQuotes = filteredQuotes.filter(
        (q) =>
          q.analysis &&
          q.analysis[filterCategory]?.rating !== 'None' &&
          q.analysis[filterCategory]?.rating !== undefined
      );
    }

    if (filterRating && filterRating !== 'all') {
      filteredQuotes = filteredQuotes.filter(
        (q) =>
          q.analysis &&
          Object.values(q.analysis).some(
            (detail) => detail.rating === filterRating
          )
      );
    }

    const sortedQuotes = [...filteredQuotes].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;
      if (sortOrder === 'oldest') {
        return dateA.getTime() - dateB.getTime();
      }
      return dateB.getTime() - dateA.getTime();
    });

    updateLogEntry(logId, sortedQuotes);
    return sortedQuotes;
  } catch (error) {
    updateLogEntry(logId, undefined, error);
    console.error(`Error fetching quotes with ${aiProvider}:`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`An unknown error occurred while fetching quotes with ${aiProvider}.`);
  }
};

export const analyzeQuoteText = async (aiProvider: string, quote: Quote): Promise<AnalysisResult> => {
  const apiKey = getApiKey(aiProvider);
  const logId = addLogEntry('analyzeQuote', { aiProvider, quote });
  try {
    let analysis: AnalysisResult;
    switch (aiProvider) {
      case 'gemini':
        analysis = await geminiService.analyzeQuoteText(apiKey, quote.text, quote.languageCode, quote.languageName, logId);
        break;
      case 'chatgpt':
        analysis = await chatGptService.analyzeQuoteText(apiKey, quote.text, quote.languageCode, quote.languageName, logId);
        break;
      case 'grok':
        analysis = await grokService.analyzeQuoteText(apiKey, quote.text, quote.languageCode, quote.languageName, logId);
        break;
      default:
        throw new Error('Invalid AI provider');
    }
    updateLogEntry(logId, analysis);
    return analysis;
  } catch (error) {
    updateLogEntry(logId, undefined, error);
    throw error;
  }
};

export const extractQuotesFromText = async (aiProvider: string, personName: string, textToExtract: string): Promise<Quote[]> => {
  const apiKey = getApiKey(aiProvider);
  const logId = addLogEntry('extractQuote', { aiProvider, personName, textToExtract });
  try {
    let quotes: Quote[];
    switch (aiProvider) {
      case 'gemini':
        quotes = await geminiService.extractQuotesFromText(apiKey, personName, textToExtract, logId);
        break;
      case 'chatgpt':
        quotes = await chatGptService.extractQuotesFromText(apiKey, personName, textToExtract, logId);
        break;
      case 'grok':
        quotes = await grokService.extractQuotesFromText(apiKey, personName, textToExtract, logId);
        break;
      default:
        throw new Error('Invalid AI provider');
    }
    updateLogEntry(logId, quotes);
    return quotes;
  } catch (error) {
    updateLogEntry(logId, undefined, error);
    throw error;
  }
};

export const improveQuote = async (aiProvider: string, quote: Quote, personName: string): Promise<Partial<Quote>> => {
  const apiKey = getApiKey(aiProvider);
  const logId = addLogEntry('improveQuote', { aiProvider, quote, personName });
  try {
    let improvedQuote: Partial<Quote>;
    switch (aiProvider) {
      case 'gemini':
        improvedQuote = await geminiService.improveQuote(apiKey, quote, personName, logId);
        break;
      case 'chatgpt':
        improvedQuote = await chatGptService.improveQuote(apiKey, quote, personName, logId);
        break;
      case 'grok':
        improvedQuote = await grokService.improveQuote(apiKey, quote, personName, logId);
        break;
      default:
        throw new Error('Invalid AI provider');
    }
    updateLogEntry(logId, improvedQuote);
    return improvedQuote;
  } catch (error) {
    updateLogEntry(logId, undefined, error);
    throw error;
  }
};
