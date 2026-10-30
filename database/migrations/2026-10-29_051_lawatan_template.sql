-- ============================================================================
-- Migration 2026-10-29_051 — katalog: template baru Lawatan (website tour & travel rombongan)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code lawatan (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-29_051_lawatan_template.sql
--
-- Insert-or-update berdasarkan slug, aman diulang (pola sama dengan migrasi 028 dan 048):
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = 'lawatan' → isi katalog disamakan dengan nilai di file ini.
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Kategori "Travel & Transportasi" adalah kategori baru; halaman kategorinya ditambahkan di kode yang sama.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000): lawatan-preview.webp (hero desktop dalam bingkai
-- peramban + hero HP), galeri lawatan-1.webp & lawatan-2.webp (bagian demo). Foto di dalam template dari Unsplash
-- (public/assets/templates/photos/CREDITS.md, section "Lawatan"); bus, rute, dan perangko digambar sebagai SVG. Demo:
-- Lawatan Tour & Travel, biro FIKTIF di Yogyakarta; paket, harga, jarak, dan pelanggan di demo adalah contoh. Formulir
-- hanya menyusun pesan WhatsApp; harga paket contoh dan bisa berubah; kuota, hotel dan jadwal dikonfirmasi admin; tidak
-- ada pembayaran online.
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
  ('lawatan', 'Lawatan', 'Travel & Transportasi', '', '', '[]', 1690000.00,
   '/assets/templates/lawatan-preview.webp', '[]', 'lawatan', NULL, 'published', 34);

-- 2. Samakan isi katalog ----------------------------------------------------------
UPDATE templates SET
  name              = 'Lawatan',
  category          = 'Travel & Transportasi',
  short_description = 'Template website tour & travel rombongan bergaya kartu pos: paket wisata bersaringan, itinerary bergerak saat digulir, hitung biaya, dan pesan ke WhatsApp.',
  description       = 'Lawatan menampilkan biro perjalanan rombongan Anda seperti kumpulan kartu pos: foto pemandangan selebar layar dengan panel kartu pos berisi judul dan pilihan jenis trip (study tour, gathering kantor, keluarga, ziarah) yang langsung menyaring paket. Setiap kartu paket memuat foto, perangko harga mulai per orang, durasi, minimal peserta, yang termasuk, itinerary per hari, serta tombol pesan lewat WhatsApp dan hitung biaya. Bagian itinerary bergerak seperti film saat digulir: bus kecil melaju di garis rute dan kartu pos tiap tempat bergeser bergantian. Di bawahnya ada daftar yang termasuk, formulir hitung & rancang trip dengan estimasi biaya, testimoni, galeri foto, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk biro tour & travel, penyedia study tour sekolah, gathering kantor, dan wisata religi. Formulir hanya menyusun pesan WhatsApp; harga paket contoh dan bisa berubah; kuota, hotel dan jadwal dikonfirmasi admin; tidak ada pembayaran online. Paket, harga, itinerary, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Hero foto pemandangan selebar layar dengan panel kartu pos dan chip jenis trip","Paket wisata bersaringan jenis trip dengan perangko harga mulai per orang","Itinerary per hari di setiap paket","Film itinerary yang bergerak saat digulir: rute, bus, dan kartu pos tiap tempat","Formulir hitung & rancang trip dengan estimasi biaya ke WhatsApp","Yang termasuk, testimoni, galeri, tanya jawab, dan Google Maps","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
  price             = 1690000.00,
  preview_image     = '/assets/templates/lawatan-preview.webp',
  gallery           = '["/assets/templates/lawatan-1.webp","/assets/templates/lawatan-2.webp"]',
  template_code     = 'lawatan',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 34
WHERE slug = 'lawatan';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-29_051', 'templates: katalog Lawatan');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
