import base from './jest.config.mjs'

/**
 * Config for the headless render benchmarks (`pnpm bench`). Reuses the normal
 * jest setup (jsdom, ts-jest, css mock, module ignores) but matches only
 * `*.bench.{ts,tsx}` — so the benchmarks never run as part of `pnpm test`, and
 * the test suite never runs as part of the benchmarks. Generous timeout because
 * a run renders large trees many times over.
 *
 * @type {import('jest').Config}
 */
export default {
  ...base,
  testMatch: ['<rootDir>/test/**/*.bench.{ts,tsx}'],
  testTimeout: 300000,
}
