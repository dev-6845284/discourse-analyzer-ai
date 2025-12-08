export const buildSpeakerIdentificationPrompt = (
  blockText: string,
  previousContext: string | null,
  language: string
): string => {
  let prompt = `Analyze the following transcript segment and identify the speakers.
Transform the text into a dialogue format, attributing each line to a speaker.
Identify the Host and any Guests/Speakers. If names are mentioned, use them. Otherwise use "Host", "Speaker 1", etc.

Language of the transcript: ${language}
Output Language: ${language}

`;

  if (previousContext) {
    prompt += `CONTEXT FROM PREVIOUS SEGMENT (Use this to maintain speaker continuity):
${previousContext}

`;
  }

  prompt += `TRANSCRIPT SEGMENT TO ANALYZE:
${blockText}

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "dialogue": [
    { "speaker": "Name or Role", "text": "Spoken text" },
    { "speaker": "Name or Role", "text": "Spoken text" }
  ],
  "identifiedSpeakers": ["List", "of", "unique", "speakers"]
}

IMPORTANT:
- Preserve the original meaning and content.
- Do not summarize, keep the dialogue as close to original as possible but cleaned up.
- Return ONLY JSON.
`;

  return prompt;
};
