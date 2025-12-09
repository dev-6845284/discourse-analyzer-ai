import chatGptService from '../../llm_services/chatGptService';
import geminiService from '../../llm_services/geminiService';
import grokService from '../../llm_services/grokService';
import { buildSpeakerIdentificationPrompt } from '../../llm_services/prompts';
import { extractJson } from '../../llm_services/utils';
import { addModelInteractionLog, completeModelInteractionLog } from '../logService';

export interface SpeakerAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  dialogue: Array<{
    speaker: string;
    text: string;
  }>;
  identifiedSpeakers: string[]; // List of unique speakers found in this block
}

export interface SpeakerAnalysisRequest {
  blocks: Array<{
    blockId: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
  language: string;
  model: string;
  apiKeys: Record<string, string>;
  sessionId?: string;
  logId?: string;
}

/**
 * Main function to identify speakers in transcript blocks
 */
export async function identifySpeakers(
  request: SpeakerAnalysisRequest
): Promise<SpeakerAnalysisResult[]> {
  const { blocks, language, model, apiKeys, sessionId, logId } = request;
  const results: SpeakerAnalysisResult[] = [];
  let previousContext: string | null = null;

  for (const block of blocks) {
    const prompt = buildSpeakerIdentificationPrompt(block.text, previousContext, language);
    
    // Determine provider and model name for logging
    let provider: string;
    let modelName: string;
    if (model === 'chatgpt' && apiKeys.chatgpt) {
      provider = 'chatgpt';
      modelName = 'gpt-4o-mini';
    } else if (model === 'grok' && apiKeys.grok) {
      provider = 'grok';
      modelName = 'grok-2-latest';
    } else {
      provider = 'gemini';
      modelName = 'gemini-1.5-flash';
    }

    // Log the LLM request
    let interactionId: string | null = null;
    if (sessionId && logId) {
      interactionId = addModelInteractionLog(sessionId, logId, {
        provider,
        model: modelName,
        operation: 'speaker-identification',
        requestPayload: { prompt, blockId: block.blockId },
        metadata: { blockId: block.blockId, startTime: block.startTime, endTime: block.endTime },
      });
    }

    let result: any;
    try {
      let responseText: string;

      if (model === 'chatgpt' && apiKeys.chatgpt) {
        responseText = await chatGptService.generateContent(apiKeys.chatgpt, {
          model: 'gpt-4o-mini',
          prompt,
          temperature: 0,
        });
      } else if (model === 'grok' && apiKeys.grok) {
        responseText = await grokService.generateContent(apiKeys.grok, {
          model: 'grok-2-latest',
          prompt,
          temperature: 0,
        });
      } else {
        // Default to Gemini
        const apiKey = apiKeys.gemini || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Gemini API key is missing');
        
        responseText = await geminiService.generateContent(apiKey, {
          model: 'gemini-1.5-flash',
          prompt,
          temperature: 0,
        });
      }

      // Log successful response
      if (sessionId && logId) {
        completeModelInteractionLog(sessionId, logId, interactionId, { responseText });
      }

      const jsonText = extractJson(responseText);
      if (!jsonText) {
        throw new Error('No valid JSON found in response');
      }
      result = JSON.parse(jsonText);

      const analysisResult: SpeakerAnalysisResult = {
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: result.dialogue,
        identifiedSpeakers: result.identifiedSpeakers,
      };

      results.push(analysisResult);

      // Update context for next block
      // Take the last 3 lines of dialogue
      if (result.dialogue && Array.isArray(result.dialogue)) {
        const lastLines = result.dialogue.slice(-3);
        previousContext = lastLines.map((l: any) => `${l.speaker}: ${l.text}`).join('\n');
      }

    } catch (error) {
      // Log the error
      if (sessionId && logId) {
        completeModelInteractionLog(sessionId, logId, interactionId, undefined, error);
      }
      console.error(`[SpeakerIdentification] Error analyzing block ${block.blockId}:`, error);
      
      // Push a fallback result
      results.push({
        blockId: block.blockId,
        startTime: block.startTime,
        endTime: block.endTime,
        dialogue: [{ speaker: 'Unknown', text: block.text }],
        identifiedSpeakers: ['Unknown'],
      });
      previousContext = null; // Reset context on error
    }
  }

  return results;
}
