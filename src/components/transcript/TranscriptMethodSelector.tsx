import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Copy,
  Bookmark,
  FileText,
  CheckCircle,
  AlertTriangle,
  Settings,
  Youtube
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { TranscriptData } from '../../utils/transcriptStorage';
import { YoutubeTranscriptCopyPaste } from './YoutubeTranscriptCopyPaste';
// import { BookmarkletImporter } from './BookmarkletImporter';
import { SrtTranscriptImporter } from './SrtTranscriptImporter';
import { TranscriptImporter } from './TranscriptImporter';

export type TranscriptFetchMethod = 'auto' | 'copy-paste' | 'srt' | 'json' | 'plain-text';

interface TranscriptMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transcript: TranscriptData) => void;
  onAutoFetch?: (url: string) => Promise<void>;
  autoFetchError?: string | null;
  isLoading?: boolean;
}

const STORAGE_KEY = 'discourse-analyzer-transcript-method';

const METHOD_INFO: Record<TranscriptFetchMethod, {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  prosKeys: string[];
  consKeys: string[];
}> = {
  auto: {
    icon: <Zap size={20} />,
    titleKey: 'method_auto_title',
    descriptionKey: 'method_auto_description',
    prosKeys: ['method_auto_pro_1', 'method_auto_pro_2'],
    consKeys: ['method_auto_con_1', 'method_auto_con_2'],
  },
  'copy-paste': {
    icon: <Copy size={20} />,
    titleKey: 'method_copy_paste_title',
    descriptionKey: 'method_copy_paste_description',
    prosKeys: ['method_copy_paste_pro_1', 'method_copy_paste_pro_2', 'method_copy_paste_pro_3'],
    consKeys: ['method_copy_paste_con_1', 'method_copy_paste_con_2'],
  },
  // bookmarklet removed
  'plain-text': {
    icon: <FileText size={20} />,
    titleKey: 'method_plain_text_title',
    descriptionKey: 'method_plain_text_description',
    prosKeys: ['method_plain_text_pro_1', 'method_plain_text_pro_2', 'method_plain_text_pro_3'],
    consKeys: ['method_plain_text_con_1', 'method_plain_text_con_2'],
  },
  srt: {
    icon: <FileText size={20} />,
    titleKey: 'method_srt_title',
    descriptionKey: 'method_srt_description',
    prosKeys: ['method_srt_pro_1', 'method_srt_pro_2'],
    consKeys: ['method_srt_con_1'],
  },
  json: {
    icon: <FileText size={20} />,
    titleKey: 'method_json_title',
    descriptionKey: 'method_json_description',
    prosKeys: ['method_json_pro_1', 'method_json_pro_2'],
    consKeys: ['method_json_con_1'],
  },
};

