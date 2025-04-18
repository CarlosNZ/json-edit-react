import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const packageSource = process.env.VITE_JRE_SOURCE || 'npm'
console.log(`Using json-edit-react from: ${packageSource}`)

const srcMap: Record<string, string> = {
  npm: 'json-edit-react',
  local: path.resolve(__dirname, '../src'),
  build: path.resolve(__dirname, '../build_package'),
}

const jsonEditReactPath = srcMap[packageSource] ?? 'json-edit-react'

// https://vite.dev/config/

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@json-edit-react': jsonEditReactPath },
  },
  server: {
    port: 5176,
  },
})
