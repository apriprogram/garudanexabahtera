# Runbook SEO: head, OG, sitemap, llms.txt, IndexNow

Panduan operasional untuk bagian SEO yang dibangun WP3 dan WP4 di [SEO-PLAN.md](SEO-PLAN.md) (§5.3–5.4). Isinya: apa yang dibuat di mana, kapan harus deploy ulang, cara membuat ulang gambar OG, dan cara memeriksa hasilnya.

Semua contoh perintah dijalankan dari root repo di mesin deploy.

---

## 1. Peta singkat

| Hasil | Sumber | Kapan dibuat | Terbit sebagai |
|---|---|---|---|
| Title, description, canonical, robots, OG, Twitter, JSON-LD per halaman | `src/seo/**` (modul `*.seo.ts`, `head.ts`, `jsonld.ts`) | Saat deploy (prerender WP2) dan saat navigasi di browser (`SeoManager`) | `<head>` di `_pre/*.html` |
| Kartu Open Graph 1200×630 | `scripts/seo/og-images.mjs` | **Manual**, lalu di-commit | `public/og/*.jpg` + daftar `src/seo/ogCards.generated.ts` |
| Ikon & manifest | `scripts/seo/og-images.mjs` | **Manual**, lalu di-commit | `public/favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest`, `brand/logo-512.png` |
| `sitemap.xml` | `scripts/seo/sitemap.mjs` ← `getIndexableRoutes(data)` | Saat deploy | `/sitemap.xml` |
| `llms.txt`, `llms-full.txt` | `scripts/seo/llms.mjs` ← `COMPANY_FACTS` + data template | Saat deploy | `/llms.txt`, `/llms-full.txt` |
| Notifikasi IndexNow | `scripts/seo/indexnow.mjs` | **Manual**, setelah Pull di cPanel | POST ke `api.indexnow.org` |

Data prerender diambil dari API production (`PRERENDER_API`, bawaan `https://garudanexa.com`). Jadi harga, nama template, kategori dan `updated_at` di HTML, JSON-LD, sitemap dan llms.txt selalu sama dengan database pada saat deploy.

`index.html` adalah shell netral yang juga dipakai untuk domain situs pembeli. Isinya hanya charset, viewport, `<title>Memuat situs…</title>`, favicon, theme-color dan font. Shell ini **tidak** berisi description, OG, canonical, manifest atau JSON-LD Garuda Nexa. Head lengkap host utama hanya ada di `_pre/*.html` dan ditulis `SeoManager` di klien, dan `SeoManager` hanya aktif di host utama (`isMainHost`). Di domain pembeli, `site.php` menyisipkan head situs itu ke shell per request, lalu `src/templates/siteSeo.ts` menjaganya di browser (§8).

---

## 2. Kapan harus deploy ulang

Deploy ulang (`node scripts/deploy-cpanel.mjs --push`, lalu Pull di cPanel, lalu IndexNow di §6) setiap kali salah satu hal berikut terjadi:

| Perubahan | Kenapa | Tambahan |
|---|---|---|
| Admin mengubah **harga, nama, kategori, deskripsi singkat, fitur atau gambar pratinjau** template | Title, description, JSON-LD Product (harga), sitemap `lastmod`, llms.txt dan halaman prerender memakai nilai saat deploy | — |
| Template **baru diterbitkan** | Halamannya belum ada di `_pre`, sitemap dan llms.txt. Sampai deploy ulang, `seo.php` (WP2) menyajikan versi cadangan | Buat kartu OG-nya (§3), lalu commit, **sebelum** deploy |
| Template **dijadikan draft / dihapus** | URL-nya harus keluar dari sitemap dan llms.txt | IndexNow ikut mengirim URL yang hilang |
| Isi halaman statis berubah (beranda, `/pesan-custom`, legal, halaman WP5/6/8) | `lastmod` sitemap harus jujur | Ubah tanggal `updated` halaman itu (§5) di commit yang sama |
| Fakta perusahaan berubah (`src/lib/companyFacts.ts`) | JSON-LD Organization, llms.txt | Isi field yang tadinya `null` hanya dengan data nyata |
| Profil sosial resmi diisi di Admin → Pengaturan (footer_instagram, dst.) | `sameAs` Organization dibaca dari settings saat deploy | Nilai `#` atau kosong dianggap belum ada. `garudanexa.id` dan akun `@garudanexa` sengaja tidak dipakai (keputusan default 4) |
| Admin mengubah **kontak** (nomor WhatsApp/telepon, email: `footer_whatsapp`, `footer_phone`, `cta_phone`, …), **menu navbar** (Kelola navbar), **hero** (judul, gambar, video) atau **section yang disembunyikan** | Nilai ini ikut tertulis di HTML mentah semua halaman `_pre` dan di `gn-preload`. Crawler dan mesin AI terus membaca nilai lama sampai deploy ulang, walaupun pengunjung dengan JavaScript sudah melihat yang baru | Setelah deploy, cek footer `/` dan `/kontak` tanpa JavaScript (`curl -s $B/kontak \| grep -o '62[0-9]*' \| sort -u`) |
| Artikel panduan **selesai disunting dan dicek faktanya** | Artikel draf tidak dikirim API publik (§4a) | Admin → Pengaturan website → Panduan → Edit → nyalakan **Terbitkan**, lalu deploy (prerender, sitemap, llms.txt) dan IndexNow |
| Template situs pembeli **baru**, atau nama/tagline/deskripsi hero/logo **bawaan** template berubah | `site.php` membaca bawaan template dari `backend/modules/site_defaults.json`, bukan dari kode TypeScript (§8) | Jalankan `UPDATE_SITE_DEFAULTS=1 npx vitest run __tests__/backend/site-defaults.test.ts`, commit berkasnya, lalu deploy |

