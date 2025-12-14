import { Request, Response } from 'express';
import { saveQuote, getQuotes } from './quoteService';
import Quote from '../models/Quote';
import Person from '../models/Person';
import mongoose from 'mongoose';

// Mock the Mongoose models
jest.mock('../models/Quote');
jest.mock('../models/Person');

describe('quoteService', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = {
      status: statusMock,
      json: jsonMock,
    } as unknown as Response;
    req = {
      body: {},
      query: {},
    };
    jest.clearAllMocks();
  });

  describe('saveQuote', () => {
    it('should return 400 if text or personName is missing', async () => {
      req.body = { text: 'Some quote' }; // Missing personName
      await saveQuote(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Text and personName are required' });

      req.body = { personName: 'John Doe' }; // Missing text
      await saveQuote(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should create a new person if not found', async () => {
      req.body = {
        text: 'Test quote',
        personName: 'New Person',
        source: 'http://example.com',
      };

      // Mock Person.findOne to return null (not found)
      (Person.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock Person constructor and save
      const mockPersonSave = jest.fn().mockResolvedValue({ _id: 'new-person-id', name: 'New Person' });
      (Person as unknown as jest.Mock).mockImplementation(() => ({
        save: mockPersonSave,
        _id: 'new-person-id',
      }));

      // Mock Quote constructor and save
      const mockQuoteSave = jest.fn().mockResolvedValue({ text: 'Test quote', person: 'new-person-id' });
      (Quote as unknown as jest.Mock).mockImplementation(() => ({
        save: mockQuoteSave,
      }));

      await saveQuote(req as Request, res as Response);

      // Should try to find person twice (by name, then alias)
      expect(Person.findOne).toHaveBeenCalledTimes(2);
      // Should create new person
      expect(mockPersonSave).toHaveBeenCalled();
      // Should save quote
      expect(mockQuoteSave).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should use existing person if found', async () => {
      req.body = {
        text: 'Test quote',
        personName: 'Existing Person',
      };

      const mockPerson = { _id: 'existing-id', name: 'Existing Person' };
      (Person.findOne as jest.Mock).mockResolvedValue(mockPerson);

      const mockQuoteSave = jest.fn().mockResolvedValue({});
      (Quote as unknown as jest.Mock).mockImplementation(() => ({
        save: mockQuoteSave,
      }));

      await saveQuote(req as Request, res as Response);

      expect(Person.findOne).toHaveBeenCalledTimes(1);
      // Should NOT create new person (Person constructor called only for findOne? No, findOne returns object)
      // Actually Person constructor is called in the code: new Person(...) if not found.
      // Here we found it, so new Person(...) for person creation should NOT be called.
      // However, new Quote(...) IS called.
      
      // We can check that the Quote was initialized with the existing person ID
      expect(Quote).toHaveBeenCalledWith(expect.objectContaining({
        person: 'existing-id'
      }));
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should save audit fields correctly', async () => {
      const auditData = {
        text: 'Audit quote',
        personName: 'Audit Person',
        savedByUser: '507f1f77bcf86cd799439011',
        savedByName: 'Tester',
        analyzedByProvider: 'Gemini',
      };
      req.body = auditData;

      (Person.findOne as jest.Mock).mockResolvedValue({ _id: 'p1' });
      (Quote as unknown as jest.Mock).mockImplementation((data) => ({
        save: jest.fn().mockResolvedValue(data),
      }));

      await saveQuote(req as Request, res as Response);

      expect(Quote).toHaveBeenCalledWith(expect.objectContaining({
        savedByUser: expect.any(mongoose.Types.ObjectId),
        savedByName: 'Tester',
        analyzedByProvider: 'Gemini',
        savedAt: expect.any(Date),
      }));
    });
  });

  describe('getQuotes', () => {
    it('should build correct query filters', async () => {
      req.query = {
        personId: 'p1',
        isAnalyzed: 'true',
        language: 'en',
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([])),
      };

      (Quote.find as jest.Mock).mockReturnValue(mockQuery);

      await getQuotes(req as Request, res as Response);

      expect(Quote.find).toHaveBeenCalledWith(expect.objectContaining({
        person: 'p1',
        analyzedAt: { $exists: true, $ne: null },
        'metadata.languageCode': 'en',
      }));
    });

    it('should handle text search', async () => {
      req.query = { text: 'search term' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([])),
      };

      (Quote.find as jest.Mock).mockReturnValue(mockQuery);

      await getQuotes(req as Request, res as Response);

      expect(Quote.find).toHaveBeenCalledWith(expect.objectContaining({
        $text: { $search: 'search term' },
      }));
    });

    it('should handle date ranges', async () => {
      req.query = {
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve([])),
      };

      (Quote.find as jest.Mock).mockReturnValue(mockQuery);

      await getQuotes(req as Request, res as Response);

      expect(Quote.find).toHaveBeenCalledWith(expect.objectContaining({
        date: {
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        },
      }));
    });
  });
});
