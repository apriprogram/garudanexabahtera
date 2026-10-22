-- ============================================================================
-- Garuda Nexa — CONTOH katalog template (2 Company Profile + 3 template 2026-10-22)
-- ============================================================================
-- Jalankan setelah migrasi 2026-10-19_004 (atau schema.sql untuk DB baru):
--   mysql -u root db_garudanexabahtera < database/seed.templates.sql
--
-- Idempoten: INSERT IGNORE berdasarkan slug, jadi menjalankan ulang tidak menimpa
-- template yang sudah diubah admin. HARGA DI SINI HANYA CONTOH; ubah dari panel
-- admin (Pesanan Template > Kelola Template) sebelum dipakai sungguhan.
-- Gambar pratinjau = tangkapan layar asli demo (WebP 1600x1000) di public/assets/templates/<code>-preview.webp,
-- -1.webp, -2.webp (DB lama: migrasi 2026-10-22_007). Mockup SVG lama tetap ada sebagai cadangan kode.
-- ============================================================================

SET NAMES utf8mb4;

INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('corporate-nexa',
   'Corporate Nexa',
   'Company Profile',
   'Company profile elegan untuk perusahaan yang ingin tampil profesional dan terpercaya.',
   'Corporate Nexa dirancang untuk perusahaan jasa, konsultan, kontraktor, dan distributor yang ingin memperkenalkan bisnisnya secara rapi. Tampilan bersih dengan warna aksen yang bisa disesuaikan, bagian layanan, keunggulan, galeri proyek, testimoni klien, dan kontak lengkap dengan peta lokasi. Semua isi bisa Anda ubah sendiri lewat panel pengelola konten tanpa coding.',
   '["Desain responsif untuk HP, tablet, dan desktop","Ubah teks, gambar, dan warna sendiri lewat CMS","Bagian layanan, keunggulan, dan galeri proyek","Testimoni klien dan angka pencapaian","Kontak lengkap: alamat, email, telepon, WhatsApp, peta","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1500000.00,
   '/assets/templates/corporate-nexa-preview.webp',
   '["/assets/templates/corporate-nexa-1.webp","/assets/templates/corporate-nexa-2.webp"]',
   'corporate-nexa', NULL, 'published', 1),

  ('startup-clean',
   'Startup Clean',
   'Company Profile',
   'Company profile modern dan ringan untuk startup, UMKM, dan bisnis digital.',
   'Startup Clean cocok untuk startup, UMKM, studio kreatif, dan bisnis digital yang ingin tampil modern. Tata letak lapang dengan tipografi tegas, bagian produk atau layanan, statistik singkat, galeri, testimoni, dan ajakan menghubungi lewat WhatsApp. Konten dapat Anda kelola sendiri kapan saja melalui CMS yang mudah dipakai.',
   '["Tampilan modern dan cepat dibuka di HP","Kelola konten sendiri lewat CMS tanpa coding","Bagian layanan, statistik, dan galeri","Testimoni pelanggan","Tombol WhatsApp dan formulir kontak","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   990000.00,
   '/assets/templates/startup-clean-preview.webp',
   '["/assets/templates/startup-clean-1.webp","/assets/templates/startup-clean-2.webp"]',
   'startup-clean', NULL, 'published', 2),

  -- Template 2026-10-22 (brief: docs/platform/TEMPLATE-BRIEFS-2026-10.md). Pratinjau masih placeholder SVG
  -- sampai tangkapan layar demo final dibuat; DB yang sudah ada memakai migrasi 2026-10-22_008.
  ('arena-club',
   'Arena Club',
   'Olahraga & Komunitas',
   'Website klub olahraga yang enerjik untuk lapangan padel, tenis, futsal, badminton, gym, dan akademi olahraga.',
   'Arena Club dirancang untuk klub dan tempat olahraga yang ingin tampil profesional sekaligus memudahkan member baru bergabung. Foto besar di bagian pembuka dengan ajakan pesan lapangan, profil klub, angka pencapaian, program latihan dan sewa lapangan, paket membership dengan harga yang jelas, profil pelatih, jadwal turnamen dan acara, testimoni member, serta tombol pesan lewat WhatsApp.

Cocok untuk lapangan padel dan tenis, futsal, badminton, mini soccer, gym, hingga akademi olahraga anak. Semua teks, foto, harga paket, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Desain enerjik dan responsif untuk HP, tablet, dan desktop","Paket membership dengan harga dan benefit yang bisa diubah","Profil pelatih serta jadwal turnamen dan acara klub","Program latihan dan sewa lapangan dalam kartu foto","Tombol pesan lapangan langsung ke WhatsApp","Kelola teks, foto, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1290000.00,
   '/assets/templates/arena-club-preview.svg',
   '[]',
   'arena-club', NULL, 'published', 3),

  ('aura-studio',
   'Aura Studio',
   'Kecantikan & Klinik',
   'Website elegan untuk klinik kecantikan, salon, nail art, spa, dan barbershop yang ingin tampil premium dan tepercaya.',
   'Aura Studio menghadirkan tampilan lembut dan elegan untuk bisnis kecantikan. Bagian pembuka dengan foto potret besar dan daftar layanan singkat, alasan memilih studio Anda, galeri kategori perawatan dengan tab, sorotan perawatan unggulan beserta tahapannya, harga mulai per layanan, testimoni pelanggan, dan ajakan reservasi lewat WhatsApp.

Cocok untuk klinik kecantikan dan estetika, salon rambut, nail art, spa, lash & brow studio, hingga barbershop. Ubah teks, foto, harga layanan, dan warna sendiri kapan saja lewat CMS tanpa coding.',
   '["Tampilan elegan dan lembut, nyaman dibuka di HP","Daftar perawatan dengan foto, kategori, dan harga mulai","Sorotan perawatan unggulan beserta tahapannya","Galeri suasana studio dan hasil perawatan","Testimoni pelanggan dengan foto","Tombol reservasi langsung ke WhatsApp","Kelola teks, foto, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1390000.00,
   '/assets/templates/aura-studio-preview.svg',
   '[]',
   'aura-studio', NULL, 'published', 4),

  ('finova',
   'Finova',
   'Fintech & Startup',
   'Landing page modern untuk fintech, koperasi, aplikasi pembayaran, konsultan keuangan, dan produk SaaS.',
   'Finova memberi kesan aman, modern, dan meyakinkan untuk produk keuangan. Bagian pembuka gelap dengan foto kartu dan bukti sosial, strip logo mitra, angka pencapaian besar, fitur produk dengan kartu antarmuka melayang, kartu manfaat bento, testimoni pengguna, tanya jawab, ajakan mengunduh aplikasi, serta footer lengkap dengan tautan dan media sosial.

Cocok untuk startup fintech, koperasi simpan pinjam, aplikasi pembayaran dan dompet digital, konsultan keuangan, hingga produk SaaS. Semua isi, angka, logo mitra, dan dua warna merek bisa Anda kelola sendiri lewat CMS tanpa coding.',
   '["Bagian pembuka gelap premium dengan foto produk dan bukti sosial","Strip logo mitra dan angka pencapaian","Fitur produk dengan kartu antarmuka yang teksnya bisa diubah","Kartu manfaat bento dan testimoni pengguna","Tanya jawab (FAQ) untuk calon pengguna atau anggota","Footer lengkap dengan tautan unduh aplikasi","Kelola teks, foto, dan dua warna merek sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1790000.00,
   '/assets/templates/finova-preview.svg',
   '[]',
   'finova', NULL, 'published', 5);

SELECT id, slug, name, price, status, sort_order FROM templates ORDER BY sort_order, id;
