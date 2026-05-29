import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

type PackageOption = 'npm' | 'local' | 'build' | 'pack'

const packageSource: PackageOption = (process.env.VITE_JRE_SOURCE as PackageOption) || 'npm'
console.log(`Using json-edit-react from: ${packageSource}`)

const coreSrcMap: Record<PackageOption, string> = {
  npm: 'json-edit-react',
  local: path.resolve(__dirname, '../src'),
  build: path.resolve(__dirname, '../build_package'),
  pack: path.resolve(__dirname, '../pack-output/json-edit-react/package'),
}

const componentsSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/components',
  local: path.resolve(__dirname, '../packages/components/src'),
  build: path.resolve(__dirname, '../packages/components/build/index.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/components/package'),
}

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Order matters: more specific aliases first so `@json-edit-react/components`
    // matches before the bare `@json-edit-react` alias. The bare
    // `json-edit-react` alias covers sub-package imports (e.g. components' built
    // JS imports from `'json-edit-react'`) — in `pack` mode those files live
    // outside the workspace so node_modules resolution can't find core.
    alias: [
      { find: /^@json-edit-react\/components$/, replacement: componentsSrcMap[packageSource] },
      { find: /^@json-edit-react$/, replacement: coreSrcMap[packageSource] },
      { find: /^json-edit-react$/, replacement: coreSrcMap[packageSource] },
    ],
    // In `pack` and `build` modes the packed/built components package lives
    // outside CCL/node_modules. Without dedupe, vite's walk-up resolution can
    // pick up a second copy of React (from workspace root or elsewhere) —
    // different on-disk path = different React instance = broken hooks.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5176,
  },
})
