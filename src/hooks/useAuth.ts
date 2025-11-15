import { useState, useEffect, useCallback, useRef } from 'react';
import { UserInfo } from '../types';
import { APPROVED_EMAILS } from '../constants';
import { decodeJwt, shouldBypassAuth, getDefaultLocalUser } from '../utils/auth';
import { GOOGLE_CLIENT_ID } from '../config/app.config';

// Declare the 'google' global object provided by the Google Identity Services script
declare const google: any;

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(() => {
    return shouldBypassAuth() ? getDefaultLocalUser() : null;
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback((response: any) => {
    const decoded = decodeJwt(response.credential);
    if (decoded && decoded.email) {
      if (APPROVED_EMAILS.includes(decoded.email)) {
        setUser({
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        });
        setLoginError(null);
      } else {
        setLoginError('Access denied. Your email is not on the approved list.');
      }
    } else {
      setLoginError('Login failed. Could not verify email.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setLoginError(null);
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname;
    // Initialize Google Sign-In only in production-like environments
    if (
      hostname &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !user &&
      googleButtonRef.current
    ) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: false,
      });
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
      });
      google.accounts.id.prompt();
    }
  }, [user, handleCredentialResponse]);

  return {
    user,
    loginError,
    googleButtonRef,
    handleLogout,
  };
}
