import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        // Local backend (npm run dev in ../backend). Port set by backend/.env.
        // 5000 occupied by ai-image-gen-backend, 5001 by to-do-backend.
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 3000 },
})
