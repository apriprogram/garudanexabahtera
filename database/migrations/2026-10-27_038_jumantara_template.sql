-- ============================================================================
-- Migration 2026-10-27_038 — katalog: template baru Jumantara (website SMA negeri)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code jumantara (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_038_jumantara_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024, 025, dan 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'jumantara' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Sekolah & Pendidikan" sudah ada (migrasi 024; halaman kategori di src/content/categories.ts). Gambar
-- pratinjau = tangkapan layar asli demo (WebP 1600x1000): jumantara-preview.webp (hero desktop dalam bingkai peramban +
-- hero HP), galeri jumantara-1.webp (berita) & jumantara-2.webp (SPMB). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Jumantara"). Demo: nama "SMA Negeri 1 Purbolinggo" dipakai
-- sebagai CONTOH atas permintaan pemilik; kepala sekolah, guru, alumni, berita, angka, alamat jalan, telepon, dan email
-- di demo FIKTIF (tanpa NPSN, akreditasi, atau peringkat).
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
  ('jumantara', 'Jumantara', 'Sekolah & Pendidikan', '', '', '[]', 1690000.00,
   '/assets/templates/jumantara-preview.webp', '[]', 'jumantara', NULL, 'published', 21);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Jumantara',
  category          = 'Sekolah & Pendidikan',
  short_description = 'Template website sekolah negeri untuk SMA yang rapi dan elegan: slider foto dengan bilah progres, angka sekolah, berita, pengumuman, agenda, dan informasi SPMB.',
  description       = 'Jumantara menampilkan website SMA negeri yang profesional dan tenang: bilah utilitas berisi kontak dan tautan PPID atau E-Learning, slider foto selebar layar dengan bilah progres per slide, dan pita angka sekolah di bagian bawah foto. Di bawahnya tersusun layanan cepat, sambutan kepala sekolah, profil dengan tab visi dan misi, kelompok mata pelajaran pilihan, berita, pengumuman, agenda, prestasi, ekstrakurikuler, fasilitas, guru, SPMB, alumni, galeri, tanya jawab, dan peta.

Cocok untuk SMA negeri maupun swasta. Bagian SPMB menautkan portal provinsi dan menyediakan formulir tanya panitia yang menyusun pesan WhatsApp; tidak ada penyimpanan data pendaftar atau pembayaran online. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna tema bisa Anda ubah sendiri lewat CMS tanpa coding; label dan tombol formulir, label kontak, dan tautan lampiran pengumuman tetap berbahasa Indonesia.',
  features          = '["Hero slider foto selebar layar dengan bilah progres per slide, tombol jeda, dan pita angka sekolah","Bilah utilitas berisi kontak, jam layanan, dan tautan cepat seperti PPID dan E-Learning","Berita utama berfoto, pengumuman bertanda Penting, dan agenda dengan ubin tanggal","Bagian SPMB bertab (jalur, jadwal, syarat) dengan tautan ke portal provinsi","Formulir tanya panitia yang menyusun pesan WhatsApp, tanpa penyimpanan data","Sambutan kepala sekolah, visi-misi bertab, mapel pilihan, ekstrakurikuler berfilter, fasilitas, guru, alumni, galeri, FAQ, dan peta","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/jumantara-preview.webp',
  gallery           = '["/assets/templates/jumantara-1.webp","/assets/templates/jumantara-2.webp"]',
  template_code     = 'jumantara',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 21
WHERE slug = 'jumantara';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_038', 'templates: katalog Jumantara');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
