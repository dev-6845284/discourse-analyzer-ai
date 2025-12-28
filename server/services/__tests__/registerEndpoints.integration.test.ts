import mongoose from 'mongoose';
import express from 'express';
import apiRoutes from '../../routes/api';
import analysisRoutes from '../../routes/analysis';
import adminRoutes from '../../routes/admin';
import permissionService from '../permissionService';
import ApiPermission from '../../models/ApiPermission';


let mongo: any;

beforeAll(async () => {
  // Lazily import mongodb-memory-server to avoid version issues in environments that don't need it
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri, { dbName: 'test' });
  } catch (e) {
    // If mongodb-memory-server can't be loaded in this environment, skip the DB setup and let the test be manual
    console.warn('[TEST] mongodb-memory-server not available, integration DB test will be skipped when run manually');
  }
});

afterAll(async () => {
  try { await mongoose.disconnect(); } catch (e) {}
  try { await mongo?.stop(); } catch (e) {}
});

test.skip('registerEndpoints creates permissions in DB (manual run)', async () => {
  const app = express();
  app.use('/api', apiRoutes as any);
  app.use('/api/admin', adminRoutes as any);
  app.use('/api/analysis', analysisRoutes as any);

  await permissionService.registerEndpoints(app as any);

  if (mongo) {
    const perms = await ApiPermission.find().lean();
    expect(perms.length).toBeGreaterThan(0);
    // Check that login endpoint is present and marked public
    const login = perms.find((p: any) => p.method === 'POST' && p.path === '/api/login');
    expect(login).toBeDefined();
    expect(login?.requiredRole).toBe('public');
  } else {
    console.warn('[TEST] Skipping DB asserts because mongodb-memory-server was not available');
  }
});