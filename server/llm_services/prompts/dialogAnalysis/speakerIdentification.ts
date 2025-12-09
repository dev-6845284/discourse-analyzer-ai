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
- Preserve the original meaning and content.
- Do not summarize, keep the dialogue as close to original as possible but cleaned up.
- Return ONLY JSON.
`;

  return prompt;
};
