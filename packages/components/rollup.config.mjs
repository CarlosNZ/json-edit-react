import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import styles from 'rollup-plugin-styles'
import terser from '@rollup/plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'build/index.cjs.js', format: 'cjs' },
      { file: 'build/index.esm.js', format: 'esm' },
    ],
    // Mark all dependencies (peer + regular) as external so they aren't
    // bundled. Consumers' bundlers (Vite, Webpack 4+, etc.) then tree-shake
    // unused components AND skip pulling in transitive deps of components
    // they don't import. Heavy deps (react-datepicker, react-markdown,
    // react-colorful) are lazy-loaded inside their components, so they only
    // hit the consumer's runtime when actually rendered.
    external: (id) =>
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
      id === 'use-debounce',
    plugins: [
      peerDepsExternal({ includeDependencies: true }),
      nodeResolve(),
      styles({ minimize: true }),
      typescript({
        module: 'ESNext',
        target: 'es6',
        declaration: true,
        declarationDir: 'build/dts',
      }),
      terser(),
      bundleSize(),
      sizes(),
    ],
  },
  {
    input: 'build/dts/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    external: [/\.css$/],
    plugins: [dts()],
  },
]
