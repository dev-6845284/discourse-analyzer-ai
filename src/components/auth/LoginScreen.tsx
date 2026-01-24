/**
 * LoginScreen Component
 *
 * Purpose:
 * - Provides the primary user authentication interface.
 * - Supports email/password login and "Developer Login" (in dev environments).
 *
 * Behavior:
 * - Manages local state for email, password, and submission status.
 * - Integrates with `TurnstileWidget` for CAPTCHA verification.
 * - Delegates actual login logic to the `onLogin` prop.
 *
 * Location: src/components/auth/LoginScreen.tsx
 */
import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { TurnstileWidget } from './TurnstileWidget';

interface LoginScreenProps {
  googleButtonRef: React.RefObject<HTMLDivElement>;
  loginError: string | null;
  onLogin: (email: string, password: string, token?: string) => Promise<void>;
  onDevLogin?: () => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ googleButtonRef, loginError, onLogin, onDevLogin }) => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // If site key is configured, token is required. If not, token is undefined.
    // However, we pass whatever we have. Logic is handled by onLogin / backend.
    await onLogin(email, password, turnstileToken);
    setIsSubmitting(false);
    // Reset token after submit (Turnstile usually requires reset, but we'll assume reload or simple retry for now)
    setTurnstileToken(undefined);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="hidden md:block text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-4">{t('appTitle')}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">{t('signInToContinue')}</p>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md mb-8 border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">{t('emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 leading-tight focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">{t('passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border border-gray-300 dark:border-gray-600 rounded w-full py-2 px-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 leading-tight focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onError={(err) => console.error('Turnstile Error:', err)}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? t('signingIn') : t('signIn')}
          </button>
        </form>
      </div>

      <div className="flex items-center w-full max-w-md mb-8">
        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        <span className="flex-shrink-0 mx-4 text-gray-500 dark:text-gray-400">{t('or')}</span>
        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
      </div>

      <div ref={googleButtonRef}></div>

      {import.meta.env.DEV && onDevLogin && (
        <div className="mt-4 w-full">
          <button
            onClick={onDevLogin}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded border border-gray-500 transition-colors flex items-center justify-center gap-2"
          >
            <span>👨‍💻</span> {t('developerLogin')}
          </button>
        </div>
      )}

      {loginError && <p className="mt-4 text-red-500">{t(loginError)}</p>}
    </div>
  );
};

export default LoginScreen;
