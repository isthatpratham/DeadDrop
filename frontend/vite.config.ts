import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local Vite requests to /api are proxied to the Express backend.
// Production builds call same-origin /api unless VITE_API_BASE_URL is set
// for a split-origin deployment.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
