import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ExtractedArticle {
  title: string;
  byline: string | null;
  content: string;
  textContent: string;
  excerpt: string | null;
  siteName: string | null;
  url: string;
}

/**
 * Fetches and extracts article content from a URL using Mozilla Readability.
 * This is the same algorithm used by Firefox Reader View.
 *
 * @param url - The URL of the article to extract
 * @returns The extracted article with title, content, and metadata
 * @throws Error if the URL cannot be fetched or content cannot be extracted
 */
export async function fetchArticle(url: string): Promise<ExtractedArticle> {
  // Validate URL
  if (!url || !url.startsWith('http')) {
    throw new Error('Invalid URL: must start with http:// or https://');
  }

  // Fetch the page with browser-like headers to avoid bot blocking
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        'Access denied: The website blocked the request. Try pasting the article text directly.'
      );
    }
    if (response.status === 404) {
      throw new Error(
        'Article not found: The URL may be incorrect or the article has been removed.'
      );
    }
    if (response.status >= 500) {
      throw new Error(
        'Server error: The website is temporarily unavailable. Please try again later.'
      );
    }
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();

  // Parse HTML with jsdom
  const dom = new JSDOM(html, { url });

  // Extract article content using Readability
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error(
      'Could not extract article content. The page may not contain a readable article. Try pasting the text directly.'
    );
  }

  return {
    title: article.title || '',
    byline: article.byline ?? null,
    content: article.content || '',
    textContent: article.textContent || '',
    excerpt: article.excerpt ?? null,
    siteName: article.siteName ?? null,
    url: response.url || url, // Use final URL after redirects
  };
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
