/**
 * PublicQuoteCard Component
 *
 * Purpose:
 * - Displays a single Quote in the public gallery.
 * - Features rich embedding (iframes), expansion toggles, and detailed analysis view.
 *
 * Behavior:
 * - Handles Social Media embeds (Facebook, YouTube) or generic iframes.
 * - Shows "Audit" breakdown with StrengthBars.
 * - Supports sharing via link copy.
 *
 * Location: src/components/public/PublicQuoteCard.tsx
 */
import React, { useState, useRef } from 'react';
import { Eye, Clock, MessageSquare, ExternalLink, Share2, Facebook, Instagram, Hash, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Toast } from '../ui/Toast';
import { ShareModal } from '../ui/ShareModal';
import { useI18n } from '../../i18n';
import StrengthBar from '../ui/StrengthBar';
import {
    SEVERITY_HEX,
    AUDIT_CATEGORY_COLORS,
    VERDICT_COLORS,
    SEVERITY_ORDER
} from '../../constants';

interface PublicQuoteProps {
    quote: {
        id: string;
        text: string;
        date?: string;
        source?: string;
        sourceUrl?: string;
        context?: string;
        analysisContext?: string;
        links?: Array<{ url: string; title?: string }>;
        person?: {
            name: string;
            description?: string;
            links?: Array<{ url: string; type: 'facebook' | 'tiktok' | 'instagram' | 'custom' }>;
        };
        analysis: {
            verdict: string;
            overview: string;
            rationale?: string;
            categories: { name: string; severity: string; reasoning: string; evidence?: string }[];
        };
    };
    onNavigate?: (path: string) => void;
}

