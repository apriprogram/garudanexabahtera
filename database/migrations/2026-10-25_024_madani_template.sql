-- ============================================================================
-- Migration 2026-10-25_024 — katalog: template baru Madani (website sekolah Islam SMA/MA)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code madani (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_024_madani_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008 & 018):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'madani' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Sekolah & Pendidikan" baru: halaman kategori /template/kategori/... ditambahkan terpisah
-- (src/content/categories.ts), bukan oleh migrasi ini. Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000):
-- madani-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri madani-1.webp & madani-2.webp. Foto di
-- dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "Madani").
--
-- Harga contoh Rp1.690.000 (termasuk setup + domain + hosting + SSL tahun pertama): website sekolah satu halaman
-- dengan 17 bagian (slider hero, profil & visi-misi bertab, PPDB lengkap dengan formulir minat ke WhatsApp, berita,
-- pengumuman, agenda, galeri, alumni, peta) dan warna tema yang bisa diganti. Bisa diubah admin
-- (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('madani', 'Madani', 'Sekolah & Pendidikan', '', '', '[]', 1690000.00,
   '/assets/templates/madani-preview.webp', '[]', 'madani', NULL, 'published', 12);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Madani',
  category          = 'Sekolah & Pendidikan',
  short_description = 'Template website sekolah Islam untuk SMA IT, madrasah aliyah, dan sekolah berasrama: slider foto, profil, berita, agenda, dan PPDB lewat WhatsApp.',
  description       = 'Madani tampil teduh dan rapi sejak layar pertama: slider foto sekolah selebar layar dengan menu pil, judul dengan kata sorotan, tombol Daftar PPDB, dan kartu info gelombang pendaftaran. Di bawahnya tersusun strip keunggulan, sambutan kepala sekolah, profil dengan tab visi, misi, dan nilai, statistik siswa dan guru, program unggulan seperti tahfidz dan kelas sains, daftar prestasi, fasilitas, berita yang bisa dibaca di tempat, pengumuman bertanda Penting, agenda kegiatan, galeri, cerita alumni, tanya jawab, serta lokasi dengan peta Google Maps.

Cocok untuk SMA Islam terpadu, madrasah aliyah, dan sekolah berasrama. Bagian PPDB memuat jalur pendaftaran, jadwal, syarat, alur, dan rincian biaya, plus formulir minat yang menyusun pesan WhatsApp untuk panitia; data tidak disimpan di website dan tidak ada pembayaran online. Demo memakai SMA IT Nurul Azka, sekolah fiktif di Bogor. Semua teks, foto, dan warna tema (hijau, biru, atau warna lain) bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero slider foto dengan tombol Daftar PPDB dan kartu info pendaftaran","PPDB: jalur, jadwal, syarat, alur, biaya, dan formulir minat ke WhatsApp","Sambutan kepala sekolah, profil, visi & misi, dan statistik sekolah","Program unggulan, prestasi, fasilitas, dan galeri kegiatan","Berita, pengumuman bertanda Penting, dan agenda kegiatan","Cerita alumni, tanya jawab, dan peta lokasi Google Maps","Warna tema bisa diganti (hijau, biru, atau warna lain) lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/madani-preview.webp',
  gallery           = '["/assets/templates/madani-1.webp","/assets/templates/madani-2.webp"]',
  template_code     = 'madani',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 12
WHERE slug = 'madani';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_024', 'templates: katalog Madani');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
