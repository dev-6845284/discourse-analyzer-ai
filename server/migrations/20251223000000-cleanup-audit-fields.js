/**
 * Migration: Cleanup audit/analysis fields for easier future migrations
 *
 * Since this environment contains no valuable data yet, this migration keeps
 * things simple and removes existing `metadata.analysis` and `metadata.audit` fields.
 * Where present, it copies them to backup fields (`metadata.analysisBackup` and
 * `metadata.auditBackup`) before removal so the operation is reversible.
 */

module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const collection = db.collection(`quotes${suffix}`);

    // Back up and remove legacy analysis field if present
    await collection.updateMany(
      { 'metadata.analysis': { $exists: true } },
      [
        { $set: { 'metadata.analysisBackup': '$metadata.analysis' } },
        { $unset: ['metadata.analysis'] }
      ]
    );

    // Back up and remove audit field if present
    await collection.updateMany(
      { 'metadata.audit': { $exists: true } },
      [
        { $set: { 'metadata.auditBackup': '$metadata.audit' } },
        { $unset: ['metadata.audit'] }
      ]
    );

    // Remove any migration artifacts we no longer need
    await collection.updateMany(
      { 'metadata.legacyAnalysis': { $exists: true } },
      { $unset: { 'metadata.legacyAnalysis': '' } }
    );

    console.log('Cleanup migration: removed metadata.analysis and metadata.audit (backups created if present).');
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const collection = db.collection(`quotes${suffix}`);

    // Restore backups if they exist and original fields are missing
    await collection.updateMany(
      { 'metadata.analysisBackup': { $exists: true }, 'metadata.analysis': { $exists: false } },
      [
        { $set: { 'metadata.analysis': '$metadata.analysisBackup' } },
        { $unset: ['metadata.analysisBackup'] }
      ]
    );

    await collection.updateMany(
      { 'metadata.auditBackup': { $exists: true }, 'metadata.audit': { $exists: false } },
      [
        { $set: { 'metadata.audit': '$metadata.auditBackup' } },
        { $unset: ['metadata.auditBackup'] }
      ]
    );

    console.log('Cleanup down: restored backups where available.');
  }
};