import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('./public', import.meta.url))

// Serve uploaded assets from public/ when the file exists locally, otherwise forward to the backend
const assetProxy: ProxyOptions = {
  target: 'http://localhost',
  changeOrigin: true,
  bypass: (req) => {
    const path = decodeURIComponent((req.url ?? '').split('?')[0])
    if (existsSync(publicDir + path)) return req.url
  },
}

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
      '/assets/product': assetProxy,
      '/assets/portofolio': assetProxy,
      '/assets/services': assetProxy,
      '/assets/bg': assetProxy,
      '/assets/logo-product': assetProxy,
      '/assets/dokumen-client': assetProxy,
      '/assets/documents': assetProxy,
    }
  }
})
