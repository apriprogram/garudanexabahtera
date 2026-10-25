-- ============================================================================
-- Garuda Nexa — CONTOH katalog template (2 Company Profile + 3 template 2026-10-22 + Serenity + TaniMakmur 2026-10-25)
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

  -- Template 2026-10-22 (brief: docs/platform/TEMPLATE-BRIEFS-2026-10.md). Pratinjau = tangkapan layar asli demo
  -- (WebP 1600x1000); DB yang sudah ada memakai migrasi 2026-10-22_008.
  ('arena-club',
   'Arena Club',
   'Olahraga & Komunitas',
   'Website klub olahraga yang enerjik untuk lapangan padel, tenis, futsal, badminton, gym, dan akademi olahraga.',
   'Arena Club dirancang untuk klub dan tempat olahraga yang ingin tampil profesional sekaligus memudahkan member baru bergabung. Foto besar di bagian pembuka dengan ajakan pesan lapangan, profil klub, angka pencapaian, program latihan dan sewa lapangan, paket membership dengan harga yang jelas, profil pelatih, jadwal turnamen dan acara, testimoni member, serta tombol pesan lewat WhatsApp.

Cocok untuk lapangan padel dan tenis, futsal, badminton, mini soccer, gym, hingga akademi olahraga anak. Semua teks, foto, harga paket, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Desain enerjik dan responsif untuk HP, tablet, dan desktop","Paket membership dengan harga dan benefit yang bisa diubah","Profil pelatih serta jadwal turnamen dan acara klub","Program latihan dan sewa lapangan dalam kartu foto","Tombol pesan lapangan langsung ke WhatsApp","Kelola teks, foto, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1290000.00,
   '/assets/templates/arena-club-preview.webp',
   '["/assets/templates/arena-club-1.webp","/assets/templates/arena-club-2.webp"]',
   'arena-club', NULL, 'published', 3),

  ('aura-studio',
   'Aura Studio',
   'Kecantikan & Klinik',
   'Website elegan untuk klinik kecantikan, salon, nail art, spa, dan barbershop yang ingin tampil premium dan tepercaya.',
   'Aura Studio menghadirkan tampilan lembut dan elegan untuk bisnis kecantikan. Bagian pembuka dengan foto potret besar dan daftar layanan singkat, alasan memilih studio Anda, galeri kategori perawatan dengan tab, sorotan perawatan unggulan beserta tahapannya, harga mulai per layanan, testimoni pelanggan, dan ajakan reservasi lewat WhatsApp.

Cocok untuk klinik kecantikan dan estetika, salon rambut, nail art, spa, lash & brow studio, hingga barbershop. Ubah teks, foto, harga layanan, dan warna sendiri kapan saja lewat CMS tanpa coding.',
   '["Tampilan elegan dan lembut, nyaman dibuka di HP","Daftar perawatan dengan foto, kategori, dan harga mulai","Sorotan perawatan unggulan beserta tahapannya","Galeri suasana studio dan hasil perawatan","Testimoni pelanggan dengan foto","Tombol reservasi langsung ke WhatsApp","Kelola teks, foto, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1390000.00,
   '/assets/templates/aura-studio-preview.webp',
   '["/assets/templates/aura-studio-1.webp","/assets/templates/aura-studio-2.webp"]',
   'aura-studio', NULL, 'published', 4),

  ('finova',
   'Finova',
   'Fintech & Startup',
   'Landing page modern untuk fintech, koperasi, aplikasi pembayaran, konsultan keuangan, dan produk SaaS.',
   'Finova memberi kesan aman, modern, dan meyakinkan untuk produk keuangan. Bagian pembuka gelap dengan foto kartu dan bukti sosial, strip logo mitra, angka pencapaian besar, fitur produk dengan kartu antarmuka melayang, kartu manfaat bento, testimoni pengguna, tanya jawab, ajakan mengunduh aplikasi, serta footer lengkap dengan tautan dan media sosial.

Cocok untuk startup fintech, koperasi simpan pinjam, aplikasi pembayaran dan dompet digital, konsultan keuangan, hingga produk SaaS. Semua isi, angka, logo mitra, dan dua warna merek bisa Anda kelola sendiri lewat CMS tanpa coding.',
   '["Bagian pembuka gelap premium dengan foto produk dan bukti sosial","Strip logo mitra dan angka pencapaian","Fitur produk dengan kartu antarmuka yang teksnya bisa diubah","Kartu manfaat bento dan testimoni pengguna","Tanya jawab (FAQ) untuk calon pengguna atau anggota","Footer lengkap dengan tautan unduh aplikasi","Kelola teks, foto, dan dua warna merek sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1790000.00,
   '/assets/templates/finova-preview.webp',
   '["/assets/templates/finova-1.webp","/assets/templates/finova-2.webp"]',
   'finova', NULL, 'published', 5),

  ('serenity',
   'Serenity',
   'Yoga & Wellness',
   'Website tenang dan modern untuk studio yoga, pilates, dan kelas kebugaran yang ingin tampil profesional.',
   'Serenity menghadirkan suasana tenang sejak layar pertama: slider foto selebar layar (hingga 4 slide) dengan menu transparan, judul dua baris bergradasi lembut, tombol video, kartu kaca kecil, dan strip empat jenis kelas. Di bawahnya tersusun cerita studio dengan angka pencapaian, kartu kelas dengan durasi dan tombol tanya jadwal, langkah memulai, paket harga dengan paket unggulan, cerita peserta, tanya jawab, ajakan, serta kontak dengan peta lokasi.

Cocok untuk studio yoga dan pilates, kelas olahraga ringan, instruktur yoga privat, hingga penyelenggara retret yoga. Pengunjung bisa mencari kelas atau pertanyaan langsung dari menu, lalu mendaftar lewat WhatsApp. Semua teks, gambar, harga paket, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero slider foto selebar layar (hingga 4 slide) dengan menu transparan","Kartu kelas yoga dengan durasi, level, dan tombol tanya jadwal ke WhatsApp","Paket harga dengan paket unggulan yang menonjol","Langkah memulai, cerita peserta, dan tanya jawab (FAQ)","Pencarian kelas dan pertanyaan langsung dari menu","Kelola teks, gambar, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1290000.00,
   '/assets/templates/serenity-preview.webp',
   '["/assets/templates/serenity-1.webp","/assets/templates/serenity-2.webp"]',
   'serenity', NULL, 'published', 6),

  ('tanimakmur',
   'TaniMakmur',
   'Toko Online',
   'Toko online pertanian untuk benih, pupuk, dan alat tani, lengkap dengan paket per tanaman dan konsultasi lewat WhatsApp.',
   'TaniMakmur dirancang untuk toko pertanian yang ingin berjualan online dengan tampilan segar dan meyakinkan. Halaman dibuka dengan foto ladang selebar layar, judul besar, kartu angka, dan strip keunggulan toko. Di bawahnya tersusun kategori produk, pemilih Pilih Tanamanmu yang menampilkan paket lengkap per jenis tanaman (isi paket, jadwal tanam, dan harga hemat), produk terlaris dengan rating dan filter kategori, konsultasi gratis dengan penyuluh lewat WhatsApp, panduan urban farming, testimoni, tanya jawab, serta kontak dengan peta lokasi.

Cocok untuk toko benih, pupuk, dan alat tani, kios saprotan, penjual perlengkapan hidroponik, hingga usaha urban farming. Pembeli memesan produk atau paket lewat WhatsApp dengan pesan yang sudah berisi nama produknya. Semua teks, gambar, harga, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto ladang selebar layar dengan kartu angka dan strip keunggulan","Pilih Tanamanmu: paket per jenis tanaman dengan isi, jadwal tanam, dan harga hemat","Produk terlaris dengan rating, harga coret, dan filter kategori","Pesan produk dan paket langsung lewat WhatsApp","Konsultasi penyuluh, panduan urban farming, testimoni, dan FAQ","Pencarian produk dan paket langsung dari menu","Kelola teks, gambar, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/tanimakmur-preview.webp',
   '["/assets/templates/tanimakmur-1.webp","/assets/templates/tanimakmur-2.webp"]',
   'tanimakmur', NULL, 'published', 8);

