import ApiKeySet from '../models/ApiKeySet';
import UserApiKeySet from '../models/UserApiKeySet';
import { maybeEncrypt, maybeDecrypt } from '../utils/crypto';
import mongoose from 'mongoose';

// Helper: Return sanitized keyset for API responses (no actual key values)
const sanitizeKeyset = (doc: any) => {
  if (!doc) return null;
  return {
    _id: doc._id,
    alias: doc.alias,
    has_GEMINI_API_KEY: !!doc.GEMINI_API_KEY,
    has_GROK_API_KEY: !!doc.GROK_API_KEY,
    has_CHATGPT_API_KEY: !!doc.CHATGPT_API_KEY,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
  };
};

// Helper: Return keyset with decrypted values for internal server use
const decryptKeyset = (doc: any) => {
  if (!doc) return null;
  return {
    ...doc,
    GEMINI_API_KEY: maybeDecrypt(doc.GEMINI_API_KEY),
    GROK_API_KEY: maybeDecrypt(doc.GROK_API_KEY),
    CHATGPT_API_KEY: maybeDecrypt(doc.CHATGPT_API_KEY),
  };
};

export async function createApiKeySet(data: { alias: string; GEMINI_API_KEY?: string | null; GROK_API_KEY?: string | null; CHATGPT_API_KEY?: string | null; createdBy?: string }) {
  const doc = new ApiKeySet({
    alias: data.alias,
    GEMINI_API_KEY: maybeEncrypt(data.GEMINI_API_KEY ?? null),
    GROK_API_KEY: maybeEncrypt(data.GROK_API_KEY ?? null),
    CHATGPT_API_KEY: maybeEncrypt(data.CHATGPT_API_KEY ?? null),
    createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : null,
  });
  await doc.save();
  return doc.toObject();
}

// Internal: Get keyset with decrypted values for server-side use
export async function getApiKeySetByAliasAndCreator_Internal(alias: string, createdBy: string | null) {
  const query: any = { alias };
  if (createdBy === null) {
    query.createdBy = null;
  } else if (mongoose.isValidObjectId(createdBy)) {
    query.createdBy = new mongoose.Types.ObjectId(createdBy);
  } else {
    console.warn(`getApiKeySetByAliasAndCreator_Internal: received non-ObjectId createdBy='${createdBy}', falling back to null`);
    query.createdBy = null;
  }
  const d: any = await ApiKeySet.findOne(query).lean();
  return decryptKeyset(d);
}

// Keep old name for backward compatibility
export async function getApiKeySetByAliasAndCreator(alias: string, createdBy: string | null) {
  return getApiKeySetByAliasAndCreator_Internal(alias, createdBy);
}

export async function upsertUserKeyset(userId: string, keys: Partial<{ GEMINI_API_KEY?: string | null; GROK_API_KEY?: string | null; CHATGPT_API_KEY?: string | null }>) {
  // Ensure single USERS_KEYSET per user: use alias 'USERS_KEYSET' and createdBy=userId
  const alias = process.env.USERS_KEYSET_ALIAS || 'USERS_KEYSET';
  let existing: any = null;
  try {
      if (mongoose.isValidObjectId(userId)) {
        existing = await ApiKeySet.findOne({ alias, createdBy: new mongoose.Types.ObjectId(userId) });
      } else {
        // Non-ObjectId userId (e.g. 'local' in dev). Avoid constructing ObjectId which throws.
        console.warn(`upsertUserKeyset: received non-ObjectId userId='${userId}', treating createdBy as null`);
        existing = await ApiKeySet.findOne({ alias, createdBy: null });
      }
  } catch (err: any) {
      console.error('MongoDB error while finding user keyset:', err);
      throw err;
  }
  const payload: any = {};
  if (keys.GEMINI_API_KEY !== undefined) payload.GEMINI_API_KEY = maybeEncrypt(keys.GEMINI_API_KEY ?? null);
  if (keys.GROK_API_KEY !== undefined) payload.GROK_API_KEY = maybeEncrypt(keys.GROK_API_KEY ?? null);
  if (keys.CHATGPT_API_KEY !== undefined) payload.CHATGPT_API_KEY = maybeEncrypt(keys.CHATGPT_API_KEY ?? null);

  if (existing) {
    await ApiKeySet.updateOne({ _id: existing._id }, { $set: payload });
    const d: any = await ApiKeySet.findById(existing._id).lean();
    return decryptKeyset(d);
  }

  const created = new ApiKeySet({ alias, createdBy: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null, ...payload });
  await created.save();
  return decryptKeyset(created.toObject());
}

