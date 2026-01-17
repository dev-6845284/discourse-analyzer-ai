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
  [AuditCategory.VerifiableFalsehood]: "bg-red-100 text-red-800 dark:bg-red-600/20 dark:text-red-300 ring-red-500/30",
  [AuditCategory.MisleadingFraming]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-600/20 dark:text-yellow-300 ring-yellow-500/30",
  [AuditCategory.RealityInversion]: "bg-purple-100 text-purple-800 dark:bg-purple-600/20 dark:text-purple-300 ring-purple-500/30",
  [AuditCategory.ResponsibilityShifting]: "bg-orange-100 text-orange-800 dark:bg-orange-600/20 dark:text-orange-300 ring-orange-500/30",
  [AuditCategory.UnsupportedAssertion]: "bg-blue-100 text-blue-800 dark:bg-blue-600/20 dark:text-blue-300 ring-blue-500/30",
  [AuditCategory.NarrativeControl]: "bg-pink-100 text-pink-800 dark:bg-pink-600/20 dark:text-pink-300 ring-pink-500/30",
  [AuditCategory.Dehumanization]: "bg-red-200 text-red-900 dark:bg-red-900/20 dark:text-red-400 ring-red-500/30",
  [AuditCategory.SymbolicViolence]: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-600/20 dark:text-fuchsia-300 ring-fuchsia-500/30",
  [AuditCategory.HateSpeechAdjacent]: "bg-rose-100 text-rose-800 dark:bg-rose-600/20 dark:text-rose-300 ring-rose-500/30",
  [AuditCategory.AuthoritarianMobLogic]: "bg-zinc-100 text-zinc-800 dark:bg-zinc-600/20 dark:text-zinc-300 ring-zinc-500/30",
  [AuditCategory.DemocraticNormViolation]: "bg-amber-100 text-amber-800 dark:bg-amber-600/20 dark:text-amber-300 ring-amber-500/30",
  [AuditCategory.PsychologicalProfile]: "bg-indigo-100 text-indigo-800 dark:bg-indigo-600/20 dark:text-indigo-300 ring-indigo-500/30",
};

// Legacy rating colors (title-case)
export const RATING_COLORS: Record<AnalysisRating, string> = {
  "None": "bg-gray-600/20 text-gray-400 ring-gray-500/30",
  "Low": "text-green-400",
  "Medium": "text-yellow-400",
  "High": "text-orange-400",
  "Severe": "text-red-500",
};

// Hex color mappings for legacy ratings (used by StrengthBar)
export const RATING_HEX: Record<AnalysisRating, string> = {
  "None": "#6b7280",
  "Low": "#34d399",
  "Medium": "#facc15",
  "High": "#fb923c",
  "Severe": "#ef4444",
};

// New severity level colors (uppercase)
// New severity level colors (uppercase)
export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  "NONE": "bg-gray-100 text-gray-800 dark:bg-gray-600/20 dark:text-gray-400 ring-gray-500/30",
  "LOW": "text-green-600 dark:text-green-400",
  "MEDIUM": "text-yellow-600 dark:text-yellow-400",
  "HIGH": "text-orange-600 dark:text-orange-400",
  "SEVERE": "text-red-700 dark:text-red-500",
};

// Hex color mappings for use in inline styles (e.g., StrengthBar)
export const SEVERITY_HEX: Record<SeverityLevel, string> = {
  "NONE": "#6b7280",
  "LOW": "#34d399",
  "MEDIUM": "#facc15",
  "HIGH": "#fb923c",
  "SEVERE": "#ef4444",
};

// Verdict colors
// Verdict colors
export const VERDICT_COLORS: Record<Verdict, string> = {
  "TRUE": "bg-green-100 text-green-800 dark:bg-green-600/20 dark:text-green-300 ring-green-500/30",
  "FALSE": "bg-red-100 text-red-800 dark:bg-red-600/20 dark:text-red-300 ring-red-500/30",
  "MISLEADING": "bg-yellow-100 text-yellow-800 dark:bg-yellow-600/20 dark:text-yellow-300 ring-yellow-500/30",
  "MANIPULATIVE": "bg-purple-100 text-purple-800 dark:bg-purple-600/20 dark:text-purple-300 ring-purple-500/30",
  "UNFOUNDED": "bg-orange-100 text-orange-800 dark:bg-orange-600/20 dark:text-orange-300 ring-orange-500/30",
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