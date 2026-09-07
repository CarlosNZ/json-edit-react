// End-to-end guard for core's tree-shaking (issue #389).
//
// Bundles a single pure helper against the *shipped* `build/index.esm.js` — the
// same thing a consumer's bundler does — and fails the build if the result
// isn't small. The package is one bundled ESM file, so `sideEffects: false`
// (which is module-granular) can't drop the unused parts of it; only the
// `/*#__PURE__*/` annotations stamped in rollup.config.mjs enable that
// within-module DCE. If that pipeline regresses (the annotation regexes stop
// matching after a rename, terser stops preserving them, or something gains a
// top-level side effect), one string helper drags in the whole render path and
// this trips.
//
// Uses esbuild, NOT rollup: rollup analyses our local functions for purity on
// its own and shakes some of this with or without the annotations, so a
// rollup-based guard can't see the regression. esbuild (like webpack and other
// consumer bundlers) relies on the annotations, so it does — and
// `/*#__PURE__*/` is honoured identically across them.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..')
const esm = path.join(repoRoot, 'build', 'index.esm.js')

const HELPER = 'toPathString'
// A correct shake is ~7 kB — almost entirely the stylesheet, which is injected
// by a genuine top-level side effect and so rides along with any import until
// that injection becomes lazy. A broken one is ~41 kB (the whole library). The
// gap is wide, so this only trips on a real regression.
const THRESHOLD = 15_000
// Distinctive in-code markers — never CSS class names, which live in the
// injected stylesheet and so are present either way — for a clearer message
// about what leaked.
const MARKERS = {
  'the editor tree': 'Adding node unsuccessful',
  'the default theme': 'M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z',
}

const result = await build({
  stdin: {
    contents: `export { ${HELPER} } from ${JSON.stringify(esm)}`,
    resolveDir: repoRoot,
    loader: 'js',
  },
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  // The peer deps a consumer supplies.
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  logLevel: 'silent',
})

const code = result.outputFiles[0].text
const size = Buffer.byteLength(code, 'utf8')
const leaked = Object.entries(MARKERS)
  .filter(([, marker]) => code.includes(marker))
  .map(([what]) => what)

if (size > THRESHOLD || leaked.length) {
  console.error(
    `✗ tree-shake regression: importing { ${HELPER} } bundles to ${(size / 1000).toFixed(1)} kB` +
      (leaked.length ? ` and reaches ${leaked.join(' and ')}` : '') +
      ` (threshold ${THRESHOLD / 1000} kB). The pure-annotation pipeline is broken — ` +
      `see issue #389 and rollup.config.mjs.`
  )
  process.exit(1)
}

console.log(`✓ tree-shake OK: { ${HELPER} } → ${(size / 1000).toFixed(1)} kB`)
