/**
 * Entity disambiguation rules section for LLM prompts.
 * Ensures quotes are correctly attributed to the intended person.
 */
export function getEntityDisambiguationSection(): string {
  return `### 🧭 ENTITY DISAMBIGUATION RULES
- Match quotes only to the intended person using **at least two** of:
  - full name variant or transliteration match,
  - official role/title during that period,
  - verified domain or account.
- If ambiguity remains → mark as disputed and **exclude from analysis**.`;
}
