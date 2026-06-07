import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/assets/product': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/assets/portofolio': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/assets/services': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/assets/bg': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/assets/logo-product': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/assets/dokumen-client': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/assets/documents': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    }
  }
})
