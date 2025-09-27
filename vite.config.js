// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'd931c706db8f.ngrok-free.app' // 👈 put your ngrok domain here
    ]
  }
})
