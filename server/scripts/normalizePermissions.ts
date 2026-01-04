#!/usr/bin/env ts-node
import connectToDatabase from '../db';
import permissionService from '../services/permissionService';

(async () => {
  try {
    await connectToDatabase();
    console.log('DB connected, normalizing permissions...');
    const updated = await permissionService.normalizeStoredPermissions();
    console.log('Normalization complete, entries updated:', updated);
    process.exit(0);
  } catch (err) {
    console.error('Normalization failed:', err);
    process.exit(1);
  }
})();