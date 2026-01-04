import apiRouter from '../api';

describe('API router authorization', () => {
  test('api router has authorizeMiddleware applied', () => {
    // Find middleware layer in router stack
    // The api router should have a middleware with handle.name === 'authorizeMiddleware'
    
    const hasAuthz = (apiRouter as any).stack?.some((layer: any) => layer.handle && layer.handle.name === 'authorizeMiddleware');

    expect(hasAuthz).toBeTruthy();
  });
});
