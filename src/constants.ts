import { AnalysisCategory, AnalysisRating, AuditCategory, SeverityLevel, Verdict } from "./types";

// Legacy category colors (kept for backward compatibility)
export const CATEGORY_COLORS: Record<AnalysisCategory, string> = {
  [AnalysisCategory.Populism]: "bg-blue-600/20 text-blue-300 ring-blue-500/30",
  [AnalysisCategory.FactTwisting]: "bg-yellow-600/20 text-yellow-300 ring-yellow-500/30",
  [AnalysisCategory.FalseClaims]: "bg-red-600/20 text-red-300 ring-red-500/30",
  [AnalysisCategory.InflammatoryLanguage]: "bg-purple-600/20 text-purple-300 ring-purple-500/30",
};

// New audit category colors
export const AUDIT_CATEGORY_COLORS: Record<AuditCategory, string> = {
  [AuditCategory.VerifiableFalsehood]: "bg-red-600/20 text-red-300 ring-red-500/30",
  [AuditCategory.MisleadingFraming]: "bg-yellow-600/20 text-yellow-300 ring-yellow-500/30",
  [AuditCategory.RealityInversion]: "bg-purple-600/20 text-purple-300 ring-purple-500/30",
  [AuditCategory.ResponsibilityShifting]: "bg-orange-600/20 text-orange-300 ring-orange-500/30",
  [AuditCategory.UnsupportedAssertion]: "bg-blue-600/20 text-blue-300 ring-blue-500/30",
  [AuditCategory.NarrativeControl]: "bg-pink-600/20 text-pink-300 ring-pink-500/30",
};

// Legacy rating colors (title-case)
export const RATING_COLORS: Record<AnalysisRating, string> = {
  "None": "text-gray-400",
  "Low": "text-green-400",
  "Medium": "text-yellow-400",
  "High": "text-orange-400",
  "Severe": "text-red-500",
};

// New severity level colors (uppercase)
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  "NONE": "text-gray-400",
  "LOW": "text-green-400",
  "MEDIUM": "text-yellow-400",
  "HIGH": "text-orange-400",
  "SEVERE": "text-red-500",
};

// Verdict colors
export const VERDICT_COLORS: Record<Verdict, string> = {
  "TRUE": "bg-green-600/20 text-green-300 ring-green-500/30",
  "FALSE": "bg-red-600/20 text-red-300 ring-red-500/30",
  "MISLEADING": "bg-yellow-600/20 text-yellow-300 ring-yellow-500/30",
  "MANIPULATIVE": "bg-purple-600/20 text-purple-300 ring-purple-500/30",
  "UNFOUNDED": "bg-orange-600/20 text-orange-300 ring-orange-500/30",
};

// Legacy rating order
export const RATING_ORDER: Record<AnalysisRating, number> = {
  "None": 0,
  "Low": 1,
  "Medium": 2,
  "High": 3,
  "Severe": 4,
};

// New severity order
export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  "NONE": 0,
  "LOW": 1,
  "MEDIUM": 2,
  "HIGH": 3,
  "SEVERE": 4,
};

// Helper to convert severity to title-case for display
export const severityToDisplay = (severity: SeverityLevel): string => {
  return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
};

export const ALL_CATEGORIES = Object.values(AnalysisCategory);
export const ALL_AUDIT_CATEGORIES = Object.values(AuditCategory);

export const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Russian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'pl', name: 'Polish' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'fr', name: 'French' },
    { code: 'se', name: 'Swedish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'dk', name: 'Danish' },
    { code: 'es', name: 'Spanish' },
];