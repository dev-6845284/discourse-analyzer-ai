/**
 * Utility to group transcript segments into time-based blocks
 */

export interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

export interface SegmentTiming {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptBlock {
  blockId: string;
  startTime: number;
  endTime: number;
  duration: number;
  segments: TranscriptSegment[];
  text: string;
  segmentIndices: number[]; // Original indices in the segments array
  segmentTiming: SegmentTiming[]; // Structured timing data for speaker identification
}

/**
 * Groups transcript segments into time-based blocks
 * 
 * @param segments - Array of transcript segments
 * @param blockDurationMinutes - Duration of each block in minutes (default: 15)
 * @returns Array of TranscriptBlock objects
 */
export function groupTranscriptByTime(
  segments: TranscriptSegment[],
  blockDurationMinutes: number = 5
): TranscriptBlock[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const blockDurationSeconds = blockDurationMinutes * 60;

  const blocks: TranscriptBlock[] = [];
  let blockStartTime = 0;
  let blockNumber = 0;

  // Calculate total duration from last segment
  const lastSegment = segments[segments.length - 1];
  const totalDuration = lastSegment.start + lastSegment.duration;

  while (blockStartTime < totalDuration) {
    const blockEndTime = blockStartTime + blockDurationSeconds;
    
    const searchStartTime = blockStartTime;
    const searchEndTime = blockEndTime;

    const blockSegments: TranscriptSegment[] = [];
    const segmentIndices: number[] = [];

    segments.forEach((segment, index) => {
      const segmentEnd = segment.start + segment.duration;
      
      // Include segment if it overlaps with the block range
      if (segment.start < searchEndTime && segmentEnd > searchStartTime) {
        blockSegments.push(segment);
        segmentIndices.push(index);
      }
    });

    if (blockSegments.length > 0) {
      // Group text into 30s chunks with timestamps
      const CHUNK_SIZE = 30;
      let currentChunkStart = Math.floor(blockSegments[0].start / CHUNK_SIZE) * CHUNK_SIZE;
      let currentChunkText: string[] = [];
      const formattedParts: string[] = [];

      blockSegments.forEach((seg) => {
        const segStart = seg.start;
        
        // If this segment belongs to a new 30s chunk
        if (segStart >= currentChunkStart + CHUNK_SIZE) {
          if (currentChunkText.length > 0) {
            const minutes = Math.floor(currentChunkStart / 60);
            const seconds = Math.floor(currentChunkStart % 60);
            const timeStr = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
            formattedParts.push(`${timeStr} ${currentChunkText.join(' ')}`);
          }
          
          // Move to the next chunk bucket that contains this segment
          currentChunkStart = Math.floor(segStart / CHUNK_SIZE) * CHUNK_SIZE;
          currentChunkText = [];
        }
        currentChunkText.push(seg.text);
      });

      // Add the last chunk
      if (currentChunkText.length > 0) {
        const minutes = Math.floor(currentChunkStart / 60);
        const seconds = Math.floor(currentChunkStart % 60);
        const timeStr = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
        formattedParts.push(`${timeStr} ${currentChunkText.join(' ')}`);
      }

      const blockText = formattedParts.join('\n');

      // Build structured segment timing data for speaker identification
      const segmentTiming: SegmentTiming[] = blockSegments.map(seg => ({
        start: seg.start,
        end: seg.start + seg.duration,
        text: seg.text,
      }));
      
      blocks.push({
        blockId: `block-${blockNumber}`,
        startTime: blockStartTime,
        endTime: blockEndTime,
        duration: blockDurationSeconds,
        segments: blockSegments,
        text: blockText,
        segmentIndices,
        segmentTiming,
      });

      blockNumber++;
    }

    blockStartTime += blockDurationSeconds;
  }

  return blocks;
}
