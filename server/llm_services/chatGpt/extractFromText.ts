import {
    Quote,
    JsonParsingError,
} from '../../types';
import { extractJson } from '../utils';
import {
    buildExtractQuotesFromTextPrompt,
    buildExtractQuotesFormattingPrompt,
} from '../prompts';
import { callChatGptAPI } from './api';
import { CHATGPT_FORMATTER_MODEL } from './constants';

export const extractQuotesFromText = async (
    apiKey: string,
    personName: string,
    textContent: string,
    temperature: number,
    logId: string,
    sessionId: string
): Promise<Quote[]> => {
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
};
