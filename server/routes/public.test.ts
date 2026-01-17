// 1. Define Mocks
const mockRedisGet = jest.fn();
const mockRedisMulti = jest.fn();
const mockRedisExec = jest.fn();
const mockRedisChain = {
    setex: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    incrby: jest.fn().mockReturnThis(),
    exec: mockRedisExec
};

jest.mock('../../server/services/redis', () => ({
    __esModule: true,
    default: {
        get: mockRedisGet,
        zadd: jest.fn().mockResolvedValue(1),
        multi: mockRedisMulti,
        zrange: jest.fn().mockResolvedValue([]),
        getPublicQuotesCacheSizeMB: jest.fn().mockReturnValue(100)
    }
}));

jest.mock('../../server/models/Quote');
jest.mock('../../server/services/turnstileService', () => ({
    verifyTurnstileToken: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../server/middleware/rateLimiter', () => ({
    generalRateLimiter: (req: any, res: any, next: any) => next()
}));
jest.mock('../../server/constants/env', () => ({
    isProduction: jest.fn().mockReturnValue(false),
    isLocal: jest.fn().mockReturnValue(false),
    isTest: jest.fn().mockReturnValue(true),
    getCurrentEnv: jest.fn().mockReturnValue('test'),
    getPublicQuotesCacheSizeMB: jest.fn().mockReturnValue(50),
    isDevelopment: jest.fn().mockReturnValue(false),
    isPreview: jest.fn().mockReturnValue(false),
    isStrictSecurity: jest.fn().mockReturnValue(false),
    isRelaxedSecurity: jest.fn().mockReturnValue(true)
}));

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import Quote from '../../server/models/Quote';
import mongoose from 'mongoose';
import router from '../../server/routes/public';

const app = express();
app.use(express.json());
app.use(session({
    secret: 'test',
    resave: false,
    saveUninitialized: true
}));
app.use((req: any, res, next) => {
    req.session.user = {
        _id: 'guest_id',
        email: 'guest@public',
        name: 'Guest',
        picture: '',
        role: 'public_guest'
    };
    next();
});
app.use('/api/public', router);

describe('GET /api/public/quotes/:id', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisMulti.mockReturnValue(mockRedisChain);
        mockRedisExec.mockResolvedValue([]);
    });

    it('should return cached quote if exists', async () => {
        const validId = new mongoose.Types.ObjectId().toString();
        const mockQuote = { id: validId, text: 'Cached quote' };

        // Redis returns stringified JSON
        mockRedisGet.mockResolvedValue(JSON.stringify(mockQuote));

        const response = await request(app).get(`/api/public/quotes/${validId}`);

        if (response.status === 500) console.log('[DEBUG] Response Text:', response.text);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockQuote);
        // Verify redis call with prefix
        expect(mockRedisGet).toHaveBeenCalledWith(expect.stringContaining(`quote:${validId}`));
        expect(Quote.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in cache', async () => {
        // Cache miss
        mockRedisGet.mockResolvedValue(null);

        const validId = new mongoose.Types.ObjectId().toString();
        const mockDbQuote = {
            _id: validId,
            text: 'DB Quote',
            visibility: 'public',
            date: new Date().toISOString(),
            person: { name: 'Person' }
        };
        const mockPopulate = jest.fn().mockReturnThis();
        const mockLean = jest.fn().mockResolvedValue(mockDbQuote);
        (Quote.findOne as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean
        } as any);

        const response = await request(app).get(`/api/public/quotes/${validId}`);

        if (response.status === 500) console.log('[DEBUG] Response Text:', response.text);
        expect(response.status).toBe(200);
        expect(response.body.text).toBe('DB Quote');
        expect(Quote.findOne).toHaveBeenCalled();
        // Verify Cache Set (via multi transaction)
        expect(mockRedisMulti).toHaveBeenCalled();
        expect(mockRedisChain.setex).toHaveBeenCalled();
    });

    it('should return 404 if quote not found', async () => {
        mockRedisGet.mockResolvedValue(null);
        const validId = new mongoose.Types.ObjectId().toString();
        const mockPopulate = jest.fn().mockReturnThis();
        const mockLean = jest.fn().mockResolvedValue(null);
        (Quote.findOne as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean
        } as any);

        const response = await request(app).get(`/api/public/quotes/${validId}`);
        expect(response.status).toBe(404);
    });
});
