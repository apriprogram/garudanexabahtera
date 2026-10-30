-- ============================================================================
-- Migration 2026-10-29_050 — katalog: template baru Nusaline (website PO bus antarkota / bus malam)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code nusaline (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-29_050_nusaline_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 048):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'nusaline' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Travel & Transportasi" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): nusaline-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri nusaline-1.webp & nusaline-2.webp (bagian demo). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Nusaline"); bus, denah kursi, dan film digambar SVG. Demo:
-- Nusaline, PO bus malam FIKTIF; jadwal, harga, agen, dan penumpang di demo adalah contoh. Pemesanan hanya menyusun
-- pesan WhatsApp: tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time; jadwal & harga dikonfirmasi admin.
--
-- Harga contoh Rp1.790.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah, dipilih saat memesan). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('nusaline', 'Nusaline', 'Travel & Transportasi', '', '', '[]', 1790000.00,
   '/assets/templates/nusaline-preview.webp', '[]', 'nusaline', NULL, 'published', 33);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Nusaline',
  category          = 'Travel & Transportasi',
  short_description = 'Template website PO bus antarkota & bus malam: kartu cari jadwal, tabel jadwal dengan tombol Pesan ke WhatsApp, kelas dengan denah kursi, film perjalanan semalam, rute & titik naik.',
  description       = 'Nusaline membuat website PO bus Anda terasa seperti papan keberangkatan malam: foto jalan tol malam selebar layar, judul besar, kartu cari jadwal (dari, ke, tanggal, jumlah penumpang), dan papan keberangkatan mini. Di bawahnya tabel jadwal dengan jam berangkat, jam tiba dan tanda +1 yang dihitung otomatis dari lama perjalanan, kelas, harga mulai, saringan rute dan kelas, serta tombol Pesan yang menyusun pesan WhatsApp lengkap. Bagian kelas menampilkan denah kursi tampak atas yang dibuat otomatis dari konfigurasi 2-2, 2-1, atau 1-1 kabin tidur, lalu film perjalanan semalam yang bergerak saat digulir: bus potongan samping melaju dari malam sampai matahari terbit dengan jam dan penghitung km. Ada juga diagram rute dengan agen per kota, fasilitas kabin, cara pesan, cerita penumpang, tanya jawab, dan kontak dengan Google Maps.

Cocok untuk PO bus antarkota, operator bus malam, dan agen tiket bus. Pemesanan hanya menyusun pesan WhatsApp ke admin: tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time, dan jadwal serta harga dikonfirmasi admin. Jadwal, kelas, rute, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto malam dengan kartu cari jadwal dan papan keberangkatan","Tabel jadwal: jam tiba & +1 otomatis, saringan rute dan kelas","Tombol Pesan menyusun pesan WhatsApp (rute, tanggal, jam, kelas, penumpang)","Kelas dengan denah kursi otomatis 2-2, 2-1, dan kabin tidur 1-1","Film perjalanan semalam yang bergerak saat digulir","Rute & titik naik per kota, fasilitas kabin, FAQ, dan kontak","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1790000.00,
  preview_image     = '/assets/templates/nusaline-preview.webp',
  gallery           = '["/assets/templates/nusaline-1.webp","/assets/templates/nusaline-2.webp"]',
  template_code     = 'nusaline',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 33
WHERE slug = 'nusaline';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-29_050', 'templates: katalog Nusaline');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