export const PublicQuoteCard: React.FC<PublicQuoteProps> = ({ quote, onNavigate }) => {
    const { t } = useI18n();
    const [showIframe, setShowIframe] = useState(false);
    const [iframeHeight, setIframeHeight] = useState(220);
    const [isIframeExpanded, setIsIframeExpanded] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isAnalysisContextExpanded, setIsAnalysisContextExpanded] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const prevHeightRef = useRef<number | null>(null);

    const verdictKey = quote.analysis.verdict;
    const verdictColor = VERDICT_COLORS[verdictKey as keyof typeof VERDICT_COLORS] || 'bg-gray-600/20 text-gray-400 ring-gray-500/30';

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

    // Iframe logic - check both source and sourceUrl
    const embeddedIframeSrc = getEmbedUrl(quote.source) || getEmbedUrl(quote.sourceUrl);

    // Direct link logic - ensure we have a valid URL for buttons/links
    const directSourceUrl = getDirectUrl(quote.sourceUrl) || getDirectUrl(quote.source);

    // Check if we have a valid source URL to show the link button
    const isValidSourceUrl = !!directSourceUrl;

    const toggleIframeExpanded = () => {
        setIsIframeExpanded((v) => {
            if (!v) {
                prevHeightRef.current = iframeHeight;
                setIframeHeight(Math.max(iframeHeight, 650));
                return true;
            } else {
                setIframeHeight(prevHeightRef.current ?? 220);
                prevHeightRef.current = null;
                return false;
            }
        });
    };

    return (
        <div id={`quote-card-${quote.id}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-cyan-500/10 hover:bg-gray-50 dark:hover:bg-gray-800/80 relative mb-4">
            {/* Header / Person Info - Sticky inside card */}
            <div id={`quote-header-${quote.id}`} className="sticky top-0 z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 pt-2 px-4 pb-2 md:pt-3 md:px-6 md:pb-3 shadow-sm transition-all rounded-t-xl">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white fn-bold shadow-lg text-sm md:text-base shrink-0">
                            {quote.person?.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                            <h3 id={`quote-author-${quote.id}`} className="text-gray-900 dark:text-gray-100 font-bold text-base md:text-lg leading-tight truncate">
                                {quote.person?.name || t('unknown_person')}
                            </h3>
                            {quote.person?.links && quote.person.links.length > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                    {quote.person.links.map((link, idx) => {
                                        let Icon = Globe;
                                        if (link.type === 'facebook') Icon = Facebook;
                                        if (link.type === 'instagram') Icon = Instagram;
                                        if (link.type === 'tiktok') Icon = Hash; // Basic icon for TikTok as lucide might not have it or used Hash

                                        return (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-400 hover:text-cyan-500 transition-colors"
                                                title={t(`linkType_${link.type}`)}
                                            >
                                                <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-0">
                                {quote.date && (
                                    <span className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1 shrink-0">
                                        <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        {new Date(quote.date).toLocaleDateString()}
                                    </span>
                                )}
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="text-[10px] md:text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 shrink-0 transition-colors font-medium"
                                    title={t('share') || 'Share'}
                                >
                                    <Share2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                    {t('share') || 'Share'}
                                </button>
                                {isValidSourceUrl && (
                                    <a
                                        id={`quote-source-link-${quote.id}`}
                                        href={directSourceUrl || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] md:text-xs text-cyan-500 hover:underline flex items-center gap-0.5 shrink-0"
                                    >
                                        <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                        {t('sourceUrlLabel') || 'Source'}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <span id={`quote-verdict-${quote.id}`} className={`px-2 py-0.5 md:px-3 md:py-1 text-xs md:text-sm font-bold rounded-full ring-1 ring-inset whitespace-nowrap ml-2 ${verdictColor}`}>
                        {t(`verdict_${verdictKey}`) || verdictKey}
                    </span>
                </div>
            </div>

            <div id={`quote-content-${quote.id}`} className="p-4 md:p-6 pt-0 md:pt-1">
                {/* Quote Text */}
                <blockquote id={`quote-text-${quote.id}`} className="border-l-2 md:border-l-4 border-cyan-500 pl-3 md:pl-4 mb-3 md:mb-6 mt-0">
                    <p className={`text-gray-800 dark:text-gray-200 text-base md:text-lg italic leading-snug font-serif ${!isExpanded ? 'line-clamp-4' : ''}`}>
                        "{quote.text}"
                    </p>
                </blockquote>

                {/* Embedded Content */}
                {isExpanded && embeddedIframeSrc && (
                    <div id={`quote-embed-${quote.id}`} className="mb-4">
                        {!showIframe ? (
                            <button
                                onClick={() => setShowIframe(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-900 text-cyan-600 dark:text-cyan-400 text-xs rounded border border-gray-300 dark:border-gray-700 border-dashed w-full justify-center transition-all"
                            >
                                <Eye className="w-4 h-4" />
                                {t('loadEmbeddedContent')}
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <button
                                        onClick={toggleIframeExpanded}
                                        className="bg-gray-700 text-[10px] px-2 py-0.5 rounded text-gray-300 hover:text-white"
                                    >
                                        {isIframeExpanded ? '-' : '+'} {t(isIframeExpanded ? 'collapse' : 'expand')}
                                    </button>
                                    <span className="text-[10px] text-gray-500">{iframeHeight}px</span>
                                </div>
                                <div className="rounded-lg overflow-hidden bg-white border border-gray-700 shadow-inner relative">
                                    <iframe
                                        src={embeddedIframeSrc}
                                        title="FB Embed"
                                        className="w-full border-0"
                                        style={{ height: iframeHeight }}
                                        loading="lazy"
                                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                    />
                                    {/* Prominent fallback link and hint */}
                                    <div className="bg-gray-100 p-2 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2">
                                        <span className="text-[10px] text-gray-500 italic text-center sm:text-left">
                                            {t('fb_embed_hint')}
                                        </span>
                                        <a
                                            href={directSourceUrl || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-blue-600 font-bold hover:underline shrink-0 flex items-center gap-1"
                                        >
                                            {t('open_directly')} <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Original Context */}
                {isExpanded && quote.context && (
                    <div id={`quote-context-raw-${quote.id}`} className="mb-4 text-xs md:text-[13px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 p-3 rounded-lg border border-gray-200 dark:border-gray-700/30">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('contextLabel')}</span>
                        {quote.context}
                    </div>
                )}
            </div>

            {/* Read More / Show Less Toggle for Content */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 transition-colors"
                title={isExpanded ? (t('show_less') || 'Show Less') : (t('read_more') || 'Read More')}
            >
                {isExpanded ? (
                    <>
                        {t('show_less') || t('collapse') || 'Show Less'}
                        <ChevronUp className="w-3 h-3" />
                    </>
                ) : (
                    <>
                        {t('read_more') || t('expand') || 'Read More'}
                        <ChevronDown className="w-3 h-3" />
                    </>
                )}
            </button>

            {/* Analysis Section */}
            <div id={`quote-analysis-section-${quote.id}`} className="p-4 md:p-6 pt-4 border-t-2 border-gray-100 dark:border-gray-700 space-y-3 md:space-y-4 bg-gray-50 dark:bg-gray-900/10 rounded-b-xl">
                {/* Analysis Header - Clickable to toggle */}
                <button
                    onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                    className="w-full flex items-center justify-between group bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition-all"
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${isAnalysisExpanded ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'} transition-colors`}>
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                            {t('auditReport')}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 group-hover:text-cyan-500 transition-colors">
                        <span className="text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                            {isAnalysisExpanded ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                        </span>
                        {isAnalysisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>

                {isAnalysisExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-3 md:space-y-4">
                        {/* Rationale / Overview */}
                        <div id={`quote-rationale-${quote.id}`} className="p-3 md:p-4 bg-white dark:bg-gray-900/40 rounded-xl border-l-2 md:border-l-4 border-cyan-500/50 shadow-sm dark:shadow-inner">
                            <p className="text-gray-800 dark:text-gray-200 text-xs md:text-sm italic leading-relaxed text-left">
                                {quote.analysis.rationale || quote.analysis.overview}
                            </p>
                        </div>

                        {/* Analysis Context (AI provided) */}
                        {quote.analysisContext && (
                            <div className="bg-gray-100 dark:bg-gray-900/20 rounded-lg overflow-hidden transition-colors">
                                <button
                                    id={`quote-context-toggle-${quote.id}`}
                                    onClick={() => setIsAnalysisContextExpanded(!isAnalysisContextExpanded)}
                                    aria-expanded={isAnalysisContextExpanded}
                                    aria-controls={`quote-analysis-context-content-${quote.id}`}
                                    className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors group gap-3"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <span className="font-semibold uppercase tracking-tighter text-[10px] text-gray-500 shrink-0">
                                            {t('contextLabelShort') || 'Context'}
                                        </span>
                                        {!isAnalysisContextExpanded && (
                                            <span
                                                className="text-[10px] text-gray-500/70 dark:text-gray-400/70 whitespace-nowrap overflow-hidden"
                                                style={{ maskImage: 'linear-gradient(to right, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)' }}
                                            >
                                                {quote.analysisContext}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400 group-hover:text-cyan-500 transition-colors shrink-0">
                                        <span className="text-[9px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isAnalysisContextExpanded ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                                        </span>
                                        {isAnalysisContextExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </div>
                                </button>
                                {isAnalysisContextExpanded && (
                                    <div
                                        id={`quote-analysis-context-content-${quote.id}`}
                                        role="region"
                                        aria-labelledby={`quote-context-toggle-${quote.id}`}
                                        className="px-3 pb-3 pt-1 text-[11px] md:text-xs text-gray-600 dark:text-gray-400 text-left animate-in fade-in slide-in-from-top-1 duration-200"
                                    >
                                        <div className="border-t border-gray-200 dark:border-gray-700/50 pt-2">
                                            {quote.analysisContext}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Categories */}
                        <div id={`quote-categories-${quote.id}`} className="space-y-2 md:space-y-3 pt-1 md:pt-2">
                            {quote.analysis.categories.map((cat, idx) => {
                                const i18nKey = `category_${cat.name.replace(/ |&|\//g, '')}`;
                                const displayTitle = t(i18nKey) !== i18nKey ? t(i18nKey) : cat.name;
                                const catColor = AUDIT_CATEGORY_COLORS[cat.name as keyof typeof AUDIT_CATEGORY_COLORS] || 'bg-gray-600/20 text-gray-400 ring-gray-500/30';

                                return (
                                    <div key={idx} id={`quote-category-${quote.id}-${idx}`} className="bg-white dark:bg-gray-900/30 p-3 md:p-4 rounded-xl border border-gray-200 dark:border-gray-700/30 space-y-2 md:space-y-3 shadow-sm dark:shadow-none text-left">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className={`px-2 py-0.5 text-[10px] md:text-[11px] font-semibold rounded-full ring-1 ring-inset truncate max-w-[70%] ${catColor}`}>
                                                {displayTitle}
                                            </span>
                                            <div className="shrink-0">
                                                <StrengthBar
                                                    level={SEVERITY_ORDER[cat.severity.toUpperCase() as keyof typeof SEVERITY_ORDER] || 0}
                                                    max={5}
                                                    color={SEVERITY_HEX[cat.severity.toUpperCase() as keyof typeof SEVERITY_HEX]}
                                                    tooltip={t(`severity_${cat.severity.toUpperCase()}`)}
                                                    height={8}
                                                    width={100}
                                                />
                                            </div>
                                        </div>

                                        <p className="text-gray-600 dark:text-gray-300 text-xs md:text-sm leading-relaxed">
                                            {cat.reasoning}
                                        </p>

                                        {cat.evidence && (
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700/50 text-xs md:text-[13px] text-gray-500 dark:text-gray-400 italic">
                                                <span className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase block mb-1 not-italic">{t('public_evidence')}</span>
                                                "{cat.evidence}"
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Links / References */}
                        {quote.links && quote.links.length > 0 && (
                            <div id={`quote-references-${quote.id}`} className="pt-2 border-t border-gray-200 dark:border-gray-700/30 text-left">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                                    {t('public_references')}
                                </h4>
                                <div className="space-y-1">
                                    {quote.links.map((link, i) => {
                                        const iframeSrc = getEmbedUrl(link.url);
                                        const finalUrl = iframeSrc || link.url;

                                        return (
                                            <a
                                                key={i}
                                                id={`quote-reference-link-${quote.id}-${i}`}
                                                href={finalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/30 transition-colors group"
                                            >
                                                <ExternalLink className="w-3 h-3 text-cyan-500 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs text-cyan-400/80 group-hover:text-cyan-400 truncate">
                                                    {link.title || finalUrl}
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                url={`${window.location.origin}/quote/${quote.id}`}
                onCopy={() => {
                    const url = `${window.location.origin}/quote/${quote.id}`;
                    navigator.clipboard.writeText(url);
                    setShowToast(true);
                }}
                onNavigate={onNavigate}
            />


            {showToast && (
                <Toast
                    message={t('linkCopied') || 'Link copied!'}
                    onClose={() => setShowToast(false)}
                />
            )}
        </div>
    );
};
