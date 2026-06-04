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
      '/assets': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    }
  }
})
