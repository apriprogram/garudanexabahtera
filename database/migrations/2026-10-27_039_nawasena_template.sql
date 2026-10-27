-- ============================================================================
-- Migration 2026-10-27_039 — katalog: template baru Nawasena (landing page SMA negeri)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code nawasena (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_039_nawasena_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024, 025, 028, dan 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'nawasena' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Sekolah & Pendidikan" sudah ada (migrasi 024; halaman kategori di src/content/categories.ts). Gambar
-- pratinjau = tangkapan layar asli demo (WebP 1600x1000): nawasena-preview.webp (hero desktop dalam bingkai peramban +
-- hero HP), galeri nawasena-1.webp (berita) & nawasena-2.webp (pita pengumuman & agenda). Foto di dalam template dari
-- Unsplash (public/assets/templates/photos/CREDITS.md, section "Nawasena"). Demo: nama SMA Negeri 1 Purbolinggo
-- (Lampung Timur) dipakai sebagai CONTOH atas permintaan pemilik; kepala sekolah, guru, alumni, berita, angka, alamat,
-- telepon, dan email di demo FIKTIF (tanpa NPSN, akreditasi, atau peringkat).
--
-- Harga contoh Rp1.690.000 (termasuk setup + hosting + SSL tahun pertama), sama dengan Bestari, Madani & Cakrawala.
-- Domain tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('nawasena', 'Nawasena', 'Sekolah & Pendidikan', '', '', '[]', 1690000.00,
   '/assets/templates/nawasena-preview.webp', '[]', 'nawasena', NULL, 'published', 22);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Nawasena',
  category          = 'Sekolah & Pendidikan',
  short_description = 'Template website profil sekolah untuk SMA negeri yang elegan: slider foto latar, strip pengumuman, statistik, berita, agenda, dan informasi SPMB.',
  description       = 'Nawasena membuat website profil sekolah terasa resmi dan tenang: slider foto latar selebar layar dengan nomor slide vertikal dan tombol jeda, strip pengumuman berjalan, pita statistik sekolah, sambutan kepala sekolah, profil dengan visi, misi, dan sejarah singkat, tab paket mata pelajaran pilihan, prestasi, berita, pita pengumuman dan agenda, ekstrakurikuler, fasilitas, guru, informasi SPMB, galeri, cerita alumni, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk SMA negeri maupun swasta. Formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online, dan pendaftaran tetap di portal provinsi. Judul, isi setiap bagian, foto, jadwal, dan satu warna tema (bawaan biru dengan nuansa navy) bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir, label kontak, judul kolom footer, dan beberapa label kecil tetap berbahasa Indonesia.',
  features          = '["Hero slider foto latar dengan nomor slide vertikal, tombol jeda, dan strip pengumuman","Pita statistik sekolah dengan angka yang menghitung naik","Sambutan kepala sekolah, profil, visi, misi, dan sejarah singkat","Tab paket mata pelajaran pilihan kelas XI–XII dan kokurikuler","Berita, pengumuman bertanggal, dan linimasa agenda","Informasi SPMB: jalur, jadwal, syarat, tautan portal provinsi, dan formulir tanya ke WhatsApp","Ekstrakurikuler, fasilitas, guru, galeri, alumni, dan tanya jawab","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/nawasena-preview.webp',
  gallery           = '["/assets/templates/nawasena-1.webp","/assets/templates/nawasena-2.webp"]',
  template_code     = 'nawasena',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 22
WHERE slug = 'nawasena';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_039', 'templates: katalog Nawasena');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
