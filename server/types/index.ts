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
}

export interface ExportData {
  personName: string;
  quotes: Quote[];
}

export type LogCommand = 'fetchQuotes' | 'analyzeQuote' | 'improveQuote' | 'extractQuote';

export interface LogEntry {
  id: string;
  timestamp: string;
  command: LogCommand;
  requestPayload: any;
  responsePayload?: any;
  error?: any;
}
