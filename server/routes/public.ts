/**
 * @AI_INSTRUCTION: PUBLIC API CACHING RULE
 * All public API requests in this file MUST be cached in Redis using publicQuotesCache.
 * This is critical for performance and scalability.
 * See .agent/rules/caching.md for more details.
 */
import express from 'express';
import { verifyTurnstileToken } from '../services/turnstileService';
import Quote from '../models/Quote';
import '../models/Person'; // Ensure Person model is registered for populate
import { generalRateLimiter } from '../middleware/rateLimiter';
import mongoose from 'mongoose';
import { isProduction, isLocal, isTest } from '../constants/env';
import { publicQuotesCache } from '../services/publicQuotesCache';

const router = express.Router();

// Cache TTL Configuration (in seconds)
const CACHE_TTL_CONFIG = {
    // TTL for "recent" data - no date filter or short time ranges (e.g., last 24 hours)
    RECENT_DATA_TTL: 300, // 5 minutes
    // TTL for "historical" data - longer time ranges that change less frequently
    HISTORICAL_DATA_TTL: 3600, // 1 hour
    // Threshold in milliseconds - if date range is within this, use RECENT_DATA_TTL
    RECENT_THRESHOLD_MS: 2 * 24 * 60 * 60 * 1000, // 2 days
};

// Public Login (Turnstile Verification)
router.post('/login', generalRateLimiter, async (req, res) => {
    const { token } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    console.log('[PUBLIC_LOGIN]', { ip, hasToken: !!token });

    if (!token) {
        return res.status(400).json({ message: 'Turnstile token is required' });
    }

    // Securely handle development bypass
    // Only enabled if explicitly configured via env var AND in local environment
    const isBypassEnabled = process.env.ENABLE_TURNSTILE_BYPASS === 'true';
    const isDevBypass = isBypassEnabled && isLocal() && token === 'dev-bypass-token';

    const isValid = isDevBypass || await verifyTurnstileToken(token, ip);

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
    // Safeguard: only logged users (not public guests) can see quotes on non-production (excluding local and test)
    if (!isProduction() && !isLocal() && !isTest() && req.session?.user?.role === 'public_guest') {
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

        // Normalize dates to date-only format for cache consistency
        // This ensures all users get the same cache key regardless of their local time
        const normalizeDateString = (dateStr: string): string => {
            // Extract just YYYY-MM-DD, ignoring any time component
            return dateStr.split('T')[0];
        };

        // Normalized date strings for cache key (date-only, no time)
        const normalizedDateFrom = dateFrom ? normalizeDateString(dateFrom as string) : undefined;
        const normalizedDateTo = dateTo ? normalizeDateString(dateTo as string) : undefined;

        if (normalizedDateFrom || normalizedDateTo) {
            query.date = {};
            // For query: 'from' date starts at midnight, 'to' date ends at 23:59:59
            if (normalizedDateFrom) {
                query.date.$gte = new Date(normalizedDateFrom + 'T00:00:00.000Z');
            }
            if (normalizedDateTo) {
                query.date.$lte = new Date(normalizedDateTo + 'T23:59:59.999Z');
            }
        }

        // Allow sorting by savedAt (default), date (publication), or analyzedAt
        const allowedSortFields = ['savedAt', 'date', 'analyzedAt'];
        const sanitizedSortField = allowedSortFields.includes(sortField as string) ? sortField : 'savedAt';
        const sortConfig: any = { [sanitizedSortField as string]: sortOrder === 'oldest' ? 1 : -1 };

        // Limit for optimal caching
        const QUOTES_LIMIT = 50;

        // --- CACHE LOGIC START ---
        // Create a unique cache key based on the query parameters
        // Use normalized date strings (date-only) for cache key to ensure all users share the same cache
        const cacheKeyParams = {
            personId,
            text,
            dateFrom: normalizedDateFrom,  // Use normalized date-only string
            dateTo: normalizedDateTo,      // Use normalized date-only string
            sortField: sanitizedSortField,
            sortOrder,
            limit: QUOTES_LIMIT,
        };
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(JSON.stringify(cacheKeyParams)).digest('hex');
        const cacheKey = `query:${hash}`;

        // Try to get from cache
        const cachedResults = await publicQuotesCache.get(cacheKey);
        if (cachedResults) {
            console.log('[PUBLIC_QUOTES] Cache HIT', { cacheKey });
            return res.json(cachedResults);
        }

        console.log('[PUBLIC_QUOTES] Cache MISS', { cacheKey });
        // --- CACHE LOGIC END ---

        const quotes = await Quote.find(query)
            .populate('person', 'name description links') // Fetch links to filter them later
            .sort(sortConfig)
            .limit(QUOTES_LIMIT)
            .lean(); // Use lean for better performance and to return plain objects

        // Sanitize and Map Response
        const sanitizedQuotes = quotes.map((q: any) => {
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
                analysisSummary.verdict = q.metadata.audit.verdict || q.metadata.audit.classification || 'N/A';
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

            // Securely filter person links
            let safePerson = null;
            if (q.person && typeof q.person === 'object') {
                const p: any = q.person;
                safePerson = {
                    name: p.name,
                    description: p.description,
                    links: Array.isArray(p.links)
                        ? p.links.filter((l: any) => l.isVisible).map((l: any) => ({ url: l.url, type: l.type }))
                        : []
                };
            }

            return {
                id: q._id,
                text: q.text,
                date: q.date,
                source: q.source, // Include raw source for iframe support
                sourceUrl: q.sourceUrl,
                context: q.context,
                analysisContext: q.analysisContext, // Include analysis context

                links: q.links || q.metadata?.links, // Include quote-specific links
                person: safePerson, // Use sanitized person
                analysis: analysisSummary
            };
        });

        // Determine cache TTL based on date range
        // Use shorter TTL for "recent" data (no date filter or last 24-48 hours)
        // Use longer TTL for "historical" data (older date ranges)
        let cacheTTL = CACHE_TTL_CONFIG.RECENT_DATA_TTL;

        if (normalizedDateFrom) {
            const dateFromMs = new Date(normalizedDateFrom + 'T00:00:00.000Z').getTime();
            const now = Date.now();
            const rangeMs = now - dateFromMs;

            // If the date range starts more than 2 days ago, use historical TTL
            if (rangeMs > CACHE_TTL_CONFIG.RECENT_THRESHOLD_MS) {
                cacheTTL = CACHE_TTL_CONFIG.HISTORICAL_DATA_TTL;
            }
        }

        // Save to cache with dynamic TTL
        await publicQuotesCache.set(cacheKey, sanitizedQuotes, { ttl: cacheTTL });

        res.json(sanitizedQuotes);
    } catch (error: any) {
        console.error('[PUBLIC_QUOTES_ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch quotes' });
    }
});

