import express from 'express';
import * as userService from '../services/userService';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import authorizeMiddleware from '../middleware/authorize';

const router = express.Router();

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

router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const requestingUser = req.session.user;
    const isSelf = requestingUser?._id === req.params.id;
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

// Protect all user routes with authentication and admin check
router.use(isAuthenticated);
router.use(authorizeMiddleware);
// admin-only checks for listing/creating/deleting users
router.use(isAdmin);

router.get('/', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

router.post('/', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

export default router;
