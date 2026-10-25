-- ============================================================================
-- Migration 2026-10-25_021 — katalog: template baru PuncakGear (toko perlengkapan mendaki)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code puncakgear (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_021_puncakgear_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008 & 018):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'puncakgear' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): puncakgear-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri puncakgear-1.webp & puncakgear-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "PuncakGear").
--
-- Harga contoh Rp1.590.000 (termasuk setup + domain + hosting + SSL tahun pertama): sama dengan empat template toko
-- online lain yang dirilis bersamaan. Template satu halaman dengan fitur interaktif (filter produk, panduan gunung
-- dengan daftar centang, kalkulator sewa, pencarian di menu). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('puncakgear', 'PuncakGear', 'Toko Online', '', '', '[]', 1590000.00,
   '/assets/templates/puncakgear-preview.webp', '[]', 'puncakgear', NULL, 'published', 9);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'PuncakGear',
  category          = 'Toko Online',
  short_description = 'Website toko perlengkapan mendaki dengan panduan per gunung dan kalkulator sewa alat untuk pendaki pemula.',
  description       = 'PuncakGear tampil gagah sejak layar pertama: foto pendaki selebar layar dengan menu transparan, judul huruf kapital besar, tombol pil warna terang, dan kartu produk kecil. Di bawahnya tersusun kategori perlengkapan, produk terlaris dengan filter kategori dan tombol pesan, panduan per gunung (misalnya Rinjani, Semeru, Prau) berisi jalur populer, catatan keselamatan, dan daftar perlengkapan yang bisa dicentang pengunjung, lalu bagian sewa alat dengan kalkulator biaya per hari, tips keselamatan, cerita pendaki, tanya jawab, dan lokasi basecamp.

Cocok untuk toko outdoor, penyewaan alat camping dan mendaki, maupun basecamp yang juga menjual perlengkapan. Pesanan, sewa, dan konsultasi dikirim lewat WhatsApp lengkap dengan nama produk, daftar alat, lama sewa, dan perkiraan totalnya. Semua teks, foto, harga, daftar gunung, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero poster foto selebar layar dengan kartu produk","Produk terlaris dengan filter kategori dan tombol pesan ke WhatsApp","Panduan per gunung dengan daftar perlengkapan yang bisa dicentang","Kalkulator sewa alat per hari dengan diskon lama sewa","Tips keselamatan, cerita pendaki, dan tanya jawab (FAQ)","Pencarian produk, gunung, dan alat sewa langsung dari menu","Kelola teks, foto, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/puncakgear-preview.webp',
  gallery           = '["/assets/templates/puncakgear-1.webp","/assets/templates/puncakgear-2.webp"]',
  template_code     = 'puncakgear',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 9
WHERE slug = 'puncakgear';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_021', 'templates: katalog PuncakGear');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