export const TranscriptMethodSelector: React.FC<TranscriptMethodSelectorProps> = ({
  isOpen,
  onClose,
  onImport,
  onAutoFetch,
  autoFetchError,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [selectedMethod, setSelectedMethod] = useState<TranscriptFetchMethod>('auto');
  const [defaultMethod, setDefaultMethod] = useState<TranscriptFetchMethod>('auto');
  const [autoFetchUrl, setAutoFetchUrl] = useState('');

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as TranscriptFetchMethod | null;
    if (saved && METHOD_INFO[saved]) {
      setDefaultMethod(saved);
      setSelectedMethod(saved);
    }
  }, []);

  // Save preference when changed
  const handleSetDefault = (method: TranscriptFetchMethod) => {
    setDefaultMethod(method);
    localStorage.setItem(STORAGE_KEY, method);
  };

  const handleAutoFetch = () => {
    if (onAutoFetch && autoFetchUrl.trim()) {
      onAutoFetch(autoFetchUrl.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-full sm:max-w-lg md:max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Youtube className="text-red-600 dark:text-red-500" size={24} />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-cyan-400">{t('getYouTubeTranscriptTitle')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('choosePreferredMethod')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Method Selection Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {(Object.keys(METHOD_INFO) as TranscriptFetchMethod[]).map((method) => {
            const info = METHOD_INFO[method];
            const isSelected = selectedMethod === method;
            const isDefault = defaultMethod === method;

            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-normal sm:whitespace-nowrap transition-colors border-b-2 ${isSelected
                  ? 'text-cyan-700 border-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:border-cyan-400 dark:bg-gray-800/50'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/30'
                  }`}
              >
                {info.icon}
                <span>{t(info.titleKey)}</span>
                {isDefault && (
                  <span className="px-1.5 py-0.5 text-xs bg-cyan-100 text-cyan-800 dark:bg-cyan-600/30 dark:text-cyan-300 rounded">
                    {t('default')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {/* Method Description Card */}
          <div className="mb-4 p-4 bg-white border border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 rounded-lg shadow-sm dark:shadow-none">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 text-cyan-600 dark:bg-gray-700 dark:text-cyan-400 rounded-lg">
                  {METHOD_INFO[selectedMethod].icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-cyan-400">{t(METHOD_INFO[selectedMethod].titleKey)}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t(METHOD_INFO[selectedMethod].descriptionKey)}</p>
                </div>
              </div>
              <button
                onClick={() => handleSetDefault(selectedMethod)}
                disabled={defaultMethod === selectedMethod}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors border ${defaultMethod === selectedMethod
                  ? 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-600/20 dark:text-cyan-400 dark:border-transparent cursor-default'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-transparent dark:hover:bg-gray-600 dark:hover:text-white'
                  }`}
              >
                <Settings size={14} />
                {defaultMethod === selectedMethod ? t('defaultMethod') : t('setAsDefault')}
              </button>
            </div>

            {/* Pros/Cons */}
            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                {METHOD_INFO[selectedMethod].prosKeys.map((proKey, i) => (
                  <div key={i} className="flex items-center gap-1 text-green-700 dark:text-green-400 mb-1">
                    <CheckCircle size={12} />
                    <span>{t(proKey)}</span>
                  </div>
                ))}
              </div>
              <div>
                {METHOD_INFO[selectedMethod].consKeys.map((conKey, i) => (
                  <div key={i} className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 mb-1">
                    <AlertTriangle size={12} />
                    <span>{t(conKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Error Banner (for auto method) */}
          {autoFetchError && selectedMethod === 'auto' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 text-sm flex items-start gap-2 rounded-lg">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t('serverFetchFailed')}</p>
                <p className="text-red-600 dark:text-red-400">{autoFetchError}</p>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{t('tryAlternativeMethods')}</p>
              </div>
            </div>
          )}

          {/* Method-Specific Content */}
          {selectedMethod === 'auto' && (
            <div className="p-4 bg-white border border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 rounded-lg space-y-4 shadow-sm dark:shadow-none">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-yellow-500 dark:text-yellow-400" />
                {t('method_auto_title')}
              </h3>
              <div className="space-y-3">
                <input
                  type="url"
                  value={autoFetchUrl}
                  onChange={(e) => setAutoFetchUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white text-gray-900 border border-gray-300 focus:border-cyan-500 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-1"
                />
                <button
                  onClick={handleAutoFetch}
                  disabled={isLoading || !autoFetchUrl.trim()}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:to-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  <Zap size={18} />
                  {isLoading ? t('fetching') : t('fetchTranscript')}
                </button>
              </div>
            </div>
          )}

          {selectedMethod === 'copy-paste' && (
            <YoutubeTranscriptCopyPaste onImport={onImport} isLoading={isLoading} />
          )}

          {selectedMethod === 'plain-text' && (
            <TranscriptImporter onImport={onImport} isLoading={isLoading} />
          )}

          {selectedMethod === 'srt' && (
            <SrtTranscriptImporter onImport={onImport} isLoading={isLoading} />
          )}

          {selectedMethod === 'json' && (
            <TranscriptImporter onImport={onImport} isLoading={isLoading} />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Your default method preference is saved locally and will be remembered.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TranscriptMethodSelector;

/**
 * Hook to get/set the user's preferred transcript fetch method
 *
 * Plain Text (Timestamps) method supports lines like:
 *   (00:00) Hello world
 *   (01:23:45) Another line
 * Both (hh:mm:ss) and (mm:ss) are supported.
 */
export function useTranscriptMethodPreference() {
  const [method, setMethod] = useState<TranscriptFetchMethod>('auto');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as TranscriptFetchMethod | null;
    if (saved && METHOD_INFO[saved]) {
      setMethod(saved);
    }
  }, []);

  const saveMethod = (newMethod: TranscriptFetchMethod) => {
    setMethod(newMethod);
    localStorage.setItem(STORAGE_KEY, newMethod);
  };

  return { method, setMethod: saveMethod };
}
