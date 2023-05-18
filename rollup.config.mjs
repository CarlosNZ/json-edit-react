import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import babel from '@rollup/plugin-babel'
import sizes from 'rollup-plugin-sizes'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
// import css from 'rollup-plugin-css-porter'
import styles from 'rollup-plugin-styles'
// import postcss from 'rollup-plugin-postcss'
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
      // babel({
      //   presets: ['@babel/preset-react'],
      // }),
      sizes(),
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
