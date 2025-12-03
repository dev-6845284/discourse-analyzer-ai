import { TopicGroup, TopicAnalysis } from '../../types';
import { buildAnalyzeSingleTopicPrompt } from '../../llm_services/prompts';
import { callGemini, extractJsonFromResponse } from './utils';

/**
 * Phase 2: Analyze each topic group using a better model
 */
export async function analyzeTopics(
  groups: TopicGroup[],
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<TopicGroup[]> {
  const analyzedGroups: TopicGroup[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    console.log(`[DialogAnalysis] Analyzing topic ${i + 1}/${groups.length}: "${group.title}" (${group.dialogLines.length} lines)...`);
    const analysis = await analyzeSingleTopic(group, language, model, apiKeys);
    analyzedGroups.push({
      ...group,
      analysis
    });
  }

  return analyzedGroups;
}

async function analyzeSingleTopic(
  group: TopicGroup,
  language: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<TopicAnalysis> {
  const prompt = buildAnalyzeSingleTopicPrompt(group, language);

  const responseText = await callGemini(prompt, model, apiKeys['gemini']);
  const responseJson = extractJsonFromResponse(responseText);
  
  return {
    summaryItems: responseJson.summaryItems || []
  };
}
