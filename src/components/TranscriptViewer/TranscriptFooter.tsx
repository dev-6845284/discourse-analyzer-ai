import React from 'react';

interface TranscriptFooterProps {
  filteredSegmentsCount: number;
  totalSegmentsCount: number;
  searchTerm: string;
}

export const TranscriptFooter: React.FC<TranscriptFooterProps> = ({
  filteredSegmentsCount,
  totalSegmentsCount,
  searchTerm,
}) => {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-white dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
      <span>
        Showing {filteredSegmentsCount} of {totalSegmentsCount} segments
        {searchTerm && ` (searched for "${searchTerm}")`}
      </span>
    </div>
  );
};

export default TranscriptFooter;
