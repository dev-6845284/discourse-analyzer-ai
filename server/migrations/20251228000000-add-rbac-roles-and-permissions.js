/* eslint-disable no-unused-vars */
module.exports = {
  async up(db, client) {
    // 1) Ensure all users have a role (default to 'viewer')
    await db.collection('users').updateMany({ $or: [{ role: null }, { role: { $exists: false } }] }, { $set: { role: 'viewer' } });

    // 2) We rely on the application startup to register and seed endpoints using programmatic defaults.
    //    To avoid duplicated/hard-coded maps in migration code, we only ensure the collection exists.
    try {
      await db.createCollection('api_permissions');
    } catch (e) {
      // collection may already exist - ignore
    }
  },

  async down(db, client) {
    // Simplified revert: delete all permissions to fully revert this migration
    await db.collection('api_permissions').deleteMany({});

    // NOTE: Do not attempt to revert user role changes (could be destructive)
  }
};
