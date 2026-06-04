import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import {
  Quote,
  AnalysisResult,
  AuditResult,
  GroundingChunk,
  ModelResponseError,
  JsonParsingError,
  AnalysisCategory,
  AnalysisRating,
  TopicAnalysisResult,
  PersonInfo,
} from '../types';
import { resolveUrls } from '../utils/urlResolver';
import { appendLogRequestPayload, addModelInteractionLog, completeModelInteractionLog } from '../services/logService';
import { LlmService } from './LlmService';
import { extractJson } from './utils';
import {
  buildGeminiFetchQuotesPrompt,
  buildGeminiExtractQuotesFromTextPrompt,
  buildGeminiExtractQuotesFromArticlePrompt,
  buildGeminiImproveQuotePrompt,
  createTopicExtractionPrompt,
  buildAnalyzePromptByType,
  buildAnalyzeFormattingPromptByType,
} from './prompts';

// The AI client will be initialized on-demand within each function.

/**
 * Validates the response from the Gemini API, ensuring it contains text content.
 * Provides detailed error messages if the response was empty or blocked by safety filters.
 * @param response The GenerateContentResponse from the API.
 * @param context A string describing the operation (e.g., "searching for quotes") for error messages.
 * @returns The response text if valid.
 * @throws An error with a detailed message if the response is invalid.
 */
export const getValidatedResponseText = (response: GenerateContentResponse, context: string): string => {
  // Case 1: The entire prompt was blocked.
  if (response.promptFeedback?.blockReason) {
    const errorMessage = `Request blocked while ${context}. Reason: ${response.promptFeedback.blockReason}.`;
    console.error(`Safety ratings for blocked prompt (${context}):`, response.promptFeedback.safetyRatings);
    throw new ModelResponseError(errorMessage);
  }

  // Case 2: No candidates were returned.
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error(`The model returned no response candidates while ${context}.`);
  }

  const candidate = response.candidates[0];

  // Case 3: The candidate was returned, but the response was blocked for a specific reason.
  if (candidate.finishReason && ['SAFETY', 'RECITATION', 'OTHER'].includes(candidate.finishReason)) {
    const errorMessage = `The model's response was blocked while ${context}. Reason: ${candidate.finishReason}.`;
    console.error(`Safety ratings for blocked response (${context}):`, candidate.safetyRatings);
    throw new ModelResponseError(errorMessage);
  }

  // Case 4: A valid candidate was returned, but it contains no text content.
  // The `.text` accessor is the safest way to get the text. If it's empty,
  // it means the model's turn did not include a text part.
  const rawText = response.text;
  if (!rawText) {
    const finishReason = candidate.finishReason ? ` The finish reason was "${candidate.finishReason}".` : "";
    const errorMessage = `The model returned no content while ${context}.${finishReason} This can happen if no information is available for the query or if the content was filtered.`;
    throw new Error(errorMessage);
  }

  return rawText;
};

class GeminiService implements LlmService {
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
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
      const prompt = buildGeminiFetchQuotesPrompt({
        personName,
        maxQuotes,
        timePeriod,
        languages,
        context,
      });

      appendLogRequestPayload(sessionId, logId, { prompt });

