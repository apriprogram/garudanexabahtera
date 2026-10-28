-- ============================================================================
-- Migration 2026-10-28_047 — katalog: template baru HealthLink (telemedicine & konsultasi dokter online)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code healthlink (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_047_healthlink_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'healthlink' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Kesehatan & Rumah Sakit" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): healthlink-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri healthlink-1.webp & healthlink-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "HealthLink"). Demo: HealthLink, layanan konsultasi dokter
-- online FIKTIF di Yogyakarta; dokter, rumah sakit mitra, harga, angka, dan alamat di demo adalah contoh.
-- Jujur: template ini halaman pemasaran layanan; konsultasi berjalan lewat WhatsApp atau aplikasi milik pembeli,
-- rekam medis tidak disimpan di website, tidak ada pembayaran online, dan pengingat kontrol dibuat di perangkat
-- pengunjung (tidak disimpan).
--
-- Harga contoh Rp1.690.000 (termasuk setup + hosting + SSL tahun pertama). Domain
-- tidak termasuk harga template (dibayar terpisah): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('healthlink', 'HealthLink', 'Kesehatan & Rumah Sakit', '', '', '[]', 1690000.00,
   '/assets/templates/healthlink-preview.webp', '[]', 'healthlink', NULL, 'published', 30);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'HealthLink',
  category          = 'Kesehatan & Rumah Sakit',
  short_description = 'Template website telemedicine bergaya aplikasi: cari dokter online, chat & video call lewat WhatsApp atau aplikasi Anda, resep digital, pengingat kontrol, dan RS mitra.',
  description       = 'HealthLink membuat layanan konsultasi dokter online Anda tampil seperti aplikasi yang rapi, dan dirancang dari layar HP lebih dulu. Halaman dibuka dengan foto selebar layar dan kartu putih berisi judul, kolom cari dokter, serta empat ubin besar: chat dokter, video call, tebus obat, dan rekam medis. Di bawahnya ada kartu layanan, cara konsultasi dengan ilustrasi percakapan, daftar dokter online yang bisa dicari dan disaring per spesialis, alur resep digital dan pengantaran obat, ilustrasi riwayat rekam medis, pengingat kontrol, rumah sakit mitra, biaya per sesi dan langganan keluarga, tombol unduh aplikasi, tanya jawab, serta kartu bantuan dan nomor darurat 119.

Cocok untuk klinik, jaringan rumah sakit, dan startup kesehatan yang sudah punya alur konsultasi lewat WhatsApp atau aplikasi sendiri. Template ini halaman pemasaran layanan; konsultasi berjalan lewat WhatsApp atau aplikasi milik Anda, rekam medis tidak disimpan di website, dan tidak ada pembayaran online. Pengingat kontrol dibuat di perangkat pengunjung sebagai file kalender atau tautan Google Calendar. Judul, teks, dokter, harga, foto, tautan aplikasi, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero kartu aplikasi: foto latar, kolom cari dokter, dan empat ubin layanan besar","Daftar dokter online dengan pencarian keluhan, saringan spesialis, status, harga, dan tombol chat","Resep digital & tebus obat, ilustrasi rekam medis, dan cara konsultasi dengan ilustrasi chat","Pengingat kontrol: file kalender .ics atau Google Calendar, dibuat di perangkat pengunjung","RS mitra, biaya per sesi & langganan keluarga, unduh aplikasi, FAQ, dan kartu darurat 119","Dirancang dari HP dulu dengan bilah aksi bawah; satu warna aksen yang bisa diganti","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/healthlink-preview.webp',
  gallery           = '["/assets/templates/healthlink-1.webp","/assets/templates/healthlink-2.webp"]',
  template_code     = 'healthlink',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 30
WHERE slug = 'healthlink';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_047', 'templates: katalog HealthLink');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
