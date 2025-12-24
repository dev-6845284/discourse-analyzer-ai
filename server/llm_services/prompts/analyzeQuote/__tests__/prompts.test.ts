import { buildAnalyzeQuotePrompt, buildAnalyzeFlawsPrompt } from '../analysisPrompt';
import { buildAnalyzeQuoteFormattingPrompt, buildAnalyzeFlawsFormattingPrompt } from '../formattingPrompt';
import { buildGrokAnalyzeQuotePrompt } from '../../grok';
import { buildGeminiAnalyzeQuotePrompt } from '../../gemini';
import { AUDIT_CATEGORIES } from '../../../../config/auditCategories';


describe('dynamic category prompts', () => {
  test('audit prompt includes configured category titles', () => {
    const prompt = buildAnalyzeQuotePrompt({ quoteText: 'test', quoteLanguageName: 'English' });
    for (const c of AUDIT_CATEGORIES.filter((c: any) => c.modes.includes('audit'))) {
      expect(prompt).toContain(c.title);
    }
  });

  test('audit prompt includes speaker when provided', () => {
    const prompt = buildAnalyzeQuotePrompt({ quoteText: 'test', quoteLanguageName: 'English', personName: 'Jane Doe' });
    expect(prompt).toContain('Name: Jane Doe');
  });

  test('flaws prompt includes configured category titles', () => {
    const prompt = buildAnalyzeFlawsPrompt({ quoteText: 'test', quoteLanguageName: 'English' });
    for (const c of AUDIT_CATEGORIES.filter((c: any) => c.modes.includes('flaws'))) {
      expect(prompt).toContain(c.title);
    }
  });

  test('flaws prompt includes speaker when provided', () => {
    const prompt = buildAnalyzeFlawsPrompt({ quoteText: 'test', quoteLanguageName: 'English', personName: 'Jane Doe' });
    expect(prompt).toContain('Name: Jane Doe');
  });

  test('formatting prompt (audit) includes JSON category keys', () => {
    const fmt = buildAnalyzeQuoteFormattingPrompt({ quoteLanguageName: 'English', analysisNotes: 'notes' });
    expect(fmt).toContain('"Verifiable Falsehood":');
    expect(fmt).toContain('"Misleading Framing":');
  });

  test('grok prompt output format includes category keys', () => {
    const grok = buildGrokAnalyzeQuotePrompt({ quoteText: 'x', quoteLanguageName: 'English' });
    expect(grok).toContain('"Verifiable Falsehood"');
  });

  test('gemini prompt output format includes category keys', () => {
    const gem = buildGeminiAnalyzeQuotePrompt({ quoteText: 'x', quoteLanguageName: 'English' });
    expect(gem).toContain('"Verifiable Falsehood"');
  });
});
