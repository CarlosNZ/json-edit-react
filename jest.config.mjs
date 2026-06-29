/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  // Auto-restore `jest.spyOn` spies to their original implementation after each
  // test, so a spy installed mid-test (e.g. silencing `console.warn`) can't
  // leak into later tests if an assertion throws before a manual restore would
  // run.
  restoreMocks: true,
  testMatch: [
    '<rootDir>/test/**/*.test.{ts,tsx}',
    // Workspace-package tests live under their own package (keeps the root
    // `test/` dir focused on core) but run in this same shared Jest pass.
    '<rootDir>/packages/*/test/**/*.test.{ts,tsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }],
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/style-mock.js',
    // The `/utils` package imports core by its package name (`json-edit-react`,
    // a peer dep). In tests, resolve that to core's live source so helpers are
    // exercised against the current `src/`, not a stale `build/`.
    '^json-edit-react$': '<rootDir>/src/index.ts',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/build',
    '<rootDir>/build_package',
    '<rootDir>/demo',
    '<rootDir>/pack-output',
    // Per-package Rollup output — bundled copies would collide in the haste
    // map.
    '<rootDir>/packages/[^/]+/build',
    // Claude Code creates git worktrees here — each is a full repo copy, so its
    // `package.json` collides with this one in Jest's haste map
    // ("json-edit-react looked up in the Haste module map ... several different
    // files").
    '<rootDir>/.claude',
  ],
}
