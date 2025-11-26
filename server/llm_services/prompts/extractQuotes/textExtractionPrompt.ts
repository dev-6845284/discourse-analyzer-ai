import { ExtractQuotesFromTextPromptParams } from '../types';

/**
 * Builds the extraction prompt for extracting quotes from user-provided text.
 * This prompt handles both article-style text and single direct quotes.
 */
export function buildExtractQuotesFromTextPrompt(params: ExtractQuotesFromTextPromptParams): string {
  const { personName, textContent } = params;

  return `Analyze the following text to extract quotes by "${personName}" and identify the language of each quote.

The provided text can be one of two things:
1. A block of text (like an article) containing one or more statements explicitly attributed to "${personName}".
2. A single, direct quote by "${personName}" itself, without any other context or attribution.

Your task is to identify which case it is and act accordingly.
- If the text is a block of text, extract all statements explicitly attributed to "${personName}".
- If the text appears to be a direct quote by "${personName}", return the text itself as the single quote.

For each identified quote, determine the language (name and code).

Here is the text to analyze:
---
${textContent}
---`;
}
