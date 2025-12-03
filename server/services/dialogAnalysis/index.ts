import { SpeakerAnalysisResult } from '../speakerIdentificationService';
import { TopicGroup } from '../../types';
import { flattenDialog } from './preprocessing';
import { segmentTopics } from './segmentation';
import { mergeTopics } from './merging';
import { analyzeTopics } from './analysis';

export interface DialogAnalysisRequest {
  dialog: SpeakerAnalysisResult[]; // Input from previous step
  language: string;
  fastModel?: string; // Defaults to gemini-2.0-flash-exp or similar
  betterModel?: string; // Defaults to gemini-1.5-flash
  apiKeys: Record<string, string>;
}

/**
 * Main function to analyze dialog topics
 */
export const analyzeDialogTopics = async (
  request: DialogAnalysisRequest
): Promise<TopicGroup[]> => {
  const { dialog, language, apiKeys } = request;
  const fastModel = request.fastModel || 'gemini-2.0-flash-exp';
  const betterModel = request.betterModel || 'gemini-2.5-flash';

  // 0. Preprocess: Flatten and assign timestamps
  const flatDialog = flattenDialog(dialog);

  if (flatDialog.length === 0) {
    console.log('[DialogAnalysis] No dialog lines to analyze.');
    return [];
  }

  console.log(`[DialogAnalysis] Starting analysis for ${flatDialog.length} dialog lines.`);

  // Phase 1: Topic Segmentation
  console.log('[DialogAnalysis] Phase 1: Starting topic segmentation...');
  const topicGroups = await segmentTopics(flatDialog, language, fastModel, apiKeys);
  console.log(`[DialogAnalysis] Phase 1 Complete. Identified ${topicGroups.length} topic groups.`);

  // Phase 1.5: Merge Topics
  console.log('[DialogAnalysis] Phase 1.5: Merging related topics...');
  const mergedGroups = await mergeTopics(topicGroups, language, betterModel, apiKeys);
  console.log(`[DialogAnalysis] Phase 1.5 Complete. Reduced to ${mergedGroups.length} topic groups.`);

  // Phase 2: Topic Analysis
  console.log('[DialogAnalysis] Phase 2: Starting topic analysis...');
  const analyzedGroups = await analyzeTopics(mergedGroups, language, betterModel, apiKeys);
  console.log('[DialogAnalysis] Phase 2 Complete. Analysis finished.');

  return analyzedGroups;
};
