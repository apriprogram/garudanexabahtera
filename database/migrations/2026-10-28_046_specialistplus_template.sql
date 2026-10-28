-- ============================================================================
-- Migration 2026-10-28_046 — katalog: template baru SpecialistPlus (klinik spesialis & laboratorium)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code specialistplus (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_046_specialistplus_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'specialistplus' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Kesehatan & Rumah Sakit" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): specialistplus-preview.webp (hero desktop dalam
-- bingkai peramban + hero HP), galeri specialistplus-1.webp (tab spesialis & jadwal dokter) & specialistplus-2.webp
-- (tabel perbandingan paket MCU). Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md,
-- section "SpecialistPlus"). Demo: SpecialistPlus Medical Center, pusat klinik spesialis & laboratorium FIKTIF di
-- Medan; dokter, jadwal, harga, dan testimoni di demo adalah contoh.
--
-- Harga contoh Rp1.890.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah): dipilih & dibayar saat memesan. Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('specialistplus', 'SpecialistPlus', 'Kesehatan & Rumah Sakit', '', '', '[]', 1890000.00,
   '/assets/templates/specialistplus-preview.webp', '[]', 'specialistplus', NULL, 'published', 29);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'SpecialistPlus',
  category          = 'Kesehatan & Rumah Sakit',
  short_description = 'Template website klinik spesialis & laboratorium: hero konsol data, jadwal dokter per klinik, tabel paket MCU, permintaan hasil lab via WhatsApp, dan spesifikasi alat.',
  description       = 'SpecialistPlus membuat pusat klinik spesialis, laboratorium, dan radiologi tampil rapi seperti lembar data: foto ruang pemeriksaan selebar layar dengan panel konsol tempat pasien memilih spesialis lalu melihat jumlah dokter, hari praktik, dan jadwal terdekat. Di bawahnya tersusun tab klinik spesialis (jantung, ortopedi, onkologi, dan lainnya) dengan tabel jadwal dokter, tabel perbandingan paket medical check-up, pita permintaan hasil lab, kartu spesifikasi alat seperti MRI, CT scan, cath lab, mammografi, dan lab otomatis, batang perkiraan waktu hasil, testimoni pasien, tanya jawab, serta kontak dengan jam layanan per unit dan Google Maps.

Cocok untuk klinik utama, pusat spesialis, laboratorium klinik, klinik medical check-up, dan pusat diagnostik. Tombol daftar dokter, pesan paket, dan formulir hasil lab hanya menyusun pesan WhatsApp; data tidak disimpan di website dan hasil lab tidak ditampilkan di website. Tidak ada rekam medis, pembayaran online, atau konsultasi video. Judul, jadwal, harga, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir dan judul kolom tabel tetap berbahasa Indonesia.',
  features          = '["Hero konsol data: pilih spesialis untuk melihat jumlah dokter, hari praktik, dan jadwal terdekat","Tab klinik spesialis dengan tabel jadwal dokter dan tombol daftar via WhatsApp","Tabel perbandingan paket medical check-up dengan harga dan tombol pesan","Formulir permintaan hasil lab yang menyusun pesan WhatsApp, plus tautan portal pasien","Kartu spesifikasi alat diagnostik dan batang perkiraan waktu hasil","Testimoni pasien, tanya jawab, jam layanan per unit, dan catatan darurat 119","Satu warna aksen yang bisa diganti; navy header, pita hasil lab, dan footer ikut menyesuaikan","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1890000.00,
  preview_image     = '/assets/templates/specialistplus-preview.webp',
  gallery           = '["/assets/templates/specialistplus-1.webp","/assets/templates/specialistplus-2.webp"]',
  template_code     = 'specialistplus',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 29
WHERE slug = 'specialistplus';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_046', 'templates: katalog SpecialistPlus');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
