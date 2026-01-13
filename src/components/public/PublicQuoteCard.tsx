import React, { useState, useRef } from 'react';
import { Eye, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n';
import StrengthBar from '../StrengthBar';
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
        person?: { name: string; description?: string };
        analysis: {
            verdict: string;
            overview: string;
            rationale?: string;
            categories: { name: string; severity: string; reasoning: string; evidence?: string }[];
        };
    };
}

export const PublicQuoteCard: React.FC<PublicQuoteProps> = ({ quote }) => {
    const { t } = useI18n();
    const [showIframe, setShowIframe] = useState(false);
    const [iframeHeight, setIframeHeight] = useState(220);
    const [isIframeExpanded, setIsIframeExpanded] = useState(false);
    const prevHeightRef = useRef<number | null>(null);

    const verdictKey = quote.analysis.verdict;
    const verdictColor = VERDICT_COLORS[verdictKey as keyof typeof VERDICT_COLORS] || 'bg-gray-600/20 text-gray-400 ring-gray-500/30';

    // Iframe logic
    const hasFacebookIframe = typeof quote.source === 'string' && quote.source.includes('<iframe') && quote.source.includes('facebook.com/plugins/post.php');
    let facebookIframeSrc: string | null = null;
    if (hasFacebookIframe) {
        const match = quote.source?.match(/<iframe[^>]*src="([^"]*facebook\.com\/plugins\/post\.php[^"]*)"[^>]*><\/iframe>/i);
        facebookIframeSrc = match ? match[1] : null;
    }

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
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700/50 overflow-hidden transition-all duration-300 hover:shadow-cyan-500/10 hover:bg-gray-800/80">
            {/* Header / Person Info */}
            <div className="p-6 pb-0">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg">
                            {quote.person?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <h3 className="text-gray-100 font-bold text-lg leading-tight line-clamp-1">
                                {quote.person?.name || t('unknown_person')}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                {quote.date && (
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(quote.date).toLocaleDateString()}
                                    </span>
                                )}
                                {quote.sourceUrl && (
                                    <a
                                        href={quote.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-cyan-500 hover:underline flex items-center gap-0.5"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        {t('sourceUrlLabel') || 'Source'}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <span className={`px-3 py-1 text-sm font-bold rounded-full ring-1 ring-inset ${verdictColor}`}>
                        {t(`verdict_${verdictKey}`) || verdictKey}
                    </span>
                </div>

                {/* Quote Text */}
                <blockquote className="border-l-4 border-cyan-500 pl-4 mb-4">
                    <p className="text-gray-200 text-lg italic leading-relaxed font-serif">
                        "{quote.text}"
                    </p>
                </blockquote>

                {/* Embedded Content */}
                {facebookIframeSrc && (
                    <div className="mb-4">
                        {!showIframe ? (
                            <button
                                onClick={() => setShowIframe(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 hover:bg-gray-900 text-cyan-400 text-xs rounded border border-gray-700 border-dashed w-full justify-center transition-all"
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
                                <div className="rounded-lg overflow-hidden bg-white border border-gray-700 shadow-inner">
                                    <iframe
                                        src={facebookIframeSrc}
                                        title="FB Embed"
                                        className="w-full border-0"
                                        style={{ height: iframeHeight }}
                                        loading="lazy"
                                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Original Context */}
                {quote.context && (
                    <div className="mb-4 text-[13px] text-gray-400 bg-gray-900/30 p-3 rounded-lg border border-gray-700/30">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">{t('contextLabel')}</span>
                        {quote.context}
                    </div>
                )}
            </div>

            {/* Analysis Section */}
            <div className="p-6 pt-4 border-t border-gray-700/50 space-y-4">
                {/* Analysis Header */}
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {t('auditReport')}
                    </h3>
                </div>

                {/* Rationale / Overview */}
                <div className="p-4 bg-gray-900/40 rounded-xl border-l-4 border-cyan-500/50 shadow-inner">
                    <p className="text-gray-200 text-sm italic leading-relaxed">
                        {quote.analysis.rationale || quote.analysis.overview}
                    </p>
                </div>

                {/* Analysis Context (AI provided) */}
                {quote.analysisContext && (
                    <div className="text-xs text-gray-400 bg-gray-900/20 p-2 rounded-lg">
                        <span className="font-semibold uppercase tracking-tighter text-[10px] block text-gray-500 mb-0.5">{t('contextLabelShort')}</span>
                        {quote.analysisContext}
                    </div>
                )}

                {/* Categories */}
                <div className="space-y-3 pt-2">
                    {quote.analysis.categories.map((cat, idx) => {
                        const i18nKey = `category_${cat.name.replace(/ |&|\//g, '')}`;
                        const displayTitle = t(i18nKey) !== i18nKey ? t(i18nKey) : cat.name;
                        const catColor = AUDIT_CATEGORY_COLORS[cat.name as keyof typeof AUDIT_CATEGORY_COLORS] || 'bg-gray-600/20 text-gray-400 ring-gray-500/30';

                        return (
                            <div key={idx} className="bg-gray-900/30 p-4 rounded-xl border border-gray-700/30 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset ${catColor}`}>
                                        {displayTitle}
                                    </span>
                                    <StrengthBar
                                        level={SEVERITY_ORDER[cat.severity.toUpperCase() as keyof typeof SEVERITY_ORDER] || 0}
                                        max={5}
                                        color={SEVERITY_HEX[cat.severity.toUpperCase() as keyof typeof SEVERITY_HEX]}
                                        tooltip={t(`severity_${cat.severity.toUpperCase()}`)}
                                        height={10}
                                        width={60}
                                    />
                                </div>

                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {cat.reasoning}
                                </p>

                                {cat.evidence && (
                                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 text-[13px] text-gray-400 italic">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1 not-italic">{t('public_evidence')}</span>
                                        "{cat.evidence}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Links / References */}
                {quote.links && quote.links.length > 0 && (
                    <div className="pt-2 border-t border-gray-700/30">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                            {t('public_references')}
                        </h4>
                        <div className="space-y-1">
                            {quote.links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/30 transition-colors group"
                                >
                                    <ExternalLink className="w-3 h-3 text-cyan-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-cyan-400/80 group-hover:text-cyan-400 truncate">
                                        {link.title || link.url}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
