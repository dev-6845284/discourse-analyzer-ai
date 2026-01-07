import express from 'express';
import * as userService from '../services/userService';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import authorizeMiddleware from '../middleware/authorize';

const router = express.Router();
// Protect all user routes with authentication and admin check
router.use(isAuthenticated);
router.use(authorizeMiddleware);
// admin-only checks for listing/creating/deleting users
// admin-only checks for listing/creating/deleting users moved to specific routes

// PUT /api/users/me/password - user changes their own password with verification
router.put('/me/password', isAuthenticated, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both old and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    await userService.changePasswordWithVerification(userId, oldPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error updating password' });
  }
});

router.put('/:id/password', isAuthenticated, async (req, res) => {
  try {
    const { password } = req.body;
    const requestingUser = req.session.user;

    // Check permissions: Admin or the user themselves
    if (requestingUser?.role !== 'admin' && requestingUser?._id !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to change this password' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    await userService.changePassword(req.params.id, password);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error });
  }
});

// GET /api/users/me/keyset - fetch authenticated user's personal keyset
router.get('/me/keyset', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const USERS_KEYSET = process.env.USERS_KEYSET_ALIAS || 'USERS_KEYSET';
    const svc = await import('../services/apiKeyService');
    const set = await svc.getApiKeySetByAliasAndCreator(USERS_KEYSET, userId);
    res.json(set || null);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user keyset', error });
  }
});

// PUT /api/users/me/keyset - create or update authenticated user's personal keyset
router.put('/me/keyset', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY } = req.body;
    const svc = await import('../services/apiKeyService');
    const updated = await svc.upsertUserKeyset(userId, { GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user keyset', error });
  }
});

router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const requestingUser = req.session.user;
    const authenticatedUserId = requestingUser?._id?.toString?.() || requestingUser?._id;
    const isSelf = authenticatedUserId === req.params.id;
    const isAdminUser = requestingUser?.role === 'admin';

    if (!isAdminUser && !isSelf) {
      return res.status(403).json({ message: 'Unauthorized to update this user' });
    }

    const updates = { ...req.body };

    // If not admin, restrict updates to allowed fields
    if (!isAdminUser) {
      const allowedFields = ['alias'];
      Object.keys(updates).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updates[key];
        }
      });
    }

    const user = await userService.updateUser(req.params.id, updates);

    // If self-update, update session
    if (isSelf) {
      req.session.user = {
        ...req.session.user!,
        name: user.alias,
      };
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
  }
});

// GET /api/users/:id/keyset - fetch the user's personal keyset (alias = USERS_KEYSET)
router.get('/:id/keyset', isAuthenticated, async (req, res) => {
  try {
    const requestingUser = req.session.user;
    const requestedUserId = req.params.id;
    const authenticatedUserId = requestingUser?._id?.toString?.() || requestingUser?._id;
    const isSelf = authenticatedUserId === requestedUserId;
    const isAdminUser = requestingUser?.role === 'admin';
    if (!isSelf && !isAdminUser) return res.status(403).json({ message: 'Unauthorized' });

    const USERS_KEYSET = process.env.USERS_KEYSET_ALIAS || 'USERS_KEYSET';
    const set = await (await import('../services/apiKeyService')).getApiKeySetByAliasAndCreator(USERS_KEYSET, requestedUserId);
    res.json(set || null);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user keyset', error });
  }
});

// PUT /api/users/:id/keyset - create or update the user's personal keyset (alias = USERS_KEYSET)
router.put('/:id/keyset', isAuthenticated, async (req, res) => {
  try {
    const requestingUser = req.session.user;
    const requestedUserId = req.params.id;
    const authenticatedUserId = requestingUser?._id?.toString?.() || requestingUser?._id;
    const isSelf = authenticatedUserId === requestedUserId;
    const isAdminUser = requestingUser?.role === 'admin';
    if (!isSelf && !isAdminUser) return res.status(403).json({ message: 'Unauthorized' });

    const { GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY } = req.body;
    const svc = await import('../services/apiKeyService');
    // Use the requested userId (which is either the authenticated user's own ID, or an admin managing another user's keys)
    const updated = await svc.upsertUserKeyset(requestedUserId, { GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user keyset', error });
  }
});



router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

router.post('/', isAdmin, async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error creating user', error });
  }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

// GET user's assigned keyset
router.get('/:id/assigned-keyset', isAuthenticated, async (req, res) => {
  try {
    const requestingUser = req.session.user;
    const authenticatedUserId = requestingUser?._id?.toString?.() || requestingUser?._id;
    const isSelf = authenticatedUserId === req.params.id;
    const isAdminUser = requestingUser?.role === 'admin';

    if (!isAdminUser && !isSelf) {
      return res.status(403).json({ message: 'Unauthorized to view this user keyset' });
    }

    const keyset = await userService.getUserAssignedKeyset(req.params.id);
    res.json(keyset);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching user keyset', error });
  }
});

export default router;
