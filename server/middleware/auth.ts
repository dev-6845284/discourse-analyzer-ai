import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  if (req.session.user) {
    return next();
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};
