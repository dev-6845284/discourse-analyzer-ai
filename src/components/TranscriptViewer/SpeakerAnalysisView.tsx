import React from 'react';
import { Upload, Download, Zap } from 'lucide-react';
import { formatTimestamp } from '../../utils/transcriptHelpers';
import Spinner from '../Spinner';

interface DialogLine {
  speaker: string;
  text: string;
  startTime?: number;
  endTime?: number;
  timestamp?: string;
  timingMismatch?: boolean;
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
  onAnalyzeDialog: (languageCode?: string) => void;
  onImportSpeakers: () => void;
  onExportSpeakers: () => void;
  onClearAnalysis: () => void;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

export const SpeakerAnalysisView: React.FC<SpeakerAnalysisViewProps> = ({
  isSpeakerAnalyzing,
  speakerResults,
  error,
  onAnalyzeDialog,
  onImportSpeakers,
  onExportSpeakers,
  onClearAnalysis,
  selectedLanguage = 'en',
  onLanguageChange,
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
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 mr-2">
            <label htmlFor="speaker-language-select" className="text-xs text-gray-400">Language:</label>
            <select
              id="speaker-language-select"
              value={selectedLanguage}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              className="bg-gray-800 text-gray-300 text-xs rounded border border-gray-600 px-2 py-1 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="en">English</option>
              <option value="lt">Lithuanian</option>
              <option value="ru">Russian</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pl">Polish</option>
              <option value="uk">Ukrainian</option>
            </select>
          </div>
          <button
            onClick={() => onAnalyzeDialog(selectedLanguage)}
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
          
          <div className="p-4">
            {/* Table header */}
            <div className="grid grid-cols-[80px_80px_150px_1fr] gap-3 mb-3 pb-3 border-b border-gray-700 text-xs font-semibold text-gray-400">
              <div>Start</div>
              <div>End</div>
              <div>Speaker</div>
              <div>Text</div>
            </div>
            
            {/* Dialogue rows */}
            <div className="space-y-1">
              {block.dialogue.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[80px_80px_150px_1fr] gap-3 text-xs py-2 hover:bg-gray-700/30 rounded px-2 transition-colors">
                  <div className="font-mono text-blue-400">
                    {line.startTime !== undefined ? formatTimestamp(line.startTime) : '—'}
                  </div>
                  <div className="font-mono text-blue-400/60">
                    {line.endTime !== undefined ? formatTimestamp(line.endTime) : '—'}
                  </div>
                  <div className="text-purple-400 font-semibold truncate" title={line.speaker}>
                    {line.speaker}
                  </div>
                  <div className="text-gray-300 flex items-center gap-2">
                    <span className="flex-1">{line.text}</span>
                    {line.timingMismatch && (
                      <span className="text-amber-400 flex-shrink-0" title="Timing was fuzzy-matched">⚠</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SpeakerAnalysisView;
