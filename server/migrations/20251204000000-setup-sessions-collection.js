module.exports = {
  async up(db, client) {
    // Create sessions collection with proper TTL index for automatic cleanup
    const collectionsInDb = await db.listCollections().toArray();
    const collectionsNames = collectionsInDb.map(col => col.name);

    if (!collectionsNames.includes('sessions')) {
      console.log('Creating sessions collection...');
      await db.createCollection('sessions');
    }

    // Create indexes for sessions collection
    const sessionsCollection = db.collection('sessions');

    // TTL index to automatically delete expired sessions after 24 hours
    // The expireAfterSeconds is set to match the session maxAge (24 hours = 86400 seconds)
    try {
      await sessionsCollection.createIndex(
        { 'createdAt': 1 },
        { expireAfterSeconds: 86400, name: 'sessions_ttl_index' }
      );
      console.log('Created TTL index on sessions collection');
    } catch (err) {
      if (err.codeName === 'IndexOptionsConflict') {
        console.log('TTL index already exists with same settings');
      } else {
        throw err;
      }
    }

    // Index on session ID for faster lookups
    try {
      await sessionsCollection.createIndex(
        { '_id': 1 },
        { name: 'sessions_id_index' }
      );
      console.log('Created ID index on sessions collection');
    } catch (err) {
      if (err.codeName === 'IndexAlreadyExists') {
        console.log('ID index already exists');
      } else {
        throw err;
      }
    }

    console.log('Sessions collection setup completed');
  },

  async down(db, client) {
    // Drop the sessions collection if rolling back
    const collectionsInDb = await db.listCollections().toArray();
    const collectionsNames = collectionsInDb.map(col => col.name);

    if (collectionsNames.includes('sessions')) {
      console.log('Dropping sessions collection...');
      await db.collection('sessions').drop();
      console.log('Sessions collection dropped');
    }
  }
};
