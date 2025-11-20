import express from 'express';
import * as apiService from '../services/apiService';
import * as personService from '../services/personService';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// All API routes are protected
router.use(isAuthenticated);

router.post('/quotes/search', (req, res) => apiService.fetchQuotes(req, res));
router.post('/quotes/analyze', (req, res) => apiService.analyzeQuote(req, res));
router.post('/quotes/extract', (req, res) => apiService.extractQuotes(req, res));
router.post('/quotes/improve', (req, res) => apiService.improveSingleQuote(req, res));
router.get('/logs', (req, res) => apiService.getApiLogs(req, res));

// Person routes
router.get('/people', (req, res) => personService.getPeople(req, res));
router.post('/people', (req, res) => personService.createPerson(req, res));
router.put('/people/:id', (req, res) => personService.updatePerson(req, res));
router.delete('/people/:id', (req, res) => personService.deletePerson(req, res));

export default router;
