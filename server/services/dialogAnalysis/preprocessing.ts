import { SpeakerAnalysisResult } from '../speakerIdentificationService';
import { DialogLine } from '../../types';

/**
 * Flattens the block-based speaker analysis result into a linear list of dialog lines with timestamps.
 * Interpolates timestamps for lines within a block.
 */
export function flattenDialog(blocks: SpeakerAnalysisResult[]): DialogLine[] {
  const flatLines: DialogLine[] = [];

  for (const block of blocks) {
    const duration = block.endTime - block.startTime;
    const linesInBlock = block.dialogue.length;
    
    if (linesInBlock === 0) continue;

    // Simple linear interpolation for timestamps
    const timePerLine = duration / linesInBlock;

    block.dialogue.forEach((line, index) => {
      flatLines.push({
        speaker: line.speaker,
        text: line.text,
        timestamp: block.startTime + (index * timePerLine)
      });
    });
  }

  return flatLines.sort((a, b) => a.timestamp - b.timestamp);
}
