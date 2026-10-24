# Deploy garudanexa.com ke cPanel

`public_html` di cPanel adalah checkout branch **`cpanel-deploy`**. Branch ini hanya berisi hasil build: frontend, HTML hasil prerender, dan API PHP. Isinya dibuat oleh `scripts/deploy-cpanel.mjs` dari branch `main`, jadi jangan diedit manual. Kode sumber tetap di `main`.

Bagian SEO (head, OG, sitemap, llms.txt, IndexNow) dijelaskan di [docs/platform/SEO-RUNBOOK.md](../../docs/platform/SEO-RUNBOOK.md). Rencananya ada di [docs/platform/SEO-PLAN.md](../../docs/platform/SEO-PLAN.md) §5.2.

---

## 1. Menjalankan deploy

```bash
node scripts/deploy-cpanel.mjs --push     # build + prerender + commit ke cpanel-deploy + push
```

Setelah itu buka cPanel → **Git Version Control** → Manage → **Pull or Deploy**. Lalu jalankan pemeriksaan di §5 dan IndexNow (SEO-RUNBOOK §6).

| Perintah | Hasil |
|---|---|
| `node scripts/deploy-cpanel.mjs` | build + prerender + commit ke `cpanel-deploy` (lokal, tanpa push) |
| `node scripts/deploy-cpanel.mjs --push` | sama, lalu push ke `origin` |
| `node scripts/deploy-cpanel.mjs --build-only` | build + prerender ke `DEPLOY_DIR/build` saja. Tanpa git, worktree, maupun commit. Dipakai untuk uji lokal |

Pada `--build-only`:
- Builder WP3/WP4 yang belum ada (`scripts/seo/*.mjs`) dilewati dengan peringatan. Cek head (canonical, title unik) hanya menjadi peringatan.
- `--skip-typecheck` melewati `tsc -b`.
- Data API tetap wajib, sama seperti deploy sungguhan.

**Variabel lingkungan:**

| Nama | Bawaan | Fungsi |
|---|---|---|
| `DEPLOY_DIR` | `../.garudanexa-deploy` (di luar proyek) | Folder kerja. Isinya: `build/` (= isi `public_html`), `ssr/` (bundel server, tidak terbit), `cpanel-branch/` (worktree), `client-manifest.json`, `prerender-data.json` |
| `PRERENDER_API` | `https://garudanexa.com` | Sumber data prerender. Untuk uji lokal (`--build-only`): `http://127.0.0.1:8000` (php-api). Deploy sungguhan menolak sumber selain `https://garudanexa.com`, supaya data database lokal tidak pernah terbit. **Hapus variabel ini dari shell setelah uji lokal** |
| `PRERENDER_ALLOW_NONPROD` | — | `1` = izinkan deploy sungguhan dengan `PRERENDER_API` selain production. Hanya untuk keadaan darurat yang disengaja |
| `PRERENDER_GUIDES_BOOTSTRAP` | — | `1` = hanya untuk deploy pertama sejak artikel panduan pindah ke database (§1a): bila `get_guides` dijawab dengan status HTTP gagal (api.php lama), prerender lanjut tanpa artikel panduan dan menulis peringatan. Tanpa variabel ini deploy dibatalkan. Timeout atau respons rusak tetap membatalkan deploy. **Jangan dipakai lagi setelah deploy itu** |
| `MIN_TEMPLATES` | `5` | Jumlah minimal template terbit. Kurang dari ini, deploy dibatalkan |
| `CPANEL_HOME` | `/home/garudanexa` | Dipakai `.cpanel.yml` di branch deploy |

### 1a. Deploy pertama artikel panduan dari database (migration 017)

Prerender mengambil `get_guides` dari API production, padahal `api.php` production yang lama belum mengenal aksi itu (jawabannya HTTP 401) dan baru mengenalnya setelah deploy ini sendiri terbit. Tanpa langkah di bawah, deploy dibatalkan dengan pesan `Deploy pertama sejak artikel panduan pindah ke database?`. Urutannya:

