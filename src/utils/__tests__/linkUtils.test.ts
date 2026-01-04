import { initializeLinksWithSelection, LinkData } from '../linkUtils';

describe('initializeLinksWithSelection', () => {
  it('marks YouTube links as not selected by default', () => {
    const links: LinkData[] = [
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'quote' },
      { url: 'https://example.com/article', type: 'context' },
    ];

    const result = initializeLinksWithSelection(links);
    expect(result[0].selected).toBe(false);
    expect(result[1].selected).toBe(true);
  });

  it('preserves explicit selected flag', () => {
    const links: LinkData[] = [
      { url: 'https://example.com', type: 'context', selected: false },
    ];

    const result = initializeLinksWithSelection(links);
    expect(result[0].selected).toBe(false);
  });

  it('handles empty input gracefully', () => {
    const result = initializeLinksWithSelection([]);
    expect(result).toEqual([]);
  });
});