// Public People API - Get people who have public quotes
router.get('/people', ensurePublicOrAuth, async (req, res) => {
    const cacheKey = 'people:public';

    try {
        // Try to get from cache
        const cachedResults = await publicQuotesCache.get(cacheKey);
        if (cachedResults) {
            console.log('[PUBLIC_PEOPLE] Cache HIT', { cacheKey });
            return res.json(cachedResults);
        }

        console.log('[PUBLIC_PEOPLE] Cache MISS', { cacheKey });

        // Find distinct person IDs from public quotes
        const personIds = await Quote.distinct('person', {
            visibility: 'public',
            isDeprecated: { $ne: true }
        });

        // Get person details
        const Person = mongoose.model('Person');
        const people = await Person.find(
            { _id: { $in: personIds } },
            { _id: 1, name: 1 }
        ).sort({ name: 1 }).lean();

        const sanitizedPeople = people.map((p: any) => ({
            id: p._id,
            name: p.name
        }));

        // Save to cache (TTL: 5 minutes)
        await publicQuotesCache.set(cacheKey, sanitizedPeople, { ttl: 300 });

        res.json(sanitizedPeople);
    } catch (error: any) {
        console.error('[PUBLIC_PEOPLE_ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch people' });
    }
});

// Public Single Quote API
router.get('/quotes/:id', ensurePublicOrAuth, async (req, res) => {
    const { id } = req.params;

    // Safeguard: only logged users (not public guests) can see quotes on non-production (excluding local and test)
    if (!isProduction() && !isLocal() && !isTest() && req.session?.user?.role === 'public_guest') {
        console.log('[PUBLIC_QUOTE_SINGLE] Safeguard: Blocking access on non-production for public guest', { id });
        return res.status(403).json({ message: 'Restricted access: Please log in to view this content in this environment.' });
    }

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
    }

    const cacheKey = `quote:${id}`;

    try {
        // --- CACHE LOGIC START ---
        const cachedResult = await publicQuotesCache.get(cacheKey);
        if (cachedResult) {
            console.log('[PUBLIC_QUOTE_SINGLE] Cache HIT', { cacheKey });
            return res.json(cachedResult);
        }
        console.log('[PUBLIC_QUOTE_SINGLE] Cache MISS', { cacheKey });
        // --- CACHE LOGIC END ---

        const quote = await Quote.findOne({ _id: id, visibility: 'public' })
            .populate('person', 'name description links')
            .lean();

        if (!quote) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        const q: any = quote;

        // Determine structure based on version (audit vs analysis)
        let analysisSummary = {
            verdict: 'Unknown',
            overview: '',
            categories: [] as any[]
        };

        if (q.metadata?.audit) {
            // New Audit Structure
            const cats = q.metadata.audit.categories || {};
            analysisSummary.categories = Object.entries(cats).map(([key, value]: [string, any]) => ({
                name: key,
                severity: value.severity,
                reasoning: value.reasoning,
                evidence: value.evidence
            }));
            analysisSummary.verdict = q.metadata.audit.verdict || q.metadata.audit.classification || 'N/A';
            analysisSummary.overview = q.metadata.audit.overview || '';
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
            }));
            analysisSummary.verdict = q.metadata.verdict || 'N/A';
        }

        // Securely filter person links
        let safePerson = null;
        if (q.person && typeof q.person === 'object') {
            const p: any = q.person;
            safePerson = {
                name: p.name,
                description: p.description,
                links: Array.isArray(p.links)
                    ? p.links.filter((l: any) => l.isVisible).map((l: any) => ({ url: l.url, type: l.type }))
                    : []
            };
        }

        const sanitizedQuote = {
            id: q._id,
            text: q.text,
            date: q.date,
            source: q.source,
            sourceUrl: q.sourceUrl,
            context: q.context,
            analysisContext: q.analysisContext,
            links: q.links || q.metadata?.links,
            person: safePerson,
            analysis: analysisSummary
        };

        // Save to cache (TTL: 1 hour for single quotes as they don't change often)
        await publicQuotesCache.set(cacheKey, sanitizedQuote, { ttl: 3600 });

        res.json(sanitizedQuote);
    } catch (error: any) {
        console.error('[PUBLIC_QUOTE_SINGLE_ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch quote' });
    }
});

export default router;
