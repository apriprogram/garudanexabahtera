# Spesifikasi Platform Garuda Nexa: Marketplace Template + Jasa Custom

Dokumen ini adalah **kontrak bersama** untuk semua agen. Kalau ada yang tidak jelas, pilih opsi yang paling
konsisten dengan dokumen ini dan catat di laporan. Jangan mengubah kontrak (nama action, bentuk JSON, status,
format template) tanpa alasan kuat; kalau terpaksa, tulis jelas di laporan.

Stack: Vite + React 19 + TS + Tailwind v4 (frontend), backend **ganda yang harus identik perilakunya**:
`backend/api.php` (PHP, dipakai lokal & hosting cPanel) dan `backend/server.js` (Node/Express, docker + nginx).
DB: MySQL 8 (produksi) / MariaDB XAMPP (lokal) `db_garudanexabahtera`.

## 1. Design system (satu untuk publik, akun user, panel admin)

- **Warna brand** dari file logo `public/assets/logo/logogarudanexa.png`: **#211FFE**.
  Skala `brand`: 50 `#EEEEFF`, 100 `#DFDEFF`, 200 `#C2C1FF`, 300 `#9C9AFF`, 400 `#6C6AFF`, 500 `#3E3CFF`,
  600 `#211FFE` (utama), 700 `#1A18D4`, 800 `#1614A8`, 900 `#121083`.
- **Netral** (abu dingin): 0 `#FFFFFF`, 50 `#F7F8FB`, 100 `#EEF0F5`, 200 `#E3E6EE`, 300 `#CBD0DB`, 400 `#98A0AF`,
  500 `#6B7383`, 600 `#4B5262`, 700 `#343A47`, 800 `#1F2430`, 900 `#121620`.
- **Status**: sukses `#12B76A` (50 `#ECFDF3`, 700 `#067647`), peringatan `#F79009` (50 `#FFFAEB`, 700 `#B54708`),
  bahaya `#F04438` (50 `#FEF3F2`, 700 `#B42318`), info = brand.
- **Halaman publik & akun user: tema TERANG saja** (tidak ada latar gelap, tidak ada toggle tema). Panel admin
  boleh tetap punya mode gelap, tetapi aksen admin (`cobalt-*` di `src/styles/admin.css`) memakai skala brand di atas.
- Tipografi Inter (sudah dimuat), angka `tabular-nums`. Radius: kontrol 12px, kartu 20–24px, pill penuh.
  Shadow halus: `0 1px 2px rgba(18,22,32,.04), 0 8px 24px rgba(18,22,32,.06)`; shadow-float hanya untuk lapisan
  melayang. Spacing basis 4. Skala HP ringkas sesuai `design.md` (token font HP sudah ada di `src/index.css`).
- Token peran publik (sudah ada, nilainya diubah ke tema terang): `bg-canvas`, `bg-alt`, `bg-surface`, `text-fg`,
  `text-muted`, `text-subtle`, `ring-line`, `ring-line-strong`, `primary` = brand-600.
- **Kelas & token stabil yang sudah tersedia di `src/index.css`** (boleh dipakai semua agen; pemilik index.css boleh mengubah tampilannya tetapi TIDAK boleh mengganti/menghapus namanya): `bg-brand-50…900`, `success`/`success-50`/`success-700`, `danger*`/`warning*` (dari admin.css), `.btn` + `btn-primary|btn-outline|btn-secondary|btn-light` + `btn-sm|btn-lg`, `.card-site`, `.label-site`, `.input-site` (input/select/textarea; `aria-invalid="true"` = merah), `.help-site`, `.error-site`, `container-site`, `section-y`.
- Logo: `public/brand/logo-mark.svg` (kotak biru brand rounded + sayap putih), `public/brand/logo-wings.svg`
  (sayap, `fill="currentColor"`). Path sayap ambil dari `public/logogarudanexa.svg`.
- Komponen wajib punya state: default, hover, focus, disabled, loading, error, empty. Form: validasi per field,
  pesan error di bawah field, tombol submit menampilkan loading, notifikasi sukses/error yang jelas.

## 2. Peran & akses

Peran `users.role`: `admin`, `user` (staf), **`customer`** (baru, pembeli template).

