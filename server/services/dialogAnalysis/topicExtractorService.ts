/**
 * Backend service for extracting topics and generating tag clouds from transcript chunks
 * Uses fast models (Gemini Flash or Grok) for speed with direct API calls
 */

import geminiService from '../../llm_services/geminiService';
import grokService from '../../llm_services/grokService';
import chatGptService from '../../llm_services/chatGptService';
import { TopicAnalysisResult } from '../../types';

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
  apiKeys: Record<string, string>;
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
  apiKeys: Record<string, string>,
  language: string,
  segmentTiming?: Array<{ start: number; end: number; text: string }>
): Promise<TopicAnalysisResult> {
  try {
    let result: TopicAnalysisResult;

    if (model === 'gemini' || model === 'gemini-flash') {
      const apiKey = apiKeys['gemini'];
      if (!apiKey) {
        throw new Error('Gemini API key not found');
      }
      result = await geminiService.extractTopics(apiKey, text, language, 0.3);
    } else if (model === 'grok' || model === 'grok-fast') {
      const apiKey = apiKeys['grok'];
      if (!apiKey) {
        throw new Error('Grok API key not found');
      }
      result = await grokService.extractTopics(apiKey, text, language, 0.3);
    } else if (model === 'chatgpt') {
      const apiKey = apiKeys['chatgpt'] || apiKeys['openai'];
      if (!apiKey) {
        throw new Error('ChatGPT API key not found');
      }
      result = await chatGptService.extractTopics(apiKey, text, language, 0.3);
    } else {
      // Default to Gemini
      const apiKey = apiKeys['gemini'];
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

  for (const block of request.blocks) {
    const result = await extractBlockTopics(
      block.blockId,
      block.startTime,
      block.endTime,
      block.text,
      request.model,
      request.apiKeys,
      request.language,
      block.segmentTiming
    );
    results.push(result);

    // Add small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