1. **Migration dulu.** Jalankan `database/migrations/2026-10-24_017_guide_articles.sql` di phpMyAdmin production (Import seluruh file, atau tab SQL; file ini tidak menyebut `information_schema`). `api.php` baru membaca tabelnya, jadi migration wajib sebelum Pull.
2. **Cek tabelnya** di tab SQL: `SELECT slug, reviewed FROM guide_articles;` → 4 baris, `reviewed` NULL (semua draf). `SELECT COUNT(*) FROM guide_views;` → 0.
3. **Deploy sekali dengan flag**, hanya untuk perintah itu:
   ```bash
   PRERENDER_GUIDES_BOOTSTRAP=1 node scripts/deploy-cpanel.mjs --push
   # PowerShell: $env:PRERENDER_GUIDES_BOOTSTRAP='1'; node scripts/deploy-cpanel.mjs --push; Remove-Item Env:PRERENDER_GUIDES_BOOTSTRAP
   ```
   Prerender menulis peringatan `… HTTP 401. PRERENDER_GUIDES_BOOTSTRAP=1: lanjut tanpa artikel panduan …` dan membuat situs tanpa artikel panduan (semuanya memang masih draf, `/panduan` tampil `noindex,follow`). Lalu Pull di cPanel seperti biasa.
4. **Cek API baru:** `curl -s 'https://garudanexa.com/api.php?action=get_guides'` harus menjawab `{"success":true,"guides":[]}`. Masih 401 = Pull belum jalan. 500 = cek tabel (langkah 1–2) dan log error PHP.
5. Deploy berikutnya **tanpa** flag. Bila flag masih terisi padahal `get_guides` sudah dijawab, prerender memberi peringatan `PRERENDER_GUIDES_BOOTSTRAP=1 tidak terpakai`. Hapus variabel itu dari shell: dengan flag, `get_guides` yang gagal di kemudian hari membuat artikel terbit hilang dari prerender, sitemap dan llms.txt.

---

## 2. Apa yang dibuat

`scripts/deploy-cpanel.mjs` menjalankan langkah berikut:

1. Build klien Vite ke `build/` dengan `manifest: true`.
2. Menyalin `public/`. Folder unggahan pengguna dan `sitemap.xml` lama tidak ikut.
3. Menyalin API PHP (`api.php`, `modules/*.php`) dan `.htaccess`.
4. Menjalankan **prerender** (`scripts/prerender.mjs`):

| Langkah | Detail |
|---|---|
| Build SSR | `src/entry-server.tsx` → `DEPLOY_DIR/ssr`. Bundel berdiri sendiri dan tidak ikut terbit |
| Ambil data | `get_settings`, `get_navbar_menus`, `get_templates`, `get_public_projects`, lalu `get_template&slug=` per template, lalu `get_guides` dan `get_guide&slug=` per artikel panduan terbit. Berurutan, user agent `GarudaNexaPrerender/1.0`, timeout 15 detik, 2× coba ulang |
| Batalkan deploy bila | ada request yang gagal; respons bukan JSON atau berisi `error`; katalog kosong, rusak, atau kurang dari `MIN_TEMPLATES`; `get_guides` mengirim draf. Satu pengecualian: `get_guides` yang gagal pada deploy pertama dengan `PRERENDER_GUIDES_BOOTSTRAP=1` (§1a) |
| Halaman | untuk setiap rute dari modul `*.seo.ts`: head (`getHead` + `renderHeadTags`), HTML aplikasi (React `prerenderToNodeStream`, menunggu semua `React.lazy`), data preload `<script id="gn-preload">`, dan `<link rel="modulepreload">` chunk rutenya → `_pre/{path}.html` (`/` → `_pre/index.html`) |
| `app.html` | cangkang SPA dengan `noindex,follow` untuk rute aplikasi |
| `404.html` | halaman 404 hasil prerender, `noindex` |
| WP4/WP3 | `sitemap.xml`, `llms.txt`, `llms-full.txt`; pemeriksaan kartu OG |
| `seo.php` | disalin bersama `_pre/seo-fallback.json` (lihat §4) |
| `.htaccess` | daftar rute prerender ditulis ke blok `# BEGIN gn-prerender` |
| Cek kewarasan | setiap `_pre` punya tepat 1 `<h1>`, 1 `<title>` dan 1 canonical; JSON-LD valid; tidak ada title ganda; tidak ada batas Suspense yang belum selesai. Gagal = deploy batal |