- Login tetap satu action `login` (semua peran). Respons `user.role` menentukan arah: `customer` → `/akun`,
  `admin|user` → `/admin`.
- Registrasi pembeli: action baru `customer_register` (langsung aktif, langsung dapat token = auto-login).
  Action lama `register` (staf, menunggu persetujuan) tetap ada.
- **Kebijakan akses (kedua backend, default deny):**
  - `PUBLIC_ACTIONS` (tanpa token): yang lama + `get_templates`, `get_template`, `get_public_projects`,
    `get_site_public`, `submit_custom_order`, `customer_register`, `midtrans_notification`, `get_payment_config`.
  - `CUSTOMER_ACTIONS` (token dengan role `customer` SAJA): semua `customer_*` + `dev_simulate_payment`.
    Data selalu difilter `user_id = token.sub` (cegah IDOR; order/site milik orang lain → 404).
  - Selain itu = **aksi staf**: token role `admin` atau `user`. Token `customer` → 403.
  - `ADMIN_ACTIONS` (admin saja): yang lama + `admin_delete_template`.
- Panel admin (frontend `/admin/*`): role `customer` diarahkan ke `/akun`. Halaman akun (`/akun/*`): tanpa token →
  `/masuk?next=...`; staf yang membuka `/akun` diarahkan ke `/admin`.

## 3. Skema database (migrasi `database/migrations/2026-10-19_004_template_marketplace.sql`)

Idempoten (aman diulang), utf8mb4, InnoDB. Juga perbarui `database/schema.sql`.

```sql
ALTER TABLE users MODIFY role ENUM('admin','user','customer') DEFAULT 'user';

CREATE TABLE templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Company Profile',
  short_description VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  features TEXT DEFAULT NULL,            -- JSON array of string
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  preview_image VARCHAR(500) DEFAULT NULL,
  gallery TEXT DEFAULT NULL,             -- JSON array of image path
  template_code VARCHAR(60) NOT NULL,    -- kunci renderer di src/templates (mis. 'corporate-nexa')
  demo_url VARCHAR(500) DEFAULT NULL,    -- opsional; kosong = pakai /demo/:slug
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_templates_status (status, sort_order)
);

CREATE TABLE template_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,          -- 'GN-YYYYMMDD-XXXXXX' (6 char acak A-Z0-9)
  user_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  template_name VARCHAR(150) NOT NULL,               -- snapshot saat order
  template_code VARCHAR(60) NOT NULL,
  price DECIMAL(15,2) NOT NULL,                      -- snapshot saat order
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  company_name VARCHAR(150) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  domain_primary VARCHAR(253) NOT NULL,
  domain_alternative VARCHAR(253) DEFAULT NULL,
  domain VARCHAR(253) DEFAULT NULL,                  -- domain final, diisi admin
  status ENUM('menunggu_pembayaran','menunggu_approval','proses_domain','aktif','ditolak','dibatalkan')
         NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- transaction_status Midtrans terakhir
  payment_type VARCHAR(40) DEFAULT NULL,
  midtrans_order_id VARCHAR(60) DEFAULT NULL UNIQUE,  -- order_number + '-' + attempt
  payment_attempt INT NOT NULL DEFAULT 0,
  snap_token VARCHAR(255) DEFAULT NULL,
  payment_url VARCHAR(500) DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  rejected_reason VARCHAR(500) DEFAULT NULL,
  activated_at DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_orders_user (user_id), KEY idx_orders_status (status, created_at)
);

CREATE TABLE template_sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  template_code VARCHAR(60) NOT NULL,
  domain VARCHAR(253) NOT NULL UNIQUE,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  content MEDIUMTEXT DEFAULT NULL,           -- JSON SiteContent (lihat §7); NULL = pakai default template
  activated_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sites_user (user_id)
);

CREATE TABLE template_order_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  event VARCHAR(40) NOT NULL,               -- created|payment_created|payment_update|approved|rejected|domain_set|activated|cancelled|note
  from_status VARCHAR(30) DEFAULT NULL,
  to_status VARCHAR(30) DEFAULT NULL,
  actor_type ENUM('system','customer','staff','midtrans') NOT NULL,
  actor_id INT DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  payload TEXT DEFAULT NULL,                -- JSON mentah notifikasi Midtrans (tanpa data sensitif)
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_logs_order (order_id, created_at)
);

ALTER TABLE project_client
  ADD COLUMN show_on_website TINYINT(1) NOT NULL DEFAULT 0,   -- tampil di section Projects
  ADD COLUMN source ENUM('admin','website') NOT NULL DEFAULT 'admin';  -- 'website' = dari form custom publik
```

