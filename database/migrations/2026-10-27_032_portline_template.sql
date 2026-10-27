-- ============================================================================
-- Migration 2026-10-27_032 — katalog: template baru Portline (company profile grup pelayaran & logistik)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code portline (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_032_portline_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'portline' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Company Profile" sudah ada (sama dengan Corporate Nexa & Startup Clean; halaman
-- /template/kategori/company-profile). Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000):
-- portline-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri portline-1.webp & portline-2.webp. Foto di
-- dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "Portline"). Demo: Quaymoor Group,
-- grup pelayaran & logistik FIKTIF berkantor pusat di Rotterdam (nama "Portline" hanya nama template); konten demo
-- berbahasa Inggris, dan semua teks yang tampil (termasuk menu, label formulir, pesan galat) bisa diganti lewat CMS.
--
-- Harga contoh Rp1.890.000 (termasuk setup + hosting + SSL tahun pertama): template company profile paling lengkap,
-- berbahasa Inggris, di atas Corporate Nexa (Rp1.500.000) dan Finova (Rp1.790.000). Domain tidak termasuk harga template
-- (pemilik 2026-10-25): dipilih & dibayar saat memesan. Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('portline', 'Portline', 'Company Profile', '', '', '[]', 1890000.00,
   '/assets/templates/portline-preview.webp', '[]', 'portline', NULL, 'published', 16);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Portline',
  category          = 'Company Profile',
  short_description = 'Template company profile berbahasa Inggris untuk perusahaan pelayaran, logistik, dan grup multinasional: hero slider berindeks, newsroom bertagar, armada, jaringan global, dan formulir enquiry.',
  description       = 'Portline membuat perusahaan pelayaran, logistik, atau grup multinasional tampil seperti korporasi internasional sejak layar pertama: slider foto selebar layar dengan indeks 01/02/03, lingkaran radar, menu dua lapis dengan tombol utilitas biru, serta deret logo perusahaan grup. Di bawahnya tersusun newsroom berbentuk mosaik dengan filter tagar, liputan media, angka perusahaan berikon, kartu perusahaan grup atau layanan, carousel armada yang melebar, jaringan global per kawasan, pita keberlanjutan, banner karier, pimpinan, kontak kantor pusat dan kantor regional, serta footer navy multi-kolom.

Konten demo berbahasa Inggris (Quaymoor Group, fiktif) dan bisa diganti seluruhnya lewat CMS, termasuk ke bahasa Indonesia: semua teks yang tampil, dari menu, judul, dan tombol sampai label formulir, pesan galat, dan judul kolom footer. Formulir enquiry menyusun pesan WhatsApp atau email untuk tim Anda; tidak ada data yang disimpan, dan tombol utilitas seperti "Shipment enquiry" hanya membuka formulir atau tautan pilihan Anda, bukan sistem pelacakan. Pilihan bahasa EN | ID tampil bila Anda menautkan versi bahasa lain. Satu warna tema bisa Anda ganti sendiri tanpa coding.',
  features          = '["Konten demo berbahasa Inggris untuk perusahaan besar, multinasional, dan eksportir","Hero slider foto selebar layar dengan indeks 01/02/03 dan deret logo perusahaan grup","Menu dua lapis dengan tombol utilitas dan pilihan bahasa EN | ID yang menaut ke versi bahasa lain Anda","Newsroom mosaik dengan filter tagar, isi berita, dan liputan media","Kartu perusahaan grup, carousel armada, dan jaringan global per kawasan","Formulir enquiry yang menyusun pesan WhatsApp atau email, tanpa menyimpan data","Semua teks, termasuk nama menu, label formulir, dan pesan galat, bisa diganti lewat CMS; satu warna tema yang bisa diganti","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1890000.00,
  preview_image     = '/assets/templates/portline-preview.webp',
  gallery           = '["/assets/templates/portline-1.webp","/assets/templates/portline-2.webp"]',
  template_code     = 'portline',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 16
WHERE slug = 'portline';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_032', 'templates: katalog Portline');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
