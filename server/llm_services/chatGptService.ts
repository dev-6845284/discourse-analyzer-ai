import {
  Quote,
  AnalysisResult,
  JsonParsingError,
  AnalysisCategory,
  AnalysisRating,
  ModelResponseError,
} from '../types';
import { appendLogRequestPayload, addModelInteractionLog, completeModelInteractionLog } from '../services/logService';
import { LlmService } from './LlmService';
import { extractJson } from './utils';
import {
  buildFetchQuotesResearchPrompt,
  buildFetchQuotesFormattingPrompt,
  buildAnalyzeQuotePrompt,
  buildAnalyzeQuoteFormattingPrompt,
  buildExtractQuotesFromTextPrompt,
  buildExtractQuotesFormattingPrompt,
  buildExtractQuotesFromArticlePrompt,
  buildImproveQuoteResearchPrompt,
  buildImproveQuoteFormattingPrompt,
} from './prompts';

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
const CHATGPT_MODEL = "gpt-5-search-api";
const CHATGPT_FORMATTER_MODEL = process.env.CHATGPT_FORMATTER_MODEL || 'gpt-4o-mini';
const CHAT_GPT_MINI = 'gpt-4.1-mini'

type ChatGptCallOptions = {
  temperature?: number;
  useSearch?: boolean;
  enforceJson?: boolean;
  model?: string;
  metadata?: Record<string, any>;
};

/**
 * Helper function to call the ChatGPT API.
 * It enforces JSON output for more reliable parsing.
 */
