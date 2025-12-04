import React from 'react';
import { Copy, Download, Search as SearchIcon, FileJson, Upload, Zap } from 'lucide-react';
import Spinner from '../Spinner';

interface TranscriptSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onCopyText: () => void;
  onDownloadTranscript: () => void;
  onDownloadJSON: () => void;
  onImportSpeakers: () => void;
  onExportAnalysis: () => void;
  onImportAnalysis: () => void;
  onAnalyzeTopics: () => void;
  isAnalyzing: boolean;
}

export const TranscriptSearchBar: React.FC<TranscriptSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onCopyText,
  onDownloadTranscript,
  onDownloadJSON,
  onImportSpeakers,
  onExportAnalysis,
  onImportAnalysis,
  onAnalyzeTopics,
  isAnalyzing,
}) => {
  return (
    <div className="flex gap-3 p-4 border-b border-gray-700 flex-shrink-0 flex-wrap">
      <div className="flex-1 relative min-w-64">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search in transcript..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
        />
      </div>
      <button
        onClick={onCopyText}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Copy all text to clipboard"
      >
        <Copy size={18} />
        <span className="hidden sm:inline">Copy</span>
      </button>
      <button
        onClick={onDownloadTranscript}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Download transcript as text file"
      >
        <Download size={18} />
        <span className="hidden sm:inline">Download TXT</span>
      </button>
      <button
        onClick={onDownloadJSON}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Download transcript as JSON for re-import"
      >
        <FileJson size={18} />
        <span className="hidden sm:inline">Download JSON</span>
      </button>
      <button
        onClick={onImportSpeakers}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Import previously analyzed speakers data"
      >
        <Upload size={18} />
        <span className="hidden sm:inline">Import Speakers</span>
      </button>
      <button
        onClick={onExportAnalysis}
        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Export full analysis state"
      >
        <Download size={18} />
        <span className="hidden sm:inline">Export Analysis</span>
      </button>
      <button
        onClick={onImportAnalysis}
        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Import full analysis state"
      >
        <Upload size={18} />
        <span className="hidden sm:inline">Import Analysis</span>
      </button>
      <button
        onClick={onAnalyzeTopics}
        disabled={isAnalyzing}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Analyze topics in transcript"
      >
        {isAnalyzing ? (
          <Spinner />
        ) : (
          <Zap size={18} />
        )}
        <span className="hidden sm:inline">Analyze Topics</span>
      </button>
    </div>
  );
};

export default TranscriptSearchBar;
