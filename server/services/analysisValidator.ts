import { getCategoriesForMode } from './categoryService';
import { ModelValidationError } from '../types';

const VALID_SEVERITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE'];
const VALID_VERDICTS = ['TRUE', 'FALSE', 'MISLEADING', 'MANIPULATIVE', 'UNFOUNDED'];

function ensureObject(obj: any, name = 'payload') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(`${name} must be an object`);
  }
}

export function validateAuditResult(parsed: any, rawResponse: string) {
  try {
    ensureObject(parsed, 'audit result');

    // verdict
    if (!parsed.verdict || typeof parsed.verdict !== 'string' || !VALID_VERDICTS.includes(parsed.verdict)) {
      throw new Error(`Invalid or missing 'verdict'. Expected one of: ${VALID_VERDICTS.join(', ')}.`);
    }

    if (!parsed.rationale || typeof parsed.rationale !== 'string') {
      throw new Error(`Missing or invalid 'rationale'.`);
    }

    if (!parsed.categories || typeof parsed.categories !== 'object') {
      throw new Error(`Missing 'categories' object.`);
    }

    const expectedTitles = getCategoriesForMode('audit').map(c => c.title);

    const returnedTitles = Object.keys(parsed.categories);

    const missing = expectedTitles.filter(t => !returnedTitles.includes(t));
    if (missing.length > 0) {
      throw new Error(`Missing categories in response: ${missing.join(', ')}.`);
    }

    // Validate each category's fields
    for (const [title, detail] of Object.entries(parsed.categories)) {
      if (!detail || typeof detail !== 'object') {
        throw new Error(`Category '${title}' must be an object with 'severity' and 'evidence'.`);
      }
      let sev = (detail as any).severity;
      const ev = (detail as any).evidence;

      // Normalize severity
      if (typeof sev === 'string') {
        sev = sev.toUpperCase().trim();
        // Handle ranges like "LOW to MEDIUM" -> take the higher one (usually second)
        if (sev.includes(' TO ')) {
          const parts = sev.split(' TO ');
          sev = parts[parts.length - 1].trim();
        }
        // Handle slash "LOW/MEDIUM"
        if (sev.includes('/')) {
          const parts = sev.split('/');
          sev = parts[parts.length - 1].trim();
        }
      }

      if (!sev || typeof sev !== 'string' || !VALID_SEVERITIES.includes(sev)) {
        throw new Error(`Category '${title}' has invalid severity: ${sev}.`);
      }

      // Update the parsed object with normalized value
      (detail as any).severity = sev;

      if (typeof ev !== 'string') {
        throw new Error(`Category '${title}' evidence must be a string.`);
      }
    }

    // Passed all checks
    return true;
  } catch (e) {
    throw new ModelValidationError((e as Error).message, rawResponse);
  }
}

export function validateFlawsResult(parsed: any, rawResponse: string) {
  try {
    ensureObject(parsed, 'flaws result');

    // Backward compatibility: map classification to verdict if verdict is missing
    if (!parsed.verdict && parsed.classification) {
      parsed.verdict = parsed.classification;
    }

    if (!parsed.verdict || typeof parsed.verdict !== 'string') {
      throw new Error(`Missing or invalid 'verdict'.`);
    }
    if (!parsed.finalAssessment || typeof parsed.finalAssessment !== 'string') {
      throw new Error(`Missing or invalid 'finalAssessment'.`);
    }
    if (!parsed.categories || typeof parsed.categories !== 'object') {
      throw new Error(`Missing 'categories' object.`);
    }

    const expectedTitles = getCategoriesForMode('flaws').map(c => c.title);
    const returnedTitles = Object.keys(parsed.categories);
    const missing = expectedTitles.filter(t => !returnedTitles.includes(t));
    if (missing.length > 0) {
      throw new Error(`Missing categories in response: ${missing.join(', ')}.`);
    }

    for (const [title, detail] of Object.entries(parsed.categories)) {
      if (!detail || typeof detail !== 'object') {
        throw new Error(`Category '${title}' must be an object with 'severity' and 'evidence'.`);
      }
      let sev = (detail as any).severity;
      const ev = (detail as any).evidence;

      // Normalize severity
      if (typeof sev === 'string') {
        sev = sev.toUpperCase().trim();
        // Handle ranges like "LOW to MEDIUM" -> take the higher one (usually second)
        if (sev.includes(' TO ')) {
          const parts = sev.split(' TO ');
          sev = parts[parts.length - 1].trim();
        }
        // Handle slash "LOW/MEDIUM"
        if (sev.includes('/')) {
          const parts = sev.split('/');
          sev = parts[parts.length - 1].trim();
        }
      }

      if (!sev || typeof sev !== 'string' || !VALID_SEVERITIES.includes(sev)) {
        throw new Error(`Category '${title}' has invalid severity: ${sev}.`);
      }

      // Update the parsed object with normalized value
      (detail as any).severity = sev;

      if (typeof ev !== 'string') {
        throw new Error(`Category '${title}' evidence must be a string.`);
      }
    }

    return true;
  } catch (e) {
    throw new ModelValidationError((e as Error).message, rawResponse);
  }
}
