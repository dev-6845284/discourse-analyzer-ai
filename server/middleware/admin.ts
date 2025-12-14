import { Request, Response, NextFunction } from 'express';

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin role required.' });
};

export const isAdminOrDev = (req: Request, res: Response, next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev || (req.session.user && req.session.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin role required.' });
};
