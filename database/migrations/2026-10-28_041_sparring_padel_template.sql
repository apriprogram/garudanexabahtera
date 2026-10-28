-- ============================================================================
-- Migration 2026-10-28_041 — katalog: template baru Sparring Padel (landing page lapangan padel + booking)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code sparring-padel (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_041_sparring_padel_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'sparring-padel' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Olahraga & Komunitas" sudah ada (dipakai Arena Club). Gambar pratinjau = tangkapan layar asli demo (WebP
-- 1600x1000): sparring-padel-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri sparring-padel-1.webp
-- dan sparring-padel-2.webp. Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md, section
-- "Sparring Padel"). Demo: Sparring Padel, klub padel FIKTIF di Kemang, Jakarta Selatan; jadwal, harga, turnamen, dan
-- angka komunitas di demo adalah contoh. Booking hanya menyusun pesan WhatsApp ke admin: tidak ada ketersediaan
-- real-time, pembayaran online, atau akun member.
--
-- Harga contoh Rp1.390.000 (termasuk setup + hosting + SSL tahun pertama). Domain tidak termasuk harga template
-- (dibayar terpisah, dipilih saat memesan). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('sparring-padel', 'Sparring Padel', 'Olahraga & Komunitas', '', '', '[]', 1390000.00,
   '/assets/templates/sparring-padel-preview.webp', '[]', 'sparring-padel', NULL, 'published', 24);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Sparring Padel',
  category          = 'Olahraga & Komunitas',
  short_description = 'Template website lapangan padel: hero foto dengan Booking cepat ke WhatsApp, jadwal & harga per jam, lapangan indoor/outdoor, cari lawan main per level, turnamen, dan sewa raket.',
  description       = 'Sparring Padel membuat lapangan padel Anda tampil energik dan mudah dipesan. Hero-nya memakai foto aksi selebar layar dengan garis lapangan neon dan bilah Booking cepat: pengunjung memilih tanggal, indoor atau outdoor, jam mulai, dan jumlah pemain, lalu pesan WhatsApp untuk admin tersusun otomatis. Di bawahnya ada papan jadwal & harga per jam untuk hari kerja dan akhir pekan, kartu lapangan dengan spesifikasi, formulir cari lawan main dengan level 1 sampai 7, daftar turnamen, harga sewa raket, bola, sepatu, dan coaching, angka komunitas, galeri, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk pengelola lapangan padel, klub padel, dan komunitas yang menerima booking lewat WhatsApp. Jujur soal batasnya: booking hanya menyusun pesan ke admin, jadwal yang tampil adalah contoh yang Anda perbarui sendiri, ketersediaan dikonfirmasi admin, dan tidak ada pembayaran online maupun akun member. Judul, harga, jadwal, lapangan, level, turnamen, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir tetap berbahasa Indonesia.',
  features          = '["Hero foto aksi dengan garis lapangan neon dan bilah Booking cepat (tanggal, indoor/outdoor, jam, pemain) ke WhatsApp","Papan jadwal & harga per jam untuk hari kerja dan akhir pekan, tombol Book per sesi","Kartu lapangan indoor/outdoor dengan foto dan spesifikasi","Cari lawan main: level 1–7 dan formulir nama, hari, jam ke WhatsApp","Daftar turnamen dengan tanggal, kategori, biaya, kuota, dan tombol Daftar","Harga sewa raket, bola, sepatu, coaching, angka komunitas, galeri, dan FAQ","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1390000.00,
  preview_image     = '/assets/templates/sparring-padel-preview.webp',
  gallery           = '["/assets/templates/sparring-padel-1.webp","/assets/templates/sparring-padel-2.webp"]',
  template_code     = 'sparring-padel',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 24
WHERE slug = 'sparring-padel';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_041', 'templates: katalog Sparring Padel');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
