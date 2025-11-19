import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log session details for debugging
  console.log('Auth Check:', {
    path: req.path,
    sessionID: req.sessionID,
    hasUser: !!req.session?.user,
    env: process.env.NODE_ENV
  });

  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  if (req.session.user) {
    return next();
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};
