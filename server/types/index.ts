// Legacy categories - kept for migration compatibility
export enum AnalysisCategory {
  Populism = "Populism",
  FactTwisting = "Fact Twisting",
  FalseClaims = "Lies & False Claims",
  InflammatoryLanguage = "Inflammatory Language",
}

// New strict audit categories
export enum AuditCategory {
  VerifiableFalsehood = "Verifiable Falsehood",
  MisleadingFraming = "Misleading Framing",
  RealityInversion = "Reality Inversion",
  ResponsibilityShifting = "Responsibility Shifting",
  UnsupportedAssertion = "Unsupported Assertion",
  NarrativeControl = "Narrative Control / Propaganda",
}

// Legacy rating type - kept for migration compatibility
export type AnalysisRating = "None" | "Low" | "Medium" | "High" | "Severe";

// New severity levels (uppercase in data)
export type SeverityLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "SEVERE";

// Verdict types for audit conclusions
export type Verdict = "TRUE" | "FALSE" | "MISLEADING" | "MANIPULATIVE" | "UNFOUNDED";

// Legacy analysis detail - kept for migration compatibility
export interface AnalysisDetail {
  rating: AnalysisRating;
  justification: string;
}

// New audit detail with severity and evidence
export interface AuditDetail {
  severity: SeverityLevel;
  evidence: string;
}

export interface PersonInfo {
  _id?: string;
  name: string;
  firstname?: string;
  surname?: string;
  aliases?: string[];
  description?: string;
  metadata?: Record<string, any>;
}

// Legacy analysis result - kept for migration compatibility
export type AnalysisResult = {
  [key in AnalysisCategory]: AnalysisDetail;
};

// New audit result with verdict and rationale
// New audit result with verdict and rationale
export interface AuditResult {
  verdict: Verdict | string; // ToDo investigate, can string be removed?
  rationale?: string;
  finalAssessment?: string;
  classification?: string; // Legacy
  categories: {
    [key in AuditCategory]?: AuditDetail; // Allow optional keys for flexibility
  };
}

export interface Quote {
  id: string;
  text: string;
  source: string;
  title: string;
  date: string;
  languageCode: string;
  languageName: string;
  analysisContext?: string;
  links?: Array<{ url: string; title?: string; type: 'quote' | 'context'; selected?: boolean }>;
  /** @deprecated Use audit instead */
  analysis?: AnalysisResult;
  /** New strict audit result */
  audit?: AuditResult;
  isAnalyzing?: boolean;
  isImproving?: boolean;
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

export type GroundingChunk = {
  text: string;
  title: string;
  source: string;
};

export interface DialogLine {
  speaker: string;
  text: string;
  timestamp: number; // seconds (start time)
  endTime?: number; // seconds (end time)
  timingMismatch?: boolean; // true if timing was fuzzy-matched and may be inaccurate
}

export interface SummaryItem {
  text: string;
  timestamp: string; // Format: "HH:MM:SS" or "N/A"
  importance: number; // decimal, 0.1–1.0
  isSelected?: boolean;
  groupId?: number;
}

export interface TopicAnalysis {
  summaryItems: SummaryItem[];
}

export interface TopicGroup {
  id: string;
  title: string;
  dialogLines: DialogLine[];
  analysis?: TopicAnalysis;
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

export interface UserInfo {
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

// API Key set types
export interface ApiKeySet {
  _id?: string;
  alias: string;
  GEMINI_API_KEY?: string | null;
  GROK_API_KEY?: string | null;
  CHATGPT_API_KEY?: string | null;
  createdBy?: string; // user id
  updatedBy?: string; // user id
  createdAt?: string;
  updatedAt?: string;
}

export interface UserApiKeySet {
  _id?: string;
  userId: string;
  apiKeySetId: string;
  assignedAt?: string;
  assignedBy?: string;
  role?: string;
}

export interface ExportData {
  personName: string;
  quotes: Quote[];
}

export type LogCommand = 'fetchQuotes' | 'analyzeQuote' | 'improveQuote' | 'extractQuote' | 'agenticSearch' | 'analyze-dialog-topics' | 'identify-speakers';

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

/**
 * Custom error class for JSON parsing failures.
 * It includes the raw text response from the AI for debugging.
 */
export class JsonParsingError extends Error {
  public rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'JsonParsingError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Custom error class for failures due to the model's response being blocked.
 */
export class ModelResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelResponseError';
  }
}

/**
 * Custom error class for model validation failures (structure, missing categories, etc.).
 * Includes the raw text response to aid debugging and deterministic retries.
 */
export class ModelValidationError extends Error {
  public rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'ModelValidationError';
    this.rawResponse = rawResponse;
  }
}

export interface WeightedTag {
  tag: string;
  relevance: number; // 0-1, how relevant to main topics
  importance: number; // 0-1, how important/prominent
  frequency: number; // How many times mentioned (raw count)
}

export interface SegmentItem {
  timestamp: number; // seconds from start
  endTime?: number; // optional end time
  text: string;
  timingMismatch?: boolean; // true if timing was fuzzy-matched
}

export interface TopicAnalysisResult {
  blockId?: string;
  startTime?: number;
  endTime?: number;
  text?: string;
  segments?: SegmentItem[]; // Structured segments with separated timestamps
  mainTopics: string[]; // Top 3-5 main topics
  tags: WeightedTag[]; // All extracted tags with weights
  summary: string; // Brief 1-2 sentence summary of block content
}
