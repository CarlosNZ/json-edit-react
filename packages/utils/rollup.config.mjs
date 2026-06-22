import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

// Keep core + React (and any React subpath like react/jsx-runtime) external —
// they're peer deps, never bundled.
const external = (id) =>
  id === 'json-edit-react' || id === 'react' || id === 'react-dom' || id.startsWith('react/')

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
    terser(),
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
