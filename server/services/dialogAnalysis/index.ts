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
  sessionId?: string;
  logId?: string;
}

/**
 * Main function to analyze dialog topics
 */
export const analyzeDialogTopics = async (
  request: DialogAnalysisRequest
): Promise<TopicGroup[]> => {
  const { dialog, language, apiKeys, sessionId, logId } = request;
  if (apiKeys.GEMINI_API_KEY && apiKeys.GOOGLE_API_KEY) {
    delete apiKeys.GOOGLE_API_KEY;
  }
  const fastModel = request.fastModel || 'gemini-2.0-flash-exp';
  const betterModel = request.betterModel || 'gemini-2.5-flash';

  // 0. Preprocess: Flatten and assign timestamps
  const flatDialog = flattenDialog(dialog);

  if (flatDialog.length === 0) {
    console.log('[DialogAnalysis] No dialog lines to analyze.');
    return [];
  }

  console.log(`[DialogAnalysis] ==================== DIALOG ANALYSIS START ====================`);
  console.log(`[DialogAnalysis] Input: ${flatDialog.length} total dialog lines`);
  console.log(`[DialogAnalysis] Language: ${language}, Fast model: ${fastModel}, Better model: ${betterModel}`);

  // Phase 1: Topic Segmentation
  console.log(`[DialogAnalysis] Phase 1: Starting topic segmentation (${flatDialog.length} lines)...`);
  const topicGroups = await segmentTopics(flatDialog, language, fastModel, betterModel, apiKeys, sessionId, logId);
  const phase1Lines = topicGroups.reduce((sum, g) => sum + g.dialogLines.length, 0);
  console.log(`[DialogAnalysis] Phase 1 Complete. Identified ${topicGroups.length} topic groups (${phase1Lines} lines).`);
  
  if (phase1Lines !== flatDialog.length) {
    console.error(`[DialogAnalysis] ERROR: Data loss in Phase 1! Expected ${flatDialog.length} lines, got ${phase1Lines} lines.`);
  }

  // Phase 2: Merge Topics
  console.log(`[DialogAnalysis] Phase 2: Merging related topics (${topicGroups.length} groups, ${phase1Lines} lines)...`);
  const mergedGroups = await mergeTopics(topicGroups, language, betterModel, apiKeys, sessionId, logId);
  const phase2Lines = mergedGroups.reduce((sum, g) => sum + g.dialogLines.length, 0);
  
  if (phase2Lines !== phase1Lines) {
    console.error(`[DialogAnalysis] ERROR: Data loss in Phase 2! Expected ${phase1Lines} lines, got ${phase2Lines} lines.`);
  }

  // Phase 3: Topic Analysis
  console.log(`[DialogAnalysis] Phase 3: Starting topic analysis (${mergedGroups.length} groups, ${phase2Lines} lines)...`);
  const analyzedGroups = await analyzeTopics(mergedGroups, language, betterModel, apiKeys, sessionId, logId);
  const phase3Lines = analyzedGroups.reduce((sum, g) => sum + g.dialogLines.length, 0);
  
  if (phase3Lines !== phase2Lines) {
    console.error(`[DialogAnalysis] ERROR: Data loss in Phase 3! Expected ${phase2Lines} lines, got ${phase3Lines} lines.`);
  }

  console.log(`[DialogAnalysis] ==================== DIALOG ANALYSIS COMPLETE ====================`);
  console.log(`[DialogAnalysis] Final result: ${analyzedGroups.length} topic groups with ${phase3Lines} total lines`);
  
  if (phase3Lines !== flatDialog.length) {
    console.error(`[DialogAnalysis] ❌ CRITICAL: Total data loss detected! Started with ${flatDialog.length} lines, ended with ${phase3Lines} lines. Lost ${flatDialog.length - phase3Lines} lines.`);
  } else {
    console.log(`[DialogAnalysis] ✓ Data integrity verified: All ${flatDialog.length} lines preserved through analysis.`);
  }

  return analyzedGroups;
};
