import React, { useEffect, useState } from 'react';
import { PublicQuoteCard } from './PublicQuoteCard';
import { ThemeToggle } from '../ThemeToggle';
import { useI18n } from '../../i18n';
import axios from 'axios';

// @ts-ignore
import Turnstile from 'react-turnstile';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAAWDc3h2C2F8Xn0K";

interface PublicQuotePageProps {
    quoteId: string;
    onLogin: () => void;
    onNavigate?: (path: string) => void;
}

export const PublicQuotePage: React.FC<PublicQuotePageProps> = ({ quoteId, onLogin, onNavigate }) => {
    const { t } = useI18n();
    const [quote, setQuote] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchQuote = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check for existing session first to determine if we can fetch
            // Note: The backend will return 401 if no public session exists
            const response = await axios.get<any>(`/api/public/quotes/${quoteId}`);
            setQuote(response.data);
        } catch (err: any) {
            console.error('Error fetching quote:', err);
            if (err.response?.status === 401) {
                setError('unauthorized');
            } else if (err.response?.status === 403) {
                setError('restricted');
            } else if (err.response?.status === 404) {
                setError('notFound');
            } else {
                setError('error');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (quoteId) {
            fetchQuote();
        }
    }, [quoteId]);

    const handleTurnstileVerify = async (token: string) => {
        setIsVerifying(true);
        try {
            await axios.post('/api/public/login', { token });
            // On success, try fetching the quote again
            await fetchQuote();
        } catch (err) {
            console.error('Turnstile verification failed:', err);
            // Stay on unauthorized screen but maybe show specific error?
            // For now, if it fails, the user can just try clicking verify again if the widget resets
        } finally {
            setIsVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error === 'unauthorized') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('securityCheckRequired')}</h2>
                <p className="text-gray-400 mb-6 max-w-md">
                    {t('pleaseCompleteCaptchaToView')}
                </p>

                <div className="flex flex-col items-center gap-4">
                    <Turnstile
                        sitekey={SITE_KEY}
                        onVerify={handleTurnstileVerify}
                        theme="dark"
                    />

                    {isVerifying && (
                        <p className="text-cyan-400 text-sm animate-pulse">{t('verifying')}</p>
                    )}
                </div>
            </div>
        );
    }

    if (error === 'restricted') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">{t('restrictedAccess')}</h2>
                <p className="text-gray-400 mb-8 max-w-md">
                    {t('pleaseLoginInNonProd')}
                </p>

                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={onLogin}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors"
                    >
                        {t('signIn')}
                    </button>

                    <a
                        href="/public/quotes"
                        onClick={(e) => {
                            if (onNavigate) {
                                e.preventDefault();
                                onNavigate('/public/quotes');
                            }
                        }}
                        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                        {t('browseAllQuotes')}
                    </a>
                </div>
            </div>
        );
    }

    if (error === 'notFound') {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-100">{t('quoteNotFound')}</h2>
                <p className="text-gray-400 mt-2">{t('quoteNotFoundDesc')}</p>
                <a href="/public/quotes" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 transition-colors">
                    {t('browseAllQuotes')}
                </a>
            </div>
        );
    }

    if (!quote) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
            <div className="max-w-4xl mx-auto p-4">
                <div className="mb-6 flex justify-between items-center">
                    <a
                        href="/public/quotes"
                        onClick={(e) => {
                            if (onNavigate) {
                                e.preventDefault();
                                onNavigate('/public/quotes');
                            }
                        }}
                        className="text-gray-500 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-400 transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        {t('backToQuotes')}
                    </a>
                    <ThemeToggle />
                </div>

                <PublicQuoteCard quote={quote} onNavigate={onNavigate} />
            </div>
        </div>
    );
};
