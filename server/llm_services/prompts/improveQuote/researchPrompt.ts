import { ImproveQuotePromptParams } from '../types';

/**
 * Builds the research prompt for improving and expanding an existing quote.
 * This prompt uses web search to find the original source and full context.
 */
export function buildImproveQuoteResearchPrompt(params: ImproveQuotePromptParams): string {
  const { personName, quoteText, languageName, languageCode } = params;

  return `You are tasked with improving and expanding an existing quote by searching for the full context.

**Current Quote Information:**
- Person: ${personName}
- Quote Text: "${quoteText}"
- Language: ${languageName} (${languageCode})

**Your Task:**
1. Use your knowledge to find the original source and full context of this quote.
2. If the quote is part of a longer statement, speech, or interview, extract the FULL quote or the complete relevant passage.
3. If there are related quotes from the same speech/interview/article that provide important context, include them.
4. Find and verify the accurate metadata (source URL, title, date).
5. Maintain the original language of the quote.

**Important Rules:**
- DO NOT use the old source reference - search independently for this quote
- Extract only verbatim text from the source - no paraphrasing or summarization
- If you find multiple related quotes from the same source, join them with ' | ' separator
- The expanded quote must be substantive (≥10 words or key factual statement)
- If you cannot find the quote or better context, explicitly state that you are returning the original quote unchanged.
- Ensure you provide the most direct, accessible source URL

**Output Format:**
Return detailed research notes containing:
- The improved/expanded quote text (verbatim)
- The verified source URL
- The verified title
- The verified date (YYYY-MM-DD)
- The language details
- A brief note on what was improved or why it couldn't be improved.

Do not output JSON yet. Just provide the information clearly.`;
}
