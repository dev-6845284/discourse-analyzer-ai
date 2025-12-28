import express from 'express';

export async function mountDevRoutes(app: express.Express): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
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
