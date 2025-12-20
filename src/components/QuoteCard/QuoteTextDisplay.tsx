import React from 'react';
import { Quote } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../constants';
import { useI18n } from '../../i18n';

interface QuoteTextDisplayProps {
  displayQuote: Quote;
  quote: Quote;
  hasDraft: boolean;
  isCollapsed: boolean;
  onLanguageChange: (quoteId: string, newLanguageCode: string) => void;
  isBusy: boolean;
}

const QuoteTextDisplay: React.FC<QuoteTextDisplayProps> = ({
  displayQuote,
  quote,
  hasDraft,
  isCollapsed,
  onLanguageChange,
  isBusy,
}) => {
  const { t } = useI18n();

  return (
    <>
      {hasDraft && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <div className="text-yellow-500 text-xs font-bold uppercase mb-2">{t('originalContent')}</div>
          <blockquote className="border-l-4 border-yellow-600 pl-4">
            <p className="text-gray-400 italic text-sm">"{quote.text}"</p>
          </blockquote>
          {((quote.audit || quote.metadata?.legacyAnalysis || quote.analysis) && !(quote.draft?.audit || quote.draft?.metadata?.legacyAnalysis || quote.draft?.analysis)) && (
            <div className="mt-2 text-xs text-gray-500">{t('originalAnalysisAvailable')}</div>
          )}
        </div>
      )}

      <blockquote className={`border-l-4 ${hasDraft ? 'border-green-500' : 'border-cyan-500'} pl-4 mr-8`}>
        <p className={`text-gray-200 italic ${isCollapsed ? 'truncate' : ''}`}>
          "{displayQuote.text}"
        </p>
      </blockquote>

      {!isCollapsed && (
        <div className="flex justify-between items-center mt-3 text-xs gap-4 flex-wrap">
          <a
            href={displayQuote.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 truncate hover:underline flex-1 min-w-0"
            title={displayQuote.title}
          >
            {displayQuote.title}
          </a>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={displayQuote.languageCode}
              onChange={(e) => onLanguageChange(quote.id, e.target.value)}
              disabled={isBusy || hasDraft}
              className="bg-gray-700/50 text-gray-300 text-xs rounded border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('quoteLanguageLabel')}
            >
              {SUPPORTED_LANGUAGES.map((lang: any) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <span className="text-gray-400">{displayQuote.date}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default QuoteTextDisplay;
