# Database — Garuda Nexa Bahtera

Semua yang menyangkut struktur database `db_garudanexabahtera` ada di folder ini.
Backend: `backend/server.js` (produksi, MySQL 8 di docker) dan `backend/api.php` (lokal, MariaDB XAMPP).

```
database/
├── schema.sql          # SKEMA KANONIK: satu-satunya sumber kebenaran struktur tabel
├── seed.sql            # data awal minimal untuk DB baru (idempoten, tanpa akun admin)
├── seed.templates.sql  # CONTOH katalog: 2 Company Profile + Arena Club, Aura Studio, Finova, Serenity, TaniMakmur (harga contoh, idempoten)

├── seed.templates.sql  # CONTOH katalog: 2 Company Profile + Arena Club, Aura Studio, Finova, Serenity, SkyNusa (harga contoh, idempoten)
├── seed.local.sql      # KHUSUS LOKAL, di-gitignore (database/*.local.sql): akun uji XAMPP
├── migrations/         # perubahan untuk DB yang SUDAH ada, dijalankan berurutan
│   ├── 2026-10-19_001_align_schema_with_backend.sql
│   ├── 2026-10-19_002_navbar_anchor_urls.sql
│   ├── 2026-10-19_003_navbar_top_level_links.sql
│   ├── 2026-10-19_004_template_marketplace.sql
│   ├── 2026-10-19_005_drop_monitoring_tables.sql   # BELUM DISETUJUI, jangan dijalankan (lihat bawah)
│   ├── 2026-10-21_006_project_documents.sql        # dokumen proyek (pd_*), lihat bawah
│   ├── 2026-10-22_007_template_previews.sql        # data: pratinjau template .webp (tangkapan layar asli)
│   ├── 2026-10-22_008_new_templates.sql            # data: katalog Arena Club, Aura Studio, Finova (DB lama)
│   ├── 2026-10-23_009_seo_faq_contact.sql          # data: FAQ (hosting/SSL/waktu), placeholder WhatsApp, hero & CTA lama
│   ├── 2026-10-23_010_visit_referrer.sql           # visitor_logs + referrer_host, landing_path, utm_source (sumber kunjungan)
│   ├── 2026-10-23_011_seo_navbar.sql               # data: navbar Template, Jasa ▾, Harga, Panduan (halaman nyata)
│   ├── …                                           # 012–025: lihat catatan per migrasi di bawah
│   ├── 2026-10-25_026_domain_renewal_profile.sql   # domain berbayar, masa aktif, template_renewals, profil pembeli
│   └── 2026-10-25_027_google_sign_in.sql           # users.google_sub: masuk & daftar pembeli dengan Google
└── legacy/
    └── unused_tables.sql   # tabel lama yang masih ada di DB tapi tidak dipakai kode
```

File SQL lama di root (`database.sql`, `init.sql`, `monitoring_migration.sql`) dan
`backend/update_schema.sql` sudah **DEPRECATED** dan tidak dipakai di mana pun lagi.
Jangan dijalankan; boleh dihapus kapan saja (isinya tetap ada di riwayat git).

## Instalasi baru (DB kosong)

```bash
mysql -u root -e "CREATE DATABASE db_garudanexabahtera CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root db_garudanexabahtera < database/schema.sql
mysql -u root db_garudanexabahtera < database/seed.sql
# opsional: contoh katalog template (harga contoh, ubah dari panel admin)
mysql -u root db_garudanexabahtera < database/seed.templates.sql
```

Di XAMPP, `mysql` ada di `C:/xampp/mysql/bin/mysql.exe`. Lewat phpMyAdmin: pilih
database dulu, lalu Import `schema.sql`, kemudian `seed.sql`.

`schema.sql` sudah mencakup semua migrasi sampai versi terakhir yang tercatat di
tabel `schema_migrations`, jadi DB baru tidak perlu menjalankan folder `migrations/`.

### Membuat akun admin pertama

