-- ============================================================================
-- Migration 2026-10-28_044 — katalog: template baru MediCare General (website rumah sakit umum)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code medicare-general (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_044_medicare_general_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 035 Dermaga):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'medicare-general' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Kesehatan & Rumah Sakit" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): medicare-general-preview.webp (hero desktop dalam
-- bingkai peramban + hero HP), galeri medicare-general-1.webp (jadwal dokter) & medicare-general-2.webp (pita IGD).
-- Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "MediCare General").
-- Demo: RS MediCare General, rumah sakit umum FIKTIF di Semarang; nama dokter, jadwal, nomor telepon, alamat jalan, dan
-- nama penjamin di demo adalah contoh. Formulir pendaftaran hanya menyusun pesan WhatsApp (data pasien tidak disimpan
-- di website); tidak ada rekam medis, pembayaran online, atau konsultasi video.
--
-- Harga contoh Rp1.890.000 (termasuk setup + hosting + SSL tahun pertama): bagian lebih banyak dari company profile
-- biasa (jadwal dokter tersaring, formulir pendaftaran 3 langkah, tab rawat inap & asuransi). Domain tidak termasuk
-- harga template (dibayar terpisah): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('medicare-general', 'MediCare General', 'Kesehatan & Rumah Sakit', '', '', '[]', 1890000.00,
   '/assets/templates/medicare-general-preview.webp', '[]', 'medicare-general', NULL, 'published', 27);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'MediCare General',
  category          = 'Kesehatan & Rumah Sakit',
  short_description = 'Template website rumah sakit umum: strip IGD 24 jam, ukuran teks yang bisa diperbesar, jadwal dokter tersaring, pendaftaran online ke WhatsApp, poliklinik, rawat inap, dan BPJS.',
  description       = 'MediCare General membuat website rumah sakit umum yang jelas dan mudah dibaca semua usia, termasuk pasien lansia. Di paling atas ada strip merah IGD 24 jam dengan nomor yang bisa langsung ditelepon dan tombol ukuran teks (A, A+, A++). Hero menampilkan foto rumah sakit yang terang sebagai latar dengan tiga ubin besar: Daftar Online, Jadwal Dokter, dan IGD 24 Jam. Di bawahnya tersusun layanan utama, pendaftaran online tiga langkah, jadwal dokter yang bisa disaring per poli dan per hari, daftar poliklinik beserta lokasinya, penunjang medis, pita IGD dengan langkah saat darurat, kelas kamar rawat inap dan jam besuk, alur pasien BPJS, asuransi, dan umum, tanya jawab, serta kontak darurat dengan Google Maps.

Cocok untuk rumah sakit umum swasta, rumah sakit daerah, dan klinik utama dengan IGD. Formulir pendaftaran hanya menyusun pesan WhatsApp ke petugas pendaftaran; data pasien tidak disimpan di website. Tidak ada rekam medis, antrean otomatis, pembayaran online, atau konsultasi video. Jadwal dokter, kelas kamar, dan daftar penjamin adalah teks yang Anda perbarui sendiri lewat CMS tanpa coding; label formulir, nama hari, dan judul kolom tabel tetap berbahasa Indonesia.',
  features          = '["Strip IGD 24 jam dengan nomor telepon dan tombol ukuran teks A, A+, A++","Hero foto rumah sakit dengan ubin Daftar Online, Jadwal Dokter, dan IGD 24 Jam","Jadwal dokter yang bisa disaring per poli dan per hari, dengan tombol Daftar","Pendaftaran online tiga langkah yang menyusun pesan WhatsApp (data pasien tidak disimpan)","Poliklinik, penunjang medis, pita IGD, dan kelas kamar rawat inap dengan jam besuk","Alur pasien BPJS, asuransi, dan umum dalam tab, plus tanya jawab dan kontak darurat","Satu warna tema yang bisa diganti; merah IGD tetap agar mudah dikenali","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1890000.00,
  preview_image     = '/assets/templates/medicare-general-preview.webp',
  gallery           = '["/assets/templates/medicare-general-1.webp","/assets/templates/medicare-general-2.webp"]',
  template_code     = 'medicare-general',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 27
WHERE slug = 'medicare-general';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_044', 'templates: katalog MediCare General');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
