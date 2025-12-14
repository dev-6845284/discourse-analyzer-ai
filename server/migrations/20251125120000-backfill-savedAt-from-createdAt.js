module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    // Backfill savedAt with createdAt value for quotes that have empty/null savedAt
    await db.collection(`quotes${suffix}`).updateMany(
      { 
        $or: [
          { savedAt: null },
          { savedAt: { $exists: false } }
        ],
        createdAt: { $exists: true }
      },
      [
        { 
          $set: { 
            savedAt: "$createdAt"
          } 
        }
      ]
    );
  },

  async down(db, client) {
    // No rollback needed - we don't want to nullify savedAt values
    // as we can't distinguish which ones were backfilled vs manually set
  }
};
