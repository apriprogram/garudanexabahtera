-- ============================================================================
-- Migration 2026-10-25_022 — katalog: template baru GadgetKu.id (toko aksesori HP)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code gadgetku (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-25_022_gadgetku_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 008 dan 018):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'gadgetku' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): gadgetku-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri gadgetku-1.webp & gadgetku-2.webp. Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "GadgetKu.id").
--
-- Harga contoh Rp1.590.000 (termasuk setup + domain + hosting + SSL tahun pertama): kategori Toko Online, setara empat
-- template toko 2026-10-25 lain. Lebih tinggi dari template company profile karena ada pencarian per tipe HP,
-- penyaring produk, bundling, dan pratinjau custom casing. Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('gadgetku', 'GadgetKu.id', 'Toko Online', '', '', '[]', 1590000.00,
   '/assets/templates/gadgetku-preview.webp', '[]', 'gadgetku', NULL, 'published', 10);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'GadgetKu.id',
  category          = 'Toko Online',
  short_description = 'Website toko aksesori HP yang bersih dan modern, dengan pencarian aksesori berdasarkan tipe HP.',
  description       = 'GadgetKu.id dibuat untuk toko casing, tempered glass, charger, kabel, earphone, dan power bank. Pembeli memilih merek lalu tipe HP-nya, dan aksesori yang cocok langsung tampil: casing dan tempered glass sesuai tipe, kabel sesuai port, plus charger dan earphone untuk semua HP. Di halaman yang sama ada kartu kategori berfoto besar, baris produk terbaru dengan harga coret dan penyaring kategori, paket bundling hemat yang menghitung potongan harganya sendiri, serta layanan custom casing: pengunjung mencoba fotonya sendiri di mockup casing langsung di browser.

Cocok untuk toko aksesori HP di ruko atau mal, penjual online yang juga berjualan di marketplace, dan usaha casing custom. Semua pesanan diarahkan ke WhatsApp berisi nama produk, harga, dan tipe HP pembeli. Teks, foto, produk, harga, daftar tipe HP, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Pencarian aksesori berdasarkan merek dan tipe HP","Baris produk terbaru dengan harga coret, label diskon otomatis, dan penyaring kategori","Paket bundling hemat dengan potongan harga yang dihitung otomatis","Coba casing custom dengan foto sendiri langsung di browser","Pesan lewat WhatsApp berisi nama produk, harga, dan tipe HP","Kelola produk, harga, tipe HP, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/gadgetku-preview.webp',
  gallery           = '["/assets/templates/gadgetku-1.webp","/assets/templates/gadgetku-2.webp"]',
  template_code     = 'gadgetku',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 10
WHERE slug = 'gadgetku';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-25_022', 'templates: katalog GadgetKu.id');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
