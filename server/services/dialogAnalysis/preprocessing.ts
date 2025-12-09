import { SpeakerAnalysisResult } from './speakerIdentificationService';
import { DialogLine } from '../../types';

/**
 * Flattens the block-based speaker analysis result into a linear list of dialog lines with timestamps.
 * Uses actual timestamps from speaker identification (not interpolated).
 */
export function flattenDialog(blocks: SpeakerAnalysisResult[]): DialogLine[] {
  const flatLines: DialogLine[] = [];

  for (const block of blocks) {
    if (block.dialogue.length === 0) continue;

    block.dialogue.forEach((line) => {
      flatLines.push({
        speaker: line.speaker,
        text: line.text,
        timestamp: line.startTime, // Use actual start time
        endTime: line.endTime,     // Preserve end time
        timingMismatch: line.timingMismatch, // Preserve mismatch indicator
      });
    });
  }

  return flatLines.sort((a, b) => a.timestamp - b.timestamp);
}
