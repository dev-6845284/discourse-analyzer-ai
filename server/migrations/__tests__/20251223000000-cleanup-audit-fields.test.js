const migration = require('../20251223000000-cleanup-audit-fields');

describe('cleanup-audit-fields migration', () => {
  let mockCollection;
  let db;

  beforeEach(() => {
    process.env.DB_COLLECTION_SUFFIX = '';

    mockCollection = {
      updateMany: jest.fn().mockResolvedValue({}),
    };

    db = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('up should back up and remove analysis and audit fields and unset legacyAnalysis', async () => {
    await migration.up(db, null);

    // Should have selected the quotes collection
    expect(db.collection).toHaveBeenCalledWith('quotes');

    // First call: backup and remove metadata.analysis
    expect(mockCollection.updateMany).toHaveBeenCalledWith(
      { 'metadata.analysis': { $exists: true } },
      [
        { $set: { 'metadata.analysisBackup': '$metadata.analysis' } },
        { $unset: ['metadata.analysis'] }
      ]
    );

    // Second call: backup and remove metadata.audit
    expect(mockCollection.updateMany).toHaveBeenCalledWith(
      { 'metadata.audit': { $exists: true } },
      [
        { $set: { 'metadata.auditBackup': '$metadata.audit' } },
        { $unset: ['metadata.audit'] }
      ]
    );

    // Third call: remove legacyAnalysis if present
    expect(mockCollection.updateMany).toHaveBeenCalledWith(
      { 'metadata.legacyAnalysis': { $exists: true } },
      { $unset: { 'metadata.legacyAnalysis': '' } }
    );
  });

  test('down should restore backups where available', async () => {
    await migration.down(db, null);

    expect(db.collection).toHaveBeenCalledWith('quotes');

    // Restore analysis from backup
    expect(mockCollection.updateMany).toHaveBeenCalledWith(
      { 'metadata.analysisBackup': { $exists: true }, 'metadata.analysis': { $exists: false } },
      [
        { $set: { 'metadata.analysis': '$metadata.analysisBackup' } },
        { $unset: ['metadata.analysisBackup'] }
      ]
    );

    // Restore audit from backup
    expect(mockCollection.updateMany).toHaveBeenCalledWith(
      { 'metadata.auditBackup': { $exists: true }, 'metadata.audit': { $exists: false } },
      [
        { $set: { 'metadata.audit': '$metadata.auditBackup' } },
        { $unset: ['metadata.auditBackup'] }
      ]
    );
  });
});