Setelah deploy, jalankan pemeriksaan di §7.

---

## 3. Membuat ulang kartu OG dan ikon

Kartu dibuat sekali lalu di-commit (keputusan default 7). Isinya tanpa harga supaya tidak basi. Nama, kategori dan gambar pratinjau template diambil dari API saat skrip jalan.

```bash
# semua: ikon + kartu, data dari production (hanya GET get_templates)
node scripts/seo/og-images.mjs

# data dari API lokal (php -S 127.0.0.1:8000 -t backend)
node scripts/seo/og-images.mjs --api http://127.0.0.1:8000

# hanya kartu, atau hanya ikon
node scripts/seo/og-images.mjs --only cards
node scripts/seo/og-images.mjs --only icons
```

- **Kebutuhan:**
  - Node ≥ 22 (WebSocket bawaan).
  - Chrome atau Edge. Dicari otomatis; bila tidak ketemu, set `CHROME_PATH=…/chrome.exe`.
  - Koneksi ke Google Fonts untuk font Inter. Tanpa koneksi, skrip memberi peringatan dan memakai font cadangan.
  - Tidak ada dependensi npm baru.
- **Folder sementara:** profil Chrome dibuat di folder temp sistem, atau `--tmp <folder>` / `OG_TMP_DIR`, lalu dihapus setelah selesai.
- **Hasil kartu:** `public/og/{default,catalog,jasa-website,jasa-aplikasi,harga,panduan,tentang,kontak}.jpg`, `kategori-{slug}.jpg` untuk setiap kategori yang punya template, dan `template-{slug}.jpg` untuk setiap template terbit yang punya pratinjau raster di `public/assets/templates/`. Setiap kartu JPEG 1200×630, ≤ 150 KB (kualitas diturunkan otomatis).
- **Daftar kartu:** skrip menulis ulang `src/seo/ogCards.generated.ts`. `getHead` hanya merujuk kartu yang tercatat di sana, dan kartu yang belum ada otomatis diganti `og/default.jpg`.
- **Commit:** `public/og/`, `src/seo/ogCards.generated.ts`, dan file ikon bila ikut dibuat. Tes `__tests__/seo/assets.test.ts` memeriksa ukuran, dimensi, dan bahwa daftar sama dengan isi folder.
- **Saat deploy,** `buildOgImages()` hanya memeriksa kartu yang belum ada dan menulis peringatan. Kartu tidak dibuat di server.
- **Versi URL (`?v=<hash>`):** URL kartu OG (`/og/x.jpg?v=1a2b3c4d`) dan pratinjau/galeri template (`/assets/templates/x.webp?v=…`)
  memakai 8 hex awal sha256 isi berkasnya. Alasannya: Cloudflare dan `.htaccess` menyimpan gambar 30 hari per URL, jadi
  gambar yang diganti dengan nama sama tidak akan tampil tanpa purge.
  - Peta versinya dihitung ulang dari `public/` setiap build, dev dan tes (`scripts/asset-versions.mjs` → modul virtual
    `virtual:gn-asset-versions` → `src/seo/assetVersion.ts`). Cukup ganti berkasnya lalu deploy; tidak ada langkah manual.
  - Versi hanya untuk tampilan. Nilai `preview_image`/`gallery` di database tetap tanpa versi, dan data admin
    (`admin_get_templates`) tidak pernah diberi versi, karena form admin mengirimnya balik saat menyimpan.
  - `seo.php` (template terbit setelah deploy) mendapat peta yang sama lewat `assetVersions` di `_pre/seo-fallback.json`.
  - Syarat di Cloudflare: Caching Level **Standard** (query termasuk kunci cache); jangan pakai "Ignore query string" untuk
    `/og/*` atau `/assets/*`.

