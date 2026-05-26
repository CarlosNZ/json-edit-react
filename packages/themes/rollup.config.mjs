import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'build/index.cjs.js', format: 'cjs' },
      { file: 'build/index.esm.js', format: 'esm' },
    ],
    external: ['json-edit-react'],
    plugins: [
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
    plugins: [dts()],
  },
]
