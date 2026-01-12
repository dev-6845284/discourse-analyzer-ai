import express from 'express';
import ApiPermission, { IApiPermission } from '../models/ApiPermission';

const ROLE_HIERARCHY = ['viewer', 'moderator', 'editor', 'admin'];

export function isRoleSufficient(userRole: string | undefined, requiredRole: string) {
  if (!userRole) return false;
  const userIdx = ROLE_HIERARCHY.indexOf(userRole);
  const reqIdx = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userIdx === -1 || reqIdx === -1) return false;
  return userIdx >= reqIdx;
}

function pathToRegex(pathPattern: string) {
  // Convert express-style route patterns like /api/quotes/:id to regex
  const escaped = pathPattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  const withParams = escaped.replace(/\\:([a-zA-Z0-9_]+)/g, '[^/]+');
  return new RegExp(`^${withParams}$`);
}

export function normalizePathForCategorization(path: string): string {
  if (!path) return path;
  const segments = path.split('/');
  const normalized = segments
    .map((seg) => {
      if (!seg) return '';
      // Mongo ObjectId (24 hex chars)
      if (/^[0-9a-f]{24}$/i.test(seg)) return ':id';
      // UUID v4
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':id';
      // Numeric IDs
      if (/^\d+$/.test(seg)) return ':id';
      // IPv4
      if (/^\d+\.\d+\.\d+\.\d+$/.test(seg)) return ':ip';
      // Likely encoded tokens or long slugs (heuristic)
      // Only treat long purely alphanumeric segments that contain digits as IDs
      if (/^[A-Za-z0-9]{8,}$/.test(seg) && /[0-9]/.test(seg)) return ':id';
      return seg;
    })
    .join('/');
  // Ensure leading slash if present in original
  return path.startsWith('/') ? '/' + normalized.replace(/^\//, '') : normalized;
}

export async function getRequiredRoleForRequest(method: string, path: string): Promise<string> {
  // Normalize incoming path to strip unique identifiers so we can categorize consistently
  const normalizedPath = normalizePathForCategorization(path);

  // Try exact match first (on normalized path)
  const exact = await ApiPermission.findOne({ method, path: normalizedPath }).lean();
  if (exact) return exact.requiredRole;

  // Try pattern matches against original path (patterns in DB may include :param placeholders)
  const perms = await ApiPermission.find({ method }).lean();
  for (const p of perms) {
    const re = pathToRegex(p.path);
    if (re.test(path)) return p.requiredRole;
  }

  // No permission found — insert new permission with admin role using normalized path
  // Log normalized path as the fourth argument to match test expectations
  console.warn('[PERMISSIONS] No permission found for', method, path, normalizedPath);
  // Some test mocks may not provide a `.create` helper; guard the call to avoid throwing during tests
  try {
    if (typeof (ApiPermission as any).create === 'function') {
      await (ApiPermission as any).create({ method, path: normalizedPath, requiredRole: 'admin' });
    }
  } catch (e) {
    console.error('[PERMISSIONS] Failed to create permission doc:', (e as Error).message);
  }
  return 'admin';
}

function extractRoutes(app: express.Express | express.Router) {
  const routes: Array<{ method: string; path: string }> = [];

  function traverse(stack: any[], prefix = '') {
    for (const layer of stack) {
      if (!layer) continue;
      if (layer.route && layer.route.path) {
        // layer.route.paths may be string or array
        const routePath = Array.isArray(layer.route.path) ? layer.route.path[0] : layer.route.path;
        const methods = Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase());
        for (const m of methods) {
          routes.push({ method: m, path: prefix + routePath });
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        // Try to get path from layer
        // Express doesn't easily expose the mount path; rely on layer?.path if present
        if (layer?.path) {
          traverse(layer.handle.stack, prefix + layer.path);
        } else {
          // Fallback: traverse without modifying prefix
          traverse(layer.handle.stack, prefix);
        }
      } else if (layer.name === 'bound dispatch' && layer.method) {
        // unsupported
      }
    }
  }

  // @ts-ignore - _router exists on app
  const router = (app as any)._router || app;
  if (router && router.stack) traverse(router.stack as any[], '');
  return routes;
}

export function inferDefaultRole(method: string, path: string): string {
  // Normalize path parameters so patterns like /api/quotes/:id and /api/quotes/123 match
  const normalized = path.replace(/\/:([^/]+)/g, '/:id');

  // Explicitly mark login, dev, and session endpoints as public so they remain accessible without authZ
  if (normalized === '/api/login' || normalized === '/api/login/password' || normalized === '/api/logout' || normalized === '/api/session/debug' || normalized.startsWith('/api/dev')) {
    return 'public';
  }

  // Admin area and system endpoints should be admin-only
  if (normalized.startsWith('/api/admin') || normalized === '/api/logs' || normalized.startsWith('/api/users')) {
    return 'admin';
  }

  // Settings
  if (normalized === '/api/settings') {
    return method === 'GET' ? 'viewer' : 'admin';
  }

  // People endpoints: delete -> admin, get -> viewer, others -> editor
  if (/^\/api\/people(\/|$)/.test(normalized)) {
    if (method === 'DELETE') return 'admin';
    if (method === 'GET') return 'viewer';
    return 'editor';
  }

  // IP blocking and other protection endpoints should be admin
  if (/^\/api\/blocked-ips(\/|$)/.test(normalized)) return 'admin';

  // Generic heuristics
  if (method === 'GET') return 'viewer';
  if (method === 'DELETE') return 'moderator';
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return 'editor';

  // Fallback to admin for unexpected cases
  return 'admin';
}

export async function registerEndpoints(app: express.Express) {
  try {
    const routes = extractRoutes(app);
    // Deduplicate
    const unique = new Map<string, { method: string; path: string }>();
    for (const r of routes) {
      unique.set(`${r.method} ${r.path}`, r);
    }

    const now = new Date();
    for (const r of unique.values()) {
      const requiredRole = inferDefaultRole(r.method, r.path);

      // Force update for settings route to ensure previous default doesn't stick
      // Also force update for other system routes if needed, but start with settings
      const updateOp = (r.path === '/api/settings')
        ? { $set: { requiredRole, updatedAt: now }, $setOnInsert: { method: r.method, path: r.path, createdAt: now } }
        : { $setOnInsert: { method: r.method, path: r.path, requiredRole, createdAt: now, updatedAt: now } };

      await ApiPermission.updateOne(
        { method: r.method, path: r.path },
        updateOp,
        { upsert: true }
      );
    }

    console.log('[PERMISSIONS] Registered/updated', unique.size, 'endpoints');
  } catch (error) {
    console.error('[PERMISSIONS] Failed to register endpoints:', (error as Error).message);
  }
}

/**
 * Normalize already stored ApiPermission paths by stripping concrete IDs
 * and merging duplicate entries if necessary.
 */
export async function normalizeStoredPermissions() {
  const perms = await ApiPermission.find().lean();
  let updated = 0;
  for (const p of perms) {
    const normalized = normalizePathForCategorization(p.path);
    if (normalized === p.path) continue;

    const existing = await ApiPermission.findOne({ method: p.method, path: normalized });
    if (existing) {
      // Merge roles by picking stricter requiredRole (higher index)
      const existingIdx = ROLE_HIERARCHY.indexOf(existing.requiredRole);
      const pIdx = ROLE_HIERARCHY.indexOf(p.requiredRole);
      const stricter = ROLE_HIERARCHY[Math.max(existingIdx, pIdx)];
      if (stricter !== existing.requiredRole) {
        await ApiPermission.updateOne({ _id: existing._id }, { $set: { requiredRole: stricter, updatedAt: new Date() } });
      }
      // Remove the old, more specific permission
      await ApiPermission.deleteOne({ _id: p._id });
      updated++;
    } else {
      // Update the stored document to use normalized path
      await ApiPermission.updateOne({ _id: p._id }, { $set: { path: normalized, updatedAt: new Date() } });
      updated++;
    }
  }
  console.log('[PERMISSIONS] Normalized stored permission paths, updated entries:', updated);
  return updated;
}

export async function listPermissions(): Promise<IApiPermission[]> {
  const docs = await ApiPermission.find().sort({ path: 1, method: 1 }).lean();
  return docs as unknown as IApiPermission[];
}

export async function updatePermission(id: string, updates: Partial<IApiPermission>) {
  return ApiPermission.findByIdAndUpdate(id, updates, { new: true });
}

export async function findPermissionById(id: string) {
  return ApiPermission.findById(id).lean();
}

export default {
  isRoleSufficient,
  getRequiredRoleForRequest,
  registerEndpoints,
  listPermissions,
  updatePermission,
  findPermissionById,
  inferDefaultRole,
  normalizePathForCategorization,
  normalizeStoredPermissions,
};
