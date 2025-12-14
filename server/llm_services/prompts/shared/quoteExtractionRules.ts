export interface QuoteExtractionRulesParams {
  personName: string;
  maxQuoteLength?: number;
  limitQuoteLength?: boolean;
}

/**
 * Generates quote extraction rules section for LLM prompts.
 */
export function getQuoteExtractionRulesSection(params: QuoteExtractionRulesParams): string {
  const { personName, maxQuoteLength, limitQuoteLength } = params;

  const effectiveMaxQuoteLength = maxQuoteLength || 280;
  const quoteTextLineInstruction = limitQuoteLength
    ? `- Text: "<verbatim quote text truncated to ${effectiveMaxQuoteLength} characters; append '... (read article for full quote)' if you truncated>"`
    : '';

  return `### 📜 QUOTE EXTRACTION RULES
- Locate primary sources with direct quotes by ${personName}.
- In case article contains several quotes, join them with a separator string. Use ' | ' as separator string. Substantive content: ≥10 words or key factual statement.
- Do not paraphrase or summarize within the quote text. The "text" field must contain only verbatim words from the source.
- Always provide the full citation (title, source URL, date).
${quoteTextLineInstruction}`;
}

/**
 * Generates the output format section for quote extraction.
 */
export function getQuoteOutputFormatSection(params: QuoteExtractionRulesParams): string {
  const { maxQuoteLength, limitQuoteLength } = params;

  const effectiveMaxQuoteLength = maxQuoteLength || 280;
  const quoteTextLineInstruction = limitQuoteLength
    ? `- Text: "<verbatim quote text truncated to ${effectiveMaxQuoteLength} characters; append '... (read article for full quote)' if you truncated>"`
    : '- Text: "<verbatim quote text>"';

  return `### 📤 OUTPUT FORMAT FOR THIS RESPONSE
Return **plain text**, not JSON. For each distinct quote you verify, output a block that follows this template exactly:

Quote #n:
${quoteTextLineInstruction}
- Source: <direct, human-accessible URL>
- Title: <article, interview, or speech title>
- Date: <YYYY-MM-DD>
- LanguageName: <e.g., English, Lithuanian>
- LanguageCode: <e.g., en, lt>

Separate each block with a blank line. Do not include JSON, markdown tables, or commentary outside of the prescribed blocks.`;
}
