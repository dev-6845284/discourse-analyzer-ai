import { Request, Response } from 'express';
import * as apiService from './apiService';
import geminiService from '../llm_services/geminiService';
import chatGptService from '../llm_services/chatGptService';
import grokService from '../llm_services/grokService';
import * as logService from './logService';
import * as apiKeyService from './apiKeyService';
import { postProcessResponse } from './responseProcessor';
import { JsonParsingError, ModelResponseError } from '../types';
import { createQuoteFixture } from '../testUtils/quoteFactory';
import Person from '../models/Person';

jest.mock('../llm_services/geminiService');
jest.mock('../llm_services/chatGptService');
jest.mock('../llm_services/grokService');
jest.mock('./logService');
jest.mock('./responseProcessor', () => ({
  postProcessResponse: jest.fn(),
}));
jest.mock('../utils/articleExtractor', () => ({
  fetchArticle: jest.fn(),
  isValidUrl: jest.fn(),
}));
jest.mock('./apiKeyService', () => ({
  getEffectiveApiKeyForUser: jest.fn(),
}));
jest.mock('../models/Person', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

const createMockResponse = () => {
  const response: Partial<Response> & { json: jest.Mock; status: jest.Mock } = {
    json: jest.fn(),
    status: jest.fn(),
  };

  (response.status as jest.Mock).mockReturnValue(response);
  return response as Response & { json: jest.Mock; status: jest.Mock };
};

describe('apiService', () => {
  const sessionId = 'test-session-id';
  const logId = 'test-log-id';
  let req: Partial<Request>;
  let res: Response & { json: jest.Mock; status: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    res = createMockResponse();
    req = {
      body: {},
      session: {
        id: sessionId,
        user: { _id: 'test-user-id', email: 'test@test.com', role: 'admin' }
      } as any,
    };
    (logService.addLogEntry as jest.Mock).mockReturnValue(logId);
    (postProcessResponse as jest.Mock).mockImplementation((_operation: string, data: any) => data);
    (Person.findById as jest.Mock).mockResolvedValue({
      _id: 'person-123',
      name: 'DB Person',
      aliases: ['Tester'],
      firstname: 'Db',
      surname: 'Person',
      description: 'desc',
      metadata: { role: 'test' },
    });
    (apiKeyService.getEffectiveApiKeyForUser as jest.Mock).mockResolvedValue('test-api-key');
  });

  describe('analyzeQuote', () => {
    const baseAnalyzeBody = () => ({
      model: 'openai',
      quoteText: 'Test Quote',
      quoteLanguageCode: 'en',
      quoteLanguageName: 'English',
      personId: 'person-123',
      temperature: 0.3,
      apiKeys: { openai: 'chat-key' },
      analysisContext: 'context',
      links: [{ url: 'https://example.com', type: 'quote' as const, title: 'Example' }],
    });

    it('routes analysis to chatgpt with DB person data', async () => {
      req.body = baseAnalyzeBody();
      const mockAnalysis = { sentiment: 'positive' };
      (chatGptService.analyzeQuoteText as jest.Mock).mockResolvedValue(mockAnalysis);
      (Person.findById as jest.Mock).mockResolvedValue({
        _id: 'person-123',
        name: 'DB Person',
        aliases: ['Tester'],
        firstname: 'Db',
        surname: 'Person',
        description: 'desc',
        metadata: { role: 'test' },
      });

      await apiService.analyzeQuote(req as Request, res as Response);

      expect(chatGptService.analyzeQuoteText).toHaveBeenCalledWith(
        'test-api-key',
        'Test Quote',
        'en',
        'English',
        0.3,
        logId,
        sessionId,
        {
          _id: 'person-123',
          name: 'DB Person',
          aliases: ['Tester'],
          firstname: 'Db',
          surname: 'Person',
          description: 'desc',
          metadata: { role: 'test' },
        },
        'context',
        [{ url: 'https://example.com', type: 'quote', title: 'Example' }],
        'audit'
      );
      expect(res.json).toHaveBeenCalledWith(mockAnalysis);
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, mockAnalysis);
    });

    it('returns JsonParsingError details', async () => {
      req.body = baseAnalyzeBody();
      const error = new JsonParsingError('bad json', '{bad');
      (chatGptService.analyzeQuoteText as jest.Mock).mockRejectedValue(error);

      await apiService.analyzeQuote(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'bad json',
        rawResponse: '{bad',
        errorType: 'JsonParsingError',
      });
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, undefined, error);
    });

    it('returns ModelResponseError details', async () => {
      req.body = baseAnalyzeBody();
      const error = new ModelResponseError('blocked');
      (chatGptService.analyzeQuoteText as jest.Mock).mockRejectedValue(error);

      await apiService.analyzeQuote(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'blocked',
        errorType: 'ModelResponseError',
      });
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, undefined, error);
    });
  });

  describe('fetchQuotes', () => {
    const baseFetchBody = () => ({
      model: 'gemini',
      personName: 'Test Person',
      languages: ['en', 'lt'],
      maxQuotes: 5,
      context: ['context'],
      temperature: 0.4,
      maxQuoteLength: 120,
      timePeriod: { description: '2020s' },
      category: 'all',
      rating: 'all',
      sortOrder: 'newest',
      apiKeys: { gemini: 'gem-key' },
    });

    it('routes fetch to gemini service with all options', async () => {
      req.body = baseFetchBody();
      const quotes = [createQuoteFixture({ id: 'quote-1' })];
      (geminiService.fetchQuotesForPerson as jest.Mock).mockResolvedValue(quotes);

      await apiService.fetchQuotes(req as Request, res as Response);

      expect(geminiService.fetchQuotesForPerson).toHaveBeenCalledWith(
        'test-api-key',
        'Test Person',
        ['en', 'lt'],
        5,
        ['context'],
        0.4,
        120,
        { description: '2020s' },
        'all',
        'all',
        'newest',
        logId,
        sessionId
      );
      expect(res.json).toHaveBeenCalledWith(quotes);
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, quotes);
    });

    it('returns JsonParsingError metadata', async () => {
      req.body = baseFetchBody();
      const error = new JsonParsingError('bad json', '{bad');
      (geminiService.fetchQuotesForPerson as jest.Mock).mockRejectedValue(error);

      await apiService.fetchQuotes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'bad json',
        rawResponse: '{bad',
        errorType: 'JsonParsingError',
      });
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, undefined, error);
    });

    it('returns ModelResponseError metadata', async () => {
      req.body = baseFetchBody();
      const error = new ModelResponseError('blocked');
      (geminiService.fetchQuotesForPerson as jest.Mock).mockRejectedValue(error);

      await apiService.fetchQuotes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'blocked',
        errorType: 'ModelResponseError',
      });
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, undefined, error);
    });
  });

  describe('extractQuotes', () => {
    const baseExtractBody = () => ({
      model: 'grok',
      personName: 'Person',
      textContent: 'raw text',
      temperature: 0.2,
      apiKeys: { grok: 'grok-key' },
      source: 'Provided Source',
      title: 'Provided Title',
      date: '2025-11-24',
      languageCode: 'lt',
      languageName: 'Lithuanian',
    });

    it('post-processes extracted quotes and logs result', async () => {
      req.body = baseExtractBody();
      const rawQuotes = [createQuoteFixture({ id: 'raw-1' })];
      const enrichedQuotes = [createQuoteFixture({ id: 'processed-1', text: 'Processed' })];
      (grokService.extractQuotesFromText as jest.Mock).mockResolvedValue(rawQuotes);
      (postProcessResponse as jest.Mock).mockReturnValue(enrichedQuotes);

      await apiService.extractQuotes(req as Request, res as Response);

      expect(grokService.extractQuotesFromText).toHaveBeenCalledWith(
        'test-api-key',
        'Person',
        'raw text',
        0.2,
        logId,
        sessionId
      );
      expect(postProcessResponse).toHaveBeenCalledWith('extractQuotesFromText', rawQuotes, {
        source: 'Provided Source',
        title: 'Provided Title',
        date: '2025-11-24',
        languageCode: 'lt',
        languageName: 'Lithuanian',
      });
      expect(res.json).toHaveBeenCalledWith(enrichedQuotes);
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, enrichedQuotes);
    });

    it('returns JsonParsingError metadata on failure', async () => {
      req.body = baseExtractBody();
      const error = new JsonParsingError('bad json', '{bad');
      (grokService.extractQuotesFromText as jest.Mock).mockRejectedValue(error);

      await apiService.extractQuotes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'bad json',
        rawResponse: '{bad',
        errorType: 'JsonParsingError',
      });
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, undefined, error);
    });
  });

  describe('improveSingleQuote', () => {
    const baseImproveBody = () => ({
      model: 'openai',
      quote: createQuoteFixture({ text: 'Needs polishing' }),
      personName: 'Person',
      temperature: 0.1,
      apiKeys: { openai: 'chat-key' },
    });

    it('returns improved quote from service', async () => {
      req.body = baseImproveBody();
      const improved = createQuoteFixture({ text: 'Improved quote' });
      (chatGptService.improveQuote as jest.Mock).mockResolvedValue(improved);

      await apiService.improveSingleQuote(req as Request, res as Response);

      expect(chatGptService.improveQuote).toHaveBeenCalledWith(
        'test-api-key',
        req.body.quote,
        'Person',
        0.1,
        logId,
        sessionId
      );
      expect(res.json).toHaveBeenCalledWith(improved);
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, improved);
    });

    it('propagates JsonParsingError details', async () => {
      req.body = baseImproveBody();
      const error = new JsonParsingError('bad json', '{bad');
      (chatGptService.improveQuote as jest.Mock).mockRejectedValue(error);

      await apiService.improveSingleQuote(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'bad json',
        rawResponse: '{bad',
        errorType: 'JsonParsingError',
      });
      expect(logService.updateLogEntry).toHaveBeenCalledWith(sessionId, logId, undefined, error);
    });
  });

  describe('getApiLogs', () => {
    it('returns paginated logs for the session', () => {
      req.query = { page: '2', pageSize: '5' };
      const logsPayload = { logs: [{ id: '1' }], total: 1, pages: 1 };
      (logService.getLogs as jest.Mock).mockReturnValue(logsPayload);

      apiService.getApiLogs(req as Request, res as Response);

      expect(logService.getLogs).toHaveBeenCalledWith(sessionId, 2, 5);
      expect(res.json).toHaveBeenCalledWith(logsPayload);
    });

    it('handles errors when fetching logs', () => {
      req.query = {};
      const error = new Error('log failure');
      (logService.getLogs as jest.Mock).mockImplementation(() => {
        throw error;
      });

      apiService.getApiLogs(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch logs' });
    });
  });
});
