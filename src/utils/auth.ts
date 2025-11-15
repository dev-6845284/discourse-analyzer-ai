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
    picture: '',
  };
}
