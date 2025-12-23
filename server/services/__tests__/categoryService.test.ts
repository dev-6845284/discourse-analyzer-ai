const { loadCategoriesFromDb, getCategoriesForMode, resetToDefaultsForTests } = require('../categoryService');

describe('categoryService', () => {
  afterEach(() => {
    resetToDefaultsForTests();
    jest.resetAllMocks();
  });

  test('getCategoriesForMode returns defaults when DB not initialized', () => {
    const audit = getCategoriesForMode('audit');
    const flaws = getCategoriesForMode('flaws');

    expect(audit.length).toBeGreaterThan(0);
    expect(flaws.length).toBeGreaterThan(0);
  });

  test('loadCategoriesFromDb replaces cache when DB has docs', async () => {
    const mockColl = {
      find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([
        { id: 'xcat', title: 'X Cat', description: 'x', promptGuidance: 'x', modes: ['audit'], severityDefault: 'NONE', uiOrder: 1 }
      ]) })
    };
    const mockDb = { collection: jest.fn().mockReturnValue(mockColl) };

    await loadCategoriesFromDb(mockDb);

    const audit = getCategoriesForMode('audit');
    expect(audit.length).toBe(1);
    expect(audit[0].id).toBe('xcat');
  });

  test('loadCategoriesFromDb with no db leaves defaults', async () => {
    await loadCategoriesFromDb(undefined);
    const audit = getCategoriesForMode('audit');
    expect(audit.length).toBeGreaterThan(0);
  });
});