Halaman publik yang **tidak** dikembalikan oleh `routes()` modul `*.seo.ts` mana pun tidak diprerender, sehingga di host utama hasilnya 404. Halaman baru (WP5/WP6/WP8) baru terbit setelah modul `*.seo.ts`-nya punya `routes()`. Halaman yang `noindex` tapi tetap publik (misalnya kategori dengan template < 2) boleh dikembalikan `routes()`: halamannya diprerender, tetapi tidak masuk sitemap.

Di browser, `src/main.tsx` membaca data preload, lalu memuat chunk rute dan memanggil `hydrateRoot`. HTML server dipakai apa adanya, tanpa spinner. Hal yang hanya ada di browser (sesi login, query string, preferensi gerak, ukuran layar) baru dibaca setelah hidrasi lewat `useHydrated()` dan `useSyncExternalStore`.

---

## 3. Routing (`deploy/cpanel/htaccess`)

Aturan host utama hanya berlaku untuk `HTTP_HOST = garudanexa.com`. Domain situs pembeli tetap memakai perilaku SPA lama: rute yang bukan file/folder → `index.html`.

| Request (host utama) | Hasil |
|---|---|
| `/`, rute prerender (`/template/aura-studio`, `/pesan-custom`, legal, …) | 200, `_pre/*.html` |
| `/template/{slug}` yang belum diprerender | `seo.php`: 200 bila template terbit, selain itu 404 dengan isi `404.html` |
| `/panduan/{slug}` yang belum diprerender | `seo.php?guide=`: 200 bila artikel panduan terbit (`reviewed` terisi), selain itu (draf, dihapus, tidak ada) 404 dengan isi `404.html` |
| `/akun*`, `/admin*`, `/pesan/*`, `/demo/*`, `/situs/*`, `/masuk`, `/daftar`, `/login`, `/auth` | 200, `app.html` (`noindex,follow`). `/pesan-custom` tidak termasuk |
| Path dengan garis miring di akhir (bukan folder nyata) | 301 ke versi tanpa garis miring |
| `/_pre/…`, `/app.html`, `/seo.php` (dibuka langsung) | 404 dari `seo.php`, isi `404.html`. `/_pre` tanpa garis miring: 403 |
| `/404.html` (dibuka langsung) | 410 |
| Selebihnya (bukan file atau folder nyata) | 404 dari `seo.php?gn404=1`, isi `404.html` |
| File nyata (`/assets/…`, `/api.php`, `/robots.txt`, `/llms.txt`, `/.well-known/…`) | tetap dilayani. `modules/` tetap 403 |

Catatan:
- **Tanpa `%{DOCUMENT_ROOT}`.** Daftar rute prerender ditulis apa adanya ke blok `gn-prerender`, jadi tidak ada cek `-f` ke `%{DOCUMENT_ROOT}` yang di cPanel/LiteSpeed bisa menunjuk ke folder lain. Kalau blok ini kosong (misalnya `.htaccess` dari repo disalin tanpa prerender), hanya `/` yang tampil (cangkang SPA); halaman lain di host utama 404.
- **File internal** diblok lewat `%{THE_REQUEST}` (baris request asli), sehingga rewrite internal ke `_pre/`, `app.html` dan `seo.php` tetap jalan, baik di Apache maupun LiteSpeed. `seo.php` sendiri menolak dibuka langsung.
- **404 tanpa ErrorDocument.** Semua 404 dari aturan `.htaccess` ditulis `seo.php` (`http_response_code(404)` + isi `404.html`), bukan `R=404` + ErrorDocument, dan tidak ada aturan yang membaca `REDIRECT_STATUS`. Di LiteSpeed, ErrorDocument meninggalkan sisa status di koneksi keep-alive: request berikutnya di koneksi yang sama menjawab `/404.html` 200 dan 404 berikutnya 200 berisi halaman 404 (soft 404), padahal di koneksi baru benar. `seo-check` mengujinya lewat urutan keep-alive (404 biasa lalu kasus, dua putaran).
- **Midtrans:**
  - `callbacks.finish` diarahkan ke `/akun/pesanan/{nomor}`, yang disajikan oleh `app.html`.
  - Notifikasi dikirim ke `api.php?action=midtrans_notification`, yang merupakan file nyata.
  - `/api/ai-chat` tetap di-rewrite ke `api.php?action=ai_chat`, dan aturan ini diletakkan sebelum aturan garis miring.
