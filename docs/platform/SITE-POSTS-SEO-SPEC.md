# Berita & pengumuman template sekolah + SEO situs pembeli

Permintaan pemilik (2026-10-26):
- Template sekolah bisa mengunggah **berita dan pengumuman**: foto, judul, isi, CRUD.
- Pembeli bisa melihat **berapa kali tiap tulisan dilihat**.
- Ada **SEO opsional per tulisan**: kalau diisi, tulisan berpeluang muncul di Google.
- **Semua template yang dipesan dan sudah online** punya fitur SEO di admin klien (`/akun`) per situs, supaya situsnya bisa muncul di Google.

Foto unggahan disimpan sebagai **WebP/JPEG teroptimasi**, bukan SVG. Skill design-system pemilik melarang foto diubah ke SVG, karena hasilnya file berukuran megabyte yang tampak seperti lukisan. SVG hanya untuk logo dan ikon.

## 1. Ringkasan teknis

| Bagian | Isi |
|---|---|
| Data | Tabel baru `site_posts`, `site_post_views`, `site_seo` (migrasi `2026-10-26_029_site_posts_seo.sql`). Tidak ada ALTER, jadi aman diimpor lewat phpMyAdmin. |
| API | Modul baru `backend/modules/site_posts.php` dan `site_posts.js` (setara). 5 aksi pelanggan + 4 aksi publik (§4). |
| Render server | `backend/site.php` (disalin ke akar `public_html`). Setiap HTML di domain pembeli lewat PHP: head SEO, `robots.txt`, `sitemap.xml`, 404/301, dan data preload. |
| Situs (klien) | Rute `/`, `/berita`, `/berita/{slug}`, `/pengumuman`, `/pengumuman/{slug}`. Template sekolah membaca tulisan lewat konteks. Kepala halaman dari `src/templates/siteSeo.ts`, dengan aturan yang sama seperti PHP. |
| Akun | `/akun/situs/:siteId/berita` (daftar), `/akun/situs/:siteId/berita/:postId` (`baru` = tulisan baru), `/akun/situs/:siteId/seo`. Navigasi pil di editor konten. |

Template dengan fitur tulisan: `madani` dan `cakrawala`.
- Klien: `TemplateDefinition.features.posts` (`src/templates/types.ts`).
- PHP: `SP_POST_TEMPLATE_CODES` di `site_posts.php`. Node: `POST_TEMPLATE_CODES` di `site_posts.js`.
- Ketiga daftar dijaga oleh tes paritas. Template sekolah baru nanti cukup ditambahkan di ketiga tempat itu.

## 2. Data (migrasi 029)

