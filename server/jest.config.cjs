const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname),

  roots: [
    '<rootDir>/services',
    '<rootDir>/routes',
    '<rootDir>/middleware',
    '<rootDir>/models',
    '<rootDir>/utils',
    '<rootDir>/llm_services',
    '<rootDir>/config',
    '<rootDir>/__tests__'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: path.resolve(__dirname, 'tsconfig.json') }],
    '^.+\\.(js|mjs)$': 'babel-jest'
  },

  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^@google/genai$': '<rootDir>/testMocks/googleGenaiMock.js',
    '^bson$': '<rootDir>/testMocks/bsonMock.js',
    '^mongoose$': '<rootDir>/testMocks/mongooseMock.js'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Transform ESM modules under node_modules (exceptions) so babel-jest can handle them
  transformIgnorePatterns: ['node_modules/(?!(bson|@google/genai|@google/generative-ai)/)'],
};