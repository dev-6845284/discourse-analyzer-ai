import express from 'express';
import * as apiService from '../services/apiService';
import * as personService from '../services/personService';
import * as quoteService from '../services/quoteService';
import { isAuthenticated } from '../middleware/auth';
import { isAdminOrDev } from '../middleware/admin';

const router = express.Router();

// All API routes are protected
router.use(isAuthenticated);

router.post('/quotes/search', (req, res) => apiService.fetchQuotes(req, res));
router.post('/quotes/analyze', (req, res) => apiService.analyzeQuote(req, res));
router.post('/quotes/extract', (req, res) => apiService.extractQuotes(req, res));
router.post('/quotes/improve', (req, res) => apiService.improveSingleQuote(req, res));
router.post('/quotes', (req, res) => quoteService.saveQuote(req, res));
router.get('/quotes', (req, res) => quoteService.getQuotes(req, res));
router.put('/quotes/:id', (req, res) => quoteService.updateQuote(req, res));
router.get('/logs', isAdminOrDev, (req, res) => apiService.getApiLogs(req, res));

// Person routes
router.get('/people', (req, res) => personService.getPeople(req, res));
router.post('/people', (req, res) => personService.createPerson(req, res));
router.put('/people/:id', (req, res) => personService.updatePerson(req, res));
router.delete('/people/:id', (req, res) => personService.deletePerson(req, res));

export default router;
