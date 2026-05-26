import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

type PackageOption = 'npm' | 'local' | 'build'

const packageSource: PackageOption = (process.env.VITE_JRE_SOURCE as PackageOption) || 'npm'
console.log(`Using json-edit-react from: ${packageSource}`)

const coreSrcMap: Record<PackageOption, string> = {
  npm: 'json-edit-react',
  local: path.resolve(__dirname, '../src'),
  build: path.resolve(__dirname, '../build_package'),
}

const componentsSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/components',
  local: path.resolve(__dirname, '../packages/components/src'),
  build: path.resolve(__dirname, '../packages/components/build/index.esm.js'),
}

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Order matters: more specific aliases first so `@json-edit-react/components`
    // matches before the bare `@json-edit-react` alias.
    alias: [
      { find: /^@json-edit-react\/components$/, replacement: componentsSrcMap[packageSource] },
      { find: /^@json-edit-react$/, replacement: coreSrcMap[packageSource] },
    ],
  },
  server: {
    port: 5176,
  },
})
