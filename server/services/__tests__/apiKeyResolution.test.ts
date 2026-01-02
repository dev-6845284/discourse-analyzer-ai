import { getEffectiveApiKeyForUser, upsertUserKeyset, createApiKeySet, assignKeySetToUser, unassignKeySetFromUser, resetCaches } from '../apiKeyService';
import ApiKeySet from '../../models/ApiKeySet';
import UserApiKeySet from '../../models/UserApiKeySet';
import mongoose from 'mongoose';

// Setup Mocks
// Ensure TS treats these as mocks
const MockApiKeySet = ApiKeySet as unknown as jest.Mock & { findOne: jest.Mock, findById: jest.Mock, deleteMany: jest.Mock, updateOne: jest.Mock, findByIdAndUpdate: jest.Mock, find: jest.Mock };
const MockUserApiKeySet = UserApiKeySet as unknown as jest.Mock & { find: jest.Mock, deleteOne: jest.Mock, deleteMany: jest.Mock };

// Helper to create a mock Mongoose Query/Document
const mockDoc = (data: any) => {
    if (!data) return { lean: jest.fn().mockResolvedValue(null) }; // handle null
    return {
        ...data,
        lean: jest.fn().mockResolvedValue(data),
        toObject: () => data,
        save: jest.fn().mockResolvedValue(data)
    };
};

// Helper for find() chain
const mockFind = (dataList: any[]) => {
    return {
        sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(dataList)
        }),
        lean: jest.fn().mockResolvedValue(dataList)
    };
};