Logo sumber ikon adalah path sayap `WINGS_PATH` di `src/components/ui/LogoMark.tsx` (warna `#211FFE`). Jika logo berubah, jalankan `--only icons`. `public/favicon.svg?v=2` tetap dipakai browser modern; `favicon.ico` hanya cadangan.

---

## 4. sitemap.xml

Sitemap dibuat prerender dari `getIndexableRoutes(data)` lewat `buildSitemap(entries, 'https://garudanexa.com')`. File `public/sitemap.xml` statis sudah dihapus.

- **Isi:** hanya URL `index,follow`, kanonis (tanpa query, tanpa garis miring di akhir), berstatus 200. Halaman stub (noindex) baru masuk setelah `*.seo.ts`-nya mengembalikan kepala `index`.
- **`lastmod` per jenis halaman:**
  - Template: tanggal paling akhir dari `updated_at` DB, `seo.updated` di `src/content/templates/{slug}.ts` (isi halaman template itu) dan `TEMPLATE_PAGE_UPDATED` di `src/seo/templateSeo.ts` (tata letak & teks bersama `TemplateDetail.tsx`). Ubah tanggal itu di commit yang sama dengan perubahan isinya.
  - Halaman statis: tanggal `updated` di `*.seo.ts`.
  - Beranda: tanggal terbaru dari `HOME_UPDATED` dan `updated_at` template.
  - Legal: `LEGAL_UPDATED_AT`.
- Satu `<image:image>` per pratinjau template. Tanpa `changefreq`/`priority`.
- **Deploy gagal bila:** sitemap kosong, ada path aplikasi (`/demo`, `/pesan/…`, `/akun`, `/masuk`, `/daftar`, `/situs`, `/admin`), ada query atau garis miring di akhir, ada path ganda, atau ada `lastmod` yang tidak valid. Perbaiki sumbernya; jangan menerbitkan sitemap yang salah.

Pemeriksaan setelah deploy:

```bash
curl -s https://garudanexa.com/sitemap.xml | grep -c '<loc>'                    # = jumlah rute index
curl -s https://garudanexa.com/sitemap.xml | grep -E '/(demo|pesan|akun|masuk|daftar)/|\?' # kosong
```

Pemilik mengirim sitemap sekali di Search Console dan Bing Webmaster (SEO-PLAN §6.C–6.D). Setelah itu tidak perlu dikirim ulang setiap deploy.

---

## 4a. Artikel panduan: draf dan terbit

Sejak 2026-10-24 artikel disimpan di database (tabel `guide_articles`, migrasi `2026-10-24_017`) dan dikelola di admin → Pengaturan website → **Panduan**: tambah, edit, pratinjau, hapus, terbitkan, dan jumlah dilihat per halaman (`guide_views`). Isi awal 4 artikel (ditulis dengan bantuan AI) di-seed sebagai draf, jadi wajib disunting dan dicek faktanya oleh manusia sebelum terbit (SEO-PLAN §5.8).

- **Deploy pertama (sekali saja):** prerender membaca `get_guides` dari API production, yang baru mengenal aksi itu setelah deploy ini terbit (api.php lama menjawab 401). Urutannya ([deploy/cpanel/README.md](../../deploy/cpanel/README.md) §1a):
  1. Jalankan `database/migrations/2026-10-24_017_guide_articles.sql` di phpMyAdmin production.
  2. Cek tabelnya: `SELECT slug, reviewed FROM guide_articles;` → 4 draf (`reviewed` NULL), `guide_views` ada.
  3. Deploy sekali dengan `PRERENDER_GUIDES_BOOTSTRAP=1 node scripts/deploy-cpanel.mjs --push` (prerender lanjut tanpa artikel panduan, dengan peringatan), lalu Pull di cPanel.
  4. Cek `https://garudanexa.com/api.php?action=get_guides` menjawab `{"success":true,"guides":[]}`.
  5. Deploy berikutnya tanpa flag. Tanpa flag, `get_guides` yang gagal selalu membatalkan deploy: artikel tidak pernah dilewati diam-diam.

