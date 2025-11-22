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

export type AnalysisResult = {
  [key in AnalysisCategory]: AnalysisDetail;
};

export interface Quote {
  id: string;
  text: string;
  source: string;
  title: string;
  date: string;
  languageCode: string;
  languageName: string;
  analysis?: AnalysisResult;
  isAnalyzing?: boolean;
  isImproving?: boolean;
}

export type GroundingChunk = {
  text: string;
  title: string;
  source: string;
};

export interface UserInfo {
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

export interface ExportData {
  personName: string;
  quotes: Quote[];
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
