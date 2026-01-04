// Type exports
export * from './types';

// Shared prompt sections
export * from './shared';

// Topic Extraction prompts
export * from './topicExtraction';

// Fetch Quotes prompts (ChatGPT - two-stage)
export {
  buildFetchQuotesResearchPrompt,
  buildFetchQuotesFormattingPrompt,
} from './fetchQuotes';

// Analyze Quote prompts (ChatGPT - two-stage)
export {
  buildAnalyzeQuotePrompt,
  buildAnalyzeFlawsPrompt,
  buildAnalyzePromptByType,
  buildAnalyzeQuoteFormattingPrompt,
  buildAnalyzeFormattingPromptByType,
} from './analyzeQuote';

// Extract Quotes prompts (ChatGPT - two-stage)
export {
  buildExtractQuotesFromTextPrompt,
  buildExtractQuotesFromArticlePrompt,
  buildExtractQuotesFormattingPrompt,
} from './extractQuotes';

// Improve Quote prompts (ChatGPT - two-stage)
export {
  buildImproveQuoteResearchPrompt,
  buildImproveQuoteFormattingPrompt,
} from './improveQuote';

// Gemini-specific prompts (single-stage JSON)
export {
  buildGeminiFetchQuotesPrompt,
  buildGeminiExtractQuotesFromTextPrompt,
  buildGeminiExtractQuotesFromArticlePrompt,
  buildGeminiImproveQuotePrompt,
  type GeminiFetchQuotesPromptParams,
  type GeminiExtractQuotesFromTextPromptParams,
  type GeminiExtractQuotesFromArticlePromptParams,
  type GeminiImproveQuotePromptParams,
} from './gemini';

// Grok-specific prompts (single-stage JSON)
export {
  buildGrokFetchQuotesPrompt,
  buildGrokExtractQuotesFromTextPrompt,
  buildGrokExtractQuotesFromArticlePrompt,
  buildGrokImproveQuotePrompt,
  type GrokFetchQuotesPromptParams,
  type GrokExtractQuotesFromTextPromptParams,
  type GrokExtractQuotesFromArticlePromptParams,
  type GrokImproveQuotePromptParams,
} from './grok';

// Dialog Analysis prompts
export {
  buildInferInitialTopicPrompt,
  buildProcessChunkPrompt,
  buildMergeTopicsPrompt,
  buildAnalyzeSingleTopicPrompt,
  buildSpeakerIdentificationPrompt,
} from './dialogAnalysis';
