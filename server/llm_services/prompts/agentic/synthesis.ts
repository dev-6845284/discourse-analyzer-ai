import { Quote, ArticleRecommendation } from '../../../types';

export const buildSynthesisPrompt = (
  personName: string,
  mode: 'quotes' | 'articles',
  searchResults: string,
  timePeriod: string,
  languages: string[]
): string => {
  const commonInstructions = `
You are an expert analyst. You have performed multiple searches for "${personName}".
Below are the aggregated search results (snippets and content).
Time Period: ${timePeriod}
Target Languages: ${languages.join(', ')}
`;

  if (mode === 'quotes') {
    return `${commonInstructions}

Your task is to extract specific quotes from these results.
1. Identify direct quotes spoken or written by ${personName}.
2. Ensure the quotes fall within the time period.
3. Deduplicate similar quotes.
4. Ignore quotes that are not from the target person (e.g., quotes *about* them).
5. If the text is in a language other than ${languages.join(' or ')}, translate the 'text' field to English but keep the original language code.

Return a JSON object with a "quotes" array.
Format:
{
  "quotes": [
    {
      "text": "The actual quote text",
      "source": "URL of the source",
      "title": "Title of the article/source",
      "date": "YYYY-MM-DD",
      "languageCode": "en",
      "languageName": "English"
    }
  ]
}
`;
  } else {
    return `${commonInstructions}

Your task is to recommend high-quality articles or sources that contain significant quotes or views of ${personName}.
Do NOT extract the full quotes text if it would violate recitation policies. Instead, summarize the content.

1. Identify the most relevant and credible sources from the search results.
2. Focus on interviews, long-form articles, or transcripts.
3. Ensure the content is relevant to the time period.

Return a JSON object with an "articles" array.
Format:
{
  "articles": [
    {
      "url": "URL of the source",
      "title": "Title of the article",
      "summary": "A brief summary of what ${personName} discusses in this article and why it is relevant.",
      "tags": ["topic1", "topic2", "keyword"],
      "relevanceScore": 85, // 0-100 based on relevance to the person and time period
      "publishedDate": "YYYY-MM-DD"
    }
  ]
}
`;
  }
};