`seed.sql` sengaja tidak membuat admin (password bawaan di file yang di-commit = celah).
Buat hash bcrypt dari folder `backend/` (memakai bcryptjs yang juga dipakai server):

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "PasswordYangKuat"
```

Lalu:

```sql
INSERT INTO users (name, email, password, role, status)
VALUES ('Administrator', 'admin@garudanexa.com', '<hash dari perintah di atas>', 'admin', 'active');
```

### Akun uji lokal (XAMPP saja)

`database/seed.local.sql` berisi akun uji (role admin & user) untuk pengembangan lokal.
File ini di-gitignore (`database/*.local.sql`) dan **tidak boleh** dijalankan di produksi:

```bash
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/seed.local.sql
```

## Menerapkan migrasi ke DB yang sudah ada

Aturan: **selalu backup dulu**, jalankan file di `migrations/` urut berdasarkan nama.
Setiap migrasi idempoten (aman dijalankan ulang) dan mencatat dirinya di `schema_migrations`.
Cek yang sudah terpasang: `SELECT * FROM schema_migrations;` (kalau tabelnya belum ada, belum ada migrasi yang dijalankan).

### Lokal (XAMPP)

```bash
C:/xampp/mysql/bin/mysqldump.exe -u root --single-transaction --routines --triggers db_garudanexabahtera > backups/db_local_<tanggal>.sql
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/migrations/2026-10-19_001_align_schema_with_backend.sql
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/migrations/2026-10-19_002_navbar_anchor_urls.sql
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/migrations/2026-10-19_003_navbar_top_level_links.sql
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/migrations/2026-10-19_004_template_marketplace.sql
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/seed.templates.sql   # opsional, contoh katalog
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-21_006_project_documents.sql
C:/xampp/mysql/bin/mysql.exe -u root db_garudanexabahtera < database/migrations/2026-10-22_007_template_previews.sql
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-22_008_new_templates.sql
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-23_009_seo_faq_contact.sql
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-23_010_visit_referrer.sql
C:/xampp/mysql/bin/mysql.exe -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-23_011_seo_navbar.sql
```

`2026-10-23_011` (data saja, SEO WP5) sekali jalan: menu atas menjadi Template (`/template`) · Jasa ▾ (Website custom,
Aplikasi mobile) · Harga (`/harga`) · Panduan (`/panduan`). Baris hanya diubah selama label dan URL-nya masih bawaan 004/003
(Projects, Proses, FAQ dinonaktifkan, tidak dihapus); baris baru hanya ditambah bila belum ada. Navbar kosong dibiarkan
kosong (menu bawaan frontend sudah berstruktur sama). Dijalankan ulang = tidak mengubah apa pun.

`2026-10-23_010` (skema, SEO WP9) menambah tiga kolom nullable di `visitor_logs`: `referrer_host` (host saja, tanpa
`www.`, path, atau query), `landing_path` (path halaman pertama sesi, tanpa query) dan `utm_source`. Dipakai panel
"Sumber kunjungan" di Analitik pengunjung (30 hari terakhir). Kolom ditambah lewat cek `information_schema`, jadi aman
diulang. Kode tetap jalan tanpa kolom ini (kunjungan dicatat tanpa sumber), tapi jalankan saat deploy kode WP9. Query
kunjungan per sumber per bulan ada di kepala file migrasinya.

`2026-10-23_009` (data saja, SEO WP6) hanya mengubah nilai yang masih sama persis dengan teks bawaan lama: jawaban FAQ
`faq_data` (hosting/domain, SSL, waktu aktif, edit, kepemilikan) disamakan dengan `src/content/faq.ts`,
`contact_whatsapp=628123456789` menjadi `6285188009152`, `hero_title`/`hero_subtitle` bahasa Inggris dikosongkan (beranda
memakai judul bawaan), dan `cta_title` lama menjadi "Konsultasi gratis untuk website atau aplikasi Anda". Nilai yang sudah
diubah admin tidak disentuh; aman diulang.

`2026-10-22_008` (data saja) membuat/menyamakan baris katalog `arena-club`, `aura-studio`, `finova` berdasarkan slug;
menjalankan ulang MENIMPA perubahan admin pada tiga baris itu. Jalankan setelah kode yang mendaftarkan ketiga
`template_code` ter-deploy. DB baru tidak membutuhkannya: barisnya sudah ada di `seed.templates.sql` (karena itu 008
tidak dicatat sebagai baseline di `schema.sql`).

`2026-10-25_026` (skema + sedikit data, docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md): domain tidak lagi termasuk harga
template. Menambah `template_orders.domain_price`/`domain_check`, masa aktif `service_*`/`domain_*` (pesanan `aktif` diisi
dari `activated_at` + 1 tahun), tabel `template_renewals` (perpanjangan 1–3 tahun lewat Midtrans), `users.company_name`/
`address`/`city` (halaman Profil), dan menghapus baris "Domain tahun pertama" dari setting `template_price_includes` bila
ada. Idempoten. Jalankan SEBELUM deploy kode yang memakainya; folder unggahan foto profil `public/assets/avatars/` tidak
ikut git maupun deploy.

`2026-10-25_027` (skema saja, docs/platform/GOOGLE-LOGIN.md): `users.google_sub` (id akun Google, `ascii_bin`, NULL)
dengan `UNIQUE KEY uq_users_google_sub`, untuk tombol "Daftar/Login dengan Google" di `/daftar` dan `/masuk`. Idempoten.
Jalankan SEBELUM deploy kode yang memakainya (`customer_google_auth` membaca kolom ini). Client ID Google tidak ada di
migrasi: diisi pemilik lewat setting `google_client_id` atau env `GOOGLE_CLIENT_ID` (GOOGLE-LOGIN.md §3).

`2026-10-25_018` (data saja) membuat/menyamakan baris katalog `serenity` (template wellness) berdasarkan slug, pola sama
dengan 008: menjalankan ulang MENIMPA perubahan admin pada baris itu. Jalankan setelah kode yang mendaftarkan
`template_code` `serenity` ter-deploy. DB baru cukup `seed.templates.sql`.

`2026-10-25_020` (data saja) membuat/menyamakan baris katalog `tanimakmur` (toko online pertanian) berdasarkan slug, pola
sama dengan 018: menjalankan ulang MENIMPA perubahan admin pada baris itu. Jalankan setelah kode yang mendaftarkan
`template_code` `tanimakmur` ter-deploy. DB baru cukup `seed.templates.sql`.

`2026-10-25_021` (data saja) membuat/menyamakan baris katalog `puncakgear` (toko perlengkapan mendaki, kategori Toko
Online) berdasarkan slug, pola sama dengan 018: menjalankan ulang MENIMPA perubahan admin pada baris itu. Jalankan
setelah kode yang mendaftarkan `template_code` `puncakgear` ter-deploy. DB baru cukup `seed.templates.sql`.

`2026-10-25_022` (data saja) membuat/menyamakan baris katalog `gadgetku` (GadgetKu.id, toko aksesoris HP, kategori Toko
Online) berdasarkan slug, pola sama dengan 018. Jalankan setelah kode yang mendaftarkan `template_code` `gadgetku`
ter-deploy. DB baru cukup `seed.templates.sql`.

`2026-10-25_023` (data saja) membuat/menyamakan baris katalog `glowstory` (toko online kecantikan, kategori Toko Online)
berdasarkan slug, pola sama dengan 018. Jalankan setelah kode yang mendaftarkan `template_code` `glowstory` ter-deploy.

`2026-10-25_019` (data saja) membuat/menyamakan baris katalog `skynusa` (toko drone, kategori "Toko Online") berdasarkan
slug, pola sama dengan 018: menjalankan ulang MENIMPA perubahan admin pada baris itu. Jalankan setelah kode yang
mendaftarkan `template_code` `skynusa` ter-deploy. DB baru cukup `seed.templates.sql`.

`2026-10-25_024` (data saja) membuat/menyamakan baris katalog `madani` (website sekolah Islam SMA/MA, kategori baru
"Sekolah & Pendidikan", Rp1.690.000, sort_order 12) berdasarkan slug, pola sama dengan 018: menjalankan ulang MENIMPA
perubahan admin pada baris itu. Jalankan setelah kode yang mendaftarkan `template_code` `madani` ter-deploy. DB baru cukup
`seed.templates.sql`.

`2026-10-25_025` (data saja) membuat/menyamakan baris katalog `cakrawala` (website SMK/SMA, kategori "Sekolah &
Pendidikan", sort_order 13) berdasarkan slug, pola sama dengan 018: menjalankan ulang MENIMPA perubahan admin pada baris
itu. Jalankan setelah kode yang mendaftarkan `template_code` `cakrawala` ter-deploy. DB baru cukup `seed.templates.sql`.

DB lokal sudah memakai 004 + `seed.templates.sql` (backup sebelumnya: `backups/db_local_2026-10-20_00-00-56_pre-004.sql`).

Koneksi DB lokal di `.env` (root XAMPP tanpa password), dibaca `api.php` di setiap request dan oleh
`node --env-file=../.env server.js`:

```env
MYSQL_HOST=localhost
MYSQL_PASS=
```

`MYSQL_PASS=` harus ada walau kosong (server.js berhenti kalau variabelnya tidak ada) dan jangan diisi
password asli: `.env` lokal dipakai bersama, `api.php` di :8000 langsung gagal (500, "Access denied") kalau
password-nya tidak cocok dengan XAMPP. Password produksi diambil docker-compose dari `MYSQL_ROOT_PASSWORD`
di `.env` server, bukan dari baris ini.

### Migrasi 004 — marketplace template (ringkas)

- Tabel baru `templates`, `template_orders`, `template_sites`, `template_order_logs` (detail: `docs/platform/SPEC.md` §3–§6).
- `users.role` menerima `customer` (akun pembeli dari `/daftar`).
- `project_client` + `show_on_website` (tampil di section Projects) dan `source` (`admin` / `website` = dari form pesanan custom).
- Data (hanya sekali, selama 004 belum tercatat): navbar menjadi Template · Projects · Proses · FAQ. Baris "Produk" dipakai
  ulang jadi Template, "Portofolio" jadi Projects; Harga, Perusahaan, dan semua sub-menu hanya **dinonaktifkan**
  (`is_active = 0`, bisa diaktifkan lagi dari Kelola navbar). Jawaban `faq_data` yang menyebut harga/paket jasa custom
  ditulis ulang netral.
- Rollback: restore backup. Kode backend lama tidak memakai tabel baru, jadi 004 aman dipasang sebelum deploy kode baru.
  Sebaliknya, kode baru **butuh** 004 (deploy kode setelah migrasi).

### Migrasi 005 — hapus tabel monitoring (BELUM DISETUJUI)

`2026-10-19_005_drop_monitoring_tables.sql` menghapus permanen 25 tabel fitur Monitoring Server yang sudah dihapus
dari kode. **Jangan dijalankan sebelum pemilik proyek menyetujui dan backup dibuat.** Tabelnya:

- `monitor_*` (13): monitor_ai_agents, monitor_ai_logs, monitor_ai_usage, monitor_audit_logs, monitor_error_center,
  monitor_errors, monitor_notifications, monitor_pings, monitor_server_logs, monitor_servers, monitor_ssl,
  monitor_website_logs, monitor_websites
- `monitoring_*` (12): monitoring_api, monitoring_api_logs, monitoring_categories, monitoring_database, monitoring_domains,
  monitoring_notifications, monitoring_security_logs, monitoring_server_metrics, monitoring_server_status,
  monitoring_settings, monitoring_website_checks, monitoring_websites

Setelah 005 dijalankan: hapus bagian "DEPRECATED, akan dihapus oleh migrasi 005" di `schema.sql` dan tambahkan baris
baseline `2026-10-19_005` di sana.

### Migrasi 006 — enkripsi akun produk (`list_products.users`, data, lewat API)

Kolom `list_products.users` berisi akun login produk klien (`[{username, password, keterangan}]`). Kolom ini sekarang
disimpan terenkripsi AES-256-GCM (`enc:v1:...`, format di `backend/modules/list_products.js` / `.php`) dengan kunci
`LIST_PRODUCTS_KEY` dari `.env`. Kuncinya ada di server, bukan di DB, jadi migrasi ini bukan file SQL: baris lama
dienkripsi oleh aksi admin `encrypt_list_products` (sama di api.php dan server.js, aman dijalankan ulang).

- Publik (`get_list_products`) hanya mengirim `id, title, description, link_button, image, logo`, tidak pernah `users`.
- Akun hanya dibaca lewat `get_list_product_detail` (login staf, sudah didekripsi). `add_list_product` /
  `update_list_product` selalu mengenkripsi `users` sebelum disimpan. Baris lama yang belum dienkripsi tetap terbaca.
- Tanpa `LIST_PRODUCTS_KEY`: daftar publik tetap jalan; membaca akun terenkripsi atau menyimpan `users` → HTTP 503
  `NOT_CONFIGURED`. Kunci salah → HTTP 500 `DECRYPT_FAILED`.

Langkah (produksi cPanel: `.env` di `/home/garudanexa/.env`; docker: `.env` di samping `docker-compose.yml`):

1. Backup DB (phpMyAdmin Export atau `mysqldump`).
2. Buat kunci `openssl rand -hex 32`, tambahkan `LIST_PRODUCTS_KEY=<64 hex>` ke `.env` server, dan simpan salinannya
   di password manager. Kunci yang hilang = akun tidak bisa dibuka lagi; jangan menggantinya setelah data terenkripsi.
   Docker: `docker compose up -d api` supaya variabel baru terbaca.
3. Deploy kode baru (api.php + `modules/list_products.php`, atau image api).
4. Login ke `/admin` sebagai **admin**, buka DevTools → Console, jalankan (token dilampirkan otomatis):

   ```js
   await (await fetch('/api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'encrypt_list_products' }) })).json()
   ```

   Hasil: `{success: true, encrypted: N, already_encrypted: 0, unreadable: 0, total: N}`. Dijalankan lagi:
   `encrypted: 0`. `unreadable > 0` berarti ada baris terenkripsi dengan kunci lain.
5. Cek: `SELECT id, LEFT(users, 7) FROM list_products;` → semua `enc:v1:` (atau NULL).

Rollback: restore backup dari langkah 1. Kode lama tidak bisa mendekripsi, jadi kembali ke kode lama setelah langkah 4
berarti akun tampil sebagai teks `enc:v1:...` (tetap tidak bocor ke publik). Backup dan dump DB yang dibuat sebelum
langkah 4 masih berisi akun dalam teks biasa: simpan di tempat aman atau hapus.

### Migrasi 2026-10-21_006 — dokumen proyek (`2026-10-21_006_project_documents.sql`)

Fitur Project Documentation & Agreement Management (kontrak: `docs/platform/PROJECT-DOCS-SPEC.md`). Bukan "Migrasi 006"
enkripsi akun produk di atas (itu migrasi data lewat API, tanpa file SQL).

- Tabel baru `pd_clients`, `pd_milestones`, `pd_documents`, `pd_document_revisions`, `pd_approvals`, `pd_signatures`,
  `pd_invoices`, `pd_payments`, `pd_notifications`, `pd_notification_reads`, `pd_counters`, `pd_activity`.
- `project_client` + `client_id`, `code` (unik), `stage_override`, `use_mou`, `has_maintenance`, `maintenance_*`,
  `scope_summary`, `payment_terms` (JSON), `updated_at`. Nilai kontrak tetap kolom `price`.
- Pengaturan bawaan di `hero_settings` (`pd_company`, `pd_numbering`, `pd_tax`, `pd_payment_terms`, `pd_sla_defaults`)
  lewat `INSERT IGNORE`: nilai yang sudah diubah admin tidak ditimpa; NPWP/rekening sengaja kosong.
- Hanya menambah (tanpa DROP/DELETE/UPDATE data), aman diulang. Kode lama tidak memakai kolom/tabel baru, jadi migrasi
  boleh dipasang sebelum deploy kode baru; kode baru **butuh** migrasi ini. Rollback: restore backup.
- Tanda tangan & bukti bayar disimpan privat di `storage/project-docs/` (di luar `public_html`, di-gitignore).

### Produksi (VPS, docker-compose)

Urutan penting untuk migrasi 001: **deploy frontend dulu**, karena migrasi mengganti
gambar produk "absensi" di `hero_settings.products_data` menjadi `/assets/product/absensi.jpg`,
dan file itu baru ada di `dist/` setelah build terbaru ter-deploy.

```bash
# 1. Pastikan build terbaru (berisi public/assets/product/absensi.jpg) sudah live
curl -sI https://garudanexa.com/assets/product/absensi.jpg | head -1   # harus 200

# 2. Backup (dari folder proyek di VPS; password diambil dari env container)
mkdir -p backups
docker exec garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -u root --single-transaction --routines --triggers "$MYSQL_DATABASE"' > backups/db_prod_$(date +%F_%H-%M)_pre-001.sql
tail -1 backups/db_prod_*_pre-001.sql   # harus "-- Dump completed ..."

# 3. Jalankan migrasi (berurutan)
docker exec -i garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"' < database/migrations/2026-10-19_001_align_schema_with_backend.sql
docker exec -i garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"' < database/migrations/2026-10-19_002_navbar_anchor_urls.sql
docker exec -i garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"' < database/migrations/2026-10-19_003_navbar_top_level_links.sql
docker exec -i garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"' < database/migrations/2026-10-19_004_template_marketplace.sql
# opsional, contoh katalog (harga contoh):
docker exec -i garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE"' < database/seed.templates.sql

# 4. Cek
docker exec garudanexabahtera-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root "$MYSQL_DATABASE" -e "SELECT * FROM schema_migrations; SELECT LENGTH(setting_value) FROM hero_settings WHERE setting_key=\"products_data\""'
```

Kalau output migrasi berisi baris `NOTICE: ...`, langkah itu dilewati karena data yang ada
akan melanggar constraint (mis. dokumen yatim). Tidak ada data yang dihapus; perbaiki datanya
lalu jalankan ulang file migrasi yang sama.

**Rollback**: restore backup dari langkah 2
(`docker exec -i ... mysql -u root "$MYSQL_DATABASE" < backups/db_prod_..._pre-001.sql`).
Migrasi 001 hanya menambah kolom/index/FK dan melebarkan tipe, jadi kode backend lama
tetap jalan setelah migrasi. Rollback hanya diperlukan kalau ada masalah tak terduga.

### Docker: instalasi baru

`docker-compose.yml` me-mount `database/schema.sql` (01) dan `database/seed.sql` (02) ke
`/docker-entrypoint-initdb.d/`. Init script hanya jalan saat volume `mysql_data` masih
kosong; DB produksi yang sudah ada tidak terpengaruh. Setelah itu buat admin pertama
(lihat di atas).

## Mengubah skema

1. Tulis migrasi baru `database/migrations/YYYY-MM-DD_NNN_<nama>.sql`: idempoten (cek
   `information_schema` sebelum ALTER), tanpa DROP/DELETE kecuali benar-benar perlu dan
   dijelaskan, dan diakhiri dengan `INSERT IGNORE INTO schema_migrations ...`.
   Ingat: MySQL 8 tidak mendukung `ADD COLUMN IF NOT EXISTS` (itu hanya MariaDB); contoh
   prosedur pembantunya ada di migrasi 001.
2. Perbarui `schema.sql` supaya sama persis dengan hasil migrasi, termasuk baris baseline `schema_migrations`.
3. Uji: restore backup ke DB sementara, jalankan migrasi dua kali, lalu bandingkan
   `mysqldump --no-data` hasilnya dengan DB baru dari `schema.sql`.

## Konvensi

- InnoDB, `utf8mb4` / `utf8mb4_unicode_ci` (DB produksi lama memakai `utf8mb4_0900_ai_ci`;
  keduanya utf8mb4, tidak perlu dikonversi).
- `hero_settings.setting_key` UNIQUE, karena backend menulis dengan `ON DUPLICATE KEY UPDATE`.
- Gambar/file disimpan sebagai **path** (`/assets/...`) atau URL S3, bukan base64 di kolom DB.
- Baris tunggal `id = 1`: `visitor_stats` (backend hanya meng-UPDATE baris ini; `seed.sql` membuatnya).
- Tabel `monitor_*` dan `monitoring_*` **tidak dipakai kode lagi** (fitur Monitoring Server dihapus) dan
  ditandai DEPRECATED di `schema.sql`; penghapusannya menunggu persetujuan (migrasi 005).
- Status pesanan template diubah hanya dengan `UPDATE ... WHERE id = ? AND status = ?` dan setiap perubahan
  dicatat di `template_order_logs` (lihat SPEC §4). Gambar konten situs pembeli disimpan di
  `public/assets/sites/<site_id>/`, gambar template di `public/assets/templates/`.
- Tabel di DB yang tidak dikelola repo ini: `products`, `services` (lihat `legacy/unused_tables.sql`)
  dan `saas_*` (hanya di XAMPP lokal, milik aplikasi website desa).

## Riwayat migrasi

| Versi | Isi |
|---|---|
| 2026-10-19_001 | Menyamakan skema dengan query backend: kolom yang dipakai kode tapi belum ada (monitor_websites/servers/logs, monitor_ai_logs, monitor_errors, list_products.position), tipe status ENUM→VARCHAR, FK documents/navbar/monitoring_api_logs, index dashboard, kolom byte DECIMAL(20,2), baris tunggal, dan gambar base64 produk "absensi" dipindah ke `/assets/product/absensi.jpg`. |
| 2026-10-19_002 | Data saja: URL `navbar_menus` yang menuju route yang tidak ada (`/web`, `/about`, `/careers`, `#company`, …) diganti ke anchor landing page (`#products`, `#process`, `#kontak`). Baris yang sudah diubah admin tidak disentuh. |
| 2026-10-19_003 | Data saja: menu utama Harga (`#pricing`), Proses (`#process`), FAQ (`#faq`) ditambahkan; Perusahaan pindah ke urutan 6. Tidak menambah apa pun bila navbar kosong atau menu itu sudah ada. |
| 2026-10-19_004 | Marketplace template: tabel `templates`, `template_orders`, `template_sites`, `template_order_logs`; `users.role` + `customer`; `project_client.show_on_website` + `source`. Data sekali jalan: navbar Template/Projects/Proses/FAQ (menu lain dinonaktifkan, tidak dihapus) dan `faq_data` tanpa harga/paket jasa custom. |
| 2026-10-19_005 | **Belum dijalankan / menunggu persetujuan.** `DROP TABLE IF EXISTS` 25 tabel `monitor_*` / `monitoring_*`. |
| 2026-10-20_006 | Data saja, lewat aksi admin `encrypt_list_products` (bukan file SQL, tidak tercatat di `schema_migrations`): `list_products.users` dienkripsi AES-256-GCM dengan `LIST_PRODUCTS_KEY`. Lihat "Migrasi 006" di atas. |
