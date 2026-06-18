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
