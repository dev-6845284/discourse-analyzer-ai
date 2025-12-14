import { ExtractQuotesFormattingPromptParams } from '../types';

/**
 * Builds the formatting prompt to convert extraction notes into structured JSON.
 * Used for both text extraction and article extraction.
 */
export function buildExtractQuotesFormattingPrompt(params: ExtractQuotesFormattingPromptParams): string {
  const { personName, extractionNotes } = params;

  const personFilter = personName
    ? `\n- Do NOT include any quotes that are paraphrased or not directly attributed to ${personName}.`
    : '';

  return `You are a structured data formatter. Convert the extraction notes below into a strict JSON payload.

### Output Requirements
- Return exactly one JSON object with a key "quotes".
- The value of "quotes" should be an array of objects.
- Each object must have three properties: "text" (the full verbatim quote), "languageCode" (e.g., "en", "lt"), and "languageName" (e.g., "English", "Lithuanian").
- If no quotes were found, return an empty array.${personFilter}

### Extraction Notes
<<<
${extractionNotes}
>>>

Return only the JSON object.`;
}
