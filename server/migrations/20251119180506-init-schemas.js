module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const peopleCollection = `people${suffix}`;
    const quotesCollection = `quotes${suffix}`;

    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes(peopleCollection)) {
      await db.createCollection(peopleCollection);
    }
    if (!collectionNames.includes(quotesCollection)) {
      await db.createCollection(quotesCollection);
    }

    // Indexes for People
    await db.collection(peopleCollection).createIndex({ name: 1 });
    await db.collection(peopleCollection).createIndex({ aliases: 1 });
    await db.collection(peopleCollection).createIndex(
      { name: 'text', aliases: 'text', description: 'text' },
      { name: 'PersonTextIndex' }
    );

    // Indexes for Quotes
    await db.collection(quotesCollection).createIndex({ person: 1 });
    await db.collection(quotesCollection).createIndex({ tags: 1 });
    await db.collection(quotesCollection).createIndex(
      { text: 'text', context: 'text', tags: 'text' },
      { name: 'QuoteTextIndex' }
    );
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const peopleCollection = `people${suffix}`;
    const quotesCollection = `quotes${suffix}`;

    try {
      await db.collection(peopleCollection).dropIndex('name_1');
      await db.collection(peopleCollection).dropIndex('aliases_1');
      await db.collection(peopleCollection).dropIndex('PersonTextIndex');
      
      await db.collection(quotesCollection).dropIndex('person_1');
      await db.collection(quotesCollection).dropIndex('tags_1');
      await db.collection(quotesCollection).dropIndex('QuoteTextIndex');
    } catch (e) {
      console.warn("Error dropping indexes:", e.message);
    }
  }
};
