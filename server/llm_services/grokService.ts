import {
  Quote,
  AnalysisResult,
  JsonParsingError,
  AnalysisCategory,
  AnalysisRating,
} from '../types';
import { extractJson } from './utils';
import {
  buildGrokFetchQuotesPrompt,
  buildGrokAnalyzeQuotePrompt,
  buildGrokExtractQuotesFromTextPrompt,
  buildGrokExtractQuotesFromArticlePrompt,
  buildGrokImproveQuotePrompt,
} from './prompts';
import { appendLogRequestPayload, addModelInteractionLog, completeModelInteractionLog } from '../services/logService';
import { LlmService } from './LlmService';

// Grok API uses OpenAI-compatible endpoints
const GROK_API_BASE_URL = "https://api.x.ai/v1";
const GROK_MODEL = "grok-4-fast"; // or "grok-2-latest"



/**
 * Helper function to call Grok API using OpenAI-compatible endpoint
 */
const callGrokAPI = async (
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  logId: string,
  sessionId: string,
  temperature: number = 0.7
): Promise<string> => {
  const prompt = messages.map(m => `### ${m.role}\n${m.content}`).join('\n\n');
  appendLogRequestPayload(sessionId, logId, { prompt });

  const requestDetails = {
    url: `${GROK_API_BASE_URL}/chat/completions`,
    method: 'POST',
    body: {
      model: GROK_MODEL,
      messages,
      temperature,
    }
  };

  const interactionId = addModelInteractionLog(sessionId, logId, {
    provider: 'xAI',
    model: GROK_MODEL,
    operation: 'chat.completions',
    requestPayload: requestDetails,
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
      const apiError = new Error(`Grok API request failed: ${response.status} ${response.statusText}. ${errorText}`);
      (apiError as any).rawResponse = { status: response.status, statusText: response.statusText, body: errorText };
      (apiError as any).name = 'GrokApiError';
      capturedError = apiError;
      throw apiError;
    }

    const data = await response.json();
    responseSnapshot = { status: response.status, body: data };

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Grok API returned no response choices.");
    }

    const content = data.choices[0].message?.content;
    if (!content) {
      throw new Error("Grok API returned empty content.");
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

class GrokService implements LlmService {
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
    if (!apiKey) throw new Error("Grok API key is missing.");

    try {
      const prompt = buildGrokFetchQuotesPrompt({
        personName,
        maxQuotes,
        timePeriod,
        languages,
        context,
      });

      const rawText = await callGrokAPI(apiKey, [{ role: 'user', content: prompt }], logId, sessionId, 0.5);

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the Grok API response:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response.");
      }

      let parsedResponse: { quotes: { text: string; source: string; title: string; date: string; languageCode: string; languageName: string; }[] };
      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new JsonParsingError("Could not parse the AI's response. The format was unexpected.", jsonText);
      }

      const quotesData = parsedResponse.quotes;

      if (!quotesData || !Array.isArray(quotesData) || quotesData.length === 0) {
        return []; // Return an empty array instead of throwing an error if no new quotes are found.
      }

      // Map the new JSON structure to the app's Quote type.
      const quotes: Quote[] = quotesData.map((q, index) => {
        // Add a check for malformed quote objects from the AI
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
      }).filter((q): q is Quote => q !== null); // Filter out any nulls from malformed objects

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
    if (!apiKey) throw new Error("Grok API key is missing.");

    try {
      const prompt = buildGrokAnalyzeQuotePrompt({
        quoteText,
        quoteLanguageName,
        analysisContext,
        links,
      });

      const rawText = await callGrokAPI(apiKey, [{ role: 'user', content: prompt }], logId, sessionId, temperature);

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the Grok API analysis response:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's analysis response.");
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
    if (!apiKey) throw new Error("Grok API key is missing.");

    try {
      const prompt = buildGrokExtractQuotesFromTextPrompt({
        personName,
        textContent,
      });

      const rawText = await callGrokAPI(apiKey, [{ role: 'user', content: prompt }], logId, sessionId, temperature);

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the Grok API response for text extraction:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response for text extraction.");
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
    if (!apiKey) throw new Error("Grok API key is missing.");

    try {
      const prompt = buildGrokExtractQuotesFromArticlePrompt({
        personName,
        articleMetadata,
        articleContent,
      });

      const rawText = await callGrokAPI(apiKey, [{ role: 'user', content: prompt }], logId, sessionId, temperature);

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the Grok API response for article extraction:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response for article extraction.");
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

      // If multiple quotes, merge them into a single quote with ' | ' separator
      const mergedText = validQuotes.map(q => q.text.trim()).join(' | ');
      const firstQuote = validQuotes[0];

      const mergedQuote: Quote = {
        id: `quote-article-${Date.now()}-0`,
        text: mergedText,
        source: articleMetadata.url,
        title: articleMetadata.title || 'Extracted from article',
        date: new Date().toISOString().split('T')[0],
        languageCode: firstQuote.languageCode,
        languageName: firstQuote.languageName,
      };

      return [mergedQuote];

    } catch (error) {
      console.error("Error extracting quotes from article:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred while extracting quotes from the article.");
    }
  }

  /**
   * Improve/expand an existing quote by finding the full context from the original source
   */
  public async improveQuote(
    apiKey: string,
    quote: Quote,
    personName: string,
    temperature: number,
    logId: string,
    sessionId: string,
  ): Promise<Partial<Quote>> {
    if (!apiKey) throw new Error("Grok API key is missing.");

    try {
      const prompt = buildGrokImproveQuotePrompt({
        personName,
        quoteText: quote.text,
        languageName: quote.languageName,
        languageCode: quote.languageCode,
      });

      const rawText = await callGrokAPI(apiKey, [{ role: 'user', content: prompt }], logId, sessionId, temperature);

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the Grok API response:", rawText);
        throw new Error("Could not find a valid JSON object in the AI's response.");
      }

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

      // URL resolution disabled due to CORS issues
      // const resolvedUrl = await resolveUrls([parsedResponse.source]);

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

export default new GrokService();
