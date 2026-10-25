-- ============================================================================
-- Migration 2026-10-25_019 — katalog: template baru SkyNusa (toko drone)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code skynusa (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_019_skynusa_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008 & 018):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'skynusa' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Toko Online" baru: halaman kategori /template/kategori/... ditambahkan terpisah (src/content/categories.ts),
-- bukan oleh migrasi ini. Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): skynusa-preview.webp (hero
-- desktop dalam bingkai peramban + hero HP), galeri skynusa-1.webp & skynusa-2.webp. Foto di dalam template dari
-- Unsplash (public/assets/templates/photos/CREDITS.md, section "SkyNusa").
--
-- Harga contoh Rp1.590.000 (termasuk setup + domain + hosting + SSL tahun pertama): di atas Serenity (Rp1.290.000)
-- karena template toko punya interaksi tambahan (filter produk, keranjang demo ke WhatsApp, kalkulator sewa harian),
-- di bawah Finova (Rp1.790.000). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('skynusa', 'SkyNusa', 'Toko Online', '', '', '[]', 1590000.00,
   '/assets/templates/skynusa-preview.webp', '[]', 'skynusa', NULL, 'published', 7);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'SkyNusa',
  category          = 'Toko Online',
  short_description = 'Website toko drone yang modern untuk menjual drone foto, wedding, dan pemetaan, lengkap dengan paket, sewa harian, dan layanan servis lokal.',
  description       = 'SkyNusa tampil seperti lembar spesifikasi yang rapi sejak layar pertama: judul dua nada di kanvas abu berkisi, foto drone dengan kartu angka spesifikasi, dan strip empat keunggulan toko. Di bawahnya tersusun kategori per kebutuhan (foto, wedding, pemetaan) yang memfilter daftar drone, kartu produk dengan harga coret dan tombol keranjang, paket bundling drone + tas + baterai cadangan, kalkulator sewa harian, layanan servis lokal, kelas terbang gratis, cerita pelanggan, tanya jawab, serta kontak dengan peta lokasi.

Cocok untuk toko dan reseller drone, penyedia sewa drone, bengkel servis drone, hingga toko kamera yang juga menjual drone. Pengunjung bisa mengisi keranjang dan menghitung biaya sewa, lalu mengirim pesanan lewat WhatsApp; tidak ada pembayaran online. Semua teks, gambar, harga, isi paket, tarif sewa, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero lembar spesifikasi dengan foto drone dan kartu angka spesifikasi","Kategori per kebutuhan yang memfilter daftar drone","Kartu produk dengan harga coret, label, dan keranjang yang dikirim ke WhatsApp","Paket bundling drone + tas + baterai cadangan dengan label hemat","Kalkulator sewa harian: unit, tanggal, lama sewa, dan potongan","Layanan servis lokal, kelas terbang gratis, cerita pelanggan, dan FAQ","Kelola teks, gambar, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/skynusa-preview.webp',
  gallery           = '["/assets/templates/skynusa-1.webp","/assets/templates/skynusa-2.webp"]',
  template_code     = 'skynusa',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 7
WHERE slug = 'skynusa';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_019', 'templates: katalog SkyNusa');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
