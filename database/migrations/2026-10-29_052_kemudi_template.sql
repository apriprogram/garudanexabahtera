-- ============================================================================
-- Migration 2026-10-29_052 — katalog: template baru Kemudi (website rental mobil lepas kunci & dengan sopir)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code kemudi (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-29_052_kemudi_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 048):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'kemudi' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Travel & Transportasi" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): kemudi-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri kemudi-1.webp & kemudi-2.webp (bagian demo). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Kemudi"); ilustrasi mobil, film proses, dan peta adalah SVG
-- buatan sendiri tanpa merek. Demo: Kemudi Rent Car, rental mobil FIKTIF di Bandung; mobil, harga, zona antar, dan
-- pelanggan di demo adalah contoh. Pemesanan hanya menyusun pesan WhatsApp: ketersediaan dan harga final dikonfirmasi
-- admin, tidak ada pembayaran online, dokumen tidak diunggah atau disimpan di website.
--
-- Harga contoh Rp1.590.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah, dipilih saat memesan). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('kemudi', 'Kemudi', 'Travel & Transportasi', '', '', '[]', 1590000.00,
   '/assets/templates/kemudi-preview.webp', '[]', 'kemudi', NULL, 'published', 35);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Kemudi',
  category          = 'Travel & Transportasi',
  short_description = 'Template website rental mobil lepas kunci & dengan sopir: kartu pesan dengan perkiraan harga, armada per kelas, film proses saat digulir, tabel harga, syarat sewa, dan antar-jemput.',
  description       = 'Kemudi membantu usaha rental mobil menjawab pertanyaan pelanggan sebelum mereka chat: foto udara selebar layar dengan kartu pesan di sampingnya, tempat pengunjung memilih lepas kunci atau dengan sopir, mobil, serta tanggal dan jam ambil-kembali, lalu langsung melihat perkiraan harganya. Daftar armada bersaringan kelas menampilkan ilustrasi mobil per kelas atau foto Anda, kursi, transmisi, bahan bakar, bagasi, dan harga. Di bawahnya ada film proses yang berjalan saat halaman digulir, tabel harga 12 jam, 24 jam, dengan sopir, dan luar kota, syarat sewa per layanan, zona antar-jemput dengan peta ilustrasi, cara sewa, ulasan, tanya jawab, serta garasi dengan Google Maps.

Cocok untuk rental mobil harian, rent car dengan sopir, dan layanan antar ke stasiun atau bandara. Pemesanan hanya menyusun pesan WhatsApp; ketersediaan dan harga final dikonfirmasi admin; tidak ada pembayaran online; dokumen tidak diunggah atau disimpan di website. Mobil, harga, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto selebar layar dengan kartu pesan dan perkiraan harga","Armada bersaringan kelas dengan ilustrasi mobil per kelas","Hitung sewa otomatis: blok 24 jam, 12 jam, dan dengan sopir","Film proses yang berjalan saat halaman digulir","Tabel harga, syarat sewa, dan zona antar-jemput dengan peta","Pesanan tersusun otomatis ke WhatsApp","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1590000.00,
  preview_image     = '/assets/templates/kemudi-preview.webp',
  gallery           = '["/assets/templates/kemudi-1.webp","/assets/templates/kemudi-2.webp"]',
  template_code     = 'kemudi',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 35
WHERE slug = 'kemudi';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-29_052', 'templates: katalog Kemudi');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