- **Cache:** semua `*.html` diberi `no-cache`, sedangkan file build ber-hash disimpan setahun. `app.html` dan `404.html` juga diberi `X-Robots-Tag: noindex, follow`.
- `.txt` disajikan sebagai `text/plain; charset=utf-8`. `.webmanifest` disajikan sebagai `application/manifest+json`.

---

## 4. Aturan: deploy ulang setelah data template berubah

HTML prerender, JSON-LD (harga Product), sitemap dan llms.txt memakai data pada saat deploy. **Jalankan deploy ulang setiap kali admin mengubah harga, nama, kategori atau deskripsi template, atau menerbitkan, menarik atau menghapus template.** Juga setelah admin mengubah **kontak** (WhatsApp, telepon, email), **menu navbar**, **hero** atau **section yang disembunyikan** di Pengaturan: nilai-nilai itu ikut tertulis di HTML mentah setiap halaman. Daftar lengkapnya ada di SEO-RUNBOOK §2.

Commit di branch `cpanel-deploy` mencatat sumber data dan waktunya, mis. `deploy: build dari main abc1234 (data https://garudanexa.com 2026-10-23T…)`. Bila yang tertulis bukan `https://garudanexa.com`, jangan Pull di cPanel.

Sebelum deploy ulang:
- **Template baru** sudah tampil lewat `backend/seo.php`.
  - Head-nya (title, description, canonical, OG, JSON-LD Organization/WebSite/Product/BreadcrumbList) dibuat dari DB dengan aturan yang sama dengan `src/seo`. Ini dikunci oleh tes `__tests__/backend/seo-fallback.test.ts`.
  - Isinya berupa `<main>` sederhana (H1, deskripsi, fitur, harga, tautan Pesan/Demo/Katalog). Aplikasi React menggantinya setelah dimuat.
  - Halaman ini belum masuk sitemap/llms.txt dan memakai kartu OG default.
- **Template yang ditarik** tetap tampil dari `_pre` sampai deploy ulang. Tarik template hanya bila memang perlu, lalu segera deploy.
- **Harga yang berubah** baru benar di HTML/JSON-LD setelah deploy ulang. Di browser, data diperbarui dari API setelah halaman dimuat. WP9 (`seo-check`) membandingkan harga JSON-LD dengan API.

---

## 5. Pemeriksaan

Setelah setiap Pull di cPanel, jalankan pengaman otomatis (WP9). Ia memeriksa setiap URL sitemap (status, H1, canonical, title, JSON-LD, harga Product = API) dan tes negatif tabel §5.2, berurutan dengan jeda dan User-Agent `GarudaNexaSeoCheck/1.0`. Keluar dengan kode 1 bila ada yang gagal:

```bash
node scripts/seo/seo-check.mjs
```

Bila WAF hosting menjawab 429/503, pengecekan berhenti; izinkan User-Agent itu atau IP mesin deploy (SEO-PLAN §6.B), lalu ulangi.

Pemeriksaan manual (tanpa JavaScript, seperti crawler AI):

```bash
B=https://garudanexa.com
curl -s $B/template/aura-studio | grep -o '<h1[^>]*>[^<]*'
curl -s $B/template/aura-studio | sed 's/<[^>]*>/ /g' | grep -c '1.390.000'          # ≥ 1
curl -s $B/ | grep -o 'href="/template/[a-z0-9-]*"' | sort -u | wc -l                   # ≥ 5
for u in /halaman-tidak-ada /template/tidak-ada /akun /demo/aura-studio /template/aura-studio/ \
         /_pre/index.html /app.html "/seo.php?slug=finova" /llms.txt; do
  printf '%-28s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$B$u")"
done
# harapan: 404 404 200 200 301 404 404 404 200
```

