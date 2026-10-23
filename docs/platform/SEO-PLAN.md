<!--
Keputusan default yang dipakai implementasi (2026-10-23). Pemilik bisa mengubahnya kapan saja; semua dibaca dari
src/lib/companyFacts.ts dan pengaturan admin, jadi perubahan cukup di satu tempat.

1. Harga jasa custom: tidak menampilkan angka ("lewat penawaran setelah konsultasi gratis"), sesuai design.md.
2. Bot AI training (GPTBot, ClaudeBot, CCBot, Google-Extended): diizinkan. robots.txt tidak punya grup khusus bot.
   Pengaturan "Block AI bots" di Cloudflare dan WAF hosting tetap tindakan pemilik (bagian 6.A–6.B).
3. Alamat kantor, NIB/PSE, harga perpanjangan tahun ke-2, waktu aktif "X–Y hari kerja": belum ada, jadi bernilai null
   dan tidak dirender di mana pun (tidak ada placeholder).
4. garudanexa.id / @garudanexa: tidak disebut dan tidak masuk sameAs sampai pemilik memutuskan hubungannya.
5. Penulis artikel panduan: "Tim Garuda Nexa" (Organization) sampai ada nama, peran dan profil orang nyata.
6. Tanpa testimoni, ulasan, rating, portofolio atau angka statistik yang tidak bisa dibuktikan.
7. Gambar OG dibuat sekali dengan skrip (tanpa harga di gambar supaya tidak basi) dan di-commit di public/og/.
   sharp dan rollup-plugin-visualizer tidak dipasang (disk E: hampir penuh).
