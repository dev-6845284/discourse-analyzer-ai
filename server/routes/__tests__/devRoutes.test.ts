import request from 'supertest';
import express from 'express';
import session from 'express-session';
import devRoutes from '../../routes/dev';

describe('dev routes', () => {
  function makeApp() {
    const app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
      }) as any
    );
    app.use('/api/dev', devRoutes as any);
    // test route to return session user
    app.get('/api/test/session', (req, res) => {
      res.json({ user: req.session?.user || null });
    });
    return app;
  }

  test('POST /api/dev/role sets session user role and GET /api/test/session returns it', async () => {
    const app = makeApp();
    const agent = request.agent(app as any);

    const res = await agent.post('/api/dev/role').send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('admin');

    const userRes = await agent.get('/api/test/session');
    expect(userRes.status).toBe(200);
    expect(userRes.body.user).toBeDefined();
    expect(userRes.body.user.role).toBe('admin');
  });

  test('POST /api/dev/role rejects invalid roles', async () => {
    const app = makeApp();
    const agent = request.agent(app as any);
    const res = await agent.post('/api/dev/role').send({ role: 'superadmin' });
    expect(res.status).toBe(400);
  });
});