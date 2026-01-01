import { AnalysisCategory, AnalysisRating, AuditCategory, SeverityLevel, Verdict, AuditResult, PersonInfo } from '../../types';

export type { AuditCategory, SeverityLevel, Verdict, AuditResult, PersonInfo };

/**
 * Time period for filtering quotes
 */
export interface TimePeriod {
  description: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Metadata about an article being processed
 */
export interface ArticleMetadata {
  url: string;
  title: string;
  byline: string | null;
  siteName: string | null;
}

/**
 * Reference link provided by user for analysis context
 */
export interface ReferenceLink {
  url: string;
  title?: string;
  type: 'quote' | 'context';
}

// ============================================================================
// Fetch Quotes Prompt Parameters
// ============================================================================

export interface FetchQuotesResearchPromptParams {
  personName: string;
  maxQuotes: number;
  timePeriod: TimePeriod;
  languages: string[];
  context: string[];
  maxQuoteLength: number;
  limitQuoteLength?: boolean;
}

export interface FetchQuotesFormattingPromptParams {
  maxQuotes: number;
  personName: string;
  timePeriod: TimePeriod;
  category: AnalysisCategory | 'all';
  rating: AnalysisRating | 'all';
  sortOrder: 'newest' | 'oldest';
  languages: string[];
  effectiveMaxQuoteLength: number;
  researchNotes: string;
}

// ============================================================================
// Analyze Quote Prompt Parameters
// ============================================================================

export interface AnalyzeQuotePromptParams {
  quoteText: string;
  quoteLanguageName: string;
  person?: PersonInfo;
  personName?: string;
  analysisContext?: string;
  links?: ReferenceLink[];
}

export interface AnalyzeQuoteFormattingPromptParams {
  quoteLanguageName: string;
  analysisNotes: string;
  analysisType?: 'audit' | 'flaws';
}
export interface ExtractQuotesFromTextPromptParams {
  personName: string;
  textContent: string;
}

export interface ExtractQuotesFromArticlePromptParams {
  personName: string;
  articleMetadata: ArticleMetadata;
  articleContent: string;
}

export interface ExtractQuotesFormattingPromptParams {
  personName?: string;
  extractionNotes: string;
}

// ============================================================================
// Improve Quote Prompt Parameters
// ============================================================================

export interface ImproveQuotePromptParams {
  personName: string;
  quoteText: string;
  languageName: string;
  languageCode: string;
}

export interface ImproveQuoteFormattingPromptParams {
  researchNotes: string;
}
