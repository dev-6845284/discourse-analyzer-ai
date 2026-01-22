import {
    TopicAnalysisResult,
    JsonParsingError,
} from '../../types';
import { extractJson } from '../utils';
import { createTopicExtractionPrompt } from '../prompts';
import { generateContent } from './api';

export const extractTopics = async (
    apiKey: string,
    text: string,
    language: string,
    temperature: number,
    logId?: string,
    sessionId?: string
): Promise<TopicAnalysisResult> => {
    const prompt = createTopicExtractionPrompt(text, language);

    const responseText = await generateContent(apiKey, {
        model: 'gpt-4o-mini',
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
};
