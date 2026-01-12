import { CacheService } from './services/cacheService';
import redisClient from './services/redis';

async function main() {
    console.log('Verifying CacheService...');

    try {
        const cache = new CacheService('verify', 1); // 1 MB
        console.log('Instantiated CacheService successfully.');

        if (!redisClient) {
            console.log('Redis client is NULL (expected if no REDIS_URL). Cache operations should be no-ops.');
        } else {
            console.log('Redis client is ACTIVE.');
        }

        // Test Set
        console.log('Setting key...');
        await cache.set('verify_key', { verified: true }, { ttl: 60 });

        // Test Get
        console.log('Getting key...');
        const val = await cache.get('verify_key');
        console.log('Result:', val);

        if (redisClient && !val) {
            console.error('ERROR: Redis is key but got null?');
        } else if (redisClient && val) {
            console.log('SUCCESS: Cache works!');
        }

    } catch (e) {
        console.error('CRITICAL FAILURE during verification:', e);
        process.exit(1);
    }
}

main();
