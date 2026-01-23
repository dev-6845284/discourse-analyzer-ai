import {
    Quote,
    JsonParsingError,
} from '../../types';
import { extractJson } from '../utils';
import {
    buildImproveQuoteResearchPrompt,
    buildImproveQuoteFormattingPrompt,
} from '../prompts';
import { callChatGptAPI } from './api';
import { CHATGPT_FORMATTER_MODEL } from './constants';

export const improveQuote = async (
    apiKey: string,
    quote: Quote,
    personName: string,
    temperature: number,
    logId: string,
    sessionId: string
): Promise<Partial<Quote>> => {
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
};
