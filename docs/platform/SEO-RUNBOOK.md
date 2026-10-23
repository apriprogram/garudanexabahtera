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

`index.html` adalah shell netral yang juga disajikan untuk domain situs pembeli. Isinya hanya charset, viewport, `<title>Memuat situs…</title>`, favicon, theme-color dan font. Shell ini **tidak** berisi description, OG, canonical, manifest atau JSON-LD Garuda Nexa. Head lengkap host utama hanya ada di `_pre/*.html` dan ditulis `SeoManager` di klien, dan `SeoManager` hanya aktif di host utama (`isMainHost`). Di domain pembeli, head diatur `src/templates/siteHead.ts`.

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
| Artikel panduan **selesai disunting dan dicek faktanya** | Artikel tanpa `reviewed:` di frontmatter adalah draf: tidak terbit di build production (§4a) | Tambahkan `reviewed: YYYY-MM-DD`, jalankan `npx vitest run src/content/panduan -u`, commit, lalu deploy |

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

Artikel di `src/content/panduan/*.md` ditulis dengan bantuan AI, jadi wajib disunting dan dicek faktanya oleh manusia sebelum terbit (SEO-PLAN §5.8).

- **Draf** = frontmatter tanpa baris `reviewed:`. Draf tampil di server dev Vite (`npm run dev`) dan tes, tetapi **tidak ada** di build production: tanpa halaman (404), tanpa entri di `/panduan`, beranda, sitemap dan llms.txt. Tautan ke artikel itu dari halaman template, kategori, jasa dan `/harga` tidak dirender, atau jatuh ke `/panduan`. Selama semua artikel masih draf, `/panduan` tetap ada tetapi `noindex,follow`.
- **Terbit:** setelah penyuntingan, tambahkan `reviewed: YYYY-MM-DD` (dan perbarui `dateModified` bila isinya berubah), lalu `npx vitest run src/content/panduan -u` untuk memperbarui `articles.generated.ts`, commit, deploy, IndexNow.
- **Pratinjau build dengan draf:** `VITE_PANDUAN_DRAFTS=1` saat `--build-only`. Deploy sungguhan menolak build yang memuat draf.

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
- **Domain pembeli:** buka satu situs pembeli. Lihat sumber halaman: judul dan description dari situs itu sendiri, tanpa `data-gn`, tanpa `garudanexa.com/#organization`, tanpa canonical ke garudanexa.com.

Tipe MIME `.webmanifest` dan `.txt` diatur di `deploy/cpanel/htaccess` (milik WP2). Jika `site.webmanifest` tersaji sebagai `text/plain` atau `application/octet-stream`, tambahkan `AddType application/manifest+json .webmanifest` di blok `mod_mime`.