**Uji lokal tanpa menyentuh production.** Build dengan data dari php-api:

```bash
DEPLOY_DIR=<folder-scratch> PRERENDER_API=http://127.0.0.1:8000 node scripts/deploy-cpanel.mjs --build-only
```

Lalu sajikan `<folder-scratch>/build` dengan Apache XAMPP memakai config sekali pakai (`httpd.exe -f <config>`):
- `DocumentRoot` = folder build, dengan `AllowOverride All`.
- Muat `mod_rewrite`, `mod_headers`, `mod_expires`, `mod_mime`, `mod_proxy`, `mod_proxy_http`, dan mod_php (`php8apache2_4.dll`).
- `ProxyPass /api.php http://127.0.0.1:8000/api.php`.
- `RequestHeader set X-Forwarded-Proto https early` (meniru Cloudflare).
- `<FilesMatch "\.php$"> SetHandler application/x-httpd-php </FilesMatch>`, karena handler `ea-php84` milik cPanel tidak dikenal XAMPP.

Cara menguji:
- Pakai `curl -H "Host: garudanexa.com"` untuk host utama dan `-H "Host: toko-contoh.test"` untuk domain pembeli.
- Untuk menguji di browser: Chrome headless dengan `--host-resolver-rules="MAP garudanexa.com 127.0.0.1:<port>"`.
- Untuk menguji `seo.php`: hapus satu slug dari blok `gn-prerender` di `.htaccess` build, lalu buka `/template/{slug}`.
- Untuk melihat peringatan hidrasi React yang lengkap, build dengan `NODE_ENV=development`.

---

## 6. Gangguan umum

| Gejala | Penyebab / tindakan |
|---|---|
| `Gagal mengambil … setelah 3 percobaan` | API production tidak bisa dihubungi atau mesin deploy kena greylist WAF (SEO-PLAN §6.B). Whitelist IP mesin deploy, lalu coba lagi. **Jangan** menurunkan `MIN_TEMPLATES` untuk memaksa |
| `Hanya N template terbit` | Cek status template di admin. Turunkan `MIN_TEMPLATES` hanya bila jumlah itu memang benar |
| `getIndexableRoutes() tidak memuat halaman wajib` | Ada modul `*.seo.ts` yang rusak atau mengembalikan `noindex` untuk `/`, `/pesan-custom`, halaman legal atau template |
| `Cek prerender gagal: … <h1>` | Halaman tidak punya tepat satu H1, atau ada komponen yang melempar error saat render server |
| `Deploy sungguhan harus memakai data production` | `PRERENDER_API` masih terisi dari uji lokal. Hapus (`unset PRERENDER_API`, PowerShell: `Remove-Item Env:PRERENDER_API`), lalu ulangi |
| `Deploy pertama sejak artikel panduan pindah ke database?` | `get_guides` dijawab dengan status HTTP gagal. Deploy pertama sejak migration 017: ikuti §1a. Selain itu cek `https://garudanexa.com/api.php?action=get_guides` dan tabel `guide_articles`; **jangan** memakai `PRERENDER_GUIDES_BOOTSTRAP` untuk memaksa, karena artikel terbit akan hilang dari prerender, sitemap dan llms.txt |
| `get_guides mengirim artikel yang belum ditinjau` | API production mengirim draf panduan (seharusnya tidak pernah): cek `backend/modules/guides.php` dan kolom `reviewed` di tabel `guide_articles` |
| `.htaccess punya baris ≥ 8000 karakter` | Pengaman batas baris Apache (8190). Aturan prerender sudah dipecah per 40 rute; cek perubahan manual di `deploy/cpanel/htaccess` |
| `Render … gagal` | Komponen mengakses `window`/`localStorage`/`document` saat render. Pindahkan ke effect, atau pakai `useHydrated()` |
| Spinner sebentar di `/template/{slug-yang-tidak-ada}` | Wajar. `404.html` dirender di `/404` dan hanya dihidrasi di path yang tidak dimiliki modul `*.seo.ts` (React Router juga merender NotFound di sana). Path milik halaman lain dirender ulang oleh React |
