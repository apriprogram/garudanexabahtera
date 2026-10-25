-- ============================================================================
-- Migration 2026-10-25_025 — katalog: template baru Cakrawala (website SMK/SMA)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code cakrawala (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_025_cakrawala_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 018 & 019):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'cakrawala' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Sekolah & Pendidikan" baru: halaman kategori /template/kategori/... ditambahkan terpisah
-- (src/content/categories.ts), bukan oleh migrasi ini. Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000):
-- cakrawala-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri cakrawala-1.webp & cakrawala-2.webp.
-- Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "Cakrawala"). Demo: SMK
-- Cakrawala Karya, sekolah FIKTIF di Bandung.
--
-- Harga contoh Rp1.690.000 (termasuk setup + domain + hosting + SSL tahun pertama): di atas template toko
-- (Rp1.590.000) karena halaman sekolah lebih panjang (PPDB bertab dengan formulir, berita berfilter, pengumuman, agenda,
-- BKK, alumni). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('cakrawala', 'Cakrawala', 'Sekolah & Pendidikan', '', '', '[]', 1690000.00,
   '/assets/templates/cakrawala-preview.webp', '[]', 'cakrawala', NULL, 'published', 13);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Cakrawala',
  category          = 'Sekolah & Pendidikan',
  short_description = 'Template website SMK dan SMA yang modern: hero slider foto, PPDB dengan formulir ke WhatsApp, berita, pengumuman, alumni, dan BKK.',
  description       = 'Cakrawala membuat website sekolah tampil rapi dan meyakinkan sejak layar pertama: slider foto besar selebar layar dengan logo sekolah dan menu pil, pengumuman PPDB di bagian paling atas, dan tiga kartu info. Di bawahnya tersusun statistik sekolah, sambutan kepala sekolah, profil dengan visi dan misi, program keahlian, teaching factory dan mitra industri, prestasi, PPDB (jalur, jadwal, syarat, alur, biaya, dan formulir singkat), berita dengan filter kategori, pengumuman, agenda, cerita alumni, Bursa Kerja Khusus, fasilitas, galeri, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk SMK negeri maupun swasta, dan bisa dipakai SMA dengan mengganti program keahlian menjadi peminatan. Formulir PPDB menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online. Semua teks, foto, jadwal, dan satu warna tema (misalnya biru atau hijau) bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero slider foto dengan menu pil, pengumuman PPDB, dan kartu info","PPDB bertab: jalur, jadwal, syarat, alur, dan biaya","Formulir pendaftaran singkat yang menyusun pesan WhatsApp untuk panitia","Berita dengan filter kategori, pengumuman bertanggal, dan agenda kegiatan","Sambutan kepala sekolah, profil, visi & misi, program keahlian, dan prestasi","Teaching factory, mitra industri, alumni, dan Bursa Kerja Khusus","Satu warna tema yang bisa diganti, misalnya biru atau hijau","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/cakrawala-preview.webp',
  gallery           = '["/assets/templates/cakrawala-1.webp","/assets/templates/cakrawala-2.webp"]',
  template_code     = 'cakrawala',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 13
WHERE slug = 'cakrawala';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_025', 'templates: katalog Cakrawala');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
