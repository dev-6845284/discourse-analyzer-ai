
import React from 'react';
// FIX: Import AnalysisDetail to use for type casting.
import { AnalysisResult, AnalysisCategory, AnalysisDetail } from '../types';
import { CATEGORY_COLORS, RATING_COLORS } from '../constants';

interface AnalysisReportProps {
  analysis: AnalysisResult;
  selectable?: boolean;
  selectedCategories?: AnalysisCategory[];
  onToggleCategory?: (category: AnalysisCategory) => void;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ 
  analysis, 
  selectable = false, 
  selectedCategories = [], 
  onToggleCategory 
}) => {
  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
      <h3 className="text-lg font-semibold text-cyan-300">Analysis Report</h3>
      {/* FIX: Cast Object.entries to provide strong types for category and detail, resolving property access errors. */}
      {(Object.entries(analysis) as [AnalysisCategory, AnalysisDetail][]).map(([category, detail]) => (
        <div key={category} className={`p-3 bg-gray-800/50 rounded-lg flex gap-3 ${selectable && !selectedCategories.includes(category) ? 'opacity-50' : ''}`}>
          {selectable && onToggleCategory && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => onToggleCategory(category)}
                className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 bg-gray-700"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex justify-between items-center">
               <span className={`px-2 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${CATEGORY_COLORS[category]}`}>
                {category}
              </span>
              <span className={`font-bold text-sm ${RATING_COLORS[detail.rating]}`}>
                {detail.rating}
              </span>
            </div>
            <p className="mt-2 text-gray-300 text-sm">{detail.justification}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnalysisReport;
