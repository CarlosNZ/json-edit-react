import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'
import bundleSize from 'rollup-plugin-bundle-size'
import sizes from 'rollup-plugin-sizes'

// Keep core + React (and any React subpath like react/jsx-runtime) external —
// they're peer deps, never bundled.
const external = (id) =>
  id === 'json-edit-react' || id === 'react' || id === 'react-dom' || id.startsWith('react/')

export default [
  {
    input: 'src/index.ts',
    output: [
      { file: 'build/index.cjs.js', format: 'cjs' },
      { file: 'build/index.esm.js', format: 'esm' },
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
  },
  {
    input: 'build/dts/index.d.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
]
