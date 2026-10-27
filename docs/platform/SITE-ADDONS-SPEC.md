# Fitur tambahan berbayar: Berita & Pengumuman (template sekolah)

Permintaan pemilik (2026-10-27):
- Berita & pengumuman pada template sekolah menjadi **fitur berbayar**. Saat template dibeli, fitur ini **terkunci**.
- Pembeli membelinya lewat **menu dan halaman baru** di panel akun. Setelah pembayaran lunas, fitur **langsung aktif** di CMS.
- Selama belum dibeli, template memakai **berita biasa**: daftar berita/pengumuman dari konten CMS (seperti template lain).
- Setelah aktif, section berita & pengumuman di situs **diganti tampilan yang lebih profesional**, ditambah halaman
  `/berita`, `/pengumuman`, dan halaman tiap tulisan.

Fitur tulisan yang sudah ada (docs/platform/SITE-POSTS-SEO-SPEC.md) tetap dipakai: tabel `site_posts`, CMS
`/akun/situs/:id/berita`, `site.php`. Spesifikasi ini hanya menambah **gerbang** (aktif/tidak per situs), **pembelian**,
dan **tampilan profesional**. SEO situs (`/akun/situs/:id/seo`) tetap gratis untuk semua template.

## 1. Istilah

| Istilah | Arti |
|---|---|
| Template mampu | Template dengan fitur tulisan: `madani`, `cakrawala`, `bestari`, `jumantara`, `nawasena`, `pradipta` (`SP_POST_TEMPLATE_CODES` / `POST_TEMPLATE_CODES` / `features.posts`). |
| Fitur aktif | Situs punya baris `site_addon_orders` dengan `addon_code='posts'`, `status='lunas'`, `revoked_at IS NULL`. |
| Tulisan aktif | Template mampu **dan** fitur aktif. Hanya dalam keadaan ini tulisan dibaca/ditulis/ditampilkan. |

Kode fitur: `posts`. Nama tampilan: **Berita & Pengumuman**. Nomor tagihan: `GNF-YYYYMMDD-XXXXXX` (pakai
`pf_new_order_number('GNF')` / padanannya di Node). Order id Midtrans: `{addon_number}-{percobaan}` (sama dengan
perpanjangan `GNR-`). Nomor nota: `INV-{addon_number}` (`invoiceNumberFor`).

Harga: setting `addon_posts_price` (hero_settings, rupiah bulat). Kosong, tidak valid, atau 0 → bawaan **350000**.
Dibaca sama persis di PHP (`sa_price`), Node (`addonPrice`) dan frontend (`addonPostsPrice`): trim ala PHP, angka
`^\d+(\.\d+)?$`, dibulatkan dari teksnya (digit desimal pertama ≥ 5 → naik, tanpa float), maksimal 1e12.
**Sekali bayar**, aktif selama situsnya aktif (tidak ada masa aktif terpisah). Setting ini publik (ikut `get_settings`),
karena dipakai halaman Harga.

## 2. Data (migrasi `2026-10-27_030_site_addons.sql`)

