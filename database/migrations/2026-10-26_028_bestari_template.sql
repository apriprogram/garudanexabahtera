-- ============================================================================
-- Migration 2026-10-26_028 — katalog: template baru Bestari (website SMA)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code bestari (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-26_028_bestari_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024 & 025):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'bestari' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Sekolah & Pendidikan" sudah ada (migrasi 024; halaman kategori di src/content/categories.ts). Gambar
-- pratinjau = tangkapan layar asli demo (WebP 1600x1000): bestari-preview.webp (hero desktop dalam bingkai peramban +
-- hero HP), galeri bestari-1.webp & bestari-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Bestari"). Demo: SMA Bestari Cendekia, sekolah FIKTIF di
-- Yogyakarta.
--
-- Harga contoh Rp1.690.000 (termasuk setup + hosting + SSL tahun pertama), sama dengan Madani & Cakrawala. Domain
-- tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('bestari', 'Bestari', 'Sekolah & Pendidikan', '', '', '[]', 1690000.00,
   '/assets/templates/bestari-preview.webp', '[]', 'bestari', NULL, 'published', 14);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Bestari',
  category          = 'Sekolah & Pendidikan',
  short_description = 'Template website SMA yang modern dan meyakinkan: hero slider foto, navbar transparan, PPDB dengan formulir ke WhatsApp, berita, program, dan guru.',
  description       = 'Bestari membuat website SMA terasa modern dan meyakinkan sejak layar pertama: slider foto besar selebar layar dengan navbar yang transparan di atas foto lalu putih saat digulir, bilah info kontak dan pengumuman PPDB, tiga angka sekolah yang menghitung naik, dan kartu sorotan. Di bawahnya tersusun lencana sekolah, profil dengan visi dan misi, angka sekolah, sambutan kepala sekolah, alasan memilih sekolah, carousel program unggulan, prestasi, guru, PPDB (jalur, jadwal, syarat, alur, biaya, dan formulir singkat yang memeriksa usia calon siswa), berita dengan filter kategori, pengumuman, agenda, testimoni orang tua dan alumni, galeri, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk SMA swasta maupun negeri, dan bisa dipakai MA dengan mengganti isi program. Formulir PPDB menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online. Semua teks, foto, jadwal, dan satu warna tema (misalnya terakota, hijau, atau biru) bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero slider foto selebar layar dengan navbar transparan dan pengumuman PPDB","PPDB bertab: jalur, jadwal, syarat, alur, dan biaya","Formulir pendaftaran SMA yang memeriksa usia calon siswa dan menyusun pesan WhatsApp untuk panitia","Berita dengan filter kategori, pengumuman bertanggal, dan agenda kegiatan","Profil, sambutan kepala sekolah, carousel program unggulan, prestasi, dan guru","Testimoni orang tua & alumni, galeri, dan tanya jawab","Satu warna tema yang bisa diganti, misalnya terakota, hijau, atau biru","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/bestari-preview.webp',
  gallery           = '["/assets/templates/bestari-1.webp","/assets/templates/bestari-2.webp"]',
  template_code     = 'bestari',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 14
WHERE slug = 'bestari';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-26_028', 'templates: katalog Bestari');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
