import React from 'react';
import { TranscriptSegment, formatTimestamp } from '../../utils/transcriptHelpers';

interface TranscriptSegmentListProps {
  segments: TranscriptSegment[];
  searchTerm: string;
  onSegmentClick: (start: number) => void;
  segmentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export const TranscriptSegmentList: React.FC<TranscriptSegmentListProps> = ({
  segments,
  searchTerm,
  onSegmentClick,
  segmentRefs,
}) => {
  const filteredSegments = !searchTerm.trim()
    ? segments
    : segments.filter(segment =>
        segment.text.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30">
      {filteredSegments.length > 0 ? (
        <div className="space-y-3 font-mono text-sm">
          {filteredSegments.map((segment, index) => {
            const isHighlighted = searchTerm && segment.text.toLowerCase().includes(searchTerm.toLowerCase());
            const displayIndex = segments.indexOf(segment);

            return (
              <div
                key={displayIndex}
                ref={(el) => {
                  if (el !== null) {
                    segmentRefs.current[index] = el;
                  }
                }}
                onClick={() => onSegmentClick(segment.start)}
                className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                  isHighlighted
                    ? 'bg-blue-900/40 border-blue-500 text-blue-100'
                    : 'bg-gray-800/40 border-gray-700 text-gray-300 hover:bg-gray-800/60 hover:border-gray-600'
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-blue-400 font-bold flex-shrink-0 min-w-fit group-hover:text-blue-300">
                    [{formatTimestamp(segment.start)}]
                  </span>
                  <span className="flex-1 leading-relaxed break-words">{segment.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>
            {searchTerm
              ? `No results found for "${searchTerm}"`
              : 'No transcript segments available'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TranscriptSegmentList;