- Navbar publik (`navbar_menus`, data-driven): ubah menu atas menjadi **Template** (`#templates`), **Projects**
  (`#projects`), **Proses** (`#process`), **FAQ** (`#faq`). Menu lain (Harga, Perusahaan + anaknya, anak-anak Produk)
  dinonaktifkan (`is_active = 0`), JANGAN dihapus. Kolom: `label_id`, `label_en`, `url`, `sort_order`, `is_active`.
- `faq_data` di `hero_settings`: hapus kalimat yang menyebut harga/paket jasa custom (lihat §8).
- Gambar seed: `preview_image` = `/assets/templates/<code>-preview.svg`, `gallery` = `/assets/templates/<code>-1.svg`, `/assets/templates/<code>-2.svg` (file SVG mockup dibuat agen templates-public di `public/assets/templates/`).
- Seed lokal `database/seed.templates.sql` (contoh, idempoten): 2 template kategori "Company Profile"
  `corporate-nexa` dan `startup-clean`, status `published`, harga contoh (tandai "contoh" di laporan).
- Migrasi terpisah **TIDAK dijalankan**: `database/migrations/2026-10-19_005_drop_monitoring_tables.sql` berisi
  `DROP TABLE IF EXISTS` untuk semua tabel `monitor_*` dan `monitoring_*`, dengan komentar besar
  "JANGAN DIJALANKAN SEBELUM BACKUP" + daftar tabelnya. Laporkan daftar tabel ke pengguna.

## 4. Status order

| Kode | Label | Masuk dari | Pemicu |
|---|---|---|---|
| `menunggu_pembayaran` | Menunggu Pembayaran | (baru) | `customer_create_order` |
| `menunggu_approval` | Dibayar (Menunggu Approval) | menunggu_pembayaran | Midtrans `settlement`, atau `capture` + `fraud_status=accept`, atau `dev_simulate_payment` |
| `proses_domain` | Disetujui (Proses Domain) | menunggu_approval | `admin_approve_template_order` |
| `aktif` | Aktif | proses_domain | `admin_set_order_domain` (buat `template_sites` aktif = CMS terbuka) |
| `ditolak` | Ditolak | menunggu_pembayaran, menunggu_approval | `admin_reject_template_order` (alasan wajib) |
| `dibatalkan` | Dibatalkan | menunggu_pembayaran | Midtrans `deny/cancel/expire/failure`, atau `customer_cancel_order` |

Transisi lain DITOLAK (HTTP 409, `code: "INVALID_STATUS"`). Setiap transisi tulis `template_order_logs`.
Update status pakai `UPDATE ... WHERE id = ? AND status = ?` (cegah balapan/duplikasi webhook).

## 5. Midtrans (Snap, mode redirect)

Env (tambahkan ke `.env.example`, jangan isi nilai asli): `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
`MIDTRANS_IS_PRODUCTION` (0/1), `MIDTRANS_SIMULATOR` (0/1, hanya berlaku bila IS_PRODUCTION=0), `APP_URL`
(mis. `http://localhost:5173`).

- Buat transaksi: `POST https://app.sandbox.midtrans.com/snap/v1/transactions` (produksi `https://app.midtrans.com/...`),
  Basic auth `base64(SERVER_KEY + ':')`. Body: `transaction_details {order_id: midtrans_order_id, gross_amount: int}`,
  `item_details [{id: 'TPL-<template_id>', price: int, quantity: 1, name: <=50 char}]`,
  `customer_details {first_name, email, phone}`, `callbacks {finish: APP_URL + '/akun/pesanan/' + order_number}`.
  Simpan `snap_token`, `payment_url` (= `redirect_url`). `midtrans_order_id = order_number + '-' + payment_attempt`
  (attempt naik tiap transaksi baru, karena order_id Midtrans harus unik).
