import {
    Quote,
    JsonParsingError,
} from '../../types';
import { extractJson } from '../utils';
import {
    buildExtractQuotesFromArticlePrompt,
    buildExtractQuotesFormattingPrompt,
} from '../prompts';
import { callChatGptAPI } from './api';
import { CHATGPT_FORMATTER_MODEL, CHAT_GPT_MINI } from './constants';

export const extractQuotesFromArticle = async (
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
): Promise<Quote[]> => {
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
};
