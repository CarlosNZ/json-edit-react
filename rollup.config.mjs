import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import styles from 'rollup-plugin-styles'
import terser from '@rollup/plugin-terser'
import del from 'rollup-plugin-delete'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'
import { copyFileSync } from 'fs'

// Emit a standalone copy of the stylesheet alongside the bundle. The CSS is
// also inlined into the bundle as a string and injected on mount by
// src/injectStyles.ts for the zero-config case; this file is reached only via
// the explicit `json-edit-react/style.css` subpath export,
// for consumers who need to inject the styles themselves (e.g. into a Shadow
// DOM, where head-injected styles can't cross the boundary). See issue #225.
const emitStandaloneCss = () => ({
  name: 'emit-standalone-css',
  writeBundle() {
    copyFileSync('src/style.css', 'build/style.css')
  },
})

// `src/injectStyles.ts` imports the stylesheet with Vite's `?inline` query, so
// that consuming `src/` directly (the demo's `local` mode) yields the CSS text
// instead of a Vite-injected side effect. Rollup has no query convention, so
// resolve it back to the plain file and let `styles` handle it.
const stripCssQuery = () => ({
  name: 'strip-css-query',
  resolveId(source, importer) {
    if (!source.endsWith('.css?inline')) return null
    return this.resolve(source.replace(/\?inline$/, ''), importer, { skipSelf: true })
  },
})

// Mark the side-effect-free top-level factory calls with a /*#__PURE__*/
// annotation so a consumer's bundler can drop the parts of core they don't
// import. The package ships as one bundled file, so `sideEffects: false` (which
// is module-granular) can't help: it can skip the whole module, not unused
// declarations *within* it. Only per-call purity annotations enable that DCE.
// Without them, `React.memo(CollectionNode)` and the five `createContext()`
// calls are unprovable-purity statements that pin the entire render path, so
// importing one string helper drags in ~15 kB gzip (issue #389).
//
// Annotated here, at chunk level, before terser (which preserves them via
// `format.preserve_annotations`). All these calls sit in `const X = …`
// initializers, so the annotation lands in a valid spot.
//
// The end-to-end guard is scripts/verify-treeshake.mjs, which also covers the
// internal names in this list: rename `mergeIcons` without updating it here and
// the guard fails rather than the bundle silently regressing.
const pureAnnotations = (pureNames = []) => ({
  name: 'pure-annotations',
  renderChunk(code) {
    let count = 0
    let out = code
    for (const name of pureNames) {
      // `name(` not preceded by an identifier char or `.`, so member accesses
      // and longer identifiers ending in `name` (`useMemo` vs `memo`) are left
      // alone.
      out = out.replace(new RegExp(`([^\\w$.])(${name})\\(`, 'g'), (_m, pre, fn) => {
        count++
        return `${pre}/*#__PURE__*/${fn}(`
      })
    }
    // The namespaced form the source actually uses for the node memo boundary.
    out = out.replace(/([^\w$.])(React\.(?:memo|forwardRef|lazy))\(/g, (_m, pre, fn) => {
      count++
      return `${pre}/*#__PURE__*/${fn}(`
    })
    return count ? { code: out, map: null } : null
  },
})

// Annotate the compiled `jsx`/`jsxs` calls in modules whose JSX lives in
// top-level *data* rather than in a render body — `defaultTheme`'s icon glyphs
// are eager element constructions in a module-scope object, so an unannotated
// one pins the whole default theme (~1.3 kB gzip) into every consumer's bundle.
//
// Scoped to those modules on purpose, via `transform` (which knows the module
// id) rather than the chunk-wide pass above. Annotating every `jsx` call in the
// package would achieve the same shake for 3× the annotation bytes on the
// shipped bundle, since JSX inside a render body drops as part of its component
// either way. Runs after the TS plugin, so it sees `jsx()` calls; TS names the
// imports `_jsx`/`_jsxs`, and rollup dedupes them to `jsx`/`jsxs` later.
//
// `return` position is skipped: terser hoists an annotation off `return <call>`
// to before the keyword, which is invalid and makes consumers' bundlers warn
// and discard it.
const pureJsxIn = (pattern) => ({
  name: 'pure-jsx-in',
  transform(code, id) {
    if (!pattern.test(id)) return null
    let count = 0
    const out = code.replace(/([^\w$.])(_?jsxs?)\(/g, (match, pre, fn, offset, whole) => {
      if (/return\s*$/.test(whole.slice(Math.max(0, offset - 8), offset + 1))) return match
      count++
      return `${pre}/*#__PURE__*/${fn}(`
    })
    return count ? { code: out, map: null } : null
  },
})

export default [
  // Main Package
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'build/index.cjs.js',
        format: 'cjs',
      },
      {
        file: 'build/index.esm.js',
        format: 'esm',
      },
    ],
    plugins: [
      del({ targets: 'build/*' }),
      stripCssQuery(),
      // Inline the stylesheet as a plain string with no injector call: the
      // function form of `mode: ['inject', fn]` substitutes fn's return value
      // for the injection statement, so returning '' leaves the CSS module as
      // just `export default '<minified css>'`. That makes the stylesheet an
      // ordinary constant which only the editor path references, so a consumer
      // importing one helper can shake it out; src/injectStyles.ts does the
      // injection at runtime instead (issue #396).
      //
      // `inject.treeshakeable` is NOT the equivalent built-in: it only wires an
      // `inject()` method onto the default export when CSS-modules support is
      // on. With `modules` off (correct for a global stylesheet) the default
      // export stays the raw string and the injector is never called at all —
      // the styles would silently never load.
      styles({ minimize: true, mode: ['inject', () => ''] }),
      peerDepsExternal({ includeDependencies: true }),
      typescript({
        module: 'ESNext',
        target: 'es2020',
        declaration: true,
        declarationDir: 'build/dts',
      }),
      pureJsxIn(/defaultTheme\.tsx$/),
      pureAnnotations(['createContext', 'memo', 'forwardRef', 'lazy', 'mergeIcons']),
      terser({
        // toplevel: true,
        compress: {
          passes: 3,
          // pure_getters: true,
          // unsafe_* flags here once you've tested behaviour, e.g.:
          // unsafe_arrows: true,
          // unsafe_methods: true,
        },
        format: { preserve_annotations: true },
      }),
      emitStandaloneCss(),
      bundleSize(),
      sizes(),
    ],
  },
  // Types
  {
    input: 'build/dts/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
]