```sql
CREATE TABLE IF NOT EXISTS site_posts (
  id              INT NOT NULL AUTO_INCREMENT,
  site_id         INT NOT NULL,                       -- template_sites.id
  kind            VARCHAR(12)  NOT NULL,              -- 'berita' | 'pengumuman'
  slug            VARCHAR(120) NOT NULL,
  title           VARCHAR(160) NOT NULL,
  excerpt         VARCHAR(300) NOT NULL DEFAULT '',
  body            MEDIUMTEXT   NOT NULL,              -- teks biasa; paragraf dipisah baris kosong
  category        VARCHAR(40)  NOT NULL DEFAULT '',
  badge           VARCHAR(20)  NOT NULL DEFAULT '',   -- pengumuman: "Penting", "Wajib", …
  image           VARCHAR(500) DEFAULT NULL,          -- /assets/sites/{site}/posts/post_<12hex>.<ext>
  image_alt       VARCHAR(200) NOT NULL DEFAULT '',
  link_url        VARCHAR(500) NOT NULL DEFAULT '',   -- tautan tambahan (lampiran PDF, Drive, Instagram)
  status          VARCHAR(12)  NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
  published_at    DATE DEFAULT NULL,                  -- tanggal tampil; diisi hari ini (WIB) saat pertama terbit bila kosong
  seo_title       VARCHAR(70)  NOT NULL DEFAULT '',
  seo_description VARCHAR(160) NOT NULL DEFAULT '',
  noindex         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_posts_slug (site_id, slug),
  KEY idx_site_posts_list (site_id, kind, status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Penghitung terpisah supaya tayangan tidak mengubah site_posts.updated_at (lastmod sitemap)
CREATE TABLE IF NOT EXISTS site_post_views (
  post_id         INT NOT NULL,
  site_id         INT NOT NULL,
  view_count      INT UNSIGNED NOT NULL DEFAULT 0,
  last_viewed_at  DATETIME DEFAULT NULL,
  PRIMARY KEY (post_id),
  KEY idx_site_post_views_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_seo (
  site_id             INT NOT NULL,
  title               VARCHAR(70)  NOT NULL DEFAULT '',
  description         VARCHAR(160) NOT NULL DEFAULT '',
  og_image            VARCHAR(500) DEFAULT NULL,      -- /assets/sites/{site}/seo/seo_<12hex>.<ext>
  google_verification VARCHAR(100) NOT NULL DEFAULT '',
  bing_verification   VARCHAR(100) NOT NULL DEFAULT '',
  index_mode          VARCHAR(10)  NOT NULL DEFAULT 'auto',   -- 'auto' | 'index' | 'noindex'
  schema_type         VARCHAR(40)  NOT NULL DEFAULT '',       -- '' = otomatis
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Aturan tabel:
- Tidak ada foreign key, mengikuti konvensi tabel marketplace.
- Status disimpan sebagai VARCHAR dengan daftar nilai yang diizinkan di kode.
- Baris tanpa `site_seo` sama dengan semua nilai bawaan.
- Migrasi 029 juga mencatat diri di `schema_migrations` dan memperbarui `database/schema.sql` (tabel + baris baseline) serta `database/README.md`.
- Nomor 026, 027, dan 028 sudah dipakai (028 = template sekolah baru).

**Penyimpanan foto.**
- Foto tulisan disimpan di `assets/sites/{site}/posts/`, foto SEO di `assets/sites/{site}/seo/`. **Jangan** di `assets/sites/{site}/` langsung: `pf_cleanup_site_assets` di PHP menghapus semua file di folder itu yang tidak dirujuk konten CMS.
- File lama dihapus saat foto diganti atau dihapus, dan saat tulisan dihapus. Gunakan `delete_local_asset` / `deleteGenerated` dengan section yang sama.

## 3. URL situs pembeli

| Path | Isi | Status HTTP (site.php) |
|---|---|---|
| `/` | Beranda template | 200 |
| `/berita`, `/pengumuman` | Daftar tulisan terbit jenis itu, terbaru dulu, maks 100 | 200. `noindex,follow` bila kosong atau template tanpa fitur tulisan |
| `/berita/{slug}`, `/pengumuman/{slug}` | Satu tulisan terbit | 200; tidak ada / draf / jenis salah → 404 |
| `/berita/`, `/berita/x/` | Garis miring di akhir | 301 ke tanpa garis miring |
| `/robots.txt`, `/sitemap.xml` | Per host (§6) | 200 |
| `/llms.txt`, `/llms-full.txt` | Milik Garuda Nexa, tidak untuk domain pembeli | 404 |
| Lainnya (bukan file nyata) | — | 404 + `X-Robots-Tag: noindex` |

Aturan rute:
- Slug: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, maks 120 karakter, unik per situs (lintas jenis).
- Parser bersama ada di `src/templates/siteRoutes.ts`; site.php wajib setara.
- Di host utama, pratinjau ada di `/situs/{id}`, `/situs/{id}/berita/{slug}`, dan seterusnya. Rutenya `/situs/:siteId/*`, disajikan lewat `app.html` (noindex).

## 4. API

Konvensi mengikuti `guides.*`:
- Error: `{error, code, errors?}`.
- Validasi gagal: 400 `VALIDATION` dengan `errors` per field (kunci = nama field input).
- Metode salah: 405 `METHOD_NOT_ALLOWED`.
- Situs bukan milik pemanggil atau tidak ada: 404 `SITE_NOT_FOUND`.
- Situs nonaktif saat menulis: 409 `SITE_SUSPENDED`.
- Template tanpa fitur tulisan: 403 `POSTS_UNAVAILABLE`, untuk aksi tulisan saja (SEO berlaku untuk semua template).

### 4.1 Aksi pelanggan (`CUSTOMER_ACTIONS`, pakai token)
Setiap handler:
1. memanggil `pf_require_customer` / `requireCustomer`;
2. memeriksa kepemilikan lewat `pf_customer_site` / `customerSite` (`WHERE s.id=? AND s.user_id=?`);
3. memfilter setiap kueri tulisan dengan `site_id` situs itu.

| Aksi | Metode | Input | Output |
|---|---|---|---|
| `customer_get_site_posts` | GET | `site_id` | `{posts: SitePostAdmin[], limits: {max_posts: 500}}`, urut `published_at DESC, id DESC` (draf tanpa tanggal di atas, urut `updated_at DESC`) |
| `customer_save_site_post` | POST | `{site_id, post: SitePostInput}` | `{post: SitePostAdmin}`. Tanpa `id` = buat baru (409 `POST_LIMIT` bila sudah 500) |
| `customer_delete_site_post` | POST | `{site_id, post_id}` | `{success: true}`; juga menghapus baris views dan file foto |
| `customer_get_site_seo` | GET | `site_id` | `SiteSeoResponse` |
| `customer_save_site_seo` | POST | `{site_id, seo: Partial<SiteSeoSettings>}` (`og_image`: data URI / path lama / null) | `SiteSeoResponse` |

Tipe ada di `src/types/sitePosts.ts`.

**Validasi tulisan.** Kedua backend sama persis, termasuk teks pesan dan urutan kunci error.
- `kind` ∈ {berita, pengumuman}. Wajib.
- `title`: di-trim, spasi dirapatkan, 3–160 karakter. Wajib.
- `slug`:
  - kosong → dibuat dari judul: huruf kecil, buang diakritik (NFD), selain `a-z0-9` → `-`, rapatkan `-`, potong 120 di batas kata;
  - bila bentrok dengan tulisan lain di situs yang sama, tambahkan `-2`, `-3`, …;
  - diisi tapi tidak cocok pola → `VALIDATION` (`slug`);
  - diisi tapi bentrok → 409 `SLUG_TAKEN` dengan `errors.slug`.
- `excerpt` ≤300, `body` ≤20000 (CRLF → LF, trim), `category` ≤40, `badge` ≤20, `image_alt` ≤200.
- `link_url` ≤500: hanya `https?://`, `mailto:`, `tel:`, `/path`, atau `#anchor`. `javascript:` ditolak oleh gerbang yang sudah ada.
- `status` ∈ {draft, published}.
- `published_at`: `YYYY-MM-DD` yang valid. Kosong dan berstatus published → tanggal hari ini Asia/Jakarta. Draf boleh kosong.
- `seo_title` ≤70, `seo_description` ≤160, `noindex` boolean.
- `image`:
  - data URI → `parse_upload`, hanya png/jpg/webp/gif, ≤2 MB setelah decode, disimpan di `sites/{site}/posts` dengan prefix `post`;
  - string yang sama dengan nilai tersimpan → tidak berubah;
  - path lain → `VALIDATION` (`image`);
  - `null` atau `''` → foto dihapus.
- **Rate limit:** maks 120 simpan per jam per pengguna (`sp-save|{user}`), dengan pola `rate_limit_wait/hit` / `createLimiter`.

**Validasi SEO.**
- `title` ≤70, `description` ≤160 (trim, spasi dirapatkan).
- `google_verification` / `bing_verification`:
  - boleh berupa token atau seluruh tag `<meta … content="TOKEN">`; nilai `content` diambil;
  - token harus `^[A-Za-z0-9_-]{10,100}$`;
  - kosong = hapus.
- `index_mode` ∈ {auto, index, noindex}.
- `schema_type` ∈ `SITE_SCHEMA_TYPES`.
- `og_image` diperlakukan seperti foto tulisan, dengan folder `sites/{site}/seo` dan prefix `seo`.

**Status index (`SiteSeoStatus`), dihitung server.** `reasons` berisi semua yang berlaku:
- `suspended`: `template_sites.status = 'suspended'`;
- `manual_noindex`: `index_mode = 'noindex'`;
- `default_content`: `index_mode = 'auto'` dan (content NULL **atau** `brand.company_name` kosong / sama dengan bawaan template).

`indexable` = tidak ada alasan. Nama bawaan per template dibaca dari `backend/modules/site_defaults.json` (§6), di PHP maupun Node.

`urls` = `{home: https://{domain}/, sitemap: https://{domain}/sitemap.xml, robots: https://{domain}/robots.txt}`.

### 4.2 Aksi publik (`PUBLIC_ACTIONS`)
Hanya untuk situs `status='active'`. Kalau tidak, 404 `SITE_NOT_FOUND`.

| Aksi | Metode | Input (urutan parameter = urutan kunci preload, §6) | Output |
|---|---|---|---|
| `get_site_seo` | GET | `site_id` | `{seo: SiteSeoPublic}` |
| `get_site_posts` | GET | `site_id`, `kind`, `limit` (1–100, bawaan 12) | `{posts: SitePostSummary[], total}`: hanya terbit, urut `published_at DESC, id DESC` |
| `get_site_post` | GET | `site_id`, `slug` | `{post: SitePostPublic}`; draf/tidak ada → 404 `POST_NOT_FOUND` |
| `site_post_view` | POST | `{site_id, slug}` | `{views}` |

Rincian `site_post_view`:
- Pola yang sama dengan `gd_guide_view`: batas IP 300/jam (`sp-view|ip`), lalu `INSERT … ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed_at = NOW()`.
- User-agent bot (`bot|crawl|spider|slurp|facebookexternalhit|preview`) dijawab `{views}` tanpa menambah hitungan.

Aksi tulisan untuk template tanpa fitur tulisan mengembalikan `{posts: [], total: 0}` dan 404 untuk `get_site_post`.

## 5. Aturan kepala halaman

Aturan ini sama persis di PHP (`site.php`) dan TS (`src/templates/siteSeo.ts`), dibuktikan dengan tes paritas.

Nilai dasar (content NULL atau field kosong → bawaan template dari `backend/modules/site_defaults.json` di PHP, registri `TEMPLATES` di TS):
- `siteName` = `brand.company_name`.
- `tagline` = `brand.tagline`.
- `homeDescFallback` = `hero.subtitle` → `footer.description` → `brand.tagline`.

| Halaman | `<title>` | description |
|---|---|---|
| Beranda | `seo.title` → `siteName — tagline` (bila ≤60) → `siteName` | `seo.description` → `homeDescFallback` |
| Daftar | `Berita · {siteName}` / `Pengumuman · {siteName}` | `Berita terbaru dari {siteName}.` / `Pengumuman resmi dari {siteName}.` |
| Tulisan | `post.seo_title` → `{post.title} · {siteName}` (bila ≤60) → `post.title` | `post.seo_description` → `post.excerpt` → potongan `post.body` |

Aturan teks:
- Semua teks dirapatkan spasinya.
- Deskripsi dipotong ≤155 karakter di batas kata, dengan `…` (pola `seo_first_that_fits` / `seo_sentence`).

**robots.**
- `index,follow` hanya bila status index situs `indexable` **dan** halaman layak:
  - beranda;
  - daftar dengan ≥1 tulisan;
  - tulisan dengan `noindex = 0`.
- Selain itu `noindex,follow`.
- Halaman 404/nonaktif mengirim header `X-Robots-Tag: noindex`.

**Tag yang dikeluarkan.**
- `canonical` = `https://{domain}{path}`, dari domain tersimpan, bukan header Host.
- og:
  - `og:site_name` = siteName;
  - `og:type` = `website` (beranda dan daftar) / `article` (tulisan);
  - `og:url` = canonical;
  - `og:title`, `og:description`;
  - `og:image` = `seo.og_image` → (tulisan) `post.image` → `brand.logo`, sebagai URL absolut di `https://{domain}` bila berupa path;
  - `og:locale` = `id_ID`.
- `twitter:card` = `summary_large_image` bila ada gambar, selain itu `summary`.
- `google-site-verification` dan `msvalidate.01` bila diisi (khusus server; klien tidak perlu).
- Ikon = `brand.logo` bila ada. Ganti `<link rel="icon">` dari shell; tidak ada ikon atau manifest Garuda Nexa.
- **Tanpa** atribut `data-gn`, tanpa `garudanexa.com` di canonical, og, atau JSON-LD.

**JSON-LD** (`@graph`):
- Node organisasi:
  - `@type` = `seo.schema_type` → `School` untuk template berfitur tulisan → `Organization`;
  - `@id` `https://{domain}/#organization`, `name`, `url`, `logo` (absolut, bila ada).
  - `LocalBusiness` tanpa alamat jatuh ke `Organization`.
- `WebSite`: `@id …/#website`, `url`, `name`, `inLanguage: 'id-ID'`, `publisher`.
- Tulisan: `NewsArticle` (berita) / `Article` (pengumuman) dengan `headline` ≤110, `image[]`, `datePublished` (`YYYY-MM-DDT00:00:00+07:00`), `dateModified` (updated_at ISO), `author`/`publisher` = `{@id org}`, `mainEntityOfPage`. Ditambah `BreadcrumbList` (Beranda › Berita/Pengumuman › judul).

**Klien (`siteSeo.ts`).**
- Fungsi murni `buildSiteHead(input)` menghasilkan struktur tag.
- `applySiteSeoHead(input)` memperbarui `<title>`, description, canonical, robots, og/twitter, dan JSON-LD di DOM setiap kali rute atau data berubah. Ia menggantikan `applySiteHead` di `siteHead.ts`.
- Tag dari server ditandai `data-site-seo`. Klien hanya mengubah tag bertanda itu, dan membuatnya bila belum ada (host utama atau pengembangan).
- Hasil klien untuk rute dan data yang sama harus sama dengan server, supaya Google tidak melihat dua versi.

## 6. `backend/site.php` (produksi: `public_html/site.php`)

- **Dimuat:**
  - `define('GN_SEO_LIBRARY', true); require __DIR__.'/seo.php'` untuk helper teks;
  - `require __DIR__.'/modules/site_posts.php'` untuk konstanta dan helper murni. Modul ini harus aman di-include tanpa efek samping.
- **Penjaga:** permintaan langsung ke `/site.php` dijawab 404, dengan pola `seo_requested_directly`.
- **Host:** `HTTP_HOST` dikecilkan, port dan titik akhir dibuang, lalu divalidasi `^[a-z0-9.-]{1,253}$`.
  - Host utama (env `MAIN_HOSTS`, bawaan sama dengan `DEFAULT_MAIN_HOSTS` di `src/templates/siteHosts.ts`) → kirim `index.html` apa adanya, 200. Ini perilaku lama.
  - Kalau bukan host utama: `SELECT id, template_code, domain, status, content, updated_at FROM template_sites WHERE domain IN (?, ?)` (varian www), **status apa pun**.
  - Tidak ketemu → 404 noindex.
  - Host ≠ domain tersimpan (varian www) → 301 ke `https://{domain}{uri}`.
  - `suspended` → 404 noindex. Halaman SPA sendiri yang menampilkan "Situs tidak ditemukan".
- **Rute:** path dari `REQUEST_URI`, mengikuti §3.
- **HTML:**
  - Ambil shell `index.html` (berkas build).
  - Buang tag kepala shell dengan `seo_strip_page_head`; buang juga ikon favicon Garuda Nexa.
  - Sisipkan tag §5 dengan `seo_compose_page`.
  - Sisipkan `<main>` sederhana di `#root`: beranda = H1 nama situs + deskripsi; daftar = H1 + daftar tautan tulisan; tulisan = H1, `<time>`, foto, paragraf isi. Tanpa CSS penyembunyi.
  - Header: `Cache-Control: no-cache`, `Content-Type: text/html; charset=utf-8`.
- **Preload:**
  - `<script id="gn-preload" type="application/json">` dengan `{path, builtAt, api}`.
  - Kunci `api` dibuat tepat seperti `apiUrl()` di klien: `URLSearchParams`, kunci `action` dulu, lalu parameter sesuai urutan di tabel §4.2. Untuk tulisan, kunci `apiUrl('get_site_posts', {site_id, kind, limit})`.
  - Isinya: `get_site_public` (`domain`), `get_site_seo`, dan menurut rute:
    - beranda: `get_site_posts` berita & pengumuman `limit=12`;
    - daftar: jenis itu `limit=100`;
    - tulisan: `get_site_post`.
  - Dengan begitu Google tidak perlu memanggil `/api.php` saat render pertama.
- **`robots.txt`** (per host aktif):
  ```
  User-agent: *
  Allow: /
  Allow: /api.php?action=get_site_public&
  Allow: /api.php?action=get_site_seo&
  Allow: /api.php?action=get_site_posts&
  Allow: /api.php?action=get_site_post&
  Disallow: /api.php
  Sitemap: https://{domain}/sitemap.xml
  ```
  Situs noindex atau nonaktif tetap `Allow: /`, supaya Google bisa melihat noindex-nya. Host tidak dikenal → 404.
- **`sitemap.xml`:**
  - Bila tidak indexable, `urlset` kosong.
  - Selain itu berisi:
    - `/` dengan lastmod = maks(`template_sites.updated_at`, `site_seo.updated_at`, tulisan terbaru);
    - `/berita` dan `/pengumuman` bila ada tulisannya;
    - setiap tulisan terbit dengan `noindex=0`, lastmod = `updated_at`, dan `<image:image>` bila ada foto.
  - Header `application/xml; charset=utf-8`, `no-cache`.
- **`deploy/cpanel/htaccess`:**
  - Untuk host ≠ `garudanexa.com`, letakkan sebelum aturan `index.html` untuk host pembeli:
    - `robots.txt` / `sitemap.xml` → `site.php?file=…`;
    - `llms*.txt` → `site.php?gn404=1`;
    - `^$` → `site.php`;
    - `^index\.html$` → `site.php`;
    - aturan catch-all `!-f !-d` → `site.php`, menggantikan `index.html`.
  - Perbarui tes struktur yang ada: `prerender.test.ts`, `seo-crawl.test.ts`.
- **Build:** `scripts/prerender.mjs` menyalin `site.php` ke akar build, di sebelah `seo.php`. Pastikan `modules/site_defaults.json` ikut ter-deploy bersama `modules/*.php`.
- **Bawaan template** ada di `backend/modules/site_defaults.json`, dibaca site.php, site_posts.php, dan site_posts.js:
  ```json
  { "madani": { "company_name": "…", "tagline": "…", "description": "…", "logo": "…", "posts": true }, … }
  ```
  - Berisi satu entri per template di registri.
  - `description` = `homeDescFallback` dari `resolveContent(def, null)`.
  - `posts` = `def.features?.posts === true`.
  - Tes `__tests__/backend/site-defaults.test.ts` gagal bila berkas ini tidak sama dengan registri. Perbarui dengan `UPDATE_SITE_DEFAULTS=1 npx vitest run __tests__/backend/site-defaults.test.ts`.
- **Node/docker:** tidak ada padanan `site.php`. Produksi adalah cPanel/PHP. Celah ini dicatat di SPEC.md; aksi API tetap setara.

## 7. Template (klien)

- `src/templates/CustomerSite.tsx` (domain pembeli):
  - `parseSiteRoute(location.pathname)`;
  - data awal dari `peekApiGet` (preload site.php), lalu ambil yang terbaru;
  - rute tidak dikenal → tampilan "Halaman tidak ditemukan" dengan robots noindex.
- `SitePreview.tsx` (host utama) memakai `/situs/:siteId/*` dengan `basePath` `/situs/{id}`.
- Konteks baru `SiteDataContext` di `src/templates/shared/siteData.ts`:
  - `{route, basePath, posts: {berita, pengumuman}, post}`;
  - nilai bawaan `{route: home, basePath: '', posts: {berita: null, pengumuman: null}, post: undefined}`;
  - `null` = tidak dimuat. Disediakan oleh `SiteRenderer`.
  - Template **tidak boleh** memakai `useLocation`, karena tes merender tanpa Router.
- **Fallback:**
  - Daftar tulisan jenis itu berupa array tidak kosong → tulisan dipakai, dan kartu menautkan `basePath + /berita/{slug}`.
  - `null` atau kosong → daftar `items` dari konten CMS seperti sekarang. Demo, pratinjau CMS, dan situs lama tidak berubah.
- **Rute daftar & tulisan:** template merender header (tanpa overlay hero) + halaman daftar/tulisan + footer miliknya.
  - Komponen bersama ada di `src/templates/shared/posts/`: kartu, daftar, artikel.
  - Gaya mengikuti token template (warna aksen dari `brand.accent_color`, font template).
  - Tepat satu H1 per halaman.
  - Foto memakai `width`/`height` + `loading="lazy"`, kecuali foto utama artikel.
- **Tautan section** di halaman selain beranda harus menuju `basePath + '/#anchor'`.
  - Tambahkan `news: 'berita'`, `announcements: 'pengumuman'`, `agenda: 'agenda'` ke `SECTION_ANCHOR`.
  - Madani "Buka tautan" menjadi "Baca selengkapnya" untuk tulisan.
  - Cakrawala tidak lagi menulis "Lihat lampiran" untuk tautan tulisan.
- **Jumlah dilihat:** halaman tulisan (bukan pratinjau) memanggil `site_post_view` sekali per sesi browser per tulisan (`sessionStorage`, dibungkus try/catch).

## 8. Panel akun (`/akun`)

- **`SiteNav`:** pil "Konten · Berita & Pengumuman · SEO".
  - "Berita & Pengumuman" hanya muncul untuk template berfitur tulisan.
  - Tampil di `SiteEditor` (di bawah kartu Situs Anda) dan di bagian atas halaman baru.
  - Tautannya melewati `useLeaveGuard`.
- **`/akun/situs/:siteId/berita` (daftar):**
  - tab jenis: Berita / Pengumuman;
  - kartu atau baris: foto mini, judul, status (Terbit/Draf), tanggal, **Dilihat N kali**, terakhir dilihat;
  - aksi: Edit, Lihat (tab baru), Hapus (ConfirmDialog);
  - tombol "Tulis berita" / "Tulis pengumuman";
  - state kosong yang ramah.
- **`/akun/situs/:siteId/berita/:postId` (`baru` = tulisan baru; jenis lewat `?jenis=pengumuman`):**
  - field: judul, foto (`ImageField` + `prepareImage`, keterangan bahwa foto otomatis dikompres WebP), teks foto, ringkasan, isi (textarea besar dengan penghitung), kategori (berita) / label (pengumuman), tautan tambahan, tanggal, status;
  - bagian **SEO (opsional)** yang bisa dilipat: judul SEO, deskripsi SEO, slug/URL (pratinjau `https://{domain}/berita/{slug}`), "Sembunyikan dari Google", dan pratinjau cuplikan Google;
  - simpan memakai `useLeaveGuard`;
  - error field dari server tampil di bawah field-nya.
- **`/akun/situs/:siteId/seo`:**
  - kartu status: "Situs Anda bisa muncul di Google", atau alasannya bila tidak, dengan langkah perbaikan;
  - field: judul di Google, deskripsi, gambar saat dibagikan, tampil di Google (Otomatis/Ya/Tidak), jenis organisasi, kode verifikasi Google Search Console (boleh tempel seluruh tag meta) dan Bing;
  - pratinjau cuplikan Google;
  - tautan sitemap dan robots;
  - panduan singkat: daftarkan di Search Console, kirim sitemap.
- **Editor konten:** untuk template berfitur tulisan, section `news`/`announcements` menampilkan `Notice`: "Kelola berita/pengumuman lengkap (foto, halaman sendiri, SEO, jumlah dilihat) di menu Berita & Pengumuman. Bila sudah ada tulisan terbit, daftar di bawah ini tidak dipakai di situs."
- **Jangan menyentuh** `AccountLayout.tsx`, `AccountHome.tsx`, `components/accountNav.ts`, `src/types/platform.ts`, dan baris `SHARED_GET_ACTIONS` di `src/lib/api.ts`. Semuanya sedang diubah sesi lain.

## 9. Tes

- **Backend:**
  - paritas validasi murni PHP=Node (pola `__tests__/backend/guides.test.ts`);
  - paritas handler dengan DB tiruan (pola `template-slug.test.ts`);
  - daftar aksi sama di kedua backend;
  - daftar `POST_TEMPLATE_CODES` sama dengan `features.posts` di registri.
- **site.php:**
  - head beranda/daftar/tulisan, robots, sitemap, 301 www, 404, nonaktif;
  - paritas dengan `buildSiteHead` (pola `seo-fallback.test.ts`);
  - struktur `.htaccess`.
- **Klien:**
  - `parseSiteRoute`;
  - template memakai tulisan dan fallback ke konten;
  - halaman daftar dan tulisan (satu H1);
  - halaman akun: daftar, simpan, hapus, error field, SEO.

## 10. Di luar cakupan (dicatat)

- IndexNow untuk domain pembeli. Google tidak memakainya; sitemap di robots.txt sudah cukup.
- Padanan Node untuk `site.php`.
- Domain pembeli lewat Cloudflare: belum dipastikan. Header `no-cache` aman.
- Pembeli tetap harus memverifikasi domainnya sendiri di Google Search Console. UI menjelaskan langkahnya.
