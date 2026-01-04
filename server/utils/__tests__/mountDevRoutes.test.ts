describe('mountDevRoutes', () => {
  const origEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('mounts dev routes in development', async () => {
    process.env.NODE_ENV = 'development';

    let mountDevRoutes: any;
    jest.isolateModules(() => {
      // Provide a mock dev router module
      jest.doMock('../../routes/dev', () => ({ default: { __isMockedDevRouter: true } }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mountDevRoutes = require('../mountDevRoutes').default;
    });

    const app = { use: jest.fn() } as any;
    const res = await mountDevRoutes(app);
    expect(res).toBe(true);
    expect(app.use).toHaveBeenCalledWith('/api/dev', expect.anything());
    const calledArg = (app.use as jest.Mock).mock.calls[0][1];
    expect(calledArg && (calledArg.__isMockedDevRouter || calledArg.default?.__isMockedDevRouter)).toBeTruthy();
  });

  test('does not mount dev routes outside development', async () => {
    process.env.NODE_ENV = 'production';

    let mountDevRoutes: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mountDevRoutes = require('../mountDevRoutes').default;
    });

    const app = { use: jest.fn() } as any;
    const res = await mountDevRoutes(app);
    expect(res).toBe(false);
    expect(app.use).not.toHaveBeenCalled();
  });
});