- **Draf** = saklar **Terbitkan** mati (`reviewed` kosong). API publik (`get_guides`, `get_guide`) tidak pernah mengirimnya: tanpa halaman (404), tanpa entri di `/panduan`, sitemap dan llms.txt; tautan dari halaman template, kategori, jasa dan `/harga` tidak dirender atau jatuh ke `/panduan`. Selama belum ada artikel terbit, `/panduan` tetap ada tetapi `noindex,follow`. Draf bisa dilihat lewat **Pratinjau** di admin.
- **Terbit:** nyalakan **Terbitkan** (server mengisi `reviewed` dengan tanggal hari ini; `dateModified` ikut hari ini bila judul, deskripsi, isi atau sumber berubah). Artikel langsung tampil di browser. Deploy berikutnya memprerender halamannya dan memperbarui sitemap & llms.txt; sampai saat itu `/panduan/{slug}` baru dilayani `seo.php` (head lengkap, isi dirender React). Lalu kirim IndexNow.
- **Mengubah atau menghapus artikel yang sudah diprerender:** isinya langsung berubah di browser, tetapi HTML prerender (head, isi awal) baru ikut berubah setelah deploy; artikel yang dihapus tetap terlayani dari `_pre/` sampai deploy berikutnya. Deploy ulang setelah perubahan penting.

---

## 5. Menambah atau mengubah halaman (untuk WP5, WP6, WP8)

Setiap halaman publik punya satu modul `*.seo.ts`, yang dikumpulkan otomatis oleh `src/seo/routes.ts`:

- halaman baru: `src/pages/public/**/{Halaman}.seo.ts`;
- rute lama: `src/seo/pages/*.seo.ts`.

Pakai `staticPage()` dan `pageHead()` dari `src/seo/page.ts`:

```ts
export default staticPage({
  path: HUB_PATHS.pricing,
  updated: '2026-11-10',                 // tanggal isi terakhir berubah → lastmod sitemap
  head: (data) => pageHead(data, {
    path: HUB_PATHS.pricing,
    title: `Harga Template Website & Jasa Website 2026${TITLE_SUFFIX}`, // ≤ 60 karakter, unik
    description: '…',                    // ≤ 155 karakter, unik
    ogImage: 'harga',                    // kartu public/og/harga.jpg
    jsonLd: [webPage({ … }), breadcrumb([ … ])],
  }),
});
```

- **Organization dan WebSite** otomatis ditambahkan di setiap halaman `index`.
- **Halaman `noindex`** (`robots: 'noindex,follow'`) tidak mendapat canonical maupun JSON-LD, dan tidak pernah masuk sitemap atau llms.txt.
- **Builder JSON-LD** ada di `src/seo/jsonld.ts`: `service`, `itemList`, `collectionPage`, `aboutPage`, `contactPage`, `article`, `faqPage`, `breadcrumb`, `product`.
  - Tanpa rating atau ulasan.
  - FAQPage hanya boleh berisi teks yang sama persis dengan yang terlihat di halaman.
- **Harga** selalu dari data: `formatPriceFull`/`formatPriceShort` di `src/seo/format.ts`.
- **Teks SEO per template:** tulis di `src/content/templates/{slug}.ts` sebagai `export const seo = { title, description, niche }`, dengan token `{harga}`, `{harga_singkat}`, `{nama}`, `{kategori}`.
  - File ini dimuat di bundel utama, jadi isinya cukup teks SEO.
  - Isi panjang halaman taruh di file lain yang namanya memuat titik, mis. `{slug}.content.ts`.
- **Tes:** `src/seo/__tests__/heads.test.ts` memeriksa panjang, keunikan, canonical, dan kepala semua rute `index`. Jalankan `npx vitest run src/seo __tests__/seo`.

Halaman tidak boleh lagi mengubah `document.title` atau meta sendiri. `useDocumentTitle` di `src/pages/public/template/` sekarang no-op. Pengecualian: halaman akun dan checkout, yang noindex dan tetap memasang judulnya sendiri.

---

## 6. IndexNow

