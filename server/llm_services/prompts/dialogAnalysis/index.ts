import { DialogLine, TopicGroup } from '../../../types';

export const buildInferInitialTopicPrompt = (
  lines: DialogLine[],
  language: string
): string => {
  const transcriptText = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  
  return `
Analyze the following initial dialog segment (approx 10 mins).
Infer the main topic of this conversation.
Provide a SHORT, DESCRIPTIVE title (max 10 words).
Language of the dialog: ${language}
Output Language: ${language}

Dialog:
${transcriptText}

Return ONLY the title as a plain string.
`;
};

export const buildProcessChunkPrompt = (
  chunkLines: DialogLine[],
  currentGroup: TopicGroup,
  language: string
): string => {
  const chunkText = chunkLines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  
  return `
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
Output Language: ${language}
RETURN ONLY VALID JSON.
`;
};

export const buildMergeTopicsPrompt = (
  groups: TopicGroup[],
  language: string
): string => {
  const topicsList = groups.map((g, index) => `${index}. [${g.title}]`).join('\n');

  return `
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
- Output Language: ${language}

RETURN ONLY VALID JSON.
`;
};

export const buildAnalyzeSingleTopicPrompt = (
  group: TopicGroup,
  language: string
): string => {
  const dialogText = group.dialogLines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  
  return `
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
Output Language: ${language}
RETURN ONLY VALID JSON.
`;
};
