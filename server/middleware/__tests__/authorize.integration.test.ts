import express from 'express';
import request from 'supertest';
import authorizeMiddleware from '../authorize';
import permissionService from '../../services/permissionService';

describe('authorizeMiddleware integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('public endpoint passes without session', async () => {
    jest.spyOn(permissionService, 'getRequiredRoleForRequest').mockResolvedValue('public');

    const app = express();
    app.use(authorizeMiddleware);
    app.get('/test-public', (req, res) => res.status(200).send('ok'));

    const res = await request(app).get('/test-public');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  test('returns 401 when not authenticated and required role not public', async () => {
    jest.spyOn(permissionService, 'getRequiredRoleForRequest').mockResolvedValue('viewer');

    const app = express();
    app.use(authorizeMiddleware);
    app.get('/test-auth', (req, res) => res.status(200).send('ok'));

    const res = await request(app).get('/test-auth');
    expect(res.status).toBe(401);
  });

  test('returns 403 for insufficient role', async () => {
    jest.spyOn(permissionService, 'getRequiredRoleForRequest').mockResolvedValue('editor');

    const app = express();
    // fake session injection based on header
    app.use((req, res, next) => {
      req.session = {} as any;
      const role = req.headers['x-user-role'] as string | undefined;
      if (role) req.session.user = { role, email: 'test@example.com', name: 'tester', picture: '' } as any;
      next();
    });
    app.use(authorizeMiddleware);
    app.get('/test-editor', (req, res) => res.status(200).send('ok'));

    const res = await request(app).get('/test-editor').set('x-user-role', 'viewer');
    expect(res.status).toBe(403);
  });

  test('allows when role is sufficient', async () => {
    jest.spyOn(permissionService, 'getRequiredRoleForRequest').mockResolvedValue('editor');

    const app = express();
    app.use((req, res, next) => {
      req.session = {} as any;
      req.session.user = { role: 'admin', email: 'admin@example.com', name: 'admin', picture: '' } as any;
      next();
    });
    app.use(authorizeMiddleware);
    app.get('/test-editor-ok', (req, res) => res.status(200).send('ok'));

    const res = await request(app).get('/test-editor-ok');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  test('dev endpoints are allowed in development without session', async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Ensure permission service would say viewer (not public) to prove bypass happens
    jest.spyOn(permissionService, 'getRequiredRoleForRequest').mockResolvedValue('viewer');

    const app = express();
    app.use(authorizeMiddleware);
    app.get('/api/dev/roles', (req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get('/api/dev/roles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    process.env.NODE_ENV = orig;
  });

  test('dev endpoints return 404 in non-development envs', async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const app = express();
    app.use(authorizeMiddleware);
    app.get('/api/dev/roles', (req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get('/api/dev/roles');
    expect(res.status).toBe(404);

    process.env.NODE_ENV = orig;
  });
});