      const requestDetails = {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.5,
        },
      };

      const interactionId = addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model: requestDetails.model,
        operation: 'generateContent',
        requestPayload: requestDetails,
        metadata: { task: 'fetchQuotes' },
      });

      let response: GenerateContentResponse;
      let responseSnapshot: any;
      let capturedError: any;

      try {
        response = await ai.models.generateContent(requestDetails);
        responseSnapshot = response;
      } catch (error) {
        capturedError = error;
        throw error;
      } finally {
        completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
      }

      const rawText = getValidatedResponseText(response, "searching for quotes");

      // FIX: Use a robust regex-based method to extract the JSON object.
      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the AI response:", rawText);
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

      // FIX: Map the new JSON structure to the app's Quote type.
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
        // This can happen if the AI returns malformed data.
        // It's not an error if it simply found no *new* quotes.
        console.warn("The AI response contained malformed quote data, but no valid quotes could be extracted.");
      }

      // URL resolution disabled due to CORS issues
      const urls = quotes.map(q => q.source);
      const resolvedUrls = await resolveUrls(urls);
      const quotesWithResolvedUrls = quotes.map((quote, index) => ({
        ...quote,
        source: resolvedUrls[index],
      }));

      return quotesWithResolvedUrls;

    } catch (error) {
      console.error("Error fetching quotes:", error);
      // FIX: Re-throw the original error to provide more specific feedback to the user.
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
    person?: PersonInfo,
    analysisContext?: string,
    links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>,
    analysisType: 'audit' | 'flaws' = 'audit'
  ): Promise<AuditResult> {
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
      // Step 1: Generate Analysis Notes (Text)
      const analysisPrompt = buildAnalyzePromptByType(analysisType, {
        quoteText,
        quoteLanguageName,
        person,
        personName: person?.name,
        analysisContext,
        links,
      });

      appendLogRequestPayload(sessionId, logId, { prompt: analysisPrompt, step: 'analysis' });

      const analysisRequestDetails = {
        model: 'gemini-3.5-flash',
        contents: analysisPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: temperature,
        }
      };

      const analysisInteractionId = addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model: analysisRequestDetails.model,
        operation: 'generateContent',
        requestPayload: analysisRequestDetails,
        metadata: { task: 'analyzeQuote', step: 'analysis' },
      });

      let analysisResponse: GenerateContentResponse;
      let analysisResponseSnapshot: any;
      let analysisCapturedError: any;

      try {
        analysisResponse = await ai.models.generateContent(analysisRequestDetails);
        analysisResponseSnapshot = analysisResponse;
      } catch (error) {
        analysisCapturedError = error;
        throw error;
      } finally {
        completeModelInteractionLog(sessionId, logId, analysisInteractionId, analysisResponseSnapshot, analysisCapturedError);
      }

      const analysisNotes = getValidatedResponseText(analysisResponse, "analyzing the quote");

      // Step 2: Format to JSON
      const formattingPrompt = buildAnalyzeFormattingPromptByType(analysisType, {
        quoteLanguageName,
        analysisNotes,
        analysisType // Explicitly pass the type
      });

      appendLogRequestPayload(sessionId, logId, { prompt: formattingPrompt, step: 'formatting' });

      const formattingRequestDetails = {
        model: 'gemini-3.5-flash', // Faster model for formatting
        contents: formattingPrompt,
        config: {
          temperature: 0.2, // Lower temperature for strict formatting
          responseMimeType: "application/json",
        }
      };

      const formattingInteractionId = addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model: formattingRequestDetails.model,
        operation: 'generateContent',
        requestPayload: formattingRequestDetails,
        metadata: { task: 'analyzeQuote', step: 'formatting' },
      });

      let formattingResponse: GenerateContentResponse;
      let formattingResponseSnapshot: any;
      let formattingCapturedError: any;

      try {
        formattingResponse = await ai.models.generateContent(formattingRequestDetails);
        formattingResponseSnapshot = formattingResponse;
      } catch (error) {
        formattingCapturedError = error;
        throw error;
      } finally {
        completeModelInteractionLog(sessionId, logId, formattingInteractionId, formattingResponseSnapshot, formattingCapturedError);
      }

      const rawJsonText = getValidatedResponseText(formattingResponse, "formatting analysis result");
      const jsonText = extractJson(rawJsonText);

      if (!jsonText) {
        console.error("No valid JSON object found in the AI formatting response:", rawJsonText);
        throw new Error("Could not find a valid JSON object in the AI's formatting response.");
      }

      try {
        const parsed = JSON.parse(jsonText);
        try {
          const { validateAuditResult, validateFlawsResult } = await import('../services/analysisValidator');
          if (analysisType === 'flaws') {
            validateFlawsResult(parsed, jsonText);
          } else {
            validateAuditResult(parsed, jsonText);
          }
        } catch (validationError) {
          console.error('Model validation failed:', (validationError as Error).message);
          throw validationError;
        }
        return parsed;
      } catch (e) {
        if (e instanceof JsonParsingError || e instanceof Error && (e as any).name === 'ModelValidationError') {
          throw e;
        }
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
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
      const prompt = buildGeminiExtractQuotesFromTextPrompt({
        personName,
        textContent,
      });

      appendLogRequestPayload(sessionId, logId, { prompt });

      const requestDetails = {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: temperature,
        }
      };

      const interactionId = addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model: requestDetails.model,
        operation: 'generateContent',
        requestPayload: requestDetails,
        metadata: { task: 'extractFromText' },
      });

      let response: GenerateContentResponse;
      let responseSnapshot: any;
      let capturedError: any;

      try {
        response = await ai.models.generateContent(requestDetails);
        responseSnapshot = response;
      } catch (error) {
        capturedError = error;
        throw error;
      } finally {
        completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
      }

      const rawText = getValidatedResponseText(response, "extracting quotes from text");

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the AI response for text extraction:", rawText);
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
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {
      const prompt = buildGeminiExtractQuotesFromArticlePrompt({
        personName,
        articleMetadata,
        articleContent,
      });

      appendLogRequestPayload(sessionId, logId, { prompt });

      const requestDetails = {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: temperature,
        }
      };

      const interactionId = addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model: requestDetails.model,
        operation: 'generateContent',
        requestPayload: requestDetails,
        metadata: { task: 'extractFromArticle' },
      });

      let response: GenerateContentResponse;
      let responseSnapshot: any;
      let capturedError: any;

      try {
        response = await ai.models.generateContent(requestDetails);
        responseSnapshot = response;
      } catch (error) {
        capturedError = error;
        throw error;
      } finally {
        completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
      }

      const rawText = getValidatedResponseText(response, "extracting quotes from article");

      const jsonText = extractJson(rawText);
      if (!jsonText) {
        console.error("No valid JSON object found in the AI response for article extraction:", rawText);
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
    sessionId: string
  ): Promise<Partial<Quote>> {
    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    try {

      const prompt = buildGeminiImproveQuotePrompt({
        personName,
        quoteText: quote.text,
        languageName: quote.languageName,
        languageCode: quote.languageCode,
      });

      appendLogRequestPayload(sessionId, logId, { prompt });

      const requestDetails = {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: temperature,
        }
      };

      const interactionId = addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model: requestDetails.model,
        operation: 'generateContent',
        requestPayload: requestDetails,
        metadata: { task: 'improveQuote' },
      });

      let response: GenerateContentResponse;
      let responseSnapshot: any;
      let capturedError: any;

      try {
        response = await ai.models.generateContent(requestDetails);
        responseSnapshot = response;
      } catch (error) {
        capturedError = error;
        throw error;
      } finally {
        completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
      }

      const responseText = getValidatedResponseText(response, "improving quote");

      const jsonText = extractJson(responseText);
      if (!jsonText) {
        console.error("No valid JSON object found in the Gemini API response:", responseText);
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

  public async extractTopics(
    apiKey: string,
    text: string,
    language: string,
    temperature: number,
    logId?: string,
    sessionId?: string
  ): Promise<TopicAnalysisResult> {
    const prompt = createTopicExtractionPrompt(text, language);

    const responseText = await this.generateContent(apiKey, {
      model: 'gemini-3.5-flash',
      prompt,
      temperature,
      logId,
      sessionId,
      metadata: { stage: 'extraction', task: 'extractTopics' }
    });

    const jsonString = extractJson(responseText);
    if (!jsonString) {
      throw new JsonParsingError("Could not find JSON in response", responseText);
    }
    try {
      return JSON.parse(jsonString) as TopicAnalysisResult;
    } catch (e) {
      throw new JsonParsingError("Failed to parse JSON", responseText);
    }
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
    const { model, prompt, temperature, metadata, logId, sessionId } = params;

    if (!apiKey) throw new Error("Gemini API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    // Removed appendLogRequestPayload to prevent polluting the main log entry with internal prompts.
    // The prompt is already logged in the model interaction below.

    const requestDetails = {
      model,
      contents: prompt,
      config: typeof temperature === 'number' ? { temperature } : undefined,
    };

    const interactionId = sessionId && logId
      ? addModelInteractionLog(sessionId, logId, {
        provider: 'Google',
        model,
        operation: 'generateContent',
        requestPayload: requestDetails,
        metadata,
      })
      : null;

    let response: GenerateContentResponse;
    let responseSnapshot: any;
    let capturedError: any;

    try {
      response = await ai.models.generateContent(requestDetails);
      responseSnapshot = response;
    } catch (error) {
      capturedError = error;
      throw error;
    } finally {
      if (interactionId && sessionId && logId) {
        completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
      }
    }

    return getValidatedResponseText(response, 'processing prompt');
  }
}

export default new GeminiService();
