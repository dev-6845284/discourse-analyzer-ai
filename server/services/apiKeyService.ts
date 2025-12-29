import ApiKeySet from '../models/ApiKeySet';
import UserApiKeySet from '../models/UserApiKeySet';
import { maybeEncrypt, maybeDecrypt } from '../utils/crypto';
import mongoose from 'mongoose';

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

export async function getApiKeySetByAliasAndCreator(alias: string, createdBy: string | null) {
  const query: any = { alias };
  if (createdBy === null) {
    query.createdBy = null;
  } else if (mongoose.isValidObjectId(createdBy)) {
    query.createdBy = new mongoose.Types.ObjectId(createdBy);
  } else {
    // Non-ObjectId creator (e.g. 'local' during dev). Treat as null to avoid BSON errors.
    console.warn(`getApiKeySetByAliasAndCreator: received non-ObjectId createdBy='${createdBy}', falling back to null`);
    query.createdBy = null;
  }
  const d: any = await ApiKeySet.findOne(query).lean();
  if (!d) return null;
  return {
    ...d,
    GEMINI_API_KEY: maybeDecrypt(d.GEMINI_API_KEY),
    GROK_API_KEY: maybeDecrypt(d.GROK_API_KEY),
    CHATGPT_API_KEY: maybeDecrypt(d.CHATGPT_API_KEY),
  };
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
    return {
      ...d,
      GEMINI_API_KEY: maybeDecrypt(d.GEMINI_API_KEY),
      GROK_API_KEY: maybeDecrypt(d.GROK_API_KEY),
      CHATGPT_API_KEY: maybeDecrypt(d.CHATGPT_API_KEY),
    };
  }

  const created = new ApiKeySet({ alias, createdBy: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null, ...payload });
  await created.save();
  const d: any = created.toObject();
  return {
    ...d,
    GEMINI_API_KEY: maybeDecrypt(d.GEMINI_API_KEY),
    GROK_API_KEY: maybeDecrypt(d.GROK_API_KEY),
    CHATGPT_API_KEY: maybeDecrypt(d.CHATGPT_API_KEY),
  };
}

export async function listApiKeySets() {
  const docs = await ApiKeySet.find().sort({ alias: 1 }).lean();
  return docs.map((d: any) => ({
    ...d,
    GEMINI_API_KEY: maybeDecrypt(d.GEMINI_API_KEY),
    GROK_API_KEY: maybeDecrypt(d.GROK_API_KEY),
    CHATGPT_API_KEY: maybeDecrypt(d.CHATGPT_API_KEY),
  }));
}

export async function getApiKeySetById(id: string) {
  const d: any = await ApiKeySet.findById(id).lean();
  if (!d) return null;
  return {
    ...d,
    GEMINI_API_KEY: maybeDecrypt(d.GEMINI_API_KEY),
    GROK_API_KEY: maybeDecrypt(d.GROK_API_KEY),
    CHATGPT_API_KEY: maybeDecrypt(d.CHATGPT_API_KEY),
  };
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
  return {
    ...doc,
    GEMINI_API_KEY: maybeDecrypt((doc as any).GEMINI_API_KEY),
    GROK_API_KEY: maybeDecrypt((doc as any).GROK_API_KEY),
    CHATGPT_API_KEY: maybeDecrypt((doc as any).CHATGPT_API_KEY),
  };
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
  getApiKeySetById,
  updateApiKeySet,
  deleteApiKeySet,
  assignKeySetToUser,
  unassignKeySetFromUser,
  listAssignmentsForUser,
  listUsersForKeySet,
};
