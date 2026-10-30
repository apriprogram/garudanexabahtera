-- ============================================================================
-- Migration 2026-10-29_049 — katalog: template baru Lajur (website sewa bus pariwisata)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code lajur (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-29_049_lajur_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 048):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'lajur' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Travel & Transportasi" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): lajur-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri lajur-1.webp & lajur-2.webp (bagian demo). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Lajur"); gambar bus, denah kursi, dan film perjalanan adalah
-- SVG asli tanpa merek. Demo: Lajur Trans Wisata, PO sewa bus pariwisata FIKTIF di Semarang; armada, harga, rute,
-- testimoni, dan kontak di demo adalah contoh. Formulir hanya menyusun pesan WhatsApp: harga final dan ketersediaan
-- armada dikonfirmasi admin, tidak ada pembayaran online.
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
  ('lajur', 'Lajur', 'Travel & Transportasi', '', '', '[]', 1690000.00,
   '/assets/templates/lajur-preview.webp', '[]', 'lajur', NULL, 'published', 32);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Lajur',
  category          = 'Travel & Transportasi',
  short_description = 'Template website sewa bus pariwisata: hero foto dengan bilah minta penawaran, armada bergambar bus, kalkulator rombongan, film perjalanan saat digulir, dan tujuan favorit ke WhatsApp.',
  description       = 'Lajur membantu PO dan usaha rental bus menjawab pertanyaan rombongan sejak halaman pertama. Foto jalan pegunungan selebar layar menjadi latar judul dan bilah minta penawaran: pengunjung mengisi jumlah peserta, tanggal berangkat, tujuan, dan lama sewa, lalu langsung melihat rekomendasi armada. Di bawahnya ada tab armada dengan gambar bus berlivery warna Anda, denah kursi, fasilitas, dan harga mulai; kalkulator rombongan yang menyusun kombinasi bus; film sehari perjalanan yang bergerak saat digulir; kartu tujuan favorit; daftar biaya termasuk dan belum termasuk; cara sewa; testimoni; galeri; tanya jawab; serta kontak garasi dengan Google Maps.

Cocok untuk PO bus pariwisata, rental bus, dan biro perjalanan berarmada sendiri. Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin. Tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau pelacakan GPS. Armada, harga, rute, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto selebar layar dengan bilah minta penawaran dan rekomendasi armada","Armada bertab: gambar bus SVG berlivery, denah kursi, fasilitas, harga mulai","Kalkulator rombongan: kombinasi bus, sisa kursi, perkiraan harga","Film sehari perjalanan yang bergerak saat halaman digulir","Tujuan favorit dengan harga mulai per bus dan tombol WhatsApp","Daftar biaya termasuk & belum termasuk, cara sewa, testimoni, FAQ","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/lajur-preview.webp',
  gallery           = '["/assets/templates/lajur-1.webp","/assets/templates/lajur-2.webp"]',
  template_code     = 'lajur',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 32
WHERE slug = 'lajur';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-29_049', 'templates: katalog Lajur');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
