import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// O backend Express (server/index.js) roda sempre na porta 5175, servindo a
// API e os PDFs gerados. Em dev, o Vite roda numa porta própria e faz proxy
// pra lá; em build, os assets vão direto pra public/, que o Express já serve.
const BACKEND_URL = 'http://localhost:5175'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': BACKEND_URL,
      '/output': BACKEND_URL,
      '/fonts': BACKEND_URL
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
})
