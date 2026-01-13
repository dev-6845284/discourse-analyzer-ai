import redisClient from './redis';

interface CacheOptions {
    ttl?: number; // Time to live in seconds
}

export class CacheService {
    private prefix: string;
    private maxBytes: number;
    private usageKey: string;
    private indexKey: string;

    constructor(namespace: string, maxBytesMB: number) {
        this.prefix = `cache:${namespace}:`;
        this.maxBytes = maxBytesMB * 1024 * 1024;
        this.usageKey = `cache:${namespace}:usage`;
        this.indexKey = `cache:${namespace}:index`;
    }

    /**
     * Get a value from the cache and update its LRU position
     */
    async get(key: string): Promise<any | null> {
        if (!redisClient) return null;

        const fullKey = this.prefix + key;
        const data = await redisClient.get(fullKey);

        if (data) {
            // Update LRU: Update score in sorted set to current timestamp
            // We do this asynchronously to not block the read
            redisClient.zadd(this.indexKey, Date.now(), fullKey).catch(err => {
                console.error('[CACHE] Failed to update LRU index:', err);
            });
            return JSON.parse(data);
        }

        return null;
    }

    /**
     * Set a value in the cache with eviction if limits are exceeded
     */
    async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
        if (!redisClient) return;

        const fullKey = this.prefix + key;
        const serialized = JSON.stringify(value);
        const size = Buffer.byteLength(serialized, 'utf8');
        const ttl = options.ttl || 300; // Default 5 minutes

        try {
            // check current usage
            let currentUsage = parseInt(await redisClient.get(this.usageKey) || '0', 10);

            // If adding this item exceeds the limit, evict old items
            while (currentUsage + size > this.maxBytes) {
                const evictedSize = await this.evictOldest();
                if (evictedSize === 0) {
                    // Could not evict anything (empty or error), stop trying to avoid infinite loop
                    // If we can't free space, we might just have to skip caching this item
                    // or force it in. For safety, we skip caching to protect memory.
                    console.warn(`[CACHE] Cache full (${currentUsage} bytes) and cannot evict enough to fit ${size} bytes. Skipping.`);
                    return;
                }
                currentUsage -= evictedSize;
            }

            // Store the data
            const multi = redisClient.multi();
            multi.setex(fullKey, ttl, serialized);
            multi.zadd(this.indexKey, Date.now(), fullKey);
            multi.incrby(this.usageKey, size);
            await multi.exec();

        } catch (error) {
            console.error('[CACHE] Error setting cache key:', error);
        }
    }

    /**
     * Removes the oldest item from the cache
     * Returns the size of the evicted item in bytes
     */
    private async evictOldest(): Promise<number> {
        if (!redisClient) return 0;

        // Get the single oldest key (lowest score)
        const oldest = await redisClient.zrange(this.indexKey, 0, 0);
        if (!oldest || oldest.length === 0) return 0;

        const keyToRemove = oldest[0];
        const data = await redisClient.get(keyToRemove);
        const size = data ? Buffer.byteLength(data, 'utf8') : 0;

        // Transaction to remove data, remove from index, and decrement usage
        const multi = redisClient.multi();
        multi.del(keyToRemove);
        multi.zrem(this.indexKey, keyToRemove);
        if (size > 0) {
            multi.decrby(this.usageKey, size);
        }
        await multi.exec();

        return size;
    }

    /**
     * Clear the entire cache namespace
     */
    async clear(): Promise<void> {
        if (!redisClient) return;

        // Get all keys from the index
        // Warning: if cache is huge, zrange 0 -1 could be slow, but for strict MB limits it should be manageable
        // For production robustness with huge sets, zscan would be better, but we are limited by MB so it's fine.
        const keys = await redisClient.zrange(this.indexKey, 0, -1);

        if (keys.length > 0) {
            await redisClient.del(...keys);
        }

        await redisClient.del(this.indexKey);
        await redisClient.del(this.usageKey);
    }
}
