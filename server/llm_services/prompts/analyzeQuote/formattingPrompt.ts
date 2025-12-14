import { AnalyzeQuoteFormattingPromptParams } from '../types';

/**
 * Builds the formatting prompt to convert audit notes into structured JSON.
 */
export function buildAnalyzeQuoteFormattingPrompt(params: AnalyzeQuoteFormattingPromptParams): string {
  const { quoteLanguageName, analysisNotes } = params;

  return `You are a structured data formatter. Convert the audit notes below into a strict JSON payload.

### Output Requirements
- Return exactly one JSON object.
- The JSON object must have the following structure:

{
  "verdict": "<VERDICT>",
  "rationale": "<rationale in ${quoteLanguageName}>",
  "categories": {
    "Verifiable Falsehood": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" },
    "Misleading Framing": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" },
    "Reality Inversion": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" },
    "Responsibility Shifting": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" },
    "Unsupported Assertion": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" },
    "Narrative Control / Propaganda": { "severity": "<LEVEL>", "evidence": "<evidence in ${quoteLanguageName}>" }
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
