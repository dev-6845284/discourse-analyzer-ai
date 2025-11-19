import { useState, useEffect, useCallback, useRef } from 'react';
import { UserInfo } from '../types';
import { shouldBypassAuth, getDefaultLocalUser } from '../utils/auth';
import { GOOGLE_CLIENT_ID } from '../config/app.config';
import api from '../utils/api';

// Declare the 'google' global object provided by the Google Identity Services script
declare const google: any;

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      const res = await api.post('/login', { token: response.credential });
      if (res.data.user) {
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
      setUser(null);
      setLoginError(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  const checkUserSession = useCallback(async () => {
    if (shouldBypassAuth()) {
      setUser(getDefaultLocalUser());
      setIsAuthLoading(false);
      return;
    }
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
    if (!isAuthLoading && !user && googleButtonRef.current) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
      });
      google.accounts.id.prompt();
    }
  }, [isAuthLoading, user, handleCredentialResponse]);

  return {
    user,
    loginError,
    isAuthLoading,
    googleButtonRef,
    handleLogout,
  };
}
