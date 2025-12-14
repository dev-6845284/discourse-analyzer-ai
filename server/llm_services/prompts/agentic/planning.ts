export const buildPlanningPrompt = (
  personName: string,
  timePeriod: string,
  topics?: string[],
  keywords?: string[]
): string => {
  const topicStr = topics && topics.length > 0 ? `\nFocus on these specific topics: ${topics.join(', ')}.` : '';
  const keywordStr = keywords && keywords.length > 0 ? `\nEnsure queries target these keywords: ${keywords.join(', ')}.` : '';

  return `You are an expert research planner. Your goal is to generate effective Google Search queries to find information about "${personName}".

Target Time Period: ${timePeriod}${topicStr}${keywordStr}

Your task:
Generate 4 distinct, specific search queries that will help uncover quotes, interviews, speeches, or news reports about this person within the specified constraints.
- Query 1: Broad search for recent quotes/news.
- Query 2: Targeted search for interviews or transcripts.
- Query 3: Search focusing on the specific topics (if provided) or controversial statements.
- Query 4: Search for official statements or social media context.

Return ONLY a raw JSON array of strings. Do not include markdown formatting.
Example: ["query 1", "query 2", "query 3", "query 4"]`;
};
