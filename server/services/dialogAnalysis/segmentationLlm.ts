import { DialogLine, TopicGroup } from '../../types';
import { buildInferInitialTopicPrompt, buildProcessChunkPrompt } from '../../llm_services/prompts';
import geminiService from '../../llm_services/geminiService';
import { extractJsonFromResponse } from './utils';
import { withTimeout, mapLinesToOriginal } from './segmentationUtils';

export interface SegmentationResponse {
  dialogToAdd: DialogLine[];
  dialogForNextTopic: DialogLine[];
  newTopic: boolean;
  newTopicTitle: string;
}

export async function inferInitialTopic(
  lines: DialogLine[],
  language: string,
  model: string,
  apiKeys: Record<string, string>,
  sessionId?: string,
  logId?: string
): Promise<string> {
  const prompt = buildInferInitialTopicPrompt(lines, language);

  console.log(`[DialogAnalysis] Inferring initial topic (model: ${model})...`);
  const startTime = Date.now();

  // Use GEMINI_API_KEY specifically
  const apiKey = apiKeys['gemini'];
  if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in apiKeys");
  }

  const response = await withTimeout(
    geminiService.generateContent(apiKey, {
      model,
      prompt,
      sessionId,
      logId,
      metadata: { task: 'dialog-analysis', stage: 'infer-initial-topic' },
    }),
    60000,
    "Initial topic inference timed out"
  );
  
  console.log(`[DialogAnalysis] Initial topic inferred in ${Date.now() - startTime}ms.`);
  return response.trim();
}

export async function processChunk(
  chunkLines: DialogLine[],
  currentGroup: TopicGroup,
  language: string,
  model: string,
  apiKeys: Record<string, string>,
  sessionId?: string,
  logId?: string
): Promise<SegmentationResponse> {
  const prompt = buildProcessChunkPrompt(chunkLines, currentGroup, language);

  console.log(`[DialogAnalysis] Sending chunk to LLM (model: ${model}, lines: ${chunkLines.length})...`);
  const startTime = Date.now();

  // Use GEMINI_API_KEY specifically
  const apiKey = apiKeys['gemini'];
  if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in apiKeys");
  }

  const responseText = await withTimeout(
    geminiService.generateContent(apiKey, {
      model,
      prompt,
      sessionId,
      logId,
      metadata: {
        task: 'dialog-analysis',
        stage: 'segment-topics',
        chunkSize: chunkLines.length,
        currentTopic: currentGroup.title,
      },
    }),
    120000, // 2 minutes timeout
    "LLM request timed out after 120s"
  );

  console.log(`[DialogAnalysis] Received response from LLM in ${Date.now() - startTime}ms. Parsing JSON...`);

  let responseJson;
  try {
    responseJson = extractJsonFromResponse(responseText);
  } catch (e) {
    console.error(`[DialogAnalysis] Failed to parse JSON from LLM response. Response preview: ${responseText.substring(0, 200)}...`);
    throw e;
  }

  return {
    dialogToAdd: mapLinesToOriginal(responseJson.dialogToAdd, chunkLines),
    dialogForNextTopic: mapLinesToOriginal(responseJson.dialogForNextTopic, chunkLines),
    newTopic: responseJson.newTopic,
    newTopicTitle: responseJson.newTopicTitle
  };
}
