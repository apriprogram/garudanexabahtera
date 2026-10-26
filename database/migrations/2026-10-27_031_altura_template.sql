-- ============================================================================
-- Migration 2026-10-27_031 — katalog: template baru Altura (company profile developer properti global, bahasa Inggris)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code altura (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_031_altura_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'altura' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Company Profile" sudah ada (Corporate Nexa, Startup Clean). Gambar pratinjau = tangkapan layar asli demo
-- (WebP 1600x1000): altura-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri altura-1.webp &
-- altura-2.webp. Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "Altura").
-- Demo: Altura Developments, perusahaan FIKTIF (HQ Singapura); konten demo berbahasa Inggris, semua teks bisa diganti
-- lewat CMS. Formulir enquiry hanya menyusun pesan WhatsApp/email (tanpa penyimpanan data).
--
-- Harga contoh Rp1.890.000 (termasuk setup + hosting + SSL tahun pertama): company profile paling lengkap, berbahasa
-- Inggris, untuk perusahaan besar/multinasional (di atas Corporate Nexa Rp1.500.000 dan Finova Rp1.790.000). Domain
-- tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('altura', 'Altura', 'Company Profile', '', '', '[]', 1890000.00,
   '/assets/templates/altura-preview.webp', '[]', 'altura', NULL, 'published', 15);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Altura',
  category          = 'Company Profile',
  short_description = 'Template company profile berbahasa Inggris untuk developer properti dan perusahaan besar: hero dua panel, proyek unggulan, portofolio berfilter, dan formulir enquiry.',
  description       = 'Altura membuat perusahaan Anda tampil seperti developer properti kelas dunia sejak layar pertama: menu pil putih yang menumpang di atas hero dua panel, foto menara di kiri, dan panel krem berisi judul besar, lingkaran angka pengalaman, serta tombol video. Di bawahnya tersusun profil perusahaan, tiga pilar bernomor, deret layanan yang berjalan pelan, pita angka raksasa di atas foto cakrawala, keunggulan berikon, proyek unggulan berbentuk akordion, portofolio properti dengan filter kategori, harga, dan spesifikasi, pimpinan, penghargaan, testimoni, artikel wawasan, ajakan berfoto malam, daftar kantor, peta, dan formulir enquiry.

Konten demo berbahasa Inggris sehingga cocok untuk perusahaan besar, multinasional, eksportir, dan perusahaan yang melayani klien luar negeri; semua teks tetap bisa Anda ganti lewat CMS, termasuk ke bahasa Indonesia. Formulir enquiry menyusun pesan WhatsApp atau email untuk tim Anda tanpa menyimpan data. Satu warna tema (limau bawaan) bisa diganti, dan warna teks menyesuaikan otomatis agar tetap terbaca.',
  features          = '["Hero dua panel: foto menara, judul besar, lingkaran angka, dan pil video","Konten demo berbahasa Inggris yang bisa diganti seluruhnya lewat CMS","Proyek unggulan berbentuk akordion dan portofolio properti dengan filter kategori","Pita angka raksasa, tiga pilar bernomor, dan keunggulan berikon","Pimpinan, penghargaan, testimoni, dan artikel wawasan","Formulir enquiry yang menyusun pesan WhatsApp atau email, plus daftar kantor dan peta","Satu warna tema yang bisa diganti, warna teks menyesuaikan otomatis","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1890000.00,
  preview_image     = '/assets/templates/altura-preview.webp',
  gallery           = '["/assets/templates/altura-1.webp","/assets/templates/altura-2.webp"]',
  template_code     = 'altura',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 15
WHERE slug = 'altura';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_031', 'templates: katalog Altura');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
