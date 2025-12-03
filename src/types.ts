export enum AnalysisCategory {
  Populism = "Populism",
  FactTwisting = "Fact Twisting",
  FalseClaims = "Lies & False Claims",
  InflammatoryLanguage = "Inflammatory Language",
}

export type AnalysisRating = "None" | "Low" | "Medium" | "High" | "Severe";

export interface AnalysisDetail {
  rating: AnalysisRating;
  justification: string;
}

// FIX: Changed from an interface to a mapped type. This improves type safety and inference
// when indexing the object with a variable of type AnalysisCategory, fixing errors in
// App.tsx and AnalysisReport.tsx.
export type AnalysisResult = {
  [key in AnalysisCategory]?: AnalysisDetail;
};

export interface Quote {
  id: string;
  text: string;
  source: string;
  title: string;
  date: string;
  languageCode: string;
  languageName: string;
  analysisContext?: string;
  links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>;
  metadata?: {
    links?: Array<{ url: string; title?: string; type: 'quote' | 'context' }>;
    [key: string]: any;
  };
  analysis?: AnalysisResult;
  isAnalyzing?: boolean;
  isImproving?: boolean;
  personName?: string;
  isStored?: boolean;
  draft?: Partial<Quote>;
  // Audit fields
  savedByUser?: string;
  savedByName?: string;
  savedAt?: string;
  analyzedByUser?: string;
  analyzedByName?: string;
  analyzedByProvider?: string;
  analyzedAt?: string;
  improvedByUser?: string;
  improvedByName?: string;
  improvedByProvider?: string;
  improvedAt?: string;
}

export interface AnalysisSession {
  _id: string;
  userId: string;
  sourceUrl: string;
  sourceType: 'youtube' | 'article' | 'text';
  status: 'created' | 'extracting_transcript' | 'analyzing_topics' | 'identifying_speakers' | 'grouping_dialog' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  error?: string;
  transcript?: any;
  topicAnalysis?: any;
  speakerAnalysis?: any;
  dialogAnalysis?: any;
}

export type LogCommand = 'fetchQuotes' | 'analyzeQuote' | 'improveQuote' | 'extractQuote';

export interface LogErrorDetails {
  message: string;
  stack?: string;
  rawResponse?: any;
  errorType?: string;
}

export interface ModelInteractionLog {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  operation: string;
  requestPayload: any;
  responsePayload?: any;
  error?: LogErrorDetails;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  command: LogCommand;
  requestPayload: any;
  responsePayload?: any;
  error?: LogErrorDetails;
  modelInteractions?: ModelInteractionLog[];
}

// FIX: Update GroundingChunk to match the @google/genai type.
// The `web` property and its nested `uri` and `title` properties are optional.
export type GroundingChunk = {
  web?: {
    uri?: string;
    title?: string;
  };
};

export interface UserInfo {
  _id?: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

export interface ArticleRecommendation {
  url: string;
  title: string;
  summary: string;
  tags: string[];
  relevanceScore: number;
  publishedDate?: string;
}

export type AgenticSearchResult = 
  | { type: 'quotes'; data: Quote[] }
  | { type: 'articles'; data: ArticleRecommendation[] };

export interface AgenticSearchOptions {
  mode: 'quotes' | 'articles';
  topics?: string[];
  keywords?: string[];
  searchDepth?: 'shallow' | 'deep';
}

export interface ExportData {
  personName: string;
  quotes: Quote[];
}

export interface Person {
  _id: string;
  name: string;
  firstname?: string;
  surname?: string;
  aliases: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteUpdatePayload {
  text?: string;
  person?: string;
  sourceUrl?: string;
  date?: string | Date;
  tags?: string[];
  context?: string;
  analysisContext?: string;
  metadata?: Record<string, any>;
  // Audit fields
  analyzedByProvider?: string;
  analyzedAt?: string;
  improvedByProvider?: string;
  improvedAt?: string;
}