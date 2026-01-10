import express from 'express';
import { isLocal } from '../constants/env';

export async function mountDevRoutes(app: express.Express): Promise<boolean> {
  if (isLocal()) {
    try {
      const m = await import('../routes/dev');
      app.use('/api/dev', (m as any).default);
      return true;
    } catch (e: any) {
      console.warn('Could not load dev routes:', e.message);
      return false;
    }
  }
  return false;
}

export default mountDevRoutes;