const callChatGptAPI = async (
  apiKey: string,
  messages: Array<{ role: string; content: string }> ,
  logId: string,
  sessionId: string,
  options: ChatGptCallOptions = {}
): Promise<string> => {
  const {
    temperature,
    useSearch = false,
    enforceJson = true,
    model = CHATGPT_MODEL,
    metadata,
  } = options;

  const prompt = messages.map((m) => `### ${m.role}\n${m.content}`).join('\n\n');
  appendLogRequestPayload(sessionId, logId, { prompt });

  const requestBody: any = {
    model,
    messages,
  };

  if (enforceJson) {
    requestBody.response_format = { type: 'json_object' };
  }

  if (typeof temperature === 'number' && !useSearch) {
    requestBody.temperature = temperature;
  }

  if (useSearch) {
    requestBody.web_search_options = {};
  }

  const requestDetails = {
    url: `${OPENAI_API_BASE_URL}/chat/completions`,
    method: 'POST',
    body: requestBody,
  };

  const interactionId = addModelInteractionLog(sessionId, logId, {
    provider: 'OpenAI',
    model,
    operation: 'chat.completions',
    requestPayload: requestDetails,
    metadata: { useSearch, enforceJson, ...(metadata || {}) },
  });

  let responseSnapshot: any;
  let capturedError: any;

  try {
    const response = await fetch(requestDetails.url, {
      method: requestDetails.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestDetails.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // ignore
      }

      if (response.status === 429 || (errorJson?.error?.code === 'rate_limit_exceeded')) {
        let message = errorJson?.error?.message || 'Rate limit exceeded. Please try again later.';

        // Make the message user-friendly if it contains technical details
        if (message.includes('Rate limit reached')) {
          const waitTimeMatch = message.match(/Please try again in ([\d\.]+)s/);
          if (waitTimeMatch) {
            message = `OpenAI rate limit reached. Please wait ${waitTimeMatch[1]} seconds before trying again.`;
          } else {
            message = 'OpenAI rate limit reached. Please try again later.';
          }
        }

        const apiError = new ModelResponseError(message);
        capturedError = apiError;
        throw apiError;
      }

      const apiError = new Error(`ChatGPT API request failed: ${response.status} ${response.statusText}. ${errorText}`);
      (apiError as any).rawResponse = { status: response.status, statusText: response.statusText, body: errorText };
      (apiError as any).name = 'ChatGptApiError';
      capturedError = apiError;
      throw apiError;
    }

    const data = await response.json();
    responseSnapshot = { status: response.status, body: data };

    if (!data.choices || data.choices.length === 0) {
      throw new Error("ChatGPT API returned no response choices.");
    }

    const content = data.choices[0].message?.content;
    if (!content) {
      console.warn("ChatGPT response did not contain message content. Full message:", data.choices[0].message);
      throw new Error("ChatGPT API returned empty content.");
    }

    return content;
  } catch (error) {
    if (!capturedError) {
      capturedError = error;
    }
    throw error;
  } finally {
    completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
  }
};

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
    if (!apiKey) throw new Error("OpenAI API key is missing.");
    const LIMIT_QUOTE_LENGTH = false;
    const effectiveMaxQuoteLength = maxQuoteLength || 280;

    try {
      const prompt = buildFetchQuotesResearchPrompt({
        personName,
        maxQuotes,
        timePeriod,
        languages,
        context,
        maxQuoteLength: effectiveMaxQuoteLength,
        limitQuoteLength: LIMIT_QUOTE_LENGTH,
      });
      
      const researchNotes = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: prompt }],
        logId,
        sessionId,
        {
          useSearch: true,
          enforceJson: false,
          metadata: { stage: 'web-research', task: 'fetchQuotes' },
        }
      );

      const trimmedResearchNotes = researchNotes?.trim();
      if (!trimmedResearchNotes) {
        throw new Error('ChatGPT web search stage returned empty content.');
      }

      const formattingPrompt = buildFetchQuotesFormattingPrompt({
        maxQuotes,
        personName,
        timePeriod,
        category,
        rating,
        sortOrder,
        languages,
        effectiveMaxQuoteLength,
        researchNotes: trimmedResearchNotes,
      });

      const structuredResponse = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: formattingPrompt }],
        logId,
        sessionId,
        {
          temperature: 0,
          useSearch: false,
          enforceJson: true,
          model: CHATGPT_FORMATTER_MODEL,
          metadata: { stage: 'formatting', task: 'fetchQuotes' },
        }
      );

      const jsonText = extractJson(structuredResponse);
      if (!jsonText) {
        throw new JsonParsingError('Could not parse the formatter response. The format was unexpected.', structuredResponse);
      }

      let parsedResponse: { quotes: { text: string; source: string; title: string; date: string; languageCode: string; languageName: string; }[] };
      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse JSON response:', jsonText);
        throw new JsonParsingError('Could not parse the AI formatting response. The format was unexpected.', jsonText);
      }

      const quotesData = parsedResponse.quotes;

      if (!quotesData || !Array.isArray(quotesData) || quotesData.length === 0) {
        return [];
      }

      const quotes: Quote[] = quotesData.map((q, index) => {
        if (!q.text || !q.source || !q.title || !q.date || !q.languageCode || !q.languageName) {
          console.warn(`Skipping malformed quote object at index ${index}:`, q);
          return null;
        }
        return {
          id: `quote-${Date.now()}-${index}`,
          text: q.text.trim(),
          source: q.source,
          title: q.title,
          date: q.date,
          languageCode: q.languageCode,
          languageName: q.languageName,
        };
      }).filter((q): q is Quote => q !== null);

      if (quotes.length === 0) {
        console.warn("The AI response contained malformed quote data, but no valid quotes could be extracted.");
      }

      return quotes;

    } catch (error) {
      console.error("Error fetching quotes:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred while fetching quotes.");
    }
  }

  public async analyzeQuoteText(
    apiKey: string,
    quoteText: string,
    quoteLanguageCode: string,
    quoteLanguageName: string,
    temperature: number,
    logId: string,
    sessionId: string,
    analysisContext?: string,
    links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>
  ): Promise<AnalysisResult> {
    if (!apiKey) throw new Error("OpenAI API key is missing.");

    try {
      // Step 1: Deep Analysis with Search
      const analysisPrompt = buildAnalyzeQuotePrompt({
        quoteText,
        quoteLanguageName,
        analysisContext,
        links,
      });

      const analysisNotes = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: analysisPrompt }],
        logId,
        sessionId,
        {
          temperature,
          useSearch: true,
          enforceJson: false,
          metadata: { stage: 'analysis', task: 'analyzeQuote' }
        }
      );

      if (!analysisNotes || !analysisNotes.trim()) {
        throw new Error("The analysis stage returned empty content.");
      }

      // Step 2: Format to JSON
      const formattingPrompt = buildAnalyzeQuoteFormattingPrompt({
        quoteLanguageName,
        analysisNotes,
      });

      const rawText = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: formattingPrompt }],
        logId,
        sessionId,
        {
          temperature: 0,
          useSearch: false,
          enforceJson: true,
          model: CHATGPT_FORMATTER_MODEL,
          metadata: { stage: 'formatting', task: 'analyzeQuote' }
        }
      );

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        throw new JsonParsingError("Could not parse the AI's analysis response. The format was unexpected.", rawText);
      }

      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON from analysis response:", jsonText);
        throw new JsonParsingError("Could not parse the AI's analysis response. The format was unexpected.", jsonText);
      }

    } catch (error) {
      console.error("Error analyzing quote:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to analyze the quote. The API may be unavailable or the response was invalid.");
    }
  }

  public async extractQuotesFromText(apiKey: string, personName: string, textContent: string, temperature: number, logId: string, sessionId: string): Promise<Quote[]> {
    if (!apiKey) throw new Error("OpenAI API key is missing.");

    try {
      // Step 1: Analyze and Extract with Search
      const extractionPrompt = buildExtractQuotesFromTextPrompt({
        personName,
        textContent,
      });

      const extractionNotes = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: extractionPrompt }],
        logId,
        sessionId,
        {
          temperature,
          useSearch: true,
          enforceJson: false,
          metadata: { stage: 'extraction', task: 'extractQuotesFromText' }
        }
      );

      if (!extractionNotes || !extractionNotes.trim()) {
        throw new Error("The extraction stage returned empty content.");
      }

      // Step 2: Format to JSON
      const formattingPrompt = buildExtractQuotesFormattingPrompt({
        extractionNotes,
      });

      const rawText = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: formattingPrompt }],
        logId,
        sessionId,
        {
          temperature: 0,
          useSearch: false,
          enforceJson: true,
          model: CHATGPT_FORMATTER_MODEL,
          metadata: { stage: 'formatting', task: 'extractQuotesFromText' }
        }
      );

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        throw new JsonParsingError("Could not parse the AI's response for text extraction. The format was unexpected.", rawText);
      }

      let parsedResponse: { quotes: { text: string; languageCode: string; languageName: string; }[] };
      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON response for text extraction:", jsonText);
        throw new JsonParsingError("Could not parse the AI's response for text extraction. The format was unexpected.", jsonText);
      }

      const quotesData = parsedResponse.quotes;

      if (!quotesData || !Array.isArray(quotesData)) {
        console.warn("The AI response did not contain a 'quotes' array.");
        return [];
      }

      const quotes: Quote[] = quotesData.map((q, index) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        if (!q.text || !q.languageCode || !q.languageName) {
          console.warn(`Skipping malformed extracted quote at index ${index}:`, q);
          return null;
        }

        return {
          id: `quote-text-${Date.now()}-${index}`,
          text: q.text.trim(),
          source: "User-Provided Text",
          title: `Extracted from manual input`,
          date: `${year}-${month}-${day}`,
          languageCode: q.languageCode,
          languageName: q.languageName,
        };
      }).filter((q): q is Quote => q !== null);

      return quotes;

    } catch (error) {
      console.error("Error extracting quotes from text:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred while extracting quotes from the text.");
    }
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
    if (!apiKey) throw new Error("OpenAI API key is missing.");

    try {
      // Step 1: Extract quotes from article with context awareness
      const extractionPrompt = buildExtractQuotesFromArticlePrompt({
        personName,
        articleMetadata,
        articleContent,
      });

      let model = CHAT_GPT_MINI;
      const extractionNotes = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: extractionPrompt }],
        logId,
        sessionId,
        {
          model,
          temperature,
          useSearch: false,
          enforceJson: false,
          metadata: { stage: 'extraction', task: 'extractQuotesFromArticle' }
        }
      );

      if (!extractionNotes || !extractionNotes.trim()) {
        throw new Error("The extraction stage returned empty content.");
      }

      // Step 2: Format to JSON
      const formattingPrompt = buildExtractQuotesFormattingPrompt({
        personName,
        extractionNotes,
      });

      const rawText = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: formattingPrompt }],
        logId,
        sessionId,
        {
          temperature: 0,
          useSearch: false,
          enforceJson: true,
          model: CHATGPT_FORMATTER_MODEL,
          metadata: { stage: 'formatting', task: 'extractQuotesFromArticle' }
        }
      );

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        throw new JsonParsingError("Could not parse the AI's response for article extraction. The format was unexpected.", rawText);
      }

      let parsedResponse: { quotes: { text: string; languageCode: string; languageName: string; }[] };
      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON response for article extraction:", jsonText);
        throw new JsonParsingError("Could not parse the AI's response for article extraction. The format was unexpected.", jsonText);
      }

      const quotesData = parsedResponse.quotes;

      if (!quotesData || !Array.isArray(quotesData)) {
        console.warn("The AI response did not contain a 'quotes' array.");
        return [];
      }

      // Filter out malformed quotes first
      const validQuotes = quotesData.filter((q, index) => {
        if (!q.text || !q.languageCode || !q.languageName) {
          console.warn(`Skipping malformed extracted quote at index ${index}:`, q);
          return false;
        }
        return true;
      });

      if (validQuotes.length === 0) {
        return [];
      }

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Join multiple quotes into a single quote with ' | ' separator
      const joinedText = validQuotes.map(q => q.text.trim()).join(' | ');
      
      // Use the language from the first quote (assuming all quotes are in the same language)
      const firstQuote = validQuotes[0];

      const quote: Quote = {
        id: `quote-article-${Date.now()}-0`,
        text: joinedText,
        source: articleMetadata.url,
        title: articleMetadata.title || 'Extracted from article',
        date: dateStr,
        languageCode: firstQuote.languageCode,
        languageName: firstQuote.languageName,
      };

      return [quote];

    } catch (error) {
      console.error("Error extracting quotes from article:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred while extracting quotes from the article.");
    }
  }

  public async improveQuote(apiKey: string, quote: Quote, personName: string, temperature: number, logId: string, sessionId: string): Promise<Partial<Quote>> {
    if (!apiKey) throw new Error("OpenAI API key is missing.");

    try {
      // Step 1: Research and Improve with Search
      const researchPrompt = buildImproveQuoteResearchPrompt({
        personName,
        quoteText: quote.text,
        languageName: quote.languageName,
        languageCode: quote.languageCode,
      });

      const researchNotes = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: researchPrompt }],
        logId,
        sessionId,
        {
          temperature,
          useSearch: true,
          enforceJson: false,
          metadata: { stage: 'research', task: 'improveQuote' }
        }
      );

      if (!researchNotes || !researchNotes.trim()) {
        throw new Error("The research stage returned empty content.");
      }

      // Step 2: Format to JSON
      const formattingPrompt = buildImproveQuoteFormattingPrompt({
        researchNotes,
      });

      const rawText = await callChatGptAPI(
        apiKey,
        [{ role: 'user', content: formattingPrompt }],
        logId,
        sessionId,
        {
          temperature: 0,
          useSearch: false,
          enforceJson: true,
          model: CHATGPT_FORMATTER_MODEL,
          metadata: { stage: 'formatting', task: 'improveQuote' }
        }
      );

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        throw new JsonParsingError("Could not parse the AI's response. The format was unexpected.", rawText);
      }

      // The API is configured to return JSON, so we can parse it directly.
      let parsedResponse: {
        text: string;
        source: string;
        title: string;
        date: string;
        languageCode: string;
        languageName: string;
        improved: boolean;
        improvementNote: string;
      };

      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new JsonParsingError("Could not parse the AI's response. The format was unexpected.", jsonText);
      }
      
      // Return the improved quote
      return {
        id: quote.id,
        text: parsedResponse.text.trim(),
        source: parsedResponse.source,
        title: parsedResponse.title,
        date: parsedResponse.date,
        languageCode: parsedResponse.languageCode,
        languageName: parsedResponse.languageName,
        analysis: quote.analysis, // Preserve existing analysis
      };

    } catch (error) {
      console.error("Error improving quote:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred while improving the quote.");
    }
  }
}

export default new ChatGptService();