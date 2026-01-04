import { AUDIT_CATEGORIES, CATEGORY_BY_ID, getCategoriesForMode } from '../auditCategories';

describe('auditCategories config', () => {
  test('ids are unique and all required fields present', () => {
    const ids = AUDIT_CATEGORIES.map(c => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);

    for (const c of AUDIT_CATEGORIES) {
      expect(typeof c.id).toBe('string');
      expect(typeof c.title).toBe('string');
      expect(typeof c.promptGuidance).toBe('string');
      expect(Array.isArray(c.modes)).toBe(true);
    }
  });

  test('CATEGORY_BY_ID maps ids', () => {
    for (const c of AUDIT_CATEGORIES) {
      expect(CATEGORY_BY_ID[c.id]).toBeDefined();
      expect(CATEGORY_BY_ID[c.id].title).toBe(c.title);
    }
  });

  test('getCategoriesForMode returns at least one for audit and one for flaws', () => {
    expect(getCategoriesForMode('audit').length).toBeGreaterThan(0);
    expect(getCategoriesForMode('flaws').length).toBeGreaterThan(0);
  });
});