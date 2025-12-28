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

export default router;
