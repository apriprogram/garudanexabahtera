-- ============================================================================
-- Migration 2026-10-27_035 — katalog: template baru Dermaga (company profile ekspor-impor & freight forwarding)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code dermaga (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-27_035_dermaga_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 024, 025, dan 028):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'dermaga' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Company Profile" sudah ada (dipakai Corporate Nexa). Gambar pratinjau = tangkapan layar asli demo (WebP
-- 1600x1000): dermaga-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri dermaga-1.webp (kartu
-- layanan bernomor) & dermaga-2.webp (pita pasar & Incoterm). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Dermaga"). Demo: PT Lintas Dermaga Nusantara, perusahaan
-- general trading & freight forwarding FIKTIF di Surabaya; klien, angka, rute, dan testimoni di demo adalah contoh.
--
-- Harga contoh Rp1.590.000 (termasuk setup + hosting + SSL tahun pertama), sama dengan TaniMakmur & SkyNusa. Domain
-- tidak termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('dermaga', 'Dermaga', 'Company Profile', '', '', '[]', 1590000.00,
   '/assets/templates/dermaga-preview.webp', '[]', 'dermaga', NULL, 'published', 18);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Dermaga',
  category          = 'Company Profile',
  short_description = 'Template company profile ekspor impor & freight forwarding: hero rute di atas foto terminal, layanan bernomor, pasar & Incoterm, proses kerja, dan formulir penawaran ke WhatsApp.',
  description       = 'Dermaga membuat perusahaan ekspor impor tampil rapi dan meyakinkan di depan calon pembeli dan mitra: judul besar, foto terminal peti kemas selebar halaman dengan garis rute dan label pelabuhan, serta empat angka ringkas seperti jumlah pengiriman dan negara tujuan. Di bawahnya tersusun daftar klien, profil perusahaan dengan baris fakta, layanan bernomor (freight forwarding, konsolidasi LCL, dokumen, trading, pemeriksaan, trucking), pita pasar berisi kawasan tujuan, pelabuhan, dan Incoterm, proses kerja lima langkah, galeri, testimoni dengan rute pengiriman, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk freight forwarder, perusahaan general trading, eksportir, dan importir. Formulir permintaan penawaran menanyakan produk, volume, Incoterm, dan negara tujuan atau asal, lalu menyusun pesan WhatsApp; data tidak disimpan di website dan tidak ada pelacakan kiriman real-time. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir, label kontak, dan judul kolom footer tetap berbahasa Indonesia.',
  features          = '["Hero rute: foto terminal peti kemas dengan garis rute, label pelabuhan, dan angka ringkas","Layanan bernomor: freight forwarding, konsolidasi LCL, dokumen, trading, pemeriksaan, dan trucking","Pita pasar: kawasan tujuan, pelabuhan, dan Incoterm yang dilayani","Proses kerja lima langkah beserta dokumen di setiap langkah","Formulir permintaan penawaran (produk, volume, Incoterm, negara tujuan/asal) yang menyusun pesan WhatsApp","Klien, galeri, testimoni dengan rute pengiriman, dan tanya jawab","Satu warna aksen yang bisa diganti; pita pasar dan footer ikut menyesuaikan","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/dermaga-preview.webp',
  gallery           = '["/assets/templates/dermaga-1.webp","/assets/templates/dermaga-2.webp"]',
  template_code     = 'dermaga',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 18
WHERE slug = 'dermaga';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-27_035', 'templates: katalog Dermaga');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