- Webhook `midtrans_notification` (publik, POST JSON dari Midtrans ke `/api.php?action=midtrans_notification`):
  1. Verifikasi `signature_key == sha512(order_id + status_code + gross_amount + SERVER_KEY)` (bandingkan constant-time).
     Salah → 403.
  2. Cari order lewat `midtrans_order_id`. `gross_amount` harus sama dengan harga order (bulatkan). Beda → log + 400.
  3. Bila server key ada, konfirmasi ke Status API `GET https://api(.sandbox).midtrans.com/v2/<order_id>/status`
     dan pakai hasil itu.
  4. Mapping: `settlement` / `capture`+`accept` → `menunggu_approval` (+ `paid_at`); `pending` → tetap;
     `deny|cancel|expire|failure` → `dibatalkan` hanya bila masih `menunggu_pembayaran`; `refund*` → log saja.
     Selalu simpan `payment_status`, `payment_type`, log `payment_update` dengan payload. Idempoten. Balas 200 `{success:true}`.
- `MIDTRANS_SERVER_KEY` kosong: `customer_create_order` tetap membuat order, tetapi `payment_url` null dan respons
  menyertakan `payment_error: "Pembayaran online belum dikonfigurasi."`. Bila `MIDTRANS_SIMULATOR=1` & bukan produksi,
  action `dev_simulate_payment {order_number}` (customer, order miliknya) menjalankan transisi bayar yang SAMA dengan
  webhook (lewat fungsi internal yang sama).
- `get_payment_config` → `{ configured: bool, is_production: bool, simulator: bool, client_key: string|null }`.

## 6. Kontrak API (identik di PHP & Node)

Konvensi lama: `/api.php?action=...`. Aksi baca publik boleh GET (query string) **dan** POST; semua aksi lain
POST JSON `{action, ...}`. Sukses: `{ success: true, ...data }`. Gagal: HTTP 4xx/5xx + `{ error: string, code?: string }`.
Validasi input di server (panjang, format email/telepon/domain, angka). Harga dalam rupiah (number).

Objek **Template**: `{ id, slug, name, category, short_description, description, features: string[], price,
preview_image, gallery: string[], template_code, demo_url, status, sort_order, created_at, updated_at }`
(publik hanya `published`, field `status` boleh ikut).

Objek **Order**: `{ id, order_number, template_id, template_name, template_code, template_slug, price, customer_name,
customer_email, customer_phone, company_name, notes, domain_primary, domain_alternative, domain, status, status_label,
payment_status, payment_type, payment_url, paid_at, approved_at, rejected_reason, activated_at, cancelled_at,
created_at, updated_at, site_id }` + untuk staf: `user: { id, name, email }`. `payment_url` hanya dikirim ke pemilik
saat status `menunggu_pembayaran`.

Objek **Log**: `{ id, event, from_status, to_status, actor_type, actor_name, note, created_at }` (tanpa payload untuk customer).

Objek **Site**: `{ id, order_id, order_number, user_id, template_id, template_code, template_name, domain, status,
content: object|null, activated_at, updated_at, owner_name, owner_email }` (owner_* hanya untuk staf).

### Publik
| Action | Input | Output |
|---|---|---|
| `get_templates` | `category?` | `{ templates: Template[], categories: string[] }` (published, urut sort_order, id) |
| `get_template` | `slug` | `{ template: Template }` (404 bila tidak ada/draft) |
| `get_public_projects` | – | `{ projects: [{ id, name, service_type, image, description }] }` dari `project_client` `show_on_website=1` (TANPA harga/kontak klien) |
| `get_site_public` | `site_id` atau `domain` | `{ site: { id, template_code, domain, content } }` hanya status `active` |
| `submit_custom_order` | `name, email, phone, company?, service_type ('website'|'mobile_app'), project_name?, description, budget_note?` | `{ success, reference }` → insert `project_client` (status `pending`, source `website`, client_* dari input, `name` = project_name atau "Pesanan custom - <name>", deskripsi gabungan); rate limit 5/jam/IP; honeypot field `website` harus kosong |
| `customer_register` | `name, email, phone, password` | `{ success, user, token, expires_at }` role customer, status active; rate limit sama seperti `register` |
| `midtrans_notification` | payload Midtrans | lihat §5 |
| `get_payment_config` | – | lihat §5 |

