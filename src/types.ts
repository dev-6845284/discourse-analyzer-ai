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
  // Flaws Categories
  Dehumanization = "Dehumanization",
  SymbolicViolence = "Symbolic Violence / Death-Wishing",
  HateSpeechAdjacent = "Hate-Speech Adjacent Rhetoric",
  AuthoritarianMobLogic = "Authoritarian / Mob Logic",
  DemocraticNormViolation = "Democratic Norm Violation",
  PsychologicalProfile = "Psychological & Rhetorical Profile",
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

// Legacy analysis result - kept for migration compatibility
// FIX: Changed from an interface to a mapped type. This improves type safety and inference
// when indexing the object with a variable of type AnalysisCategory, fixing errors in
// App.tsx and AnalysisReport.tsx.
export type AnalysisResult = {
  [key in AnalysisCategory]?: AnalysisDetail;
};

// New audit result with verdict and rationale
export interface StrictAuditResult {
  verdict: Verdict;
  rationale: string;
  categories: {
    [key in AuditCategory]: AuditDetail;
  };
}

export type FlawsClassification =
  | "TOXIC POLITICAL RHETORIC"
  | "DEHUMANIZING SPEECH"
  | "SYMBOLIC VIOLENCE"
  | "AUTHORITARIAN AGITATION"
  | "DEMOCRATICALLY DANGEROUS SPEECH";

export interface FlawsResult {
  verdict: FlawsClassification;
  /** @deprecated use verdict */
  classification?: FlawsClassification;
  finalAssessment: string;
  categories: {
    [key in AuditCategory]: AuditDetail;
  };
}

export type AuditResult = StrictAuditResult | FlawsResult;

export interface Quote {
  id?: string;
  _id?: string;
  text: string;
  source?: string;
  title?: string;
  date?: string;
  languageCode?: string;
  languageName?: string;
  analysisContext?: string;
  links?: Array<{ url: string; title?: string; type: 'quote' | 'context'; selected?: boolean }>;
  person?: string | Person; // Can be ID string or full Person object
  metadata?: {
    links?: Array<{ url: string; title?: string; type: 'quote' | 'context'; selected?: boolean }>;
    [key: string]: any;
  };
  /** @deprecated Use audit instead */
  analysis?: AnalysisResult;
  /** New strict audit result */
  audit?: AuditResult;
  isAnalyzing?: boolean;
  isImproving?: boolean;
  personName?: string;
  isStored?: boolean;
  draft?: Partial<Quote>;
  contentAnalysisId?: string;
  originIds?: string[];
  isDeprecated?: boolean;
  visibility?: 'public' | 'private';
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
  _id: string;
  email: string;
  name: string;
  alias?: string;
  picture?: string;
  // Constrain role to known values used in the UI
  role?: 'admin' | 'viewer' | 'moderator' | 'editor' | 'public_guest';
  createdAt?: string;
  updatedAt?: string;
  assignedKeysetId?: string;
  assignedKeysetAlias?: string;
}

// Backwards-compatible alias used by components that import 'User'
export type User = UserInfo;

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

export interface PersonLink {
  url: string;
  type: 'facebook' | 'tiktok' | 'instagram' | 'custom';
  isVisible: boolean;
}

export interface Person {
  _id?: string;
  name: string;
  firstname?: string;
  surname?: string;
  aliases?: string[];
  links?: PersonLink[];
  description?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
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
  visibility?: 'public' | 'private';
}

export interface CategoryDefinition {
  id: string;
  title: string;
  description: string;
  promptGuidance: string;
  modes: ('audit' | 'flaws')[];
  legacyNames?: string[];
  uiOrder?: number;
  translations?: Record<string, {
    title?: string;
    description?: string;
    promptGuidance?: string;
  }>;
}
