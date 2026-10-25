-- ============================================================================
-- Migration 2026-10-25_023 — katalog: template baru GlowStory (toko online kecantikan)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code glowstory (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_023_glowstory_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008 & 018):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'glowstory' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): glowstory-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri glowstory-1.webp & glowstory-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "GlowStory").
--
-- Harga contoh Rp1.590.000 (termasuk setup + domain + hosting + SSL tahun pertama): kategori "Toko Online" — satu
-- halaman toko dengan keranjang → pesanan WhatsApp, kuis jenis kulit, kalkulator langganan isi ulang, dan ulasan
-- berfoto. Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('glowstory', 'GlowStory', 'Toko Online', '', '', '[]', 1590000.00,
   '/assets/templates/glowstory-preview.webp', '[]', 'glowstory', NULL, 'published', 11);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'GlowStory',
  category          = 'Toko Online',
  short_description = 'Website toko kecantikan untuk skincare, makeup, dan perawatan tubuh, lengkap dengan kuis jenis kulit dan langganan isi ulang.',
  description       = 'GlowStory menampilkan toko kecantikan Anda dengan suasana hangat seperti katalog butik: kolase foto produk dengan kartu produk unggulan dan lencana rating, strip keunggulan toko, kategori, serta produk terlaris lengkap dengan harga coret, rating, dan saringan per kategori. Pengunjung bisa memasukkan produk ke keranjang lalu memesan lewat WhatsApp dengan daftar belanja dan subtotal yang sudah tersusun.

Tiga fitur mendorong pembelian berulang: kuis jenis kulit yang menyusun rutinitas pagi dan malam beserta produknya, kalkulator langganan isi ulang yang langsung menunjukkan hemat per kiriman dan per tahun, serta ulasan pelanggan berfoto. Ada juga strip brand lokal, tanya jawab, dan pita ajakan. Semua teks, foto, harga, pertanyaan kuis, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Kuis jenis kulit dengan hasil rutinitas pagi & malam beserta produknya","Keranjang belanja yang dikirim sebagai pesanan WhatsApp lengkap dengan subtotal","Kalkulator langganan isi ulang: harga per kiriman dan hemat setahun","Produk terlaris dengan harga coret, rating, label, dan saringan kategori","Ulasan pelanggan berfoto yang bisa diperbesar","Kelola teks, foto, harga, kuis, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/glowstory-preview.webp',
  gallery           = '["/assets/templates/glowstory-1.webp","/assets/templates/glowstory-2.webp"]',
  template_code     = 'glowstory',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 11
WHERE slug = 'glowstory';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_023', 'templates: katalog GlowStory');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
