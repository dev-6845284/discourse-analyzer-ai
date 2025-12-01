/**
 * Utility to group transcript segments into time-based blocks
 * Supports both preview mode (no overlap) and analysis mode (with overlap for context)
 */

export interface TranscriptSegment {
  start: number;
  duration: number;
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
}

/**
 * Formats seconds as HH:MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Groups transcript segments into time-based blocks
 * 
 * @param segments - Array of transcript segments
 * @param blockDurationMinutes - Duration of each block in minutes (default: 15)
 * @param overlapMinutes - Overlap between blocks for analysis context (default: 0 for preview, 1 for analysis)
 * @param mode - 'preview' (no overlap) or 'analysis' (with overlap)
 * @returns Array of TranscriptBlock objects
 */
export function groupTranscriptByTime(
  segments: TranscriptSegment[],
  blockDurationMinutes: number = 15,
  mode: 'preview' | 'analysis' = 'preview'
): TranscriptBlock[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const overlapMinutes = mode === 'analysis' ? 1 : 0;
  const blockDurationSeconds = blockDurationMinutes * 60;
  const overlapSeconds = overlapMinutes * 60;

  const blocks: TranscriptBlock[] = [];
  let blockStartTime = 0;
  let blockNumber = 0;

  while (blockStartTime < segments[segments.length - 1].start + segments[segments.length - 1].duration) {
    const blockEndTime = blockStartTime + blockDurationSeconds;
    
    // For analysis mode, overlap blocks by 1 minute (but don't overlap first block)
    const searchStartTime = blockNumber === 0 ? blockStartTime : blockStartTime - overlapSeconds;
    const searchEndTime = blockEndTime + (mode === 'analysis' ? overlapSeconds : 0);

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
      const blockText = blockSegments.map(seg => seg.text).join(' ');
      
      blocks.push({
        blockId: `block-${blockNumber}`,
        startTime: blockStartTime,
        endTime: blockEndTime,
        duration: blockDurationSeconds,
        segments: blockSegments,
        text: blockText,
        segmentIndices,
      });

      blockNumber++;
    }

    blockStartTime += blockDurationSeconds;
  }

  return blocks;
}

/**
 * Gets preview-mode blocks (non-overlapping, for initial viewing)
 */
export function getPreviewBlocks(segments: TranscriptSegment[]): TranscriptBlock[] {
  return groupTranscriptByTime(segments, 15, 'preview');
}

/**
 * Gets analysis-mode blocks (with 1-minute overlap for better context)
 */
export function getAnalysisBlocks(segments: TranscriptSegment[]): TranscriptBlock[] {
  return groupTranscriptByTime(segments, 15, 'analysis');
}

/**
 * Calculates statistics about transcript grouping
 */
export function getGroupingStats(segments: TranscriptSegment[], mode: 'preview' | 'analysis' = 'preview') {
  const blocks = groupTranscriptByTime(segments, 15, mode);
  
  if (blocks.length === 0) {
    return {
      totalBlocks: 0,
      totalDuration: 0,
      averageBlockDuration: 0,
      estimatedAnalysisTime: 0,
    };
  }

  const totalDuration = Math.max(...blocks.map(b => b.endTime));
  const averageBlockDuration = blocks.reduce((sum, b) => sum + b.segments.length, 0) / blocks.length;
  
  // Rough estimate: 10 seconds per block for quick analysis
  const estimatedAnalysisTime = blocks.length * 10;

  return {
    totalBlocks: blocks.length,
    totalDuration,
    averageBlockDuration,
    estimatedAnalysisTime,
  };
}
