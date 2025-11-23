module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const usersCollection = `users${suffix}`;

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes(usersCollection)) {
      await db.createCollection(usersCollection);
    }

    await db.collection(usersCollection).createIndex({ email: 1 }, { unique: true });
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const usersCollection = `users${suffix}`;

    try {
      await db.collection(usersCollection).dropIndex('email_1');
    } catch (e) {
      console.warn("Error dropping index:", e.message);
    }
  }
};
