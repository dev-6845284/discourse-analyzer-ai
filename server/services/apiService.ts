import { GoogleGenerativeAI, GenerateContentResponse } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { Quote, AnalysisResult } from '../../src/types';
import { SUPPORTED_LANGUAGES } from '../constants';

// --- Utility Classes and Functions ---

export class JsonParsingError extends Error {
  public rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'JsonParsingError';
    this.rawResponse = rawResponse;
  }
}

const extractJson = (text: string): string | null => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0]) {
    return jsonMatch[0];
  }
  return null;
};

const getValidatedResponseText = (response: GenerateContentResponse, context: string): string => {
    if (response.promptFeedback?.blockReason) {
        const errorMessage = `Request blocked while ${context}. Reason: ${response.promptFeedback.blockReason}.`;
        console.error(`Safety ratings for blocked prompt (${context}):`, response.promptFeedback.safetyRatings);
        throw new Error(errorMessage);
    }
    if (!response.candidates || response.candidates.length === 0) {
        throw new Error(`The model returned no response candidates while ${context}.`);
    }
    const candidate = response.candidates[0];
    if (candidate.finishReason && ['SAFETY', 'RECITATION', 'OTHER'].includes(candidate.finishReason)) {
        const errorMessage = `The model's response was blocked while ${context}. Reason: ${candidate.finishReason}.`;
        console.error(`Safety ratings for blocked response (${context}):`, candidate.safetyRatings);
        throw new Error(errorMessage);
    }
    const rawText = candidate.content?.parts?.[0]?.text || '';
    if (!rawText) {
        const finishReason = candidate.finishReason ? ` The finish reason was "${candidate.finishReason}".` : "";
        const errorMessage = `The model returned no content while ${context}.${finishReason}`;
        throw new Error(errorMessage);
    }
    return rawText;
};


// --- API Service Logic ---

const getApiKey = (aiProvider: string): string => {
  const key = {
    gemini: process.env.GEMINI_API_KEY,
    grok: process.env.GROK_API_KEY,
    chatgpt: process.env.CHATGPT_API_KEY,
  }[aiProvider];

  if (!key) throw new Error(`API key for ${aiProvider} is not configured.`);
  return key;
};

const getAiClient = (aiProvider: string, apiKey: string) => {
    switch (aiProvider) {
        case 'gemini':
            return new GoogleGenerativeAI(apiKey);
        case 'grok':
            return new Groq({ apiKey });
        case 'chatgpt':
            return new OpenAI({ apiKey });
        default:
            throw new Error('Invalid AI provider');
    }
};


export const fetchQuotesForPerson = async (
  aiProvider: string,
  personName: string,
  languages: string[],
  resultCount: number,
  existingQuotesText: string[],
  temperature: number,
  maxQuoteLength: number,
  timePeriod: { description: string; startDate?: string; endDate?: string }
): Promise<Quote[]> => {
    const apiKey = getApiKey(aiProvider);

    const languageNames = languages.map(code => SUPPORTED_LANGUAGES.find(l => l.code === code)?.name).filter(Boolean);
    const languageInstruction = languageNames.length > 0
        ? `Your search must cover sources in the following languages: ${languageNames.join(', ')}.`
        : 'Your search should primarily cover English sources, but identify and return the language for any non-English quotes you find.';

    let exclusionInstruction = '';
    if (existingQuotesText && existingQuotesText.length > 0) {
        const quotesToExclude = existingQuotesText.map(q => `- "${q.slice(0, 150)}..."`).join('\n');
        exclusionInstruction = `\nYou MUST find new quotes that are NOT in the following list. Do not repeat any of the quotes below.\nHere are the quotes that have already been found:\n${quotesToExclude}`;
    }

    const prompt = `...`; // The full prompt is very long, assume it's constructed here as before

    let rawText: string;

    try {
        switch (aiProvider) {
            case 'gemini':
                const gemini = getAiClient(aiProvider, apiKey) as GoogleGenerativeAI;
                const geminiResponse = await gemini.getGenerativeModel({ model: 'gemini-pro' }).generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature },
                });
                rawText = getValidatedResponseText(geminiResponse.response, "searching for quotes");
                break;
            case 'grok':
                 const groq = getAiClient(aiProvider, apiKey) as Groq;
                 const groqResponse = await groq.chat.completions.create({
                     messages: [{ role: 'user', content: prompt }],
                     model: 'grok-1.5-flash',
                     temperature,
                 });
                 rawText = groqResponse.choices[0]?.message?.content || '';
                 break;
            case 'chatgpt':
                const openai = getAiClient(aiProvider, apiKey) as OpenAI;
                const openaiResponse = await openai.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'gpt-4-turbo',
                    temperature,
                    response_format: { type: "json_object" },
                });
                rawText = openaiResponse.choices[0]?.message?.content || '';
                break;
            default:
                throw new Error('Invalid AI provider');
        }

        if (!rawText) {
            throw new Error("The AI returned an empty response.");
        }

        const jsonText = extractJson(rawText);
        if (!jsonText) {
            throw new JsonParsingError("Could not find a valid JSON object in the AI's response.", rawText);
        }

        const parsedResponse = JSON.parse(jsonText);
        const quotesData = parsedResponse.quotes;

        if (!quotesData || !Array.isArray(quotesData)) {
            return [];
        }

        const quotes: Quote[] = quotesData.map((q: any, index: number) => ({
            id: `quote-${Date.now()}-${index}`,
            text: q.text?.trim(),
            source: q.source,
            title: q.title,
            date: q.date,
            languageCode: q.languageCode,
            languageName: q.languageName,
        })).filter(q => q.text);

        return quotes;

    } catch (error) {
        console.error(`Error fetching quotes with ${aiProvider}:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`An unknown error occurred while fetching quotes with ${aiProvider}.`);
    }
};

// Implement analyzeQuoteText, extractQuotesFromText, and improveQuote following the same pattern...
// For brevity, these are omitted here but would follow the same switch-case logic.
