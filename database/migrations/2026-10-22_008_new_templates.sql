-- ============================================================================
-- Migration 2026-10-22_008 — katalog: 3 template baru (Arena Club, Aura Studio, Finova)
-- ============================================================================
-- Data saja, tanpa perubahan skema. Target: db_garudanexabahtera yang SUDAH punya tabel
-- `templates` (migrasi 004). Kompatibel MySQL 8.0 (produksi) dan MariaDB 10.4 (XAMPP lokal).
--
-- Jalankan (BACKUP dulu, lihat database/README.md), SETELAH kode yang mendaftarkan
-- template_code arena-club / aura-studio / finova (src/templates/index.ts) ter-deploy:
--   mysql -u root --default-character-set=utf8mb4 db_garudanexabahtera < database/migrations/2026-10-22_008_new_templates.sql
--
-- Insert-or-update berdasarkan slug, aman diulang:
--   1. INSERT IGNORE  → baris dibuat bila slug belum ada (uq_templates_slug).
--   2. UPDATE … WHERE slug = … → isi katalog disamakan dengan nilai di file ini.
-- Tanpa ON DUPLICATE KEY UPDATE … VALUES() (usang di MySQL 8.0.20+, alias baris tidak ada di MariaDB).
-- PERHATIAN: menjalankan ulang MENIMPA perubahan admin (harga, deskripsi, gambar, status) pada 3 slug ini.
-- Tidak ada DELETE. Template lain tidak disentuh.
--
-- Gambar pratinjau masih placeholder (file <slug>-preview.svg di folder public/assets/templates); ganti
-- nilai preview_image/gallery di file ini (dan di database/seed.templates.sql) dengan tangkapan layar demo
-- final sebelum dijalankan di produksi.
--
-- Harga (termasuk setup + domain + hosting + SSL tahun pertama, lihat setting harga):
--   Arena Club   Rp1.290.000  — klub/lapangan olahraga (UMKM), section lebih banyak dari Startup Clean
--   Aura Studio  Rp1.390.000  — klinik kecantikan/salon, tampilan premium untuk usaha bermargin tinggi
--   Finova       Rp1.790.000  — fintech/koperasi/SaaS, template paling kaya (mockup UI, FAQ, footer lengkap)
-- Alasan lengkap: docs/platform/TEMPLATE-BRIEFS-2026-10.md §0.2.
-- ============================================================================

SET NAMES utf8mb4;

-- 1. Buat baris yang belum ada ---------------------------------------------------
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('arena-club', 'Arena Club', 'Olahraga & Komunitas', '', '', '[]', 1290000.00,
   '/assets/templates/arena-club-preview.svg', '[]', 'arena-club', NULL, 'published', 3),
  ('aura-studio', 'Aura Studio', 'Kecantikan & Klinik', '', '', '[]', 1390000.00,
   '/assets/templates/aura-studio-preview.svg', '[]', 'aura-studio', NULL, 'published', 4),
  ('finova', 'Finova', 'Fintech & Startup', '', '', '[]', 1790000.00,
   '/assets/templates/finova-preview.svg', '[]', 'finova', NULL, 'published', 5);

-- 2. Samakan isi katalog ---------------------------------------------------------
UPDATE templates SET
  name              = 'Arena Club',
  category          = 'Olahraga & Komunitas',
  short_description = 'Website klub olahraga yang enerjik untuk lapangan padel, tenis, futsal, badminton, gym, dan akademi olahraga.',
  description       = 'Arena Club dirancang untuk klub dan tempat olahraga yang ingin tampil profesional sekaligus memudahkan member baru bergabung. Foto besar di bagian pembuka dengan ajakan pesan lapangan, profil klub, angka pencapaian, program latihan dan sewa lapangan, paket membership dengan harga yang jelas, profil pelatih, jadwal turnamen dan acara, testimoni member, serta tombol pesan lewat WhatsApp.\n\nCocok untuk lapangan padel dan tenis, futsal, badminton, mini soccer, gym, hingga akademi olahraga anak. Semua teks, foto, harga paket, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
  features          = '["Desain enerjik dan responsif untuk HP, tablet, dan desktop","Paket membership dengan harga dan benefit yang bisa diubah","Profil pelatih serta jadwal turnamen dan acara klub","Program latihan dan sewa lapangan dalam kartu foto","Tombol pesan lapangan langsung ke WhatsApp","Kelola teks, foto, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1290000.00,
  preview_image     = '/assets/templates/arena-club-preview.svg',
  gallery           = '[]',
  template_code     = 'arena-club',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 3
