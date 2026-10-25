import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { assetVersionsPlugin } from './scripts/asset-versions.mjs'

export default defineConfig({
  plugins: [
    react(),
    // virtual:gn-asset-versions (src/seo/assetVersion.ts); Vitest tidak memuat vite.config.ts
    assetVersionsPlugin({ publicDir: fileURLToPath(new URL('./public', import.meta.url)) }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.test.{ts,tsx}'],
  },
})