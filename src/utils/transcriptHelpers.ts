/**
 * Formats seconds as HH:MM:SS timestamp
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts timestamp string (HH:MM:SS or N/A) to seconds
 */
export function parseTimestamp(timestamp: string): number | null {
  if (timestamp === 'N/A' || !timestamp) return null;
  const parts = timestamp.split(':');
  if (parts.length !== 3) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secs = parseInt(parts[2], 10);
  if (isNaN(hours) || isNaN(minutes) || isNaN(secs)) return null;
  return hours * 3600 + minutes * 60 + secs;
}

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

/**
 * Constructs formatted transcript text with timestamps
 */
export function constructFormattedTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map(segment => `[${formatTimestamp(segment.start)}] ${segment.text}`)
    .join('\n');
}
