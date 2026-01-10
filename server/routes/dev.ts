import express from 'express';
import { isLocal, isTest } from '../constants/env';
// Keep dev routes lightweight to avoid importing models (and mongoose side-effects) at module load time
const USER_ROLES = ['admin', 'editor', 'moderator', 'viewer'] as const;


const router = express.Router();

// Only enable in non-production environments
// Only enable in non-production environments (allow tests)
router.use((req, res, next) => {
  if (!isLocal && !isTest) {
    return res.status(404).json({ message: 'Not found' });
  }
  next();
});

// List available roles and current session role
router.get('/roles', (req, res) => {
  const roles = Array.from(USER_ROLES as readonly string[]);
  const current = req.session?.user?.role || null;
  res.json({ roles, current });
});

// Set current session user's role (for local testing)
router.post('/role', async (req, res) => {
  const { role } = req.body || {};
  const validRoles = Array.from(USER_ROLES as readonly string[]);
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  // Ensure req.session.user exists so the frontend can rely on /api/user
  req.session.user = req.session.user || { _id: undefined, email: 'local@test', name: 'Local Tester', picture: '', role };
  req.session.user.role = role;

  // If a real user is signed in, persist role change in DB for convenience (dynamic import)
  try {
    if (req.session.user._id) {
      const mod = await import('../models/User');
      const UserModel = (mod as any).default;
      await UserModel.findByIdAndUpdate(req.session.user._id, { role }, { new: true });
    }
  } catch (e) {
    console.warn('Failed to persist role change to user record:', (e as Error).message);
  }

  req.session.save((err) => {
    if (err) return res.status(500).json({ message: 'Failed to save session' });
    res.json({ user: req.session.user });
  });
});

export default router;