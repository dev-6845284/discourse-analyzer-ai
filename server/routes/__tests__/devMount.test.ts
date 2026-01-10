import request from 'supertest';

describe('dev routes mounting', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalMongo = process.env.MONGODB_URI;

  afterEach(() => {
    // reset environment and module cache
    process.env.NODE_ENV = originalEnv;
    process.env.MONGODB_URI = originalMongo;
    jest.resetModules();
  });

  test('dev routes are mounted when NODE_ENV=local', async () => {
    process.env.NODE_ENV = 'local';
    // Ensure no real Mongo session store is configured during test
    process.env.MONGODB_URI = '';

    let app: any;
    jest.isolateModules(() => {
      // Mock connect-mongo to prevent it loading native mongodb internals during tests
      jest.mock('connect-mongo', () => ({ create: () => undefined }));
      // Require server index inside isolated module context so it sees the modified env
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      app = require('../../index').default;
    });

    const res = await request(app).get('/api/dev/roles');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.roles)).toBe(true);
  });

  test('dev routes are not mounted when NODE_ENV is not local', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = '';

    let app: any;
    jest.isolateModules(() => {
      // Mock connect-mongo to prevent it loading native mongodb internals during tests
      jest.mock('connect-mongo', () => ({ create: () => undefined }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      app = require('../../index').default;
    });

    const res = await request(app).get('/api/dev/roles');
    expect(res.status).toBe(404);
  });
});