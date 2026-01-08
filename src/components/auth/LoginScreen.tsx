import React, { useState } from 'react';

import { TurnstileWidget } from './TurnstileWidget';

interface LoginScreenProps {
  googleButtonRef: React.RefObject<HTMLDivElement>;
  loginError: string | null;
  onLogin: (email: string, password: string, token?: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ googleButtonRef, loginError, onLogin }) => {
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
      <h1 className="hidden md:block text-4xl font-bold text-cyan-400 mb-4">Discourse Analyzer AI</h1>
      <p className="text-gray-400 mb-8">Please sign in to continue</p>

      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:border-cyan-500"
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
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="flex items-center w-full max-w-md mb-8">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink-0 mx-4 text-gray-500">OR</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>

      <div ref={googleButtonRef}></div>
      {loginError && <p className="mt-4 text-red-500">{loginError}</p>}
    </div>
  );
};

export default LoginScreen;
