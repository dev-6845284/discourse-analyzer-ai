import { DialogLine, TopicGroup } from '../../types';
import { buildInferInitialTopicPrompt, buildProcessChunkPrompt } from '../../llm_services/prompts';
import { callGemini, extractJsonFromResponse } from './utils';

interface SegmentationResponse {
  dialogToAdd: DialogLine[];
  dialogForNextTopic: DialogLine[];
  newTopic: boolean;
  newTopicTitle: string;
}

/**
 * Phase 1: Segment dialog into topic groups using a fast model
 */
export async function segmentTopics(
  allLines: DialogLine[],
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<TopicGroup[]> {
  const groups: TopicGroup[] = [];
  
  // 1. Initial topic detection (first 10 mins)
  const initialChunkDuration = 10 * 60; // 600 seconds
  const startTime = allLines[0].timestamp;
  
  let currentChunkEndIndex = allLines.findIndex(l => l.timestamp > startTime + initialChunkDuration);
  if (currentChunkEndIndex === -1) currentChunkEndIndex = allLines.length;

  const initialLines = allLines.slice(0, currentChunkEndIndex);
  let remainingLines = allLines.slice(currentChunkEndIndex);

  // Infer initial topic
  console.log('[DialogAnalysis] Inferring initial topic from first 10 minutes...');
  const initialTitle = await inferInitialTopic(initialLines, language, model, apiKeys);
  console.log(`[DialogAnalysis] Initial topic identified: "${initialTitle}"`);
  
  let currentGroup: TopicGroup = {
    id: `topic-${Date.now()}-0`,
    title: initialTitle,
    dialogLines: [...initialLines]
  };

  // 2. Incremental processing (5 min chunks)
  const chunkDuration = 5 * 60; // 300 seconds
  let chunkIndex = 0;

  console.log(`[DialogAnalysis] Processing remaining ${remainingLines.length} lines in 5-minute chunks...`);

  while (remainingLines.length > 0) {
    // Get next chunk
    const chunkStartTime = remainingLines[0].timestamp;
    let chunkEndIndex = remainingLines.findIndex(l => l.timestamp > chunkStartTime + chunkDuration);
    if (chunkEndIndex === -1) chunkEndIndex = remainingLines.length;

    const chunkLines = remainingLines.slice(0, chunkEndIndex);
    remainingLines = remainingLines.slice(chunkEndIndex);

    if (chunkLines.length === 0) break;

    console.log(`[DialogAnalysis] Processing chunk ${chunkIndex + 1} (${chunkLines.length} lines)...`);

    // Decide if new topic
    const decision = await processChunk(
      chunkLines,
      currentGroup,
      language,
      model,
      apiKeys
    );

    if (decision.newTopic) {
      console.log(`[DialogAnalysis] New topic detected: "${decision.newTopicTitle}"`);
    } else {
      console.log(`[DialogAnalysis] Continuing current topic: "${currentGroup.title}"`);
    }

    // Apply decision
    // Append dialogToAdd to current group
    if (decision.dialogToAdd && decision.dialogToAdd.length > 0) {
      currentGroup.dialogLines.push(...decision.dialogToAdd);
    }

    if (decision.newTopic) {
      // Finish current group
      if (currentGroup.dialogLines.length > 0) {
        groups.push(currentGroup);
      }

      // Start new group
      currentGroup = {
        id: `topic-${Date.now()}-${++chunkIndex}`,
        title: decision.newTopicTitle || 'New Topic',
        dialogLines: decision.dialogForNextTopic || []
      };
    } else {
      // If not a new topic, but we have dialogForNextTopic (which shouldn't happen if newTopic is false, 
      // but let's handle it just in case or treat it as part of current if the model messed up)
      // The prompt instructions say: "dialogForNextTopic": [/* lines that belong to a new topic, if transition detected */]
      // So if newTopic is false, dialogForNextTopic should be empty.
      // If the model returns lines in dialogForNextTopic but says newTopic: false, we'll just append them to current.
      if (decision.dialogForNextTopic && decision.dialogForNextTopic.length > 0) {
         currentGroup.dialogLines.push(...decision.dialogForNextTopic);
      }
    }
  }

  // Push the last group
  if (currentGroup.dialogLines.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

async function inferInitialTopic(
  lines: DialogLine[],
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<string> {
  const prompt = buildInferInitialTopicPrompt(lines, language);

  const response = await callGemini(prompt, model, apiKeys['gemini']);
  return response.trim();
}

async function processChunk(
  chunkLines: DialogLine[],
  currentGroup: TopicGroup,
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<SegmentationResponse> {
  const prompt = buildProcessChunkPrompt(chunkLines, currentGroup, language);

  const responseText = await callGemini(prompt, model, apiKeys['gemini']);
  const responseJson = extractJsonFromResponse(responseText);

  return {
    dialogToAdd: mapLinesToOriginal(responseJson.dialogToAdd, chunkLines),
    dialogForNextTopic: mapLinesToOriginal(responseJson.dialogForNextTopic, chunkLines),
    newTopic: responseJson.newTopic,
    newTopicTitle: responseJson.newTopicTitle
  };
}

function mapLinesToOriginal(returnedLines: any[], originalLines: DialogLine[]): DialogLine[] {
  if (!returnedLines || returnedLines.length === 0) return [];
  
  // This is a fuzzy matching problem. 
  // For simplicity, we assume the model returns lines in order.
  // We'll try to find the corresponding lines in originalLines.
  
  // If the model returns the exact text, we can match.
  // If the model hallucinates or slightly changes text, it's hard.
  
  // Strategy:
  // If returnedLines contains X lines, we assume they correspond to some lines in originalLines.
  // Since we are splitting a chunk, `dialogToAdd` should be the start of `originalLines`, and `dialogForNextTopic` should be the rest.
  // So we just need to know the COUNT of lines in `dialogToAdd`.
  
  // Let's assume the model respects the order.
  // We can just count how many lines are in `dialogToAdd` and slice `originalLines`.
  // But we should verify if `newTopic` is true.
  
  // Actually, relying on the model to return the full text of lines is expensive and error-prone.
  // But I must follow the user's "Model response format" requirement.
  
  // I will try to match the text.
  const result: DialogLine[] = [];
  let searchStartIndex = 0;
  
  for (const retLine of returnedLines) {
    const textToMatch = retLine.text?.trim();
    if (!textToMatch) continue;
    
    // Find this line in originalLines starting from searchStartIndex
    const foundIndex = originalLines.findIndex((l, idx) => idx >= searchStartIndex && l.text.includes(textToMatch)); // simple includes check
    
    if (foundIndex !== -1) {
      result.push(originalLines[foundIndex]);
      searchStartIndex = foundIndex + 1;
    }
  }
  
  return result;
}
