import { DialogLine, TopicGroup } from '../../../types';
import { formatTimestamp } from '../../../utils/formatters';
import { mapLanguageName } from '../../../utils/languages'; // <-- new import

export const buildInferInitialTopicPrompt = (
  lines: DialogLine[],
  language: string
): string => {
  const transcriptText = lines.map(l => `[${formatTimestamp(l.timestamp)}] ${l.speaker}: ${l.text}`).join('\n');
  
  const displayLanguage = mapLanguageName(language); // <-- map language here

  let old =  `
Analyze the following initial dialog segment (approx 10 mins).
Infer the main topic of this conversation.
Provide a SHORT, DESCRIPTIVE title (max 10 words).
Language of the dialog: ${language}
Output Language: ${language}

Dialog:
${transcriptText}

Return ONLY the title as a plain string.
`;

return `Infer the main topic of the dialog below and output ONLY a short title (max 10 words).

Rules:
• Title must be in ${language.toUpperCase}.
• Title must describe the core topic of the dialog.
• NO summaries, explanations, quotes, or extra text.
• Output ONLY the title string, nothing else.

Dialog (${language.toUpperCase}):
${transcriptText}

Output Language: ${language}
Return ONLY the title as a plain string.
`;
};

export const buildProcessChunkPrompt = (
  chunkLines: DialogLine[],
  currentGroup: TopicGroup,
  language: string
): string => {
  const chunkText = chunkLines.map(l => `[${formatTimestamp(l.timestamp)}] ${l.speaker}: ${l.text}`).join('\n');

return `You are a dialog segmentation assistant.

CurrentTopic: "${currentGroup.title}"

Goal:
Decide if the dialog chunk continues the current topic or starts a new one.
If a new topic begins mid-chunk, split at the FIRST line where the new topic starts.

Rules:
• “Topic” = main subject being discussed.
• Stay strict: DO NOT guess hidden meanings.
• A line belongs to the CurrentTopic if it is still about the same subject.
• A new topic begins only when the subject clearly shifts to a different main focus.
• Minor digressions DO NOT count as new topics unless they redefine the conversation.
• Preserve each line EXACTLY (speaker + text).
• If unsure, default to CurrentTopic.
• Output only valid JSON.

Classification Logic:
1) If all lines fit CurrentTopic → newTopic=false; dialogToAdd=all; dialogForNextTopic=[];
2) If all lines introduce a new topic → newTopic=true; dialogToAdd=[]; dialogForNextTopic=all;
3) If topic shift occurs → split at the FIRST line of the new subject.

Output JSON:
{
  "dialogToAdd": [
    {"speaker": "...", "text": "..."}
  ],
  "dialogForNextTopic": [
    {"speaker": "...", "text": "..."}
  ],
  "newTopic": boolean,
  "newTopicTitle": ""
}

InputChunk:
${chunkText}

Language: ${language}
Output Language: ${language}
RETURN ONLY VALID JSON.`;
};

export const buildMergeTopicsPrompt = (
  groups: TopicGroup[],
  language: string
): string => {
  const topicsList = groups.map((g, index) => `${index}. [${g.title}]`).join('\n');
  const displayLanguage = mapLanguageName(language); // <-- map language here

  return `
You are an expert dialog analyzer.

We have segmented a conversation into sequential topic groups. Some adjacent groups MAY belong to the same broader topic.

Your task:
Identify which ADJACENT topics should be merged because they clearly describe the same continuous discussion. Only merge when:
• The meaning and subject matter substantially overlap, AND
• The conversation flow between them is continuous, AND
• They would naturally be treated as one topic by a human reviewer.

Do NOT merge:
• Topics that are only loosely related
• Topics that share themes but represent a distinct conversational shift
• Non-adjacent topics (strictly forbidden)

Input Topics:
${topicsList}

Output Requirements:
Return a JSON object with a "groups" array.
Each group must include:
• "indices": a SEQUENTIAL array of original topic indices
• "title": a broader title that represents the merged group
    – If merging: choose the most representative or rewrite concisely
    – If not merging: keep the existing title or best version of it

Rules:
• Every index from 0 to ${groups.length - 1} MUST appear in exactly one group.
• Indices in each group MUST be sequential (e.g., [2,3] OK; [2,4] NOT OK).
• Maintain original order; do NOT reorder groups.
• Merge ONLY when clearly justified. If unsure, DO NOT MERGE.
• Language of titles: ${displayLanguage}
• Output Language: ${displayLanguage}

Example Output:
{
  "groups": [
    { "indices": [0], "title": "Introduction" },
    { "indices": [1,2], "title": "Taxation Policy Discussion" },
    { "indices": [3], "title": "Weather" }
  ]
}

Return ONLY valid JSON.
`;
};

