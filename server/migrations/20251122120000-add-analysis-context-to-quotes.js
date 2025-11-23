module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    await db.collection(`quotes${suffix}`).updateMany(
      { analysisContext: { $exists: false } },
      { $set: { analysisContext: "" } }
    );
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    await db.collection(`quotes${suffix}`).updateMany(
      {},
      { $unset: { analysisContext: "" } }
    );
  }
};
