import React, { useState } from 'react';
// @ts-ignore
import Turnstile from 'react-turnstile';
import api from '../../utils/api';
import { ShieldCheck, MessageSquareQuote } from 'lucide-react';
import { useI18n } from '../../i18n';

interface PublicLandingProps {
    onLoginSuccess: (user: any) => void;
    onOpenLogin?: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({ onLoginSuccess, onOpenLogin }) => {
    const { t } = useI18n();
    const [error, setError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const handleTurnstileVerify = async (token: string) => {
        setIsValidating(true);
        setError(null);
        try {
            const response = await api.post('/public/login', { token });
            if (response.data.user) {
                onLoginSuccess(response.data.user);
            }
        } catch (err: any) {
            console.error("Login failed", err);
            setError(t('public_verification_failed'));
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4 relative">
            {onOpenLogin && (
                <button
                    onClick={onOpenLogin}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white text-sm font-medium transition-colors"
                >
                    {t('admin_login')}
                </button>
            )}
            <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                <div className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="bg-cyan-900/30 p-4 rounded-full">
                            <MessageSquareQuote className="w-12 h-12 text-cyan-400" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">{t('public_landing_title')}</h1>
                    <p className="text-gray-400 mb-8">
                        {t('public_landing_subtitle')}
                    </p>

                    <div className="flex justify-center min-h-[120px]">
                        <Turnstile
                            sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAAWDc3h2C2F8Xn0K"}
                            onVerify={handleTurnstileVerify}
                            onError={() => setError(t('public_turnstile_error'))}
                        />
                    </div>

                    {isValidating && (
                        <div className="mt-4 text-cyan-400 text-sm animate-pulse">
                            {t('public_verifying')}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            {error}
                        </div>
                    )}

                </div>
                <div className="bg-gray-900/50 p-4 text-center border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                        {t('public_protected_by')}
                    </p>
                </div>
            </div>
        </div>
    );
};