- **Kunci:** `public/346393d59f67e96e16d7c1b2ecc5a27e.txt`. Isi file sama dengan namanya, dan file terbit sebagai `https://garudanexa.com/346393d59f67e96e16d7c1b2ecc5a27e.txt`.
- **Status kiriman:** `DEPLOY_DIR/indexnow/last-sitemap.xml`, yaitu sitemap yang terakhir berhasil dikirim. `DEPLOY_DIR` bawaannya `../.garudanexa-deploy`.

Deploy di sini dua langkah, jadi IndexNow dijalankan **setelah** Pull/Deploy di cPanel selesai:

```bash
node scripts/seo/indexnow.mjs            # uji coba: daftar URL + payload, tidak mengirim apa pun
node scripts/seo/indexnow.mjs --submit   # kirim; berhasil (200/202) → last-sitemap.xml diperbarui
node scripts/seo/indexnow.mjs --all --submit   # kirim semua URL (mis. kiriman pertama, atau setelah ganti kunci)
```

- **URL yang dikirim:** URL baru, URL yang `lastmod`-nya berubah, dan URL yang hilang dari sitemap, dibandingkan dengan `last-sitemap.xml`. Kiriman pertama mengirim semua URL.
- **Sebelum mengirim,** skrip memeriksa bahwa file kunci sudah live dan isinya benar. Jika belum, Pull di cPanel dulu.
- **Kode balasan `api.indexnow.org`:**

  | Kode | Arti |
  |---|---|
  | 200 / 202 | Diterima |
  | 403 | Kunci tidak valid |
  | 422 | URL bukan milik host |
  | 429 | Terlalu sering; tunggu lalu ulangi |

- **Cloudflare Crawler Hints:** jika pemilik mengaktifkannya (SEO-PLAN §6.A), Cloudflare sudah mengirim sinyal IndexNow otomatis. Skrip ini tetap boleh dipakai untuk perubahan penting.
- **Ganti kunci:**
  1. Buat 32 karakter hex baru: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`.
  2. Simpan sebagai `public/{kunci}.txt` dengan isi kunci itu, lalu hapus file lama. Skrip menolak jika ada lebih dari satu file kunci.
  3. Deploy, lalu jalankan `--all --submit`.

Hasilnya terlihat di Bing Webmaster → IndexNow.

---

## 7. Pemeriksaan setelah deploy

```bash
B=https://garudanexa.com
# head per halaman: 1 title, 1 canonical, robots index, JSON-LD bisa di-parse
curl -s $B/template/aura-studio | grep -o '<title>[^<]*</title>'
curl -s $B/template/aura-studio | grep -c 'rel="canonical"'            # 1
curl -s $B/template/aura-studio | grep -o 'name="robots" content="[^"]*"'
curl -s $B/template/aura-studio | grep -o 'property="og:image" content="[^"]*"'
curl -s $B/akun | grep -o 'name="robots" content="[^"]*"'               # noindex,follow
# file statis
curl -sI $B/llms.txt | grep -i '^content-type'                          # text/plain; charset=utf-8
curl -s $B/llms.txt | head -1                                           # # Garuda Nexa
curl -sI $B/og/default.jpg | grep -i '^content-type'                    # image/jpeg
curl -sI $B/site.webmanifest | grep -i '^content-type'                  # application/manifest+json
curl -sI $B/favicon.ico | grep -i '^content-type'                       # image/x-icon atau image/vnd.microsoft.icon
```

Jangan memakai user agent crawler palsu ke production: WAF hosting akan meng-greylist IP penguji.

Uji manual:

- **Rich Results Test** (`https://search.google.com/test/rich-results`) untuk setiap `/template/{slug}`: Product snippet / Merchant listing dan Breadcrumb harus valid. Peringatan tentang `shippingDetails`, `hasMerchantReturnPolicy` atau `review` boleh: produk digital, tanpa ulasan buatan.
- **validator.schema.org** untuk `/`: Organization dan WebSite tanpa error.
- **Sharing Debugger Facebook** dan pratinjau tautan WhatsApp untuk `/` dan satu halaman template: gambar, judul dan harga (di judul) tampil.
- **Domain pembeli:** jalankan pemeriksaan §8.3 untuk satu situs pembeli. Sumber halaman: judul dan description dari situs itu sendiri, tanpa `data-gn`, tanpa `garudanexa.com/#organization`, tanpa canonical ke garudanexa.com.

