import { Request, Response } from 'express';
import * as apiService from './apiService';
import geminiService from '../llm_services/geniniService';
import chatGptService from '../llm_services/chatGptService';
import grokService from '../llm_services/grokService';
import * as logService from './logService';

// Mock dependencies
jest.mock('../llm_services/geniniService');
jest.mock('../llm_services/chatGptService');
jest.mock('../llm_services/grokService');
jest.mock('./logService');

describe('apiService', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {},
      session: { id: 'test-session-id' } as any,
    };
    res = {
      json: jsonMock,
      status: statusMock,
    };
    jest.clearAllMocks();
    (logService.addLogEntry as jest.Mock).mockReturnValue('test-log-id');
  });

  describe('fetchQuotes', () => {
    it('should fetch quotes using gemini service when model is gemini', async () => {
      req.body = {
        model: 'gemini',
        personName: 'Test Person',
        apiKeys: { gemini: 'test-key' },
      };

      const mockQuotes = [{ text: 'Quote 1' }];
      (geminiService.fetchQuotesForPerson as jest.Mock).mockResolvedValue(mockQuotes);

      await apiService.fetchQuotes(req as Request, res as Response);

      expect(geminiService.fetchQuotesForPerson).toHaveBeenCalledWith(
        'test-key',
        'Test Person',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'test-log-id',
        'test-session-id'
      );
      expect(res.json).toHaveBeenCalledWith(mockQuotes);
      expect(logService.updateLogEntry).toHaveBeenCalledWith('test-session-id', 'test-log-id', mockQuotes);
    });

    it('should handle errors gracefully', async () => {
      req.body = {
        model: 'gemini',
        personName: 'Test Person',
        apiKeys: { gemini: 'test-key' },
      };

      const error = new Error('Test Error');
      (geminiService.fetchQuotesForPerson as jest.Mock).mockRejectedValue(error);

      await apiService.fetchQuotes(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Failed to fetch quotes' });
      expect(logService.updateLogEntry).toHaveBeenCalledWith('test-session-id', 'test-log-id', undefined, error);
    });
  });

  describe('analyzeQuote', () => {
    it('should analyze quote using chatgpt service when model is chatgpt', async () => {
      req.body = {
        model: 'chatgpt',
        quoteText: 'Test Quote',
        apiKeys: { chatgpt: 'test-key' },
      };

      const mockAnalysis = { sentiment: 'positive' };
      (chatGptService.analyzeQuoteText as jest.Mock).mockResolvedValue(mockAnalysis);

      await apiService.analyzeQuote(req as Request, res as Response);

      expect(chatGptService.analyzeQuoteText).toHaveBeenCalledWith(
        'test-key',
        'Test Quote',
        undefined,
        undefined,
        undefined,
        'test-log-id',
        'test-session-id',
        undefined,
        undefined
      );
      expect(res.json).toHaveBeenCalledWith(mockAnalysis);
      expect(logService.updateLogEntry).toHaveBeenCalledWith('test-session-id', 'test-log-id', mockAnalysis);
    });
  });

  describe('extractQuotes', () => {
    it('should extract quotes using grok service when model is grok', async () => {
      req.body = {
        model: 'grok',
        personName: 'Test Person',
        textContent: 'Some text with quotes',
        apiKeys: { grok: 'test-key' },
      };

      const mockExtractedQuotes = [{ text: 'Extracted Quote' }];
      (grokService.extractQuotesFromText as jest.Mock).mockResolvedValue(mockExtractedQuotes);

      await apiService.extractQuotes(req as Request, res as Response);

      expect(grokService.extractQuotesFromText).toHaveBeenCalledWith(
        'test-key',
        'Test Person',
        'Some text with quotes',
        undefined,
        'test-log-id',
        'test-session-id'
      );
      expect(res.json).toHaveBeenCalledWith(mockExtractedQuotes);
      expect(logService.updateLogEntry).toHaveBeenCalledWith('test-session-id', 'test-log-id', mockExtractedQuotes);
    });
  });
});
