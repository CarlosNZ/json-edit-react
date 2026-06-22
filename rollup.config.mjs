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
// still inlined + injected into the bundle for the zero-config case; this file
// is reached only via the explicit `json-edit-react/style.css` subpath export,
// for consumers who need to inject the styles themselves (e.g. into a Shadow
// DOM, where head-injected styles can't cross the boundary). See issue #225.
const emitStandaloneCss = () => ({
  name: 'emit-standalone-css',
  writeBundle() {
    copyFileSync('src/style.css', 'build/style.css')
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
      styles({ minimize: true }),
      peerDepsExternal({ includeDependencies: true }),
      typescript({
        module: 'ESNext',
        target: 'es2020',
        declaration: true,
        declarationDir: 'build/dts',
      }),
      terser(),
      emitStandaloneCss(),
      bundleSize(),
      sizes(),
    ],
  },
  // Types
  {
    input: 'build/dts/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    external: [/\.css$/],
    plugins: [dts()],
  },
]
