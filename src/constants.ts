
import { AnalysisCategory, AnalysisRating } from "./types";

export const CATEGORY_COLORS: Record<AnalysisCategory, string> = {
  [AnalysisCategory.Populism]: "bg-blue-600/20 text-blue-300 ring-blue-500/30",
  [AnalysisCategory.FactTwisting]: "bg-yellow-600/20 text-yellow-300 ring-yellow-500/30",
  [AnalysisCategory.FalseClaims]: "bg-red-600/20 text-red-300 ring-red-500/30",
  [AnalysisCategory.InflammatoryLanguage]: "bg-purple-600/20 text-purple-300 ring-purple-500/30",
};

export const RATING_COLORS: Record<AnalysisRating, string> = {
  "None": "text-gray-400",
  "Low": "text-green-400",
  "Medium": "text-yellow-400",
  "High": "text-orange-400",
  "Severe": "text-red-500",
};

export const ALL_CATEGORIES = Object.values(AnalysisCategory);

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