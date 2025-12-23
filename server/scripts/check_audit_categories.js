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
    const coll = db.collection(`auditCategories${suffix}`);

    const count = await coll.countDocuments({});
    console.log(`auditCategories count: ${count}`);

    if (count > 0) {
      const docs = await coll.find({}).limit(5).toArray();
      console.log('Sample categories:', JSON.stringify(docs, null, 2));
    }

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    await client.close();
    process.exit(1);
  }
})();