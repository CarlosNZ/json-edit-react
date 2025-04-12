import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: 'https://carlosnz.github.io/json-edit-react/',
  define: {
    'import.meta.env.VITE_USE_LOCAL_SRC': JSON.stringify(process.env.VITE_USE_LOCAL_SRC),
  },
  resolve: {
    alias: {
      'json-edit-react-import':
        process.env.VITE_USE_LOCAL_SRC === 'true'
          ? path.resolve(__dirname, '../src')
          : 'json-edit-react',
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
