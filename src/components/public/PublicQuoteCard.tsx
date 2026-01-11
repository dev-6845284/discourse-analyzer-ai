import React from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useI18n } from '../../i18n';

interface PublicQuoteProps {
    quote: {
        id: string;
        text: string;
        date?: string;
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

const SeverityBadge = ({ severity }: { severity: string }) => {
    const { t } = useI18n();
    const colorMap: Record<string, string> = {
        'NONE': 'bg-gray-100 text-gray-800',
        'LOW': 'bg-blue-100 text-blue-800',
        'MEDIUM': 'bg-yellow-100 text-yellow-800',
        'HIGH': 'bg-orange-100 text-orange-800',
        'SEVERE': 'bg-red-100 text-red-800',
        // Legacy support
        'None': 'bg-gray-100 text-gray-800',
        'Low': 'bg-blue-100 text-blue-800',
        'Medium': 'bg-yellow-100 text-yellow-800',
        'High': 'bg-orange-100 text-orange-800',
        'Severe': 'bg-red-100 text-red-800',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorMap[severity] || 'bg-gray-100 text-gray-800'}`}>
            {t(`severity_${severity.toUpperCase()}`)}
        </span>
    );
};

export const PublicQuoteCard: React.FC<PublicQuoteProps> = ({ quote }) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{quote.person?.name || t('unknown_person')}</h3>
                        {quote.date && (
                            <p className="text-sm text-gray-500">{new Date(quote.date).toLocaleDateString()}</p>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-500">{t('public_verdict')}</span>
                        <span className="font-bold text-gray-800">{t(`verdict_${quote.analysis.verdict}`)}</span>
                    </div>
                </div>

                <blockquote className="text-xl text-gray-800 font-serif italic mb-4 leading-relaxed border-l-4 border-cyan-500 pl-4 py-1">
                    "{quote.text}"
                </blockquote>

                {quote.context && (
                    <div className="mb-4 text-gray-600 text-sm bg-gray-50 p-3 rounded">
                        <span className="font-semibold block mb-1">{t('public_context')}:</span>
                        {quote.context}
                    </div>
                )}

                <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('public_analysis_overview')}</h4>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">{quote.analysis.overview}</p>

                    {quote.analysis.rationale && (
                        <div className="mb-3 bg-cyan-50 p-3 rounded border border-cyan-100">
                            <h5 className="text-xs font-bold text-cyan-800 uppercase tracking-wider mb-1">{t('public_rationale')}</h5>
                            <p className="text-cyan-900 text-sm leading-relaxed">{quote.analysis.rationale}</p>
                        </div>
                    )}

                    {quote.analysisContext && (
                        <div className="mb-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('public_context')}</h4>
                            <p className="text-gray-600 text-sm">{quote.analysisContext}</p>
                        </div>
                    )}

                    {quote.links && quote.links.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('public_references')}</h4>
                            <ul className="list-disc list-inside text-sm text-blue-600">
                                {quote.links.map((link, i) => (
                                    <li key={i}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            {link.title || link.url}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center text-cyan-600 hover:text-cyan-700 text-sm font-medium focus:outline-none transition-colors mt-2"
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                {t('public_hide_details')}
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                {t('public_show_details')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 animation-fade-in">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-600 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="py-2 px-3 w-1/4">{t('public_category')}</th>
                                    <th className="py-2 px-3 w-24">{t('public_level')}</th>
                                    <th className="py-2 px-3">{t('public_details_evidence')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {quote.analysis.categories.map((cat, idx) => (
                                    <tr key={idx} className="hover:bg-gray-100/50">
                                        <td className="py-3 px-3 font-medium text-gray-800 align-top">
                                            {t(`category_${cat.name.replace(/\s+/g, '')}`) || cat.name}
                                        </td>
                                        <td className="py-3 px-3 align-top">
                                            <SeverityBadge severity={cat.severity} />
                                        </td>
                                        <td className="py-3 px-3 text-gray-600 align-top">
                                            <div className="mb-1">{cat.reasoning}</div>
                                            {cat.evidence && (
                                                <div className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 text-gray-500 italic">
                                                    <span className="font-semibold not-italic text-gray-400 block mb-1">{t('public_evidence')}</span>
                                                    "{cat.evidence}"
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
