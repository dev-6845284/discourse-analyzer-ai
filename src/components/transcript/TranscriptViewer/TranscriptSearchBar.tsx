import React from 'react';
import { Copy, Download, Search as SearchIcon, FileJson, Upload } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface TranscriptSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onCopyText: () => void;
  onDownloadTranscript: () => void;
  onDownloadJSON: () => void;
  onImportSpeakers: () => void;
  onExportAnalysis: () => void;
  onImportAnalysis: () => void;
  hasAnalysisData: boolean; // True if any analysis step has data
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
  hasAnalysisData,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-3 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex-wrap bg-white dark:bg-gray-900">
      <div className="flex-1 relative min-w-0">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchInTranscript')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white text-gray-900 border border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:border-cyan-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-cyan-500/50 dark:focus:ring-blue-500/50 placeholder-gray-400"
        />
      </div>
      <button
        onClick={onCopyText}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title={t('copyAllTextToClipboard')}
      >
        <Copy size={18} />
        <span className="hidden sm:inline">{t('copy')}</span>
      </button>
      <button
        onClick={onDownloadTranscript}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title={t('downloadTranscriptAsText')}
      >
        <Download size={18} />
        <span className="hidden sm:inline">{t('downloadTxt')}</span>
      </button>
      <button
        onClick={onDownloadJSON}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title={t('downloadTranscriptAsJson')}
      >
        <FileJson size={18} />
        <span className="hidden sm:inline">{t('downloadJson')}</span>
      </button>
      <button
        onClick={onImportSpeakers}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title={t('importPreviouslyAnalyzedSpeakers')}
      >
        <Upload size={18} />
        <span className="hidden sm:inline">{t('importSpeakers')}</span>
      </button>
      {hasAnalysisData && (
        <button
          onClick={onExportAnalysis}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          title={t('exportFullAnalysisState')}
        >
          <Download size={18} />
          <span className="hidden sm:inline">{t('exportAnalysis')}</span>
        </button>
      )}
      <button
        onClick={onImportAnalysis}
        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title={t('importFullAnalysisState')}
      >
        <Upload size={18} />
        <span className="hidden sm:inline">{t('importAnalysis')}</span>
      </button>
    </div>
  );
};

export default TranscriptSearchBar;
