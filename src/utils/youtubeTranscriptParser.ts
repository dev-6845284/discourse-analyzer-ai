/**
 * Utilities for parsing YouTube transcript text copied from the YouTube UI
 * 
 * YouTube's "Show transcript" feature (⋯ menu → Show transcript) displays text like:
 * 
 * 0:00
 * Hello everyone
 * 0:05
 * Welcome to this video
 * 1:23:45
 * Long video timestamp
 * 
 * This parser handles this format and converts to TranscriptSegment[]
 */

import { TranscriptSegment } from './transcriptStorage';

/**
 * Parses YouTube UI timestamp to seconds
 * Formats: "0:05", "1:23", "1:23:45" (H:MM:SS or M:SS or MM:SS)
 */
export function parseYoutubeTimestamp(timestamp: string): number {
  const parts = timestamp.trim().split(':').map(p => parseInt(p, 10));
  
  if (parts.some(isNaN)) {
    throw new Error(`Invalid timestamp format: "${timestamp}"`);
  }
  
  if (parts.length === 2) {
    // M:SS or MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // H:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  throw new Error(`Invalid timestamp format: "${timestamp}"`);
}

/**
 * Formats seconds to YouTube-style timestamp
 */
export function formatYoutubeTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Regex pattern to match YouTube timestamps
 * Matches: 0:00, 0:05, 1:23, 12:34, 1:23:45, 12:34:56
 */
const YOUTUBE_TIMESTAMP_REGEX = /^(\d{1,2}:\d{2}(?::\d{2})?)$/;

/**
 * Parses YouTube's native transcript text (from "Show transcript" UI)
 * 
 * Expected format:
 * - Timestamp on one line (e.g., "0:00", "1:23:45")
 * - Text content on following line(s) until next timestamp
 */
export function parseYoutubeTranscriptText(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Normalize line endings
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    throw new Error('No content to parse');
  }
  
  let currentTimestamp: number | null = null;
  let currentTextLines: string[] = [];
  
  for (const line of lines) {
    const timestampMatch = line.match(YOUTUBE_TIMESTAMP_REGEX);
    
    if (timestampMatch) {
      // Save previous segment if we have one
      if (currentTimestamp !== null && currentTextLines.length > 0) {
        segments.push({
          start: currentTimestamp,
          duration: 0, // Will be calculated later
          text: currentTextLines.join(' ').trim(),
        });
      }
      
      // Start new segment
      currentTimestamp = parseYoutubeTimestamp(timestampMatch[1]);
      currentTextLines = [];
    } else {
      // This is text content
      if (currentTimestamp !== null) {
        currentTextLines.push(line);
      }
    }
  }
  
  // Don't forget the last segment
  if (currentTimestamp !== null && currentTextLines.length > 0) {
    segments.push({
      start: currentTimestamp,
      duration: 0,
      text: currentTextLines.join(' ').trim(),
    });
  }
  
  if (segments.length === 0) {
    throw new Error('No valid transcript segments found. Make sure you copied the transcript from YouTube\'s "Show transcript" panel.');
  }
  
  // Calculate durations based on gaps between segments
  for (let i = 0; i < segments.length; i++) {
    if (i < segments.length - 1) {
      segments[i].duration = segments[i + 1].start - segments[i].start;
    } else {
      // Last segment - estimate based on text length (roughly 150 words per minute)
      const wordCount = segments[i].text.split(/\s+/).length;
      segments[i].duration = Math.max(1, (wordCount / 150) * 60);
    }
  }
  
  return segments;
}

/**
 * Validates if content looks like YouTube transcript format
 * Returns true if it appears to be YouTube transcript, false otherwise
 */
export function isYoutubeTranscriptFormat(content: string): boolean {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length < 2) return false;
  
  // Check if first line is a timestamp
  const firstLineIsTimestamp = YOUTUBE_TIMESTAMP_REGEX.test(lines[0]);
  
  // Count how many lines are timestamps
  const timestampCount = lines.filter(line => YOUTUBE_TIMESTAMP_REGEX.test(line)).length;
  
  // Should have at least a few timestamps and first line should be timestamp
  return firstLineIsTimestamp && timestampCount >= 1;
}

/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    // Standard: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Short: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Shorts: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // With additional params: &v=VIDEO_ID
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Validates if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}
