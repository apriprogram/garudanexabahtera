import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const publicDir = fileURLToPath(new URL('./public', import.meta.url))

// Local API, see "cara menjalankan aplikasi":
// - default: PHP built-in server on backend/  (php -S 127.0.0.1:8000 -t backend)
// - API_BACKEND=node: backend/server.js on port 4000 (what production runs)
// API_TARGET overrides the URL for either one.
const useNode = process.env.API_BACKEND === 'node'
const apiTarget = process.env.API_TARGET || (useNode ? 'http://127.0.0.1:4000' : 'http://127.0.0.1:8000')

// Serve uploaded assets from public/ when the file exists locally, otherwise forward to the backend
const assetProxy: ProxyOptions = {
  target: apiTarget,
  changeOrigin: true,
  bypass: (req) => {
    const path = decodeURIComponent((req.url ?? '').split('?')[0])
    if (existsSync(publicDir + path)) return req.url
  },
}

// recharts imports `es-toolkit/compat/<fn>`, which resolves to es-toolkit's CommonJS build. Rolldown bundles
// that build into `var require_x = require_x()` ("require_isUnsafeProperty is not a function"), crashing every
// page with a chart. Serve those imports from es-toolkit's ES module build instead.
const esToolkitCompatPrefix = '\0es-toolkit-compat:'
const esToolkitCompatEsm = {
  name: 'es-toolkit-compat-esm',
  enforce: 'pre' as const, // before Vite's own resolver picks the CommonJS file
  resolveId(id: string) {
    const match = /^es-toolkit\/compat\/(\w+)$/.exec(id)
    if (match) return esToolkitCompatPrefix + match[1]
  },
  load(id: string) {
    if (id.startsWith(esToolkitCompatPrefix)) {
      return `export { ${id.slice(esToolkitCompatPrefix.length)} as default } from 'es-toolkit/compat'`
    }
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    esToolkitCompatEsm,
  ],
  // Dependency pre-bundling in dev does not run the plugins above
  optimizeDeps: {
    rolldownOptions: { plugins: [esToolkitCompatEsm] },
  },
  server: {
    proxy: {
      '/api.php': {
        target: apiTarget,
        changeOrigin: true,
      },
      // Node serves the admin AI chat at /api/ai-chat; api.php has it as action=ai_chat
      '/api/ai-chat': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: useNode ? undefined : () => '/api.php?action=ai_chat',
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
