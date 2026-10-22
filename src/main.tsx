import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { installAuthFetch } from './lib/auth'
import { primePreload, readPreload } from './lib/preload'
import { SeoManager } from './seo/SeoManager'
import { normalizePathname } from './seo/paths'
import { findSeoModule } from './seo/routes'
import { isMainHost } from './templates/siteHosts'

// Attaches the admin session token to every /api.php request (see src/lib/auth.ts)
installAuthFetch()

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <BrowserRouter>
      <SeoManager />
      <App />
    </BrowserRouter>
  </StrictMode>
)

/**
 * Halaman host utama dikirim sebagai HTML prerender (_pre/*.html, scripts/prerender.mjs) dengan data API di
 * <script id="gn-preload">. Render pertama harus memakai data yang sama (primePreload) supaya hydrateRoot tidak
 * menemukan perbedaan. Chunk rute (React.lazy) dimuat lebih dulu: tanpa itu batas Suspense bisa menampilkan spinner
 * di atas HTML yang sudah tampil.
 */
async function start() {
  const preload = readPreload()
  if (preload) primePreload(preload)

  // HTML ini dirender untuk path sekarang (_pre/*.html), atau 404.html (path null, dirender di /404) yang dibuka di path
  // tanpa pemilik *.seo.ts: React Router juga merender NotFound di sana, jadi pohonnya sama. 404.html untuk path yang
  // dimiliki halaman lain (mis. /template/slug-tidak-ada → TemplateDetail) dirender ulang biasa.
  const path = normalizePathname(window.location.pathname)
  const prerendered =
    preload !== null &&
    container.firstElementChild !== null &&
    isMainHost(window.location.hostname) &&
    (preload.path === path || (preload.path === null && findSeoModule(path) === null))

  if (preload?.chunks?.length) {
    // Gagal memuat chunk tidak fatal: React.lazy mencoba lagi saat render
    await Promise.all(preload.chunks.map((src) => import(/* @vite-ignore */ src).catch(() => undefined)))
  }

  if (prerendered) {
    hydrateRoot(container, app, {
      onRecoverableError(error, info) {
        console.error('[hydrate]', error, info.componentStack ?? '')
      },
    })
    return
  }
  // Tanpa prerender (dev, domain pembeli, app.html) atau HTML untuk halaman lain: render biasa.
  // createRoot mengganti isi #root saat commit pertama.
  createRoot(container).render(app)
}

void start()
