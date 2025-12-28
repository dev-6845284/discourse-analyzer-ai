import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../index';
import permissionService from '../services/permissionService';
import ApiPermission from '../models/ApiPermission';

(async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  console.log('[MEMDB] Started', process.env.MONGODB_URI);

  try {
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: 'test' });
    console.log('[MONGODB] Connected');

    await permissionService.registerEndpoints(app);

    const perms = await ApiPermission.find().lean();
    console.log('[PERMISSIONS] Count:', perms.length);
    for (const p of perms) {
      console.log(p.method, p.path, '->', p.requiredRole);
    }
  } catch (e) {
    console.error('[ERROR]', e);
  } finally {
    await mongoose.disconnect();
    await mem.stop();
    console.log('[MEMDB] Stopped');
  }
})();