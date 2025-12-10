import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Zap } from 'lucide-react';
import { formatTimestamp } from '../../utils/transcriptHelpers';
import TopicTagCloud from '../TopicTagCloud';
import Spinner from '../Spinner';
import { TopicAnalysisResult } from '../../hooks/useTranscriptAnalysis';

interface TopicAnalysisViewProps {
  isAnalyzing: boolean;
  analysisProgress: number;
  results: TopicAnalysisResult[];
  error: string | null;
  selectedBlockIds: Set<string>;
  isSpeakerAnalyzing: boolean;
  onToggleBlockExpand: (blockId: string) => void;
  onToggleBlockSelection: (blockId: string) => void;
  onSelectAllBlocks: () => void;
  onClearSelections: () => void;
  onSegmentClick: (start: number) => void;
  onAnalyzeSpeakers: () => void;
  expandedBlocks: Set<string>;
}

export const TopicAnalysisView: React.FC<TopicAnalysisViewProps> = ({
  isAnalyzing,
  analysisProgress,
  results,
  error,
  selectedBlockIds,
  isSpeakerAnalyzing,
  onToggleBlockExpand,
  onToggleBlockSelection,
  onSelectAllBlocks,
  onClearSelections,
  onSegmentClick,
  onAnalyzeSpeakers,
  expandedBlocks,
}) => {
  if (isAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-300">
            Analyzing topics... {Math.round(analysisProgress)}%
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center text-red-400">
          <p>Error analyzing topics:</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-300">
          Found <strong>{results.length}</strong> transcript blocks with topics
        </p>
        <div className="flex gap-2">
          <button
            onClick={onSelectAllBlocks}
            className="text-xs px-3 py-1 bg-blue-600/30 text-blue-300 rounded hover:bg-blue-600/50"
          >
            Select All
          </button>
          <button
            onClick={onClearSelections}
            className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {results.map(block => (
        <div
          key={block.blockId}
          className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors"
        >
          {/* Block Header */}
          <div
            onClick={() => onToggleBlockExpand(block.blockId)}
            className="p-4 cursor-pointer hover:bg-gray-800/80 transition-colors flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBlockSelection(block.blockId);
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    block.isSelected
                      ? 'bg-green-600 border-green-500'
                      : 'border-gray-500 hover:border-gray-400'
                  }`}
                >
                  {block.isSelected && <Check size={16} className="text-white" />}
                </button>
                <span className="font-mono text-sm text-blue-400">
                  {formatTimestamp(block.startTime)} - {formatTimestamp(block.endTime)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSegmentClick(block.startTime);
                  }}
                  className="text-xs px-2 py-1 bg-blue-600/30 text-blue-300 rounded hover:bg-blue-600/50"
                >
                  Jump to Video
                </button>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">{block.summary}</p>
            </div>
            {expandedBlocks.has(block.blockId) ? (
              <ChevronUp size={20} className="text-gray-400 ml-2" />
            ) : (
              <ChevronDown size={20} className="text-gray-400 ml-2" />
            )}
          </div>

          {/* Block Content */}
          {expandedBlocks.has(block.blockId) && (
            <div className="p-4 border-t border-gray-700 bg-gray-900/50 space-y-4">
              <TopicTagCloud tags={block.tags} mainTopics={block.mainTopics} />
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2 font-semibold">Segments:</p>
                {block.segments && block.segments.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {block.segments.map((segment, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="font-mono text-blue-400 flex-shrink-0 w-12">
                          {formatTimestamp(segment.timestamp)}
                        </span>
                        {segment.endTime !== undefined && (
                          <span className="font-mono text-blue-400/60 flex-shrink-0">→ {formatTimestamp(segment.endTime)}</span>
                        )}
                        <span className="text-gray-400 flex-1">{segment.text}</span>
                        {segment.timingMismatch && (
                          <span className="text-amber-400 flex-shrink-0" title="Timing was fuzzy-matched">⚠</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 line-clamp-4">{block.text || '(No segment data)'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {selectedBlockIds.size > 0 && (
        <div className="sticky bottom-0 p-4 bg-gray-900 border-t border-gray-700 rounded-lg mt-4">
          <p className="text-sm text-gray-300 mb-2">
            <strong>{selectedBlockIds.size}</strong> blocks selected for detailed analysis
          </p>
          <button
            onClick={onAnalyzeSpeakers}
            disabled={isSpeakerAnalyzing}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSpeakerAnalyzing ? <Spinner /> : <Zap size={18} />}
            Analyze Selected Blocks (Identify Speakers)
          </button>
        </div>
      )}
    </div>
  );
};

export default TopicAnalysisView;
