import { normalizePathForCategorization } from '../services/permissionService';

describe('normalizePathForCategorization', () => {
  test('replaces Mongo ObjectId segments with :id', () => {
    const input = '/api/admin/access-control/6951a5fd367ed44eb742698f';
    expect(normalizePathForCategorization(input)).toBe('/api/admin/access-control/:id');
  });

  test('replaces numeric segments with :id', () => {
    expect(normalizePathForCategorization('/api/quotes/123')).toBe('/api/quotes/:id');
  });

  test('replaces UUID segments with :id', () => {
    expect(normalizePathForCategorization('/api/sessions/550e8400-e29b-41d4-a716-446655440000')).toBe('/api/sessions/:id');
  });

  test('replaces ip address with :ip', () => {
    expect(normalizePathForCategorization('/admin/blocked-ips/127.0.0.1')).toBe('/admin/blocked-ips/:ip');
  });

  test('preserves paths without ids', () => {
    expect(normalizePathForCategorization('/api/admin/usage-stats')).toBe('/api/admin/usage-stats');
  });
});