/**
 * Resolves redirect URLs to their final destination
 * @param url The URL to resolve
 * @returns The final URL after following all redirects, or the original URL if resolution fails
 */
export const resolveUrl = async (url: string): Promise<string> => {
  try {
    // Skip resolution for invalid URLs or non-http(s) protocols
    if (!url || !url.startsWith('http')) {
      return url;
    }

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full content
      redirect: 'follow',
      mode: 'cors',
    });

    // Return the final URL after all redirects
    return response.url || url;
  } catch (error) {
    // If fetch fails (CORS, network error, etc.), return the original URL
    console.warn(`Failed to resolve URL ${url}:`, error);
    return url;
  }
};

/**
 * Resolves multiple URLs in parallel
 * @param urls Array of URLs to resolve
 * @returns Array of resolved URLs in the same order
 */
export const resolveUrls = async (urls: string[]): Promise<string[]> => {
  return Promise.all(urls.map(url => resolveUrl(url)));
};
