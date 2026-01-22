/**
 * Backend service for extracting topics and generating tag clouds from transcript chunks
 * Uses fast models (Gemini Flash or Grok) for speed with direct API calls
 */

import geminiService from '../../llm_services/geminiService';
import grokService from '../../llm_services/grokService';
import chatGptService from '../../llm_services/chatGptService';
import { TopicAnalysisResult } from '../../types';
import { getEffectiveApiKeyForUser } from '../../services/apiKeyService';
import { getProviderFromModel } from './utils';

export interface TranscriptAnalysisRequest {
  blocks: Array<{
    blockId: string;
    startTime: number;
    endTime: number;
    text: string;
    segmentTiming?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
  language: string;
  model: string;
  userId: string;
}

/**
 * Extracts topics from a single transcript block using the specified fast model
 */
export async function extractBlockTopics(
  blockId: string,
  startTime: number,
  endTime: number,
  text: string,
  model: string,
  apiKey: string,
  language: string,
  segmentTiming?: Array<{ start: number; end: number; text: string }>
): Promise<TopicAnalysisResult> {
  try {
    let result: TopicAnalysisResult;

    const provider = getProviderFromModel(model);

    if (provider === 'gemini') {
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }
      result = await geminiService.extractTopics(apiKey, text, language, 0.3);
    } else if (provider === 'grok') {
      if (!apiKey) {
        throw new Error('Grok API key not found');
      }
      result = await grokService.extractTopics(apiKey, text, language, 0.3);
    } else if (provider === 'openai') {
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }
      result = await chatGptService.extractTopics(apiKey, text, language, 0.3);
    } else {
      // Default to Gemini (should be covered by getProviderFromModel default, but safe fallback)
      if (!apiKey) {
        throw new Error('No API key found for topic extraction');
      }
      result = await geminiService.extractTopics(apiKey, text, language, 0.3);
    }

    // Convert segmentTiming to segments array format
    const segments = segmentTiming?.map(seg => ({
      timestamp: seg.start,
      endTime: seg.end,
      text: seg.text,
    })) || [];

    return {
      ...result,
      blockId,
      startTime,
      endTime,
      text,
      segments,
    };
  } catch (error: any) {
    console.error(`Error extracting topics for block ${blockId}:`, error);
    // Return minimal result on error
    return {
      blockId,
      startTime,
      endTime,
      text,
      mainTopics: [],
      tags: [],
      summary: 'Error analyzing block',
      segments: [],
    };
  }
}

/**
 * Batch process multiple transcript blocks for topic extraction
 * Processes sequentially to avoid rate limiting
 */
export async function extractTranscriptTopics(
  request: TranscriptAnalysisRequest
): Promise<TopicAnalysisResult[]> {
  const results: TopicAnalysisResult[] = [];

  // Resolve API key
  const provider = getProviderFromModel(request.model);
  console.log(`[TopicAnalysis] Resolving key for user ${request.userId}, model ${request.model} (provider: ${provider})`);

  const key = await getEffectiveApiKeyForUser(request.userId, provider);
  if (!key || key.trim() === '') {
    throw new Error(`Failed to resolve API key for provider '${provider}' (User: ${request.userId}). Please check your settings.`);
  }

  // apiKeys map construction removed

  console.log(`[TopicAnalysis Debug] Model: ${request.model}, Provider: ${provider}, Resolved Key Length: ${key?.length}`);


  for (const block of request.blocks) {
    const result = await extractBlockTopics(
      block.blockId,
      block.startTime,
      block.endTime,
      block.text,
      request.model,
      key,
      request.language,
      block.segmentTiming
    );
    results.push(result);

    // Add small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

