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
    // Claude Code creates git worktrees here — each is a full repo copy, so its
    // `package.json` collides with this one in Jest's haste map ("json-edit-react
    // looked up in the Haste module map ... several different files").
    '<rootDir>/.claude',
  ],
}
