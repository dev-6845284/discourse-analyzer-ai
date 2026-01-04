import { AnalyzeQuotePromptParams, PersonInfo } from '../types';
import {
  getCommonAuditIdentity,
  getCommonFlawsIdentity,
  getCommonAuditRules,
  getCommonFlawsRules,
  getCommonEvaluationStandard,
  formatSpeakerSection,
  formatContextAndLinks,
  renderCategoryListMarkdown,
  getSeverityLevelsMarkdown
} from '../shared/auditInstructions';

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

  const identity = getCommonAuditIdentity();
  const contextAndLinks = formatContextAndLinks(analysisContext, links);
  const authorInstruction = formatSpeakerSection(person, personName);
  const rules = getCommonAuditRules();
  const evaluation = getCommonEvaluationStandard();
  const severity = getSeverityLevelsMarkdown();
  const categories = renderCategoryListMarkdown('audit');

  return `${identity}

The statement is in ${quoteLanguageName}. Analyze the original text directly in ${quoteLanguageName} to understand its full meaning and nuance.
Fact-check all claims using your knowledge and web search if necessary.

## REQUIRED ANALYSIS CATEGORIES

Analyze using ONLY these categories:

${categories}

${severity}

${rules}

${evaluation}

## REQUIRED OUTPUT

For each category, provide:
1. The severity level (NONE, LOW, MEDIUM, HIGH, SEVERE)
2. Evidence/justification in ${quoteLanguageName}

Then provide:
- VERDICT: TRUE / FALSE / MISLEADING / MANIPULATIVE / UNFOUNDED
- RATIONALE: 2-4 sentences explaining why this verdict is unavoidable based on facts, public reaction, and logical consistency. Write in ${quoteLanguageName}.

---

### ANALYSIS INPUT

${authorInstruction}
${contextAndLinks}

Analyze this statement:
"${quoteText}"`;
}

/**
 * Builds the strict audit prompt for analyzing flaws in political rhetoric and harmful speech.
 */
export function buildAnalyzeFlawsPrompt(params: AnalyzeQuotePromptParams): string {
  const { quoteText, quoteLanguageName, person, personName, analysisContext, links } = params;

  const identity = getCommonFlawsIdentity();
  const authorInstruction = formatSpeakerSection(person, personName);
  const contextAndLinks = formatContextAndLinks(analysisContext, links);
  const rules = getCommonFlawsRules();
  const categories = renderCategoryListMarkdown('flaws');

  return `${identity}

Analyze the original text directly in ${quoteLanguageName}.
Do not translate or soften wording.

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

${categories}

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

${rules}

---

## REQUIRED OUTPUT FORMAT

For EACH category, provide:
1. Severity level
2. Evidence quoted or paraphrased from the statement (in ${quoteLanguageName})
3. Explanation of rhetorical function (in ${quoteLanguageName})

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

---

### ANALYSIS INPUT

${authorInstruction}
${contextAndLinks}

Analyze this statement:
"${quoteText}"`;
}
