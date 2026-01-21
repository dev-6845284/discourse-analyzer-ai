import React from 'react';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [iframeHeight, setIframeHeight] = React.useState<number>(220);
  const [expanded, setExpanded] = React.useState<boolean>(false);
  const [isTextExpanded, setIsTextExpanded] = React.useState<boolean>(false);
  const [showIframe, setShowIframe] = React.useState<boolean>(false);
  const prevHeightRef = React.useRef<number | null>(null);

  const person = displayQuote.person;
  let authorName: string | undefined;

  if (typeof person === 'object' && person) {
    authorName = (person as any).aliases && (person as any).aliases.length > 0 ? (person as any).aliases[0] : (person as any).name;
  } else {
    authorName = displayQuote.personName;
  }

  const increaseHeight = () => setIframeHeight((h) => Math.min(800, h + 120));
  const decreaseHeight = () => setIframeHeight((h) => Math.max(120, h - 120));
  const toggleExpanded = () => {
    setExpanded((v) => {
      if (!v) {
        // expanding: remember previous height and ensure a larger minimum for readability
        prevHeightRef.current = iframeHeight;
        const target = Math.max(iframeHeight, 650);
        setIframeHeight(target);
        return true;
      } else {
        // collapsing: restore previous height if available
        const prev = prevHeightRef.current ?? 220;
        setIframeHeight(prev);
        prevHeightRef.current = null;
        return false;
      }
    });
  };



  return (
    <>
      {hasDraft && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
          <div className="text-yellow-700 dark:text-yellow-500 text-xs font-bold uppercase mb-2">{t('originalContent')}</div>
          <blockquote className="border-l-4 border-yellow-400 dark:border-yellow-600 pl-4">
            <p className="text-gray-600 dark:text-gray-400 italic text-sm">"{quote.text}"</p>
          </blockquote>
          {((quote.audit || quote.metadata?.legacyAnalysis || quote.analysis) && !(quote.draft?.audit || quote.draft?.metadata?.legacyAnalysis || quote.draft?.analysis)) && (
            <div className="mt-2 text-xs text-gray-500">{t('originalAnalysisAvailable')}</div>
          )}
        </div>
      )}

      {authorName && (
        <div className="mb-3">
          <div className="text-cyan-600 dark:text-cyan-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t('authorLabel')}</div>
          <div className="text-gray-800 dark:text-gray-100 font-bold text-lg leading-tight" title={authorName}>
            {authorName}
          </div>
        </div>
      )}

      <div className={`relative ${!isCollapsed ? 'mb-2' : ''}`}>
        <blockquote className={`border-l-4 ${hasDraft ? 'border-green-500' : 'border-cyan-600 dark:border-cyan-500'} pl-4 mr-8`}>
          <p className={`text-gray-700 dark:text-gray-200 italic ${isCollapsed ? 'truncate' : (!isTextExpanded ? 'line-clamp-4' : '')}`}>
            "{displayQuote.text}"
          </p>
        </blockquote>
      </div>

      {!isCollapsed && (
        <button
          onClick={() => setIsTextExpanded(!isTextExpanded)}
          className="w-full py-1 text-xs flex items-center justify-center gap-1 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 mb-3 transition-colors"
        >
          {isTextExpanded ? (
            <>
              {t('show_less') || 'Show Less'}
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              {t('read_more') || 'Read More'}
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}

      {!isCollapsed && (
        <>
          {/* If the source contains a Facebook plugin iframe, render the embed instead of a plain link */}
          {typeof displayQuote.source === 'string' && displayQuote.source.includes('<iframe') && displayQuote.source.includes('facebook.com/plugins/post.php') ? (
            (() => {
              const match = displayQuote.source.match(/<iframe[^>]*src="([^"]*facebook\.com\/plugins\/post\.php[^"]*)"[^>]*><\/iframe>/i);
              const iframeSrc = match ? match[1] : null;
              return iframeSrc ? (
                <div className="mt-3 w-full">
                  {!showIframe ? (
                    <button
                      onClick={() => setShowIframe(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-cyan-600 dark:text-cyan-400 text-xs rounded transition-colors w-full justify-center border border-gray-200 dark:border-gray-600 border-dashed"
                    >
                      <Eye className="h-4 w-4" />
                      {t('loadEmbeddedContent') || 'Load Embedded Content'}
                    </button>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex gap-2">
                          <button
                            onClick={toggleExpanded}
                            title={expanded ? t('collapse') : t('expand')}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-xs border border-gray-200 dark:border-transparent"
                          >
                            {expanded ? '-' : '+'}
                          </button>
                          <button
                            onClick={increaseHeight}
                            title={t('increase')}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-xs border border-gray-200 dark:border-transparent"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 6v4" />
                              <path d="M8 8l4-4 4 4" />
                              <path d="M12 18v-4" />
                              <path d="M8 16l4 4 4-4" />
                            </svg>
                          </button>
                          <button
                            onClick={decreaseHeight}
                            title={t('decrease')}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-xs border border-gray-200 dark:border-transparent"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: 'rotate(90deg)' }}>
                              <path d="M6 8l4 4-4 4" />
                              <path d="M18 8l-4 4 4 4" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{expanded ? `${iframeHeight}px (expanded)` : `${iframeHeight}px`}</div>
                      </div>
                      <div className={`rounded-md overflow-hidden border-0 ${expanded ? 'w-full' : 'w-full'}`} style={{ backgroundColor: '#ffffff' }}>
                        <iframe
                          src={iframeSrc}
                          title={displayQuote.title || 'Embedded Post'}
                          className="w-full rounded-md border-0 overflow-hidden"
                          style={{ height: expanded ? Math.max(iframeHeight, 420) : iframeHeight, backgroundColor: '#ffffff' }}
                          loading="lazy"
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <a
                    href={displayQuote.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 dark:text-cyan-400 truncate hover:underline flex-1 min-w-0"
                    title={displayQuote.title}
                  >
                    {displayQuote.title}
                  </a>
                </div>
              );
            })()
          ) : (
            <div className="flex justify-between items-center mt-3 text-xs gap-4 flex-wrap">
              <div className="flex flex-col min-w-0 flex-1 mr-4">
                <a
                  href={displayQuote.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 dark:text-cyan-400 truncate hover:underline text-[11px]"
                  title={displayQuote.title}
                >
                  {displayQuote.title}
                </a>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={displayQuote.languageCode}
                  onChange={(e) => onLanguageChange(quote.id, e.target.value)}
                  disabled={isBusy || hasDraft}
                  className="bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('quoteLanguageLabel')}
                >
                  {SUPPORTED_LANGUAGES.map((lang: any) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500 dark:text-gray-400">{displayQuote.date}</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default QuoteTextDisplay;
