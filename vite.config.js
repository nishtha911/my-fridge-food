import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Using IP instead of 'localhost' to avoid DNS issues
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api') // Ensures /api remains in the URL
      },
    },
  },
})