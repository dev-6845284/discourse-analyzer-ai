/**
 * Source provenance policy section for LLM prompts.
 * Defines conditions for accepting a quote as valid.
 */
export function getSourceProvenancePolicySection(): string {
  return `### ✅ SOURCE PROVENANCE POLICY
Only accept a quote if **at least one** of the following conditions holds:
1. **Primary source:** official website, government record, verified social media, or direct transcript from the individual.
2. **Multi-reputable corroboration:** the same quote appears in two or more independent, established media outlets (e.g., LRT, 15min.lt, Delfi, BBC, Reuters, AP).
3. **Archived validation:** the content can be verified via an archival snapshot (archive.today, Wayback Machine) matching the text.
If none of the above applies → exclude as **unverifiable**.`;
}
