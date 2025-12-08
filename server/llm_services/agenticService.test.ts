import agenticService from './agenticService';
import { GoogleGenAI } from '@google/genai';
import * as logService from '../services/logService';
import * as geminiService from './geminiService';
import { AgenticSearchOptions } from '../types';
import { extractJson } from './utils';

jest.mock('@google/genai');
jest.mock('../services/logService');
jest.mock('./geminiService');
jest.mock('./chatGptService');
jest.mock('./utils', () => ({
  extractJson: jest.fn(),
}));

describe('AgenticService', () => {
  const mockGenerateContent = jest.fn();
  const sessionId = 'test-session';
  const logId = 'test-log';
  const apiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock GoogleGenAI constructor and methods
    (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    }));

    // Mock logService methods
    (logService.addModelInteractionLog as jest.Mock).mockReturnValue('interaction-id');
    (logService.appendLogRequestPayload as jest.Mock).mockImplementation(() => {});
    (logService.completeModelInteractionLog as jest.Mock).mockImplementation(() => {});

    // Mock geminiService helper
    (geminiService.getValidatedResponseText as jest.Mock).mockImplementation((response) => {
      return response.text ? response.text() : '';
    });

    // Mock extractJson default behavior
    (extractJson as jest.Mock).mockImplementation((text) => text);
  });

  describe('search with Gemini', () => {
    it('should execute full search workflow successfully', async () => {
      const options: AgenticSearchOptions = {
        mode: 'quotes',
        topics: ['politics'],
        keywords: ['election'],
      };

      // 1. Plan Response
      const planResponse = {
        text: () => JSON.stringify(['query1', 'query2']),
      };

      // 2. Execute Response (Search) - called for each query
      const searchResponse1 = {
        text: () => 'Search result for query1',
      };
      const searchResponse2 = {
        text: () => 'Search result for query2',
      };

      // 3. Synthesize Response
      const synthesizeResponse = {
        text: () => JSON.stringify({
          quotes: [
            { text: 'Quote 1', source: 'Source 1' },
            { text: 'Quote 2', source: 'Source 2' },
          ]
        }),
      };

      mockGenerateContent
        .mockResolvedValueOnce(planResponse)      // Plan
        .mockResolvedValueOnce(searchResponse1)   // Search 1
        .mockResolvedValueOnce(searchResponse2)   // Search 2
        .mockResolvedValueOnce(synthesizeResponse); // Synthesize

      const result = await agenticService.search(
        'gemini',
        apiKey,
        'Test Person',
        { description: 'last year' },
        ['en'],
        options,
        logId,
        sessionId
      );

      // Verify Plan step
      expect(mockGenerateContent).toHaveBeenNthCalledWith(1, expect.objectContaining({
        contents: expect.stringContaining('expert research planner'),
      }));

      // Verify Execute step (Search)
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
        config: expect.objectContaining({
          tools: [{ googleSearch: {} }]
        })
      }));

      // Verify Synthesize step
      expect(mockGenerateContent).toHaveBeenLastCalledWith(expect.objectContaining({
        contents: expect.stringContaining('expert analyst'),
      }));

      // Verify Result
      expect(result.type).toBe('quotes');
      const quotes = result.data as any[];
      expect(quotes).toHaveLength(2);
      expect(quotes[0].text).toBe('Quote 1');
      expect(quotes[0].id).toBeDefined();
    });

    it('should handle planning failure by falling back to default query', async () => {
      const options: AgenticSearchOptions = {
        mode: 'quotes',
        topics: [],
        keywords: [],
      };

      // 1. Plan Response - Invalid JSON
      const planResponse = {
        text: () => 'Invalid JSON',
      };

      // 2. Execute Response (Search) - for default query
      const searchResponse = {
        text: () => 'Search result',
      };

      // 3. Synthesize Response
      const synthesizeResponse = {
        text: () => JSON.stringify({ quotes: [] }),
      };

      mockGenerateContent
        .mockResolvedValueOnce(planResponse)
        .mockResolvedValueOnce(searchResponse)
        .mockResolvedValueOnce(synthesizeResponse);

      // Force extractJson to return null for the first call (planning)
      (extractJson as jest.Mock).mockReturnValueOnce(null);
      // For subsequent calls (synthesis), return the text (which is valid JSON)
      (extractJson as jest.Mock).mockImplementation((text) => text);

      await agenticService.search(
        'gemini',
        apiKey,
        'Test Person',
        { description: 'last year' },
        ['en'],
        options,
        logId,
        sessionId
      );

      // The second call should be the search with fallback query
      const searchCall = mockGenerateContent.mock.calls[1][0];
      expect(searchCall.contents).toContain('Test Person quotes last year');
    });
  });
});