Tipe MIME `.webmanifest` dan `.txt` diatur di `deploy/cpanel/htaccess` (milik WP2). Jika `site.webmanifest` tersaji sebagai `text/plain` atau `application/octet-stream`, tambahkan `AddType application/manifest+json .webmanifest` di blok `mod_mime`.

---

## 8. Domain pembeli: `site.php`

Situs pembeli (template yang dipesan dan sudah aktif) disajikan dari `public_html` yang sama dengan garudanexa.com. Kontraknya ada di [SITE-POSTS-SEO-SPEC.md](SITE-POSTS-SEO-SPEC.md) §3, §5 dan §6.

### 8.1 Cara kerjanya

| Bagian | Isi |
|---|---|
| `.htaccess` (blok "Domain pembeli") | Untuk host **selain** `garudanexa.com`: `/`, `/index.html`, path yang bukan file nyata, `robots.txt` dan `sitemap.xml` → `site.php`. `llms.txt`/`llms-full.txt` → 404. File nyata (`/assets/…`, gambar unggahan) tetap disajikan langsung. |
| `site.php` (disalin `scripts/prerender.mjs` ke akar build) | Mencari situs di `template_sites` berdasarkan host, termasuk varian `www.`, dengan status apa pun. Lalu menulis jawabannya (tabel di bawah). |
| `modules/site_defaults.json` | Nama, tagline, deskripsi, logo dan fitur tulisan bawaan setiap template. PHP tidak bisa menjalankan `resolveContent`, jadi nilai ini ditulis dari registri `TEMPLATES` oleh tes `site-defaults.test.ts`, dan disalin `prerender.mjs` ke `modules/`. |
| `src/templates/siteSeo.ts` | Aturan head yang sama di browser (`buildSiteHead`, `applySiteSeoHead`). Klien hanya mengubah tag bertanda `data-site-seo`. Tes `__tests__/seo/site-seo.test.ts` membandingkan hasil PHP dan TypeScript untuk masukan yang sama. |

Jawaban `site.php`:

| Request | Jawaban |
|---|---|
| Host utama lain (`MAIN_HOSTS` di `.env`, bawaan sama dengan `src/templates/siteHosts.ts`, mis. `garudanexabahtera.web.id`), atau alamat IP | `index.html` dan file statis apa adanya, seperti sebelum `site.php` ada |
| Host = varian `www.`/tanpa `www.` dari domain tersimpan | 301 ke `https://{domain tersimpan}{path}` |
| `/`, `/berita`, `/pengumuman`, `/berita/{slug}`, `/pengumuman/{slug}` | 200: shell + head (title, description, robots, canonical, OG, Twitter, JSON-LD, ikon = logo situs, kode verifikasi Google/Bing) + `<main>` sederhana untuk crawler + `<script id="gn-preload">` berisi jawaban API yang dibutuhkan render pertama |
| `/berita/`, `/berita/{slug}/` | 301 ke tanpa garis miring; `/index.html` → 301 ke `/` |
| Tulisan draf/tidak ada, path lain, host tidak dikenal, situs nonaktif | 404 + `X-Robots-Tag: noindex` |
| `robots.txt` | Per domain: `Allow` untuk aksi baca situs (`get_site_public`, `get_site_seo`, `get_site_posts`, `get_site_post`), `Disallow: /api.php`, `Sitemap: https://{domain}/sitemap.xml`. Situs nonaktif tetap `Allow: /` supaya Google melihat 404-nya |
| `sitemap.xml` | Beranda, `/berita` dan `/pengumuman` yang punya tulisan, setiap tulisan terbit tanpa "Sembunyikan dari Google". Kosong bila situs belum boleh diindeks |
| Database tidak bisa dihubungi | 503 + `Retry-After: 300`. Tabel `site_seo`/`site_posts` yang belum ada (migrasi 029 belum dijalankan) dianggap kosong, jadi situs tetap tampil |

**Kapan situs boleh diindeks** (`robots` = `index,follow`): situs aktif, "Tampil di Google" di `/akun/situs/{id}/seo` tidak diatur ke **Tidak**, dan bila diatur **Otomatis**, nama sekolah/usaha di konten sudah diganti dari nama bawaan template. Daftar `/berita` hanya diindeks bila berisi minimal satu tulisan terbit. Tulisan dengan "Sembunyikan dari Google" selalu `noindex`.

Domain pembeli tidak perlu deploy ulang saat isi, tulisan atau pengaturan SEO-nya berubah: semuanya dibaca dari database per request. IndexNow tidak dipakai untuk domain pembeli (spec §10).

