-- ============================================================================
-- Migration 2026-10-28_042 — katalog: template baru SmashHall (website GOR & klub badminton)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code smashhall (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_042_smashhall_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'smashhall' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Olahraga & Komunitas" sudah ada (dipakai Arena Club). Gambar pratinjau = tangkapan layar asli demo (WebP
-- 1600x1000): smashhall-preview.webp (hero desktop dalam bingkai peramban + hero HP), galeri smashhall-1.webp &
-- smashhall-2.webp (dua section demo). Foto di dalam template dari Unsplash (public/assets/templates/photos/CREDITS.md,
-- section "SmashHall"). Demo: GOR SmashHall, GOR & klub badminton FIKTIF di Bandung; jadwal ketersediaan, harga,
-- pelatih, turnamen, dan produk di demo adalah contoh.
--
-- Harga contoh Rp1.390.000 (termasuk setup + hosting + SSL tahun pertama), sama dengan Sparring Padel. Domain tidak
-- termasuk harga template (dibayar terpisah): dipilih & dibayar saat memesan.
-- Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('smashhall', 'SmashHall', 'Olahraga & Komunitas', '', '', '[]', 1390000.00,
   '/assets/templates/smashhall-preview.webp', '[]', 'smashhall', NULL, 'published', 25);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'SmashHall',
  category          = 'Olahraga & Komunitas',
  short_description = 'Template website GOR & klub badminton: cek lapangan kosong, booking lewat WhatsApp, member bulanan, latihan, akademi, kejuaraan, dan toko perlengkapan.',
  description       = 'SmashHall membuat GOR badminton tampil bersih dan sporty: foto lapangan yang terang selebar layar, judul besar, dua tombol, dan strip kaca berisi ketersediaan delapan lapangan hari ini yang terisi seperti papan skor. Di bawahnya ada tabel lapangan × jam per hari yang bisa dipilih, harga sewa per jam, fasilitas dengan angka besar, tiga paket member bulanan dengan pilihan periode 3 bulan, jadwal latihan dan pelatih, kelas akademi untuk anak, remaja, dan dewasa, garis waktu kejuaraan internal dan antarklub, toko perlengkapan, galeri, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk GOR, sport center bulu tangkis, klub, dan akademi. Booking, pendaftaran member, akademi, turnamen, dan pesanan toko hanya menyusun pesan WhatsApp ke admin: jadwal yang tampil adalah contoh yang Anda isi sendiri, ketersediaan dikonfirmasi admin, tidak ada pembayaran online, tidak ada akun member, tidak ada keranjang belanja, dan data formulir tidak disimpan di website. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir tetap berbahasa Indonesia.',
  features          = '["Hero foto GOR dengan strip ketersediaan 8 lapangan dan animasi kok yang mendarat","Tabel lapangan × jam per hari: pilih slot kosong lalu booking lewat WhatsApp","Tiga paket member bulanan dengan pilihan harga bulanan atau 3 bulan","Jadwal latihan, pelatih berinisial, dan kelas akademi per kelompok usia","Garis waktu kejuaraan internal & antarklub beserta status dan hasil","Toko perlengkapan (raket, kok, grip, sepatu) dengan tombol pesan via WhatsApp","Formulir booking & pendaftaran yang menyusun pesan WhatsApp; data tidak disimpan di website","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1390000.00,
  preview_image     = '/assets/templates/smashhall-preview.webp',
  gallery           = '["/assets/templates/smashhall-1.webp","/assets/templates/smashhall-2.webp"]',
  template_code     = 'smashhall',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 25
WHERE slug = 'smashhall';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_042', 'templates: katalog SmashHall');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
