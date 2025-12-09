/**
 * Creates a prompt for fast topic extraction without speaker identification
 * Tags and summaries are generated in Lithuanian by default
 */
export function createTopicExtractionPrompt(blockText: string, language: string): string {
  return `Analyze the following transcript segment and extract main topics/themes WITHOUT trying to identify speakers or separate different voices.

Focus ONLY on understanding what topics, subjects, or themes are being discussed in this text.

IMPORTANT: Return all tags and main topics in ${language} language.

Return ONLY a valid JSON object with NO markdown formatting, NO code blocks, NO backticks. Return raw JSON:
{
  "mainTopics": ["tema1", "tema2", "tema3", "tema4", "tema5"],
  "tags": [
    {"tag": "raktažodis", "relevance": 0.9, "importance": 0.8, "frequency": 2},
    {"tag": "tema", "relevance": 0.7, "importance": 0.6, "frequency": 1}
  ],
  "summary": "Viena ar dvi sakiniai apibūdinantys, apie ką šis segmentas"
}

For tags:
- relevance (0-1): How central this tag is to the main discussion
- importance (0-1): How prominent or significant this topic is
- frequency: Raw count of mentions

Transcript segment:
${blockText}

RETURN ONLY VALID JSON. NO MARKDOWN. NO BACKTICKS. NO EXPLANATIONS.`;
}
