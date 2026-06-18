/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.test.tsx'],
  modulePathIgnorePatterns: ['<rootDir>/build', '<rootDir>/build_package', '<rootDir>/demo'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/test/styleMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
}
