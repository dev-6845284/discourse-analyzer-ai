import ApiKeySet from '../models/ApiKeySet';
import UserApiKeySet from '../models/UserApiKeySet';
import { maybeEncrypt, maybeDecrypt } from '../utils/crypto';
import mongoose from 'mongoose';

// --- Simple Cache Implementation ---
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  constructor(private ttlMs: number) { }
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }
  set(key: string, value: T) {
    this.cache.set(key, { value, expires: Date.now() + this.ttlMs });
  }
  delete(key: string) {
    this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
}

// Cache keyset documents (decrypted) by ID or Alias/Creator
const keysetCache = new SimpleCache<any>(1000 * 60 * 5); // 5 minutes
// Cache user effective inputs (userId -> { gemini: '...', ... })
const userEffectiveKeyCache = new SimpleCache<Record<string, string>>(1000 * 60 * 2); // 2 minutes

function getUserCacheKey(userId: string) {
  return `user-effective-keys:${userId}`;
}

function invalidateUserCache(userId: string) {
  userEffectiveKeyCache.delete(getUserCacheKey(userId));
}

// For testing purposes
export function resetCaches() {
  keysetCache.clear();
  userEffectiveKeyCache.clear();
}

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

// --- Core Logic: Effective API Key Resolution ---

export async function getEffectiveApiKeyForUser(userId: string, provider: 'gemini' | 'openai' | 'grok'): Promise<string> {
  if (!userId) {
    throw new Error(`Authentication required to access ${provider} API.`);
  }

  const cacheKey = getUserCacheKey(userId);
  const cached = userEffectiveKeyCache.get(cacheKey);
  if (cached && cached[provider]) {
    return cached[provider];
  }

  // 1. Try User Personal Keyset (alias=USERS_KEYSET, createdBy=userId)
  const usersKeysetAlias = process.env.USERS_KEYSET_ALIAS || 'USERS_KEYSET';
  // Use _Internal to get decrypted keys
  let personalKeyset: any = null;

  if (mongoose.isValidObjectId(userId)) {
    const doc = await ApiKeySet.findOne({ alias: usersKeysetAlias, createdBy: new mongoose.Types.ObjectId(userId) }).lean();
    personalKeyset = decryptKeyset(doc);
  }

  // internal mapping of provider to DB field
  const fieldMap: Record<string, string> = {
    'gemini': 'GEMINI_API_KEY',
    'openai': 'CHATGPT_API_KEY', // OpenAI provider is backed by CHATGPT_API_KEY DB field for compatibility
    'grok': 'GROK_API_KEY'
  };
  const dbField = fieldMap[provider];

  if (personalKeyset && personalKeyset[dbField]) {
    // Cache result
    const newCache = cached || {};
    newCache[provider] = personalKeyset[dbField];
    userEffectiveKeyCache.set(cacheKey, newCache);
    return personalKeyset[dbField];
  }

  // 2. Try Assigned Shared Keyset
  // Find assignments for this user
  const assignments = await UserApiKeySet.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ assignedAt: -1 }).lean();

  for (const assignment of assignments) {
    const keysetDoc = await ApiKeySet.findById(assignment.apiKeySetId).lean();
    const keyset = decryptKeyset(keysetDoc);
    if (keyset && keyset[dbField]) {
      // Cache result
      const newCache = cached || {};
      newCache[provider] = keyset[dbField];
      userEffectiveKeyCache.set(cacheKey, newCache);
      return keyset[dbField];
    }
  }

  // 3. No fallback to process.env allowed. Throw Error.
  throw new Error(`No API key configured for ${provider}. Please add a key in Settings -> API Keys or ask an admin to assign one.`);
}

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

// Keep old name for backward compatibility, but now SAFE (Sanitized)
export async function getApiKeySetByAliasAndCreator(alias: string, createdBy: string | null) {
  const d = await getApiKeySetByAliasAndCreator_Internal(alias, createdBy);
  return sanitizeKeyset(d);
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

  invalidateUserCache(userId); // Invalidate cache on update

  if (existing) {
    await ApiKeySet.updateOne({ _id: existing._id }, { $set: payload });
    const d: any = await ApiKeySet.findById(existing._id).lean();
    return sanitizeKeyset(d);
  }

  const created = new ApiKeySet({ alias, createdBy: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null, ...payload });
  await created.save();
  return sanitizeKeyset(created.toObject());
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

  // We should invalidate cache for all users assigned to this keyset
  // This is expensive to find all users, but for correctness we should do it or clear entire cache.
  // For now, simpler approach: verify if we can efficiently find users.
  const assignments = await UserApiKeySet.find({ apiKeySetId: new mongoose.Types.ObjectId(id) }).select('userId').lean();
  assignments.forEach((a: any) => invalidateUserCache(a.userId.toString()));

  const doc = await ApiKeySet.findByIdAndUpdate(id, set, { new: true }).lean();
  if (!doc) return null;
  return decryptKeyset(doc);
}

export async function deleteApiKeySet(id: string) {
  // Remove assignments first
  const assignments = await UserApiKeySet.find({ apiKeySetId: new mongoose.Types.ObjectId(id) }).select('userId').lean();
  assignments.forEach((a: any) => invalidateUserCache(a.userId.toString()));

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
  invalidateUserCache(userId);
  return doc.toObject();
}

export async function unassignKeySetFromUser(apiKeySetId: string, userId: string) {
  const result = await UserApiKeySet.deleteOne({ apiKeySetId, userId });
  invalidateUserCache(userId);
  return result;
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
  getEffectiveApiKeyForUser, // Export new function
};
