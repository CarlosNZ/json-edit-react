/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }],
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/style-mock.js',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/build',
    '<rootDir>/build_package',
    '<rootDir>/demo',
    '<rootDir>/pack-output',
  ],
}
