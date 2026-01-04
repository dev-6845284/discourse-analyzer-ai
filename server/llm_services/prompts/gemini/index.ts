import { getSecurityGuardsSection } from '../shared/securityGuards';
import { getSourceProvenancePolicySection } from '../shared/sourceProvenancePolicy';
import { getEntityDisambiguationSection } from '../shared/entityDisambiguation';
import { getWebSearchPlanSection } from '../shared/webSearchPlan';
import { TimePeriod, PersonInfo } from '../types';

export interface GeminiFetchQuotesPromptParams {
  personName: string;
  maxQuotes: number;
  timePeriod: TimePeriod;
  languages: string[];
  context: string[];
}

/**
 * Builds the fetch quotes prompt for Gemini (single-stage JSON response).
 * Note: Gemini uses different extraction rules with character limits.
 */
export function buildGeminiFetchQuotesPrompt(params: GeminiFetchQuotesPromptParams): string {
  const { personName, maxQuotes, timePeriod, languages, context } = params;

  const securitySection = getSecurityGuardsSection();
  const provenanceSection = getSourceProvenancePolicySection();
  const disambiguationSection = getEntityDisambiguationSection();
  const webSearchSection = getWebSearchPlanSection({ languages, context, timePeriod });

  // Gemini uses slightly different extraction rules with character limits
  const quoteExtractionInstruction = `### 📜 QUOTE EXTRACTION RULES
- Locate publicly published direct quotes by ${personName}.
- For each quote, provide a maximum of 90 characters of the most significant part of the statement.
- If more than 90 characters are essential for context, output truncated quote appended with the the text '... (read article for full quote)'.
- In case article contains several quotes, join them with a separator string. Use ' | ' as separator string. Substantive content: ≥10 words or key factual statement.
- Paraphrase and summarize within the quote text. The "text" field must contain up to given text length limit, or '(long quote—link only)' placeholder.
- Always provide the full citation (title, source URL, date).`;

  return `### SYSTEM & TASK PROMPT — SECURE RESEARCH FRAMEWORK
**Task Overview**
Conduct a comprehensive investigation to find up to ${maxQuotes} public quotes, interviews, and published texts of the individual named **${personName}** from ${timePeriod.description}. The investigation must rely **only on verifiable, public, human-visible quotes or authored texts** attributed to that individual, collected from reputable sources.

---

${securitySection}

---

${provenanceSection}

---

${disambiguationSection}

---

${webSearchSection}

---
${quoteExtractionInstruction}
---

### 📤 OUTPUT FORMAT
Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of objects.
Each object in the array must have six string properties: "text" (the quote), "source" (URL), "title", "date" (YYYY-MM-DD), "languageCode" (e.g., "en", "ru"), and "languageName" (e.g., "English", "Russian").
If you cannot find a specific date, provide the publication date of the source. If that is also unavailable, provide an estimated date or the year.
Example format: { "quotes": [{"text": "This is the quote.", "source": "https://example.com/article", "title": "Article Title", "date": "2023-10-27", "languageCode": "en", "languageName": "English"}] }
Do not include any other text or markdown formatting outside of the JSON object.`;
}



export interface GeminiExtractQuotesFromTextPromptParams {
  personName: string;
  textContent: string;
}

/**
 * Builds the text extraction prompt for Gemini.
 */
export function buildGeminiExtractQuotesFromTextPrompt(params: GeminiExtractQuotesFromTextPromptParams): string {
  const { personName, textContent } = params;

  return `Analyze the following text to extract quotes by "${personName}" and identify the language of each quote.

The provided text can be one of two things:
1. A block of text (like an article) containing one or more statements explicitly attributed to "${personName}".
2. A single, direct quote by "${personName}" itself, without any other context or attribution.

Your task is to identify which case it is and act accordingly.
- If the text is a block of text, extract all statements explicitly attributed to "${personName}".
- If the text appears to be a direct quote by "${personName}", return the text itself as the single quote.

Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of objects.
Each object must have three properties: "text" (the full quote), "languageCode" (e.g., "en", "lt"), and "languageName" (e.g., "English", "Lithuanian").
If you find no quotes, return an empty array.
Do not include any other text or markdown formatting outside of the JSON object.

Example: { "quotes": [ { "text": "...", "languageCode": "fr", "languageName": "French" } ] }

Here is the text to analyze:
---
${textContent}
---`;
}

