import { ExtractQuotesFromArticlePromptParams } from '../types';

/**
 * Builds the extraction prompt for extracting quotes from a web article.
 * This prompt is context-aware and uses article metadata for better extraction.
 */
export function buildExtractQuotesFromArticlePrompt(params: ExtractQuotesFromArticlePromptParams): string {
  const { personName, articleMetadata, articleContent } = params;

  return `You are an expert at identifying and extracting direct quotes from news articles and interviews.

### Task
Analyze the following web article to extract all direct quotes, statements, and attributed speech by **${personName}**.

### Article Metadata
- Source: ${articleMetadata.siteName || 'Unknown'}
- Title: ${articleMetadata.title || 'Unknown'}
- Author/Byline: ${articleMetadata.byline || 'Unknown'}
- URL: ${articleMetadata.url}

### Extraction Rules
1. **Only extract verbatim quotes** - text that is directly attributed to ${personName} through:
   - Direct quotation marks ("..." or «...»)
   - Attribution phrases like "said", "stated", "according to", "wrote", "claimed", "announced"
   - Interview responses clearly attributed to the person
   
2. **Preserve the original language** - do not translate quotes
   
3. **Include context** - if multiple related quotes appear together, you may join them with ' | ' separator
   
4. **Identify the language** of each quote (e.g., English, Lithuanian, Russian)

5. **Skip**:
   - Paraphrased content or summaries about the person
   - Quotes from other people
   - Editorial commentary

### Article Content
---
${articleContent}
---

For each quote found, provide:
- The exact verbatim text
- The language (name and code)

If no quotes by ${personName} are found, state that clearly.`;
}
