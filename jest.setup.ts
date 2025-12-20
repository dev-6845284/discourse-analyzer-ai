import '@testing-library/jest-dom';

// Provide a simple global fetch mock if needed by some tests
if (!global.fetch) {
  // @ts-ignore
  global.fetch = jest.fn();
}