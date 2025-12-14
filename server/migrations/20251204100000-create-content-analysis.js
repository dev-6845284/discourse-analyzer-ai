module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const contentAnalysisCollection = `contentanalyses${suffix}`;
    const quotesCollection = `quotes${suffix}`;

    // Create contentanalyses collection
    await db.createCollection(contentAnalysisCollection);
    
    // Create indexes for contentanalyses
    await db.collection(contentAnalysisCollection).createIndex({ userId: 1 });
    await db.collection(contentAnalysisCollection).createIndex({ sourceUrl: 1 });

    // Update quotes collection with new indexes
    await db.collection(quotesCollection).createIndex({ contentAnalysisId: 1 });
    await db.collection(quotesCollection).createIndex({ originIds: 1 });
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const contentAnalysisCollection = `contentanalyses${suffix}`;
    const quotesCollection = `quotes${suffix}`;

    // Drop contentanalyses collection
    await db.collection(contentAnalysisCollection).drop();

    // Drop indexes from quotes (optional, usually not strictly necessary to drop indexes on down unless they conflict)
    try {
      await db.collection(quotesCollection).dropIndex("contentAnalysisId_1");
      await db.collection(quotesCollection).dropIndex("originIds_1");
    } catch (e) {
      console.log("Indexes might not exist, skipping drop");
    }
  }
};
