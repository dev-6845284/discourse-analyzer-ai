import { AnalyzeQuotePromptParams } from '../types';

/**
 * Builds the strict audit prompt for evidence-based fact-checking and discourse analysis.
 * This prompt enforces critical analysis without diplomatic softening.
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
Fact-check all claims using your knowledge and web search if necessary.${contextInstruction}${linksInstruction}

## REQUIRED ANALYSIS CATEGORIES

Analyze using ONLY these categories:

### 1. Verifiable Falsehood
Use when the statement contradicts documented facts or is demonstrably untrue based on public record.

### 2. Misleading Framing
Use when facts are selectively presented, negative reality is reframed as success, or criticism is reinterpreted as misunderstanding.

### 3. Reality Inversion
Use when public backlash is portrayed as approval, failure is reframed as achievement, or reputational damage is framed as "impact".

### 4. Responsibility Shifting
Use when blame is moved to "politics", "media", or "opponents", or affected groups are portrayed as manipulated or irrational.

### 5. Unsupported Assertion
Use when no evidence, data, or metric is provided, and claims rely solely on personal belief or anecdote.

### 6. Narrative Control / Propaganda
Use when language attempts to normalize controversy, delegitimize critics, or redefine criticism as hostile propaganda.

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
Do not translate or soften wording.${contextInstruction}${linksInstruction}

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

### 1. Dehumanization
Use when people are described as:
- dead, subhuman, vermin, objects, symbols,
- morally non-existent (“already dead”, “not really alive”),
- stripped of agency or dignity.

### 2. Symbolic Violence / Death-Wishing
Use when the statement:
- fantasizes about death, removal, disposal, or ritual elimination,
- uses historical or cultural metaphors to simulate execution or burial,
- frames death as deserved, humorous, or cleansing.

### 3. Hate-Speech Adjacent Rhetoric
Use when the language:
- targets individuals or groups as inherently corrupt, evil, or unworthy,
- uses humiliation, ridicule, or contempt as political tools,
- invites audience participation in scorn or hatred.

### 4. Authoritarian / Mob Logic
Use when the statement:
- replaces argument with expulsion or elimination,
- frames opponents as beyond debate,
- implies that removal, silencing, or destruction is preferable to discourse.

### 5. Democratic Norm Violation
Use when the statement:
- undermines pluralism or legitimacy of opponents,
- treats disagreement as moral rot or social disease,
- erodes norms of political coexistence.

### 6. Psychological & Rhetorical Profile
Diagnose what the language reveals about:
- impulse control,
- hostility level,
- contempt for democratic process,
- reliance on provocation over reasoning.

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
