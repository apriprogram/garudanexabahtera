-- ============================================================================
-- Migration 2026-10-28_048 — katalog: template baru HomeNest (website properti & jual rumah)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code homenest (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_048_homenest_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'homenest' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Properti & Real Estate" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): homenest-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri homenest-1.webp & homenest-2.webp (bagian demo). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "HomeNest"). Demo: HomeNest oleh PT Sarang Hunian Lestari,
-- developer FIKTIF; rumah, klaster, harga, agen, dan pembeli di demo adalah contoh. Simulasi KPR hanya perkiraan
-- (bukan penawaran bank); formulir hanya menyusun pesan WhatsApp (data tidak disimpan di website).
--
-- Harga contoh Rp1.690.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah, dipilih saat memesan). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('homenest', 'HomeNest', 'Properti & Real Estate', '', '', '[]', 1690000.00,
   '/assets/templates/homenest-preview.webp', '[]', 'homenest', NULL, 'published', 31);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'HomeNest',
  category          = 'Properti & Real Estate',
  short_description = 'Template website properti & jual rumah: hero foto besar dengan panel cari rumah, listing bersaringan, tur virtual, simulasi KPR, profil developer, dan jadwal kunjungan ke WhatsApp.',
  description       = 'HomeNest menampilkan rumah yang Anda jual dengan tenang dan elegan: foto rumah selebar layar sebagai latar, judul besar di tengah, dan panel cari rumah (lokasi, tipe, harga) yang langsung menyaring daftar rumah. Setiap kartu memuat foto, harga, klaster, kota, luas tanah dan bangunan, serta jumlah kamar, lengkap dengan tombol simulasi KPR dan tanya unit lewat WhatsApp. Di bawahnya ada tur virtual per ruang dengan tombol menuju tautan tur milik Anda, kalkulator simulasi KPR, profil developer dengan angka dan foto proyek, fasilitas kawasan, cerita pembeli, kartu agen, tanya jawab, serta kantor pemasaran dengan Google Maps.

Cocok untuk developer perumahan, agen properti, dan tim pemasaran klaster. Simulasi KPR hanya perkiraan dengan bunga tetap, bukan penawaran bank; formulir jadwal kunjungan menyusun pesan WhatsApp dan data tidak disimpan di website. Tidak ada tur 360° bawaan dan tidak ada pembayaran tanda jadi online. Rumah, harga, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto rumah selebar layar dengan panel cari lokasi, tipe, dan harga","Daftar rumah dengan saringan lokasi, tipe, harga, dan urutan","Kartu rumah: harga, luas tanah & bangunan, kamar tidur & mandi, tombol WhatsApp","Simulasi KPR (perkiraan angsuran, bukan penawaran bank)","Tur virtual per ruang yang membuka tautan tur Anda","Profil developer, fasilitas kawasan, dan cerita pembeli","Agen per kawasan dan formulir jadwal kunjungan ke WhatsApp","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/homenest-preview.webp',
  gallery           = '["/assets/templates/homenest-1.webp","/assets/templates/homenest-2.webp"]',
  template_code     = 'homenest',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 31
WHERE slug = 'homenest';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_048', 'templates: katalog HomeNest');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
