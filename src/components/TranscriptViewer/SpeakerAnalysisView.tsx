import React from 'react';
import { Upload, Download, Zap } from 'lucide-react';
import { formatTimestamp } from '../../utils/transcriptHelpers';
import Spinner from '../Spinner';

interface DialogLine {
  speaker: string;
  text: string;
}

interface SpeakerBlock {
  blockId: string;
  startTime: number;
  endTime: number;
  identifiedSpeakers: string[];
  dialogue: DialogLine[];
}

interface SpeakerAnalysisViewProps {
  isSpeakerAnalyzing: boolean;
  speakerResults: SpeakerBlock[];
  error: string | null;
  onAnalyzeDialog: () => void;
  onImportSpeakers: () => void;
  onExportSpeakers: () => void;
  onClearAnalysis: () => void;
}

export const SpeakerAnalysisView: React.FC<SpeakerAnalysisViewProps> = ({
  isSpeakerAnalyzing,
  speakerResults,
  error,
  onAnalyzeDialog,
  onImportSpeakers,
  onExportSpeakers,
  onClearAnalysis,
}) => {
  if (isSpeakerAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-300">
            Identifying speakers...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center text-red-400">
          <p>Error analyzing speakers:</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (speakerResults.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800/30">
        <div className="text-center text-gray-400">
          <p className="mb-4">No speaker analysis data available.</p>
          <button
            onClick={onImportSpeakers}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
          >
            <Upload size={18} />
            Import Analysis JSON
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-300">
          Analyzed <strong>{speakerResults.length}</strong> blocks
        </p>
        <div className="flex gap-2">
          <button
            onClick={onAnalyzeDialog}
            className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
          >
            <Zap size={12} />
            Analyze Dialog Topics
          </button>
          <button
            onClick={onImportSpeakers}
            className="text-xs px-3 py-1 bg-blue-600/30 text-blue-300 rounded hover:bg-blue-600/50 flex items-center gap-1"
          >
            <Upload size={12} />
            Import
          </button>
          <button
            onClick={onExportSpeakers}
            className="text-xs px-3 py-1 bg-emerald-600/30 text-emerald-300 rounded hover:bg-emerald-600/50 flex items-center gap-1"
          >
            <Download size={12} />
            Export JSON
          </button>
          <button
            onClick={onClearAnalysis}
            className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Clear Analysis
          </button>
        </div>
      </div>

      {speakerResults.map(block => (
        <div
          key={block.blockId}
          className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden"
        >
          <div className="p-3 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
            <span className="font-mono text-sm text-blue-400">
              {formatTimestamp(block.startTime)} - {formatTimestamp(block.endTime)}
            </span>
            <div className="flex gap-2">
              {block.identifiedSpeakers.map(speaker => (
                <span key={speaker} className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                  {speaker}
                </span>
              ))}
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {block.dialogue.map((line, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-32 flex-shrink-0 text-right">
                  <span className="text-sm font-bold text-purple-400 block truncate" title={line.speaker}>
                    {line.speaker}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-300 leading-relaxed">{line.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SpeakerAnalysisView;