describe('API Key Resolution', () => {
    const validId = '507f1f77bcf86cd799439011';
    const otherId = '507f1f77bcf86cd799439012';
    const keysetId1 = '507f1f77bcf86cd799439013';
    const keysetId2 = '507f1f77bcf86cd799439014';

    beforeEach(() => {
        jest.clearAllMocks();
        resetCaches();

        // Mock Model Static Methods
        MockApiKeySet.findOne = jest.fn();
        MockApiKeySet.findById = jest.fn();
        MockApiKeySet.deleteMany = jest.fn();
        MockApiKeySet.updateOne = jest.fn();
        MockApiKeySet.findByIdAndUpdate = jest.fn();
        MockApiKeySet.find = jest.fn(); // used for listing, maybe not needed here

        MockUserApiKeySet.find = jest.fn();
        MockUserApiKeySet.deleteOne = jest.fn();
        MockUserApiKeySet.deleteMany = jest.fn();

        // Default: UserApiKeySet.find returns empty array
        MockUserApiKeySet.find.mockReturnValue(mockFind([]));

        // Mock Model Constructor
        // When new ApiKeySet(data) is called, return a doc-like object
        (ApiKeySet as unknown as jest.Mock).mockImplementation((data) => {
            // For save(), we need to return something that has toObject?
            const d = { ...data, _id: validId };
            return mockDoc(d);
        });

        (UserApiKeySet as unknown as jest.Mock).mockImplementation((data) => {
            return mockDoc(data);
        });
    });

    it('should throw error if no keys configured and no assignments', async () => {
        // Mock User Personal Keyset not found
        MockApiKeySet.findOne.mockReturnValue(mockDoc(null));

        await expect(getEffectiveApiKeyForUser(validId, 'gemini'))
            .rejects.toThrow(/No API key configured/);
    });

    it('should use User Personal Keyset if exists', async () => {
        // Mock User Personal Keyset found
        const personalKeyData = { _id: validId, alias: 'USERS_KEYSET', GEMINI_API_KEY: 'user-gemini-key' };
        // upsertUserKeyset implementation calls findOne twice usually (check existing, then update).
        // getEffective calls findOne once.
        // We set default return for findOne to be the personal key
        MockApiKeySet.findOne.mockReturnValue(mockDoc(personalKeyData));

        const key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('user-gemini-key');
    });

    it('should use Assigned Shared Keyset if no personal key', async () => {
        // Personal keyset not found
        MockApiKeySet.findOne.mockReturnValue(mockDoc(null));

        // Assignments found
        MockUserApiKeySet.find.mockReturnValue(mockFind([{ apiKeySetId: otherId }]));

        // Keyset lookup
        const sharedKeyData = { _id: otherId, GEMINI_API_KEY: 'shared-gemini-key' };
        MockApiKeySet.findById.mockReturnValue(mockDoc(sharedKeyData));

        const key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('shared-gemini-key');
    });

    it('should prioritize User Personal Keyset over Assigned Shared Keyset', async () => {
        // Personal keyset found
        const personalKeyData = { _id: validId, GEMINI_API_KEY: 'personal-gemini-key' };
        MockApiKeySet.findOne.mockReturnValue(mockDoc(personalKeyData));

        const key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('personal-gemini-key');
    });

    it('should handle missing key in personal keyset by falling back to shared', async () => {
        // Personal keyset exists but GEMINI in doc is null/undefined
        // Use 'null' for key to simulate explicit null or missing
        const personalKeyData = { _id: validId, GEMINI_API_KEY: null, GROK_API_KEY: 'personal-grok-key' };
        MockApiKeySet.findOne.mockReturnValue(mockDoc(personalKeyData));

        // Assignments found
        MockUserApiKeySet.find.mockReturnValue(mockFind([{ apiKeySetId: otherId }]));

        // Shared keyset has GEMINI
        const sharedKeyData = { _id: otherId, GEMINI_API_KEY: 'shared-gemini-key' };
        MockApiKeySet.findById.mockReturnValue(mockDoc(sharedKeyData));

        const key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('shared-gemini-key');

        const grokKey = await getEffectiveApiKeyForUser(validId, 'grok');
        expect(grokKey).toBe('personal-grok-key');
    });

    it('should fallback to most recently assigned shared keyset if multiple', async () => {
        // Personal keyset not found
        MockApiKeySet.findOne.mockReturnValue(mockDoc(null));

        // Multiple assignments. First in list (most recent) should be checked first.
        MockUserApiKeySet.find.mockReturnValue(mockFind([
            { apiKeySetId: keysetId2 },
            { apiKeySetId: keysetId1 }
        ]));

        // Keyset lookups
        MockApiKeySet.findById.mockImplementation((id) => {
            if (id.toString() === keysetId2) return mockDoc({ _id: keysetId2, GEMINI_API_KEY: 'key2' });
            if (id.toString() === keysetId1) return mockDoc({ _id: keysetId1, GEMINI_API_KEY: 'key1' });
            return mockDoc(null);
        });

        const key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('key2');
    });

    it('should use cache and invalidate it on value update', async () => {
        // 1. Initial State: User has key-v1
        const v1Data = { _id: validId, alias: 'USERS_KEYSET', GEMINI_API_KEY: 'key-v1' };
        MockApiKeySet.findOne.mockReturnValue(mockDoc(v1Data));

        let key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('key-v1');

        // 2. Change DB "State" (Mock return) -> v2
        // But invalidation hasn't happened yet.
        const v2Data = { _id: validId, alias: 'USERS_KEYSET', GEMINI_API_KEY: 'key-v2' };
        MockApiKeySet.findOne.mockReturnValue(mockDoc(v2Data));

        // 3. Call getEffective again. Should NOT call findOne again if cached.
        MockApiKeySet.findOne.mockClear();
        // Set mock to return v2 if called, but we expect it NOT to be called or cache used.
        MockApiKeySet.findOne.mockReturnValue(mockDoc(v2Data));

        key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('key-v1'); // Cached v1
        // Verify findOne NOT called or check behaviour.
        // If findOne was called, it would return v2. Since we got v1, it hit cache.
        // OR findOne wasn't called.
        // Actually, getEffective calls getUserCacheKey which is unique per user.

        // 4. Perform Update via upsertUserKeyset
        // This triggers invalidateUserCache(userId)

        // upsertUserKeyset logic:
        //  existing = findOne() -> we return v2Data (acting as existing doc)
        //  updateOne()
        //  findById().lean() -> returns updated doc

        // Reset mocks for upsert flow
        MockApiKeySet.findOne.mockReturnValue(mockDoc(v2Data)); // existing
        MockApiKeySet.updateOne.mockResolvedValue({});
        MockApiKeySet.findById.mockReturnValue(mockDoc(v2Data)); // updated val

        await upsertUserKeyset(validId, { GEMINI_API_KEY: 'key-v2' });

        // Cache should be invalid now.
        // 5. Call getEffective again -> Should call findOne and return v2
        MockApiKeySet.findOne.mockReturnValue(mockDoc(v2Data));

        key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('key-v2');
    });

    it('should invalidate cache when assignment is removed', async () => {
        // 1. Setup Shared Key
        MockApiKeySet.findOne.mockReturnValue(mockDoc(null)); // No personal
        MockUserApiKeySet.find.mockReturnValue(mockFind([{ apiKeySetId: otherId }]));
        MockApiKeySet.findById.mockReturnValue(mockDoc({ _id: otherId, GEMINI_API_KEY: 'shared-key' }));

        let key = await getEffectiveApiKeyForUser(validId, 'gemini');
        expect(key).toBe('shared-key');

        // 2. Remove Assignment
        // unassignKeySetFromUser calls deleteOne and invalidateUserCache
        MockUserApiKeySet.deleteOne.mockResolvedValue({ deletedCount: 1 });
        await unassignKeySetFromUser(otherId, validId);

        // 3. Should fail now (cache invalidated, so it searches again)
        // Mock assignments empty
        MockUserApiKeySet.find.mockReturnValue(mockFind([]));
        MockApiKeySet.findOne.mockReturnValue(mockDoc(null));

        await expect(getEffectiveApiKeyForUser(validId, 'gemini'))
            .rejects.toThrow(/No API key configured/);
    });
});
