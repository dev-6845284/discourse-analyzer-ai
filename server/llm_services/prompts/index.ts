// Type exports
export * from './types';

// Shared prompt sections
export * from './shared';

// Fetch Quotes prompts (ChatGPT - two-stage)
export {
  buildFetchQuotesResearchPrompt,
  buildFetchQuotesFormattingPrompt,
} from './fetchQuotes';

// Analyze Quote prompts (ChatGPT - two-stage)
export {
  buildAnalyzeQuotePrompt,
  buildAnalyzeQuoteFormattingPrompt,
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
  buildGeminiAnalyzeQuotePrompt,
  buildGeminiExtractQuotesFromTextPrompt,
  buildGeminiExtractQuotesFromArticlePrompt,
  buildGeminiImproveQuotePrompt,
  type GeminiFetchQuotesPromptParams,
  type GeminiAnalyzeQuotePromptParams,
  type GeminiExtractQuotesFromTextPromptParams,
  type GeminiExtractQuotesFromArticlePromptParams,
  type GeminiImproveQuotePromptParams,
} from './gemini';

// Grok-specific prompts (single-stage JSON)
export {
  buildGrokFetchQuotesPrompt,
  buildGrokAnalyzeQuotePrompt,
  buildGrokExtractQuotesFromTextPrompt,
  buildGrokExtractQuotesFromArticlePrompt,
  buildGrokImproveQuotePrompt,
  type GrokFetchQuotesPromptParams,
  type GrokAnalyzeQuotePromptParams,
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
