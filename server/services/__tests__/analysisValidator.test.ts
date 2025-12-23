const { validateAuditResult, validateFlawsResult } = require('../analysisValidator');

describe('analysisValidator', () => {
  test('valid audit result passes', () => {
    const parsed = {
      verdict: 'MISLEADING',
      rationale: 'Some rationale.',
      categories: {
        'Verifiable Falsehood': { severity: 'NONE', evidence: '' },
        'Misleading Framing': { severity: 'LOW', evidence: 'e' },
        'Reality Inversion': { severity: 'NONE', evidence: '' },
        'Responsibility Shifting': { severity: 'NONE', evidence: '' },
        'Unsupported Assertion': { severity: 'NONE', evidence: '' },
        'Narrative Control / Propaganda': { severity: 'NONE', evidence: '' }
      }
    };

    expect(() => validateAuditResult(parsed, JSON.stringify(parsed))).not.toThrow();
  });

  test('audit result missing categories throws ModelValidationError', () => {
    const parsed = {
      verdict: 'MISLEADING',
      rationale: 'r',
      categories: {
        'Verifiable Falsehood': { severity: 'NONE', evidence: '' }
      }
    };

    expect(() => validateAuditResult(parsed, JSON.stringify(parsed))).toThrow();
  });

  test('valid flaws result passes', () => {
    const parsed = {
      classification: 'TOXIC POLITICAL RHETORIC',
      finalAssessment: 'Final.',
      categories: {
        'Dehumanization': { severity: 'NONE', evidence: '' },
        'Symbolic Violence / Death-Wishing': { severity: 'NONE', evidence: '' },
        'Hate-Speech Adjacent Rhetoric': { severity: 'NONE', evidence: '' },
        'Authoritarian / Mob Logic': { severity: 'NONE', evidence: '' },
        'Democratic Norm Violation': { severity: 'NONE', evidence: '' },
        'Psychological & Rhetorical Profile': { severity: 'NONE', evidence: '' }
      }
    };

    expect(() => validateFlawsResult(parsed, JSON.stringify(parsed))).not.toThrow();
  });

  test('flaws result missing categories throws', () => {
    const parsed = {
      classification: 'TOXIC POLITICAL RHETORIC',
      finalAssessment: 'Final.',
      categories: {
        'Dehumanization': { severity: 'NONE', evidence: '' }
      }
    };

    expect(() => validateFlawsResult(parsed, JSON.stringify(parsed))).toThrow();
  });
});