### Customer (token role `customer`, data milik sendiri)
| Action | Input | Output |
|---|---|---|
| `customer_create_order` | `template_id, customer_name, customer_email, customer_phone, company_name?, notes?, domain_primary, domain_alternative?` | `{ order, payment_url, payment_error? }` (template harus published; domain divalidasi format `^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$`, lowercase) |
| `customer_pay_order` | `order_number` | `{ payment_url }` (buat transaksi Snap baru bila belum ada/kedaluwarsa; hanya status menunggu_pembayaran) |
| `customer_get_orders` | – | `{ orders: Order[] }` terbaru dulu |
| `customer_get_order` | `order_number` | `{ order, logs: Log[], site: Site|null }` |
| `customer_cancel_order` | `order_number` | `{ order }` (hanya menunggu_pembayaran) |
| `customer_get_site` | `site_id` | `{ site }` (milik sendiri) |
| `customer_save_site_content` | `site_id, content` | `{ site }` — gambar data-URI di dalam content disimpan jadi file (`assets/sites/<site_id>/...`) lalu diganti path; JSON akhir maks 512 KB; hanya site `active` |
| `dev_simulate_payment` | `order_number` | `{ order }` (lihat §5) |

### Staf (role admin/user)
| Action | Input | Output |
|---|---|---|
| `admin_get_template_orders` | `status?, q?` | `{ orders: Order[], counts: { [status]: number, all: number } }` |
| `admin_get_template_order` | `id` | `{ order, logs, site }` |
| `admin_approve_template_order` | `id, note?` | `{ order }` |
| `admin_reject_template_order` | `id, reason` | `{ order }` |
| `admin_set_order_domain` | `id, domain` | `{ order, site }` (domain unik di template_sites; buat site `active`, content NULL) |
| `admin_get_templates` | – | `{ templates: Template[] }` (semua status) |
| `admin_save_template` | `id?, slug?, name, category, short_description, description, features[], price, preview_image (path atau data-URI), gallery[] (path/data-URI), template_code, demo_url?, status, sort_order` | `{ template }` (slug otomatis dari nama bila kosong, unik; gambar disimpan di `assets/templates/`) |
| `admin_delete_template` (admin) | `id` | `{ success }`; bila sudah dipakai order → 409 `TEMPLATE_IN_USE` (sarankan ubah ke draft) |
| `admin_get_active_sites` | – | `{ sites: Site[] }` |
| `admin_set_site_status` | `id, status ('active'|'suspended')` | `{ site }` |
| `admin_dashboard_summary` | – | `{ template_orders: { total, this_month, by_status }, custom_projects: { total, this_month, from_website_pending }, revenue: { template_paid, custom_total }, recent_template_orders: Order[] (5 terbaru) }` |

Juga: `update_project` & `add_project` (lama) menerima `show_on_website` (0/1); `get_projects` mengembalikan
`show_on_website` dan `source`.

**Latar hero beranda** (`backend/modules/hero_media.php` / `hero_media.js`, aksi staf, tidak ada di daftar mana pun):

| Action | Input | Output |
|---|---|---|
| `upload_hero_video` | POST `/api.php?action=upload_hero_video`, header `Authorization: Bearer <token>`, body = **byte file mentah** (bukan JSON/base64/multipart; `Content-Type: video/mp4\|video/webm` hanya informasi) | `{ success, url }` (PHP `/assets/bg/hero_video_<12 hex>.<mp4\|webm>`, Node URL S3 publik dengan key yang sama). Jenis dari magic bytes saja: MP4 (`ftyp` + brand yang diizinkan, MOV `qt  ` ditolak) atau WebM (EBML + DocType `webm`); lainnya 400. Kosong 400; lebih dari `UPLOAD_MAX_VIDEO_MB` (default 30) 413. Setelah berhasil: sapu bersih (lihat di bawah) |
| `get_hero_media_limits` | GET atau POST, token staf | `{ success: true, video_max_mb, max_images }`: `video_max_mb` = `UPLOAD_MAX_VIDEO_MB` dalam MB bulat (dibulatkan ke bawah, minimal 1; default 30), `max_images` = 12 (`HERO_MAX_IMAGES` di `src/components/sections/hero/heroBgConfig.ts`) |

