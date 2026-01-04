import request from 'supertest';
import express from 'express';
import session from 'express-session';
import usersRoutes from '../../routes/users';
import * as apiKeySvc from '../../services/apiKeyService';
import * as userService from '../../services/userService';

jest.mock('../../services/apiKeyService');
jest.mock('../../services/userService');
// Mock authorizeMiddleware to bypass DB calls and permission checks
jest.mock('../../middleware/authorize', () => ({
  __esModule: true,
  default: (req: any, res: any, next: any) => next(),
  authorizeMiddleware: (req: any, res: any, next: any) => next(),
}));


function makeAppWithSession(user: any) {
  const app = express();
  app.use(express.json());
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: true }) as any
  );

  // middleware to seed session user for tests
  app.use((req, res, next) => {
    if (user) req.session.user = { ...user };
    next();
  });
  // require routes after mocks are set up - actually imports work fine with jest.mock
  app.use('/api/users', usersRoutes as any);
  return app;
}

describe('User keyset routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('PUT /api/users/:id/keyset allows self to upsert keyset', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const app = makeAppWithSession({ _id: userId, role: 'viewer' });
    const agent = request.agent(app as any);

    const returned = { alias: 'USERS_KEYSET', GEMINI_API_KEY: 'g1' };
    (apiKeySvc.upsertUserKeyset as jest.Mock).mockResolvedValue(returned);

    const res = await agent.put(`/api/users/${userId}/keyset`).send({ GEMINI_API_KEY: 'g1' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(returned);
    expect(apiKeySvc.upsertUserKeyset).toHaveBeenCalledWith(userId, { GEMINI_API_KEY: 'g1', GROK_API_KEY: undefined, CHATGPT_API_KEY: undefined });
  });

  test('PUT /api/users/:id/keyset rejects non-self non-admin', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const app = makeAppWithSession({ _id: 'other', role: 'viewer' });
    const agent = request.agent(app as any);

    const res = await agent.put(`/api/users/${userId}/keyset`).send({ GEMINI_API_KEY: 'g1' });
    expect(res.status).toBe(403);
    expect(apiKeySvc.upsertUserKeyset).not.toHaveBeenCalled();
  });

  test('PUT /api/users/:id/keyset allows admin to upsert for other user', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const app = makeAppWithSession({ _id: 'admin1', role: 'admin' });
    const agent = request.agent(app as any);

    const returned = { alias: 'USERS_KEYSET', GEMINI_API_KEY: 'g1' };
    (apiKeySvc.upsertUserKeyset as jest.Mock).mockResolvedValue(returned);

    const res = await agent.put(`/api/users/${userId}/keyset`).send({ GEMINI_API_KEY: 'g1' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(returned);
    expect(apiKeySvc.upsertUserKeyset).toHaveBeenCalledWith(userId, { GEMINI_API_KEY: 'g1', GROK_API_KEY: undefined, CHATGPT_API_KEY: undefined });
  });

  test('GET /api/users/:id/keyset returns keyset for self', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const app = makeAppWithSession({ _id: userId, role: 'viewer' });
    const agent = request.agent(app as any);

    const returned = { alias: 'USERS_KEYSET', GEMINI_API_KEY: 'g1' };
    (apiKeySvc.getApiKeySetByAliasAndCreator as jest.Mock).mockResolvedValue(returned);

    const res = await agent.get(`/api/users/${userId}/keyset`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(returned);
    expect(apiKeySvc.getApiKeySetByAliasAndCreator).toHaveBeenCalled();
  });

  test('GET /api/users/:id/keyset rejects non-self non-admin', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const app = makeAppWithSession({ _id: 'other', role: 'viewer' });
    const agent = request.agent(app as any);

    const res = await agent.get(`/api/users/${userId}/keyset`);
    expect(res.status).toBe(403);
  });
});
