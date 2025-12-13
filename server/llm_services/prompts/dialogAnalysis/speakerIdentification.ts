interface SegmentTimingInput {
  start: number;
  end: number;
  text: string;
}

/**
 * Formats segment timing as a string for the LLM prompt
 */
function formatSegmentTiming(segments: SegmentTimingInput[]): string {
  return segments.map(seg => {
    const startMin = Math.floor(seg.start / 60);
    const startSec = Math.floor(seg.start % 60);
    const endMin = Math.floor(seg.end / 60);
    const endSec = Math.floor(seg.end % 60);
    const startStr = `${startMin.toString().padStart(2, '0')}:${startSec.toString().padStart(2, '0')}`;
    const endStr = `${endMin.toString().padStart(2, '0')}:${endSec.toString().padStart(2, '0')}`;
    return `[${startStr}-${endStr}] (${seg.start.toFixed(1)}s-${seg.end.toFixed(1)}s) ${seg.text}`;
  }).join('\n');
}

export const buildSpeakerIdentificationPrompt = (
  blockText: string,
  segmentTiming: SegmentTimingInput[],
  previousContext: string | null,
  language: string
): string => {
  let prompt = `Analyze the following transcript segment and identify the speakers.
Transform the text into a dialogue format, attributing each line to a speaker.
Identify the Host and any Guests/Speakers. If names are mentioned, use them. Otherwise use "Host", "Speaker 1", etc.

IMPORTANT: You MUST include the startTime and endTime (in seconds) for each dialogue line.
Use the segment timing information provided to assign accurate timestamps.

TRANSCRIPTION QUALITY NOTE:
The source transcription may contain spelling mistakes, missing punctuation, inconsistent casing, repeated words, or broken formatting.
You MUST lightly edit the dialogue text to improve readability:
- Fix obvious spelling/typos when you are confident.
- Add/repair punctuation, capitalization, and spacing.
- Remove accidental duplicated words (e.g., "the the") and obvious ASR artifacts.
- Keep disfluencies only if they seem intentional/meaningful; otherwise you may remove stutters like "I-I-I".
- Preserve proper nouns, technical terms, and names; do NOT guess unknown names—keep as-is if uncertain.
- Do NOT add new information, do NOT paraphrase, and do NOT change meaning. Keep wording as close to the original as possible, just cleaned.

Language of the transcript: ${language}
Output Language: ${language}

`;

  if (previousContext) {
    prompt += `CONTEXT FROM PREVIOUS SEGMENT (Use this to maintain speaker continuity):
${previousContext}

`;
  }

  // Include structured segment timing
  if (segmentTiming && segmentTiming.length > 0) {
    prompt += `TRANSCRIPT SEGMENTS WITH TIMING (use these timestamps for output):
${formatSegmentTiming(segmentTiming)}

`;
  }

  prompt += `TRANSCRIPT TEXT (for context):
${blockText}

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "dialogue": [
    { "speaker": "Name or Role", "text": "Spoken text", "startTime": 123.5, "endTime": 130.0 },
    { "speaker": "Name or Role", "text": "Spoken text", "startTime": 130.0, "endTime": 145.2 }
  ],
  "identifiedSpeakers": ["List", "of", "unique", "speakers"]
}

IMPORTANT:
- startTime and endTime are in SECONDS (not MM:SS format). Use the segment timing provided above.
- Preserve the original meaning and content; only apply spelling/formatting cleanup as described.
- Do not summarize. Do not invent missing words. If something is unclear/garbled, keep it minimal and faithful.
- Return ONLY JSON.
`;

  return prompt;
};
