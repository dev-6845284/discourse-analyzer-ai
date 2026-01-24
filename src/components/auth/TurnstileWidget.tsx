/**
 * TurnstileWidget Component
 *
 * Purpose:
 * - A wrapper around the Cloudflare Turnstile CAPTCHA service.
 * - Ensures requests are coming from human users, protecting against bots.
 *
 * Behavior:
 * - Renders the Turnstile iframe/widget using the site key from environment variables.
 * - Returns a verification token via `onVerify` callback upon success.
 * - Fails gracefully (shows message) if no site key is configured.
 *
 * Location: src/components/auth/TurnstileWidget.tsx
 */
import React from 'react';
import Turnstile from 'react-turnstile';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: (error: any) => void;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onVerify, onError }) => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (!siteKey) {
        return (
            <div className="text-gray-500 text-xs mb-4 text-center">
                (CAPTCHA disabled: No Site Key)
            </div>
        );
    }

    return (
        <div className="mb-6 flex justify-center">
            <Turnstile
                sitekey={siteKey}
                onVerify={onVerify}
                onError={onError}
                theme="dark"
            />
        </div>
    );
};
