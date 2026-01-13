module.exports = {
    async up(db, client) {
        const suffix = process.env.DB_COLLECTION_SUFFIX || '';
        // Set default visibility to 'private' for all quotes that don't have it
        await db.collection(`quotes${suffix}`).updateMany(
            { visibility: { $exists: false } },
            { $set: { visibility: 'private' } }
        );
    },

    async down(db, client) {
        const suffix = process.env.DB_COLLECTION_SUFFIX || '';
        await db.collection(`quotes${suffix}`).updateMany(
            {},
            { $unset: { visibility: "" } }
        );
    }
};
