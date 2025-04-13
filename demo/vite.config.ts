import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  },
})
