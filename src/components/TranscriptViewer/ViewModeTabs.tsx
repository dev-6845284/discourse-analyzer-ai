import React from 'react';
import { Zap } from 'lucide-react';

interface ViewModeTabs {
  viewMode: 'transcript' | 'topics' | 'speakers' | 'dialog';
  topicResultsCount: number;
  speakerResultsCount: number;
  dialogResultsCount: number;
  isAnalyzing: boolean;
  onViewModeChange: (mode: 'transcript' | 'topics' | 'speakers' | 'dialog') => void;
  onAnalyzeTopics: () => void;
}

export const ViewModeTabs: React.FC<ViewModeTabs> = ({
  viewMode,
  topicResultsCount,
  speakerResultsCount,
  dialogResultsCount,
  isAnalyzing,
  onViewModeChange,
  onAnalyzeTopics,
}) => {
  return (
    <div className="flex gap-2 p-4 border-b border-gray-700 flex-shrink-0 bg-gray-800/30 flex-wrap">
      <button
        onClick={() => onViewModeChange('transcript')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          viewMode === 'transcript'
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Transcript
      </button>
      <button
        onClick={() => {
          if (topicResultsCount === 0) {
            onAnalyzeTopics();
          } else {
            onViewModeChange('topics');
          }
        }}
        disabled={isAnalyzing}
        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
          viewMode === 'topics'
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50'
        }`}
      >
        <Zap size={16} />
        Topics {topicResultsCount > 0 && `(${topicResultsCount})`}
      </button>
      <button
        onClick={() => onViewModeChange('speakers')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
          viewMode === 'speakers'
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Speakers {speakerResultsCount > 0 && `(${speakerResultsCount})`}
      </button>
      <button
        onClick={() => onViewModeChange('dialog')}
        disabled={speakerResultsCount === 0}
        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
          viewMode === 'dialog'
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50'
        }`}
      >
        Dialog Analysis {dialogResultsCount > 0 && `(${dialogResultsCount})`}
      </button>
    </div>
  );
};

export default ViewModeTabs;
