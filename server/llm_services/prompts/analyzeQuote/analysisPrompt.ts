import { AnalyzeQuotePromptParams } from '../types';

/**
 * Builds the analysis prompt for fact-checking and discourse analysis of a quote.
 * This prompt is used with web search enabled for thorough fact verification.
 */
export function buildAnalyzeQuotePrompt(params: AnalyzeQuotePromptParams): string {
  const { quoteText, quoteLanguageName, analysisContext, links } = params;

  let contextInstruction = '';
  if (analysisContext) {
    contextInstruction = `\n\n### User-Provided Context\nThe user has provided the following context to help with the analysis:\n"${analysisContext}"\nUse this context to better understand the intent and background of the quote.`;
  }

  let linksInstruction = '';
  if (links && links.length > 0) {
    const linkList = links.map(l => `- ${l.url} (${l.type}${l.title ? `: ${l.title}` : ''})`).join('\n');
    linksInstruction = `\n\n### Reference Material\nThe user has provided the following links as reference material:\n${linkList}\nPlease consult these sources if possible to verify facts or understand the context.`;
  }

  return `Perform a detailed analysis of the following text, which is in ${quoteLanguageName}.
Analyze the original text directly in ${quoteLanguageName} to understand its full meaning and nuance.
Fact-check all claims using your knowledge and web search if necessary.${contextInstruction}${linksInstruction}

Provide a detailed assessment for each of the following categories:
1. Populism
2. Fact Twisting
3. Lies & False Claims
4. Inflammatory Language

For each category, determine a rating (None, Low, Medium, High, Severe) and provide a justification in ${quoteLanguageName}.

Analyze this text: "${quoteText}"`;
}
