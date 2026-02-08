import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendUrl = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    // Проксирование /api на бэкенд (в dev запросы с фронта идут на тот же origin, Vite перенаправляет на бэк)
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
