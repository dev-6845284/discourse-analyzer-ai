import Redis from 'ioredis';

let redisClient: Redis | null = null;
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
    console.log('[REDIS] Initializing Redis client...');
    redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
    });

    redisClient.on('connect', () => {
        console.log('[REDIS] Connected to Redis');
    });

    redisClient.on('error', (err) => {
        console.error('[REDIS] Error:', err);
    });
} else {
    console.warn('[REDIS] No REDIS_URL found, Redis features will be disabled.');
}

export default redisClient;
