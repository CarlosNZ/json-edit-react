import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs-extra'

// Get the appropriate package.json so we can determine the version
const provider = process.env.VITE_JRE_SOURCE ?? 'published'
const pkgSrc: Record<string, string> = {
  local: path.join('src', 'json-edit-react', 'package.json'),
  published: path.join('node_modules', 'json-edit-react', 'package.json'),
  package: path.join('src', 'package', 'package.json'),
}
const packageFile = pkgSrc[provider]
const pkg = fs.readJsonSync(packageFile)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: 'https://carlosnz.github.io/json-edit-react/',
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