Setting `hero_settings` (semua string): `hero_bg_mode` (`default`, `image` atau `video`; selain itu disimpan `default`),
`hero_images` (JSON array URL, urutan slide; data URI gambar baru disimpan jadi `assets/bg/hero_<12 hex>.<ext>`),
`hero_bg_video` (URL dari `upload_hero_video`, `""` = tidak ada; data URI ditolak 400), `hero_bg_video_poster` (URL;
data URI gambar baru disimpan jadi `assets/bg/hero_poster_<12 hex>.<jpg|png|webp>`). `get_settings` (publik) selalu
menjawab objek JSON `{ <setting_key>: <setting_value> }`, juga `{}` (bukan `[]`) bila tabel kosong, di kedua backend.
Node memakai `S3_PUBLIC_URL` (atau `S3_ENDPOINT/S3_BUCKET`) tanpa garis miring di akhir, jadi URL upload baru tidak
pernah berisi `//`.

`update_settings` untuk kunci hero:
- Body boleh berisi `hero_media_base: { video, poster }` di **tingkat atas** (bukan di dalam `settings`, jadi tidak
  pernah disimpan sebagai setting) = nilai `hero_bg_video` / `hero_bg_video_poster` yang dimuat halaman admin. Bila
  `settings` berisi `hero_bg_video` dan `hero_media_base.video` berupa string yang berbeda dari nilai tersimpan (tidak
  ada = `""`) → **409** `{ error: "Latar hero sudah diubah di tab atau perangkat lain. Muat ulang halaman, lalu simpan lagi." }`
  sebelum apa pun disimpan atau diunggah. Sama untuk `hero_bg_video_poster` dengan `hero_media_base.poster` (poster
  data URI baru juga: yang dibandingkan base-nya). Tanpa `hero_media_base` pemeriksaan ini dilewati. Kunci yang
  dikirim dengan nilai yang sama dengan nilai tersimpan (simpan ulang tanpa perubahan, mis. setelah jawaban
  sebelumnya hilang) tidak dibandingkan; poster data URI baru tidak pernah sama, jadi selalu dibandingkan.
- Bila `hero_bg_video` (atau `hero_bg_video_poster` yang bukan data URI) berubah dan berupa nama buatan modul
  (`hero_video_<12 hex>.<mp4|webm>` / `hero_poster_<12 hex>.<jpg|png|webp>` di `/assets/bg/`; Node: URL http(s) di
  host mana pun yang path-nya, dengan garis miring ganda digabung dan query/fragment diabaikan, berakhir
  `/assets/bg/<nama>`, karena `S3_PUBLIC_URL` bisa sudah berubah sejak upload), file-nya harus ada (PHP di
  `public/assets/bg`, Node `HeadObject` S3 key `assets/bg/<nama>`); bila tidak → 409 dengan pesan yang sama. `""`
  (hapus) selalu boleh.
- Poster dan gambar `hero_images` baru hanya gambar raster: JPG, PNG, WEBP (slide juga GIF); SVG, ICO dan lainnya →
  400 `{ error: "Gambar latar dan sampul harus JPG, PNG, atau WEBP." }`. Semua gambar baru diperiksa dulu sebelum file
  pertama ditulis; bila request gagal setelah file ditulis (setting lain, database), file dari request itu dihapus
  kecuali yang dirujuk setting yang sempat tersimpan.
- File video/poster lama **tidak** dihapus saat menyimpan. Setelah setiap `update_settings` dan `upload_hero_video`
  yang berhasil, sapu bersih: hapus file di `assets/bg` yang namanya persis pola buatan modul di atas, namanya bukan
  nama file `hero_bg_video` / `hero_bg_video_poster` yang tersimpan (dibaca setelah simpan; segmen terakhir path tanpa
  query, fragment dan garis miring di akhir, dibandingkan per nama saja, jadi host lain, URL lengkap, `//` atau query
  di link tersimpan tidak membuat file yang dipakai terhapus), dan berumur lebih dari 24 jam (PHP
  `filemtime`, Node `LastModified` dari `ListObjectsV2` prefix `assets/bg/hero_video_` dan `assets/bg/hero_poster_`).
  PHP juga menghapus file sementaranya (`.hero_video_<12 hex>.part`) yang lebih dari 1 jam. File lain tidak pernah
  disentuh; error saat menyapu hanya dicatat di log dan tidak menggagalkan request.

