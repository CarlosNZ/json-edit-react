import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs-extra'

type PackageOption = 'npm' | 'local' | 'build' | 'pack'

const provider: PackageOption = (process.env.VITE_JRE_SOURCE as PackageOption) ?? 'npm'

console.log(`Using json-edit-react from: ${provider}`)

const coreSrcMap: Record<PackageOption, { pkgJson: string; src: string }> = {
  npm: {
    pkgJson: path.join('node_modules', 'json-edit-react', 'package.json'),
    src: 'json-edit-react',
  },
  local: {
    pkgJson: path.join('..', 'package.json'),
    src: path.resolve(__dirname, '../src'),
  },
  build: {
    pkgJson: path.join('..', 'build_package', 'package.json'),
    src: path.resolve(__dirname, '../build_package'),
  },
  pack: {
    pkgJson: path.resolve(__dirname, '../pack-output/json-edit-react/package/package.json'),
    src: path.resolve(__dirname, '../pack-output/json-edit-react/package'),
  },
}

// For `npm` mode, scoped sibling packages must be installed in demo/node_modules
// (they fall through to normal node_modules resolution). For `local`, `build`,
// and `pack` modes, vite rewrites the import to the in-repo path.
const themesSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/themes',
  local: path.resolve(__dirname, '../packages/themes/src'),
  build: path.resolve(__dirname, '../packages/themes/build/index.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/themes/package'),
}

const componentsSrcMap: Record<PackageOption, string> = {
  npm: '@json-edit-react/components',
  local: path.resolve(__dirname, '../packages/components/src'),
  build: path.resolve(__dirname, '../packages/components/build/index.esm.js'),
  pack: path.resolve(__dirname, '../pack-output/components/package'),
}

const packageFile = coreSrcMap[provider].pkgJson
const jsonEditReactPath = coreSrcMap[provider].src
const pkg = fs.readJsonSync(packageFile)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/json-edit-react/',
  resolve: {
    // Order matters: more specific scoped aliases must come before the bare
    // `@json-edit-react` alias so `@json-edit-react/themes` doesn't accidentally
    // resolve through the core alias's prefix match.
    //
    // The bare `json-edit-react` alias mirrors `@json-edit-react` for the real
    // npm name — sub-packages import from `'json-edit-react'`, and in `pack`
    // mode their files live outside the workspace so node_modules resolution
    // can't find core. In `npm` mode the replacement is just `'json-edit-react'`,
    // which makes the alias a no-op (vite re-resolves through node_modules).
    alias: [
      { find: /^@json-edit-react\/themes$/, replacement: themesSrcMap[provider] },
      { find: /^@json-edit-react\/components$/, replacement: componentsSrcMap[provider] },
      { find: /^@json-edit-react$/, replacement: jsonEditReactPath },
      { find: /^json-edit-react$/, replacement: jsonEditReactPath },
    ],
    // In `pack` and `build` modes the packed/built sub-packages live outside
    // demo/node_modules. Without dedupe, vite's walk-up resolution from those
    // files can pick up a second copy of React (from the workspace root's
    // node_modules, or wherever else it finds one first) — different on-disk
    // path = different React instance = hooks/context broken at runtime.
    // Forcing react/react-dom to always resolve from the demo's own deps
    // guarantees a single instance.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5175,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // UI library chunks
          chakra: [
            '@chakra-ui/react',
            '@chakra-ui/icons',
            '@emotion/react',
            '@emotion/styled',
            'framer-motion',
          ],
          // Code editor and related packages
          codemirror: [
            '@uiw/react-codemirror',
            '@codemirror/lang-json',
            '@uiw/codemirror-theme-github',
            '@uiw/codemirror-theme-console',
            '@uiw/codemirror-theme-quietlight',
            '@uiw/codemirror-theme-monokai',
          ],
          // Icons library
          icons: ['react-icons/fa', 'react-icons/bi', 'react-icons/ai'],
          // Core React packages
          vendor: ['react', 'react-dom', 'wouter', 'use-undo'],
          // JSON utilities
          json: ['json5', 'ajv'],
          jsonEditReact: ['json-edit-react'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })
    ),
    __VERSION__: JSON.stringify(pkg.version),
  },
})