```sql
CREATE TABLE IF NOT EXISTS site_addon_orders (
  id                     INT NOT NULL AUTO_INCREMENT,
  addon_number           VARCHAR(40) NOT NULL,          -- 'GNF-YYYYMMDD-XXXXXX' (migrasi: 'GNF-MIGRASI-{site_id}')
  site_id                INT NOT NULL,                  -- template_sites.id
  order_id               INT NOT NULL,                  -- template_orders.id situs itu (nota, log riwayat)
  user_id                INT NOT NULL,
  addon_code             VARCHAR(20) NOT NULL,          -- 'posts'
  price                  DECIMAL(15,2) NOT NULL,        -- Midtrans gross_amount; 0 = hadiah admin / migrasi
  status                 ENUM('menunggu_pembayaran','lunas','dibatalkan') NOT NULL DEFAULT 'menunggu_pembayaran',
  pending_key            VARCHAR(40) DEFAULT NULL,      -- '{site_id}:{addon_code}' selama menunggu_pembayaran, NULL sesudahnya
  source                 VARCHAR(12) NOT NULL DEFAULT 'beli',   -- 'beli' | 'admin' | 'migrasi'
  payment_status         VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_type           VARCHAR(40) DEFAULT NULL,
  midtrans_order_id      VARCHAR(60) DEFAULT NULL,
  payment_attempt        INT NOT NULL DEFAULT 0,
  snap_token             VARCHAR(255) DEFAULT NULL,
  payment_url            VARCHAR(500) DEFAULT NULL,
  payment_created_at     DATETIME DEFAULT NULL,
  paid_at                DATETIME DEFAULT NULL,         -- juga waktu aktif untuk source admin/migrasi
  paid_midtrans_order_id VARCHAR(60) DEFAULT NULL,
  cancelled_at           DATETIME DEFAULT NULL,
  revoked_at             DATETIME DEFAULT NULL,         -- dinonaktifkan admin (refund, kesalahan); baris tetap untuk nota
  granted_by             INT DEFAULT NULL,              -- users.id staf (source admin)
  note                   VARCHAR(255) NOT NULL DEFAULT '',
  created_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_addon_number (addon_number),
  UNIQUE KEY uq_addon_midtrans (midtrans_order_id),
  UNIQUE KEY uq_addon_pending (pending_key),
  KEY idx_addon_site (site_id, addon_code, status),
  KEY idx_addon_user (user_id),
  KEY idx_addon_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Migrasi juga:
- **Mewariskan** fitur ke situs yang sudah punya tulisan (fitur tulisan sudah live sejak 2026-10-26, gratis):
  `INSERT IGNORE INTO site_addon_orders (addon_number, site_id, order_id, user_id, addon_code, price, status, source,
  payment_status, paid_at, note) SELECT CONCAT('GNF-MIGRASI-', s.id), s.id, s.order_id, s.user_id, 'posts', 0, 'lunas',
  'migrasi', 'settlement', NOW(), 'Sudah memakai berita sebelum fitur berbayar' FROM template_sites s WHERE EXISTS
  (SELECT 1 FROM site_posts p WHERE p.site_id = s.id)`.
- `INSERT IGNORE INTO schema_migrations` versi `2026-10-27_030`.
- Memperbarui `database/schema.sql` (tabel + baris baseline) dan `database/README.md`.

Tidak ada ALTER dan tidak ada prosedur (aman lewat phpMyAdmin). Tanpa foreign key (konvensi marketplace).

Kode harus tahan tabel belum ada (errno 1146): dianggap **tidak ada fitur aktif** untuk situs, dan aksi beli menjawab
503 `ADDONS_NOT_READY` ("Fitur tambahan belum siap. Coba lagi nanti."). Jangan sampai 500.

## 3. Gerbang (PHP dan Node setara)

Helper bersama (modul baru `backend/modules/site_addons.php` / `site_addons.js`):
- PHP `sa_addon_active(mysqli $conn, int $siteId, string $code): bool`, Node `addonActive(pool, siteId, code)`.
- PHP `sa_posts_enabled(mysqli $conn, array $site): bool` = template mampu && fitur aktif; Node `postsEnabled(pool, site)`.

Perubahan perilaku:
| Tempat | Sebelum | Sesudah |
|---|---|---|
| `customer_get_site_posts`, `customer_save_site_post`, `customer_delete_site_post` | template mampu → boleh | template tidak mampu → 403 `POSTS_UNAVAILABLE` (tetap); mampu tapi fitur tidak aktif → 403 `POSTS_LOCKED`, pesan: "Fitur Berita & Pengumuman belum aktif untuk situs ini. Aktifkan di menu Fitur tambahan." |
| `get_site_posts` (publik) | template mampu → tulisan | tulisan aktif → tulisan; selain itu `{posts: [], total: 0}` |
| `get_site_post`, `site_post_view` (publik) | template mampu → tulisan | tulisan aktif → tulisan; selain itu 404 `POST_NOT_FOUND` |
| `get_site_public` | `{site: {id, template_code, domain, content}}` | ditambah `addons: {posts: bool}` (= tulisan aktif) |
| `customer_get_site` | `site` tanpa info fitur | `site.addons: {posts: bool}` dan `site.posts_capable: bool` (template mampu) |
| `site.php` | rute `/berita…` hidup bila `site_defaults.json` `posts` | hidup hanya bila `posts` **dan** fitur aktif (kueri `site_addon_orders`; tabel tidak ada = tidak aktif). Sitemap, preload, robots daftar, dan 404 mengikuti. **Jenis organisasi JSON-LD `School` tetap mengikuti kemampuan template** (`site_defaults.json`), bukan fitur. |

Tulisan yang sudah ada **tidak dihapus** saat fitur tidak aktif (mis. dicabut admin); hanya disembunyikan dan tampil lagi
saat aktif kembali. SEO situs tidak terpengaruh.

## 4. API fitur tambahan

Error mengikuti konvensi `{error, code, errors?}`. Rate limit: beli/bayar/batal maks 20 per jam per pengguna
(`sa-pay|{user}`), pola `rate_limit_wait/hit` / `createLimiter`.

### 4.1 Pembeli (`CUSTOMER_ACTIONS`)
| Aksi | Metode | Input | Output |
|---|---|---|---|
| `customer_get_site_addons` | GET | `site_id` (opsional) | `{sites: AddonSite[], price: {posts}}`. Semua situs milik pembeli (status apa pun kecuali tidak ada), terbaru dulu; dengan `site_id` hanya situs itu (bukan miliknya → 404 `SITE_NOT_FOUND`). |
| `customer_buy_site_addon` | POST | `{site_id, addon}` | `{addon_order: AddonOrder, payment_url: string|null, payment_error?: string}` |
| `customer_pay_site_addon` | POST | `{addon_number}` | `{payment_url}` |
| `customer_cancel_site_addon` | POST | `{addon_number}` | `{addon_order}` |
| `dev_simulate_site_addon_payment` | POST | `{addon_number}` | `{addon_order, site: AddonSite}`; hanya bila `MIDTRANS_SIMULATOR=1` (selain itu 403 `SIMULATOR_DISABLED`) |

`AddonSite` = `{site_id, domain, template_code, template_name, order_number, site_status, addons: [AddonState]}`.
`AddonState` = `{code: 'posts', name: 'Berita & Pengumuman', price, capable, active, activated_at, source: 'beli'|'admin'|'migrasi'|null, purchase: AddonOrder|null (baris lunas aktif terbaru), pending: AddonOrder|null}`.
`AddonOrder` = `{addon_number, site_id, order_number, addon_code, price, status, status_label, source, payment_status, payment_type, payment_url, paid_at, cancelled_at, revoked_at, created_at, invoice_number (lunas & price>0, selain itu null)}`.

Aturan `customer_buy_site_addon`:
- `addon` harus `posts` (selain itu 400 `VALIDATION` `errors.addon`).
- Situs milik pembeli, `status='active'` (nonaktif → 409 `SITE_SUSPENDED`), template mampu (selain itu 403 `ADDON_UNAVAILABLE` "Fitur ini hanya untuk template sekolah.").
- Sudah aktif → 409 `ADDON_ACTIVE` ("Fitur ini sudah aktif di situs Anda."). Ada tagihan menunggu → 409 `ADDON_PENDING` ("Masih ada tagihan fitur ini yang menunggu pembayaran. Bayar atau batalkan dulu."). Bentrok `pending_key` saat INSERT juga → `ADDON_PENDING`.
- Harga = setting saat dibuat (`price` tersimpan di baris). Snap Midtrans: satu item `ADDON-posts`, nama "Fitur Berita & Pengumuman {domain}" (dipotong 50 karakter seperti item lain), customer dari akun. `callbacks.finish` = `{APP_URL}/akun/fitur`.
- Midtrans belum dikonfigurasi: baris tetap dibuat, `payment_url: null`, `payment_error` berisi pesan (pola perpanjangan).
- Log pesanan (`template_order_logs`, order situs): `addon_created` / `addon_paid` / `addon_cancelled` / `addon_granted` / `addon_revoked`, catatan "Fitur Berita & Pengumuman {addon_number} …". Kelima event ini masuk `PF_CUSTOMER_NOTE_EVENTS` kecuali `addon_revoked` dan `addon_granted` (catatan internal), dan punya kalimat pembeli di `orderCopy.ts`.

Pembayaran (pola `pf_renewal_notification` / `pf_apply_renewal_payment`):
- `midtrans_notification` dengan order id berawalan `GNF-` → handler fitur. Tanda tangan sudah diperiksa di jalur bersama; status dikonfirmasi lewat Status API seperti perpanjangan.
- Lunas (`settlement`, atau `capture` + `accept`): transisi `menunggu_pembayaran → lunas` bersyarat (UPDATE … WHERE status='menunggu_pembayaran'), isi `paid_at`, `paid_midtrans_order_id`, `pending_key = NULL`, log `addon_paid`. Bayar setelah dibatalkan/percobaan lama/dobel → catatan log untuk tim (pola perpanjangan), tidak mengaktifkan dua kali.
- `capture` (ditinjau) → `payment_status='capture'`; `customer_pay_site_addon` → 409 `PAYMENT_UNDER_REVIEW`.
- `expire`/`cancel`/`deny` percobaan saat ini → status tetap menunggu (pembeli bisa bayar ulang), `payment_status` diperbarui.
- Batal pembeli: `menunggu_pembayaran → dibatalkan`, `pending_key=NULL`, `cancelled_at`, expire Snap (pola `pf_midtrans_expire`).

### 4.2 Admin (`ADMIN_ACTIONS`, khusus peran admin)
| Aksi | Metode | Input | Output |
|---|---|---|---|
| `admin_set_site_addon` | POST | `{site_id, addon, active: bool, note?}` | `{addons: AddonState[]}` situs itu |

- `active=true` dan belum aktif → INSERT baris `source='admin'`, `price=0`, `status='lunas'`, `paid_at=NOW()`, `granted_by`, log `addon_granted`. Ada tagihan menunggu → dibatalkan dulu (pola batal).
- `active=false` → `revoked_at=NOW()` pada semua baris lunas aktif, log `addon_revoked`. Tidak ada refund otomatis.
- `admin_get_template_order` menambah `addons: AddonState[]` (situs pesanan itu; kosong bila belum ada situs) dan
  `addon_orders: AddonOrder[]` (semua baris, terbaru dulu).

### 4.3 Nota
- `customer_get_invoices` menambah item `type: 'fitur'` untuk baris lunas dengan `price > 0` (judul "Fitur Berita & Pengumuman", `years: null`, `renewal_number: null`, `addon_number`).
- `customer_get_invoice` menerima `addon_number` (bersama `order_number`) → `{order, addon: AddonOrder, company}`.
  Dicabut admin tetap bisa dilihat notanya (status "Dinonaktifkan").
- Rute nota klien: `/akun/pesanan/:orderNumber/nota/:docNumber` — `docNumber` berawalan `GNR-` = perpanjangan,
  `GNF-` = fitur tambahan.

## 5. Panel akun

- Sidebar grup **Layanan**: item baru **Fitur tambahan** (`/akun/fitur`, ikon `Sparkles`), setelah "Proyek saya".
  Breadcrumb "Fitur tambahan".
- **`/akun/fitur`** (`AccountAddons.tsx`):
  - Judul "Fitur tambahan", subjudul singkat.
  - Kartu fitur "Berita & Pengumuman" berisi: harga (sekali bayar, aktif selama situs aktif), daftar manfaat (halaman
    berita & pengumuman sendiri; foto, kategori, label Penting; SEO per tulisan; jumlah dilihat; tampilan beranda
    profesional), tautan "Lihat contoh tampilan" ke demo template dengan `?fitur=berita`.
  - Per situs milik pembeli dengan template mampu: baris status — **Terkunci** (tombol "Beli & aktifkan"),
    **Menunggu pembayaran** (Bayar Sekarang / Simulasikan (mode uji) / Batalkan dengan ConfirmDialog; `capture` = ditinjau
    bank, tanpa Bayar), **Aktif** (sejak tanggal, "Kelola berita" → `/akun/situs/:id/berita`, "Lihat nota" bila ada).
  - Situs template lain: tidak ditampilkan; bila tidak ada situs mampu sama sekali → keadaan kosong yang menjelaskan
    fitur ini khusus template sekolah (+ tautan katalog).
  - `?situs=33` → gulir & fokus ke baris situs itu.
  - Kembali dari Midtrans (`?order_id=GNF-…`): muat ulang tiap 10 detik maks. 2 menit sampai lunas, lalu pemberitahuan
    "Fitur Berita & Pengumuman aktif." (pola perpanjangan); gagal/kedaluwarsa → peringatan, tagihan bisa dibayar ulang.
- **`/akun/situs/:id/berita` dan editor tulisan**: bila `POSTS_LOCKED` (atau `site.addons.posts=false` dan mampu) →
  panel terkunci: penjelasan singkat, harga (hanya bila `get_settings` berhasil dimuat), "Aktifkan sekarang" →
  `/akun/fitur?situs={id}`. Tanpa daftar/form.
- **`SiteNav`**: pil "Berita & Pengumuman" tetap tampil untuk template mampu; tidak aktif → ikon gembok + teks sr
  "(terkunci)".
- **Editor konten (`SiteEditor`)**: Notice "Kelola berita/pengumuman lengkap … di menu Berita & Pengumuman" hanya bila
  fitur aktif. Tidak aktif → Notice ajakan: "Berita di bawah ini tampil sebagai berita biasa. Aktifkan fitur Berita &
  Pengumuman untuk halaman berita sendiri dan tampilan profesional." + tautan ke `/akun/fitur?situs={id}`.
  Pratinjau (`PreviewPane`) memakai `postsEnabled` = template mampu dan `site.addons.posts`: bila aktif, section
  profesional dibangun dari item CMS yang sedang diedit, tanpa permintaan `get_site_posts`, tanpa tautan detail, dan
  tanpa `site_visit` (sama dengan demo `?fitur=berita`).
- **Nota**: `/akun/nota` menampilkan item `fitur`; halaman nota menangani `GNF-`.

## 6. Tampilan situs (template)

- `SiteData` mendapat `postsEnabled: boolean` (bawaan `false`). `SiteRenderer` mengisinya dari `site.addons.posts`.
- **Tidak aktif (berita biasa):** tidak meminta `get_site_posts`; `posts` = `null` (item CMS); rute `/berita…` →
  "Halaman tidak ditemukan" (`{kind:'notfound'}`), sama dengan site.php. Section template tampil seperti sekarang dari
  item CMS (tanpa tautan ke halaman tulisan).
- **Aktif (profesional):** section berita & pengumuman template diganti komponen bersama baru di
  `src/templates/shared/posts/pro/` yang diberi tema per template (`POST_THEME`/token warna & font template):
  - `ProNewsSection` — "newsroom": berita utama besar (foto, chip kategori, tanggal, judul, ringkasan), 3–4 berita
    berikutnya di samping/bawah (thumbnail + judul + tanggal), chip filter kategori (dari tulisan yang dimuat), tombol
    "Lihat semua berita" → `/berita`.
  - `ProAnnouncementsSection` — "papan pengumuman": blok tanggal (tgl/bulan), label (Penting/Wajib/… dengan warna),
    judul, ringkasan, "Lihat detail"; tombol "Lihat semua pengumuman" → `/pengumuman`.
  - Sumber data sama: tulisan bila ada; bila belum ada tulisan terbit → item CMS dalam tata letak profesional (tanpa
    tautan detail).
  - Agenda (Madani Board) dan bagian lain section yang bukan pengumuman tetap.
- **Halaman daftar `/berita`, `/pengumuman` (aktif):** pencarian judul, filter kategori/label, "Muat lebih banyak"
  (12 per langkah dari ≤100 yang dimuat). **Halaman tulisan:** waktu baca, tombol bagikan (WhatsApp, Facebook, X, salin
  tautan), "Berita lainnya"/"Pengumuman lainnya" (3 terbaru selain tulisan itu). Tetap satu H1, aturan SEO §5 spesifikasi
  tulisan tidak berubah.
- **Demo** `/demo/{slug}?fitur=berita` (template mampu): `postsEnabled=true` tanpa tulisan → section profesional dari
  item CMS bawaan, tanpa tautan detail. Tanpa query = berita biasa.

## 7. Admin

- Pengaturan website → tab **Harga template**: isian "Fitur Berita & Pengumuman (sekali bayar)" (`addon_posts_price`,
  number, min 0, step 1000, kosong/0 = bawaan Rp350.000), disimpan bersama setting lain.
- Drawer pesanan (template aktif / order masuk): bagian **Fitur tambahan** — status Berita & Pengumuman (aktif sejak …,
  sumber beli/admin/migrasi, nomor tagihan), riwayat `addon_orders`, tombol **Aktifkan gratis** / **Nonaktifkan**
  (ConfirmDialog; memanggil `admin_set_site_addon`). Hanya untuk template mampu dengan situs. Tombol hanya untuk peran
  admin; staf lain melihat status dan riwayat dengan catatan "Hanya admin yang bisa mengaktifkan atau menonaktifkan
  fitur."
- Halaman publik **Harga**: baris/kalimat "Fitur tambahan template sekolah: Berita & Pengumuman, {harga} sekali bayar"
  dari setting.

## 8. Tes

- Backend (PHP=Node, dua server, simulator Midtrans): beli → simulasikan → aktif; gerbang `POSTS_LOCKED`; publik
  kosong/404 saat tidak aktif; batal; `ADDON_ACTIVE`/`ADDON_PENDING`/`ADDON_UNAVAILABLE`; admin aktifkan/nonaktifkan;
  nota & daftar nota; notifikasi `GNF-` dengan tanda tangan; tabel belum ada → tidak 500.
- `site.php`: situs mampu tanpa fitur → `/berita` 404, sitemap tanpa tulisan, preload tanpa daftar; dengan fitur → seperti
  sebelumnya. Migrasi pewarisan.
- Klien: `/akun/fitur` (terkunci/menunggu/aktif/kembali dari Midtrans), panel terkunci di berita, SiteNav gembok, menu
  sidebar; template basic vs pro (section pro muncul hanya saat `postsEnabled`), rute notfound saat tidak aktif, demo
  `?fitur=berita`; admin isian harga & tombol aktifkan.
