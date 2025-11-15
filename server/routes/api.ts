import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import {
  fetchQuotesForPerson,
  // analyzeQuoteText,
  // extractQuotesFromText,
  // improveQuote,
} from '../services/apiService';

const router = express.Router();

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
    } = req.body;

    const quotes = await fetchQuotesForPerson(
      aiProvider,
      personName,
      languages,
      resultCount,
      existingQuotesText,
      temperature,
      maxQuoteLength,
      timePeriod
    );
    res.json(quotes);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message });
  }
});

// Add routes for analyze, extract, and improve here...

export default router;
