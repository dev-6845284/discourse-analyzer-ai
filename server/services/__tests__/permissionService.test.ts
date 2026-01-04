import permissionService from '../permissionService';
import apiRouter from '../../routes/api';
import ApiPermission from '../../models/ApiPermission';

jest.mock('../../models/ApiPermission');
// Ensure updateOne exists on mocked model
(ApiPermission as any).updateOne = (ApiPermission as any).updateOne || jest.fn();

describe('permissionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('inferDefaultRole returns sensible defaults', () => {
    expect(permissionService.inferDefaultRole('GET', '/api/quotes')).toBe('viewer');
    expect(permissionService.inferDefaultRole('POST', '/api/quotes')).toBe('editor');
    expect(permissionService.inferDefaultRole('PUT', '/api/quotes/123')).toBe('editor');
    expect(permissionService.inferDefaultRole('DELETE', '/api/quotes/123')).toBe('moderator');
    expect(permissionService.inferDefaultRole('GET', '/api/logs')).toBe('admin');
    expect(permissionService.inferDefaultRole('POST', '/api/people')).toBe('editor');
    expect(permissionService.inferDefaultRole('GET', '/api/people')).toBe('viewer');
    expect(permissionService.inferDefaultRole('DELETE', '/api/people/1')).toBe('admin');
    // login endpoints should be marked public
    expect(permissionService.inferDefaultRole('POST', '/api/login')).toBe('public');
    expect(permissionService.inferDefaultRole('POST', '/api/login/password')).toBe('public');
    expect(permissionService.inferDefaultRole('GET', '/api/session/debug')).toBe('public');
    // dev endpoints should be public by default
    expect(permissionService.inferDefaultRole('POST', '/api/dev/role')).toBe('public');
    expect(permissionService.inferDefaultRole('GET', '/api/dev/roles')).toBe('public');
  });

  test('registerEndpoints upserts permissions for existing routes', async () => {
    // Mock updateOne to resolve
    const updateOneMock = (ApiPermission as any).updateOne as jest.Mock;
    updateOneMock.mockResolvedValue({});

    // Call registerEndpoints with the router directly so route paths are visible to extractor
    await permissionService.registerEndpoints(apiRouter as any);

    expect(updateOneMock).toHaveBeenCalled();

    // Ensure at least some well-known endpoints were attempted to be registered
    const calledArgs = updateOneMock.mock.calls.map((c: any[]) => c[0]);
    const hasQuotesSearch = calledArgs.some(a => a.method === 'POST' && a.path === '/quotes/search');
    const hasPeopleGet = calledArgs.some(a => a.method === 'GET' && a.path === '/people');

    // Note: extractRoutes prefixes with router mount path when traversing; in our register implementation,
    // it may produce '/quotes/search' instead of '/api/quotes/search' depending on traversal; check both.
    const hasQuotesSearchApi = calledArgs.some(a => a.method === 'POST' && (a.path === '/quotes/search' || a.path === '/api/quotes/search'));
    const hasPeopleGetApi = calledArgs.some(a => a.method === 'GET' && (a.path === '/people' || a.path === '/api/people'));

    expect(hasQuotesSearchApi).toBeTruthy();
    expect(hasPeopleGetApi).toBeTruthy();
  }, 10000);
});
