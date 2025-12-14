import { ImproveQuoteFormattingPromptParams } from '../types';

/**
 * Builds the formatting prompt to convert research notes into structured JSON for improved quote.
 */
export function buildImproveQuoteFormattingPrompt(params: ImproveQuoteFormattingPromptParams): string {
  const { researchNotes } = params;

  return `You are a structured data formatter. Convert the research notes below into a strict JSON payload.

### Output Requirements
- Return exactly one JSON object.
- The JSON object must have these properties:
  - "text": The improved/expanded quote text (verbatim from source)
  - "source": The verified source URL
  - "title": The verified title of the source
  - "date": The verified date in YYYY-MM-DD format
  - "languageCode": The language code (e.g., "en", "lt", "ru")
  - "languageName": The language name (e.g., "English", "Lithuanian", "Russian")
  - "improved": A boolean indicating whether the quote was successfully improved (true) or returned unchanged (false)
  - "improvementNote": A brief explanation of what was improved or why it couldn't be improved

### Research Notes
<<<
${researchNotes}
>>>

Return only the JSON object.`;
}
