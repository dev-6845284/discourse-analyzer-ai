const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discourse-analyzer';
  let dbName = 'discourse-analyzer';
  try {
    const urlObj = new URL(uri);
    if (urlObj.pathname && urlObj.pathname.length > 1) dbName = urlObj.pathname.substring(1);
  } catch (e) {
    // ignore, use default
  }

  const suffix = process.env.DB_COLLECTION_SUFFIX || '';
  const schemaSuffix = process.env.DB_SCHEMA_SUFFIX || '';

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName + schemaSuffix);
    const coll = db.collection(`quotes${suffix}`);

    const counts = {
      total: await coll.countDocuments({}),
      withAnalysis: await coll.countDocuments({ 'metadata.analysis': { $exists: true } }),
      withAudit: await coll.countDocuments({ 'metadata.audit': { $exists: true } }),
      withAnalysisBackup: await coll.countDocuments({ 'metadata.analysisBackup': { $exists: true } }),
      withAuditBackup: await coll.countDocuments({ 'metadata.auditBackup': { $exists: true } }),
    };

    console.log('Counts:');
    console.log(JSON.stringify(counts, null, 2));

    if (counts.withAnalysis > 0) {
      console.log('\nSample doc with metadata.analysis:');
      const doc = await coll.findOne({ 'metadata.analysis': { $exists: true } });
      console.log(JSON.stringify(doc, null, 2));
    }

    if (counts.withAudit > 0) {
      console.log('\nSample doc with metadata.audit:');
      const doc = await coll.findOne({ 'metadata.audit': { $exists: true } });
      console.log(JSON.stringify(doc, null, 2));
    }

    if (counts.withAnalysisBackup > 0) {
      console.log('\nSample doc with metadata.analysisBackup:');
      const doc = await coll.findOne({ 'metadata.analysisBackup': { $exists: true } });
      console.log(JSON.stringify(doc, null, 2));
    }

    if (counts.withAuditBackup > 0) {
      console.log('\nSample doc with metadata.auditBackup:');
      const doc = await coll.findOne({ 'metadata.auditBackup': { $exists: true } });
      console.log(JSON.stringify(doc, null, 2));
    }

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    await client.close();
    process.exit(1);
  }
})();