import { FetchQuotesResearchPromptParams } from '../types';
import { getSecurityGuardsSection } from '../shared/securityGuards';
import { getSourceProvenancePolicySection } from '../shared/sourceProvenancePolicy';
import { getEntityDisambiguationSection } from '../shared/entityDisambiguation';
import { getWebSearchPlanSection } from '../shared/webSearchPlan';
import { getQuoteExtractionRulesSection, getQuoteOutputFormatSection } from '../shared/quoteExtractionRules';

/**
 * Builds the research prompt for fetching quotes about a person.
 * This prompt is used with web search enabled to find quotes from various sources.
 */
export function buildFetchQuotesResearchPrompt(params: FetchQuotesResearchPromptParams): string {
  const {
    personName,
    maxQuotes,
    timePeriod,
    languages,
    context,
    maxQuoteLength,
    limitQuoteLength = false,
  } = params;

  const timePeriodString = timePeriod.startDate && timePeriod.endDate
    ? ` (specifically between ${timePeriod.startDate} and ${timePeriod.endDate})`
    : '';

  const securitySection = getSecurityGuardsSection();
  const provenanceSection = getSourceProvenancePolicySection();
  const disambiguationSection = getEntityDisambiguationSection();
  const webSearchSection = getWebSearchPlanSection({ languages, context, timePeriod });
  const extractionRulesSection = getQuoteExtractionRulesSection({ personName, maxQuoteLength, limitQuoteLength });
  const outputFormatSection = getQuoteOutputFormatSection({ personName, maxQuoteLength, limitQuoteLength });

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
${extractionRulesSection}
---

${outputFormatSection}

Include up to ${maxQuotes} quotes.`;
}
