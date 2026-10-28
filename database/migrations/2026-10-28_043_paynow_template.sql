-- ============================================================================
-- Migration 2026-10-28_043 — katalog: template baru PayNow (landing page dompet digital & payment gateway)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code paynow (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_043_paynow_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'paynow' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Fintech & Startup" sudah ada (dipakai Finova). Gambar pratinjau = tangkapan layar asli demo (WebP
-- 1600x1000): paynow-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri paynow-1.webp & paynow-2.webp
-- (dua bagian demo). Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "PayNow").
-- Demo: PayNow, merek dompet digital & payment gateway FIKTIF di Jakarta; merchant, angka, tarif, alamat API, dan
-- cerita di demo adalah contoh. Template ini halaman pemasaran: tidak memproses pembayaran, tidak menyimpan saldo,
-- dan contoh kode API hanya ilustrasi; izin usaha dan lembaga pengawas diisi pemilik merek di baris legal footer.
--
-- Harga contoh Rp1.590.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah): dipilih & dibayar saat memesan. Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('paynow', 'PayNow', 'Fintech & Startup', '', '', '[]', 1590000.00,
   '/assets/templates/paynow-preview.webp', '[]', 'paynow', NULL, 'published', 26);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'PayNow',
  category          = 'Fintech & Startup',
  short_description = 'Template landing page dompet digital & payment gateway: hero foto dengan mockup HP dan notifikasi, fitur bertab, simulasi biaya, keamanan, contoh API, dan pendaftaran merchant ke WhatsApp.',
  description       = 'PayNow membuat aplikasi pembayaran atau dompet digital Anda tampil modern dan tepercaya: foto latar di bawah gradasi biru-ungu, judul singkat, tombol unduh aplikasi, dan mockup HP berisi saldo, tombol QRIS, transfer, tagihan, dan isi saldo, lengkap dengan kartu notifikasi yang muncul berurutan. Di bawahnya tersusun strip jenis usaha, fitur bertab dengan layar HP yang berganti, simulasi biaya dari daftar contoh tarif, bagian keamanan, bagian developer dengan daftar endpoint dan contoh kode cURL, Node.js, dan PHP, pita angka, cerita merchant, tanya jawab, tombol Google Play dan App Store, serta formulir pendaftaran merchant.

Cocok untuk startup dompet digital, penyedia payment gateway, dan aplikasi kasir yang ingin memperkenalkan produknya. Template ini halaman pemasaran: tidak memproses pembayaran, tidak menyimpan saldo, dan contoh kode API hanya ilustrasi. Formulir pendaftaran merchant menyusun pesan WhatsApp; data tidak disimpan di website. Izin usaha dan lembaga pengawas Anda tulis sendiri di baris legal footer. Judul, teks, tarif, foto, dan satu warna aksen bisa Anda ubah lewat CMS tanpa coding.',
  features          = '["Hero foto dengan gradasi biru-ungu, mockup HP berisi saldo, dan kartu notifikasi","Fitur bertab (QRIS, transfer, tagihan, isi saldo) dengan layar HP yang berganti","Simulasi biaya dari daftar contoh tarif yang bisa Anda ubah","Bagian developer: daftar endpoint dan contoh kode cURL, Node.js, PHP dengan tombol salin","Keamanan, pita angka, cerita merchant, dan tanya jawab","Formulir pendaftaran merchant yang menyusun pesan WhatsApp dan baris legal di footer","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/paynow-preview.webp',
  gallery           = '["/assets/templates/paynow-1.webp","/assets/templates/paynow-2.webp"]',
  template_code     = 'paynow',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 26
WHERE slug = 'paynow';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_043', 'templates: katalog PayNow');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