-- PuncakGear (2026-10-25, toko perlengkapan mendaki; DB lama: migrasi 2026-10-25_021). Statement terpisah agar
-- template toko online yang dirilis bersamaan bisa ditambahkan tanpa mengubah daftar VALUES di atas.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('puncakgear',
   'PuncakGear',
   'Toko Online',
   'Website toko perlengkapan mendaki dengan panduan per gunung dan kalkulator sewa alat untuk pendaki pemula.',
   'PuncakGear tampil gagah sejak layar pertama: foto pendaki selebar layar dengan menu transparan, judul huruf kapital besar, tombol pil warna terang, dan kartu produk kecil. Di bawahnya tersusun kategori perlengkapan, produk terlaris dengan filter kategori dan tombol pesan, panduan per gunung (misalnya Rinjani, Semeru, Prau) berisi jalur populer, catatan keselamatan, dan daftar perlengkapan yang bisa dicentang pengunjung, lalu bagian sewa alat dengan kalkulator biaya per hari, tips keselamatan, cerita pendaki, tanya jawab, dan lokasi basecamp.

Cocok untuk toko outdoor, penyewaan alat camping dan mendaki, maupun basecamp yang juga menjual perlengkapan. Pesanan, sewa, dan konsultasi dikirim lewat WhatsApp lengkap dengan nama produk, daftar alat, lama sewa, dan perkiraan totalnya. Semua teks, foto, harga, daftar gunung, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero poster foto selebar layar dengan kartu produk","Produk terlaris dengan filter kategori dan tombol pesan ke WhatsApp","Panduan per gunung dengan daftar perlengkapan yang bisa dicentang","Kalkulator sewa alat per hari dengan diskon lama sewa","Tips keselamatan, cerita pendaki, dan tanya jawab (FAQ)","Pencarian produk, gunung, dan alat sewa langsung dari menu","Kelola teks, foto, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/puncakgear-preview.webp',
   '["/assets/templates/puncakgear-1.webp","/assets/templates/puncakgear-2.webp"]',
   'puncakgear', NULL, 'published', 9);

SELECT id, slug, name, price, status, sort_order FROM templates ORDER BY sort_order, id;
