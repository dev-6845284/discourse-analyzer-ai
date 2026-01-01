/**
 * Migration: Add translations field to audit categories
 *
 * This migration adds a `translations` object to all existing category documents
 * in the `auditCategories` collection. This allows for storing localized
 * titles, descriptions, and prompt guidance.
 *
 * Default value: {} (empty map)
 */

module.exports = {
    async up(db, client) {
        const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
        const collection = db.collection(collectionName);

        // Update all documents that don't satisfy the condition (missing translations field)
        const result = await collection.updateMany(
            { translations: { $exists: false } },
            { $set: { translations: {}, updatedAt: new Date() } }
        );

        console.log(`Added 'translations' field to ${result.modifiedCount} categories in ${collectionName}.`);
    },

    async down(db, client) {
        const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
        const collection = db.collection(collectionName);

        // Remove the translations field
        await collection.updateMany(
            {},
            { $unset: { translations: "" }, $set: { updatedAt: new Date() } }
        );

        console.log(`Removed 'translations' field from categories in ${collectionName}.`);
    }
};
