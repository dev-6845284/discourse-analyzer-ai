import React, { useState, useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { parseAnalysisFromJson, FullAnalysisData } from '../utils/analysisStorage';
import { useI18n } from '../i18n';

interface AnalysisImporterProps {
  onImport: (analysis: FullAnalysisData) => void;
  isLoading?: boolean;
}

export const AnalysisImporter: React.FC<AnalysisImporterProps> = ({
  onImport,
  isLoading = false,
}) => {
  const { t } = useI18n();
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
      setError(err.message || t('failedToImportAnalysisFile'));
    }
  };

  const handlePasteImport = async () => {
    if (!pastedContent.trim()) {
      setError(t('pleasePasteAnalysisJsonContent'));
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
      setError(err.message || t('failedToImportAnalysisFile'));
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-4 flex items-center gap-2">
        <Upload size={20} />
        {t('importAnalysisTitle')}
      </h2>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('importAnalysisDescription')}
      </p>

      {/* File Upload */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('uploadFile')}</label>
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
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('chooseAnalysisJsonFile')}
          </button>
        </div>
      </div>

      {/* Paste Mode */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('importAnalysisOrPaste')}</label>
        <textarea
          value={pastedContent}
          onChange={(e) => {
            setPastedContent(e.target.value);
            setError(null);
          }}
          placeholder={t('pasteAnalysisJsonPlaceholder')}
          disabled={isLoading}
          rows={6}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed font-mono text-xs"
        />
      </div>

      {/* Import Button */}
      <button
        onClick={handlePasteImport}
        disabled={isLoading || !pastedContent.trim()}
        className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {isLoading ? t('importing') : t('importAnalysis')}
      </button>

      {/* Error Message */}
      {error && (
        <div className="flex gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>
          {t('importAnalysisHelp')}
        </p>
      </div>
    </div>
  );
};

export default AnalysisImporter;
