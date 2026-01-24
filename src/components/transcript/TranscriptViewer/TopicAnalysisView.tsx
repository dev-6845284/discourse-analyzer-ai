import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Zap } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { formatTimestamp } from '../../../utils/transcriptHelpers';
import TopicTagCloud from '../../ui/TopicTagCloud';
import Spinner from '../../ui/Spinner';
import { TopicAnalysisResult } from '../../../hooks/useTranscriptAnalysis';

import ModelSelector from '../../ui/ModelSelector';

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
  onClearAnalysis: () => void;
  onSegmentClick: (start: number) => void;
  onAnalyzeSpeakers: () => void;
  speakerHint?: string;
  onSpeakerHintChange?: (hint: string) => void;
  expandedBlocks: Set<string>;
  // Model selection
  selectedModel?: string;
  onModelChange?: (model: string) => void;
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
  onClearAnalysis,
  onSegmentClick,
  onAnalyzeSpeakers,
  speakerHint = '',
  onSpeakerHintChange,
  expandedBlocks,
  selectedModel,
  onModelChange,
}) => {
  const { t } = useI18n();

  if (isAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm min-h-[200px]">
        <div className="text-center text-cyan-600 dark:text-cyan-400">
          <Spinner className="w-8 h-8 mx-auto mb-4" />
          <p className="font-semibold text-lg animate-pulse">
            {t('analyzingTopics')} {Math.round(analysisProgress)}%
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm min-h-[200px]">
        <div className="text-center text-red-600 dark:text-red-400 p-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <p className="font-bold mb-1">{t('errorAnalyzingTopics')}</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/30 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600 dark:text-gray-300">
          {t('foundTranscriptBlocksWithTopics', { count: results.length })}
        </p>
        <div className="flex gap-2 items-center">
          {onModelChange && (
            <div className="w-40 mr-2">
              <ModelSelector
                value={selectedModel || ''}
                onChange={onModelChange}
                label={t('speakerModel') || "AI Model"}
                className="mb-0"
              />
            </div>
          )}
          <button
            onClick={onSelectAllBlocks}
            className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-600/50 h-9"
          >
            {t('selectAll')}
          </button>
          <button
            onClick={onClearSelections}
            className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 h-9"
          >
            {t('clearSelections')}
          </button>
          <button
            onClick={onClearAnalysis}
            className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 h-9"
          >
            {t('clearAnalysis')}
          </button>
        </div>
      </div>

      {results.map(block => (
        <div
          key={block.blockId}
          className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
        >
          {/* Block Header */}
          <div
            onClick={() => onToggleBlockExpand(block.blockId)}
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBlockSelection(block.blockId);
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${block.isSelected
                    ? 'bg-green-600 border-green-500'
                    : 'border-gray-300 dark:border-gray-500 hover:border-gray-400 dark:hover:border-gray-400 bg-white dark:bg-transparent'
                    }`}
                >
                  {block.isSelected && <Check size={16} className="text-white" />}
                </button>
                <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                  {formatTimestamp(block.startTime)} - {formatTimestamp(block.endTime)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSegmentClick(block.startTime);
                  }}
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-600/50"
                >
                  {t('jumpToVideo')}
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{block.summary}</p>
            </div>
            {expandedBlocks.has(block.blockId) ? (
              <ChevronUp size={20} className="text-gray-400 ml-2" />
            ) : (
              <ChevronDown size={20} className="text-gray-400 ml-2" />
            )}
          </div>

          {/* Block Content */}
          {expandedBlocks.has(block.blockId) && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
              <TopicTagCloud tags={block.tags} mainTopics={block.mainTopics} />
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">{t('segmentsLabel')}</p>
                {block.segments && block.segments.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {block.segments.map((segment, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="font-mono text-blue-600 dark:text-blue-400 flex-shrink-0 w-12">
                          {formatTimestamp(segment.timestamp)}
                        </span>
                        {segment.endTime !== undefined && (
                          <span className="font-mono text-blue-400/60 flex-shrink-0">→ {formatTimestamp(segment.endTime)}</span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400 flex-1">{segment.text}</span>
                        {segment.timingMismatch && (
                          <span className="text-amber-500 dark:text-amber-400 flex-shrink-0" title="Timing was fuzzy-matched">⚠</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4">{block.text || '(No segment data)'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {selectedBlockIds.size > 0 && (
        <div className="sticky bottom-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-lg mt-4 shadow-xl">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong>{selectedBlockIds.size}</strong> blocks selected for detailed analysis
          </p>

          {/* Speaker Hint Input */}
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('speakerHintOptional')}
            </label>
            <textarea
              value={speakerHint}
              onChange={(e) => onSpeakerHintChange?.(e.target.value)}
              placeholder={t('speakerHintPlaceholder')}
              rows={2}
              className="w-full bg-gray-50 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-300 text-sm rounded border dark:border-gray-600 px-3 py-2 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>



          <button
            onClick={onAnalyzeSpeakers}
            disabled={isSpeakerAnalyzing}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {isSpeakerAnalyzing ? <Spinner /> : <Zap size={18} />}
            {t('analyzeSelectedBlocksIdentifySpeakers')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TopicAnalysisView;
