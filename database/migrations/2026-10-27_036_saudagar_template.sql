-- ============================================================================
-- Migration 2026-10-27_036 — katalog: template baru Saudagar (company profile eksportir hasil bumi)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code saudagar (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_036_saudagar_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024, 025, dan 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'saudagar' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Company Profile" sudah ada (dipakai Corporate Nexa). Gambar pratinjau = tangkapan layar asli demo (WebP
-- 1600x1000): saudagar-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri saudagar-1.webp (tab
-- spesifikasi komoditas) & saudagar-2.webp (kalender panen). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Saudagar"). Demo: PT Saudagar Hasil Bumi, eksportir FIKTIF di
-- Makassar; pembeli, angka, dan spesifikasi di demo adalah contoh.
--
-- Harga contoh Rp1.690.000 (termasuk setup + hosting + SSL tahun pertama), setara Madani, Cakrawala, dan Bestari:
-- tab spesifikasi komoditas, kalender panen, dan formulir permintaan penawaran yang menyusun pesan WhatsApp. Domain
-- tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('saudagar', 'Saudagar', 'Company Profile', '', '', '[]', 1690000.00,
   '/assets/templates/saudagar-preview.webp', '[]', 'saudagar', NULL, 'published', 19);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Saudagar',
  category          = 'Company Profile',
  short_description = 'Template website eksportir kopi, kakao & rempah: hero tiga foto lengkung, tab spesifikasi komoditas, kalender panen, dan formulir penawaran ke WhatsApp.',
  description       = 'Saudagar membuat perusahaan ekspor hasil bumi tampil hangat dan berkelas: judul serif besar di atas kertas krem, tiga foto berbingkai lengkung dengan keterangan asal, menu yang terbagi di kiri dan kanan nama perusahaan, dan tombol permintaan penawaran. Di bawahnya tersusun cerita perusahaan dengan angka besar, tab spesifikasi komoditas (grade, asal, kadar air, kemasan, dan minimum pemesanan), langkah mutu dan daftar dokumen, kalender musim panen per bulan, daerah asal dan pasar tujuan dengan Incoterm, galeri, testimoni pembeli, tanya jawab, pita ajakan, serta kontak dengan Google Maps.

Cocok untuk eksportir kopi, kakao, cengkeh, pala, kayu manis, kelapa, dan kopra, juga koperasi atau pengepul yang mulai menjual ke luar negeri. Formulir permintaan penawaran menyusun pesan WhatsApp untuk tim penjualan; data tidak disimpan di website, harga komoditas tidak diperbarui otomatis, dan tidak ada pelacakan kiriman. Semua teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero tiga foto berbingkai lengkung dengan judul serif dan keterangan asal komoditas","Tab spesifikasi komoditas: grade, asal, kadar air, kemasan, dan minimum pemesanan","Kalender musim panen per bulan untuk setiap komoditas","Langkah mutu bernomor dan daftar dokumen pengapalan","Daerah asal dan pasar tujuan dengan pelabuhan dan Incoterm","Formulir permintaan penawaran (komoditas, volume, Incoterm, negara tujuan) yang menyusun pesan WhatsApp","Galeri, testimoni pembeli, dan tanya jawab","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/saudagar-preview.webp',
  gallery           = '["/assets/templates/saudagar-1.webp","/assets/templates/saudagar-2.webp"]',
  template_code     = 'saudagar',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 19
WHERE slug = 'saudagar';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_036', 'templates: katalog Saudagar');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
