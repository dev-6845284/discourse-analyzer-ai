import express from 'express';
import permissionService from '../services/permissionService';

const router = express.Router();

// List all permissions
router.get('/', async (req, res) => {
  try {
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const perms = await permissionService.listPermissions();
    res.json(perms);
  } catch (error) {
    console.error('[ADMIN][ACCESS_CTRL] Failed to list permissions:', error);
    res.status(500).json({ error: 'Failed to list permissions' });
  }
});

// Update a permission (e.g., change requiredRole)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await permissionService.updatePermission(id, updates as any);
    res.json(updated);
  } catch (error) {
    console.error('[ADMIN][ACCESS_CTRL] Failed to update permission:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// Create a permission entry
router.post('/', async (req, res) => {
  try {
    const { method, path, requiredRole, description } = req.body;
    if (!method || !path || !requiredRole) return res.status(400).json({ error: 'method, path and requiredRole required' });
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const ApiPermission = (await import('../models/ApiPermission')).default;
    const created = await ApiPermission.create({ method, path, requiredRole, description });
    res.status(201).json(created);
  } catch (error) {
    console.error('[ADMIN][ACCESS_CTRL] Failed to create permission:', error);
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

// Import permissions (bulk upsert)
router.post('/import', async (req, res) => {
  try {
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions must be an array' });
    }

    if (permissions.length === 0) {
      return res.status(400).json({ error: 'No permissions to import' });
    }

    const ApiPermission = (await import('../models/ApiPermission')).default;
    let imported = 0;

    for (const perm of permissions) {
      // Validate required fields
      if (!perm.method || !perm.path) {
        console.warn('[ADMIN][ACCESS_CTRL] Skipping invalid permission:', perm);
        continue;
      }

      try {
        // Upsert: update if exists (by method + path), otherwise create
        const result = await ApiPermission.findOneAndUpdate(
          { method: perm.method, path: perm.path },
          {
            method: perm.method,
            path: perm.path,
            requiredRole: perm.requiredRole || 'public',
            description: perm.description,
          },
          { upsert: true, new: true }
        );

        if (result) {
          imported++;
        }
      } catch (err) {
        console.error('[ADMIN][ACCESS_CTRL] Failed to upsert permission:', perm, err);
      }
    }

    // Log the import action
    const userId = req.session.user._id;
    console.log(`[ADMIN][ACCESS_CTRL] User ${userId} imported ${imported} permission(s)`);

    res.json({
      message: `Successfully imported ${imported} permission(s)`,
      imported,
    });
  } catch (error) {
    console.error('[ADMIN][ACCESS_CTRL] Failed to import permissions:', error);
    res.status(500).json({ error: 'Failed to import permissions' });
  }
});

export default router;