export interface GeminiExtractQuotesFromArticlePromptParams {
  personName: string;
  articleMetadata: {
    url: string;
    title: string;
    byline: string | null;
    siteName: string | null;
  };
  articleContent: string;
}

/**
 * Builds the article extraction prompt for Gemini (single-stage JSON response).
 * Reuses the core extraction logic from ChatGPT's buildExtractQuotesFromArticlePrompt.
 */
export function buildGeminiExtractQuotesFromArticlePrompt(params: GeminiExtractQuotesFromArticlePromptParams): string {
  const { personName, articleMetadata, articleContent } = params;

  return `You are an expert at identifying and extracting direct quotes from news articles and interviews.

### Task
Analyze the following web article to extract all direct quotes, statements, and attributed speech by **${personName}**.

### Article Metadata
- Source: ${articleMetadata.siteName || 'Unknown'}
- Title: ${articleMetadata.title || 'Unknown'}
- Author/Byline: ${articleMetadata.byline || 'Unknown'}
- URL: ${articleMetadata.url}

### Extraction Rules
1. **Only extract verbatim quotes** - text that is directly attributed to ${personName} through:
   - Direct quotation marks ("..." or «...»)
   - Attribution phrases like "said", "stated", "according to", "wrote", "claimed", "announced"
   - Interview responses clearly attributed to the person
   
2. **Preserve the original language** - do not translate quotes
   
3. **Include context** - if multiple related quotes appear together, you may join them with ' | ' separator
   
4. **Identify the language** of each quote (e.g., English, Lithuanian, Russian)

5. **Skip**:
   - Paraphrased content or summaries about the person
   - Quotes from other people
   - Editorial commentary

### Article Content
---
${articleContent}
---

### Output Format
Return the response as a single, valid JSON object with a key "quotes". The value of "quotes" should be an array of objects.
Each object must have three properties: "text" (the full quote), "languageCode" (e.g., "en", "lt"), and "languageName" (e.g., "English", "Lithuanian").
If you find no quotes by ${personName}, return an empty array.
Do not include any other text or markdown formatting outside of the JSON object.

Example: { "quotes": [ { "text": "...", "languageCode": "en", "languageName": "English" } ] }`;
}

export interface GeminiImproveQuotePromptParams {
  personName: string;
  quoteText: string;
  languageName: string;
  languageCode: string;
}

/**
 * Builds the improve quote prompt for Gemini.
 */
export function buildGeminiImproveQuotePrompt(params: GeminiImproveQuotePromptParams): string {
  const { personName, quoteText, languageName, languageCode } = params;

  return `You are tasked with improving and expanding an existing quote by searching for the full context.

**Current Quote Information:**
- Person: ${personName}
- Quote Text: "${quoteText}"
- Language: ${languageName} (${languageCode})

**Your Task:**
1. Search the web for this exact quote or similar statements by ${personName}.
2. Find the original source and full context of this quote.
3. If the quote is part of a longer statement, speech, or interview, extract the FULL quote or the complete relevant passage.
4. If there are related quotes from the same speech/interview/article that provide important context, include them.
5. Find and verify the accurate metadata (source URL, title, date).
6. Maintain the original language of the quote.

**Important Rules:**
- DO NOT use the old source reference - search independently for this quote
- Extract only verbatim text from the source - no paraphrasing or summarization
- If you find multiple related quotes from the same source, join them with ' | ' separator
- The expanded quote must be substantive (≥10 words or key factual statement)
- If you cannot find the quote or better context, return the original quote unchanged
- Ensure you provide the most direct, accessible source URL

**Output Format:**
Return a single, valid JSON object with these properties:
- "text": The improved/expanded quote text (verbatim from source)
- "source": The source URL where you found the quote
- "title": The title of the source
- "date": The date in YYYY-MM-DD format
- "languageCode": The language code (e.g., "en", "lt", "ru")
- "languageName": The language name (e.g., "English", "Lithuanian", "Russian")
- "improved": A boolean indicating whether you successfully improved the quote (true) or returned it unchanged (false)
- "improvementNote": A brief explanation of what was improved or why it couldn't be improved

Example:
{
  "text": "The full expanded quote text here...",
  "source": "https://example.com/article",
  "title": "Article Title",
  "date": "2023-10-27",
  "languageCode": "en",
  "languageName": "English",
  "improved": true,
  "improvementNote": "Expanded from partial quote to full statement from the speech"
}

Do not include any other text or markdown formatting outside of the JSON object.`;
}
