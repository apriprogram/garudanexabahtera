-- ============================================================================
-- Migration 2026-10-27_033 — katalog: template baru Velora (company profile berbahasa Inggris, grup otomotif)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code velora (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_033_velora_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'velora' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Company Profile" sudah ada (Corporate Nexa, Startup Clean; halaman /template/kategori/company-profile).
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): velora-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri velora-1.webp & velora-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Velora"). Demo: Velora Motor Group, grup otomotif FIKTIF di
-- Zurich; salinan demo berbahasa Inggris.
--
-- Harga contoh Rp1.890.000 (termasuk setup + hosting + SSL tahun pertama): company profile paling lengkap, berbahasa
-- Inggris, untuk perusahaan besar/multinasional; di atas Corporate Nexa (Rp1.500.000) dan Finova (Rp1.790.000). Domain
-- tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('velora', 'Velora', 'Company Profile', '', '', '[]', 1890000.00,
   '/assets/templates/velora-preview.webp', '[]', 'velora', NULL, 'published', 17);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Velora',
  category          = 'Company Profile',
  short_description = 'Template company profile berbahasa Inggris untuk grup otomotif dan perusahaan besar: hero kartu foto, jajaran model berfilter, carousel teknologi, dan formulir test drive ke WhatsApp/email.',
  description       = 'Velora menampilkan perusahaan besar dengan gaya showroom yang gelap dan elegan: kartu foto lebar dengan menu di dalamnya, judul dengan satu kata di dalam pil dan chip panah merah, serta kartu sorotan yang bisa menautkan video. Di bawahnya tersusun filosofi perusahaan, bento kartu foto dan baris berpanah, jajaran model dengan tombol filter, langkah kepemilikan, carousel teknologi yang melebar saat dipilih, angka perusahaan yang menghitung naik, dinding potret testimoni, newsroom, formulir test drive, daftar studio atau dealer dengan Google Maps, dan footer dengan newsletter.

Salinan demo berbahasa Inggris untuk grup otomotif fiktif Velora Motor Group, cocok untuk perusahaan multinasional, eksportir, dealer, dan perusahaan yang melayani klien luar negeri. Formulir test drive dan newsletter hanya menyusun pesan WhatsApp atau email; tidak ada penyimpanan data, sistem booking, atau pembayaran online. Semua teks yang tampil, termasuk label dan pesan galat formulir, bisa Anda ganti lewat CMS (juga ke bahasa Indonesia), begitu pula foto dan warna aksen, tanpa coding.',
  features          = '["Hero kartu foto lebar dengan menu di dalamnya, judul berpil, dan kartu sorotan yang bisa menautkan video","Jajaran produk atau model dengan tombol filter kategori, harga, dan spesifikasi singkat","Carousel teknologi yang melebar saat dipilih dan angka perusahaan yang menghitung naik","Dinding potret testimoni yang bisa diklik dan newsroom berita perusahaan","Formulir test drive yang menyusun pesan WhatsApp atau email, tanpa menyimpan data","Daftar studio atau dealer dengan Google Maps dan footer dengan newsletter lewat email","Salinan demo berbahasa Inggris; semua teks yang tampil (termasuk label formulir), foto, dan warna aksen bisa diubah lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1890000.00,
  preview_image     = '/assets/templates/velora-preview.webp',
  gallery           = '["/assets/templates/velora-1.webp","/assets/templates/velora-2.webp"]',
  template_code     = 'velora',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 17
WHERE slug = 'velora';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_033', 'templates: katalog Velora');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