### Struktur kode backend
- PHP: `backend/modules/templates.php` berisi fungsi `handle_platform_action(mysqli $conn, string $action, array $input, ?array $user): bool`
  (return true bila action ditangani). `api.php` cukup `require_once` + memanggilnya tepat sebelum `switch ($action)`.
  Untuk GET, gabungkan `$_GET` ke `$input`.
- Node: `backend/modules/templates.js` mengekspor `handlePlatformAction(action, input, req, res, pool) → Promise<boolean>`;
  dipanggil di awal handler `app.get('/api.php')` (input = `req.query`) dan `app.post('/api.php')` (input = `req.body`).
  `req.user` diisi auth gate.
- Kebijakan akses diterapkan di `authorize_request` (PHP) dan `createAuthGate` (`backend/security.js`), dengan
  daftar yang SAMA di kedua backend.

## 7. Template renderer & CMS (frontend `src/templates/`)

Tipe ada di `src/templates/types.ts` (sudah dibuat, jangan diubah bentuknya). Ringkasnya:

```ts
type FieldType = 'text' | 'textarea' | 'image' | 'url' | 'email' | 'phone' | 'color';
interface TemplateField { type: FieldType; key: string; label: string; placeholder?: string; help?: string; maxLength?: number }
interface TemplateListField { type: 'list'; key: string; label: string; itemLabel: string; fields: TemplateField[]; max?: number }
interface TemplateSection { key: string; label: string; description?: string; toggleable?: boolean; fields: (TemplateField | TemplateListField)[] }
type SectionContent = { enabled?: boolean } & Record<string, string | boolean | Record<string, string>[] | undefined>;
type SiteContent = Record<string, SectionContent>;
interface TemplateDefinition { code: string; name: string; sections: TemplateSection[]; defaultContent: SiteContent;
  Component: React.ComponentType<{ content: SiteContent; preview?: boolean }> }
```

- Registry `src/templates/index.ts`: `TEMPLATES: Record<string, TemplateDefinition>`, `getTemplate(code)`,
  `resolveContent(def, content|null)` = deep-merge default + konten tersimpan.
- Dua template Company Profile: `corporate-nexa`, `startup-clean`. Section minimal: brand (nama, logo, warna aksen),
  hero, about, services (list), stats/keunggulan (list), gallery (list gambar), testimonials (list), contact
  (alamat, email, telepon, WhatsApp, maps URL), footer. Responsif, terang, profesional.
- Halaman: `/demo/:slug` (render template pakai default content), `/situs/:siteId` (render site aktif),
  dan **SiteHostGate**: bila hostname bukan host utama (`VITE_MAIN_HOSTS`, default
  `localhost,127.0.0.1,garudanexa.com,www.garudanexa.com,garudanexabahtera.web.id`), panggil
  `get_site_public {domain: hostname}` dan render situsnya, bukan aplikasi utama.
- CMS (`/akun/situs/:siteId`): form generik dari `sections` (toggle section, field per tipe, list tambah/hapus/urut),
  pratinjau langsung memakai `Component`, simpan via `customer_save_site_content`. Gambar dikirim sebagai data-URI
  (maks 2 MB per gambar, kompres di klien bila perlu).

## 8. Halaman publik

