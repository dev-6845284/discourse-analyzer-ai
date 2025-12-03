module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const collectionName = `analysissessions${suffix}`;

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes(collectionName)) {
      await db.createCollection(collectionName);
    }

    // Index for fetching user sessions sorted by date
    await db.collection(collectionName).createIndex({ userId: 1, updatedAt: -1 });
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const collectionName = `analysissessions${suffix}`;

    try {
      // Drop the collection if we want to be destructive, or just drop indexes
      // Usually down migrations reverse the up migration.
      // Dropping the collection might be too aggressive if we want to keep data, 
      // but strictly speaking it reverses the creation.
      // However, looking at the user migration example, it only dropped the index.
      // But that migration had a check `if (!collectionNames.includes(usersCollection))`.
      // If I created the collection, I should probably drop it or at least the index.
      
      // Let's just drop the index to be safe and consistent with the user migration example provided.
      await db.collection(collectionName).dropIndex('userId_1_updatedAt_-1');
    } catch (e) {
      console.warn("Error dropping index:", e.message);
    }
  }
};
