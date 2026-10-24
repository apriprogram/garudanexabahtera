-- ============================================================================
-- Migration 2026-10-25_018 — katalog: template baru Serenity (studio yoga)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code serenity (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_018_serenity_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'serenity' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): serenity-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri serenity-1.webp & serenity-2.webp. Foto di dalam template
-- dari Unsplash; hero diberi pita pelangi orisinal (public/assets/templates/photos/CREDITS.md, section "Serenity").
--
-- Harga contoh Rp1.290.000 (termasuk setup + domain + hosting + SSL tahun pertama): setara Arena Club — template
-- satu halaman dengan section lebih banyak dari Startup Clean (program, langkah, paket, FAQ, pencarian di menu),
-- untuk studio yoga/UMKM kebugaran yang sensitif harga. Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('serenity', 'Serenity', 'Yoga & Wellness', '', '', '[]', 1290000.00,
   '/assets/templates/serenity-preview.webp', '[]', 'serenity', NULL, 'published', 6);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Serenity',
  category          = 'Yoga & Wellness',
  short_description = 'Website tenang dan modern untuk studio yoga, pilates, dan kelas kebugaran yang ingin tampil profesional.',
  description       = 'Serenity menghadirkan suasana tenang sejak layar pertama: slider foto selebar layar (hingga 4 slide) dengan menu transparan, judul dua baris bergradasi lembut, tombol video, kartu kaca kecil, dan strip empat jenis kelas. Di bawahnya tersusun cerita studio dengan angka pencapaian, kartu kelas dengan durasi dan tombol tanya jadwal, langkah memulai, paket harga dengan paket unggulan, cerita peserta, tanya jawab, ajakan, serta kontak dengan peta lokasi.

Cocok untuk studio yoga dan pilates, kelas olahraga ringan, instruktur yoga privat, hingga penyelenggara retret yoga. Pengunjung bisa mencari kelas atau pertanyaan langsung dari menu, lalu mendaftar lewat WhatsApp. Semua teks, gambar, harga paket, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero slider foto selebar layar (hingga 4 slide) dengan menu transparan","Kartu kelas yoga dengan durasi, level, dan tombol tanya jadwal ke WhatsApp","Paket harga dengan paket unggulan yang menonjol","Langkah memulai, cerita peserta, dan tanya jawab (FAQ)","Pencarian kelas dan pertanyaan langsung dari menu","Kelola teks, gambar, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1290000.00,
  preview_image     = '/assets/templates/serenity-preview.webp',
  gallery           = '["/assets/templates/serenity-1.webp","/assets/templates/serenity-2.webp"]',
  template_code     = 'serenity',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 6
WHERE slug = 'serenity';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_018', 'templates: katalog Serenity');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
