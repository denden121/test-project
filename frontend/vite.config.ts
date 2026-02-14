import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'

const backendUrl = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler/')) return 'react'
            if (id.includes('react-router')) return 'router'
            if (id.includes('@radix-ui')) return 'radix'
            if (id.includes('@reduxjs') || id.includes('react-redux')) return 'redux'
            if (id.includes('react-hook-form')) return 'form'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('axios')) return 'axios'
            return 'vendor'
          }
        },
      },
    },
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