WHERE slug = 'arena-club';

UPDATE templates SET
  name              = 'Aura Studio',
  category          = 'Kecantikan & Klinik',
  short_description = 'Website elegan untuk klinik kecantikan, salon, nail art, spa, dan barbershop yang ingin tampil premium dan tepercaya.',
  description       = 'Aura Studio menghadirkan tampilan lembut dan elegan untuk bisnis kecantikan. Bagian pembuka dengan foto potret besar dan daftar layanan singkat, alasan memilih studio Anda, galeri kategori perawatan dengan tab, sorotan perawatan unggulan beserta tahapannya, harga mulai per layanan, testimoni pelanggan, dan ajakan reservasi lewat WhatsApp.\n\nCocok untuk klinik kecantikan dan estetika, salon rambut, nail art, spa, lash & brow studio, hingga barbershop. Ubah teks, foto, harga layanan, dan warna sendiri kapan saja lewat CMS tanpa coding.',
  features          = '["Tampilan elegan dan lembut, nyaman dibuka di HP","Daftar perawatan dengan foto, kategori, dan harga mulai","Sorotan perawatan unggulan beserta tahapannya","Galeri suasana studio dan hasil perawatan","Testimoni pelanggan dengan foto","Tombol reservasi langsung ke WhatsApp","Kelola teks, foto, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1390000.00,
  preview_image     = '/assets/templates/aura-studio-preview.svg',
  gallery           = '[]',
  template_code     = 'aura-studio',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 4
WHERE slug = 'aura-studio';

UPDATE templates SET
  name              = 'Finova',
  category          = 'Fintech & Startup',
  short_description = 'Landing page modern untuk fintech, koperasi, aplikasi pembayaran, konsultan keuangan, dan produk SaaS.',
  description       = 'Finova memberi kesan aman, modern, dan meyakinkan untuk produk keuangan. Bagian pembuka gelap dengan foto kartu dan bukti sosial, strip logo mitra, angka pencapaian besar, fitur produk dengan kartu antarmuka melayang, kartu manfaat bento, testimoni pengguna, tanya jawab, ajakan mengunduh aplikasi, serta footer lengkap dengan tautan dan media sosial.\n\nCocok untuk startup fintech, koperasi simpan pinjam, aplikasi pembayaran dan dompet digital, konsultan keuangan, hingga produk SaaS. Semua isi, angka, logo mitra, dan dua warna merek bisa Anda kelola sendiri lewat CMS tanpa coding.',
  features          = '["Bagian pembuka gelap premium dengan foto produk dan bukti sosial","Strip logo mitra dan angka pencapaian","Fitur produk dengan kartu antarmuka yang teksnya bisa diubah","Kartu manfaat bento dan testimoni pengguna","Tanya jawab (FAQ) untuk calon pengguna atau anggota","Footer lengkap dengan tautan unduh aplikasi","Kelola teks, foto, dan dua warna merek sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
  price             = 1790000.00,
  preview_image     = '/assets/templates/finova-preview.svg',
  gallery           = '[]',
  template_code     = 'finova',
  demo_url          = NULL,
  status            = 'published',
  sort_order        = 5
WHERE slug = 'finova';

INSERT IGNORE INTO schema_migrations (version, description)
VALUES ('2026-10-22_008', 'templates: katalog Arena Club, Aura Studio, Finova');

SELECT id, slug, name, category, price, status, sort_order FROM templates ORDER BY sort_order, id;
