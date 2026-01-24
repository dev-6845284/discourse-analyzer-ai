/**
 * QuoteTextDisplay Component
 *
 * Purpose:
 * - Displays the core content of the quote: Author, Text, and optional Embedded Media (iframe).
 * - Handles "Read More" expansion for long text.
 *
 * Behavior:
 * - Supports automatic language translation toggling via `onLanguageChange`.
 * - Handles special "Draft" states (showing diffs/comparisons if needed).
 * - Embeds YouTube/Facebook/Generic iframes if a source URL is detected.
 *
 * Location: src/components/quotes/QuoteCard/QuoteTextDisplay.tsx
 */
import React from 'react';
import { Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

import { Quote } from '../../../types';
import { SUPPORTED_LANGUAGES } from '../../../constants';
import { useI18n } from '../../../i18n';

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

  // Helper to get embeddable URL from either an iframe string or a regular URL
  const getEmbedUrl = (str?: string) => {
    if (!str || typeof str !== 'string') return null;

    const normalizedStr = str.trim();

    // 1. If it's an iframe code, extract the src (always allow raw iframes if user provided them)
    if (normalizedStr.includes('<iframe')) {
      const match = normalizedStr.match(/src="([^"]+)"/i);
      return match ? match[1] : null; // Return immediately if it's an explicit iframe
    }

    // 2. Facebook logic (requires special endpoint)
    if (normalizedStr.includes('facebook.com')) {
      let src = normalizedStr;
      // If it's already an embed URL, pass it
      if (src.includes('plugins/post.php')) return src;

      // Otherwise transform standard post URL
      const cleanUrl = src.replace('m.facebook.com', 'www.facebook.com').split('?')[0];
      return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(cleanUrl)}&show_text=true&width=auto`;
    }

    // 3. YouTube Logic
    // Captures ID from: youtube.com (watch, embed, shorts, live) and youtu.be
    const ytMatch = normalizedStr.match(/(?:youtube(?:-nocookie)?\.com\/(?:(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // 4. Fallback: If no known embed pattern is found, return null (whitelist behavior)
    return null;
  };

  // Helper to get a clean, clickable URL even if the input is an iframe snippet
  const getDirectUrl = (str?: string) => {
    if (!str || typeof str !== 'string') return null;
    let url = str.trim();

    // 1. If it's an iframe code, extract the src
    if (url.includes('<iframe')) {
      const match = url.match(/src="([^"]+)"/i);
      url = match ? match[1] : url;
    }

    // 2. Decode HTML entities
    url = url.replace(/&amp;/g, '&');

    // 3. If it's a Facebook plugin URL, extract the original post URL
    if (url.includes('facebook.com/plugins/post.php')) {
      const match = url.match(/[?&]href=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    return url;
  };

  const embeddedIframeSrc = getEmbedUrl(displayQuote.source);
  const directSourceUrl = getDirectUrl(displayQuote.source);



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
          {/* Embedded Content */}
          {embeddedIframeSrc && (
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
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <button
                      onClick={toggleExpanded}
                      className="bg-gray-700 text-[10px] px-2 py-0.5 rounded text-gray-300 hover:text-white"
                    >
                      {expanded ? '-' : '+'} {t(expanded ? 'collapse' : 'expand')}
                    </button>
                    <span className="text-[10px] text-gray-400">{iframeHeight}px</span>
                  </div>
                  <div className="rounded-lg overflow-hidden bg-white border border-gray-300 dark:border-gray-700 shadow-inner relative">
                    <iframe
                      src={embeddedIframeSrc}
                      title="Embed"
                      className="w-full border-0"
                      style={{ height: expanded ? Math.max(iframeHeight, 420) : iframeHeight }}
                      loading="lazy"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                    {/* Prominent fallback link and hint */}
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                      <span className="text-[10px] text-gray-500 italic text-center sm:text-left">
                        {t('fb_embed_hint')}
                      </span>
                      {directSourceUrl && (
                        <a
                          href={directSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold hover:underline shrink-0 flex items-center gap-1"
                        >
                          {t('open_directly')} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-3 text-xs gap-4 flex-wrap">
            <div className="flex flex-col min-w-0 flex-1 mr-4">
              {directSourceUrl && (
                <a
                  href={directSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 dark:text-cyan-400 truncate hover:underline text-[11px] flex items-center gap-1"
                  title={displayQuote.title || directSourceUrl}
                >
                  <span className="truncate">{displayQuote.title || directSourceUrl}</span>
                  {!embeddedIframeSrc && <ExternalLink className="h-2.5 w-2.5 shrink-0" />}
                </a>
              )}
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
        </>
      )}
    </>
  );
};

export default QuoteTextDisplay;
