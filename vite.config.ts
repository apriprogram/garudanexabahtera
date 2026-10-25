import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { assetVersionsPlugin } from './scripts/asset-versions.mjs'

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

// Bundel awal halaman publik (entry + import statisnya), docs/platform/SEO-PLAN.md §5.7 (WP7): panel admin dan
// pustaka beratnya hanya boleh dimuat lazy. Build klien GAGAL bila salah satunya masuk entry (mis. impor statis halaman
// admin, atau framer-motion dipakai lagi di komponen publik: pakai <Presence> / CSS), dan memberi peringatan bila
// entry melewati anggaran gzip. ANALYZE=1 mencetak ukuran per chunk dan modul terbesar di entry (pengganti visualizer).
const ENTRY_BUDGET_GZIP = 150 * 1024
const FORBIDDEN_IN_ENTRY = [
  /\/node_modules\/(?:recharts|@dnd-kit\/[^/]+|pdfmake|docx|react-markdown|remark-gfm|framer-motion|motion-dom)\//,
  /\/src\/pages\/admin\/(?!routes\.tsx$|lazyPages\.tsx$)/,
]
const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`
/** Id modul dengan "/" (Windows memberi "\"). */
const slashes = (id: string) => id.split('\\').join('/')

const entryBudget = (): Plugin => ({
  name: 'gn-entry-budget',
  // Hanya build klien; bundel SSR prerender (scripts/prerender.mjs) memang berisi semuanya
  apply: (_config, env) => env.command === 'build' && !env.isSsrBuild,
  // writeBundle: kode akhir (setelah semua plugin generateBundle Vite), sama dengan file yang dikirim
  writeBundle(_options, bundle) {
    const chunks = new Map<string, Extract<(typeof bundle)[string], { type: 'chunk' }>>()
    for (const item of Object.values(bundle)) if (item.type === 'chunk') chunks.set(item.fileName, item)
    const graph = new Set<string>()
    const walk = (file: string) => {
      if (graph.has(file) || !chunks.has(file)) return
      graph.add(file)
      for (const imported of chunks.get(file)!.imports) walk(imported)
    }
    for (const chunk of chunks.values()) if (chunk.isEntry) walk(chunk.fileName)

    const rows = [...graph].map((file) => {
      const chunk = chunks.get(file)!
      return { file, raw: Buffer.byteLength(chunk.code), gzip: gzipSync(chunk.code).length, chunk }
    })
    const offenders = rows.flatMap(({ chunk }) =>
      Object.keys(chunk.modules)
        .map(slashes)
        .filter((id) => FORBIDDEN_IN_ENTRY.some((pattern) => pattern.test(id))),
    )
    if (offenders.length > 0) {
      this.error(
        `Bundel awal halaman publik memuat modul yang harus lazy (${offenders.length}): ${offenders.slice(0, 5).join(', ')}` +
          '. Impor lewat React.lazy / import() (lihat src/pages/admin/lazyPages.tsx).',
      )
    }
    const total = rows.reduce((sum, row) => sum + row.gzip, 0)
    if (total > ENTRY_BUDGET_GZIP) {
      this.warn(`Bundel awal halaman publik ${kib(total)} gzip, melewati anggaran ${kib(ENTRY_BUDGET_GZIP)} (SEO-PLAN.md §5.7).`)
    }
    if (process.env.ANALYZE) {
      const lines = rows.sort((a, b) => b.gzip - a.gzip).map((row) => `  ${row.file.padEnd(44)} ${kib(row.raw).padStart(11)} ${kib(row.gzip).padStart(11)} gzip`)
      const modules = rows
        .flatMap(({ chunk }) => Object.entries(chunk.modules).map(([id, info]) => [slashes(id), info.renderedLength] as const))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([id, length]) => `  ${kib(length).padStart(11)}  ${id.replace(/^.*?\/(node_modules|src)\//, '$1/')}`)
      console.log(
        ['', `[entry] bundel awal publik: ${kib(total)} gzip`, ...lines, '[entry] modul terbesar (sebelum minify):', ...modules].join('\n'),
      )
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    esToolkitCompatEsm,
    // ?v=<hash> kartu OG & pratinjau template (src/seo/assetVersion.ts); path eksplisit karena deploy memakai publicDir: false
    assetVersionsPlugin({ publicDir }),
    entryBudget(),
  ],
  // Dependency pre-bundling in dev does not run the plugins above
  optimizeDeps: {
    rolldownOptions: { plugins: [esToolkitCompatEsm] },
  },
  server: {
    // Worktree sesi paralel (.claude/worktrees/*) berada di dalam folder ini: tanpa ini dev server mengawasi isinya, dan
    // folder yang dihapus git di worktree itu tertahan "delete pending" (Access denied) di Windows
    watch: { ignored: ['**/.claude/worktrees/**'] },
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
