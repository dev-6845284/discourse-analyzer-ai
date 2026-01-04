import permissionService from '../permissionService';
import ApiPermission from '../../models/ApiPermission';

jest.mock('../../models/ApiPermission');

describe('getRequiredRoleForRequest fallback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('returns admin and logs warning when no permission is found', async () => {
    (ApiPermission as any).findOne = jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) });
    (ApiPermission as any).find = jest.fn().mockReturnValue({ lean: () => Promise.resolve([]) });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const role = await permissionService.getRequiredRoleForRequest('GET', '/api/nonexistent/path');

    expect(role).toBe('admin');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[PERMISSIONS] No permission found for'), 'GET', '/api/nonexistent/path', expect.any(String));

    (ApiPermission as any).findOne.mockRestore?.();
    (ApiPermission as any).find.mockRestore?.();
    warnSpy.mockRestore();
  });
});