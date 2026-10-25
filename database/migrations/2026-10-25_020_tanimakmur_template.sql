-- ============================================================================
-- Migration 2026-10-25_020 — katalog: template baru TaniMakmur (toko online pertanian)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code tanimakmur (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_020_tanimakmur_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008 dan 018):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'tanimakmur' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): tanimakmur-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri tanimakmur-1.webp & tanimakmur-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "TaniMakmur").
--
-- Harga contoh Rp1.590.000 (termasuk setup + domain + hosting + SSL tahun pertama): kategori Toko Online, satu halaman
-- dengan bagian interaktif lebih banyak dari Serenity (pemilih paket per tanaman dengan jadwal tanam, filter kategori
-- produk, pencarian di menu). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('tanimakmur', 'TaniMakmur', 'Toko Online', '', '', '[]', 1590000.00,
   '/assets/templates/tanimakmur-preview.webp', '[]', 'tanimakmur', NULL, 'published', 8);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'TaniMakmur',
  category          = 'Toko Online',
  short_description = 'Toko online pertanian untuk benih, pupuk, dan alat tani, lengkap dengan paket per tanaman dan konsultasi lewat WhatsApp.',
  description       = 'TaniMakmur dirancang untuk toko pertanian yang ingin berjualan online dengan tampilan segar dan meyakinkan. Halaman dibuka dengan foto ladang selebar layar, judul besar, kartu angka, dan strip keunggulan toko. Di bawahnya tersusun kategori produk, pemilih Pilih Tanamanmu yang menampilkan paket lengkap per jenis tanaman (isi paket, jadwal tanam, dan harga hemat), produk terlaris dengan rating dan filter kategori, konsultasi gratis dengan penyuluh lewat WhatsApp, panduan urban farming, testimoni, tanya jawab, serta kontak dengan peta lokasi.

Cocok untuk toko benih, pupuk, dan alat tani, kios saprotan, penjual perlengkapan hidroponik, hingga usaha urban farming. Pembeli memesan produk atau paket lewat WhatsApp dengan pesan yang sudah berisi nama produknya. Semua teks, gambar, harga, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto ladang selebar layar dengan kartu angka dan strip keunggulan","Pilih Tanamanmu: paket per jenis tanaman dengan isi, jadwal tanam, dan harga hemat","Produk terlaris dengan rating, harga coret, dan filter kategori","Pesan produk dan paket langsung lewat WhatsApp","Konsultasi penyuluh, panduan urban farming, testimoni, dan FAQ","Pencarian produk dan paket langsung dari menu","Kelola teks, gambar, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/tanimakmur-preview.webp',
  gallery           = '["/assets/templates/tanimakmur-1.webp","/assets/templates/tanimakmur-2.webp"]',
  template_code     = 'tanimakmur',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 8
WHERE slug = 'tanimakmur';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_020', 'templates: katalog TaniMakmur');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
