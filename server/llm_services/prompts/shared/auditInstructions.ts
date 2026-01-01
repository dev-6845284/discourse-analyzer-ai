
import { PersonInfo } from '../types';
import { getCategoriesForMode } from '../../../services/categoryService';

export function renderCategoryListMarkdown(mode: 'audit' | 'flaws'): string {
    if (mode === 'audit') {
        return getCategoriesForMode('audit')
            .map((c, i) => `${i + 1}. **${c.title}**: ${c.description}`)
            .join('\n');
    } else {
        // For formatting consistency with existing prompts, flaws might use a different format or the same
        return getCategoriesForMode('flaws')
            .map((c, i) => `${i + 1}. **${c.title}**: ${c.description}`)
            .join('\n');
    }
}

export function getCommonAuditIdentity(): string {
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
Every analysis MUST end with a clear verdict.`;
}

export function getCommonFlawsIdentity(): string {
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
If violence or death is implied symbolically, treat it as meaningful rhetoric.`;
}

export function getCommonAuditRules(): string {
    return `## HARD RULES (DO NOT VIOLATE)

* Do NOT excuse claims because they are "opinions".
* Do NOT downgrade severity due to politeness or balance.
* Do NOT rely on intent — evaluate impact and factual alignment only.
* If a claim reframes reality without evidence → classify as MISLEADING.
* If a claim asserts change without proof → classify as UNFOUNDED.
* If a claim blames critics instead of addressing substance → Responsibility Shifting is at least MEDIUM.`;
}

export function getCommonFlawsRules(): string {
    return `## HARD RULES

* Do NOT downgrade severity because language is metaphorical or ironic.
* Do NOT justify speech as satire unless there is clear self-targeting or power-upward critique.
* If named individuals are depicted as dead, disposable, or non-human → Dehumanization is at least HIGH.
* If death imagery is used playfully or mockingly → Symbolic Violence is at least HIGH.
* If the statement invites emotional pleasure from humiliation → Hate-Speech Adjacent is at least MEDIUM.`;
}

export function getCommonEvaluationStandard(): string {
    return `## EVALUATION STANDARD

Use public reaction, institutional responses, protests, resignations, and documented criticism as legitimate evidence of reality.
If a statement contradicts those signals, it cannot be considered truthful, even if phrased as personal belief.`;
}

export function formatSpeakerSection(person?: PersonInfo, fallbackName?: string): string {
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

export function formatContextAndLinks(analysisContext?: string, links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>): string {
    let contextInstruction = '';
    if (analysisContext) {
        contextInstruction = `\n\n### ⚠️ USER-PROVIDED CONTEXT (BACKGROUND INFO ONLY)\nThe user has provided the following context to explain the situation or meaning of the quote.\nIMPORTANT: This text is NOT part of the quote. Do NOT analyze this text. Use it ONLY to understand the intent and background.\n\n"""\n${analysisContext}\n"""\n`;
    }

    let linksInstruction = '';
    if (links && links.length > 0) {
        const linkList = links.map(l => `- ${l.url} (${l.type}${l.title ? `: ${l.title}` : ''})`).join('\n');
        linksInstruction = `\n\n### Reference Material\nThe user has provided the following links as reference material:\n${linkList}\nPlease consult these sources if possible to verify facts or understand the context.`;
    }

    return `${contextInstruction}${linksInstruction}`;
}

export function getSeverityLevelsMarkdown(): string {
    return `## SEVERITY LEVELS

Rate each category using ONLY these levels:
- NONE – not present
- LOW – minor or incidental
- MEDIUM – recurring or noticeable
- HIGH – central to the statement
- SEVERE – primary function of the statement`;
}