// Public: List keysets for API (sanitized, no actual keys)
export async function listApiKeySets_Public() {
  const docs = await ApiKeySet.find().sort({ alias: 1 }).lean();
  return docs.map(sanitizeKeyset);
}

// Internal: List keysets with decrypted values for server use
export async function listApiKeySets_Internal() {
  const docs = await ApiKeySet.find().sort({ alias: 1 }).lean();
  return docs.map(decryptKeyset);
}

// Keep old name, delegates to internal version
export async function listApiKeySets() {
  return listApiKeySets_Internal();
}

// Public: Get keyset for API (sanitized, no actual keys)
export async function getApiKeySetById_Public(id: string) {
  const d: any = await ApiKeySet.findById(id).lean();
  return sanitizeKeyset(d);
}

// Internal: Get keyset with decrypted values for server use
export async function getApiKeySetById_Internal(id: string) {
  const d: any = await ApiKeySet.findById(id).lean();
  return decryptKeyset(d);
}

// Keep old name, delegates to internal version
export async function getApiKeySetById(id: string) {
  return getApiKeySetById_Internal(id);
}

export async function updateApiKeySet(id: string, updates: Partial<{ alias: string; GEMINI_API_KEY?: string | null; GROK_API_KEY?: string | null; CHATGPT_API_KEY?: string | null; updatedBy?: string }>) {
  const set: any = {};
  if (updates.alias !== undefined) set.alias = updates.alias;
  if (updates.GEMINI_API_KEY !== undefined) set.GEMINI_API_KEY = maybeEncrypt(updates.GEMINI_API_KEY ?? null);
  if (updates.GROK_API_KEY !== undefined) set.GROK_API_KEY = maybeEncrypt(updates.GROK_API_KEY ?? null);
  if (updates.CHATGPT_API_KEY !== undefined) set.CHATGPT_API_KEY = maybeEncrypt(updates.CHATGPT_API_KEY ?? null);
  if (updates.updatedBy) set.updatedBy = new mongoose.Types.ObjectId(updates.updatedBy);

  const doc = await ApiKeySet.findByIdAndUpdate(id, set, { new: true }).lean();
  if (!doc) return null;
  return decryptKeyset(doc);
}

export async function deleteApiKeySet(id: string) {
  // Remove assignments first
  await UserApiKeySet.deleteMany({ apiKeySetId: id });
  return ApiKeySet.findByIdAndDelete(id);
}

export async function assignKeySetToUser(apiKeySetId: string, userId: string, assignedBy?: string, role?: string) {
  const doc = new UserApiKeySet({
    apiKeySetId: new mongoose.Types.ObjectId(apiKeySetId),
    userId: new mongoose.Types.ObjectId(userId),
    assignedAt: new Date(),
    assignedBy: assignedBy ? new mongoose.Types.ObjectId(assignedBy) : undefined,
    role,
  });
  await doc.save();
  return doc.toObject();
}

export async function unassignKeySetFromUser(apiKeySetId: string, userId: string) {
  return UserApiKeySet.deleteOne({ apiKeySetId, userId });
}

export async function listAssignmentsForUser(userId: string) {
  return UserApiKeySet.find({ userId }).lean();
}

export async function listUsersForKeySet(apiKeySetId: string) {
  return UserApiKeySet.find({ apiKeySetId }).lean();
}

export default {
  createApiKeySet,
  listApiKeySets,
  listApiKeySets_Internal,
  listApiKeySets_Public,
  getApiKeySetById,
  getApiKeySetById_Internal,
  getApiKeySetById_Public,
  getApiKeySetByAliasAndCreator,
  getApiKeySetByAliasAndCreator_Internal,
  updateApiKeySet,
  deleteApiKeySet,
  assignKeySetToUser,
  unassignKeySetFromUser,
  listAssignmentsForUser,
  listUsersForKeySet,
};
