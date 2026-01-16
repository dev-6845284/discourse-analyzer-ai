import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { PublicQuoteCard } from './PublicQuoteCard';
import { Filter, Calendar, User, LogIn } from 'lucide-react';
import { useI18n, AVAILABLE_LANGUAGES } from '../../i18n';
import logo from '../../assets/images/image32.png';

interface PublicQuotesProps {
    onLogout?: () => void;
    onOpenLogin?: () => void;
}

export const PublicQuotes: React.FC<PublicQuotesProps> = ({ onLogout, onOpenLogin }) => {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Use global i18n
    const { t, language, setLanguage } = useI18n();

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const response = await api.get('/public/quotes');
            setQuotes(response.data);
            setError(null);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) {
                // Session expired or invalid
                if (onLogout) {
                    onLogout();
                } else {
                    window.location.reload();
                }
            } else {
                setError(t('public_load_error'));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    return (
        <div className="min-h-screen bg-gray-900 font-sans text-gray-100 selection:bg-cyan-500/30">
            {/* Header */}
            <header className="bg-gray-800/90 backdrop-blur-md shadow-xl border-b border-gray-700/50 sticky top-0 z-50">
                <div className="md:container mx-auto px-4 md:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <img src={logo} alt="logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover border border-gray-700/50 shadow-sm" />
                        <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                            {t('public_quotes_title')}
                        </span>

                        {/* Filter Toggle (Desktop) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-xs font-bold">{t('public_more_filters') || 'Filters'}</span>
                        </button>

                        {/* Language Selector (Header Desktop) */}
                        <div className="hidden md:flex items-center gap-4 ml-2">
                            {AVAILABLE_LANGUAGES.map((l) => (
                                <label key={l.code} className="flex items-center gap-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-all duration-200">
                                    <input
                                        type="radio"
                                        name="language"
                                        value={l.code}
                                        checked={language === l.code}
                                        onChange={() => setLanguage(l.code)}
                                        className="w-3.5 h-3.5 text-cyan-600 focus:ring-cyan-500/50 border-gray-600 bg-gray-700 transition-all"
                                    />
                                    <span className={language === l.code ? 'text-cyan-400' : ''}>{l.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Filter Toggle (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`md:hidden p-2 rounded-lg border transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'border-gray-700 text-gray-400'}`}
                        >
                            <Filter className="w-4 h-4" />
                        </button>

                        {/* Mobile Language Selector */}
                        <div className="md:hidden">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-gray-800 text-gray-200 text-xs border-gray-700 rounded-lg shadow-inner focus:border-cyan-500 focus:ring-cyan-500 py-1 px-2"
                            >
                                {AVAILABLE_LANGUAGES.map((l) => (
                                    <option key={l.code} value={l.code}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="text-sm text-gray-400 hover:text-white font-semibold transition-colors flex items-center gap-2 p-1"
                                title={t('public_back_to_landing')}
                            >
                                <span className="hidden sm:inline">{t('public_back_to_landing')}</span>
                                <span className="sm:hidden">←</span>
                            </button>
                        )}

                        {onOpenLogin && (
                            <button
                                onClick={onOpenLogin}
                                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-gray-600/50 hover:border-gray-500 shadow-sm"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('admin_login')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="md:container mx-auto px-2 md:px-6 lg:px-8 pt-1 pb-4 md:pt-2 md:pb-8 space-y-4 md:space-y-8">

                {/* Collapsible Filters - Completely hidden when not active */}
                {showFilters && (
                    <div className="bg-gray-800/40 rounded-2xl shadow-lg border border-cyan-500/20 backdrop-blur-sm overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4">
                            <button className="flex items-center px-4 py-2 border border-gray-700 rounded-xl text-gray-400 bg-gray-800/50 opacity-40 cursor-not-allowed group transition-all" title={t('coming_soon')}>
                                <User className="w-4 h-4 mr-2.5 text-gray-500 group-hover:text-gray-400" />
                                <span className="text-sm font-medium">{t('public_all_people')}</span>
                            </button>
                            <button className="flex items-center px-4 py-2 border border-gray-700 rounded-xl text-gray-400 bg-gray-800/50 opacity-40 cursor-not-allowed group transition-all" title={t('coming_soon')}>
                                <Calendar className="w-4 h-4 mr-2.5 text-gray-500 group-hover:text-gray-400" />
                                <span className="text-sm font-medium">{t('public_any_time')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-40 space-y-6">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
                            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-cyan-500/20"></div>
                        </div>
                        <span className="text-gray-500 text-sm font-medium tracking-widest uppercase animate-pulse">{t('loading')}</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-40 bg-gray-800/20 rounded-2xl border border-red-900/20 backdrop-blur-sm">
                        <p className="text-red-400 mb-6 font-medium">{error}</p>
                        <button
                            onClick={fetchQuotes}
                            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 transition-all font-bold transform hover:scale-105"
                        >
                            {t('public_try_again')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                        {quotes.length === 0 ? (
                            <div className="text-center py-40 bg-gray-800/20 rounded-2xl border border-gray-700/20 text-gray-500 italic">
                                {t('public_no_quotes_found')}
                            </div>
                        ) : (
                            quotes.map(quote => (
                                <PublicQuoteCard key={quote.id} quote={quote} />
                            ))
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};
