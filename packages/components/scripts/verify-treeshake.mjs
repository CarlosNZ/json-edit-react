// End-to-end guard for per-component tree-shaking (issue #388).
//
// Bundles a single lightweight definition (`hyperlinkDefinition`, no deps of its
// own) against the *shipped* `build/index.esm.js` with its third-party deps
// bundled in — the same thing a consumer's bundler does — and fails the build if
// the result isn't tiny. The whole package is bundled into one ESM file, so
// `sideEffects: false` (which is module-granular) can't drop unused components;
// only the `/*#__PURE__*/` annotations enable the within-module DCE that strips
// them. If that pipeline regresses (injection breaks, terser stops preserving
// the annotations, or a component regains a top-level side effect), the heavy
// components ride along and their deps balloon the bundle (~6 kB → ~160 kB).
//
// Uses esbuild, NOT rollup: rollup analyses our local `createDefinitionFactory`
// for purity on its own and shakes the definitions with or without the
// annotations, so a rollup-based guard can't see the regression. esbuild (like
// webpack and other consumer bundlers) relies on the annotations, so it does —
// and `/*#__PURE__*/` is honoured identically across them. The heavy libs are
// regular deps, so they're installed and resolvable when this runs.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(here, '..')
const esm = path.join(pkgRoot, 'build', 'index.esm.js')

const DEFINITION = 'hyperlinkDefinition'
// A correct shake is ~6 kB of glue; a broken one inlines react-markdown &
// friends (~160 kB). The gap is enormous, so this only trips on a real
// regression — generous enough to absorb the small exotic-type definitions that
// still ride along until their eager `defaultValue` calls are de-eagered (#388).
const THRESHOLD = 20_000
// Distinctive in-code markers, for a clearer message when something leaks.
const MARKERS = {
  'react-markdown': 'remarkjs/react-markdown',
  'react-colorful': 'react-colorful__',
  colord: 'colord',
}

const result = await build({
  stdin: {
    contents: `export { ${DEFINITION} } from ${JSON.stringify(esm)}`,
    resolveDir: pkgRoot,
    loader: 'js',
  },
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  // Peer deps a consumer supplies; everything else (the heavy libs) is bundled.
  external: ['react', 'react-dom', 'react/jsx-runtime', 'json-edit-react'],
  logLevel: 'silent',
})

const code = result.outputFiles[0].text
const size = Buffer.byteLength(code, 'utf8')
const leaked = Object.entries(MARKERS)
  .filter(([, marker]) => code.includes(marker))
  .map(([dep]) => dep)

if (size > THRESHOLD || leaked.length) {
  console.error(
    `✗ tree-shake regression: importing { ${DEFINITION} } bundles to ${(size / 1000).toFixed(1)} kB` +
      (leaked.length ? ` and reaches heavy deps [${leaked.join(', ')}]` : '') +
      ` (threshold ${THRESHOLD / 1000} kB). The pure-annotation pipeline is broken — ` +
      `see issue #388 and packages/components/rollup.config.mjs.`
  )
  process.exit(1)
}

console.log(`✓ tree-shake OK: { ${DEFINITION} } → ${(size / 1000).toFixed(1)} kB, no heavy deps`)
