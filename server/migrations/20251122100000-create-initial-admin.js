const bcrypt = require('bcrypt');

module.exports = {
  async up(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const usersCollection = `users${suffix}`;
    
    // Create initial admin user
    // Password should be changed immediately
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.collection(usersCollection).insertOne({
      alias: 'Admin',
      email: 'admin@example.com', // To be updated manually
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async down(db, client) {
    const suffix = process.env.DB_COLLECTION_SUFFIX || '';
    const usersCollection = `users${suffix}`;
    
    await db.collection(usersCollection).deleteOne({ email: 'admin@example.com' });
  }
};
