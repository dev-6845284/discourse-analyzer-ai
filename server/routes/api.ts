import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import {
  fetchQuotesForPerson,
  analyzeQuoteText,
  extractQuotesFromText,
  improveQuote,
  JsonParsingError,
  ModelResponseError,
} from '../services/apiService';
import { getLogs } from '../services/logService';

const router = express.Router();

router.get('/logs', isAuthenticated, (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const logs = getLogs(page, pageSize);
    res.json(logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

router.post('/quotes/search', isAuthenticated, async (req, res) => {
  try {
    const {
      aiProvider,
      personName,
      languages,
      resultCount,
      existingQuotesText,
      temperature,
      maxQuoteLength,
      timePeriod,
      filterCategory,
      filterRating,
      sortOrder,
    } = req.body;

    const quotes = await fetchQuotesForPerson(
      aiProvider,
      personName,
      languages,
      resultCount,
      existingQuotesText,
      temperature,
      maxQuoteLength,
      timePeriod,
      filterCategory,
      filterRating,
      sortOrder
    );
    res.json(quotes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

router.post('/quotes/analyze', isAuthenticated, async (req, res) => {
  try {
    const { aiProvider, quote } = req.body;
    const analysis = await analyzeQuoteText(aiProvider, quote);
    res.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

router.post('/quotes/extract', isAuthenticated, async (req, res) => {
  try {
    const { aiProvider, personName, textToExtract } = req.body;
    const quotes = await extractQuotesFromText(aiProvider, personName, textToExtract);
    res.json(quotes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

router.post('/quotes/improve', isAuthenticated, async (req, res) => {
  try {
    const { aiProvider, quote, personName } = req.body;
    const improvedQuote = await improveQuote(aiProvider, quote, personName);
    res.json(improvedQuote);
  } catch (error) {
    if (error instanceof ModelResponseError) {
      return res.status(400).json({
        message: error.message,
        errorType: 'ModelResponseError',
      });
    }
    if (error instanceof JsonParsingError) {
      return res.status(500).json({
        message: error.message,
        rawResponse: error.rawResponse,
        errorType: 'JsonParsingError',
      });
    }
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

export default router;
