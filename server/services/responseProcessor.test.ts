import { postProcessResponse } from './responseProcessor';
import { createQuoteFixture } from '../testUtils/quoteFactory';

describe('responseProcessor', () => {
  describe('postProcessResponse', () => {
    it('should return original data for unsupported operations', () => {
      const payload = { foo: 'bar' };
      const result = postProcessResponse('unknownOperation', payload);

      expect(result).toBe(payload);
    });

    it('should aggregate and enrich extracted quotes', () => {
      const quotes = [
        createQuoteFixture({ id: 'quote-1', text: 'First quote ', source: 'Source A' }),
        createQuoteFixture({ id: 'quote-2', text: 'Second quote', source: 'Source B' }),
        createQuoteFixture({ id: 'quote-3', text: 'First quote', source: 'Source C' }),
        createQuoteFixture({ id: 'quote-4', text: '   ' }),
      ];

      const context = {
        source: 'Provided Source',
        title: 'Provided Title',
        date: '2025-11-24',
        languageCode: 'lt',
        languageName: 'Lithuanian',
      };

      const result = postProcessResponse('extractQuotesFromText', quotes, context);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('First quote | Second quote');
      expect(result[0].source).toBe('Provided Source');
      expect(result[0].title).toBe('Provided Title');
      expect(result[0].date).toBe('2025-11-24');
      expect(result[0].languageCode).toBe('lt');
      expect(result[0].languageName).toBe('Lithuanian');
      expect(result[0].id).toBe('quote-1');
    });

    it('should return empty array when no valid quotes remain after filtering', () => {
      const quotes = [
        createQuoteFixture({ id: 'quote-empty-1', text: '   ' }),
        createQuoteFixture({ id: 'quote-empty-2', text: '' }),
      ];

      const result = postProcessResponse('extractQuotesFromText', quotes, {});

      expect(result).toEqual([]);
    });

    it('should return empty array when input quotes array is empty or undefined', () => {
      expect(postProcessResponse('extractQuotesFromText', [], {})).toEqual([]);
      expect(postProcessResponse('extractQuotesFromText', undefined, {})).toEqual([]);
    });
  });
});
