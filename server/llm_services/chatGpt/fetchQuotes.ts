import {
    Quote,
    JsonParsingError,
    AnalysisCategory,
    AnalysisRating,
} from '../../types';
import { extractJson } from '../utils';
import {
    buildFetchQuotesResearchPrompt,
    buildFetchQuotesFormattingPrompt,
} from '../prompts';
import { callChatGptAPI } from './api';
import { CHATGPT_FORMATTER_MODEL } from './constants';

export const fetchQuotesForPerson = async (
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
): Promise<Quote[]> => {
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
};
