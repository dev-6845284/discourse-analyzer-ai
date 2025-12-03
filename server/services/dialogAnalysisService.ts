
import { SpeakerAnalysisResult } from './speakerIdentificationService';

export interface DialogLine {
  speaker: string;
  text: string;
  timestamp: number; // seconds
}

export interface TopicGroup {
  id: string;
  title: string;
  dialogLines: DialogLine[];
  analysis?: TopicAnalysis;
}

export interface TopicAnalysis {
  summaryItems: string[];
}

export interface DialogAnalysisRequest {
  dialog: SpeakerAnalysisResult[]; // Input from previous step
  language: string;
  fastModel?: string; // Defaults to gemini-2.0-flash-exp or similar
  betterModel?: string; // Defaults to gemini-1.5-flash
  apiKeys: Record<string, string>;
}

interface SegmentationResponse {
  dialogToAdd: DialogLine[];
  dialogForNextTopic: DialogLine[];
  newTopic: boolean;
  newTopicTitle: string;
}

/**
 * Main function to analyze dialog topics
 */
export const analyzeDialogTopics = async (
  request: DialogAnalysisRequest
): Promise<TopicGroup[]> => {
  const { dialog, language, apiKeys } = request;
  const fastModel = request.fastModel || 'gemini-2.0-flash-exp';
  const betterModel = request.betterModel || 'gemini-2.5-flash';

  // 0. Preprocess: Flatten and assign timestamps
  const flatDialog = flattenDialog(dialog);

  if (flatDialog.length === 0) {
    console.log('[DialogAnalysis] No dialog lines to analyze.');
    return [];
  }

  console.log(`[DialogAnalysis] Starting analysis for ${flatDialog.length} dialog lines.`);

  // Phase 1: Topic Segmentation
  console.log('[DialogAnalysis] Phase 1: Starting topic segmentation...');
  const topicGroups = await segmentTopics(flatDialog, language, fastModel, apiKeys);
  console.log(`[DialogAnalysis] Phase 1 Complete. Identified ${topicGroups.length} topic groups.`);

  // Phase 1.5: Merge Topics
  console.log('[DialogAnalysis] Phase 1.5: Merging related topics...');
  const mergedGroups = await mergeTopics(topicGroups, language, betterModel, apiKeys);
  console.log(`[DialogAnalysis] Phase 1.5 Complete. Reduced to ${mergedGroups.length} topic groups.`);

  // Phase 2: Topic Analysis
  console.log('[DialogAnalysis] Phase 2: Starting topic analysis...');
  const analyzedGroups = await analyzeTopics(mergedGroups, language, betterModel, apiKeys);
  console.log('[DialogAnalysis] Phase 2 Complete. Analysis finished.');

  return analyzedGroups;
};

/**
 * Flattens the block-based speaker analysis result into a linear list of dialog lines with timestamps.
 * Interpolates timestamps for lines within a block.
 */
