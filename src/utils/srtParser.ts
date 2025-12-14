/**
 * Utilities for parsing SRT (SubRip Subtitle) files
 * SRT format:
 * 
 * 1
 * 00:00:01,000 --> 00:00:04,500
 * First subtitle line
 * (optional second line)
 *
 * 2
 * 00:00:05,000 --> 00:00:08,000
 * Second subtitle
 */

import { TranscriptSegment } from './transcriptStorage';

/**
 * Parses SRT timestamp to seconds
 * Format: HH:MM:SS,mmm (e.g., "00:01:30,500" = 90.5 seconds)
 */
export function parseSrtTimestamp(timestamp: string): number {
  const match = timestamp.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) {
    throw new Error(`Invalid SRT timestamp format: "${timestamp}"`);
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Parses SRT file content into TranscriptSegment array
 */
export function parseSrtContent(content: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Normalize line endings and split into blocks
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizedContent.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // First line should be the sequence number (we skip it)
    // Second line should be the timestamp range
    const timestampLine = lines[1];
    const timestampMatch = timestampLine.match(
      /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );

    if (!timestampMatch) {
      // Maybe it's a malformed block, skip it
      continue;
    }

    const startTime = parseSrtTimestamp(timestampMatch[1]);
    const endTime = parseSrtTimestamp(timestampMatch[2]);
    const duration = endTime - startTime;

    // Remaining lines are the subtitle text
    const textLines = lines.slice(2);
    const text = textLines.join(' ').trim();

    // Skip empty subtitles or those with only music notes/symbols
    if (!text || /^[🎵🎶\s]+$/.test(text)) {
      continue;
    }

    segments.push({
      start: startTime,
      duration: Math.max(duration, 0.1), // Ensure positive duration
      text,
    });
  }

  if (segments.length === 0) {
    throw new Error('No valid subtitles found in SRT file');
  }

  return segments;
}

/**
 * Extracts YouTube video ID from URL
 * Supports various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
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
