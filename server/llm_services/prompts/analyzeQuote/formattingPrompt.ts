import { AnalyzeQuoteFormattingPromptParams } from '../types';
import { getCategoriesForMode } from '../../../services/categoryService';

/**
 * Builds the formatting prompt to convert audit notes into structured JSON.
 */

function buildCategoriesJsonForAudit(quoteLanguageName: string): string {
  const cats = getCategoriesForMode('audit');
  return cats.map(c => `"${c.title}": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" }`).join(',\n    ');
}

function buildCategoriesJsonForFlaws(quoteLanguageName: string): string {
  const cats = getCategoriesForMode('flaws');
  return cats.map(c => `"${c.title}": {\n      "severity": "<LEVEL>",\n      "evidence": "<evidence in ${quoteLanguageName}>"\n    }`).join(',\n    ');
}
export function buildAnalyzeQuoteFormattingPrompt(params: AnalyzeQuoteFormattingPromptParams): string {
  const { quoteLanguageName, analysisNotes, analysisType = 'audit' } = params;

  if (analysisType === 'flaws') {
    return buildAnalyzeFlawsFormattingPrompt(params);
  }

  const categoriesJson = buildCategoriesJsonForAudit(quoteLanguageName);

  return `You are a structured data formatter. Convert the audit notes below into a strict JSON payload.

### Output Requirements
- Return exactly one JSON object.
- The JSON object must have the following structure:

{
  "verdict": "<VERDICT>",
  "rationale": "<rationale in ${quoteLanguageName}>",
  "categories": {
    ${categoriesJson}
  }
}

### Field Requirements
- "verdict": Must be exactly one of: "TRUE", "FALSE", "MISLEADING", "MANIPULATIVE", "UNFOUNDED"
- "rationale": A 2-4 sentence explanation in ${quoteLanguageName} of why the verdict is unavoidable
- "severity": Must be exactly one of: "NONE", "LOW", "MEDIUM", "HIGH", "SEVERE"
  - Map any intermediate ratings like "Medium–High" to the closest standard level
- "evidence": The justification/evidence for that category's severity, written in ${quoteLanguageName}

### Audit Notes
<<<
${analysisNotes}
>>>

Return only the JSON object.`;
}

/**
 * Builds the formatting prompt to convert audit notes into structured JSON for flaws analysis.
 */
export function buildAnalyzeFlawsFormattingPrompt(params: AnalyzeQuoteFormattingPromptParams): string {
  const { quoteLanguageName, analysisNotes } = params;

  const categoriesJson = buildCategoriesJsonForFlaws(quoteLanguageName);

  return `You are a structured data formatter.

Your ONLY task is to transform the audit notes below into a strict JSON payload.
DO NOT perform analysis.
DO NOT adjust severity levels.
DO NOT reinterpret evidence.
DO NOT add new reasoning.
DO NOT omit categories.

All severity levels, classifications, and evidence text MUST be taken directly
from the provided audit notes.

---

### OUTPUT REQUIREMENTS
- Return EXACTLY one JSON object.
- Do NOT include comments, markdown, or explanations.
- Preserve wording as-is from the audit notes.
- If wording differs stylistically, keep the audit notes verbatim.

---

### REQUIRED JSON STRUCTURE

{
  "classification": "<CLASSIFICATION>",
  "finalAssessment": "<final assessment in ${quoteLanguageName}>",
  "categories": {
    ${categoriesJson}
  }
}

---

### FIELD CONSTRAINTS

#### classification
- Copy EXACTLY from the audit notes.
- Must be one of:
  "TOXIC POLITICAL RHETORIC"
  "DEHUMANIZING SPEECH"
  "SYMBOLIC VIOLENCE"
  "AUTHORITARIAN AGITATION"
  "DEMOCRATICALLY DANGEROUS SPEECH"

#### severity
- Copy EXACTLY as provided.
- Must be one of:
  "NONE", "LOW", "MEDIUM", "HIGH", "SEVERE"
- Do NOT normalize, escalate, or downgrade.

#### evidence
- Copy or lightly reformat ONLY for JSON compatibility.
- Do NOT summarize or explain.

#### finalAssessment
- Copy EXACTLY from the audit notes.
- Do NOT expand or shorten.

---

### AUDIT NOTES (AUTHORITATIVE SOURCE)
<<<
${analysisNotes}
>>>

Return ONLY the JSON object.`;
}

export function buildAnalyzeFormattingPromptByType(type: 'audit' | 'flaws', params: AnalyzeQuoteFormattingPromptParams): string {
  switch (type) {
    case 'audit':
      return buildAnalyzeQuoteFormattingPrompt({ ...params, analysisType: 'audit' });
    case 'flaws':
      return buildAnalyzeFlawsFormattingPrompt({ ...params, analysisType: 'flaws' });
    default:
      throw new Error(`Unknown analysis type: ${type}`);
  }
}
