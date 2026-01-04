// Prevent connect-mongo from requiring native mongodb internals in tests
jest.mock('connect-mongo', () => ({ create: () => undefined }));

// Mock admin middleware to inject an admin session for routes tests
jest.mock('../../middleware/admin', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.session = req.session || {};
    req.session.user = { _id: 'admin1', email: 'admin@example.com', role: 'admin' };
    next();
  },
  isAdminOrDev: (req: any, res: any, next: any) => {
    req.session = req.session || {};
    req.session.user = { _id: 'admin1', email: 'admin@example.com', role: 'admin' };
    next();
  }
}));

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import adminCategoriesRouter from '../../routes/adminCategories';
import mongoose from 'mongoose';

describe('Admin Categories routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('GET /api/admin/categories returns list', async () => {
    const localApp = express();
    localApp.use(express.json());
    localApp.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any));
    localApp.use('/api/admin/categories', adminCategoriesRouter);

    const res = await request(localApp).get('/api/admin/categories').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('POST /api/admin/categories creates category', async () => {
    const mockColl: any = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'x' })
    };
    (mongoose as any).connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    const payload = { id: 'testcat', title: 'Test Cat' };
    const localApp = express();
    localApp.use(express.json());
    localApp.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any));
    localApp.use('/api/admin/categories', adminCategoriesRouter);

    const res = await request(localApp).post('/api/admin/categories').send(payload).expect(201);
    expect(res.body.id).toBe('testcat');
  });

  test('PUT /api/admin/categories/:id updates', async () => {
    const after = { id: 'exist', title: 'Exist Updated' };
    const mockColl: any = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ value: after })
    };
    (mongoose as any).connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    const localApp = express();
    localApp.use(express.json());
    localApp.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any));
    localApp.use('/api/admin/categories', adminCategoriesRouter);

    const res = await request(localApp).put('/api/admin/categories/exist').send({ title: 'Exist Updated' }).expect(200);
    expect(res.body.id).toBe('exist');
  });

  test('DELETE /api/admin/categories/:id deletes', async () => {
    const mockColl: any = { deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }) };
    (mongoose as any).connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    const localApp = express();
    localApp.use(express.json());
    localApp.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any));
    localApp.use('/api/admin/categories', adminCategoriesRouter);

    await request(localApp).delete('/api/admin/categories/todelete').expect(204);
  });

  test('POST /api/admin/categories/reload triggers reload', async () => {
    const mockColl: any = { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
    (mongoose as any).connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    const localApp = express();
    localApp.use(session({ secret: 'test', resave: false, saveUninitialized: true } as any));
    localApp.use('/api/admin/categories', adminCategoriesRouter);

    const res = await request(localApp).post('/api/admin/categories/reload').expect(200);
    expect(res.body.message).toBe('reloaded');
  });
});
