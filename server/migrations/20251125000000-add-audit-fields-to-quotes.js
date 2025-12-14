module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    // Add audit fields to all quotes that don't have them yet
    await db.collection(`quotes${suffix}`).updateMany(
      { savedByUser: { $exists: false } },
      { 
        $set: { 
          savedByUser: null,
          savedByName: null,
          savedAt: null,
          analyzedByUser: null,
          analyzedByName: null,
          analyzedByProvider: null,
          analyzedAt: null,
          improvedByUser: null,
          improvedByName: null,
          improvedByProvider: null,
          improvedAt: null
        } 
      }
    );
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    await db.collection(`quotes${suffix}`).updateMany(
      {},
      { 
        $unset: { 
          savedByUser: "",
          savedByName: "",
          savedAt: "",
          analyzedByUser: "",
          analyzedByName: "",
          analyzedByProvider: "",
          analyzedAt: "",
          improvedByUser: "",
          improvedByName: "",
          improvedByProvider: "",
          improvedAt: ""
        } 
      }
    );
  }
};
