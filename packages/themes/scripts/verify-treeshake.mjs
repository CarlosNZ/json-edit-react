// End-to-end guard for per-theme tree-shaking (issue #382).
//
// Bundles a single icon-less theme against the *shipped* `build/index.esm.js`
// and fails the build if the result isn't tiny. `monoDarkTheme` carries no
// glyphs of its own, so a correct build shakes it down to a few hundred bytes;
// if the pure-annotation pipeline regresses (injection breaks, terser stops
// preserving the annotations, or some future change defeats the shaking), every
// other theme's glyphs come along and the bundle balloons past the threshold.
//
// This is stronger than the in-build `pureJsxAnnotations` guard, which only
// confirms annotations were *injected* (pre-terser) — it can't see whether they
// survived into the artifact a consumer actually receives. Here we measure that
// artifact, the same way the issue's verification recipe does, but automated.
//
// Uses rollup's JS API (already a devDependency) so no extra tooling is needed.
// rollup is representative: `/*#__PURE__*/` is the cross-bundler annotation —
// esbuild and webpack+terser honour it identically.

import { rollup } from 'rollup'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const esm = path.join(here, '..', 'build', 'index.esm.js')

const THEME = 'monoDarkTheme'
// A correct shake is ~550 B; a broken one pulls every theme's glyphs (~25 kB).
// The gap is enormous, so this threshold only ever trips on a real regression.
const THRESHOLD = 2000

const ENTRY = '\0verify-treeshake-entry'

const bundle = await rollup({
  input: ENTRY,
  external: (id) => id === 'react/jsx-runtime',
  onwarn: () => {},
  plugins: [
    {
      name: 'virtual-entry',
      resolveId: (id) => (id === ENTRY ? id : null),
      load: (id) =>
        id === ENTRY ? `export { ${THEME} as default } from ${JSON.stringify(esm)}` : null,
    },
  ],
})
const { output } = await bundle.generate({ format: 'esm' })
await bundle.close()

const size = Buffer.byteLength(output[0].code, 'utf8')

if (size > THRESHOLD) {
  console.error(
    `✗ tree-shake regression: importing { ${THEME} } from the build yields ${size} B ` +
      `(threshold ${THRESHOLD} B). The pure-annotation pipeline is broken — see issue #382 ` +
      `and packages/themes/rollup.config.mjs.`
  )
  process.exit(1)
}

console.log(`✓ tree-shake OK: { ${THEME} } → ${size} B (threshold ${THRESHOLD} B)`)
