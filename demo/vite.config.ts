import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: 'https://carlosnz.github.io/json-edit-react/',
  resolve: {
    alias: {
      // 'json-edit-react-import': path.resolve(__dirname, '../src'),
      'json-edit-react-import': 'json-edit-react',
    },
  },
  server: {
    port: 5175,
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
})
