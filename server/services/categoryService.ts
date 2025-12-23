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
        severityDefault: d.severityDefault || 'NONE',
        legacyNames: d.legacyNames || [],
        uiOrder: d.uiOrder || 0,
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
    severityDefault: cat.severityDefault || 'NONE',
    legacyNames: cat.legacyNames || [],
    uiOrder: cat.uiOrder || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await coll.insertOne(doc);
  // Refresh cache
  initializedFromDb = false;
  await loadCategoriesFromDb(db);
  return doc as CategoryDefinition;
}

export async function updateCategory(id: string, patch: Partial<CategoryDefinition>): Promise<CategoryDefinition> {
  const collectionName = `auditCategories${process.env.DB_COLLECTION_SUFFIX || ''}`;
  const db = mongoose.connection.db as any;
  const coll = db.collection(collectionName);

  const updateDoc: any = { $set: { updatedAt: new Date() } };
  const allowed = ['title','description','promptGuidance','modes','severityDefault','legacyNames','uiOrder'];
  for (const key of allowed) {
    if ((patch as any)[key] !== undefined) (updateDoc.$set as any)[key] = (patch as any)[key];
  }

  const res = await coll.findOneAndUpdate({ id }, updateDoc, { returnDocument: 'after' as any });
  if (!res || !res.value) throw new Error('Category not found');

  initializedFromDb = false;
  await loadCategoriesFromDb(db);

  return res.value as CategoryDefinition;
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