Urutan homepage: **Hero** (putih, headline gelap + kata kunci biru, 2 tombol: "Pilih Template" → scroll halus ke
`#templates`; "Pesan Website / Aplikasi Mobile Custom" (outline) → `/pesan-custom`) → strip nama produk/layanan
(tema terang) → **Pilih Template** `#templates` (filter kategori, kartu: preview, nama, deskripsi, HARGA,
"Lihat Demo" → `/demo/:slug` atau demo_url, "Pesan" → `/pesan/:slug`, klik kartu → `/template/:slug`) →
**Projects** `#projects` (dari `get_public_projects`; bila kosong, fallback ke `portfolio_data` lama) → **Proses**
`#process` (dua alur: Template & Custom) → **FAQ** `#faq` (tanpa harga/paket jasa custom) → **CTA** biru brand
(`#kontak`, bukan hitam) → Footer terang. Section Harga/Pricelist dan "Solusi Produk Kami" DIHAPUS.
Navbar: struktur tetap (menu dari Navbar Manager, Masuk, Konsultasi Gratis; tanpa sakelar bahasa, website hanya
berbahasa Indonesia, keputusan pemilik 2026-10-21); "Masuk" → `/masuk`; bila login sebagai customer tampilkan
"Akun Saya" → `/akun`. Kartu template SELALU menampilkan deskripsi + "Lihat Demo" / "Pesan" (bukan hanya saat hover).

Rute publik: `/template/:slug` (detail: galeri, fitur, harga, demo, tombol pesan), `/demo/:slug`, `/pesan/:slug`
(form pemesanan, wajib login customer; belum login → tampilkan daftar/masuk inline atau arahkan `/masuk?next=`),
`/pesan-custom` (form jasa custom website/aplikasi mobile; tanpa harga, CTA konsultasi), `/masuk`, `/daftar`,
`/akun` (ringkasan + daftar order), `/akun/pesanan/:orderNumber` (detail, timeline status, tombol bayar/batalkan,
info tagihan, tombol simulasi bayar bila simulator aktif), `/akun/situs/:siteId` (CMS), `/situs/:siteId`.

## 9. Panel admin

Sidebar: **UTAMA** Dashboard · **PRODUK** Pesanan Template (Order Masuk, Input Domain, Kelola Template, Template Aktif)
· **CUSTOM** Project Clients · **KONTEN** Pengaturan website, Kelola navbar, Dokumen, Changelog · **SISTEM** Pengguna.

Rute: `/admin/pesanan-template` (Order Masuk), `/admin/pesanan-template/input-domain`,
`/admin/pesanan-template/kelola-template`, `/admin/pesanan-template/template-aktif`, `/admin/project-clients`.
Rute lama `/admin/monitoring-server` dan `/admin/products*` → redirect ke `/admin` (bukan 404).

- **Order Masuk**: tabel (HP: kartu) order + pill status order + pill status pembayaran Midtrans, filter status, cari;
  detail (drawer/modal): data pemesan, domain diminta, riwayat log; aksi Approve (menunggu_approval) & Tolak (alasan).
- **Input Domain**: order `proses_domain`; isi domain final (validasi) → Aktif.
- **Kelola Template**: CRUD template (nama, slug, kategori, deskripsi, fitur, harga, gambar preview + galeri,
  template_code dari registry, demo_url, status publish, urutan).
- **Template Aktif**: daftar site (domain, pemilik, template, tanggal aktif, status; aksi suspend/aktifkan, buka situs).
- **Project Clients**: pindahkan pengelolaan proyek (tabel + drawer form tambah/edit + hapus + lihat) dari Dashboard ke
  halaman ini, tambah toggle "Tampilkan di website" (`show_on_website`) dan badge sumber ("Dari website").
- **Dashboard**: kartu statistik: Total pengunjung, **Order Template**, **Project Custom**, Total pengguna, Total
  pendapatan (semua data asli; hapus angka delta palsu, ganti dengan info nyata mis. "+3 bulan ini"). Baris bawah:
  tabel Project Clients (ringkas, tautan ke halaman Project Clients) + daftar **Order Template Terbaru** di sampingnya.

## 10. Aturan kerja agen

- Hanya edit file milikmu (lihat pembagian di prompt). Butuh perubahan di file orang lain → tulis di laporan
  (bagian "Butuh dari agen lain"), jangan edit.
- Pakai Edit (bukan Write ulang) untuk file yang sudah ada; baca ulang sebelum edit.
- Jangan commit/push. Jangan mematikan server dev (Vite :5173, PHP :8000).
- Teks UI Bahasa Indonesia. Publik & akun pembeli memakai "Anda"; panel admin memakai "kamu" (sudah begitu).
- Selesai = `npx tsc -b` bersih untuk file milikmu, PHP `php -l`, Node `node --check`, dan uji yang relevan.
