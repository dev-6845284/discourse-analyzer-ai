import {
    AuditResult,
    PersonInfo,
    JsonParsingError,
} from '../../types';
import { extractJson } from '../utils';
import {
    buildAnalyzePromptByType,
    buildAnalyzeFormattingPromptByType,
} from '../prompts';
import { callChatGptAPI } from './api';
import { CHATGPT_FORMATTER_MODEL } from './constants';

export const analyzeQuoteText = async (
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
): Promise<AuditResult> => {
    if (!apiKey) throw new Error("OpenAI API key is missing.");

    try {
        // Step 1: Deep Analysis with Search
        const analysisPrompt = buildAnalyzePromptByType(analysisType, {
            quoteText,
            quoteLanguageName,
            person,
            personName: person?.name,
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
        const formattingPrompt = buildAnalyzeFormattingPromptByType(analysisType, {
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
            const parsed = JSON.parse(jsonText);
            // Validate parsed response against configured audit categories
            try {
                const { validateAuditResult, validateFlawsResult } = await import('../../services/analysisValidator');
                if (analysisType === 'flaws') {
                    validateFlawsResult(parsed, jsonText);
                } else {
                    validateAuditResult(parsed, jsonText);
                }
            } catch (validationError) {
                if (validationError instanceof Error) {
                    console.error('Model validation failed:', validationError.message);
                    throw validationError;
                }
                throw validationError;
            }

            return parsed;
        } catch (e) {
            if (e instanceof JsonParsingError || e instanceof Error && (e as any).name === 'ModelValidationError') {
                throw e;
            }
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
};
