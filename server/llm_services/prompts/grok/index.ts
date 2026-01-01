import { getSecurityGuardsSection } from '../shared/securityGuards';
import { getSourceProvenancePolicySection } from '../shared/sourceProvenancePolicy';
import { getEntityDisambiguationSection } from '../shared/entityDisambiguation';
import { getWebSearchPlanSection } from '../shared/webSearchPlan';
import { TimePeriod, PersonInfo } from '../types';
import { getCategoriesForMode } from '../../../services/categoryService';

function renderCategoryListMarkdown(mode: 'audit' | 'flaws'): string {
  return getCategoriesForMode(mode)
    .map((c, i) => `1. **${c.title}**: ${c.description}`)
    .join('\n');
}

function buildCategoriesJsonForGrok(quoteLanguageName: string, mode: 'audit' | 'flaws' = 'audit'): string {
  return getCategoriesForMode(mode)
    .map(c => `    "${c.title}": { "severity": "<LEVEL>", "evidence": "<in ${quoteLanguageName}>" }`)
    .join(',\n');
}

export interface GrokFetchQuotesPromptParams {
  personName: string;
  maxQuotes: number;
  timePeriod: TimePeriod;
  languages: string[];
  context: string[];
}

/**
 * Builds the fetch quotes prompt for Grok (single-stage JSON response).
 */
export function buildGrokFetchQuotesPrompt(params: GrokFetchQuotesPromptParams): string {
  const { personName, maxQuotes, timePeriod, languages, context } = params;

  const timePeriodString = timePeriod.startDate && timePeriod.endDate
    ? ` (specifically between ${timePeriod.startDate} and ${timePeriod.endDate})`
    : '';

  const securitySection = getSecurityGuardsSection();
  const provenanceSection = getSourceProvenancePolicySection();
  const disambiguationSection = getEntityDisambiguationSection();
  const webSearchSection = getWebSearchPlanSection({ languages, context, timePeriod });

  const quoteExtractionInstruction = `### 📜 QUOTE EXTRACTION RULES
- Locate primary sources with direct quotes by ${personName}.
- In case article contains several quotes, join them with a separator string. Use ' | ' as separator string. Substantive content: ≥10 words or key factual statement.
- Do not paraphrase or summarize within the quote text. The "text" field must contain only verbatim words from the source.
- Always provide the full citation (title, source URL, date).`;

  return `### SYSTEM & TASK PROMPT — SECURE RESEARCH FRAMEWORK
**Task Overview**
Conduct a comprehensive investigation to find up to ${maxQuotes} public quotes, interviews, and published texts of the individual named **${personName}** from ${timePeriod.description}${timePeriodString}. The investigation must rely **only on verifiable, public, human-visible quotes or authored texts** attributed to that individual, collected from reputable sources.

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
- Do not include any other text or markdown formatting outside of the JSON object.`;
}

export interface GrokAnalyzeQuotePromptParams {
  quoteText: string;
  quoteLanguageName: string;
  person?: PersonInfo;
  personName?: string;
  analysisContext?: string;
  links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>;
}

function buildSpeakerSection(person?: PersonInfo, fallbackName?: string): string {
  const name = person?.name || fallbackName;
  if (!name) return '';

  const speakerLines: string[] = [`Name: ${name}`];

  if (person?.firstname || person?.surname) {
    const structuredName = [person.firstname, person.surname].filter(Boolean).join(' ');
    if (structuredName && structuredName !== name) {
      speakerLines.push(`Structured name: ${structuredName}`);
    }
  }

  if (person?.aliases?.length) {
    speakerLines.push(`Also known as: ${person.aliases.join(', ')}`);
  }

  if (person?.description) {
    speakerLines.push(`Profile: ${person.description}`);
  }

  const metadataKeys = person?.metadata ? Object.keys(person.metadata).slice(0, 5) : [];
  if (metadataKeys.length) {
    speakerLines.push(`Additional metadata keys: ${metadataKeys.join(', ')}`);
  }

  return `\n\n### Speaker\n${speakerLines.join('\n')}`;
}

