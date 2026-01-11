import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PublicQuoteCard } from './PublicQuoteCard';
import { Filter, Calendar, User, ChevronDown } from 'lucide-react';
import { useI18n, AVAILABLE_LANGUAGES } from '../../i18n';

interface PublicQuotesProps {
    onLogout?: () => void;
}

export const PublicQuotes: React.FC<PublicQuotesProps> = ({ onLogout }) => {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use global i18n
    const { t, language, setLanguage } = useI18n();

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/public/quotes');
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
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <span className="text-xl font-bold text-gray-900 tracking-tight">{t('public_quotes_title')}</span>

                        {/* Language Selector (Header) */}
                        <div className="hidden md:flex items-center gap-2">
                            {AVAILABLE_LANGUAGES.map((l) => (
                                <label key={l.code} className="flex items-center gap-1 text-xs md:text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                                    <input
                                        type="radio"
                                        name="language"
                                        value={l.code}
                                        checked={language === l.code}
                                        onChange={() => setLanguage(l.code)}
                                        className="w-3 h-3 text-cyan-600 focus:ring-cyan-500 border-gray-300"
                                    />
                                    <span className="">{l.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Mobile Language Selector Fallback (if needed, but keeping simple for now) */}
                        <div className="md:hidden">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                            >
                                {AVAILABLE_LANGUAGES.map((l) => (
                                    <option key={l.code} value={l.code}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {onLogout && (
                            <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-900 font-medium">
                                {t('public_back_to_landing')}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Filters Placeholder */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">

                        {/* Placeholders for Future Filters */}
                        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 cursor-not-allowed opacity-60" title={t('coming_soon')}>
                            <User className="w-4 h-4 mr-2" />
                            {t('public_all_people')}
                        </button>
                        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 cursor-not-allowed opacity-60" title={t('coming_soon')}>
                            <Calendar className="w-4 h-4 mr-2" />
                            {t('public_any_time')}
                        </button>
                        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 cursor-not-allowed opacity-60" title={t('coming_soon')}>
                            <Filter className="w-4 h-4 mr-2" />
                            {t('public_more_filters')}
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-600">{error}</p>
                        <button onClick={fetchQuotes} className="mt-4 text-cyan-600 underline">{t('public_try_again')}</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {quotes.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
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
