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
  personName?: string;
  isStored?: boolean;
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
  email: string;
  name: string;
  picture?: string;
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