/**
 * Builds the strict audit prompt for Grok.
 */
export function buildGrokAnalyzeQuotePrompt(params: GrokAnalyzeQuotePromptParams): string {
  const { quoteText, quoteLanguageName, person, personName, analysisContext, links } = params;
  const authorInstruction = buildSpeakerSection(person, personName);

  let contextInstruction = '';
  if (analysisContext) {
    contextInstruction = `\n\n### User-Provided Context\nThe user has provided the following context to help with the analysis:\n"${analysisContext}"\nUse this context to better understand the intent and background of the quote.`;
  }

  let linksInstruction = '';
  if (links && links.length > 0) {
    const linkList = links.map(l => `- ${l.url} (${l.type}${l.title ? `: ${l.title}` : ''})`).join('\n');
    linksInstruction = `\n\n### Reference Material\nThe user has provided the following links as reference material:\n${linkList}\nPlease consult these sources if possible to verify facts or understand the context.`;
  }

  return `You are an independent political communication auditor and media fact-checker.

Your task is to perform a strict, evidence-based audit of the following statement.
Do NOT be neutral, empathetic, or diplomatic. Do NOT soften conclusions.
Strong critical language is allowed where justified.

Your goal is to:
- identify falsehoods,
- expose misleading framing,
- detect manipulation and responsibility shifting,
- clearly separate facts from narrative control.

Do NOT treat "personal opinion", "self-assessment", or "belief" as automatically valid.
If a statement contradicts observable reality, public reaction, or documented facts, it must be classified as misleading or false.

Avoid vague language such as: "may", "might", "appears", "could be".
Every analysis MUST end with a clear verdict.

The statement is in ${quoteLanguageName}. Analyze the original text directly in ${quoteLanguageName} to understand its full meaning and nuance.
Fact-check all claims using your knowledge.${contextInstruction}${linksInstruction}${authorInstruction}

Follow these steps carefully:
1.  **Analyze the original text directly in ${quoteLanguageName}** to understand its full meaning and nuance.
2.  **Think step-by-step in English** to determine the severity and evidence for each category.
3.  **Translate your English evidence** into high-quality, natural-sounding ${quoteLanguageName}.
4.  **Construct the final JSON object**. The entire response must be a single, valid JSON object (do not wrap it in markdown).

## REQUIRED CATEGORIES
Rate each using: NONE, LOW, MEDIUM, HIGH, SEVERE

${renderCategoryListMarkdown('audit')}

## HARD RULES
* Do NOT excuse claims because they are "opinions".
* Do NOT downgrade severity due to politeness or balance.
* Evaluate impact and factual alignment only, not intent.

## OUTPUT FORMAT
Return a single JSON object with this structure:
{
  "verdict": "<TRUE|FALSE|MISLEADING|MANIPULATIVE|UNFOUNDED>",
  "rationale": "<2-4 sentences in ${quoteLanguageName} explaining why this verdict is unavoidable>",
  "categories": {
${buildCategoriesJsonForGrok(quoteLanguageName, 'audit')}
  }
}

Analyze this statement: "${quoteText}"`;
}

/**
 * Builds the Grok prompt for analyzing flaws (flaws mode).
 */