8. Data prerender diambil dari API production saat deploy (PRERENDER_API, default https://garudanexa.com). Deploy
   dibatalkan jika data gagal diambil atau template kurang dari MIN_TEMPLATES.
9. Nomor migration yang dipesan: 009 = perbaikan FAQ & kontak (WP6), 010 = kolom referrer kunjungan (WP9).
-->

# Rencana Implementasi SEO & Visibilitas di Pencarian AI: garudanexa.com

Disusun 2026-10-23 oleh SEO Lead. Dasar rencana ini adalah tiga audit: teknis (TECH-01 s.d. 17), kata kunci/SERP (KW-01 s.d. 15) dan konten (CONTENT-01 s.d. 17). Temuan audit sudah saya cocokkan dengan kode di repo: `src/App.tsx`, `src/main.tsx`, `scripts/deploy-cpanel.mjs`, `deploy/cpanel/htaccess`, `src/lib/api.ts`, `src/hooks/useCachedJson.ts`, `src/store/useStore.ts`, `src/components/ui/SplitText.tsx`/`Reveal.tsx` dan `src/components/sections/FAQ.tsx`.

Pekerjaan ini dijalankan **setelah** workflow template (Arena Club, Aura Studio, Finova) selesai dan migration `2026-10-22_007` dan `_008` sudah dijalankan di production.

---

## 1. Ringkasan eksekutif

1. Saat ini garudanexa.com hampir tidak terlihat oleh mesin pencari maupun mesin jawaban AI. Setiap URL mengembalikan cangkang HTML yang sama (1.537 byte, 0 kata, 0 tautan). Crawler yang tidak menjalankan JavaScript, yaitu ChatGPT search (OAI-SearchBot), Perplexity dan Claude, tidak melihat produk, harga, maupun layanan custom.
2. Google juga terhambat:
   - robots.txt memblokir `/api.php`, padahal katalog dan halaman template memuat datanya dari sana.
   - sitemap tidak berisi satu pun halaman template.
   - www dan halaman login ikut terindeks.
   - di Bing hanya ada dua URL sampah (`/auth`, `/cgi-bin/`).
3. Crawler juga diblokir di dua lapis. Cloudflare memblokir bot AI, dan WAF di server (LiteSpeed/Imunify) menolak lalu meng-greylist user agent crawler. Pemilik harus membuka akses untuk crawler search dan AI yang terverifikasi. Tanpa langkah ini, pekerjaan lain tidak berdampak.
4. Rencana ini memperbaiki fondasi lebih dulu:
   - HTML hasil prerender per halaman
   - title, meta, canonical dan JSON-LD yang unik per halaman
   - sitemap yang dibuat dari database
   - status 404 yang benar
   - noindex untuk halaman aplikasi

   Setelah itu kami membangun halaman yang bisa bersaing: katalog dan kategori template, halaman template yang kaya isi, halaman jasa website dan aplikasi, harga, tentang, kontak, dan panduan.
5. Peluang tercepat ada di kueri niche seperti "template website klinik kecantikan", "template website klub olahraga" dan "website company profile siap pakai". Hasil Google untuk kueri ini hanya berisi marketplace global (ThemeForest, Wix, Canva). Belum ada penawaran Indonesia yang "sudah jadi + domain + hosting + CMS + bayar online".
6. Kueri utama "jasa pembuatan website" dan "jasa pembuatan aplikasi android" dikuasai Fastwork, Sribu, perusahaan hosting dan agensi besar. Ini target 12 bulan lebih; sementara itu marketplace dipakai sebagai kanal penjualan.
7. Gambaran realistis, tanpa jaminan:
   - **Bulan 1:** semua halaman publik terbaca crawler, terindeks di Google dan Bing, dan brand "Garuda Nexa Bahtera" muncul teratas.
   - **Bulan 3:** muncul impresi dan sebagian posisi halaman 1–2 untuk kueri niche template, plus kutipan awal di Perplexity/ChatGPT untuk pertanyaan brand dan niche.
   - **Bulan 6:** beberapa kueri long-tail masuk 10 besar, dan panduan harga mulai dikutip di AI Overviews.
8. Tidak ada pihak yang bisa menjamin peringkat #1 di Google maupun di jawaban AI. Yang bisa kami pastikan: situs layak di-crawl, dipahami dan dikutip, dan hasilnya diukur setiap bulan (bagian 7).

---

## 2. Keputusan yang menyatukan ketiga audit

| Topik | Keputusan | Catatan |
|---|---|---|
| URL katalog | `/template` (bukan `/template-website`) | Satu hierarki dengan `/template/{slug}`; kata kunci ditaruh di title dan H1 |
| Kategori | `/template/kategori/{slug}`: `company-profile`, `kecantikan-klinik`, `olahraga-komunitas`, `fintech-startup` (dipetakan dari kolom `category` di DB) | Diindeks hanya jika ada ≥2 template **atau** ≥300 kata unik + FAQ. Selain itu `noindex,follow`. Slug template tidak boleh bernama `kategori` |
| Jasa custom | `/jasa-pembuatan-website`, `/jasa-pembuatan-aplikasi-mobile` | `/jasa-pembuatan-website-sekolah-pesantren` hanya dibuat jika ada portofolio nyata (i-School/i-Santri) |
| Harga | `/harga` menargetkan "harga template website / Garuda Nexa" | Kata kunci "harga pembuatan website company profile 2026" dipegang artikel di `/panduan` agar dua halaman tidak saling bersaing |
| Panduan | `/panduan`, `/panduan/{slug}` | Artikel ditulis sebagai sumber Markdown yang ikut di-bundle, lalu di-prerender |
| Trust | `/tentang`, `/kontak` | `/portofolio` baru dibuat setelah ada studi kasus nyata |
| Rendering | Prerender saat deploy (Vite SSR + React 19 `prerenderToNodeStream`), `backend/seo.php` sebagai cadangan, `hydrateRoot` di klien | Tidak ada Node di server; semua dibangun di mesin deploy |
| Halaman aplikasi | `/akun*`, `/pesan/*`, `/masuk`, `/daftar`, `/situs/*`, `/demo/*` diberi `noindex,follow` lewat `app.html` | **Tidak** di-Disallow di robots, supaya crawler bisa membaca noindex. `/admin`, `/login`, `/auth` tetap di-Disallow |
| Demo | `noindex,follow` tanpa canonical ke halaman lain (menghindari sinyal campur) | Target kueri "contoh website {niche}" dipegang `/template/{slug}` |
| JSON-LD | Organization + WebSite (semua halaman); Product + Offer IDR + BreadcrumbList (template); Service (jasa); CollectionPage + ItemList (katalog); Article (panduan); AboutPage/ContactPage | FAQPage opsional (Google tidak lagi menampilkan rich result FAQ). Tanpa `aggregateRating` sampai ada ulasan pembeli asli. LocalBusiness hanya setelah ada alamat nyata dan Google Business Profile |
| Halaman kota | Tidak dibuat (risiko dianggap doorway page) | Paling banyak satu halaman untuk kota kantor nyata, dan hanya jika ada bukti lokal |
| Harga jasa custom | Default: tanpa angka (aturan `design.md`) | Keputusan pemilik: mencantumkan "mulai dari Rp…" adalah tuas terbesar agar dikutip di jawaban "berapa biaya" |
| Bot AI untuk training | Keputusan pemilik. Rekomendasi: izinkan, karena kontennya konten pemasaran dan membantu model mengenal brand | Bot search/user (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User) **wajib** diizinkan |
| llms.txt | Dibuat (murah) | Bukan faktor ranking; fokus utama tetap HTML yang bisa dibaca |

---

## 3. Urutan kerja & prasyarat

**Prasyarat:**
- Workflow template sudah selesai dan ter-merge di `main`.
- Migration 007/008 sudah jalan di production, dan `get_templates` live mengembalikan 5 template dengan preview WebP.
- Mesin deploy tidak sedang di-greylist oleh WAF (lihat 6.B).

| Fase | Waktu | Paket kerja (engineer) | Pemilik bisnis |
|---|---|---|---|
| 0 | Hari 1–2 | WP0 hotfix, WP1 scaffold dan kontrak | 6.A Cloudflare, 6.B WAF/hosting, 6.C Search Console, 6.D Bing |
| 1 | Minggu 1–3 | WP2, WP3, WP4 dan WP7 paralel. Penulis copy WP5, WP6 dan WP8 mulai menulis naskah (dokumen, belum kode) | 6.F keputusan dan data bisnis (paling lambat akhir minggu 2) |
| 2 | Minggu 3–6 | Implementasi WP5 dan WP6, 4 artikel pertama WP8, WP9 pengukuran | 6.E Google Business Profile, 6.G marketplace dan direktori |
| 3 | Bulan 2–6 | 8 artikel berikutnya, backlog (bagian 5.11), iterasi berdasarkan data Search Console | 6.H ulasan, 6.I PR dan backlink, panel AI bulanan |

Skala effort: **S** ≤1 hari, **M** 2–4 hari, **L** 5–10 hari (untuk 1 engineer). Total sekitar 30–38 hari-orang. Dengan 3–4 engineer, kira-kira 3–5 minggu kalender.

---

## 4. Peta kepemilikan file (supaya paralel tanpa bentrok)

Aturannya: satu file punya satu pemilik. Untuk file yang berpindah tangan ("A → B"), B baru mulai setelah perubahan A ter-merge.

| File / folder | Pemilik | Catatan |
|---|---|---|
| `public/robots.txt` | WP0 | Final di Fase 0 |
| `backend/api.php` | WP0 → WP9 | WP0 menambah header X-Robots-Tag; WP9 kemudian menambah referrer di `track_visit` |
| `deploy/cpanel/htaccess` | WP0 → WP2 | WP0: www, index.html, cache. WP2: blok routing. WP4 menyerahkan snippet charset .txt ke WP2 |
| `src/App.tsx`, `package.json`, `package-lock.json` | WP1 | Semua rute baru, `Auth` dijadikan lazy, dan devDependency (`sharp`, `rollup-plugin-visualizer`) dipasang sekali di Fase 0 |
| `src/seo/types.ts` (kontrak) | WP1 | Dibekukan; perubahan hanya lewat lead |
| `src/main.tsx`, `src/entry-server.tsx` (baru), `src/lib/preload.ts` (baru), `src/lib/api.ts`, `src/hooks/useCachedJson.ts`, `src/store/useStore.ts`, `src/pages/public/template/useTemplateBySlug.ts`, `src/components/sections/Projects.tsx`, `scripts/prerender.mjs` (baru), `scripts/deploy-cpanel.mjs`, `backend/seo.php` (baru) | WP2 | |
| `src/components/sections/Templates.tsx` | WP2 → WP5 | WP2 hanya mengubah inisialisasi data |
| `src/seo/**` (kecuali `types.ts`), `index.html`, `public/favicon.ico`, `public/apple-touch-icon.png`, `public/site.webmanifest`, `public/brand/logo-512.png`, `public/og/default.jpg`, `scripts/seo/og-images.mjs`, `src/pages/public/template/useDocumentTitle.ts`, `src/pages/public/legal/LegalPage.tsx`, `src/pages/public/TemplateDemo.tsx`, `src/pages/public/NotFound.tsx` | WP3 | WP7 menyerahkan snippet font untuk `index.html` |
| `scripts/seo/sitemap.mjs`, `scripts/seo/llms.mjs`, `scripts/seo/indexnow.mjs`, `public/sitemap.xml` (dihapus), `public/<kunci-indexnow>.txt`, `backend/sitemap.php` (opsional) | WP4 | |
| `src/pages/public/catalog/**`, `src/content/templates/**`, `src/content/categories.ts`, `src/pages/public/TemplateDetail.tsx`, `src/pages/public/template/OtherTemplates.tsx`, `src/pages/public/template/TemplateGallery.tsx`, `src/components/sections/templates/TemplateShot.tsx`, `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx` | WP5 | |
| `src/pages/public/services/**`, `src/pages/public/info/**`, `src/lib/companyFacts.ts` (dibuat WP1, lalu milik WP6), `src/content/faq.ts`, `src/components/sections/FAQ.tsx`, `src/pages/public/Home.tsx`, `src/components/sections/hero/HeroIntro.tsx`, `src/hooks/useTranslation.ts`, `src/pages/public/CustomOrder.tsx`, migration perbaikan FAQ/kontak, `design.md` (jika aturan harga custom berubah) | WP6 | |
| `src/pages/admin/routes.tsx`, `vite.config.ts`, `src/components/ui/SplitText.tsx`, `src/components/ui/Reveal.tsx`, `src/components/sections/hero/HeroShowcase.tsx`, `HeroBackground.tsx`, `HeroMedia.tsx`, `src/components/sections/LogoTicker.tsx`, `src/index.css`, `public/fonts/**` | WP7 | |
| `src/pages/public/panduan/**`, `src/content/panduan/**`, `src/content/authors.ts` | WP8 | |
| `scripts/seo/seo-check.mjs`, migration kolom referrer | WP9 | |
| `src/templates/**` (situs pembeli), migration milik workflow template, `public/assets/templates/**` | Workflow template | Tidak disentuh paket SEO, kecuali item backlog buyer-domain |

**Kontrak antar-paket.** WP1 membuat file berikut; isi tipenya dibekukan:

```ts
// src/seo/types.ts
export interface SeoData {
  settings: Record<string, unknown>;
  navbar: unknown;
  templates: Template[];
  projects: unknown[];
  templateBySlug: Record<string, Template>;
  builtAt: string;
}

export interface SeoHead {
  title: string;
  description: string;
  canonical: string | null;
  robots: 'index,follow' | 'noindex,follow';
  ogType: 'website' | 'product' | 'article';
  ogImage: string;
  ogImageAlt: string;
  jsonLd: object[];
  preloadImage?: string;
}

export interface SitemapEntry {
  path: string;
  lastmod: string;
  images?: string[];
}

export interface PageSeo {
  match(pathname: string): boolean;
  head(pathname: string, data: SeoData): SeoHead | null;
  routes?(data: SeoData): SitemapEntry[];
}
```

- Setiap halaman baru menyediakan `*.seo.ts` di foldernya (default export `PageSeo`). `src/seo/routes.ts` mengumpulkannya dengan `import.meta.glob('../pages/public/**/*.seo.ts', { eager: true })`, jadi tidak ada yang perlu mengedit satu registry bersama.
- Ekspor yang disepakati per modul:

  | Modul | Ekspor |
  |---|---|
  | `src/seo/routes.ts` | `getHead(pathname, data)`, `getIndexableRoutes(data)` |
  | `src/seo/head.ts` | `renderHeadTags(head)` (server), `applyHead(head)` (klien) |
  | `src/seo/SeoManager.tsx` | komponen `SeoManager` |
  | `src/lib/preload.ts` | `primePreload(data)`, `readPreload()` |
  | `scripts/seo/sitemap.mjs` | `buildSitemap(entries, origin)` |
  | `scripts/seo/llms.mjs` | `buildLlmsTxt({ facts, templates, entries })`, `buildLlmsFullTxt(...)` |
  | `scripts/seo/og-images.mjs` | `buildOgImages({ templates, outDir, publicDir })` |
  | `src/lib/companyFacts.ts` | `COMPANY_FACTS` |

---

## 5. Paket kerja engineer

### 5.0 WP0: Hotfix akses crawler, duplikat host dan cache
**Prioritas** P0 · **Effort** S (0,5–1 hari) · **Fase** 0 · **Bergantung pada** tidak ada

**Tujuan:** perbaikan yang langsung membantu Google, sebelum prerender jadi (TECH-02, TECH-06 sebagian, TECH-11, KW-12).

**File:** `public/robots.txt`, `backend/api.php`, `deploy/cpanel/htaccess`.

**Langkah:**

1. Ganti `public/robots.txt`. Aturan yang paling panjang dan cocok yang menang, jadi aksi baca publik tetap terbuka:
   ```
   User-agent: *
   Allow: /
   Allow: /api.php?action=get_settings
   Allow: /api.php?action=get_navbar_menus
   Allow: /api.php?action=get_templates
   Allow: /api.php?action=get_template&
   Allow: /api.php?action=get_public_projects
   Disallow: /api.php
   Disallow: /admin
   Disallow: /login
   Disallow: /auth

   Sitemap: https://garudanexa.com/sitemap.xml
   ```
   - Jangan menambah grup `User-agent: OAI-SearchBot` dan sejenisnya kecuali perlu. Grup khusus menggantikan grup `*` untuk bot tersebut, sehingga semua aturan harus diulang di dalamnya.
   - Jika pemilik memutuskan memblokir bot training, tambahkan grup `User-agent: GPTBot` + `Disallow: /` (begitu juga untuk ClaudeBot, CCBot dan Google-Extended), dan samakan dengan pengaturan di Cloudflare.
2. Di `backend/api.php`, kirim `header('X-Robots-Tag: noindex')` untuk semua respons JSON agar URL API tidak pernah muncul di hasil pencarian.
3. Di `deploy/cpanel/htaccess`:
   - Taruh redirect www → apex **sebelum** aturan HTTPS:
     ```apache
     RewriteCond %{HTTP_HOST} ^www\.garudanexa\.com$ [NC]
     RewriteRule ^ https://garudanexa.com%{REQUEST_URI} [R=301,L]
     ```
   - Redirect `/index.html` ke `/` (hanya untuk request asli, bukan rewrite internal):
     ```apache
     RewriteCond %{THE_REQUEST} \s/index\.html[\s?]
     RewriteRule ^index\.html$ / [R=301,L]
     ```
   - Perbaiki cache JS dengan `ExpiresByType text/javascript "access plus 1 year"`, plus:
     ```apache
     <FilesMatch "-[A-Za-z0-9_-]{8}\.(js|css)$">
       Header set Cache-Control "public, max-age=31536000, immutable"
     </FilesMatch>
     ```
   - Blok handler PHP cPanel tetap di **akhir** file.
4. Deploy seperti biasa: `node scripts/deploy-cpanel.mjs --push`, lalu di cPanel klik Pull/Deploy.

**Kriteria penerimaan:**
- `curl -sI https://www.garudanexa.com/template/corporate-nexa` mengembalikan 301 dengan `Location: https://garudanexa.com/template/corporate-nexa` (satu kali lompatan).
- `curl -sI http://www.garudanexa.com/` sampai ke `https://garudanexa.com/` dalam ≤2 lompatan. Untuk satu lompatan, tambahkan Redirect Rule di Cloudflare (6.A).
- `curl -sI https://garudanexa.com/index.html` mengembalikan 301 ke `/`.
- `curl -sI https://garudanexa.com/assets/<file-index>.js` mengandung `max-age=31536000, immutable`.
- `curl -sI "https://garudanexa.com/api.php?action=get_templates"` mengandung `X-Robots-Tag: noindex`.
- Uji live URL Inspection di Search Console untuk `/template/corporate-nexa`: pada "Resource halaman" tidak ada `api.php` yang diblokir, dan screenshot menampilkan nama template dan harga.
- Satu domain pembeli masih tampil normal.

### 5.1 WP1: Scaffold dan kontrak
**Prioritas** P0 · **Effort** S (1 hari) · **Fase** 0 · Dikerjakan engineer yang juga memegang WP2.

**Tujuan:** membuat semua rute, stub dan kontrak sekali di depan, supaya WP2–WP8 bisa jalan paralel tanpa saling mengedit `App.tsx` atau `package.json`.

**File:**
- `src/App.tsx`
- `package.json`, `package-lock.json`
- `src/seo/types.ts`
- stub `src/seo/routes.ts`, `src/seo/head.ts` dan `src/seo/SeoManager.tsx` (mengembalikan `null`)
- `src/lib/companyFacts.ts`
- stub halaman: `src/pages/public/catalog/{CatalogPage,CategoryPage}.tsx`, `services/{JasaWebsite,JasaAplikasi}.tsx`, `info/{Harga,Tentang,Kontak}.tsx`, `panduan/{PanduanIndex,PanduanArticle}.tsx`, masing-masing dengan `*.seo.ts`

**Langkah:**
1. Di `App.tsx`, tambahkan rute lazy berikut:
   - `/template`
   - `/template/kategori/:category`
   - `/jasa-pembuatan-website`
   - `/jasa-pembuatan-aplikasi-mobile`
   - `/harga`, `/tentang`, `/kontak`
   - `/panduan`, `/panduan/:slug`

   Ubah juga `import Auth from './pages/Auth'` menjadi `lazy()` (bagian dari TECH-09).
2. Setiap stub `*.seo.ts` mengembalikan `robots: 'noindex,follow'` dan tidak menyediakan `routes()`. Dengan begitu stub tidak akan pernah terindeks atau masuk sitemap sebelum isinya siap.
3. Isi `companyFacts.ts` dengan fakta yang sudah pasti: nama Garuda Nexa, badan hukum PT Garuda Nexa Bahtera, `https://garudanexa.com`, `info@garudanexa.com`, WhatsApp `+6285188009152` (dikonfirmasi pemilik), dan isi paket harga template.
   - Field yang belum ada (alamat, NIB, harga tahun ke-2, waktu aktif) diberi nilai `null`. Komponen **tidak boleh** merender placeholder untuk field ini.
4. Pasang devDependency: `npm i -D sharp rollup-plugin-visualizer`.

**Kriteria penerimaan:**
- `npm run build` lulus.
- Semua rute baru tampil sebagai stub.
- `getHead('/harga', data).robots === 'noindex,follow'` selama halaman masih stub.

### 5.2 WP2: Prerender/SSG dan routing (404 asli, noindex, khusus host utama)
**Prioritas** P0 · **Effort** L (6–8 hari) · **Fase** 1 · **Bergantung pada** WP1. Menggunakan modul WP3 dan WP4 lewat kontrak; selama modul itu belum jadi, pakai stub.

**Tujuan:** setiap halaman publik terkirim sebagai HTML lengkap (H1, teks, harga, tautan, head, JSON-LD) tanpa membutuhkan JavaScript. Ini menyelesaikan TECH-01, 06, 08, 13, KW-01 dan CONTENT-01.

**File:** lihat bagian 4 (baris WP2) ditambah `deploy/cpanel/htaccess` setelah WP0.

**Langkah:**

1. **Keamanan SSR.** `src/store/useStore.ts` mengakses `localStorage`, `window.matchMedia` dan `document.body` di level modul, sehingga crash saat di-render di server.
   - Bungkus dengan `typeof window !== 'undefined'` (default `'dark'`).
   - Jalankan build SSR dan perbaiki setiap modul yang crash saat diimpor.
   - Jika perbaikan menyentuh file milik WP lain, cukup ubah 1–3 baris dan merge WP2 lebih dulu.
2. **Data preload** di `src/lib/preload.ts`. `primePreload(data)` mengisi cache modul berikut:
   - `sharedGets` di `api.ts` (ekspor fungsi prime-nya)
   - Map `cache` di `useCachedJson.ts`, dengan kunci URL seperti `/api.php?action=get_settings`. Simpan data mentah dan lakukan normalisasi saat dibaca, supaya priming tidak perlu tahu fungsi `normalize`.
   - cache template per slug untuk `useTemplateBySlug.ts`

   `Templates.tsx`, `Projects.tsx` dan `useTemplateBySlug.ts` membaca data yang sudah di-prime langsung di initializer `useState` (status `ready`), lalu effect tetap memuat ulang data untuk kesegaran. Alasannya: React tidak menyertakan data yang diambil di dalam effect ke HTML prerender.
3. **`src/entry-server.tsx`:**
   - `render(url, data)` memanggil `primePreload(data)`, lalu `prerenderToNodeStream(<StrictMode><StaticRouter location={url}><SeoManager/><App/></StaticRouter></StrictMode>)` (dari `react-dom/static`; fungsi ini menunggu `lazy`/Suspense selesai), lalu mengubah hasilnya menjadi string.
   - Ekspor juga `getHead`, `getIndexableRoutes`, `renderHeadTags` dan `COMPANY_FACTS` untuk dipakai skrip Node.
   - Di server, `SiteHostGate` mendapat hostname kosong, sehingga `isMainHost('')` bernilai true dan aplikasi utama yang dirender. Ini perilaku yang benar.
4. **`src/main.tsx`:**
   - Baca `<script id="gn-preload" type="application/json">`, lalu panggil `primePreload`.
   - Pasang `<SeoManager/>` di samping `<App/>` di dalam `BrowserRouter`.
   - Jika `#root` sudah berisi elemen, pakai `hydrateRoot`; jika belum, `createRoot`.
   - **Jangan** memakai `createRoot` di atas HTML prerender tanpa memuat chunk rute lebih dulu. Fallback Suspense akan menghapus konten (layar berkedip, CLS, dan LCP jadi buruk).
5. **`scripts/prerender.mjs`**, dipanggil `deploy-cpanel.mjs` setelah build klien dan penyalinan `public/`:
   1. Jalankan `await build({ root, publicDir: false, logLevel: 'warn', build: { ssr: 'src/entry-server.tsx', outDir: join(DEPLOY_DIR, 'ssr'), emptyOutDir: true } })`, lalu impor bundel SSR-nya.
   2. Ambil data dari production: `get_settings`, `get_navbar_menus`, `get_templates`, `get_public_projects`, dan `get_template&slug=` per slug.
      - Request berurutan, dengan UA `GarudaNexaPrerender/1.0`, timeout 15 detik, retry 2×.
      - **Batalkan deploy** jika ada request yang gagal atau jumlah template lebih kecil dari `MIN_TEMPLATES` (default 5). Jangan pernah mempublikasikan katalog kosong.
   3. Untuk setiap rute dari `getIndexableRoutes(data)`:
      - Sisipkan `renderHeadTags(getHead(url))` menggantikan title/description generik di `OUT/index.html`.
      - Isi `<div id="root">` dengan HTML aplikasi.
      - Tambahkan `<script id="gn-preload" type="application/json">`. JSON di dalamnya harus di-escape `<` → `<`.
      - Tulis ke `OUT/_pre/{path}.html`. Contoh: `/` → `_pre/index.html`, `/template/aura-studio` → `_pre/template/aura-studio.html`.
   4. Tulis `OUT/app.html` (shell + `<meta name="robots" content="noindex,follow">`) dan `OUT/404.html` (NotFound hasil prerender, noindex).
   5. Panggil `buildSitemap` / `buildLlmsTxt` / `buildLlmsFullTxt` (WP4) dan `buildOgImages` (WP3).
   6. Salin `backend/seo.php` ke `OUT/seo.php`.
   7. Cek kewarasan; gagalkan deploy jika ada yang tidak terpenuhi:
      - setiap file `_pre` punya tepat 1 `<h1>`, 1 canonical dan 1 `<title>`
      - semua JSON-LD bisa di-parse
      - tidak ada dua title yang sama
6. **`deploy-cpanel.mjs`:** panggil `prerender.mjs` setelah langkah 1, dan pastikan `public/sitemap.xml` lama tidak ikut tersalin (WP4 menghapusnya).
7. **Routing `.htaccess`** menggantikan blok SPA. Aturan untuk host utama hanya berlaku bagi `garudanexa.com`; domain pembeli tidak berubah:
   ```apache
   # (www→apex dan HTTPS dari WP0 tetap di atas)
   # file internal tidak bisa diakses langsung
   RewriteCond %{THE_REQUEST} \s/(_pre/|app\.html|seo\.php)
   RewriteRule ^ - [R=404,L]
   # trailing slash → tanpa slash (host utama, bukan folder nyata)
   RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.+)/$ /$1 [R=301,L]
   RewriteRule ^api/ai-chat/?$ api.php?action=ai_chat [QSA,L]
   # HOST UTAMA: halaman hasil prerender
   RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
   RewriteRule ^$ _pre/index.html [L]
   RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
   RewriteCond %{DOCUMENT_ROOT}/_pre/$1.html -f
   RewriteRule ^([a-z0-9/-]+)$ _pre/$1.html [L]
   # HOST UTAMA: template yang terbit setelah deploy terakhir (404 kalau tidak ada)
   RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
   RewriteRule ^template/([a-z0-9-]+)$ seo.php?slug=$1 [L,QSA]
   # HOST UTAMA: rute aplikasi → shell noindex
   RewriteCond %{HTTP_HOST} ^garudanexa\.com$ [NC]
   RewriteRule ^(akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(/.*)?$ app.html [L]
   # DOMAIN PEMBELI: perilaku SPA seperti sekarang
   RewriteCond %{HTTP_HOST} !^garudanexa\.com$ [NC]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^ index.html [L]
   # HOST UTAMA: selebihnya 404 asli
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^ - [R=404,L]
   ErrorDocument 404 /404.html
   ```
   - `^pesan(/.*)?$` **tidak** menangkap `pesan-custom`.
   - Ubah aturan `no-cache` dari `^index\.html$` menjadi semua `\.html$`.
   - Uji setiap aturan dengan `curl -I` di LiteSpeed. Jika `%{DOCUMENT_ROOT}` berbeda di server, ganti dengan path absolut `public_html`.
8. **`backend/seo.php`:**
   - Validasi `slug` dengan `^[a-z0-9-]{1,120}$` (batas slug di kedua backend dan kolom DB), lalu ambil template yang `published` (gunakan ulang fungsi di `modules/templates.php`).
   - Jika tidak ada: `http_response_code(404)`, lalu `readfile('404.html')`.
   - Jika ada: baca `index.html`, lalu sisipkan title, description, canonical, OG, JSON-LD Product dan Breadcrumb, serta blok `<main>` sederhana (H1, deskripsi, fitur, harga, tautan ke `/pesan/{slug}`, `/demo/{slug}`, `/template`).
   - Escape semua nilai dengan `htmlspecialchars`. JSON-LD ditulis dengan `json_encode(..., JSON_HEX_TAG | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`.
9. **Aturan proses** (tulis di `deploy/cpanel/README.md`): setiap admin mengubah harga, nama atau deskripsi template, atau menerbitkan template baru, jalankan deploy ulang supaya HTML dan JSON-LD tetap sama dengan harga yang berlaku. Sebelum deploy ulang, `seo.php` menangani slug baru. WP9 mengecek kesesuaian harga ini.

**Kriteria penerimaan:**
- Hasil build: `ls <DEPLOY_DIR>/build/_pre/template/` berisi 5 slug.
- Tiap file `_pre` lulus pengecekan otomatis di langkah 5.7.
- Pengecekan HTML mentah setelah deploy (tanpa JS, sama seperti yang dilihat crawler AI):
  ```bash
  B=https://garudanexa.com
  curl -s $B/template/aura-studio | grep -o '<h1[^>]*>[^<]*'             # → "Aura Studio: Template Website Klinik Kecantikan & Salon"
  curl -s $B/template/aura-studio | sed 's/<[^>]*>/ /g' | grep -c '1.390.000'   # ≥ 1
  curl -s $B/ | sed 's/<[^>]*>/ /g' | wc -w                               # ≥ 600
  curl -s $B/ | grep -o 'href="/template/[a-z0-9-]*"' | sort -u | wc -l   # ≥ 5
  curl -s $B/ | grep -c 'Apa saja yang sudah termasuk'                    # teks FAQ ada di HTML
  ```
- Kode status:

  | URL | Hasil yang diharapkan |
  |---|---|
  | `/halaman-tidak-ada` | 404 |
  | `/template/tidak-ada` | 404 |
  | `/akun`, `/demo/aura-studio` | 200 dengan `noindex` di HTML |
  | `/template/aura-studio/` | 301 |
  | `/_pre/index.html`, `/app.html`, `/seo.php?slug=finova` | 404 |
  | `/llms.txt` | 200 `text/plain` |

  Perintah untuk mengecek: `curl -s -o /dev/null -w "%{http_code}" <url>`.
- Satu domain pembeli: HTML tidak mengandung `garudanexa.com/#organization` maupun canonical ke garudanexa.com, dan situsnya berfungsi normal.
- Konsol browser di `/`, `/template/aura-studio` dan `/pesan-custom` menunjukkan 0 hydration error, dan tidak ada kedipan spinner saat halaman dibuka.
- Tes user agent bot, setelah pemilik membuka akses (6.A–B) dan IP penguji di-whitelist:
  ```bash
  curl -s -A "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot" https://garudanexa.com/template/aura-studio | grep -o '<h1[^>]*>[^<]*'
  ```
  harus menampilkan H1. UA palsu dari IP yang tidak terverifikasi bisa saja tetap diblokir, dan itu memang disengaja. Bukti yang menentukan adalah Cloudflare Security Events yang menunjukkan OAI-SearchBot/PerplexityBot terverifikasi mendapat 200.
- Di Search Console, URL Inspection → "Lihat halaman yang di-crawl" → HTML berisi H1, harga dan FAQ.

### 5.3 WP3: Head manager, JSON-LD, OG image dan ikon
**Prioritas** P0 (title, meta, canonical, robots), P1 (JSON-LD, OG) · **Effort** M (3–4 hari) · **Fase** 1 · **Bergantung pada** WP1

**Tujuan:** setiap rute punya title, description, canonical, robots, OG dan JSON-LD sendiri, baik di HTML prerender maupun saat navigasi di klien (TECH-05, 07, 15; CONTENT-09, 11, 14; KW-05).

**File:** lihat bagian 4 (baris WP3).

**Langkah:**
1. **`src/seo/routes.ts`:**
   - Definisi statis untuk `/`, `/template/:slug`, `/pesan-custom`, 3 halaman legal, `/demo/:slug` (noindex,follow) dan 404.
   - Kumpulkan `*.seo.ts` dari halaman baru lewat glob.
   - Judul dan deskripsi template diambil dari `src/content/templates/{slug}.ts` (milik WP5) bila ada, dengan pola Lampiran A sebagai fallback.
   - Harga diformat dari DB: di bawah 1 juta → `Rp990 rb`; 1 juta ke atas → `Rp1,39 jt`.
2. **Aturan canonical:**
   - URL absolut ke `https://garudanexa.com`, tanpa trailing slash.
   - Query (`?layanan=`, `utm_*`) dibuang.
   - Hanya dipasang di halaman yang `index`.
3. **`head.ts`:**
   - `renderHeadTags()` (server) men-escape semua nilai.
   - `applyHead()` (klien) memperbarui atau membuat tag bertanda `data-gn` dan menghapus JSON-LD lama.
   - Tag per halaman: `og:type`, `og:url` (= canonical), `og:title`, `og:description`, `og:image` (1200×630), `og:image:alt`, `og:locale=id_ID`, `twitter:card=summary_large_image`.
   - Jika `preloadImage` ada, tambahkan `<link rel="preload" as="image" fetchpriority="high">`.
4. **`SeoManager.tsx`:** hanya aktif jika `isMainHost(location.hostname)`, supaya domain pembeli tetap diatur `siteHead.ts`. Komponen ini membaca `useLocation()` dan cache data, lalu memanggil `applyHead(getHead(...))`.
5. **Netralkan kode judul manual:**
   - `useDocumentTitle.ts` dijadikan no-op.
   - Rapikan `LegalPage.tsx`, `TemplateDemo.tsx` (tambahkan juga label kecil "Konten demo (fiktif)" di bilah demo) dan `NotFound.tsx` (noindex sekarang dari head).
   - Judul halaman akun/auth (`authForm.ts`, `payment.ts`) dibiarkan karena halaman itu noindex.
6. **`jsonld.ts`** menyediakan builder berikut, dengan `@id` saling merujuk dan data dari `COMPANY_FACTS`:

   | Builder | Isi |
   |---|---|
   | `organization()` | `@id` `https://garudanexa.com/#organization`, `name` Garuda Nexa, `legalName` PT Garuda Nexa Bahtera, `logo` PNG ≥112 px, `email`, `contactPoint` (sales, `areaServed` ID, `availableLanguage` id), `sameAs` hanya profil nyata, `address` hanya jika sudah ada |
   | `website()` | `name` "Garuda Nexa", `inLanguage` id-ID, tanpa SearchAction |
   | `product(t)` | `sku`=slug, `brand`, `category`, `image`, `offers` (Offer, `price`, `priceCurrency` IDR, `availability` InStock, `url`, `seller` → organization). `hasMerchantReturnPolicy` hanya jika sesuai kebijakan refund |
   | `service(kind)` | `provider` → organization, `areaServed` Country ID, tanpa harga |
   | lainnya | `breadcrumb()`, `itemList()`, `collectionPage()`, `article()`, `faqPage()` (opsional, harus sama persis dengan teks yang terlihat) |

   Tanpa `aggregateRating` atau `review`. Tanpa LocalBusiness sampai ada alamat nyata dan GBP.
7. **`index.html`** menjadi shell netral untuk domain pembeli:
   - Isinya: `lang="id"`, charset, viewport, ikon, manifest, theme-color, `<title>Memuat situs…</title>`.
   - Tanpa description, OG maupun JSON-LD Garuda Nexa. Head lengkap host utama hanya ada di `_pre/*.html`.
   - Ganti link Google Fonts dengan snippet preload font dari WP7.
8. **`scripts/seo/og-images.mjs` (sharp):**
   - Per template: ambil `public/assets/templates/{slug}-preview.webp`, crop ke 1200×630, tambahkan bilah merek berisi nama dan harga (overlay SVG), simpan ke `OUT/og/{slug}.jpg` (≤150 KB).
   - Buat juga kartu default, kategori, jasa dan panduan dari satu template bermerek.
9. **Ikon:**
   - `favicon.ico` (48), `apple-touch-icon.png` (180), `site.webmanifest` (ikon 192/512, `theme_color`).
   - `public/brand/logo-512.png` dari logo SVG yang sudah ada, untuk `Organization.logo`.

**Kriteria penerimaan:**
- Setiap rute yang `index` punya tepat 1 title, 1 description, 1 canonical absolut ke apex, `og:*` lengkap dan `twitter:card`. Tidak ada title ganda (dicek otomatis oleh WP2 dan WP9).
- [Rich Results Test](https://search.google.com/test/rich-results) untuk setiap `/template/{slug}`: Product snippet / Merchant listing valid (peringatan boleh) dan Breadcrumb valid. [validator.schema.org](https://validator.schema.org) di `/`: Organization dan WebSite dengan 0 error.
- [Sharing Debugger Facebook](https://developers.facebook.com/tools/debug/) dan pratinjau tautan WhatsApp menampilkan gambar, judul dan harga.
- Navigasi di klien `/` → `/template/aura-studio` → `/pesan-custom` ikut mengganti title, description dan canonical (cek di DevTools → Elements).
- Domain pembeli: title tetap dari `siteHead.ts`, tidak ada tag Garuda Nexa.

### 5.4 WP4: Sitemap, llms.txt dan IndexNow
**Prioritas** P0 (sitemap), P2 (llms.txt) · **Effort** S (1–1,5 hari) · **Fase** 1 · **Bergantung pada** WP1

**Tujuan:** semua URL produk dan halaman penting bisa ditemukan, dengan `lastmod` yang jujur (TECH-04, TECH-17, KW-02, CONTENT-10, CONTENT-16).

**File:** lihat bagian 4 (baris WP4).

**Langkah:**
1. **`buildSitemap(entries)`:**
   - `<loc>` dan `<lastmod>`. Untuk template, `lastmod` = `updated_at`. Untuk halaman statis, pakai tanggal perubahan konten (field `updated` di `*.seo.ts` atau frontmatter), **bukan** tanggal build. Google hanya memakai `lastmod` yang konsisten akurat.
   - Satu `<image:image>` per preview template.
   - Tanpa `changefreq`/`priority`.
   - Hanya URL 200, kanonis dan `index`.
2. Hapus `public/sitemap.xml`.
3. **`llms.txt` dan `llms-full.txt`:**
   - Dibangun dari `COMPANY_FACTS`, data template dan daftar rute (format di Lampiran C).
   - Serahkan ke WP2 snippet `.htaccess` berikut agar disajikan sebagai `text/plain; charset=utf-8`:
     ```apache
     AddType "text/plain; charset=utf-8" .txt
     ```
4. **IndexNow:**
   - Buat kunci 32 karakter hex, simpan di `public/{kunci}.txt` (isinya kunci itu sendiri).
   - `scripts/seo/indexnow.mjs` mengirim URL yang `lastmod`-nya berubah (dibandingkan dengan sitemap deploy sebelumnya yang disimpan di `DEPLOY_DIR`) ke `https://api.indexnow.org/indexnow` dalam format JSON: `host`, `key`, `keyLocation`, `urlList`.
   - Deploy di sini dua langkah (push, lalu Pull di cPanel), jadi skrip ini dijalankan **setelah** Pull di cPanel.
   - Jika pemilik mengaktifkan Cloudflare Crawler Hints, skrip ini opsional.
5. Opsi lanjutan: `backend/sitemap.php` (query `templates WHERE status='published'`) jika template sering terbit tanpa deploy.

**Kriteria penerimaan:**
- `curl -s https://garudanexa.com/sitemap.xml | grep -c '<loc>'` sama dengan jumlah rute `index`. Pada akhir Fase 2 targetnya ≥18 URL.
- Tidak ada `/demo`, `/pesan/`, `/akun`, `/masuk`, `/daftar` atau URL ber-query di sitemap.
- Setiap `<loc>` mengembalikan 200 (diperiksa skrip WP9).
- Search Console → Sitemaps: status "Berhasil", jumlah URL yang ditemukan sesuai.
- `curl -sI https://garudanexa.com/llms.txt` mengembalikan 200 `text/plain`. Isinya diawali `# Garuda Nexa` dan harganya sama dengan API.
- POST IndexNow mengembalikan 200/202, dan Bing Webmaster → IndexNow menampilkan URL yang diterima.

### 5.5 WP5: Katalog, kategori dan halaman template (jalur "beli template")
**Prioritas** P1 · **Effort** M–L (5–7 hari termasuk copy) · **Fase** naskah di Fase 1, kode di Fase 2 · **Bergantung pada** WP1, WP2 (untuk `Templates.tsx`) dan fungsi `jsonld.ts` dari WP3

**Tujuan:** menjadi halaman terbaik untuk kueri "template website {niche} siap pakai" dan "website company profile siap pakai" (KW-04, 05, 07; CONTENT-03, 04, 15, 17; TECH-12).

**File:** lihat bagian 4 (baris WP5).

**Langkah:**
1. **`/template` (katalog):**
   - H1 "Template website siap pakai" dan intro 80–120 kata (apa yang dibeli, siapa yang men-setup, berapa lama, bagaimana mengedit).
   - Chip kategori sebagai `<a href="/template/kategori/...">`.
   - **Semua** kartu dalam bentuk `<a href="/template/{slug}">`. Dengan 5 template, tampilkan semuanya. Jika nanti lebih dari 12, pakai paginasi tautan `?page=2`, bukan tombol "Tampilkan lebih banyak".
   - Kotak "Sudah termasuk" dan biaya tahun ke-2.
   - Perbandingan dengan website builder DIY tanpa menyebut nama pesaing.
   - FAQ 5 butir.
   - Tautan ke `/harga`, `/jasa-pembuatan-website` dan `/panduan/template-vs-jasa-website-custom`.
   - JSON-LD: CollectionPage, ItemList, BreadcrumbList.
2. **Kategori** (`src/content/categories.ts` memetakan nama kategori di DB ke slug, H1, intro dan FAQ):
   - Kartu template.
   - Bagian "Apa yang perlu ada di website {niche}" (≥300 kata unik, berbentuk checklist).
   - FAQ 3–5 butir.
   - Tautan ke artikel niche dan ke jasa custom.
   - Aturan index dari bagian 2 berlaku.
3. **`TemplateDetail.tsx`**, dengan isi dari `src/content/templates/{slug}.ts` dan fallback ke deskripsi DB untuk slug baru:
   - H1 "{Nama}: Template Website {Niche}".
   - Lead: untuk siapa, harga, apa saja yang termasuk.
   - Galeri desktop dan HP dengan alt deskriptif.
   - Kotak harga dengan "Harga per {tanggal}", baris jaminan refund dan "Pembayaran aman via Midtrans".
   - Bagian H2 berikut:
     - Cocok untuk
     - Halaman & bagian yang Anda dapatkan
     - Yang bisa Anda ubah sendiri lewat CMS
     - Sudah termasuk & biaya tahun berikutnya
     - Cara memesan & kapan website aktif
     - Contoh website {niche} dengan {Nama} (tautan "Lihat Demo")
     - Butuh fitur lain? (→ jasa custom)
     - Pertanyaan tentang {Nama} (4–6 FAQ)
   - Template lain, tautan kategori dan 1 panduan.
   - Total 600–900 kata unik.
   - Breadcrumb `<a>`: Beranda › Template › {Kategori} › {Nama}.
   - **Klaim harus jujur:**
     - Arena Club: booking lewat WhatsApp, tidak ada sistem booking.
     - Aura Studio: tanpa klaim medis.
     - Finova: tanpa klaim OJK atau regulator; "koperasi" hanya jika copy demo memang cocok.
4. **`Templates.tsx`** (beranda, setelah WP2): tombol "Lihat semua template" → `/template`; tab kategori diberi tautan nyata (atau baris tautan kategori di bawahnya).
5. **`Navbar.tsx`:** Template (`/template`) · Jasa ▾ (Website custom, Aplikasi mobile) · Harga · Panduan · [Konsultasi Gratis]. Anchor `#` hanya dipakai sebagai navigasi sekunder di beranda.
6. **`Footer.tsx`:**
   - Kolom: Kategori template / Jasa / Perusahaan (Tentang, Panduan, Kontak) / Legal.
   - Baris fakta dari `COMPANY_FACTS`: nama legal, alamat bila ada, WhatsApp, email.
   - Ikon sosial hanya untuk URL nyata; sembunyikan yang masih `#`.
   - Anchor tautan menggunakan nama merek atau nama halaman, bukan kata kunci yang dijejalkan.
7. **Gambar** (`TemplateShot.tsx`, `TemplateGallery.tsx`):
   - Alt deskriptif berbahasa Indonesia untuk gambar utama, misalnya "Tampilan beranda template website klinik kecantikan Aura Studio di desktop". Duplikat dekoratif tetap `alt=""`.
   - Gunakan WebP dan atribut `width`/`height`.

**Kriteria penerimaan:**
- HTML mentah `/template` memuat `<a href="/template/{slug}">` untuk setiap template terbit dan 4 tautan kategori.
- Setiap `/template/{slug}` punya ≥600 kata di `<main>` (dicek skrip WP9) dan menautkan kategori, `/harga`, `/jasa-pembuatan-website` dan 1 panduan.
- Tidak ada halaman yatim: setiap URL di sitemap bisa dicapai lewat tautan dari `/` (crawl dengan Screaming Frog versi gratis, ≤500 URL).
- Semua fakta (harga, yang termasuk, perpanjangan) sama dengan `COMPANY_FACTS` dan API.

### 5.6 WP6: Jalur jasa custom, halaman trust, beranda dan FAQ
**Prioritas** P1 · **Effort** M–L (5–7 hari termasuk copy) · **Fase** naskah di Fase 1, kode di Fase 2 · **Bergantung pada** WP1, WP3 (builder), input pemilik (6.F)

**Tujuan:** memegang kueri "jasa pembuatan website / aplikasi android & iOS", "harga template website", serta pertanyaan brand dan entitas. Sekaligus menghapus fakta yang saling bertentangan, karena AI akan mengutip apa pun yang tertulis (CONTENT-05, 06, 07, 13; KW-03, 06, 10; TECH-16).

**File:** lihat bagian 4 (baris WP6).

**Langkah:**
1. **`companyFacts.ts` menjadi satu-satunya sumber fakta** (Lampiran B), dipakai FAQ, footer, `/tentang`, `/kontak`, JSON-LD dan llms.txt. Field yang belum diisi pemilik tidak dirender.
2. **FAQ** (`src/content/faq.ts` dan `FAQ.tsx`):
   - Tambahkan ke `PLATFORM_FAQS` jawaban jelas untuk "Apa saja yang sudah termasuk?": "Untuk template: harga sudah termasuk template dan setup, domain, hosting, dan SSL tahun pertama. Mulai tahun ke-2 …".
   - Perbaiki `faq_data` di DB (tabel `hero_settings`). Butir "Apakah sudah termasuk hosting dan domain?" yang ditulis migration 2026-10-19_004 belum menyebut hosting, dan klaim "SSL gratis untuk setiap website" harus dibatasi untuk template. Perbaikan bisa lewat Admin → Pengaturan, atau migration baru dengan nomor bebas berikutnya setelah migration milik workflow template.
   - Ganti "beberapa hari kerja" dengan "X–Y hari kerja" dari pemilik.
   - Gaya jawaban: kalimat pertama langsung menjawab, 40–60 kata, berisi angka dan syarat, dan kalimatnya sama di setiap halaman.
3. **Data kontak:** bersihkan `contact_whatsapp=628123456789` (placeholder) dan field hero lama berbahasa Inggris di settings.
4. **Beranda** (`Home.tsx`, `HeroIntro.tsx`, `useTranslation.ts`):
   - Satu H1 statis: "Template website siap pakai, termasuk domain & hosting." Teks custom yang berputar menjadi `<p>`.
   - Intro 2 kalimat yang bisa di-crawl: "Garuda Nexa (PT Garuda Nexa Bahtera) menyediakan template website untuk company profile, klinik kecantikan, klub olahraga, dan fintech, mulai Rp990 ribu sudah termasuk domain, hosting, dan SSL tahun pertama. Butuh fitur khusus? Kami juga membuat website dan aplikasi Android/iOS custom."
   - Strip "Sudah termasuk", tile kategori, tabel template vs custom (Lampiran D), 3 panduan terbaru (setelah WP8).
   - H2 CTA: "Konsultasi gratis untuk website atau aplikasi Anda".
5. **`/jasa-pembuatan-website` dan `/jasa-pembuatan-aplikasi-mobile`:**
   - Hanya layanan yang benar-benar ditawarkan: company profile custom, sekolah/pesantren, instansi/desa, landing page, sistem/web app; untuk aplikasi: kasir/POS, absensi, i-School, i-Santri.
   - Proses: Konsultasi → Penawaran → Pengerjaan → Rilis.
   - Yang diterima klien (serah terima, akses, pelatihan CMS, masa garansi, domain atas nama klien; ditentukan pemilik).
   - Faktor biaya, atau "mulai dari" jika pemilik setuju.
   - Portofolio nyata dengan izin.
   - FAQ 5–7 butir.
   - CTA Pesan Custom dan WhatsApp.
   - JSON-LD Service lewat `*.seo.ts`.
   - Target ≥800 kata per halaman.
6. **`/harga`:**
   - "Harga berlaku per {tanggal}".
   - Tabel semua template dari data.
   - Yang sudah termasuk, biaya tahun ke-2 (angka atau rentang).
   - Penjelasan harga custom.
   - Dua tabel perbandingan: template vs custom vs aplikasi; dan DIY builder vs freelancer vs agensi vs template Garuda Nexa, tanpa nama pesaing.
   - Jaminan refund, metode bayar Midtrans, FAQ.
7. **`/tentang`** (blok fakta, cerita, tim dengan nama dan peran, produk sendiri, hubungan dengan garudanexa.id sesuai keputusan pemilik) dan **`/kontak`** (NAP, WhatsApp, email, jam layanan, waktu respons, peta jika alamatnya nyata).
8. **`/pesan-custom`** (`CustomOrder.tsx`): tambahkan intro 2–3 kalimat yang bisa di-crawl, tautan ke kedua halaman jasa, dan hapus effect `document.title` manual.

**Kriteria penerimaan:**
- HTML mentah `/`: H1 memuat "template website"; intro memuat "PT Garuda Nexa Bahtera" dan "Rp990"; ≥3 H2 memuat kata target.
- `curl -s "https://garudanexa.com/api.php?action=get_settings" | grep -c 628123456789` hasilnya 0.
- Jawaban FAQ soal hosting, SSL dan waktu aktif sama persis di beranda, `/harga`, halaman template dan llms.txt.
- Halaman jasa ≥800 kata dan JSON-LD Service valid.
- NAP di `/kontak`, footer dan GBP (jika dibuat) identik karakter per karakter.

### 5.7 WP7: Performa
**Prioritas** P1 · **Effort** M (3 hari) · **Fase** 1 · **Bergantung pada** WP1 (Auth lazy)

**Tujuan:** LCP mobile turun dari 4,5 detik ke ≤2,5 detik (target lab) dan JS entry halaman publik dari ~401 KiB ke ≤150 KiB (TECH-09, 10, 16 bagian SplitText).

**File:** lihat bagian 4 (baris WP7).

**Langkah:**
1. **Admin lazy:** di `src/pages/admin/routes.tsx`, semua 22 halaman (dan `AdminLayout`) diimpor lewat `React.lazy` dan dibungkus Suspense.
   - Cek dengan `rollup-plugin-visualizer` (konfigurasinya di `vite.config.ts`, hanya aktif dengan `ANALYZE=1`).
   - recharts, dnd-kit, pdfmake, docx dan react-markdown tidak boleh masuk entry publik. react-markdown hanya dimuat di chunk panduan.
2. **Konten di atas lipatan terlihat tanpa JS.** `SplitText.tsx` dan `Reveal.tsx` menyembunyikan konten sampai elemennya masuk viewport (`useInView`), sehingga H1 di HTML prerender tidak terlihat sampai hidrasi.
   - Ubah supaya markup awal **terlihat**; animasi hanya untuk elemen di bawah lipatan, atau dimulai setelah mount.
   - H1 hero tidak dianimasikan dari opacity 0.
   - Pastikan spasi antar span kata adalah node teks asli.
3. **Gambar LCP:** slide hero showcase pertama dan kedua `loading="eager"`, slide pertama `fetchpriority="high"` dan ada di markup statis, sisanya lazy. URL slide pertama dikirim ke WP3 sebagai `preloadImage`.
4. **Font:**
   - Self-host Inter dalam format woff2, subset latin, idealnya satu file variable, atau bobot 400/500/600/700 saja. Pakai `font-display: swap` dan preload satu file.
   - JetBrains Mono hanya dimuat di halaman yang memakainya.
   - Serahkan snippet `<link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/…">` ke WP3 untuk `index.html`.
5. **Animasi:** ticker dan canvas hero dijeda saat di luar layar (IntersectionObserver), menghormati `prefers-reduced-motion`, dan hanya menganimasikan transform/opacity.
6. **CLS:** beri skeleton dengan `min-height` untuk section yang datanya dari API, dan `width`/`height` untuk semua `<img>`.

**Kriteria penerimaan** (PageSpeed Insights mobile, lab, median dari 3 run):
- JS entry di halaman publik ≤150 KiB yang ditransfer.
- `grep -c "Order Masuk" <build>/assets/index-*.js` hasilnya 0.
- `/` dan `/template/{slug}`: LCP ≤2,5 s, CLS ≤0,1, TBT ≤200 ms, skor Performance ≥85. Skor lab bisa naik-turun; yang penting tren dan median.
- Desktop `/template/{slug}`: CLS ≤0,1.
- Setelah data CrUX tersedia (butuh trafik nyata), laporan Core Web Vitals di Search Console berstatus "Baik".

### 5.8 WP8: Panduan (blog) dan 4 artikel pertama
**Prioritas** P2 (dimulai di Fase 2) · **Effort** M (3 hari dev, ditambah penulisan ±1–2 hari per artikel) · **Bergantung pada** WP1, WP2 dan WP3

**Tujuan:** menjawab pertanyaan harga, biaya dan "cara memilih" yang mendominasi People Also Ask dan AI Overviews (KW-10, CONTENT-16).

**File:** lihat bagian 4 (baris WP8).

**Langkah:**
1. **Struktur artikel:**
   - `src/content/panduan/*.md` dengan frontmatter: `title`, `description`, `slug`, `author`, `datePublished`, `dateModified`, `sources[]`, `related[]`.
   - Dimuat dengan `import.meta.glob('…/*.md', { query: '?raw', eager: true })` dan dirender dengan `react-markdown` + `remark-gfm` (keduanya sudah ada di dependency).
   - File `.md` tidak disajikan dari web (aturan `.htaccess` sudah menolak `.md`); isinya ikut di-bundle lalu di-prerender.
2. **Halaman artikel:**
   - H1, intro yang langsung menjawab (2–3 kalimat), daftar isi, tabel/checklist, FAQ, CTA.
   - Kotak penulis: orang nyata, peran, LinkedIn.
   - "Diperbarui {tanggal}".
   - JSON-LD Article (author Person, `datePublished`, `dateModified` sama dengan tanggal yang terlihat) dan BreadcrumbList.
   - Tautan internal mengikuti Lampiran A.4.
3. **Empat artikel pertama:**

   | # | Judul | URL |
   |---|---|---|
   | 1 | Berapa Biaya Membuat Website Company Profile di 2026? | `/panduan/biaya-website-company-profile` |
   | 2 | Template vs Jasa Website Custom: Mana yang Tepat? | `/panduan/template-vs-jasa-website-custom` |
   | 3 | Biaya Pembuatan Aplikasi Android & iOS: Faktor Penentunya | `/panduan/biaya-aplikasi-android-ios` |
   | 4 | Website Klinik Kecantikan: Halaman Wajib & Contohnya | `/panduan/website-klinik-kecantikan` |

   Fase 3 (8 artikel berikutnya):
   - website klub olahraga & lapangan padel
   - domain, hosting & SSL untuk pemula
   - biaya perpanjangan tahun ke-2
   - checklist konten company profile
   - berapa lama membuat website
   - cara memilih jasa yang aman
   - website vs Instagram & Google Maps untuk UMKM
   - agar website bisnis muncul di Google & jawaban AI (tanpa janji ranking)
4. **Aturan penulisan:**
   - Angka Rp pihak ketiga disertai tautan sumber; harga custom Garuda Nexa mengikuti keputusan pemilik.
   - Sertakan informasi tangan pertama: screenshot CMS dan proses nyata.
   - Draf boleh dibantu AI, tetapi wajib disunting dan dicek faktanya oleh manusia (kebijakan Google soal scaled content abuse).
   - Perbarui setiap kuartal, dan ganti tahun di judul setiap tahun.

**Kriteria penerimaan:**
- Setiap artikel ≥1.200 kata, ≥1 tabel, ≥3 tautan sumber eksternal, dan punya kotak penulis.
- Rich Results Test untuk Article valid.
- Artikel masuk sitemap dengan `lastmod` yang benar dan ditautkan dari `/panduan`, beranda dan halaman template/jasa yang relevan.

### 5.9 WP9: Pengukuran dan pengaman otomatis
**Prioritas** P1 · **Effort** S (1–2 hari) · **Fase** 2 · **Bergantung pada** WP2 dan WP4

**File:** lihat bagian 4 (baris WP9) ditambah `backend/api.php` setelah WP0.

**Langkah:**
1. **`scripts/seo/seo-check.mjs`**, dijalankan setelah setiap Pull di cPanel; keluar dengan kode 1 jika ada yang gagal:
   - Baca `sitemap.xml` live. Untuk setiap URL: status 200, tepat 1 H1, canonical sama dengan URL, title unik ≤60 karakter, description ≤160 karakter, semua JSON-LD bisa di-parse, robots `index`, dan ≥600 kata di `<main>` untuk halaman template.
   - Tes negatif dari tabel di 5.2: 404, noindex, www 301, `/index.html` 301, trailing slash 301.
   - Bandingkan harga di JSON-LD setiap halaman template dengan `get_templates`.
2. **`track_visit`:** simpan host referrer, path landing dan `utm_source`. Tambahkan kolom lewat migration baru dengan nomor bebas berikutnya.
   - Kelompok referrer: chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, bing.com, google.\*.
   - ChatGPT menambahkan `utm_source=chatgpt.com`.
3. **Konversi** (keputusan pemilik): GA4 dengan event `klik_pesan_template`, `checkout_berhasil`, `kirim_pesan_custom` dan `klik_whatsapp`, atau Cloudflare Web Analytics (tanpa cookie, diaktifkan dari dashboard) ditambah hitungan internal.

**Kriteria penerimaan:**
- `node scripts/seo/seo-check.mjs` lulus di production.
- Query SQL kunjungan per referrer per bulan menghasilkan angka.

### 5.10 Ringkasan prioritas paket

| WP | Isi | Prioritas | Effort | Fase |
|---|---|---|---|---|
| WP0 | Hotfix robots, www, cache | P0 | S | 0 |
| WP1 | Scaffold dan kontrak | P0 | S | 0 |
| WP2 | Prerender, routing 404/noindex, seo.php | P0 | L | 1 |
| WP3 | Head per rute, JSON-LD, OG, ikon | P0/P1 | M | 1 |
| WP4 | Sitemap, llms.txt, IndexNow | P0/P2 | S | 1 |
| WP7 | Performa | P1 | M | 1 |
| WP5 | Katalog, kategori, halaman template | P1 | M–L | 2 |
| WP6 | Jasa, harga, tentang, kontak, beranda, FAQ | P1 | M–L | 2 |
| WP9 | Pengukuran dan seo-check | P1 | S | 2 |
| WP8 | Panduan dan artikel | P2 | M | 2–3 |

### 5.11 Backlog (Fase 3+, P2–P3)
- `/portofolio` dan `/portofolio/{slug}`, setelah ada studi kasus nyata (klien, sektor, kota, masalah, solusi, screenshot, testimoni dengan izin).
- `/jasa-pembuatan-website-sekolah-pesantren` (fitur PPDB) dan halaman klinik custom, hanya jika ada bukti.
- SEO untuk domain pembeli: `seo.php` berdasarkan `HTTP_HOST` dari `template_sites.content`, plus robots dan sitemap per domain (TECH-13). Ini memperkuat nilai jual "website siap online".
- Kredit opt-in "Dibuat oleh Garuda Nexa" di situs pembeli (anchor merek, `rel="nofollow"`), dikoordinasikan dengan tim template.
- Field SEO per template yang bisa diedit di admin (`seo_title`, `seo_description`, `long_content`, `faq`) di KelolaTemplate.
- Satu halaman kota untuk kota kantor nyata.
- Jangka panjang: pindah ke mode framework React Router v7 dengan `prerender`.

---

## 6. Checklist tindakan pemilik

### 6.A Cloudflare (hari 1)
- [ ] **Security → Settings → Bot traffic** (di beberapa akun bernama Security → Bots): ubah **"Block AI bots"** ke opsi tidak memblokir. Jika ingin mengatur per crawler, buka **AI Crawl Control** lalu setel **Allow** untuk:
  - Bot search/user: OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, Applebot, DuckAssistBot
  - Mesin pencari: Googlebot dan Bingbot
- [ ] Putuskan bot training (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended). Rekomendasi: izinkan. Kabari engineer WP0 agar robots.txt disamakan.
- [ ] Pastikan fitur robots.txt terkelola Cloudflare (yang menambahkan Disallow untuk bot AI) **mati**, atau isinya sama dengan keputusan di atas.
- [ ] Cek apakah Bot Fight Mode menantang bot terverifikasi. Jika ya, matikan, atau buat pengecualian untuk "Verified bots".
- [ ] **Security → Events:** filter User Agent yang mengandung `Googlebot`, `bingbot`, `OAI-SearchBot`, `PerplexityBot`, `Claude`, dan pastikan tidak ada aksi Block/Challenge untuk bot terverifikasi.
- [ ] **Rules → Redirect Rules:** `www.garudanexa.com/*` → `https://garudanexa.com/${1}` (301), supaya cukup satu lompatan.
- [ ] **Caching → Configuration → Crawler Hints: ON.** Fitur ini mengirim sinyal IndexNow otomatis.
- [ ] Opsional: aktifkan **Web Analytics** (tanpa cookie).

### 6.B Hosting / cPanel / WAF (hari 1–3)
- [ ] Di cPanel, buka **Imunify360** (jika ada): Incidents / Firewall → cari IP yang diblokir. Whitelist IP kantor dan IP mesin deploy (auditor ikut kena greylist saat pengujian).
- [ ] Buka **ModSecurity** dan **Raw Access / Errors**. Cari 403/444 untuk user agent crawler:
  ```bash
  grep -E 'Googlebot|bingbot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Claude' access_log | awk '$9==403'
  ```
- [ ] Minta support hosting untuk:
  1. Whitelist rentang IP crawler terverifikasi:
     - Google dan Bing: daftar resmi masing-masing
     - OpenAI: `https://openai.com/searchbot.json` dan `https://openai.com/chatgpt-user.json`
     - Perplexity: `https://www.perplexity.com/perplexitybot.json` dan `perplexity-user.json`
  2. Pastikan LiteSpeed/Imunify melihat **IP asli pengunjung** di belakang Cloudflare. Header `CF-Connecting-IP` hanya dipercaya jika datang dari rentang IP Cloudflare.

  Hipotesis yang perlu dicek: jika server hanya melihat IP Cloudflare, satu blokir WAF memblokir semua pengunjung lewat edge itu. Ini bisa menjelaskan 403 di seluruh situs pada 2026-10-22 19:47 UTC.
- [ ] Pasang **UptimeRobot** (gratis) untuk `/`, `/sitemap.xml` dan `/template/corporate-nexa`, dengan notifikasi ke WhatsApp/email.
- [ ] Jika `garudanexabahtera.web.id` diaktifkan lagi, buat 301 ke `https://garudanexa.com`.

### 6.C Google Search Console (hari 1; sitemap setelah WP4 live)
- [ ] search.google.com/search-console → **Tambahkan properti → Domain** → `garudanexa.com` → salin TXT `google-site-verification=…`.
- [ ] Cloudflare → DNS → **Add record**: TXT, nama `@`, isi kode tadi → Save. Kembali ke Search Console → **Verifikasi** (propagasi beberapa menit sampai beberapa jam).
- [ ] Setelah WP0 live: URL Inspection → **Uji URL aktif** untuk `/` dan `/template/corporate-nexa` → cek screenshot dan "Resource halaman".
- [ ] Setelah WP2–WP4 live:
  - [ ] **Sitemap** → kirim `https://garudanexa.com/sitemap.xml`.
  - [ ] **Minta pengindeksan** untuk `/`, `/template` dan tiap `/template/{slug}`, satu per satu (ada kuota harian).
- [ ] **Penghapusan → Penghapusan sementara** untuk `https://garudanexa.com/akun`. Noindex permanen sudah ditangani WP2.
- [ ] Mingguan di bulan pertama: **Pengindeksan halaman** (soft 404, duplikat, "Di-crawl - saat ini tidak diindeks") dan **Setelan → Statistik crawling** (403/5xx).

### 6.D Bing Webmaster Tools (hari 1–2)
- [ ] bing.com/webmasters → masuk → **Import from Google Search Console** → pilih garudanexa.com.
- [ ] **Sitemaps:** pastikan sitemap terkirim. **IndexNow:** aktif lewat Crawler Hints atau skrip WP4.
- [ ] **URL Inspection / URL Submission:** kirim `/`, `/template` dan semua `/template/{slug}`.
- [ ] **Configuration → Block URLs:** `https://garudanexa.com/cgi-bin/` dan `https://garudanexa.com/auth?type=login`.
- [ ] Bulanan: buka laporan **AI Performance** (kutipan di Copilot / AI Bing).

### 6.E Google Business Profile, hanya jika memenuhi syarat (minggu 2–4)
Syarat: ada lokasi nyata yang ber-staf. Virtual office tidak memenuhi syarat ([pedoman GBP](https://support.google.com/business/answer/3038177?hl=id)).
- [ ] business.google.com → **Tambahkan bisnis**. Nama persis seperti di dunia nyata ("Garuda Nexa" / "PT Garuda Nexa Bahtera"), **tanpa** kata kunci tambahan karena berisiko suspend.
- [ ] Kategori utama "Perancang situs web", kategori tambahan "Perusahaan perangkat lunak".
- [ ] Jika pelanggan tidak datang ke kantor: pilih bisnis area layanan dan sembunyikan alamat. Area layanan dibatasi wilayah sekitar kantor (menurut pedoman, kira-kira 2 jam berkendara).
- [ ] Verifikasi (biasanya video).
- [ ] Isi layanan dengan harga (daftar template, website custom, aplikasi Android/iOS), jam buka, WhatsApp, tautan situs dan foto nyata (kantor, tim, screenshot proyek).
- [ ] Impor ke **Bing Places for Business**.
- [ ] Nama, alamat dan nomor (NAP) **identik** dengan footer, `/kontak`, `/tentang` dan semua direktori.

### 6.F Keputusan dan data bisnis (paling lambat akhir minggu 2, dibutuhkan WP5, WP6 dan WP8)
- [ ] Alamat kantor (jalan, kota, kode pos) atau keputusan untuk tidak menampilkan alamat.
- [ ] NIB dan pendaftaran PSE (jika ada).
- [ ] **Harga perpanjangan tahun ke-2** (domain + hosting), berupa angka atau rentang.
- [ ] **Waktu aktif template:** "X–Y hari kerja" setelah bayar.
- [ ] Jasa custom: tampilkan "mulai dari Rp…" untuk website dan aplikasi? (Ya/Tidak; mengubah aturan di `design.md`.)
- [ ] Hubungan dengan garudanexa.id / @garudanexa (edukasi, Bandung): satu grup atau tidak terkait? Ini menentukan penamaan dan `sameAs`.
- [ ] URL media sosial yang aktif (Instagram @garudanexabahtera, LinkedIn, TikTok, YouTube); yang belum ada dibuat dulu.
- [ ] Nama, peran dan bio tim untuk `/tentang` dan penulis artikel.
- [ ] Portofolio nyata dengan izin klien (i-School, i-Santri, POS, Absensi, situs klien) dan testimoni (nama, usaha, kota, persetujuan).
- [ ] Konfirmasi nomor WhatsApp resmi (`+62 851-8800-9152`) dan email.
- [ ] Izin memakai logo Midtrans.
- [ ] Konfirmasi klaim fitur per template (Arena Club tanpa sistem booking, Aura Studio tanpa klaim medis, Finova tanpa klaim regulator).

### 6.G Marketplace, direktori dan profil (minggu 2–8)
- [ ] Profil penjual **Fastwork.id** dan **Sribu**: gig "setup template website + domain + hosting", "website company profile custom", "aplikasi Android". Cantumkan nama merek dan tautan ke situs jika platform mengizinkan.
- [ ] **PaDi UMKM** (vendor), **Projects.co.id**, dan listing jasa di **Shopee/Tokopedia** (cek kebijakan kategori jasa digital).
- [ ] Direktori: **Clutch** (clutch.co/id/web-developers), **GoodFirms**, **Sortlist**, **DesignRush**, **Crunchbase**, **Indotrading / Indonetwork**, dan halaman perusahaan **LinkedIn**.
- [ ] Setiap template diunggah ke **Dribbble, Behance dan Pinterest** dengan tautan balik ke `/template/{slug}`. Situs-situs ini ikut ranking untuk "template website {niche}".
- [ ] **YouTube/TikTok:** walkthrough 2–3 menit per template ("Contoh website klinik kecantikan, Aura Studio").
- [ ] Bio Instagram: "Template Website Siap Pakai & Jasa Website/Aplikasi" + tautan.

### 6.H Ulasan (berkelanjutan)
- [ ] Setelah setiap situs atau proyek aktif, kirim tautan ulasan Google (dari GBP) dan minta ulasan di Fastwork/Clutch.
- [ ] Hanya ulasan asli. Jangan membayar, memberi insentif, atau menyaring siapa yang diminta mengulas. Balas semua ulasan.

### 6.I PR dan backlink (bulan 2–6)
- [ ] Outreach ke artikel "rekomendasi jasa pembuatan website / template website" Indonesia (akubi.co.id, thrive.co.id, productnation.co, blog hosting). Penempatan berbayar wajib diberi label dan `rel="sponsored"`.
- [ ] Riset data "Survei Harga Jasa Website & Aplikasi di Indonesia 2026", disusun dari halaman harga publik, lalu ditawarkan ke media teknologi dan UMKM.
- [ ] Kemitraan: jaringan sekolah/pesantren (i-School/i-Santri), komunitas padel/futsal/gym, asosiasi klinik kecantikan, program digitalisasi Dinas Koperasi & UKM, direktori partner Midtrans dan hosting.
- [ ] Jangan membeli tautan dan jangan memasang tautan footer berisi kata kunci di banyak situs (link spam).

---

## 7. KPI dan rencana pengukuran

### 7.1 Baseline (2026-10-23) dan target (indikatif, tanpa jaminan)

| KPI | Baseline | Bulan 1 | Bulan 3 | Bulan 6 |
|---|---|---|---|---|
| Kata di HTML mentah `/` (yang dibaca crawler AI) | 0 | ≥600 | ≥600 | ≥600 |
| URL `index` di sitemap | 5 (0 template) | ≥10 | ≥18 | ≥30 (termasuk 12 panduan) |
| Halaman "Diindeks" di Search Console | belum diukur | semua template + halaman inti | ≥90% sitemap | ≥90% sitemap |
| URL di indeks Bing | 2 URL sampah | beranda + semua template | ≥80% sitemap | ≥90% sitemap |
| Posisi "garuda nexa bahtera" | belum ada | 1 | 1 | 1 |
| Posisi "garuda nexa" (dibagi dengan garudanexa.id) | di bawah garudanexa.id | 10 besar | 3 besar | 1–2 |
| Kueri non-brand dengan ≥50 impresi/bulan | 0 | ada data | ≥20 | ≥80 |
| Dari 15 target utama (KW §2) yang masuk 10 besar | 0 | 0–1 | ≥3 (niche template) | ≥8 |
| CTR rata-rata halaman di posisi ≤10 | n/a | n/a | ≥3% | ≥4% |
| Pesanan template dan form custom dari organik/AI | belum dilacak | mulai dilacak (WP9) | tren naik | tren naik |
| Panel AI: prompt brand dijawab benar dan mengutip garudanexa.com | 0/5 mesin | ≥1/5 | ≥3/5 | ≥4/5 |
| Panel AI: prompt niche/harga yang mengutip garudanexa.com (dari 9 prompt × 5 mesin) | 0 | 0–2 | ≥5 | ≥12 |
| Kutipan di Bing AI Performance | 0 | 0 | >0 | tren naik |
| LCP mobile (PSI, lab) | 4,5 s | ≤2,5 s | ≤2,5 s | CrUX "Baik" |
| JS entry halaman publik (transfer) | ~401 KiB | ≤150 KiB | ≤150 KiB | ≤150 KiB |

Target impresi dan peringkat adalah perkiraan karena belum ada data volume. Revisi setelah 4 minggu data Search Console dan pengecekan Keyword Planner.

### 7.2 Search Console: filter siap pakai
Buka Performa → Hasil penelusuran → Kueri → **Regex khusus**:

| Kelompok | Regex |
|---|---|
| Brand | `(?i)garuda ?nexa\|garudanexa\|nexa bahtera` |
| Template | `(?i)template\|siap pakai\|website jadi\|beli website` |
| Niche | `(?i)klinik\|kecantikan\|salon\|spa\|barber\|padel\|futsal\|olahraga\|gym\|fintech\|koperasi\|umkm\|company profile\|compro` |
| Jasa | `(?i)jasa\|pembuatan\|bikin\|buat (web\|aplikasi)` |
| Aplikasi | `(?i)aplikasi\|android\|ios\|apk` |
| Harga | `(?i)harga\|biaya\|tarif\|berapa\|murah` |

Filter halaman: `/template`, `/jasa-`, `/harga`, `/panduan/`.

Catatan: lalu lintas dari AI Overviews dan AI Mode dihitung di tipe penelusuran "Web" dan tidak dipisahkan.

**Aturan tindakan bulanan:**
- Posisi ≤10 tetapi CTR <2% → tulis ulang title/meta (tambahkan harga atau manfaat).
- Posisi 11–20 → perdalam konten, tambah FAQ, perkuat tautan internal ke halaman tersebut.
- Status "Di-crawl - saat ini tidak diindeks" → tingkatkan keunikan konten atau gabungkan dengan halaman lain.
- Kueri baru dengan impresi tinggi tanpa halaman yang cocok → kandidat artikel panduan berikutnya.
- 403/5xx di Statistik crawling → eskalasi ke hosting (6.B).

### 7.3 Panel kutipan AI bulanan (minggu pertama setiap bulan)
**Mesin:** ChatGPT (search aktif), Perplexity, Gemini, Google (AI Overview / AI Mode) dan Copilot. Opsional: Claude dengan web search.

**Cara:** jendela incognito, logout jika memungkinkan, bahasa Indonesia, lokasi Indonesia. Simpan screenshot jawaban.

**Prompt:**
1. "Apa itu Garuda Nexa / PT Garuda Nexa Bahtera?"
2. "Rekomendasi template website company profile siap pakai yang sudah termasuk domain dan hosting"
3. "Di mana beli website klinik kecantikan yang bisa diedit sendiri?"
4. "Website untuk klub padel/futsal yang murah dan cepat jadi"
5. "Berapa harga pembuatan website company profile 2026?"
6. "Template website UMKM murah Indonesia"
7. "Beli website jadi bayar online pakai Midtrans"
8. "Bedanya beli template website dan jasa website custom"
9. "Jasa pembuatan aplikasi android dan iOS untuk UMKM yang terpercaya"
10. "Jasa pembuatan website pesantren dengan PPDB online"

**Kolom log** (spreadsheet): tanggal · mesin · prompt · Garuda Nexa disebut (Y/T) · garudanexa.com dikutip sebagai sumber (Y/T) · URL yang dikutip · fakta akurat (harga dan isi paket benar? Y/T) · pesaing yang disebut · catatan.

**Sumber tambahan:**
- Laporan AI Performance di Bing Webmaster.
- Referrer AI dari WP9 (chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com).
- Jika ada fakta yang salah (misalnya Garuda Nexa tertukar dengan garudanexa.id), perbaiki sumbernya: `/tentang`, JSON-LD `legalName`/`sameAs`, dan profil di direktori.

### 7.4 Ritme laporan
- **Bulan 1, mingguan:** cakupan indeks, statistik crawling, error dari seo-check, Security Events Cloudflare.
- **Setelah bulan 1, bulanan (1 halaman):** KPI 7.1, 10 kueri teratas per kelompok, hasil panel AI, konversi, dan 3 tindakan untuk bulan berikutnya.

---

## 8. Risiko utama dan mitigasi

| Risiko | Mitigasi |
|---|---|
| WAF atau Cloudflare tetap memblokir crawler asli | 6.A–B di hari 1. Verifikasi lewat Security Events, Statistik crawling dan URL Inspection, bukan dengan UA palsu |
| Harga di HTML atau JSON-LD basi setelah admin mengubah harga | Aturan deploy ulang (5.2 langkah 9); seo-check membandingkan dengan API; `seo.php` untuk template baru |
| Hydration mismatch atau kedipan konten | `hydrateRoot` + data preload; kriteria 0 hydration error; konten di atas lipatan terlihat tanpa JS (WP7) |
| Prerender gagal saat deploy | Deploy dibatalkan (bukan dipublikasikan kosong). Mesin deploy di-whitelist di WAF |
| Domain pembeli kena canonical atau JSON-LD Garuda Nexa | Semua aturan dibatasi `HTTP_HOST`; `index.html` netral; tes domain pembeli di setiap rilis |
| Brand tertukar dengan garudanexa.id | Keputusan 6.F, `/tentang`, `legalName` "PT Garuda Nexa Bahtera" di semua tempat, NAP konsisten |
| Konten tipis atau dianggap doorway | Tanpa halaman kota massal; kategori diindeks hanya jika memenuhi syarat; artikel disunting manusia dan memuat informasi tangan pertama |
| Input pemilik terlambat (alamat, perpanjangan, waktu aktif) | Field `null` tidak dirender; WP6 bisa rilis bertahap. Tapi FAQ hosting/SSL wajib diperbaiki di Fase 1 |

---

## Lampiran A: Copy title dan meta per rute

Panjang karakter sudah dihitung. Harga dibuat dari DB saat build, tidak di-hardcode.

| Rute | Title (karakter) | Meta description (karakter) | H1 |
|---|---|---|---|
| `/` | Template Website Siap Pakai & Jasa Website \| Garuda Nexa (56) | Beli template website siap pakai, sudah termasuk domain, hosting & SSL tahun pertama. Juga jasa pembuatan website & aplikasi Android/iOS custom. (144) | Template website siap pakai, termasuk domain & hosting. |
| `/template` | Template Website Siap Pakai + Domain & Hosting \| Garuda Nexa (60) | Katalog template website siap pakai untuk company profile, klinik, klub olahraga & fintech. Harga jelas, lihat demo, bayar online, kelola lewat CMS. (148) | Template website siap pakai |
| `/template/kategori/company-profile` | Template Website Company Profile Siap Pakai \| Garuda Nexa (57) | Template website company profile untuk perusahaan, UMKM & startup. Mulai Rp990 rb, termasuk domain, hosting & SSL tahun pertama. Lihat demonya. | Template website company profile |
| `/template/kategori/kecantikan-klinik` | Template Website Klinik Kecantikan & Salon \| Garuda Nexa (56) | Contoh website klinik kecantikan, salon, spa & barbershop yang siap dipakai: daftar perawatan, harga, galeri, reservasi WhatsApp. Lihat demonya. | Template website klinik kecantikan & salon |
| `/template/kategori/olahraga-komunitas` | Template Website Klub Olahraga, Padel & Futsal \| Garuda Nexa (60) | Website klub olahraga siap pakai untuk padel, tenis, futsal, badminton & gym: paket membership, pelatih, jadwal, pesan lapangan via WhatsApp. | Template website klub olahraga |
| `/template/kategori/fintech-startup` | Template Website Fintech & Startup \| Garuda Nexa (48) | Template landing page untuk fintech, aplikasi pembayaran & SaaS. Tampilan modern, FAQ, testimoni, tautan unduh aplikasi. Lihat demonya. | Template website fintech & startup |
| `/template/corporate-nexa` | Corporate Nexa: Template Company Profile – Rp1,5 jt | Template company profile perusahaan… Rp1.500.000 sudah termasuk domain, hosting & SSL tahun pertama… | Corporate Nexa: Template Website Company Profile Perusahaan |
| `/template/startup-clean` | Startup Clean: Template Website UMKM & Startup – Rp990 rb (57) | (pola sama) | Startup Clean: Template Website UMKM & Startup |
| `/template/arena-club` | Arena Club: Template Website Klub Olahraga – Rp1,29 jt (54) | (pola sama; sebut "pesan lapangan via WhatsApp") | Arena Club: Template Website Klub Olahraga, Padel & Futsal |
| `/template/aura-studio` | Aura Studio: Template Website Klinik & Salon – Rp1,39 jt (56) | Template website klinik kecantikan, salon & spa. Rp1.390.000 sudah termasuk domain, hosting & SSL tahun pertama. Kelola isi lewat CMS. Lihat demo. (146) | Aura Studio: Template Website Klinik Kecantikan & Salon |
| `/template/finova` | Finova: Template Website Fintech & Startup – Rp1,79 jt (54) | (pola sama; tanpa klaim regulator) | Finova: Template Website Fintech & Startup |
| `/jasa-pembuatan-website` | Jasa Pembuatan Website Company Profile \| Garuda Nexa (52) | Jasa pembuatan website custom untuk perusahaan, sekolah, instansi & UMKM. Konsultasi gratis, penawaran jelas sebelum mulai, didampingi sampai rilis. (148) | Jasa pembuatan website custom untuk bisnis & instansi |
| `/jasa-pembuatan-aplikasi-mobile` | Jasa Pembuatan Aplikasi Android & iOS \| Garuda Nexa (51) | Jasa pembuatan aplikasi mobile Android & iOS sesuai alur bisnis Anda: kasir, absensi, manajemen sekolah & lainnya. Konsultasi gratis via WhatsApp. (146) | Jasa pembuatan aplikasi Android & iOS custom |
| `/harga` | Harga Template Website & Jasa Website 2026 \| Garuda Nexa (56) | Harga template website Garuda Nexa mulai Rp990 rb termasuk domain, hosting & SSL tahun pertama. Bandingkan dengan website custom & biaya per tahun. (147) | Harga template website & jasa pembuatan website |
| `/tentang` | Tentang PT Garuda Nexa Bahtera \| Garuda Nexa (44) | PT Garuda Nexa Bahtera: template website siap pakai serta jasa pembuatan website & aplikasi mobile custom di Indonesia. Kenali tim dan cara kerja kami. | Tentang Garuda Nexa |
| `/kontak` | Kontak Garuda Nexa: WhatsApp, Email & Alamat (44) | Hubungi Garuda Nexa lewat WhatsApp 0851-8800-9152 atau info@garudanexa.com untuk tanya template, konsultasi website & aplikasi custom gratis. | Hubungi Garuda Nexa |
| `/panduan` | Panduan Membuat Website untuk Bisnis \| Garuda Nexa (50) | Panduan praktis membuat website bisnis: biaya, domain & hosting, template vs custom, checklist konten, dan tips agar website ditemukan di Google. | Panduan website untuk bisnis |
| `/pesan-custom` | Pesan Website / Aplikasi Mobile Custom \| Garuda Nexa (52) | Ceritakan kebutuhan website atau aplikasi Android/iOS Anda. Konsultasi gratis, lalu kami kirim penawaran harga dan jadwal sesuai cakupan proyek. (144) | Pesan Website / Aplikasi Mobile Custom |
| Legal (3) | {Judul} \| Garuda Nexa | ringkasan 1 kalimat | {Judul} |
| `/demo/{slug}` | Demo {Nama} \| Garuda Nexa | (noindex,follow) | – |

**A.1 Pola meta untuk halaman template:** "{Manfaat/niche}. Rp{harga lengkap} sudah termasuk domain, hosting & SSL tahun pertama. Kelola isi lewat CMS. Lihat demo." (≤155 karakter).

**A.2 Title halaman template** tidak memakai akhiran "| Garuda Nexa" karena Google sudah menampilkan nama situs dari JSON-LD WebSite.

**A.3 Kanibalisasi:** setiap kata kunci hanya punya satu halaman pemilik.

| Kata kunci | Halaman pemilik |
|---|---|
| Brand + "template website siap pakai & jasa website" | Beranda |
| "beli template website" | `/template` |
| "harga template website" | `/harga` |
| "harga pembuatan website company profile" | Panduan #1 |

**A.4 Tautan internal:**
- Template → kategori, `/harga`, 1 panduan, `/jasa-pembuatan-website`.
- Kategori → template-nya dan panduan niche.
- Panduan → kategori/template, `/harga` dan jasa. Pakai anchor kontekstual seperti "template website klinik kecantikan", bukan "klik di sini".
- Jasa → `/pesan-custom` dan `/harga`.
- Footer → semua halaman hub.

## Lampiran B: Fakta perusahaan (`src/lib/companyFacts.ts`, satu sumber)

| Fakta | Isi |
|---|---|
| Nama | Garuda Nexa; badan hukum PT Garuda Nexa Bahtera |
| Situs | https://garudanexa.com |
| Alamat | [PEMILIK: jalan, kota, kode pos], identik dengan GBP |
| NIB / PSE | [PEMILIK, jika ada] |
| Kontak | WhatsApp/telepon +62 851-8800-9152 (dikonfirmasi pemilik), info@garudanexa.com, jam layanan [PEMILIK] |
| Layanan | (1) template website siap pakai: pilih, lihat demo, pesan & bayar online via Midtrans, kelola isi lewat CMS; (2) jasa pembuatan website custom; (3) jasa pembuatan aplikasi mobile Android & iOS custom |
| Harga template | Rp990.000–Rp1.790.000 per {tanggal build}; sudah termasuk template + setup awal, domain, hosting dan SSL tahun pertama |
| Tahun ke-2 | Perpanjangan domain & hosting per tahun: [PEMILIK, angka atau rentang] |
| Custom | Biaya lewat penawaran setelah konsultasi gratis, atau "mulai dari" jika pemilik setuju |
| Waktu aktif template | [PEMILIK: X–Y hari kerja] setelah pembayaran dikonfirmasi dan domain diproses |
| Jaminan | Pesanan lunas yang ditolak (misalnya domain tidak tersedia) → dana kembali penuh paling lambat 7 hari kerja |
| Kepemilikan | Konten dan data milik pembeli |
| Area | Seluruh Indonesia (online) |
| Produk sendiri | i-School, i-Santri, POS, Absensi Digital, Undangan Digital [konfirmasi pemilik] |

## Lampiran C: Isi `llms.txt` (dibuat saat build, `text/plain`)

```
# Garuda Nexa
> Garuda Nexa (PT Garuda Nexa Bahtera, Indonesia) menjual template website siap pakai yang sudah termasuk domain, hosting, dan SSL tahun pertama, serta menerima jasa pembuatan website dan aplikasi mobile Android/iOS custom.

- Harga template: Rp990.000–Rp1.790.000 (per {tanggal}); tahun ke-2: {…}
- Bayar online via Midtrans; isi website dikelola sendiri lewat CMS
- Jaminan: pesanan lunas yang ditolak → dana kembali penuh ≤ 7 hari kerja
- Kontak: WhatsApp +62 851-8800-9152, info@garudanexa.com

## Template website
- [Katalog template](https://garudanexa.com/template): semua template, harga, kategori
- [Corporate Nexa](https://garudanexa.com/template/corporate-nexa): company profile perusahaan, Rp1.500.000
- [Startup Clean](https://garudanexa.com/template/startup-clean): company profile UMKM/startup, Rp990.000
- [Arena Club](https://garudanexa.com/template/arena-club): klub olahraga/padel/futsal, Rp1.290.000
- [Aura Studio](https://garudanexa.com/template/aura-studio): klinik kecantikan/salon/spa, Rp1.390.000
- [Finova](https://garudanexa.com/template/finova): fintech/startup, Rp1.790.000
## Jasa custom
- [Jasa pembuatan website](https://garudanexa.com/jasa-pembuatan-website)
- [Jasa pembuatan aplikasi mobile](https://garudanexa.com/jasa-pembuatan-aplikasi-mobile)
- [Pesan custom](https://garudanexa.com/pesan-custom): formulir kebutuhan, konsultasi gratis
## Harga & kebijakan
- [Harga](https://garudanexa.com/harga) · [Syarat & Ketentuan](https://garudanexa.com/syarat-ketentuan) · [Kebijakan Pengembalian Dana](https://garudanexa.com/kebijakan-pengembalian-dana) · [Kebijakan Privasi](https://garudanexa.com/kebijakan-privasi)
## Panduan
- (daftar artikel + ringkasan 1 baris)
## Optional
- [Tentang](https://garudanexa.com/tentang) · [Kontak](https://garudanexa.com/kontak)
```

Harga dan daftar template dibuat dari API saat build; tidak ada yang di-hardcode.

`llms-full.txt` berisi, berurutan:
1. blok fakta
2. per template: nama, niche, harga, yang termasuk, deskripsi, fitur, bagian yang bisa diedit lewat CMS, URL demo
3. ringkasan halaman jasa
4. FAQ gabungan
5. ringkasan kebijakan
6. ringkasan panduan

Setiap blok diberi "Diperbarui {tanggal}".

## Lampiran D: Tabel perbandingan (versi pendek di beranda, lengkap di `/harga`)

| | Template siap pakai | Website custom | Aplikasi mobile custom |
|---|---|---|---|
| Harga | Tertera, Rp990 rb–Rp1,79 jt (per {tanggal}) | Lewat penawaran | Lewat penawaran |
| Sudah termasuk | Setup, domain, hosting, SSL tahun pertama | Dibahas saat konsultasi | Dibahas saat konsultasi |
| Waktu online | {X–Y} hari kerja | Sesuai jadwal di penawaran | Sesuai jadwal di penawaran |
| Desain | Pilih dari katalog; ubah teks, foto dan warna di CMS | Dirancang dari nol | Dirancang dari nol |
| Cocok untuk | UMKM, klinik, klub, startup yang ingin cepat online | Alur atau fitur khusus, instansi | Android & iOS: kasir, absensi, dll. |
| Mulai | Pesan Template | Pesan Custom | Pesan Custom |

## Lampiran E: Sumber

- Google, JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google, dynamic rendering adalah solusi sementara: https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
- Google, robots.txt (jangan blokir resource penting): https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Google, membuat sitemap (`lastmod` harus akurat): https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google, fitur AI dan situs Anda (tidak ada syarat khusus; harus terindeks dan bisa tampil dengan snippet): https://developers.google.com/search/docs/appearance/ai-features
- Google, kebijakan spam (doorway pages, scaled content, link spam): https://developers.google.com/search/docs/essentials/spam-policies
- Google, perubahan rich result FAQ: https://developers.google.com/search/blog/2023/08/howto-faq-changes · https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/
- Google Business Profile, syarat kelayakan: https://support.google.com/business/answer/3038177?hl=id
- Core Web Vitals (ambang LCP 2,5 s, INP 200 ms, CLS 0,1): https://web.dev/articles/vitals
- OpenAI crawlers (OAI-SearchBot, ChatGPT-User, GPTBot): https://developers.openai.com/api/docs/bots
- Perplexity crawlers: https://docs.perplexity.ai/guides/bots
- Crawler Claude: https://support.claude.com/en/articles/8896518
- Studi crawler AI yang tidak menjalankan JS (Vercel): https://vercel.com/blog/the-rise-of-the-ai-crawler
- Cloudflare, Block AI bots: https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/ · default blokir untuk domain baru: https://www.technologyreview.com/2025/07/01/1119498/cloudflare-will-now-by-default-block-ai-bots-from-crawling-its-clients-websites/
- IndexNow: https://www.indexnow.org/faq · https://www.bing.com/indexnow/getstarted
- Laporan AI Performance di Bing Webmaster: https://searchengineland.com/bing-webmaster-tools-testing-new-ai-performance-report-468039
- GEO (statistik dan kutipan menaikkan visibilitas di jawaban AI): https://arxiv.org/abs/2311.09735
- Ahrefs, sebutan brand berkorelasi dengan visibilitas di AI Overview: https://ahrefs.com/blog/ai-overview-brand-correlation/
- React 19 prerender: https://react.dev/reference/react-dom/static/prerender · Vite SSR: https://vite.dev/guide/ssr · React Router pre-rendering: https://reactrouter.com/how-to/pre-rendering
- llms.txt: https://llmstxt.org/
- Contoh halaman pesaing: https://resolusiweb.com/jasa-pembuatan-website-klinik-kecantikan/ · Clutch Indonesia: https://clutch.co/id/web-developers
- PageSpeed (baseline): https://pagespeed.web.dev/analysis/https-garudanexa-com/r1gtf7lspy · https://pagespeed.web.dev/analysis/https-garudanexa-com-template-corporate-nexa/4ddspieli3
- Pengamatan SERP: google.co.id dan bing.com (cc=id), serta autocomplete Google hl=id/gl=id, 2026-10-23 (dari audit KW dan konten).
