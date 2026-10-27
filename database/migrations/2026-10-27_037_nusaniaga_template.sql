-- ============================================================================
-- Migration 2026-10-27_037 — katalog: template baru NusaNiaga (company profile importir & distributor)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code nusaniaga (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_037_nusaniaga_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024, 025, dan 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'nusaniaga' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Company Profile" sudah ada (dipakai Corporate Nexa). Gambar pratinjau = tangkapan layar asli demo (WebP
-- 1600x1000): nusaniaga-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri nusaniaga-1.webp (produk)
-- & nusaniaga-2.webp (proses impor). Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md,
-- section "NusaNiaga"). Demo: PT Arunika Niaga Internasional, perusahaan FIKTIF di Cikarang; klien, angka, negara asal,
-- dan testimoni di demo adalah contoh.
--
-- Harga contoh Rp1.590.000 (termasuk setup + hosting + SSL tahun pertama), sama dengan Dermaga, TaniMakmur & SkyNusa.
-- Domain tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('nusaniaga', 'NusaNiaga', 'Company Profile', '', '', '[]', 1590000.00,
   '/assets/templates/nusaniaga-preview.webp', '[]', 'nusaniaga', NULL, 'published', 20);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'NusaNiaga',
  category          = 'Company Profile',
  short_description = 'Template company profile importir & distributor: hero foto berbilah, chip negara asal, layanan, produk bahan baku & mesin, proses impor, jangkauan, dan formulir penawaran ke WhatsApp.',
  description       = 'NusaNiaga membuat perusahaan importir dan distributor tampil rapi dan meyakinkan di depan bagian pengadaan pabrik: judul besar di samping satu foto gudang yang dipotong menjadi bilah-bilah vertikal, chip negara asal yang langsung menuju bagian jangkauan, dan tombol permintaan penawaran di blok warna aksen pada menu atas. Di bawahnya tersusun klien dan strip industri yang berjalan pelan, layanan (sourcing, impor, gudang, distribusi, instalasi mesin, suku cadang), produk bahan baku, mesin, dan suku cadang beserta negara asalnya, proses impor buka-tutup dengan garis alur, negara asal dan area pengantaran, keunggulan dengan angka besar, testimoni bagian pengadaan, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk importir bahan baku, supplier mesin industri, agen sourcing, dan distributor suku cadang. Formulir permintaan penawaran menanyakan kebutuhan, produk, volume, negara asal, Incoterm, dan lokasi pabrik, lalu menyusun pesan WhatsApp; data tidak disimpan di website, tidak ada pelacakan kiriman real-time, dan harga tidak diperbarui otomatis. Semua teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero berbilah: satu foto tegak dipotong menjadi bilah vertikal, dengan chip negara asal yang menuju bagian Jangkauan","Menu atas dengan blok warna aksen untuk tombol permintaan penawaran","Klien dan strip industri yang berjalan pelan","Layanan impor serta produk bahan baku, mesin, dan suku cadang beserta negara asalnya","Proses impor buka-tutup dengan garis alur yang terisi saat digulir","Formulir permintaan penawaran (kebutuhan, produk, volume, negara asal, Incoterm, lokasi pabrik) yang menyusun pesan WhatsApp","Keunggulan dengan angka besar bersatuan, testimoni, tanya jawab, dan peta lokasi","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/nusaniaga-preview.webp',
  gallery           = '["/assets/templates/nusaniaga-1.webp","/assets/templates/nusaniaga-2.webp"]',
  template_code     = 'nusaniaga',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 20
WHERE slug = 'nusaniaga';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_037', 'templates: katalog NusaNiaga');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