export function buildGrokAnalyzeFlawsPrompt(params: GrokAnalyzeQuotePromptParams): string {
  const { quoteText, quoteLanguageName, person, personName, analysisContext, links } = params;
  const authorInstruction = buildSpeakerSection(person, personName);

  let contextInstruction = '';
  if (analysisContext) {
    contextInstruction = `\n\n### User-Provided Context\nThe user has provided the following context to help with the analysis:\n"${analysisContext}"\nUse this context to better understand the intent and background of the quote.`;
  }

  let linksInstruction = '';
  if (links && links.length > 0) {
    const linkList = links.map(l => `- ${l.url} (${l.type}${l.title ? `: ${l.title}` : ''})`).join('\n');
    linksInstruction = `\n\n### Reference Material\nThe user has provided the following links as reference material:\n${linkList}\nPlease consult these sources if possible to verify facts or understand the context.`;
  }

  return `You are an independent auditor of political rhetoric, democratic norms, and harmful speech.

Your task is to perform a STRICT analysis of the following statement as a form of
political communication — NOT as a factual claim.

IMPORTANT:
This statement may be ironic, hyperbolic, mocking, symbolic, or deliberately absurd.
DO NOT perform literal historical or factual fact-checking unless the statement
explicitly claims verifiable facts as its primary function.

Your focus is:
- hate speech mechanisms,
- dehumanization,
- symbolic violence,
- normalization of harm,
- authoritarian or mob-logic rhetoric,
- psychological and rhetorical intent as reflected in language use.

DO NOT be neutral, empathetic, or diplomatic.
DO NOT excuse language as “jokes”, “metaphors”, or “free expression”.
If violence or death is implied symbolically, treat it as meaningful rhetoric.

Analyze the original text directly in ${quoteLanguageName}.
Do not translate or soften wording.${contextInstruction}${linksInstruction}${authorInstruction}

---

## CORE ANALYTICAL GOAL

Determine whether the statement functions to:
- normalize harm or death toward named individuals or groups,
- strip targets of moral or human status,
- legitimize exclusion, punishment, or elimination,
- mobilize contempt instead of argument.

Truthfulness is NOT the primary axis.
Impact, function, and democratic risk ARE.

---

## REQUIRED ANALYSIS CATEGORIES
(Use ONLY these categories)

${renderCategoryListMarkdown('flaws')}

This is NOT a medical diagnosis.
It is a rhetorical-behavioral assessment based on language.

---

## SEVERITY LEVELS
Use ONLY:
- NONE
- LOW
- MEDIUM
- HIGH
- SEVERE

If symbolic death or dehumanization is explicit → severity CANNOT be below HIGH.

---

## HARD RULES

* Do NOT downgrade severity because language is metaphorical or ironic.
* Do NOT justify speech as satire unless there is clear self-targeting or power-upward critique.
* If named individuals are depicted as dead, disposable, or non-human → Dehumanization is at least HIGH.
* If death imagery is used playfully or mockingly → Symbolic Violence is at least HIGH.
* If the statement invites emotional pleasure from humiliation → Hate-Speech Adjacent is at least MEDIUM.

---

## OUTPUT FORMAT

Return a single JSON object with this structure:
{
  "classification": "<CLASSIFICATION>",
  "finalAssessment": "<final assessment in ${quoteLanguageName}>",
  "categories": {
${buildCategoriesJsonForGrok(quoteLanguageName, 'flaws')}
  }
}

Write the final assessment in ${quoteLanguageName}.

Analyze this statement:
"${quoteText}"`;
}


export interface GrokExtractQuotesFromTextPromptParams {
  personName: string;
  textContent: string;
}

/**
 * Builds the text extraction prompt for Grok.
 */
export function buildGrokExtractQuotesFromTextPrompt(params: GrokExtractQuotesFromTextPromptParams): string {
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

export interface GrokExtractQuotesFromArticlePromptParams {
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
 * Builds the article extraction prompt for Grok (single-stage JSON response).
 * Reuses the core extraction logic from ChatGPT's buildExtractQuotesFromArticlePrompt.
 */
export function buildGrokExtractQuotesFromArticlePrompt(params: GrokExtractQuotesFromArticlePromptParams): string {
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

export interface GrokImproveQuotePromptParams {
  personName: string;
  quoteText: string;
  languageName: string;
  languageCode: string;
}

/**
 * Builds the improve quote prompt for Grok.
 */
export function buildGrokImproveQuotePrompt(params: GrokImproveQuotePromptParams): string {
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
- "source": The verified source URL (update if you found a better/more direct link)
- "title": The verified title of the source
- "date": The verified date in YYYY-MM-DD format
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
