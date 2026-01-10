import { TopicGroup } from '../../types';
import { buildMergeTopicsPrompt } from '../../llm_services/prompts';
import { extractJsonFromResponse } from './utils';
import { generateContent } from './llmHelper';

/**
 * Phase 2: Merge adjacent topic groups that discuss the same broader topic
 */
export async function mergeTopics(
  groups: TopicGroup[],
  language: string,
  model: string,
  apiKeys: Record<string, string>,
  sessionId?: string,
  logId?: string
): Promise<TopicGroup[]> {
  if (groups.length <= 1) return groups;

  const totalLinesBefore = groups.reduce((sum, g) => sum + g.dialogLines.length, 0);
  console.log(`[DialogAnalysis] Merging: Starting with ${groups.length} groups (${totalLinesBefore} total lines)...`);

  // Prepare the list of topics for the model
  const prompt = buildMergeTopicsPrompt(groups, language);

  try {
    const responseText = await generateContent(model, apiKeys, {
      prompt,
      sessionId,
      logId,
      metadata: { task: 'dialog-analysis', stage: 'merge-topics' },
    });
    const responseJson = extractJsonFromResponse(responseText);
    
    if (!responseJson.groups || !Array.isArray(responseJson.groups)) {
      console.warn('[DialogAnalysis] Invalid merge response format. Skipping merge.');
      return groups;
    }

    const newGroups: TopicGroup[] = [];
    const processedIndices = new Set<number>();

    for (const mergedGroup of responseJson.groups) {
      const indices: number[] = mergedGroup.indices;
      if (!indices || indices.length === 0) continue;

      // Validate indices
      const validIndices = indices.filter(idx => 
        typeof idx === 'number' && 
        idx >= 0 && 
        idx < groups.length && 
        !processedIndices.has(idx)
      );

      if (validIndices.length === 0) continue;

      // Sort indices to ensure order
      validIndices.sort((a, b) => a - b);

      // Create new merged group
      const firstGroup = groups[validIndices[0]];
      const newGroup: TopicGroup = {
        id: firstGroup.id, // Keep ID of the first group
        title: mergedGroup.title || firstGroup.title,
        dialogLines: []
      };

      // Concatenate dialog lines
      for (const idx of validIndices) {
        newGroup.dialogLines.push(...groups[idx].dialogLines);
        processedIndices.add(idx);
      }

      newGroups.push(newGroup);
    }

    // Check if we missed any groups (fallback) - THIS IS CRITICAL FOR DATA INTEGRITY
    const missedIndices: number[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (!processedIndices.has(i)) {
        missedIndices.push(i);
        newGroups.push(groups[i]);
      }
    }
    
    if (missedIndices.length > 0) {
      console.warn(`[DialogAnalysis] WARNING: ${missedIndices.length} groups not in merge response. Added as-is: ${missedIndices.join(', ')}`);
    }

    // Sort by timestamp of first line to maintain order
    newGroups.sort((a, b) => {
      const timeA = a.dialogLines[0]?.timestamp || 0;
      const timeB = b.dialogLines[0]?.timestamp || 0;
      return timeA - timeB;
    });

    const newGroupsFiltered = newGroups.filter(g => g.dialogLines.length > 0);
    const totalLinesAfter = newGroupsFiltered.reduce((sum, g) => sum + g.dialogLines.length, 0);
    
    // CRITICAL: Verify no data loss during merge
    if (totalLinesBefore !== totalLinesAfter) {
      console.error(`[DialogAnalysis] ERROR: Data loss during merge! Before: ${totalLinesBefore} lines, After: ${totalLinesAfter} lines. Difference: ${totalLinesBefore - totalLinesAfter}`);
    } else {
      console.log(`[DialogAnalysis] Merge complete: ${groups.length} groups → ${newGroupsFiltered.length} groups (${totalLinesAfter} lines preserved)`);
    }

    return newGroupsFiltered;

  } catch (error) {
    console.error('[DialogAnalysis] Error merging topics:', error);
    return groups; // Fallback to original groups on error
  }
}
