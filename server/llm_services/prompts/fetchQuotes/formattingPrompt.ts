import { FetchQuotesFormattingPromptParams } from '../types';

/**
 * Builds the formatting prompt to convert research notes into structured JSON.
 */
export function buildFetchQuotesFormattingPrompt(params: FetchQuotesFormattingPromptParams): string {
  const {
    maxQuotes,
    personName,
    timePeriod,
    category,
    rating,
    sortOrder,
    languages,
    effectiveMaxQuoteLength,
    researchNotes,
  } = params;

  return `You are a structured data formatter. Convert the research notes below into a strict JSON payload.

### Output Requirements
- Return exactly one JSON object with a top-level "quotes" array.
- Each quote object must include the fields: text, source, title, date (YYYY-MM-DD), languageCode, languageName.
- Include at most ${Math.min(maxQuotes, 50)} quotes and prefer the most recent ones (sortOrder: ${sortOrder}).
- Only include quotes that clearly reference ${personName} during ${timePeriod.description}. Drop ambiguous or unverifiable entries.
- Preserve verbatim wording from the notes (within the ${effectiveMaxQuoteLength}-character limit described earlier). If the note already indicates truncation, keep the provided suffix.
- If any required field is missing in the notes, exclude that quote.

### Additional Filters
- Category focus: ${category}.
- Rating emphasis: ${rating}.
- Supported languages: ${languages.length ? languages.join(', ') : 'any (auto-detect)'}.

### Research Notes
<<<
${researchNotes}
>>>

Return only the JSON object.`;
}
