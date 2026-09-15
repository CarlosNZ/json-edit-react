import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

// Keep core + React (and any React subpath like react/jsx-runtime) external —
// they're peer deps, never bundled.
const external = (id) =>
  id === 'json-edit-react' || id === 'react' || id === 'react-dom' || id.startsWith('react/')

// Mark every side-effect-free top-level factory call with a /*#__PURE__*/
// annotation so consumers' bundlers can tree-shake unused exports. Each entry
// ships as one bundled file, so `sideEffects: false` (which is module-granular)
// can't help: it can skip the whole module, not unused declarations *within*
// it. Only per-call purity annotations enable that DCE.
//
// The `/filters` subpath is what needs it: 11 of its 16 exports are eager
// `intern(…)` / `internRef(…)` / `internRefs(…)` calls, the interning that
// gives the predicates their memo-stability. Unannotated, those are
// unprovable-purity statements that pin each other and the glob engine, so
// importing `root` — a four-token arrow function — dragged in ~85% of the
// subpath (issue #406).
//
// `Symbol` is in the list for the same reason at a much smaller scale: the
// glob engine's `GLOBSTAR` sentinel is a top-level `Symbol('globstar')` call,
// which is pure but not provably so, and rides along with every export
// otherwise.
//
// Annotated here, at chunk level, before terser (which preserves them via
// `format.preserve_annotations`). All these calls sit in `const X = …`
// initializers, so the annotation lands in a valid spot.
//
// The end-to-end guard is scripts/verify-treeshake.mjs, which covers the
// internal names in this list: rename `intern` without updating it here and
// the guard fails rather than the bundle silently regressing.
const pureAnnotations = (pureNames = []) => ({
  name: 'pure-annotations',
  renderChunk(code) {
    let count = 0
    let out = code
    for (const name of pureNames) {
      // `name(` not preceded by an identifier char or `.`, so member accesses
      // and longer identifiers ending in `name` (`internRef` vs `intern`) are
      // left alone.
      out = out.replace(new RegExp(`([^\\w$.])(${name})\\(`, 'g'), (_m, pre, fn) => {
        count++
        return `${pre}/*#__PURE__*/${fn}(`
      })
    }
    return count ? { code: out, map: null } : null
  },
})

// One published entry point. `name` is the output basename: `index` → the
// package root, `filters` → the `./filters` subpath (see package.json
// `exports`). Each gets CJS + ESM bundles plus a flattened `.d.ts`.
const jsBundle = (input, name) => ({
  input,
  output: [
    { file: `build/${name}.cjs.js`, format: 'cjs' },
    { file: `build/${name}.esm.js`, format: 'esm' },
  ],
  external,
  plugins: [
    typescript({
      module: 'ESNext',
      target: 'es2020',
      declaration: true,
      declarationDir: 'build/dts',
    }),
    pureAnnotations(['intern', 'internRef', 'internRefs', 'Symbol']),
    terser({ format: { preserve_annotations: true } }),
    bundleSize(),
    sizes(),
  ],
})

const dtsBundle = (input, name) => ({
  input,
  output: [{ file: `build/${name}.d.ts`, format: 'es' }],
  plugins: [dts()],
})

// The JS bundles emit per-file declarations into `build/dts/` first; the dts
// bundles (run after, in array order) flatten each entry's tree into one file.
export default [
  jsBundle('src/index.ts', 'index'),
  jsBundle('src/filters/index.ts', 'filters'),
  dtsBundle('build/dts/index.d.ts', 'index'),
  dtsBundle('build/dts/filters/index.d.ts', 'filters'),
]