function flattenDialog(blocks: SpeakerAnalysisResult[]): DialogLine[] {
  const flatLines: DialogLine[] = [];

  for (const block of blocks) {
    const duration = block.endTime - block.startTime;
    const linesInBlock = block.dialogue.length;
    
    if (linesInBlock === 0) continue;

    // Simple linear interpolation for timestamps
    const timePerLine = duration / linesInBlock;

    block.dialogue.forEach((line, index) => {
      flatLines.push({
        speaker: line.speaker,
        text: line.text,
        timestamp: block.startTime + (index * timePerLine)
      });
    });
  }

  return flatLines.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Phase 1: Segment dialog into topic groups using a fast model
 */
async function segmentTopics(
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
      groups.push(currentGroup);

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
  groups.push(currentGroup);

  return groups;
}

/**
 * Phase 1.5: Merge adjacent topic groups that discuss the same broader topic
 */
async function mergeTopics(
  groups: TopicGroup[],
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<TopicGroup[]> {
  if (groups.length <= 1) return groups;

  // Prepare the list of topics for the model
  const topicsList = groups.map((g, index) => `${index}. [${g.title}]`).join('\n');

  const prompt = `
You are an expert dialog analyzer.
I have segmented a conversation into topic groups. Some adjacent groups might be about the same broader topic and should be merged.

Review the list of sequential topics below.
Identify ADJACENT topics that should be merged into a single broader topic.
Only merge if they are clearly part of the same discussion flow.

Topics:
${topicsList}

Return a JSON object with a "groups" array.
Each item in "groups" must have:
- "indices": Array of original indices (integers) that form this group. MUST be sequential.
- "title": A new, broader title for this merged group (or keep the best existing one).

Example Output:
{
  "groups": [
    { "indices": [0], "title": "Introduction" },
    { "indices": [1, 2], "title": "Taxation Policy" },
    { "indices": [3], "title": "Weather" }
  ]
}

IMPORTANT:
- Every index from 0 to ${groups.length - 1} MUST be included in exactly one group.
- Indices in a group MUST be sequential (e.g., [1, 2, 3] is valid, [1, 3] is NOT).
- Language of titles: ${language}

RETURN ONLY VALID JSON.
`;

  try {
    const responseText = await callGemini(prompt, model, apiKeys['gemini']);
    const responseJson = extractJsonFromResponse(responseText);
    
    if (!responseJson.groups || !Array.isArray(responseJson.groups)) {
      console.warn('[DialogAnalysis] Invalid merge response format. Skipping merge.');
      return groups;
    }

    const newGroups: TopicGroup[] = [];
    const processedIndices = new Set<number>();

    for (const mergedGroup of responseJson.groups) {
      const indices: number[] = mergedGroup.indices;
      if (!indices || indices.length === 0) continue;

      // Validate indices
      const validIndices = indices.filter(idx => 
        typeof idx === 'number' && 
        idx >= 0 && 
        idx < groups.length && 
        !processedIndices.has(idx)
      );

      if (validIndices.length === 0) continue;

      // Sort indices to ensure order
      validIndices.sort((a, b) => a - b);

      // Create new merged group
      const firstGroup = groups[validIndices[0]];
      const newGroup: TopicGroup = {
        id: firstGroup.id, // Keep ID of the first group
        title: mergedGroup.title || firstGroup.title,
        dialogLines: []
      };

      // Concatenate dialog lines
      for (const idx of validIndices) {
        newGroup.dialogLines.push(...groups[idx].dialogLines);
        processedIndices.add(idx);
      }

      newGroups.push(newGroup);
    }

    // Check if we missed any groups (fallback)
    for (let i = 0; i < groups.length; i++) {
      if (!processedIndices.has(i)) {
        newGroups.push(groups[i]);
      }
    }

    // Sort by timestamp of first line to maintain order
    newGroups.sort((a, b) => {
      const timeA = a.dialogLines[0]?.timestamp || 0;
      const timeB = b.dialogLines[0]?.timestamp || 0;
      return timeA - timeB;
    });

    return newGroups;

  } catch (error) {
    console.error('[DialogAnalysis] Error merging topics:', error);
    return groups; // Fallback to original groups on error
  }
}

/**
 * Phase 2: Analyze each topic group using a better model
 */
async function analyzeTopics(
  groups: TopicGroup[],
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<TopicGroup[]> {
  const analyzedGroups: TopicGroup[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    console.log(`[DialogAnalysis] Analyzing topic ${i + 1}/${groups.length}: "${group.title}" (${group.dialogLines.length} lines)...`);
    const analysis = await analyzeSingleTopic(group, language, model, apiKeys);
    analyzedGroups.push({
      ...group,
      analysis
    });
  }

  return analyzedGroups;
}

// --- LLM Interaction Helpers ---

async function inferInitialTopic(
  lines: DialogLine[],
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<string> {
  const transcriptText = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  
  const prompt = `
Analyze the following initial dialog segment (approx 10 mins).
Infer the main topic of this conversation.
Provide a SHORT, DESCRIPTIVE title (max 10 words).
Language of the dialog: ${language}

Dialog:
${transcriptText}

Return ONLY the title as a plain string.
`;

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
  const chunkText = chunkLines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  const currentTopicContext = `Current Topic: "${currentGroup.title}"\nLast few lines of current topic:\n${currentGroup.dialogLines.slice(-5).map(l => `${l.speaker}: ${l.text}`).join('\n')}`;

  const prompt = `
You are a smart dialog segmentation assistant.
We are processing a dialog in chunks.
Current Topic: "${currentGroup.title}"

Analyze the new chunk of dialog below.
Decide:
1. Does this chunk still belong to the current topic?
2. Or are speakers transitioning to a NEW topic?

If a transition occurs WITHIN this chunk, split the lines accordingly.

Input Chunk:
${chunkText}

Return a JSON object with this structure:
{
  "dialogToAdd": [/* lines from the input chunk that belong to the CURRENT topic */],
  "dialogForNextTopic": [/* lines from the input chunk that belong to the NEXT topic */],
  "newTopic": boolean, // true if a new topic starts in this chunk or is fully this chunk
  "newTopicTitle": string // Title of the new topic if newTopic is true, else empty string
}

IMPORTANT:
- "dialogToAdd" and "dialogForNextTopic" must contain the EXACT lines from the input chunk, preserving speaker and text.
- You can represent them as objects: {"speaker": "...", "text": "..."}
- If the whole chunk belongs to the current topic, "dialogForNextTopic" is empty, "newTopic" is false.
- If the whole chunk is a new topic, "dialogToAdd" is empty, "newTopic" is true.
- If there is a split, put the first part in "dialogToAdd" and the second part in "dialogForNextTopic", and set "newTopic" to true.

Language: ${language}
RETURN ONLY VALID JSON.
`;

  const responseText = await callGemini(prompt, model, apiKeys['gemini']);
  const responseJson = extractJsonFromResponse(responseText);

  // Map back the returned lines to our DialogLine structure (we need to restore timestamps if possible, or just copy them from input chunk)
  // Since the model returns text, we need to match it back to the input chunk lines to preserve timestamps.
  // However, matching might be brittle.
  // Alternative: Ask the model to return INDICES or just the split point.
  // But the prompt asks for "lines".
  // Let's try to match by index if the model returns the array of objects.
  
  // Actually, to be robust, let's ask the model to return the INDEX where the split happens.
  // But the user requirement says: "dialogToAdd": array of dialog lines...
  
  // Let's trust the model to return the objects. We will try to match them to the original chunkLines to get timestamps back.
  // Or simpler: we iterate through chunkLines and see which ones match the returned text.
  
  // Wait, the user requirement says: "dialogToAdd": array of dialog lines...
  // If I ask the model to return the lines, I might lose the timestamp info if I just take the model's output.
  // Better approach: Ask the model for the index of the split.
  
  // Let's refine the prompt to ask for the split index or just the decision.
  // But the user explicitly asked for the JSON structure with "dialogToAdd" and "dialogForNextTopic".
  // I will stick to the user's requested JSON structure but I will try to map the returned lines back to the original `chunkLines` to preserve timestamps.
  
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

async function analyzeSingleTopic(
  group: TopicGroup,
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<TopicAnalysis> {
  const dialogText = group.dialogLines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  
  const prompt = `
Analyze the following topic group from a dialog.
Topic: "${group.title}"

Goal: Identify key stated facts, core ideas, claims, and arguments.

Dialog:
${dialogText}

Return a JSON object with this structure:
{
  "topicTitle": "${group.title}", // You can refine the title if needed, but keep it short.
  "summaryItems": [
    "Speaker X claims that...",
    "They argue that...",
    "Key fact mentioned: ..."
  ]
}

Language: ${language}
RETURN ONLY VALID JSON.
`;

  const responseText = await callGemini(prompt, model, apiKeys['gemini']);
  const responseJson = extractJsonFromResponse(responseText);
  
  return {
    summaryItems: responseJson.summaryItems || []
  };
}

// --- Generic Helpers ---

async function callGemini(prompt: string, model: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('Gemini API key is missing');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response text from Gemini API');
  }

  return text;
}

function extractJsonFromResponse(text: string): any {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    // Fallback: try to find JSON object in text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        throw new Error('Failed to parse JSON from response');
      }
    }
    throw new Error('Failed to parse JSON from response');
  }
}
