import { AUDIT_CATEGORIES, CategoryDefinition } from '../config/auditCategories';
import { Db } from 'mongodb';

let cachedCategories: CategoryDefinition[] = AUDIT_CATEGORIES.slice();
let initializedFromDb = false;

export function getCategoriesForMode(mode: 'audit' | 'flaws'): CategoryDefinition[] {
  return cachedCategories.filter(c => c.modes.includes(mode)).sort((a, b) => (a.uiOrder || 0) - (b.uiOrder || 0));
}

export function getAllCategories(): CategoryDefinition[] {
  return cachedCategories.slice();
}

/**
 * Returns a simplified version of categories for frontend translation and UI use.
 * Excludes heavy text fields like description and promptGuidance.
 */
export function getSimpleCategories(): Partial<CategoryDefinition>[] {
  return cachedCategories.map(c => ({
    id: c.id,
    title: c.title,
    modes: c.modes,
    uiOrder: c.uiOrder,
    translations: c.translations ? Object.fromEntries(
      Object.entries(c.translations).map(([lang, tr]) => [
        lang,
        { title: tr.title }
      ])
    ) : undefined,
    legacyNames: c.legacyNames,
  }));
}

/**
 * Load categories from MongoDB `auditCategories` collection. If the collection
 * is empty or any error occurs, fall back to the in-code AUDIT_CATEGORIES.
 * This function is idempotent and safe to call multiple times.
 */
export async function loadCategoriesFromDb(db?: Db): Promise<void> {
  if (initializedFromDb) return;

  if (!db) {
    console.warn('No db provided to loadCategoriesFromDb; using in-memory defaults');
    return;
  }

  try {
    const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
    const coll = db.collection(collectionName);
    const docs = await coll.find({}).toArray();

    if (Array.isArray(docs) && docs.length > 0) {
      // Normalize docs to CategoryDefinition shape where possible
      const mapped = docs.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description || d.promptGuidance || '',
        promptGuidance: d.promptGuidance || d.description || '',
        modes: d.modes || ['audit'],
        legacyNames: d.legacyNames || [],
        uiOrder: d.uiOrder || 0,
        translations: d.translations || {},
      } as CategoryDefinition));

      cachedCategories = mapped.sort((a, b) => (a.uiOrder || 0) - (b.uiOrder || 0));
      initializedFromDb = true;
      console.log(`Loaded ${cachedCategories.length} audit categories from DB (${collectionName}).`);
    } else {
      console.log(`No categories found in DB; using default in-code categories.`);
    }
  } catch (e) {
    console.error('Failed to load categories from DB; using defaults. Error:', (e as Error).message);
  }
}

export function resetToDefaultsForTests() {
  cachedCategories = AUDIT_CATEGORIES.slice();
  initializedFromDb = false;
}

// Create, update, delete and reload helpers
import mongoose from 'mongoose';

export async function createCategory(cat: Partial<CategoryDefinition>): Promise<CategoryDefinition> {
  if (!cat.id || !cat.title) throw new Error('id and title are required');

  const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
  const db = mongoose.connection.db as any;
  const coll = db.collection(collectionName);

  // Ensure uniqueness of id and title
  const existing = await coll.findOne({ $or: [{ id: cat.id }, { title: cat.title }] });
  if (existing) throw new Error('Category with same id or title already exists');

  const doc = {
    id: cat.id,
    title: cat.title,
    description: cat.description || '',
    promptGuidance: cat.promptGuidance || cat.description || '',
    modes: cat.modes || ['audit'],
    uiOrder: cat.uiOrder || 0,
    legacyNames: cat.legacyNames || [],
    translations: cat.translations || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await coll.insertOne(doc);
  // Refresh cache
  initializedFromDb = false;
  await loadCategoriesFromDb(db);
  return doc as CategoryDefinition;
}

/**
 * Update a category document in the database with a partial patch.
 *
 * This function:
 * - Locates the category by its `id` in the collection named `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`.
 * - Rejects any patch that attempts to change the category `id`.
 * - Applies only an allow-listed subset of fields from the provided `patch` (title, description, promptGuidance, modes, legacyNames, uiOrder).
 * - Always updates the `updatedAt` timestamp to the current time.
 * - Uses a single atomic find-and-update operation and attempts to read the updated document in a way compatible with both older and newer MongoDB driver option names.
 * - After a successful update, resets `initializedFromDb` and reloads categories via `loadCategoriesFromDb(db)` to refresh in-memory state.
 *
 * Note: Fields not present in `patch` are left unchanged. The function performs its work against the active Mongoose connection's database.
 *
 * @param id - The identifier of the category to update.
 * @param patch - Partial set of category properties to apply; must not contain `id`.
 * @returns A promise that resolves to the updated CategoryDefinition.
 * @throws Error If `patch.id` is provided (id changes are not allowed) or if no category with the given `id` is found.
 * @remarks This function has the side effects of mutating the persistent store and triggering an in-memory reload of category definitions.
 */
export async function updateCategory(id: string, patch: Partial<CategoryDefinition>): Promise<CategoryDefinition> {
  const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
  const db = mongoose.connection.db as any;
  const coll = db.collection(collectionName);

  if ((patch as any).id !== undefined) throw new Error('Cannot change category id');

  const updateDoc: any = { $set: { updatedAt: new Date() } };
  const allowed = ['title', 'description', 'promptGuidance', 'modes', 'legacyNames', 'uiOrder', 'translations'];
  for (const key of allowed) {
    if ((patch as any)[key] !== undefined) {
      (updateDoc.$set as any)[key] = (patch as any)[key];
    }
  }

  // Support both old and new driver options and read the returned document reliably.
  const res = await coll.findOneAndUpdate({ id }, updateDoc, { returnDocument: 'after' as any, returnOriginal: false } as any);
  // Support different driver/mocking shapes: some drivers return { value: doc },
  // while tests/mocks may return the doc directly. Normalize both cases.
  let updatedDoc: any = null;
  if (res && typeof res === 'object') {
    if ((res as any).value !== undefined) {
      updatedDoc = (res as any).value;
    } else if ((res as any).id !== undefined || (res as any)._id !== undefined) {
      // Looks like the document itself was returned
      updatedDoc = res;
    }
  }
  if (!updatedDoc) throw new Error('Category not found');

  initializedFromDb = false;
  await loadCategoriesFromDb(db);

  return updatedDoc as CategoryDefinition;
}

export async function deleteCategory(id: string): Promise<void> {
  const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
  const db = mongoose.connection.db as any;
  const coll = db.collection(collectionName);

  await coll.deleteOne({ id });
  initializedFromDb = false;
  await loadCategoriesFromDb(db);
}

export async function reload(): Promise<void> {
  const db = mongoose.connection.db as any;
  initializedFromDb = false;
  await loadCategoriesFromDb(db);
}
