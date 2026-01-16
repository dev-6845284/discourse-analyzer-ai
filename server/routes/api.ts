import express from 'express';
import * as apiService from '../services/apiService';
import * as personService from '../services/personService';
import * as quoteService from '../services/quoteService';
import { isAuthenticated } from '../middleware/auth';
import { isAdminOrDev } from '../middleware/admin';
import authorizeMiddleware from '../middleware/authorize';
import { checkFeature } from '../middleware/featureToggle';
import { CacheService } from '../services/cacheService';

import { getAllCategories, getSimpleCategories } from '../services/categoryService';

const router = express.Router();

const categoriesCache = new CacheService('categories', 5); // 5MB limit

// Logging middleware for all API requests
router.use((req, res, next) => {
  console.log('[ROUTE_REQUEST]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    sessionID: req.sessionID,
    hasUser: !!req.session?.user,
    userEmail: req.session?.user?.email || 'NOT_AUTHENTICATED',
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    }
  });
  next();
});

// All API routes are protected
router.use(isAuthenticated);
// Authorization middleware checks role-based access for each API call
router.use(authorizeMiddleware);

router.post('/quotes/search', (req, res) => apiService.fetchQuotes(req, res));
router.post('/quotes/agentic-search', checkFeature('search'), (req, res) => apiService.agenticSearch(req, res));
router.post('/quotes/analyze', (req, res) => apiService.analyzeQuote(req, res));
router.post('/quotes/extract', checkFeature('text_extract'), (req, res) => apiService.extractQuotes(req, res));
router.post('/quotes/extract-from-url', checkFeature('text_extract'), (req, res) => apiService.extractQuotesFromUrl(req, res));
router.post('/quotes/fetch-article', checkFeature('text_extract'), (req, res) => apiService.fetchArticleContent(req, res));
router.post('/quotes/fetch-transcript', checkFeature('youtube_transcript'), (req, res) => apiService.fetchYoutubeTranscript(req, res));
// Old endpoints removed - use session-based endpoints in /analysis/sessions/:id/analyze-* instead
router.post('/quotes/improve', (req, res) => apiService.improveSingleQuote(req, res));

// Inject session user info for audit purposes when saving quotes
router.post('/quotes', (req, res) => {
  // Add user info from session to the request body for audit
  if (req.session?.user) {
    req.body.savedByUser = req.session.user._id;
    req.body.savedByName = req.session.user.name || req.session.user.email;
  }
  quoteService.saveQuote(req, res);
});

router.get('/quotes', (req, res) => quoteService.getQuotes(req, res));

// Inject session user info for audit purposes when updating quotes
router.put('/quotes/:id', (req, res) => {
  // Add user info from session to the request body for audit
  if (req.session?.user && req.body.metadata?.analysis) {
    // If analysis is being updated, track who analyzed it
    req.body.analyzedByUser = req.body.analyzedByUser || req.session.user._id;
    req.body.analyzedByName = req.body.analyzedByName || req.session.user.name || req.session.user.email;
    req.body.analyzedAt = req.body.analyzedAt || new Date().toISOString();
  }

  // Security check for visibility update
  if (req.body.visibility) {
    const userRole = req.session?.user?.role;
    // Allowed roles: admin, moderator, editor
    const allowedRoles = ['admin', 'moderator', 'editor', 'dev']; // 'dev' usually has admin privileges
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.warn(`[SECURITY] User ${req.session?.user?.email} (${userRole}) attempted to change quote visibility.`);
      delete req.body.visibility; // Silently ignore or you could return 403
      // return res.status(403).json({ error: 'Insufficient permissions to change visibility' });
    }
  }

  quoteService.updateQuote(req, res);
});

router.delete('/quotes/:id', (req, res) => quoteService.deleteQuote(req, res));

router.get('/logs', isAdminOrDev, (req, res) => apiService.getApiLogs(req, res));

// Person routes
router.get('/people', (req, res) => personService.getPeople(req, res));
router.post('/people', (req, res) => personService.createPerson(req, res));
router.put('/people/:id', (req, res) => personService.updatePerson(req, res));
router.delete('/people/:id', (req, res) => personService.deletePerson(req, res));

// Find similar persons by name (for deduplication)
router.get('/people/find-similar', async (req, res) => {
  try {
    const { name, threshold } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    const similarityThreshold = threshold ? parseFloat(threshold as string) : undefined;
    const matches = await personService.findSimilarPersons(name, similarityThreshold);

    res.json({ matches });
  } catch (error: any) {
    console.error('Error finding similar persons:', error);
    res.status(500).json({ error: 'Failed to find similar persons', details: error.message });
  }
});

// Categories route (authenticated users need read access to all categories)
router.get('/categories', (req, res) => {
  res.json(getAllCategories());
});

router.get('/categories/simple', async (req, res) => {
  try {
    const cacheKey = 'simple_list';
    const cached = await categoriesCache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const data = getSimpleCategories();

    // Cache for 5 minutes (300 seconds)
    await categoriesCache.set(cacheKey, data, { ttl: 300 });

    res.json(data);
  } catch (error) {
    console.warn('[CACHE] Error in categories cache:', error);
    // Fallback to non-cached fetch
    res.json(getSimpleCategories());
  }
});

export default router;
