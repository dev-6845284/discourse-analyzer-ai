import express, { Request, Response } from 'express';
import * as service from '../services/apiKeyService';

const router = express.Router();

// GET /api/admin/api-key-sets
router.get('/', async (req: Request, res: Response) => {
  try {
    const sets = await service.listApiKeySets_Public();
    res.json(sets);
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to list api key sets:', (error as Error).message);
    res.status(500).json({ error: 'Failed to list api key sets' });
  }
});

// POST /api/admin/api-key-sets
router.post('/', async (req: Request, res: Response) => {
  try {
    const { alias, GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY } = req.body;
    const createdBy = (req as any).session?.userId || undefined;
    // Prevent admins from creating the reserved per-user alias
    const USERS_KEYSET = process.env.USERS_KEYSET_ALIAS || 'USERS_KEYSET';
    if (alias === USERS_KEYSET) {
      return res.status(400).json({ error: 'Cannot create reserved USERS_KEYSET via admin endpoint' });
    }
    const set = await service.createApiKeySet({ alias, GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY, createdBy });
    res.status(201).json(await service.getApiKeySetById_Public(set._id.toString()));
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to create api key set:', (error as Error).message);
    res.status(500).json({ error: 'Failed to create api key set' });
  }
});

// GET /api/admin/api-key-sets/available
// Return all keysets that are not the reserved per-user alias
router.get('/available', async (req: Request, res: Response) => {
  try {
    const USERS_KEYSET = process.env.USERS_KEYSET_ALIAS || 'USERS_KEYSET';
    const sets = await service.listApiKeySets_Public();
    const filtered = sets.filter((s: any) => s.alias !== USERS_KEYSET);
    res.json(filtered);
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to list available api key sets:', (error as Error).message);
    res.status(500).json({ error: 'Failed to list available api key sets' });
  }
});

// GET /api/admin/api-key-sets/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const d = await service.getApiKeySetById_Public(req.params.id);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to get api key set:', (error as Error).message);
    res.status(500).json({ error: 'Failed to get api key set' });
  }
});

// PUT /api/admin/api-key-sets/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { alias, GEMINI_API_KEY, GROK_API_KEY, CHATGPT_API_KEY, overwrite_GEMINI_API_KEY, overwrite_GROK_API_KEY, overwrite_CHATGPT_API_KEY } = req.body;
    
    // Build updates: only include key if overwrite flag is true
    const updates: any = {};
    if (alias !== undefined) updates.alias = alias;
    if (overwrite_GEMINI_API_KEY && GEMINI_API_KEY) updates.GEMINI_API_KEY = GEMINI_API_KEY;
    if (overwrite_GROK_API_KEY && GROK_API_KEY) updates.GROK_API_KEY = GROK_API_KEY;
    if (overwrite_CHATGPT_API_KEY && CHATGPT_API_KEY) updates.CHATGPT_API_KEY = CHATGPT_API_KEY;
    
    updates.updatedBy = (req as any).session?.userId || undefined;
    const updated = await service.updateApiKeySet(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(await service.getApiKeySetById_Public(req.params.id));
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to update api key set:', (error as Error).message);
    res.status(500).json({ error: 'Failed to update api key set' });
  }
});

// DELETE /api/admin/api-key-sets/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await service.deleteApiKeySet(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to delete api key set:', (error as Error).message);
    res.status(500).json({ error: 'Failed to delete api key set' });
  }
});

// POST /api/admin/api-key-sets/:id/assign
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    const assignedBy = (req as any).session?.userId || undefined;
    const r = await service.assignKeySetToUser(req.params.id, userId, assignedBy, role);
    res.status(201).json(r);
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to assign api key set:', (error as Error).message);
    res.status(500).json({ error: 'Failed to assign api key set' });
  }
});

// POST /api/admin/api-key-sets/:id/unassign
router.post('/:id/unassign', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await service.unassignKeySetFromUser(req.params.id, userId);
    res.status(204).end();
  } catch (error) {
    console.error('[ADMIN][API_KEYS] Failed to unassign api key set:', (error as Error).message);
    res.status(500).json({ error: 'Failed to unassign api key set' });
  }
});

export default router;
