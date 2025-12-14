import { DialogLine, TopicGroup } from '../../types';
import { inferInitialTopic, processChunk, SegmentationResponse } from './segmentationLlm';

/**
 * Segments a dialog into topic groups using an LLM-based approach.
 * 
 * @param allLines - Array of dialog lines to be analyzed.
 * @param language - Language of the dialog.
 * @param fastModel - Fast LLM model to use for chunk processing.
 * @param betterModel - Better LLM model to use for initial topic inference.
 * @param apiKeys - API keys for accessing the LLM service.
 * @param sessionId - Optional session ID for logging.
 * @param logId - Optional log ID for logging.
 * @returns A promise that resolves to an array of topic groups.
 */
export async function segmentTopics(
  allLines: DialogLine[],
  language: string,
  fastModel: string,
  betterModel: string,
  apiKeys: Record<string, string>,
  sessionId?: string,
  logId?: string
): Promise<TopicGroup[]> {
  const groups: TopicGroup[] = [];
  
  // 1. Initial topic detection (first 10 minutes of dialog)
  const initialChunkDuration = 3 * 60; // 180 seconds
  const startTime = allLines[0].timestamp;

  // Find the index of the first line beyond the initial chunk duration
  let currentChunkEndIndex = allLines.findIndex(l => l.timestamp > startTime + initialChunkDuration);
  if (currentChunkEndIndex === -1) currentChunkEndIndex = allLines.length;

  // Split the dialog into the initial chunk and the remaining lines
  const initialLines = allLines.slice(0, currentChunkEndIndex);
  let remainingLines = allLines.slice(currentChunkEndIndex);

  // Infer the initial topic using the better model
  console.log('[DialogAnalysis] Inferring initial topic from first 10 minutes...');
  const initialTitle = await inferInitialTopic(initialLines, language, betterModel, apiKeys, sessionId, logId);
  console.log(`[DialogAnalysis] Initial topic identified: "${initialTitle}"`);
  
  // Create the first topic group with the initial lines
  let currentGroup: TopicGroup = {
    id: `topic-${Date.now()}-0`,
    title: initialTitle,
    dialogLines: [...initialLines]
  };

  // 2. Incremental processing of remaining lines in 5-minute chunks using the fast model
  const chunkDuration = 5 * 60; // 300 seconds
  let chunkIndex = 0;

  console.log(`[DialogAnalysis] Processing remaining ${remainingLines.length} lines in 5-minute chunks...`);

  while (remainingLines.length > 0) {
    // Get the next chunk of lines based on the chunk duration
    const chunkStartTime = remainingLines[0].timestamp;
    let chunkEndIndex = remainingLines.findIndex(l => l.timestamp > chunkStartTime + chunkDuration);
    
    // If no lines are found beyond the chunk duration, take all remaining lines
    if (chunkEndIndex === -1) {
      chunkEndIndex = remainingLines.length;
    }

    const chunkLines = remainingLines.slice(0, chunkEndIndex);
    remainingLines = remainingLines.slice(chunkEndIndex);

    if (chunkLines.length === 0) break;

    console.log(`[DialogAnalysis] Processing chunk ${chunkIndex + 1} (${chunkLines.length} lines, remaining: ${remainingLines.length})...`);

    // Send the chunk to the LLM to decide if a new topic should start
    let decision: SegmentationResponse;
    try {
      decision = await processChunk(
        chunkLines,
        currentGroup,
        language,
        fastModel, // Use the fast model for chunk processing
        apiKeys,
        sessionId,
        logId
      );
    } catch (error) {
      console.error(`[DialogAnalysis] Error processing chunk ${chunkIndex + 1}:`, error);
      console.warn(`[DialogAnalysis] Falling back to appending all lines to current topic.`);
      decision = {
        dialogToAdd: chunkLines,
        dialogForNextTopic: [],
        newTopic: false,
        newTopicTitle: ''
      };
    }

    // Log the decision made by the LLM
    if (decision.newTopic) {
      console.log(`[DialogAnalysis] New topic detected: "${decision.newTopicTitle}"`);
    } else {
      console.log(`[DialogAnalysis] Continuing current topic: "${currentGroup.title}"`);
    }

    // Apply the decision to update the current group or create a new one
    if (decision.dialogToAdd && decision.dialogToAdd.length > 0) {
      currentGroup.dialogLines.push(...decision.dialogToAdd);
    }

    if (decision.newTopic) {
      // Finish the current group and start a new one
      if (currentGroup.dialogLines.length > 0) {
        groups.push(currentGroup);
      }

      currentGroup = {
        id: `topic-${Date.now()}-${++chunkIndex}`,
        title: decision.newTopicTitle || 'New Topic',
        dialogLines: decision.dialogForNextTopic || []
      };

      // Warn if no lines are provided for the new topic
      if (!decision.dialogForNextTopic || decision.dialogForNextTopic.length === 0) {
        console.warn(`[DialogAnalysis] WARNING: New topic detected but no dialogForNextTopic lines provided. Check model response.`);
      }
    } else {
      // If no new topic, append all lines to the current group
      if (decision.dialogForNextTopic && decision.dialogForNextTopic.length > 0) {
        console.warn(`[DialogAnalysis] Note: dialogForNextTopic has ${decision.dialogForNextTopic.length} lines even though newTopic=false. Adding to current topic to prevent data loss.`);
        currentGroup.dialogLines.push(...decision.dialogForNextTopic);
      }
    }
  }

  // Push the last group to the result
  if (currentGroup.dialogLines.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
