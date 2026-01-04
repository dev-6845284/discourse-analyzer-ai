module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const apiKeySets = `api_key_sets${suffix}`;
    const userApiKeySets = `user_api_key_sets${suffix}`;

    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);

    if (!names.includes(apiKeySets)) {
      await db.createCollection(apiKeySets);
    }
    if (!names.includes(userApiKeySets)) {
      await db.createCollection(userApiKeySets);
    }

    // Compound unique index on alias+createdBy: prevents duplicate alias for same creator,
    // while allowing per-user reserved alias usage (createdBy different)
    await db.collection(apiKeySets).createIndex({ alias: 1, createdBy: 1 }, { unique: true, name: 'alias_createdBy_unique' });
    await db.collection(userApiKeySets).createIndex({ userId: 1, apiKeySetId: 1 }, { unique: true, name: 'user_apiKeySet_unique' });
    await db.collection(userApiKeySets).createIndex({ apiKeySetId: 1 });
    await db.collection(userApiKeySets).createIndex({ userId: 1 });
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const apiKeySets = `api_key_sets${suffix}`;
    const userApiKeySets = `user_api_key_sets${suffix}`;

    try {
      await db.collection(apiKeySets).dropIndex('alias_1');
    } catch (e) {
      console.warn('Error dropping api_key_sets alias index:', e.message);
    }
    try {
      await db.collection(userApiKeySets).dropIndex('user_apiKeySet_unique');
    } catch (e) {
      console.warn('Error dropping user_api_key_sets compound index:', e.message);
    }
  }
};
