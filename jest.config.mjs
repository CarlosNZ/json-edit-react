/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/build', '<rootDir>/build_package', '<rootDir>/demo'],
}
