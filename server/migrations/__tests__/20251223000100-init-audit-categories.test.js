const migration = require('../20251223000100-init-audit-categories');

describe('init-audit-categories migration', () => {
  let mockCollection;
  let db;

  beforeEach(() => {
    process.env.DB_COLLECTION_SUFFIX = '';

    mockCollection = {
      updateOne: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({})
    };

    db = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('up should upsert multiple category docs by id', async () => {
    await migration.up(db, null);

    expect(db.collection).toHaveBeenCalledWith('auditCategories');

    // Should call updateOne for each category id (we check at least one and count)
    expect(mockCollection.updateOne).toHaveBeenCalled();
    expect(mockCollection.updateOne.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Spot check an expected upsert call signature for id 'verifiableFalsehood'
    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { id: 'verifiableFalsehood' },
      expect.any(Object),
      { upsert: true }
    );
  });

  test('down should delete inserted categories by id', async () => {
    await migration.down(db, null);

    expect(db.collection).toHaveBeenCalledWith('auditCategories');
    expect(mockCollection.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ id: { $in: expect.any(Array) } }));
  });
});