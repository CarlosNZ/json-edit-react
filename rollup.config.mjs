import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import sizes from 'rollup-plugin-sizes'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import styles from 'rollup-plugin-styles'
import { terser } from 'rollup-plugin-terser'

export default [
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
      styles(),
      peerDepsExternal({ includeDependencies: true }),
      typescript({ module: 'ESNext' }),
      sizes(),
      // terser(),
    ],
    external: [],
  },
  {
    input: './build/dts/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    external: [/\.css$/],
    plugins: [dts()],
  },
]
