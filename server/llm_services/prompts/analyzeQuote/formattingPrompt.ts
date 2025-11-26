import { AnalyzeQuoteFormattingPromptParams } from '../types';

/**
 * Builds the formatting prompt to convert analysis notes into structured JSON.
 */
export function buildAnalyzeQuoteFormattingPrompt(params: AnalyzeQuoteFormattingPromptParams): string {
  const { quoteLanguageName, analysisNotes } = params;

  return `You are a structured data formatter. Convert the analysis notes below into a strict JSON payload.

### Output Requirements
- Return exactly one JSON object.
- The JSON object must have keys: "Populism", "Fact Twisting", "Lies & False Claims", and "Inflammatory Language".
- Each key must have a value that is an object with two properties:
  1. "rating": A string with one of these values: "None", "Low", "Medium", "High", "Severe". Map intermediate ratings like "Medium–High" to the closest standard rating.
  2. "justification": A string in ${quoteLanguageName} explaining the rating based on the notes.

### Analysis Notes
<<<
${analysisNotes}
>>>

Return only the JSON object.`;
}
