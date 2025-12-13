/**
 * Utility functions for URL handling
 */

/**
 * Regex pattern for detecting YouTube URLs (video pages and short links)
 */
const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;

/**
 * Check if a URL is a YouTube link
 * @param url - The URL to check
 * @returns true if the URL is a YouTube video link
 */
export function isYouTubeUrl(url: string): boolean {
  return youtubeRegex.test(url);
}