export const buildAnalyzeSingleTopicPrompt = (
  group: TopicGroup,
  language: string
): string => {
  const dialogText = group.dialogLines.map((l, index) => {
    const timestamp = l.timestamp ? `[${formatTimestamp(l.timestamp)}]` : '[N/A]';
    return `${timestamp} ${l.speaker}: ${l.text}`;
  }).join('\n');

  const displayLanguage = mapLanguageName(language); // <-- map language here
  
  let old = `
Analyze the following topic group from a dialog.
Topic: "${group.title}"

Goal: Identify key stated facts, core ideas, claims, and arguments.
IMPORTANT: Each line in the dialog is prefixed with a timestamp [HH:MM:SS] or [N/A] if not available.

Dialog:
${dialogText}

Return a JSON object with this structure:
{
  "topicTitle": "${group.title}", // You can refine the title if needed, but keep it short.
  "summaryItems": [
    { "text": "Speaker X claims that...", "timestamp": "HH:MM:SS", "importance": 0.9 },
    { "text": "They argue that...", "timestamp": "HH:MM:SS", "importance": 0.7 },
    { "text": "Key fact mentioned: ...", "timestamp": "HH:MM:SS", "importance": 0.3 }
  ]
}

CRITICAL INSTRUCTIONS:
- Each summary item MUST be an object with "text", "timestamp", and "importance" fields.
- "text" field: The summary of the fact/claim/argument.
- "timestamp" field: The exact timestamp HH:MM:SS when that fact/claim was stated in the dialog.
- "importance" field: A decimal number from 0.1 to 1.0 indicating how crucial this point is (1.0 = critical core argument, 0.1 = minor detail).
- If a timestamp is [N/A], use 'N/A' in the timestamp field.
- Timestamps should reference the EXACT timestamp from the dialog lines.
- Format timestamps as HH:MM:SS (without brackets) in the timestamp field.

Language: ${language}
Output Language: ${language}
RETURN ONLY VALID JSON.
`;

return `You are an expert dialog analyzer.

Analyze the following topic group from a dialog.
Topic: "${group.title}"

Goal:
Extract the main stated facts, core ideas, claims, and arguments made by the speakers in this dialog segment.

IMPORTANT:
- Each line in the dialog has a timestamp in brackets [HH:MM:SS] or [N/A] if not available.
- You MUST stay neutral: do NOT add your own opinion or fact-check. Treat everything as the speakers’ statements.

Dialog:
${dialogText}

Return ONLY a valid JSON object with this structure:
{
  "topicTitle": "${group.title}",
  "summaryItems": [
    { "text": "...", "timestamp": "HH:MM:SS", "importance": 0.9 }
  ]
}

Requirements for fields:
- "topicTitle":
  - Keep the given title, or minimally refine it ONLY if you can make it shorter and clearer in ${displayLanguage}.
- "summaryItems":
  - A list of the most important points (facts / claims / arguments), NOT every sentence.
  - Each item MUST be an object with:
    - "text": concise description of a single key point, in ${displayLanguage}.
    - "timestamp": the timestamp (HH:MM:SS) of the FIRST line where this point is clearly expressed.
      * Use EXACT timestamps from the dialog (without brackets).
      * If the line timestamp is [N/A], use "N/A".
      * Do NOT invent timestamps.
    - "importance": decimal from 0.1 to 1.0 (1.0 = central idea of the topic, 0.1 = minor detail).
  - Focus on 5–20 items depending on dialog length (do NOT exceed 30).
  - Sort items in descending order of "importance" (most important first).
  - If multiple lines contribute to the same idea, merge them into ONE summary item and use the earliest relevant timestamp.

Additional rules:
- Do NOT quote whole sentences; paraphrase them briefly.
- Do NOT add information that is not explicitly supported by the dialog.
- All text must be in ${displayLanguage}.
- Output Language: ${displayLanguage}

RETURN ONLY VALID JSON.
`
};
