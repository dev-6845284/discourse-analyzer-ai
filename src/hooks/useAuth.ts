import { useState, useEffect, useCallback, useRef } from 'react';
import { UserInfo } from '../types';
import { GOOGLE_CLIENT_ID } from '../config/app.config';
import api from '../utils/api';
import { useI18n } from '../i18n';

// Declare the 'google' global object provided by the Google Identity Services script
declare const google: any;

export function useAuth() {
  const { t } = useI18n();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      const res = await api.post('/login', { token: response.credential });
      if (res.data.user) {
        localStorage.removeItem('dev_logged_out');
        setUser(res.data.user);
        setLoginError(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed.';
      setLoginError(message);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/logout');
      localStorage.setItem('dev_logged_out', 'true');
      setUser(null);
      setLoginError(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  const loginWithPassword = useCallback(async (email, password, turnstileToken?: string) => {
    try {
      const res = await api.post('/login/password', { email, password, turnstileToken });
      if (res.data.user) {
        localStorage.removeItem('dev_logged_out');
        setUser(res.data.user);
        setLoginError(null);
      }
    } catch (error: any) {
      let message = error.response?.data?.message || 'Login failed.';
      if (error.response?.data?.retryAfter) {
        message = t('pleaseWaitSeconds', { seconds: error.response.data.retryAfter });
      }
      setLoginError(message);
    }
  }, [t]);

  const loginAsDev = useCallback(async () => {
    try {
      const res = await api.post('/dev/login');
      if (res.data.user) {
        setUser(res.data.user);
        setLoginError(null);
      }
    } catch (error: any) {
      console.error('Dev login failed:', error);
      setLoginError('Dev login failed');
    }
  }, []);

  const checkUserSession = useCallback(async () => {
    try {
      const res = await api.get('/user');
      if (res.data.user) {
        setUser(res.data.user);
      }
    } catch (error) {
      // No active session, user needs to log in.
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  useEffect(() => {
    // Wait for auth check to complete
    if (isAuthLoading || !googleButtonRef.current) return;

    // Helper to initialize Google button
    const initializeGoogle = () => {
      if (typeof google === 'undefined' || !googleButtonRef.current || user) return;

      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'missing-client-id') {
        process.env.NODE_ENV !== 'production' && console.warn('Google Client ID is missing or invalid. Google Sign-In will not be available.');
        return;
      }

      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
        });
        google.accounts.id.prompt();
      } catch (error) {
        console.error('Google Sign-In initialization failed:', error);
      }
    };

    // If google script is already loaded
    if (typeof google !== 'undefined') {
      initializeGoogle();
    } else {
      // Poll for google script availability (in case of async load race condition)
      const intervalId = setInterval(() => {
        if (typeof google !== 'undefined') {
          clearInterval(intervalId);
          initializeGoogle();
        }
      }, 100);

      // Cleanup interval on unmount or deps change
      return () => clearInterval(intervalId);
    }
  }, [isAuthLoading, user, handleCredentialResponse]);

  const updateUser = useCallback((updates: Partial<UserInfo>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return {
    user,
    loginError,
    isAuthLoading,
    googleButtonRef,
    handleLogout,
    loginWithPassword,
    loginAsDev,
    updateUser,
  };
}
