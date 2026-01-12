import express from 'express';
import { verifyTurnstileToken } from '../services/turnstileService';
import Quote from '../models/Quote';
import '../models/Person'; // Ensure Person model is registered for populate
import { generalRateLimiter } from '../middleware/rateLimiter';
import mongoose from 'mongoose';
import { isProduction, isLocal } from '../constants/env';

const router = express.Router();

// Public Login (Turnstile Verification)
router.post('/login', generalRateLimiter, async (req, res) => {
    const { token } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    console.log('[PUBLIC_LOGIN]', { ip, hasToken: !!token });

    if (!token) {
        return res.status(400).json({ message: 'Turnstile token is required' });
    }

    const isValid = await verifyTurnstileToken(token, ip);

    if (!isValid) {
        console.warn('[PUBLIC_LOGIN_FAILED]', { ip });
        return res.status(401).json({ message: 'CAPTCHA verification failed' });
    }

    // Set public guest session
    req.session.user = {
        _id: 'public_guest_' + new mongoose.Types.ObjectId().toString(),
        email: 'guest@public',
        role: 'public_guest',
        name: 'Guest',
        picture: ''
    };

    req.session.save((err) => {
        if (err) {
            console.error('[PUBLIC_SESSION_ERROR]', err);
            return res.status(500).json({ message: 'Failed to create session' });
        }
        console.log('[PUBLIC_LOGIN_SUCCESS]', { sessionId: req.sessionID });
        res.json({ message: 'Public session established', user: req.session.user });
    });
});

// Middleware to check for public or auth session
const ensurePublicOrAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.session?.user) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized. Please complete the CAPTCHA.' });
};

// Public Quotes API
router.get('/quotes', ensurePublicOrAuth, async (req, res) => {
    // Safeguard: only logged users (not public guests) can see quotes on non-production (excluding local)
    if (!isProduction() && !isLocal() && req.session?.user?.role === 'public_guest') {
        console.log('[PUBLIC_QUOTES] Safeguard: Returning empty list on non-production for public guest');
        return res.json([]);
    }

    // ToDo remove text filter
    try {
        const {
            personId,
            text,
            dateFrom,
            dateTo,
            sortField = 'savedAt',
            sortOrder = 'newest'
        } = req.query;

        const query: any = {};

        // Default filters
        query.isDeprecated = { $ne: true };
        query.visibility = 'public'; // Only show public quotes

        if (personId) {
            query.person = personId;
        }

        if (text && typeof text === 'string' && text.trim()) {
            query.$text = { $search: text.trim() };
        }

        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) query.date.$gte = new Date(dateFrom as string);
            if (dateTo) query.date.$lte = new Date(dateTo as string);
        }

        const sortConfig: any = { [sortField as string]: sortOrder === 'oldest' ? 1 : -1 };

        // --- CACHE LOGIC START ---
        // Create a unique cache key based on the query parameters
        // We hash the query object to ensure consistency
        const cacheKeyParams = {
            personId,
            text,
            dateFrom,
            dateTo,
            sortField,
            sortOrder,
            query: JSON.stringify(query) // Include constructed query for safety
        };
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(JSON.stringify(cacheKeyParams)).digest('hex');
        const cacheKey = `query:${hash}`;

        // Initialize cache service lazily or globally
        // For now, we import here to avoid circular deps if any, or just use the class
        const { CacheService } = require('../services/cacheService');
        const { getPublicQuotesCacheSizeMB } = require('../constants/env');

        // Singleton-like behavior for the specific cache namespace
        // We attach it to the request or a global provider if needed, but instantiating here is cheap
        // if we want to hold state (like LRU index), we need a persistent instance.
        // Let's use a module-level instance.
        const cacheService = (global as any).publicQuotesCache || new CacheService('public_quotes', getPublicQuotesCacheSizeMB());
        (global as any).publicQuotesCache = cacheService;

        // Try to get from cache
        const cachedResults = await cacheService.get(cacheKey);
        if (cachedResults) {
            console.log('[PUBLIC_QUOTES] Cache HIT', { cacheKey });
            return res.json(cachedResults);
        }

        console.log('[PUBLIC_QUOTES] Cache MISS', { cacheKey });
        // --- CACHE LOGIC END ---

        const quotes = await Quote.find(query)
            .populate('person', 'name description') // Only fetch name and description
            .sort(sortConfig)
            .lean(); // Use lean for better performance and to return plain objects

        // Sanitize and Map Response
        const sanitizedQuotes = quotes.map((q: any) => {
            // Extract analysis results safely
            const analysisRaw = q.metadata?.audit || q.metadata?.analysis || {};

            // Determine structure based on version (audit vs analysis)
            let analysisSummary = {
                verdict: 'Unknown',
                overview: '',
                categories: [] as any[]
            };

            if (q.metadata?.audit) {
                // New Audit Structure
                // Assuming structure based on previous knowledge or standard audit format
                // If exact structure is unknown, we map as simply as possible
                const cats = q.metadata.audit.categories || {};
                analysisSummary.categories = Object.entries(cats).map(([key, value]: [string, any]) => ({
                    name: key,
                    severity: value.severity,
                    reasoning: value.reasoning,
                    evidence: value.evidence // Include evidence field
                }));
                analysisSummary.verdict = q.metadata.audit.verdict || 'N/A';
                analysisSummary.overview = q.metadata.audit.overview || '';
                // Include rationale if not already synonymous with overview, but usually overview covers it.
                // If there's a distinct rationale field:
                if (q.metadata.audit.rationale) {
                    (analysisSummary as any).rationale = q.metadata.audit.rationale;
                }
            } else if (q.metadata?.analysis) {
                // Legacy Structure
                const cats = q.metadata.analysis;
                analysisSummary.categories = Object.entries(cats).map(([key, value]: [string, any]) => ({
                    name: key,
                    severity: value.rating || 'None',
                    reasoning: value.reasoning,
                    // Legacy might not have evidence field structured this way
                }));
                analysisSummary.verdict = q.metadata.verdict || 'N/A';
            }

            return {
                id: q._id,
                text: q.text,
                date: q.date,
                source: q.source, // Include raw source for iframe support
                sourceUrl: q.sourceUrl,
                context: q.context,
                analysisContext: q.analysisContext, // Include analysis context
                links: q.links || q.metadata?.links, // Include links
                person: q.person,
                analysis: analysisSummary
            };
        });

        // Save to cache (TTL: 5 minutes)
        await cacheService.set(cacheKey, sanitizedQuotes, { ttl: 300 });

        res.json(sanitizedQuotes);
    } catch (error: any) {
        console.error('[PUBLIC_QUOTES_ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch quotes' });
    }
});

export default router;
