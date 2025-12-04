import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Detailed logging for authentication debugging
  const authDebug = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    hasSessionData: !!req.session?.id,
    hasUser: !!req.session?.user,
    userData: req.session?.user ? {
      email: req.session.user.email,
      name: req.session.user.name,
      role: req.session.user.role,
      _id: (req.session.user as any)._id
    } : null,
    cookies: {
      hasCookie: !!req.headers.cookie,
      cookieHeader: req.headers.cookie ? '[PRESENT]' : '[MISSING]'
    },
    env: process.env.NODE_ENV,
    bypassAuth: process.env.BYPASS_AUTH
  };
  
  console.log('[AUTH_CHECK]', JSON.stringify(authDebug, null, 2));

  if (process.env.BYPASS_AUTH === 'true') {
    console.log('[AUTH_BYPASS] BYPASS_AUTH is enabled');
    if (!req.session.user) {
      req.session.user = {
        email: 'developer@example.com',
        name: 'Local Developer',
        picture: '',
        role: 'admin'
      };
      console.log('[AUTH_BYPASS] Created developer user');
    }
    return next();
  }
  
  if (req.session.user) {
    console.log('[AUTH_SUCCESS]', `User authenticated: ${req.session.user.email}`);
    return next();
  } else {
    console.log('[AUTH_FAILED] No user in session - returning 401');
    res.status(401).json({ 
      message: 'Not authenticated',
      debug: {
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        sessionID: req.sessionID
      }
    });
  }
};
