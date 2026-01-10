import React, { useState, useEffect, useRef } from 'react';
import Spinner from '../Spinner';
import { useI18n } from '../../i18n';

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
const isValidUrl = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

interface ExtractionControlsProps {
  textToExtract: string;
  setTextToExtract: (text: string) => void;
  isExtracting: boolean;
  personName: string;
  onExtract: (analysisType?: 'audit' | 'flaws') => void,
  onAdd: (analysisType?: 'audit' | 'flaws') => void,
  onExtractFromUrl?: () => void;
  onAutoExtract?: (url: string) => void;
  extractionStatus?: string;
  extractionLanguage?: string;
  setExtractionLanguage?: (lang: string) => void;
  extractionError?: string | null;
}

export const ExtractionControls: React.FC<ExtractionControlsProps> = ({
  textToExtract,
  setTextToExtract,
  isExtracting,
  personName,
  onExtract,
  onAdd,
  onExtractFromUrl,
  onAutoExtract,
  extractionStatus,
  extractionLanguage = 'lt',
  setExtractionLanguage,
  extractionError,
}) => {
  const { t } = useI18n();
  const isUrl = isValidUrl(textToExtract);
  const [analysisType, setAnalysisType] = useState<'audit' | 'flaws'>('audit');
  const lastExtractionRef = React.useRef<{ url: string, lang: string } | null>(null);

  useEffect(() => {
    if (isUrl && onAutoExtract && !isExtracting) {
      // Prevent re-extracting the same URL with the same language if it was just processed
      if (lastExtractionRef.current?.url === textToExtract &&
        lastExtractionRef.current?.lang === extractionLanguage) {
        return;
      }

      const timer = setTimeout(() => {
        lastExtractionRef.current = { url: textToExtract, lang: extractionLanguage };
        onAutoExtract(textToExtract);
      }, 500); // Small delay to ensure user finished pasting/typing
      return () => clearTimeout(timer);
    } else if (!isUrl) {
      // Reset if the text is cleared or changed to non-url
      lastExtractionRef.current = null;
    }
  }, [textToExtract, isUrl, onAutoExtract, extractionLanguage]); // Re-run if language changes

  return (
    <div className="bg-gray-800/50 rounded-lg">
      <textarea
        value={textToExtract}
        onChange={(e) => setTextToExtract(e.target.value)}
        rows={6}
        className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
        placeholder={
          personName ? t('pasteArticleOrUrlBy', { person: personName }) : t('pasteArticleOrUrlGeneric')
        }
      ></textarea>

      {/* Language Selector for URLs */}
      {isUrl && setExtractionLanguage && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-400">{t('extractionLanguageLabel')}</label>
          <select
            value={extractionLanguage}
            onChange={(e) => setExtractionLanguage(e.target.value)}
            className="bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs py-1 px-2"
          >
            <option value="lt">Lithuanian</option>
            <option value="en">English</option>
          </select>
        </div>
      )}

      {/* Status indicator */}
      {isExtracting && extractionStatus && (
        <div className="mt-2 text-sm text-cyan-400 flex items-center gap-2">
          <Spinner />
          <span>{extractionStatus}</span>
        </div>
      )}

      {/* Error indicator */}
      {extractionError && (
        <div className="mt-2 text-sm text-red-400">
          {extractionError}
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {isUrl && onExtractFromUrl ? (
          // Show "Extract from Link" button when URL is detected
          <button
            onClick={onExtractFromUrl}
            disabled={isExtracting || !personName}
            title={
              !personName
                ? t('pleaseEnterPersonName')
                : t('extractQuotesFromArticle')
            }
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isExtracting ? (
              <Spinner />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
                {t('extractFromLink')}
              </>
            )}
          </button>
        ) : (
          // Show regular extraction buttons when not a URL
          <>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-3">
                <label className="flex items-center" htmlFor="extraction-analysis-audit">
                  <input
                    id="extraction-analysis-audit"
                    type="radio"
                    name="extractionAnalysisType"
                    value="audit"
                    checked={analysisType === 'audit'}
                    onChange={(e) => setAnalysisType(e.target.value as 'audit' | 'flaws')}
                    className="mr-1 accent-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-gray-300">Audit</span>
                </label>
                <label className="flex items-center" htmlFor="extraction-analysis-flaws">
                  <input
                    id="extraction-analysis-flaws"
                    type="radio"
                    name="extractionAnalysisType"
                    value="flaws"
                    checked={analysisType === 'flaws'}
                    onChange={(e) => setAnalysisType(e.target.value as 'audit' | 'flaws')}
                    className="mr-1 accent-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-gray-300">Flaws</span>
                </label>
              </div>

              <button
                onClick={() => onExtract(analysisType)}
                disabled={isExtracting || !textToExtract || !personName}
                title={!personName ? t('pleaseEnterPersonName') : (!textToExtract ? t('pleaseEnterTextToExtract') : '')}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isExtracting ? <Spinner /> : t('extractAndAnalyze')}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={() => onAdd(analysisType)}
                disabled={isExtracting || !textToExtract || !personName}
                title={!personName ? t('pleaseEnterPersonName') : (!textToExtract ? t('pleaseEnterTextToAdd') : '')}
                className="w-full sm:flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {t('addTextAsQuote')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
