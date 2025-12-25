import { AnalyzeQuotePromptParams, PersonInfo } from '../types';
import { getCategoriesForMode } from '../../..//services/categoryService';

function renderCategoryListMarkdown(mode: 'audit'|'flaws'): string {
  return getCategoriesForMode(mode)
    .map((c, i) => `### ${i + 1}. ${c.title}\n${c.promptGuidance}`)
    .join('\n\n');
}

function formatSpeakerSection(person?: PersonInfo, fallbackName?: string): string {
  const name = person?.name || fallbackName;
  if (!name) {
    return '';
  }

  const speakerLines: string[] = [`Name: ${name}`];

  if (person?.firstname || person?.surname) {
    const structuredName = [person.firstname, person.surname].filter(Boolean).join(' ');
    if (structuredName && structuredName !== name) {
      speakerLines.push(`Structured name: ${structuredName}`);
    }
  }

  if (person?.aliases && person.aliases.length > 0) {
    speakerLines.push(`Also known as: ${person.aliases.join(', ')}`);
  }

  if (person?.description) {
    speakerLines.push(`Profile: ${person.description}`);
  }

  const metadataKeys = person?.metadata ? Object.keys(person.metadata).slice(0, 5) : [];
  if (metadataKeys.length > 0) {
    speakerLines.push(`Additional metadata keys: ${metadataKeys.join(', ')}`);
  }

  return `\n\n### Speaker\n${speakerLines.join('\n')}`;
}

/**
 * Unified entry point for building analysis prompts by type.
 * @param type The analysis type ('audit' | 'flaws')
 * @param params The analysis parameters
 */
export function buildAnalyzePromptByType(type: 'audit' | 'flaws', params: AnalyzeQuotePromptParams): string {
  switch (type) {
    case 'audit':
      return buildAnalyzeQuotePrompt(params);
    case 'flaws':
      return buildAnalyzeFlawsPrompt(params);
    default:
      throw new Error(`Unknown analysis type: ${type}`);
  }
}
/**
 * Builds the strict audit prompt for evidence-based fact-checking and discourse analysis.
 * This prompt enforces critical analysis without diplomatic softening.
 */
export function buildAnalyzeQuotePrompt(params: AnalyzeQuotePromptParams): string {
  const { quoteText, quoteLanguageName, person, personName, analysisContext, links } = params;

  let contextInstruction = '';
  if (analysisContext) {
    contextInstruction = `\n\n### User-Provided Context\nThe user has provided the following context to help with the analysis:\n"${analysisContext}"\nUse this context to better understand the intent and background of the quote.`;
  }

  let linksInstruction = '';
  if (links && links.length > 0) {
    const linkList = links.map(l => `- ${l.url} (${l.type}${l.title ? `: ${l.title}` : ''})`).join('\n');
    linksInstruction = `\n\n### Reference Material\nThe user has provided the following links as reference material:\n${linkList}\nPlease consult these sources if possible to verify facts or understand the context.`;
  }

  const authorInstruction = formatSpeakerSection(person, personName);

  return `You are an independent political communication auditor and media fact-checker.

Your task is to perform a strict, evidence-based audit of the following statement.
Do NOT be neutral, empathetic, or diplomatic.
Do NOT soften conclusions.
Strong critical language is allowed where justified.

Your goal is to:
- identify falsehoods,
- expose misleading framing,
- detect manipulation and responsibility shifting,
- clearly separate facts from narrative control.

Do NOT treat "personal opinion", "self-assessment", or "belief" as automatically valid.
If a statement contradicts observable reality, public reaction, or documented facts,
it must be classified as misleading or false.

Avoid vague language such as: "may", "might", "appears", "could be".
Every analysis MUST end with a clear verdict.

The statement is in ${quoteLanguageName}. Analyze the original text directly in ${quoteLanguageName} to understand its full meaning and nuance.
Fact-check all claims using your knowledge and web search if necessary.${contextInstruction}${linksInstruction}${authorInstruction}

## REQUIRED ANALYSIS CATEGORIES

Analyze using ONLY these categories:

${renderCategoryListMarkdown('audit')}

## SEVERITY LEVELS

Rate each category using ONLY these levels:
- NONE – not present
- LOW – minor or incidental
- MEDIUM – recurring or noticeable
- HIGH – central to the statement
- SEVERE – primary function of the statement

## HARD RULES (DO NOT VIOLATE)

* Do NOT excuse claims because they are "opinions".
* Do NOT downgrade severity due to politeness or balance.
* Do NOT rely on intent — evaluate impact and factual alignment only.
* If a claim reframes reality without evidence → classify as MISLEADING.
* If a claim asserts change without proof → classify as UNFOUNDED.
* If a claim blames critics instead of addressing substance → Responsibility Shifting is at least MEDIUM.

## EVALUATION STANDARD

Use public reaction, institutional responses, protests, resignations, and documented criticism as legitimate evidence of reality.
If a statement contradicts those signals, it cannot be considered truthful, even if phrased as personal belief.

## REQUIRED OUTPUT

For each category, provide:
1. The severity level (NONE, LOW, MEDIUM, HIGH, SEVERE)
2. Evidence/justification in ${quoteLanguageName}

Then provide:
- VERDICT: TRUE / FALSE / MISLEADING / MANIPULATIVE / UNFOUNDED
- RATIONALE: 2-4 sentences explaining why this verdict is unavoidable based on facts, public reaction, and logical consistency. Write in ${quoteLanguageName}.

Analyze this statement: "${quoteText}"`;
}

/**
 * Builds the strict audit prompt for analyzing flaws in political rhetoric and harmful speech.
 */
export function buildAnalyzeFlawsPrompt(params: AnalyzeQuotePromptParams): string {
  const { quoteText, quoteLanguageName, person, personName, analysisContext, links } = params;
  const authorInstruction = formatSpeakerSection(person, personName);

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

## REQUIRED OUTPUT FORMAT

For EACH category, provide:
1. Severity level
2. Evidence quoted or paraphrased from the statement (in ${quoteLanguageName})
3. Explanation of rhetorical function

Then provide:

### OVERALL CLASSIFICATION
Choose ONE:
- TOXIC POLITICAL RHETORIC
- DEHUMANIZING SPEECH
- SYMBOLIC VIOLENCE
- AUTHORITARIAN AGITATION
- DEMOCRATICALLY DANGEROUS SPEECH

### FINAL ASSESSMENT
3–5 sentences explaining:
- why this statement is harmful regardless of factual accuracy,
- what kind of political culture it promotes,
- what risks it poses to democratic discourse.

Write the final assessment in ${quoteLanguageName}.

Analyze this statement:
"${quoteText}"`;
}
