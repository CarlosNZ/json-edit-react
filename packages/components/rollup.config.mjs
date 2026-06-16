import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import styles from 'rollup-plugin-styles'
import terser from '@rollup/plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

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
    terser(),
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