### 8.2 Syarat di server (pemilik)

- Domain pembeli diarahkan ke `public_html` yang sama (alias/addon domain di cPanel) dan punya sertifikat SSL (AutoSSL). `.htaccess` memaksa HTTPS untuk semua host.
- `.env` di luar `public_html` dibaca juga oleh `site.php` (MySQL). `MAIN_HOSTS` opsional: isi hanya bila host aplikasi utama berbeda dari daftar bawaan.
- Migrasi `2026-10-26_029_site_posts_seo.sql` sudah dijalankan.
- Pembeli memverifikasi domainnya sendiri di Google Search Console (kode meta di `/akun/situs/{id}/seo`, atau DNS), lalu mengirim `https://{domain}/sitemap.xml`.

### 8.3 Memeriksa satu domain pembeli

```bash
D=https://sekolahcontoh.sch.id        # domain pembeli, persis seperti di Admin → Template aktif
curl -sI $D/ | grep -iE '^(HTTP|content-type|cache-control|x-robots-tag)'   # 200, text/html, no-cache, tanpa x-robots-tag
curl -s $D/ | grep -o '<title>[^<]*</title>'                                 # nama situs, bukan "Memuat situs…"
curl -s $D/ | grep -o 'name="robots" content="[^"]*"'                        # index,follow (atau noindex,follow bila belum boleh, §8.1)
curl -s $D/ | grep -o 'rel="canonical" href="[^"]*"'                         # https://{domain}/
curl -s $D/ | grep -c 'data-gn\|garudanexa.com/#organization\|favicon.ico'  # 0
curl -s $D/ | grep -c 'id="gn-preload"'                                      # 1
curl -s $D/ | grep -o 'google-site-verification" content="[^"]*"'            # bila pembeli mengisi kode Google
curl -sI "${D/https:\/\//https://www.}/" | grep -i '^location'               # https://{domain}/ (bila DNS www ada)
curl -s -o /dev/null -w '%{http_code}\n' $D/halaman-tidak-ada                # 404
curl -sI $D/halaman-tidak-ada | grep -i '^x-robots-tag'                      # noindex
curl -s $D/robots.txt                                                        # Sitemap: https://{domain}/sitemap.xml
curl -s $D/sitemap.xml | grep -o '<loc>[^<]*</loc>'                          # hanya URL domain ini
curl -s -o /dev/null -w '%{http_code}\n' $D/llms.txt                         # 404
curl -s -o /dev/null -w '%{http_code}\n' $D/site.php                         # 404
# template sekolah: daftar & satu tulisan
curl -s $D/berita | grep -o '<h1>[^<]*</h1>'                                 # <h1>Berita</h1>
curl -s $D/berita | grep -o 'href="/berita/[a-z0-9-]*"' | head -3
```

Lalu, di browser:

- **Rich Results Test** untuk satu tulisan `/berita/{slug}`: `NewsArticle` (pengumuman: `Article`) dan `Breadcrumb` valid.
- **Search Console → Inspeksi URL** (milik pembeli): halaman yang dirender menampilkan isi situs, bukan "Situs belum bisa dimuat". Bila gagal, cek `robots.txt` domain itu: aksi `get_site_*` harus `Allow`.
- **Pratinjau tautan WhatsApp**: judul, deskripsi dan gambar (gambar SEO situs, foto tulisan, atau logo PNG/JPG/WebP; logo SVG tidak dipakai sebagai gambar bagikan).

### 8.4 Menguji secara lokal

- Tes: `npx vitest run __tests__/backend/site-renderer.test.ts __tests__/seo/site-seo.test.ts __tests__/backend/site-defaults.test.ts`. Tes renderer juga menjalankan `php -S` dengan router yang meniru `.htaccess`, di database uji sementara pada MySQL lokal (`SITE_TEST_MYSQL_HOST`/`_USER`/`_PASS`, bawaan `127.0.0.1`/`root`/kosong; dilewati bila MySQL tidak ada).
- Server dev Vite tidak menjalankan `site.php`. Situs pembeli di `http://{domain}.localhost:5173` tetap memakai head dari `siteSeo.ts` di browser (SiteHostGate, `src/templates/siteHosts.ts`).
- Node/Docker tidak punya padanan `site.php` (spec §10); di sana domain pembeli tetap tanpa head dari server.
