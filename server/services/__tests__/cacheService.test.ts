import { CacheService } from '../cacheService';

import redisClient from '../redis';

jest.mock('../redis', () => ({
    __esModule: true,
    default: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        setex: jest.fn().mockResolvedValue('OK'),
        zadd: jest.fn().mockResolvedValue(1),
        zrange: jest.fn().mockResolvedValue([]),
        zrem: jest.fn().mockResolvedValue(1),
        incrby: jest.fn().mockResolvedValue(1),
        decrby: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
        multi: jest.fn(),
    },
}));

const mockRedis = redisClient as any;

describe('CacheService', () => {
    let cacheService: CacheService;
    let mockMulti: any;

    beforeEach(() => {
        jest.clearAllMocks();
        cacheService = new CacheService('test', 1); // 1 MB limit

        // Setup chainable multi mock
        mockMulti = {
            setex: jest.fn().mockReturnThis(),
            zadd: jest.fn().mockReturnThis(),
            incrby: jest.fn().mockReturnThis(),
            decrby: jest.fn().mockReturnThis(),
            del: jest.fn().mockReturnThis(),
            zrem: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.multi.mockReturnValue(mockMulti);
    });

    describe('get', () => {
        it('should return null if key does not exist', async () => {
            mockRedis.get.mockResolvedValue(null);
            const result = await cacheService.get('missing');
            expect(result).toBeNull();
            expect(mockRedis.get).toHaveBeenCalledWith('cache:test:test:missing');
        });

        it('should return parsed data and update LRU index', async () => {
            const data = { foo: 'bar' };
            mockRedis.get.mockResolvedValue(JSON.stringify(data));

            const result = await cacheService.get('existing');

            expect(result).toEqual(data);
            expect(mockRedis.zadd).toHaveBeenCalledWith(
                'cache:test:test:index',
                expect.any(Number),
                'cache:test:test:existing'
            );
        });
    });

    describe('set', () => {
        it('should store data if space is available', async () => {
            mockRedis.get.mockResolvedValue('0'); // 0 bytes used
            const data = { foo: 'bar' };

            await cacheService.set('key1', data);

            expect(mockMulti.setex).toHaveBeenCalledWith(
                'cache:test:test:key1',
                300,
                JSON.stringify(data)
            );
            expect(mockMulti.incrby).toHaveBeenCalled();
            expect(mockMulti.exec).toHaveBeenCalled();
        });

        it('should evict oldest items if space is needed', async () => {
            // 1MB = 1048576 bytes
            // Current usage: 1048500 (almost full)
            mockRedis.get.mockImplementation((key: string) => {
                if (key === 'cache:test:test:usage') return Promise.resolve('1048500');
                if (key === 'oldest_key') return Promise.resolve('x'.repeat(1000)); // 1000 bytes
                return Promise.resolve(null);
            });

            // Make evictOldest find something
            mockRedis.zrange.mockResolvedValue(['oldest_key']);

            const data = { big: 'data'.repeat(100) }; // ~400+ bytes, fits if we evict 1000

            await cacheService.set('new_key', data);

            // Should have called eviction
            expect(mockRedis.zrange).toHaveBeenCalledWith('cache:test:test:index', 0, 0);
            expect(mockMulti.del).toHaveBeenCalledWith('oldest_key');
            expect(mockMulti.decrby).toHaveBeenCalled();

            // And then set the new key
            expect(mockMulti.setex).toHaveBeenCalledWith(
                'cache:test:test:new_key',
                expect.any(Number),
                expect.any(String)
            );
        });

        it('should abort if eviction fails to free enough space', async () => {
            // Full and nothing to evict
            mockRedis.get.mockReturnValue(Promise.resolve('1048600')); // Over limit
            mockRedis.zrange.mockResolvedValue([]); // No keys to evict?

            await cacheService.set('key', { val: 1 });

            // Should not write new key check
            expect(mockMulti.setex).not.toHaveBeenCalled();
        });
    });
});
