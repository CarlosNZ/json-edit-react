// End-to-end guard for per-export tree-shaking of the `/filters` subpath
// (issue #406).
//
// Bundles a single cheap predicate against the *shipped* `build/filters.esm.js`
// — the same thing a consumer's bundler does — and fails the build if the
// result isn't tiny. The subpath ships as one bundled ESM file, so
// `sideEffects: false` (which is module-granular) can't drop the unused parts
// of it; only the `/*#__PURE__*/` annotations stamped in rollup.config.mjs
// enable that within-module DCE. Without them the 11 eager `intern(…)` calls
// are unprovable-purity statements that pin each other, the intern machinery
// and the glob engine, so `import { root }` — a four-token arrow function —
// costs ~85% of the subpath.
//
// `root` alone is enough to catch the whole regression: unannotated, every
// export bundles to within 5% of the full 3 kB, so the threshold trips
// whichever annotation broke.
//
// Uses esbuild, NOT rollup: rollup analyses our local `intern` for purity on
// its own and shakes these with or without the annotations, so a rollup-based
// guard can't see the regression. esbuild (like webpack and other consumer
// bundlers) relies on the annotations, so it does — and `/*#__PURE__*/` is
// honoured identically across them.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.join(here, '..')
const filtersEsm = path.join(pkgRoot, 'build', 'filters.esm.js')

const LEAN = 'root'
// A correct shake is ~144 B; a broken one is ~2.6 kB (the whole subpath). The
// gap is wide, so this only trips on a real regression.
const THRESHOLD = 800
// Distinctive in-code markers, for a clearer message about what leaked. Both
// are string literals, so they survive minification verbatim and can't collide
// with anything else in the bundle.
const MARKERS = {
  'the glob engine': 'globstar',
  'the intern machinery': '__re',
}

const bundleExport = async (name) => {
  const result = await build({
    stdin: {
      contents: `export { ${name} } from ${JSON.stringify(filtersEsm)}`,
      resolveDir: pkgRoot,
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    // The peer deps a consumer supplies.
    external: ['react', 'react-dom', 'react/jsx-runtime', 'json-edit-react'],
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

const failures = []

// 1. A predicate that needs none of the shared machinery carries none of it.
//    This is the point of the subpath: the generic names live off the package
//    root precisely so they can be imported selectively.
const leanCode = await bundleExport(LEAN)
const leanSize = Buffer.byteLength(leanCode, 'utf8')
const leaked = Object.entries(MARKERS)
  .filter(([, marker]) => leanCode.includes(marker))
  .map(([what]) => what)

if (leanSize > THRESHOLD || leaked.length) {
  failures.push(
    `importing { ${LEAN} } bundles to ${leanSize} B` +
      (leaked.length ? ` and reaches ${leaked.join(' and ')}` : '') +
      ` (threshold ${THRESHOLD} B). The pure-annotation pipeline is broken — ` +
      `see issue #406 and rollup.config.mjs.`
  )
}

// 2. A predicate that *does* need the glob engine still carries it. Guards the
//    opposite failure: an annotation in a spot where the call isn't actually
//    pure would shake out machinery the predicate depends on, and `byPath`
//    would silently match nothing.
const GLOB = 'byPath'
const globCode = await bundleExport(GLOB)
if (!globCode.includes(MARKERS['the glob engine'])) {
  failures.push(
    `importing { ${GLOB} } doesn't carry the glob engine — it can't compile a ` +
      `path pattern. Check what \`pureAnnotations\` is annotating in ` +
      `rollup.config.mjs against src/filters/_glob.ts.`
  )
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`)
  process.exit(1)
}

console.log(`✓ tree-shake OK: { ${LEAN} } → ${leanSize} B (threshold ${THRESHOLD} B)`)
