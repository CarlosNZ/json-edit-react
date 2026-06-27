import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

// Mark every `react/jsx-runtime` call (`jsx(...)`, `jsxs(...)`) with a
// /*#__PURE__*/ annotation so consumers' bundlers can tree-shake unused themes.
// Theme glyphs are JSX elements built eagerly at module top level; without
// these annotations an unannotated external call can't be proven
// side-effect-free, so importing one theme drags in every other theme's glyphs
// (issue #382). Runs before terser (which is set to preserve the annotations
// through minification); CJS chunks have no such import and pass through
// untouched.
const pureJsxAnnotations = () => ({
  name: 'pure-jsx-annotations',
  renderChunk(code) {
    const importMatch = code.match(/import\s*\{([^}]*)\}\s*from\s*["']react\/jsx-runtime["']/)
    if (!importMatch) return null
    // The local binding names rollup gave the runtime helpers (e.g. `jsx`,
    // `_jsxs`) — read them off the import so we annotate the right identifiers
    // regardless of how they're renamed. `Fragment` is passed as an argument,
    // never called, so its `(`-test below never matches it.
    const names = importMatch[1]
      .split(',')
      .map((part) =>
        part
          .split(/\s+as\s+/)
          .pop()
          .trim()
      )
      .filter(Boolean)
    let count = 0
    let out = code
    for (const name of names) {
      // `name(` not preceded by an identifier char or `.`, so member accesses
      // and longer identifiers ending in `name` are left alone.
      const re = new RegExp(`([^\\w$.])(${name})\\(`, 'g')
      out = out.replace(re, (_m, pre, fn) => {
        count++
        return `${pre}/*#__PURE__*/${fn}(`
      })
    }
    if (!count)
      this.error('pure-jsx-annotations: found the jsx-runtime import but no calls to annotate')
    return { code: out, map: null }
  },
})

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'build/index.cjs.js', format: 'cjs' },
      { file: 'build/index.esm.js', format: 'esm' },
    ],
    // A theme that ships `icons` emits JSX → `react/jsx-runtime` imports; keep
    // React (a peer dep) external so the runtime is never bundled.
    external: (id) => id === 'json-edit-react' || id === 'react' || id.startsWith('react/'),
    plugins: [
      typescript({
        module: 'ESNext',
        target: 'es2020',
        declaration: true,
        declarationDir: 'build/dts',
      }),
      pureJsxAnnotations(),
      terser({ format: { preserve_annotations: true } }),
      bundleSize(),
      sizes(),
    ],
  },
  {
    input: 'build/dts/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
]
