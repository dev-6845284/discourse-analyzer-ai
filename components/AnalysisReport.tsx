
import React from 'react';
// FIX: Import AnalysisDetail to use for type casting.
import { AnalysisResult, AnalysisCategory, AnalysisDetail } from '../types';
import { CATEGORY_COLORS, RATING_COLORS } from '../constants';

interface AnalysisReportProps {
  analysis: AnalysisResult;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ analysis }) => {
  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
      <h3 className="text-lg font-semibold text-cyan-300">Analysis Report</h3>
      {/* FIX: Cast Object.entries to provide strong types for category and detail, resolving property access errors. */}
      {(Object.entries(analysis) as [AnalysisCategory, AnalysisDetail][]).map(([category, detail]) => (
        <div key={category} className="p-3 bg-gray-800/50 rounded-lg">
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
      ))}
    </div>
  );
};

export default AnalysisReport;
