import { Request, Response, NextFunction } from 'express';
import permissionService from '../services/permissionService';

const PUBLIC_WHITELIST = [
  '/api/login',
  '/api/login/password',
  '/api/logout',
  '/api/dev/role',
  '/api/session/debug',// ToDo remove from whitelist
];

export async function authorizeMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Build full path (including mount prefix)
    const fullPath = (req.baseUrl || '') + (req.path || '');
    const method = req.method.toUpperCase();

    // Quick whitelist check
    if (PUBLIC_WHITELIST.includes(fullPath)) {
      return next();
    }

    // Explicitly allow dev-only endpoints when running in development and deny in other envs.
    if (fullPath.startsWith('/api/dev')) {
      if (process.env.NODE_ENV === 'development') return next();
      return res.status(404).json({ message: 'Not found' });
    }

    const requiredRole = await permissionService.getRequiredRoleForRequest(method, fullPath);

    if (!requiredRole) {
      // No permission record found - deny by default
      console.warn('[AUTHZ] No permission configured for', method, fullPath);
      return res.status(403).json({ message: 'Access forbidden: no permission configured' });
    }

    // If endpoint is explicitly 'public', allow
    if (requiredRole === 'public') return next();

    const userRole = req.session?.user?.role as string | undefined;

    if (!userRole) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const ok = permissionService.isRoleSufficient(userRole, requiredRole);
    if (!ok) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }

    next();
  } catch (error) {
    console.error('[AUTHZ_ERROR]', error);
    res.status(500).json({ message: 'Authorization failure', error });
  }
}

export default authorizeMiddleware;
