import React, { useState, useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { parseAnalysisFromJson, FullAnalysisData } from '../utils/analysisStorage';

interface AnalysisImporterProps {
  onImport: (analysis: FullAnalysisData) => void;
  isLoading?: boolean;
}

export const AnalysisImporter: React.FC<AnalysisImporterProps> = ({
  onImport,
  isLoading = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pastedContent, setPastedContent] = useState('');

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const analysis = await parseAnalysisFromJson(file);
      onImport(analysis);
      
      // Reset
      setPastedContent('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import analysis');
    }
  };

  const handlePasteImport = async () => {
    if (!pastedContent.trim()) {
      setError('Please paste analysis JSON content');
      return;
    }

    setError(null);
    try {
      const blob = new Blob([pastedContent], { type: 'application/json' });
      const file = new File([blob], 'analysis.json', { type: 'application/json' });
      const analysis = await parseAnalysisFromJson(file);
      onImport(analysis);
      setPastedContent('');
    } catch (err: any) {
      setError(err.message || 'Failed to import analysis');
    }
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
        <Upload size={20} />
        Import Analysis Data
      </h2>

      <p className="text-sm text-gray-400">
        Import previously exported full analysis (topics, speakers, and dialog analysis)
      </p>

      {/* File Upload */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">Upload File</label>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            disabled={isLoading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Choose Analysis JSON File
          </button>
        </div>
      </div>

      {/* Paste Mode */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">Or Paste JSON Content</label>
        <textarea
          value={pastedContent}
          onChange={(e) => {
            setPastedContent(e.target.value);
            setError(null);
          }}
          placeholder="Paste analysis JSON export here..."
          disabled={isLoading}
          rows={6}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:bg-gray-600 disabled:cursor-not-allowed font-mono text-xs"
        />
      </div>

      {/* Import Button */}
      <button
        onClick={handlePasteImport}
        disabled={isLoading || !pastedContent.trim()}
        className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Importing...' : 'Import Analysis'}
      </button>

      {/* Error Message */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>
          Import full analysis data exported from the transcript viewer. This includes topic analysis, speaker identification, and dialog analysis results.
        </p>
      </div>
    </div>
  );
};

export default AnalysisImporter;
