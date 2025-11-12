/**
 * Decodes a JWT token and returns the payload
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Checks if the current environment is a local development environment
 */
export function isLocalEnvironment(): boolean {
  const hostname = window.location.hostname;
  return !hostname || hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Determines if authentication should be bypassed
 * (for AI Studio, localhost, and 127.0.0.1)
 */
export function shouldBypassAuth(): boolean {
  return isLocalEnvironment();
}

/**
 * Gets the default user for local development
 */
export function getDefaultLocalUser() {
  return {
    email: 'developer@example.com',
    name: 'Local Developer',
  };
}
