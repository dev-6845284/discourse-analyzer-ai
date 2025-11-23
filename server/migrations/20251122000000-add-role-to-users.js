module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const usersCollection = `users${suffix}`;

    // Update all users that don't have a role to have the default role 'viewer'
    await db.collection(usersCollection).updateMany(
      { role: { $exists: false } },
      { $set: { role: 'viewer' } }
    );
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const usersCollection = `users${suffix}`;

    // Remove the role field from all users
    await db.collection(usersCollection).updateMany(
      {},
      { $unset: { role: "" } }
    );
  }
};
