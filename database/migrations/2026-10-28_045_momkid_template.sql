-- ============================================================================
-- Migration 2026-10-28_045 — katalog: template baru MomKid Hospital (website rumah sakit ibu & anak)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code momkid (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-28_045_momkid_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 035):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'momkid' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Kesehatan & Rumah Sakit" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): momkid-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri momkid-1.webp (paket persalinan) & momkid-2.webp (jadwal imunisasi). Foto di dalam
-- template dari Unsplash (public/assets/templates/photos/CREDITS.md, section "MomKid Hospital"). Demo: RSIA MomKid,
-- rumah sakit ibu & anak FIKTIF di Tangerang Selatan; nama dokter, orang tua di testimoni, harga paket, jadwal, dan
-- alamat di demo adalah contoh. Formulir pendaftaran hanya menyusun pesan WhatsApp (data tidak disimpan di website);
-- tidak ada rekam medis, pembayaran online, atau konsultasi video; jadwal imunisasi hanya ringkasan.
--
-- Harga contoh Rp1.790.000 termasuk setup + hosting + SSL tahun pertama. Domain tidak termasuk harga template (dibayar
-- terpisah, dipilih saat memesan). Bisa diubah admin (Pesanan Template > Kelola template).
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris bila belum ada ----------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('momkid', 'MomKid Hospital', 'Kesehatan & Rumah Sakit', '', '', '[]', 1790000.00,
   '/assets/templates/momkid-preview.webp', '[]', 'momkid', NULL, 'published', 28);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'MomKid Hospital',
  category          = 'Kesehatan & Rumah Sakit',
  short_description = 'Template website rumah sakit ibu & anak bernuansa pastel: hero foto ibu dan bayi, paket persalinan, jadwal imunisasi interaktif, dokter anak, klinik laktasi, tur kamar bersalin, dan pendaftaran ke WhatsApp.',
  description       = 'MomKid Hospital membuat rumah sakit ibu dan anak tampil hangat dan menenangkan di depan calon orang tua: foto ibu dan bayi selebar halaman dengan lapisan peach, tepi bergelombang, dan chip pastel yang mengapung. Di bawahnya tersusun tahap layanan dari kehamilan sampai tumbuh kembang, paket persalinan dengan harga mulai untuk dua pilihan kamar, jadwal imunisasi yang menyorot jadwal berikutnya sesuai umur si kecil, kartu jadwal dokter anak, klinik laktasi, foto tur kamar bersalin, artikel parenting, testimoni orang tua, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk RSIA, klinik bersalin, klinik anak, dan klinik laktasi. Formulir pendaftaran menanyakan layanan, tanggal, waktu, dan cara bayar, lalu menyusun pesan WhatsApp; data tidak disimpan di website, dan tidak ada rekam medis, pembayaran online, maupun konsultasi video. Jadwal imunisasi hanya ringkasan yang Anda sesuaikan dengan anjuran dokter anak. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir dan nama hari tetap berbahasa Indonesia.',
  features          = '["Hero foto latar ibu dan bayi dengan lapisan peach, tepi bergelombang, dan chip pastel","Tahap layanan: kehamilan, persalinan, dan tumbuh kembang dalam tab","Paket persalinan dengan harga mulai untuk dua pilihan kamar","Jadwal imunisasi interaktif sesuai umur si kecil (ringkasan, bisa diedit)","Jadwal dokter anak, klinik laktasi, dan tur kamar bersalin","Formulir pendaftaran kunjungan yang menyusun pesan WhatsApp","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1790000.00,
  preview_image     = '/assets/templates/momkid-preview.webp',
  gallery           = '["/assets/templates/momkid-1.webp","/assets/templates/momkid-2.webp"]',
  template_code     = 'momkid',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 28
WHERE slug = 'momkid';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-28_045', 'templates: katalog MomKid Hospital');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
