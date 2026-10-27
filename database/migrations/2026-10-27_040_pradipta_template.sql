-- ============================================================================
-- Migration 2026-10-27_040 — katalog: template baru Pradipta (landing page SMA negeri)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code pradipta (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_040_pradipta_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024, 025, 028, dan 035–037):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'pradipta' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Sekolah & Pendidikan" sudah ada (dipakai Madani, Cakrawala, dan Bestari). Gambar pratinjau = tangkapan
-- layar asli demo (WebP 1600x1000): pradipta-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri
-- pradipta-1.webp (berita) & pradipta-2.webp (SPMB). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Pradipta"). Demo memakai nama "SMA Negeri 1 Purbolinggo"
-- (Lampung Timur) sebagai CONTOH atas permintaan pemilik; kepala sekolah, guru, alamat, angka, berita, pengumuman,
-- agenda, prestasi, dan testimoni di demo FIKTIF (tanpa NPSN, akreditasi, atau peringkat).
--
-- Harga contoh Rp1.690.000 (termasuk setup + hosting + SSL tahun pertama), sama dengan Madani, Cakrawala & Bestari.
-- Domain tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('pradipta', 'Pradipta', 'Sekolah & Pendidikan', '', '', '[]', 1690000.00,
   '/assets/templates/pradipta-preview.webp', '[]', 'pradipta', NULL, 'published', 23);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Pradipta',
  category          = 'Sekolah & Pendidikan',
  short_description = 'Template landing page SMA negeri yang terang dan rapi: hero slider foto dengan thumbnail, statistik, berita, pengumuman, agenda, info SPMB, dan formulir tanya panitia ke WhatsApp.',
  description       = 'Pradipta membuat SMA negeri tampil terang, rapi, dan tenang sejak layar pertama: header putih dengan menu yang penunjuknya bergeser mengikuti bagian yang sedang dibaca, slider foto selebar layar dengan judul di kartu putih, dan deret thumbnail foto berbilah progres sebagai tombol slide. Di bawahnya tersusun akses cepat, statistik dalam gelembung angka, profil dengan visi, misi, dan nilai sekolah, sambutan kepala sekolah, kelompok mata pelajaran pilihan dengan foto yang berganti, ekstrakurikuler bersaring, linimasa prestasi per tahun, kartu fasilitas sekolah, berita berfilter kategori, pengumuman, agenda berbentuk ubin kalender, guru, informasi SPMB (tab jalur, jadwal, dan syarat), testimoni, galeri, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk SMA negeri yang membutuhkan landing page SPMB setiap tahun ajaran dan tempat rutin menerbitkan berita, pengumuman, dan agenda. Pendaftaran tetap lewat portal SPMB provinsi; formulir tanya panitia hanya menyusun pesan WhatsApp, data tidak disimpan di website, tidak ada unggah berkas, dan tidak ada pembayaran online. Judul, foto, isi setiap bagian, dan satu warna tema bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir dan tombol kontrol slider tetap berbahasa Indonesia.',
  features          = '["Header putih dengan penunjuk menu yang bergeser mengikuti bagian yang dibaca dan tombol Info SPMB","Hero slider foto selebar layar: judul di kartu putih, thumbnail berbilah progres, jeda, dan geser di HP","Akses cepat ke SPMB, pengumuman, e-learning, dan PPID, statistik dalam gelembung angka, profil, visi, misi, dan nilai sekolah","Kelompok mata pelajaran pilihan, ekstrakurikuler bersaring, linimasa prestasi per tahun, dan kartu fasilitas","Berita berfilter kategori, pengumuman berlabel Penting, dan agenda berbentuk ubin kalender","Info SPMB (tab jalur, jadwal, syarat), tautan portal provinsi, dan formulir tanya tiga langkah yang menyusun pesan WhatsApp","Guru, testimoni orang tua & alumni, galeri, tanya jawab, dan peta lokasi","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/pradipta-preview.webp',
  gallery           = '["/assets/templates/pradipta-1.webp","/assets/templates/pradipta-2.webp"]',
  template_code     = 'pradipta',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 23
WHERE slug = 'pradipta';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_040', 'templates: katalog Pradipta');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
