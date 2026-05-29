/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  modulePathIgnorePatterns: [
    '<rootDir>/build',
    '<rootDir>/build_package',
    '<rootDir>/demo',
    '<rootDir>/pack-output',
  ],
}
