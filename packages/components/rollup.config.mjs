import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import styles from 'rollup-plugin-styles'
import terser from '@rollup/plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

// Mark every side-effect-free factory call with a /*#__PURE__*/ annotation so
// consumers' bundlers can tree-shake unused components. Each component is built
// from eager top-level calls — `jsx(...)`/`jsxs(...)` for its markup,
// `lazy(() => import(...))` for a heavy dep, and `createDefinitionFactory(...)`
// for its definition — and an unannotated external call can't be proven
// side-effect-free, so importing one component drags in every other component's
// code AND their heavy deps (issue #388). Runs before terser, which is set to
// preserve the annotations through minification. CJS chunks (no ESM jsx import)
// pass through, and react's `lazy`/`memo`/etc. and our `createDefinitionFactory`
// are all pure by construction. The end-to-end guard is scripts/verify-treeshake.mjs.
const pureAnnotations = (extraPureNames = []) => ({
  name: 'pure-annotations',
  renderChunk(code) {
    const names = new Set(extraPureNames)
    const jsxImport = code.match(/import\s*\{([^}]*)\}\s*from\s*["']react\/jsx-runtime["']/)
    if (jsxImport)
      for (const part of jsxImport[1].split(','))
        names.add(part.split(/\s+as\s+/).pop().trim())
    if (!names.size) return null
    let count = 0
    let out = code
    for (const name of names) {
      if (!name) continue
      // `name(` not preceded by an identifier char or `.`, so member accesses
      // and longer identifiers ending in `name` are left alone.
      out = out.replace(new RegExp(`([^\\w$.])(${name})\\(`, 'g'), (_m, pre, fn) => {
        count++
        return `${pre}/*#__PURE__*/${fn}(`
      })
    }
    // JSX present means there must be jsx calls to annotate; zero means the match
    // broke and the chunk would silently stop tree-shaking.
    if (jsxImport && !count)
      this.error('pure-annotations: react/jsx-runtime imported but no calls annotated')
    return count ? { code: out, map: null } : null
  },
})

// Mark all dependencies (peer + regular) as external so they aren't bundled.
// Consumers' bundlers (Vite, Webpack 4+, etc.) then tree-shake unused
// components AND skip pulling in transitive deps of components they don't
// import. Heavy deps (react-datepicker, react-markdown, react-colorful) are
// lazy-loaded inside their components, so they only hit the consumer's runtime
// when actually rendered.
const external = (id) =>
  id === 'react' ||
  id === 'react/jsx-runtime' ||
  id.startsWith('react/') ||
  id === 'json-edit-react' ||
  id === 'react-datepicker' ||
  id.startsWith('react-datepicker/') ||
  id === 'react-markdown' ||
  id === 'react-colorful' ||
  id === 'colord' ||
  id.startsWith('colord/') ||
  id === 'use-debounce' ||
  id === 'react-select' ||
  id.startsWith('@codemirror/') ||
  id.startsWith('@uiw/')

// One JS bundle per entry point. `name` is the output basename — `index` is
// the package root; `widgets` is the `@json-edit-react/components/widgets`
// subpath. Both run the TS plugin, which emits declarations into build/dts for
// the dts bundles below to flatten.
const jsBundle = (input, name) => ({
  input,
  output: [
    { file: `build/${name}.cjs.js`, format: 'cjs' },
    { file: `build/${name}.esm.js`, format: 'esm' },
  ],
  external,
  plugins: [
    peerDepsExternal({ includeDependencies: true }),
    nodeResolve(),
    styles({ minimize: true }),
    typescript({
      module: 'ESNext',
      target: 'es2020',
      declaration: true,
      declarationDir: 'build/dts',
    }),
    pureAnnotations(['lazy', 'memo', 'forwardRef', 'createContext', 'createDefinitionFactory']),
    terser({ format: { preserve_annotations: true } }),
    bundleSize(),
    sizes(),
  ],
})

// Flatten the per-entry declarations emitted above into a single .d.ts.
const dtsBundle = (input, name) => ({
  input,
  output: [{ file: `build/${name}.d.ts`, format: 'es' }],
  external: [/\.css$/],
  plugins: [dts()],
})

export default [
  jsBundle('src/index.ts', 'index'),
  jsBundle('src/widgets/index.ts', 'widgets'),
  dtsBundle('build/dts/index.d.ts', 'index'),
  dtsBundle('build/dts/widgets/index.d.ts', 'widgets'),
]
