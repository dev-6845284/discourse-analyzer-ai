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
