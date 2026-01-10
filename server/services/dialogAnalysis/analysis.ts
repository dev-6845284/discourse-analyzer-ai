import { TopicGroup, TopicAnalysis } from '../../types';
import { buildAnalyzeSingleTopicPrompt } from '../../llm_services/prompts';
import { extractJsonFromResponse } from './utils';
import { generateContent } from './llmHelper';

/**
 * Phase 3: Analyze each topic group using a better model
 */
export async function analyzeTopics(
  groups: TopicGroup[],
  language: string,
  model: string,
  apiKeys: Record<string, string>,
  sessionId?: string,
  logId?: string
): Promise<TopicGroup[]> {
  const analyzedGroups: TopicGroup[] = [];
  
  const totalLinesInput = groups.reduce((sum, g) => sum + g.dialogLines.length, 0);
  console.log(`[DialogAnalysis] Phase 3: Analyzing ${groups.length} groups (${totalLinesInput} total lines)...`);

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    console.log(`[DialogAnalysis] Analyzing topic ${i + 1}/${groups.length}: "${group.title}" (${group.dialogLines.length} lines)...`);
    const analysis = await analyzeSingleTopic(group, language, model, apiKeys, sessionId, logId);
    analyzedGroups.push({
      ...group,
      analysis
    });
  }
  
  // Verify data integrity
  const totalLinesOutput = analyzedGroups.reduce((sum, g) => sum + g.dialogLines.length, 0);
  if (totalLinesInput !== totalLinesOutput) {
    console.error(`[DialogAnalysis] ERROR: Data loss in analysis phase! Input: ${totalLinesInput} lines, Output: ${totalLinesOutput} lines`);
  }

  return analyzedGroups;
}

async function analyzeSingleTopic(
  group: TopicGroup,
  language: string,
  model: string,
  apiKeys: Record<string, string>,
  sessionId?: string,
  logId?: string
): Promise<TopicAnalysis> {
  const prompt = buildAnalyzeSingleTopicPrompt(group, language);

  const responseText = await generateContent(model, apiKeys, {
    prompt,
    sessionId,
    logId,
    metadata: { task: 'dialog-analysis', stage: 'analyze-topic', topicId: group.id },
  });
  const responseJson = extractJsonFromResponse(responseText);
  
  // Ensure summaryItems are properly structured with text and timestamp fields
  const summaryItems = (responseJson.summaryItems || []).map((item: any) => {
    if (typeof item === 'string') {
      // Backward compatibility: convert old string format
      return { text: item, timestamp: 'N/A', importance: 0.5 };
    }
    
    let importance = typeof item.importance === 'number' ? item.importance : 0.5;
    // Normalize if the model returns 1-10 scale by mistake
    if (importance > 1) {
      importance = importance / 10;
    }
    // Clamp
    importance = Math.max(0.1, Math.min(1.0, importance));

    return {
      text: item.text || '',
      timestamp: item.timestamp || 'N/A',
      importance
    };
  });
  
  return {
    summaryItems
  };
}
