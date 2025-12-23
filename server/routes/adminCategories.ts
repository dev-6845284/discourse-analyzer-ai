import express from 'express';
import { getAllCategories, createCategory, updateCategory, deleteCategory, reload } from '../services/categoryService';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

router.use(requireAdmin);

router.get('/', async (req, res) => {
  const cats = getAllCategories();
  res.json(cats);
});

router.post('/', async (req, res) => {
  try {
    const created = await createCategory(req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    // Ensure clients cannot change the category id via request body
    const patch = { ...(req.body || {}) } as any;
    if (Object.prototype.hasOwnProperty.call(patch, 'id')) delete patch.id;
    const updated = await updateCategory(req.params.id, patch);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteCategory(req.params.id);
    res.status(204).end();
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/reload', async (req, res) => {
  try {
    await reload();
    res.status(200).json({ message: 'reloaded' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
