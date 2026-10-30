-- ============================================================================
-- Garuda Nexa — CONTOH katalog template (2 Company Profile + 3 template 2026-10-22 + Serenity + 5 toko online 2026-10-25)
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
   'serenity', NULL, 'published', 6);

-- SkyNusa (2026-10-25, Toko Online; DB lama: migrasi 2026-10-25_019). Satu statement per template toko
-- online agar baris yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('skynusa',
   'SkyNusa',
   'Toko Online',
   'Website toko drone yang modern untuk menjual drone foto, wedding, dan pemetaan, lengkap dengan paket, sewa harian, dan layanan servis lokal.',
   'SkyNusa tampil seperti lembar spesifikasi yang rapi sejak layar pertama: judul dua nada di kanvas abu berkisi, foto drone dengan kartu angka spesifikasi, dan strip empat keunggulan toko. Di bawahnya tersusun kategori per kebutuhan (foto, wedding, pemetaan) yang memfilter daftar drone, kartu produk dengan harga coret dan tombol keranjang, paket bundling drone + tas + baterai cadangan, kalkulator sewa harian, layanan servis lokal, kelas terbang gratis, cerita pelanggan, tanya jawab, serta kontak dengan peta lokasi.

Cocok untuk toko dan reseller drone, penyedia sewa drone, bengkel servis drone, hingga toko kamera yang juga menjual drone. Pengunjung bisa mengisi keranjang dan menghitung biaya sewa, lalu mengirim pesanan lewat WhatsApp; tidak ada pembayaran online. Semua teks, gambar, harga, isi paket, tarif sewa, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero lembar spesifikasi dengan foto drone dan kartu angka spesifikasi","Kategori per kebutuhan yang memfilter daftar drone","Kartu produk dengan harga coret, label, dan keranjang yang dikirim ke WhatsApp","Paket bundling drone + tas + baterai cadangan dengan label hemat","Kalkulator sewa harian: unit, tanggal, lama sewa, dan potongan","Layanan servis lokal, kelas terbang gratis, cerita pelanggan, dan FAQ","Kelola teks, gambar, harga, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/skynusa-preview.webp',
   '["/assets/templates/skynusa-1.webp","/assets/templates/skynusa-2.webp"]',
   'skynusa', NULL, 'published', 7);

-- TaniMakmur (2026-10-25, Toko Online; DB lama: migrasi 2026-10-25_020). Satu statement per template toko
-- online agar baris yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
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

-- PuncakGear (2026-10-25, Toko Online; DB lama: migrasi 2026-10-25_021). Satu statement per template toko
-- online agar baris yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain.
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

-- GadgetKu.id (2026-10-25, Toko Online; DB lama: migrasi 2026-10-25_022). Satu statement per template toko
-- online agar baris yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('gadgetku',
   'GadgetKu.id',
   'Toko Online',
   'Template website toko aksesoris HP yang bersih dan modern, dengan pencarian aksesoris berdasarkan tipe HP.',
   'GadgetKu.id dibuat untuk toko casing, tempered glass, charger, kabel, earphone, dan power bank. Pembeli memilih merek lalu tipe HP-nya, dan aksesoris yang cocok langsung tampil: casing dan tempered glass sesuai tipe, kabel sesuai port, plus charger dan earphone untuk semua HP. Di halaman yang sama ada kartu kategori berfoto besar, baris produk terbaru dengan harga coret dan penyaring kategori, paket bundling hemat yang menghitung potongan harganya sendiri, serta layanan custom casing: pengunjung mencoba fotonya sendiri di mockup casing langsung di browser.

Cocok untuk toko aksesoris HP di ruko atau mal, penjual online yang juga berjualan di marketplace, dan usaha casing custom. Semua pesanan diarahkan ke WhatsApp berisi nama produk, harga, dan tipe HP pembeli. Teks, foto, produk, harga, daftar tipe HP, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Pencarian aksesoris berdasarkan merek dan tipe HP","Baris produk terbaru dengan harga coret, label diskon otomatis, dan penyaring kategori","Paket bundling hemat dengan potongan harga yang dihitung otomatis","Coba casing custom dengan foto sendiri langsung di browser","Pesan lewat WhatsApp berisi nama produk, harga, dan tipe HP","Kelola produk, harga, tipe HP, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/gadgetku-preview.webp',
   '["/assets/templates/gadgetku-1.webp","/assets/templates/gadgetku-2.webp"]',
   'gadgetku', NULL, 'published', 10);

-- GlowStory (2026-10-25, Toko Online; DB lama: migrasi 2026-10-25_023). Satu statement per template toko
-- online agar baris yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('glowstory',
   'GlowStory',
   'Toko Online',
   'Template website toko skincare & kosmetik online untuk brand lokal: kuis jenis kulit, pesanan lewat WhatsApp, dan kalkulator langganan isi ulang.',
   'GlowStory adalah template website toko skincare dan kosmetik dengan suasana hangat seperti katalog butik: kolase foto produk dengan kartu produk unggulan dan lencana rating, strip keunggulan toko, kategori, serta produk terlaris lengkap dengan harga coret, rating, dan saringan per kategori. Pengunjung menyusun daftar belanja di halaman lalu mengirimnya sebagai pesanan WhatsApp lengkap dengan subtotal; ongkir dan pembayaran Anda konfirmasi lewat chat.

Tiga fitur mendorong pembelian berulang: kuis jenis kulit yang menyusun rutinitas pagi dan malam beserta produknya, kalkulator langganan isi ulang yang langsung menunjukkan hemat per kiriman dan per tahun (dikonfirmasi lewat WhatsApp, tanpa penagihan otomatis), serta ulasan pelanggan berfoto. Ada juga strip brand lokal, tanya jawab, dan pita ajakan. Semua teks, foto, harga, pertanyaan kuis, dan warna bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Kuis jenis kulit dengan hasil rutinitas pagi & malam beserta produknya","Daftar belanja yang dikirim sebagai pesanan WhatsApp lengkap dengan subtotal","Kalkulator langganan isi ulang: harga per kiriman dan hemat setahun","Produk terlaris dengan harga coret, rating, label, dan saringan kategori","Ulasan pelanggan berfoto yang bisa diperbesar","Kelola teks, foto, harga, kuis, dan warna sendiri lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/glowstory-preview.webp',
   '["/assets/templates/glowstory-1.webp","/assets/templates/glowstory-2.webp"]',
   'glowstory', NULL, 'published', 11);

-- Madani (2026-10-25, Sekolah & Pendidikan; DB lama: migrasi 2026-10-25_024). Satu statement per template agar baris
-- yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('madani',
   'Madani',
   'Sekolah & Pendidikan',
   'Template website sekolah Islam untuk SMA IT, madrasah aliyah, dan sekolah berasrama: slider foto, profil, berita, agenda, dan PPDB lewat WhatsApp.',
   'Madani tampil teduh dan rapi sejak layar pertama: slider foto sekolah selebar layar dengan menu pil, judul dengan kata sorotan, tombol Daftar PPDB, dan kartu info gelombang pendaftaran. Di bawahnya tersusun strip keunggulan, sambutan kepala sekolah, profil dengan tab visi, misi, dan nilai, statistik siswa dan guru, program unggulan seperti tahfidz dan kelas sains, daftar prestasi, fasilitas, berita yang bisa dibaca di tempat, pengumuman bertanda Penting, agenda kegiatan, galeri, cerita alumni, tanya jawab, serta lokasi dengan peta Google Maps.

Cocok untuk SMA Islam terpadu, madrasah aliyah, dan sekolah berasrama. Bagian PPDB memuat jalur pendaftaran, jadwal, syarat, alur, dan rincian biaya, plus formulir minat yang menyusun pesan WhatsApp untuk panitia; data tidak disimpan di website dan tidak ada pembayaran online. Demo memakai SMA IT Nurul Azka, sekolah fiktif di Bogor. Semua teks, foto, dan warna tema (hijau, biru, atau warna lain) bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero slider foto dengan tombol Daftar PPDB dan kartu info pendaftaran","PPDB: jalur, jadwal, syarat, alur, biaya, dan formulir minat ke WhatsApp","Sambutan kepala sekolah, profil, visi & misi, dan statistik sekolah","Program unggulan, prestasi, fasilitas, dan galeri kegiatan","Berita, pengumuman bertanda Penting, dan agenda kegiatan","Cerita alumni, tanya jawab, dan peta lokasi Google Maps","Warna tema bisa diganti (hijau, biru, atau warna lain) lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/madani-preview.webp',
   '["/assets/templates/madani-1.webp","/assets/templates/madani-2.webp"]',
   'madani', NULL, 'published', 12);

-- Cakrawala (2026-10-25, Sekolah & Pendidikan; DB lama: migrasi 2026-10-25_025). Satu statement per template agar
-- baris yang dirilis bersamaan bisa ditambah tanpa mengubah daftar VALUES lain. Demo: SMK Cakrawala Karya (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('cakrawala',
   'Cakrawala',
   'Sekolah & Pendidikan',
   'Template website SMK dan SMA yang modern: hero slider foto, PPDB dengan formulir ke WhatsApp, berita, pengumuman, alumni, dan BKK.',
   'Cakrawala membuat website sekolah tampil rapi dan meyakinkan sejak layar pertama: slider foto besar selebar layar dengan logo sekolah dan menu pil, pengumuman PPDB di bagian paling atas, dan tiga kartu info. Di bawahnya tersusun statistik sekolah, sambutan kepala sekolah, profil dengan visi dan misi, program keahlian, teaching factory dan mitra industri, prestasi, PPDB (jalur, jadwal, syarat, alur, biaya, dan formulir singkat), berita dengan filter kategori, pengumuman, agenda, cerita alumni, Bursa Kerja Khusus, fasilitas, galeri, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk SMK negeri maupun swasta, dan bisa dipakai SMA dengan mengganti program keahlian menjadi peminatan. Formulir PPDB menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online. Semua teks, foto, jadwal, dan satu warna tema (misalnya biru atau hijau) bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero slider foto dengan menu pil, pengumuman PPDB, dan kartu info","PPDB bertab: jalur, jadwal, syarat, alur, dan biaya","Formulir pendaftaran singkat yang menyusun pesan WhatsApp untuk panitia","Berita dengan filter kategori, pengumuman bertanggal, dan agenda kegiatan","Sambutan kepala sekolah, profil, visi & misi, program keahlian, dan prestasi","Teaching factory, mitra industri, alumni, dan Bursa Kerja Khusus","Satu warna tema yang bisa diganti, misalnya biru atau hijau","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/cakrawala-preview.webp',
   '["/assets/templates/cakrawala-1.webp","/assets/templates/cakrawala-2.webp"]',
   'cakrawala', NULL, 'published', 13);

-- Bestari (2026-10-26, Sekolah & Pendidikan; DB lama: migrasi 2026-10-26_028). Demo: SMA Bestari Cendekia (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('bestari',
   'Bestari',
   'Sekolah & Pendidikan',
   'Template website SMA yang modern dan meyakinkan: hero slider foto, navbar transparan, PPDB dengan formulir ke WhatsApp, berita, program, dan guru.',
   'Bestari membuat website SMA terasa modern dan meyakinkan sejak layar pertama: slider foto besar selebar layar dengan navbar yang transparan di atas foto lalu putih saat digulir, bilah info kontak dan pengumuman PPDB, tiga angka sekolah yang menghitung naik, dan kartu sorotan. Di bawahnya tersusun lencana sekolah, profil dengan visi dan misi, angka sekolah, sambutan kepala sekolah, alasan memilih sekolah, carousel program unggulan, prestasi, guru, PPDB (jalur, jadwal, syarat, alur, biaya, dan formulir singkat yang memeriksa usia calon siswa), berita dengan filter kategori, pengumuman, agenda, testimoni orang tua dan alumni, galeri, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk SMA swasta maupun negeri, dan bisa dipakai MA dengan mengganti isi program. Formulir PPDB menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online. Semua teks, foto, jadwal, dan satu warna tema (misalnya terakota, hijau, atau biru) bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero slider foto selebar layar dengan navbar transparan dan pengumuman PPDB","PPDB bertab: jalur, jadwal, syarat, alur, dan biaya","Formulir pendaftaran SMA yang memeriksa usia calon siswa dan menyusun pesan WhatsApp untuk panitia","Berita dengan filter kategori, pengumuman bertanggal, dan agenda kegiatan","Profil, sambutan kepala sekolah, carousel program unggulan, prestasi, dan guru","Testimoni orang tua & alumni, galeri, dan tanya jawab","Satu warna tema yang bisa diganti, misalnya terakota, hijau, atau biru","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/bestari-preview.webp',
   '["/assets/templates/bestari-1.webp","/assets/templates/bestari-2.webp"]',
   'bestari', NULL, 'published', 14);

-- Altura (2026-10-27, Company Profile; DB lama: migrasi 2026-10-27_032). Demo: Altura Developments (fiktif, konten berbahasa Inggris).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('altura',
   'Altura',
   'Company Profile',
   'Template company profile berbahasa Inggris untuk developer properti dan perusahaan besar: hero dua panel, proyek unggulan, portofolio berfilter, dan formulir enquiry.',
   'Altura membuat perusahaan Anda tampil seperti developer properti kelas dunia sejak layar pertama: menu pil putih yang menumpang di atas hero dua panel, foto menara di kiri, dan panel krem berisi judul besar, lingkaran angka pengalaman, serta pil berfoto ke video perusahaan atau bagian proyek. Di bawahnya tersusun profil perusahaan, tiga pilar bernomor, deret layanan yang berjalan pelan, pita angka raksasa di atas foto cakrawala, keunggulan berikon, proyek unggulan berbentuk akordion, portofolio properti dengan filter kategori, harga, dan spesifikasi, pimpinan, penghargaan, testimoni, artikel wawasan, ajakan berfoto malam, daftar kantor, peta, dan formulir enquiry.

Konten demo berbahasa Inggris sehingga cocok untuk perusahaan besar, multinasional, eksportir, dan perusahaan yang melayani klien luar negeri; semua teks di setiap bagian, termasuk menu, label formulir, dan pesan galat, tetap bisa Anda ganti lewat CMS, termasuk ke bahasa Indonesia. Formulir enquiry menyusun pesan WhatsApp atau email untuk tim Anda tanpa menyimpan data. Satu warna tema (limau bawaan) bisa diganti, dan warna teks menyesuaikan otomatis agar tetap terbaca.',
   '["Hero dua panel: foto menara, judul besar, lingkaran angka, dan pil berfoto ke video atau proyek","Konten demo berbahasa Inggris; semua teks, termasuk label formulir dan pesan galat, bisa diganti lewat CMS","Proyek unggulan berbentuk akordion dan portofolio properti dengan filter kategori","Pita angka raksasa, tiga pilar bernomor, dan keunggulan berikon","Pimpinan, penghargaan, testimoni, dan artikel wawasan","Formulir enquiry yang menyusun pesan WhatsApp atau email, plus daftar kantor dan peta","Satu warna tema yang bisa diganti, warna teks menyesuaikan otomatis","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1890000.00,
   '/assets/templates/altura-preview.webp',
   '["/assets/templates/altura-1.webp","/assets/templates/altura-2.webp"]',
   'altura', NULL, 'published', 15);

-- Portline (2026-10-27, Company Profile; DB lama: migrasi 2026-10-27_033). Demo: Quaymoor Group, Rotterdam (fiktif), konten berbahasa Inggris.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('portline',
   'Portline',
   'Company Profile',
   'Template company profile berbahasa Inggris untuk perusahaan pelayaran, logistik, dan grup multinasional: hero slider berindeks, newsroom bertagar, armada, jaringan global, dan formulir enquiry.',
   'Portline membuat perusahaan pelayaran, logistik, atau grup multinasional tampil seperti korporasi internasional sejak layar pertama: slider foto selebar layar dengan indeks 01/02/03, lingkaran radar, menu dua lapis dengan tombol utilitas biru, serta deret logo perusahaan grup. Di bawahnya tersusun newsroom berbentuk mosaik dengan filter tagar, liputan media, angka perusahaan berikon, kartu perusahaan grup atau layanan, carousel armada yang melebar, jaringan global per kawasan, pita keberlanjutan, banner karier, pimpinan, kontak kantor pusat dan kantor regional, serta footer navy multi-kolom.

Konten demo berbahasa Inggris (Quaymoor Group, fiktif) dan bisa diganti seluruhnya lewat CMS, termasuk ke bahasa Indonesia: semua teks yang tampil, dari menu, judul, dan tombol sampai label formulir, pesan galat, dan judul kolom footer. Formulir enquiry menyusun pesan WhatsApp atau email untuk tim Anda; tidak ada data yang disimpan, dan tombol utilitas seperti "Shipment enquiry" hanya membuka formulir atau tautan pilihan Anda, bukan sistem pelacakan. Pilihan bahasa EN | ID tampil bila Anda menautkan versi bahasa lain. Satu warna tema bisa Anda ganti sendiri tanpa coding.',
   '["Konten demo berbahasa Inggris untuk perusahaan besar, multinasional, dan eksportir","Hero slider foto selebar layar dengan indeks 01/02/03 dan deret logo perusahaan grup","Menu dua lapis dengan tombol utilitas dan pilihan bahasa EN | ID yang menaut ke versi bahasa lain Anda","Newsroom mosaik dengan filter tagar, isi berita, dan liputan media","Kartu perusahaan grup, carousel armada, dan jaringan global per kawasan","Formulir enquiry yang menyusun pesan WhatsApp atau email, tanpa menyimpan data","Semua teks, termasuk nama menu, label formulir, dan pesan galat, bisa diganti lewat CMS; satu warna tema yang bisa diganti","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1890000.00,
   '/assets/templates/portline-preview.webp',
   '["/assets/templates/portline-1.webp","/assets/templates/portline-2.webp"]',
   'portline', NULL, 'published', 16);

-- Velora (2026-10-27, Company Profile; DB lama: migrasi 2026-10-27_034). Demo: Velora Motor Group (grup otomotif fiktif, Zurich), salinan demo berbahasa Inggris.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('velora',
   'Velora',
   'Company Profile',
   'Template company profile berbahasa Inggris untuk grup otomotif dan perusahaan besar: hero kartu foto, jajaran model berfilter, carousel teknologi, dan formulir test drive ke WhatsApp/email.',
   'Velora menampilkan perusahaan besar dengan gaya showroom yang gelap dan elegan: kartu foto lebar dengan menu di dalamnya, judul dengan satu kata di dalam pil dan chip panah merah, serta kartu sorotan yang bisa menautkan video. Di bawahnya tersusun filosofi perusahaan, bento kartu foto dan baris berpanah, jajaran model dengan tombol filter, langkah kepemilikan, carousel teknologi yang melebar saat dipilih, angka perusahaan yang menghitung naik, dinding potret testimoni, newsroom, formulir test drive, daftar studio atau dealer dengan Google Maps, dan footer dengan newsletter.

Salinan demo berbahasa Inggris untuk grup otomotif fiktif Velora Motor Group, cocok untuk perusahaan multinasional, eksportir, dealer, dan perusahaan yang melayani klien luar negeri. Formulir test drive dan newsletter hanya menyusun pesan WhatsApp atau email; tidak ada penyimpanan data, sistem booking, atau pembayaran online. Semua teks yang tampil, termasuk label dan pesan galat formulir, bisa Anda ganti lewat CMS (juga ke bahasa Indonesia), begitu pula foto dan warna aksen, tanpa coding.',
   '["Hero kartu foto lebar dengan menu di dalamnya, judul berpil, dan kartu sorotan yang bisa menautkan video","Jajaran produk atau model dengan tombol filter kategori, harga, dan spesifikasi singkat","Carousel teknologi yang melebar saat dipilih dan angka perusahaan yang menghitung naik","Dinding potret testimoni yang bisa diklik dan newsroom berita perusahaan","Formulir test drive yang menyusun pesan WhatsApp atau email, tanpa menyimpan data","Daftar studio atau dealer dengan Google Maps dan footer dengan newsletter lewat email","Salinan demo berbahasa Inggris; semua teks yang tampil (termasuk label formulir), foto, dan warna aksen bisa diubah lewat CMS","Domain sendiri dan sertifikat SSL (HTTPS)"]',
   1890000.00,
   '/assets/templates/velora-preview.webp',
   '["/assets/templates/velora-1.webp","/assets/templates/velora-2.webp"]',
   'velora', NULL, 'published', 17);

-- Dermaga (2026-10-27, Company Profile; DB lama: migrasi 2026-10-27_035). Demo: PT Lintas Dermaga Nusantara, general trading & freight forwarding Surabaya (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('dermaga',
   'Dermaga',
   'Company Profile',
   'Template company profile ekspor impor & freight forwarding: hero rute di atas foto terminal, layanan bernomor, pasar & Incoterm, proses kerja, dan formulir penawaran ke WhatsApp.',
   'Dermaga membuat perusahaan ekspor impor tampil rapi dan meyakinkan di depan calon pembeli dan mitra: judul besar, foto terminal peti kemas selebar halaman dengan garis rute dan label pelabuhan, serta empat angka ringkas seperti jumlah pengiriman dan negara tujuan. Di bawahnya tersusun daftar klien, profil perusahaan dengan baris fakta, layanan bernomor (freight forwarding, konsolidasi LCL, dokumen, trading, pemeriksaan, trucking), pita pasar berisi kawasan tujuan, pelabuhan, dan Incoterm, proses kerja lima langkah, galeri, testimoni dengan rute pengiriman, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk freight forwarder, perusahaan general trading, eksportir, dan importir. Formulir permintaan penawaran menanyakan produk, volume, Incoterm, dan negara tujuan atau asal, lalu menyusun pesan WhatsApp; data tidak disimpan di website dan tidak ada pelacakan kiriman real-time. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir, label kontak, dan judul kolom footer tetap berbahasa Indonesia.',
   '["Hero rute: foto terminal peti kemas dengan garis rute, label pelabuhan, dan angka ringkas","Layanan bernomor: freight forwarding, konsolidasi LCL, dokumen, trading, pemeriksaan, dan trucking","Pita pasar: kawasan tujuan, pelabuhan, dan Incoterm yang dilayani","Proses kerja lima langkah beserta dokumen di setiap langkah","Formulir permintaan penawaran (produk, volume, Incoterm, negara tujuan/asal) yang menyusun pesan WhatsApp","Klien, galeri, testimoni dengan rute pengiriman, dan tanya jawab","Satu warna aksen yang bisa diganti; pita pasar dan footer ikut menyesuaikan","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/dermaga-preview.webp',
   '["/assets/templates/dermaga-1.webp","/assets/templates/dermaga-2.webp"]',
   'dermaga', NULL, 'published', 18);

-- Saudagar (2026-10-27, Company Profile; DB lama: migrasi 2026-10-27_036). Demo: PT Saudagar Hasil Bumi, eksportir hasil bumi Makassar (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('saudagar',
   'Saudagar',
   'Company Profile',
   'Template website eksportir kopi, kakao & rempah: hero tiga foto lengkung, tab spesifikasi komoditas, kalender panen, dan formulir penawaran ke WhatsApp.',
   'Saudagar membuat perusahaan ekspor hasil bumi tampil hangat dan berkelas: judul serif besar di atas kertas krem, tiga foto berbingkai lengkung dengan keterangan asal, menu yang terbagi di kiri dan kanan nama perusahaan, dan tombol permintaan penawaran. Di bawahnya tersusun cerita perusahaan dengan angka besar, tab spesifikasi komoditas (grade, asal, kadar air, kemasan, dan minimum pemesanan), langkah mutu dan daftar dokumen, kalender musim panen per bulan, daerah asal dan pasar tujuan dengan Incoterm, galeri, testimoni pembeli, tanya jawab, pita ajakan, serta kontak dengan Google Maps.

Cocok untuk eksportir kopi, kakao, cengkeh, pala, kayu manis, kelapa, dan kopra, juga koperasi atau pengepul yang mulai menjual ke luar negeri. Formulir permintaan penawaran menyusun pesan WhatsApp untuk tim penjualan; data tidak disimpan di website, harga komoditas tidak diperbarui otomatis, dan tidak ada pelacakan kiriman. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label dan tombol formulir, label kontak, dan judul kolom footer tetap berbahasa Indonesia.',
   '["Hero tiga foto berbingkai lengkung dengan judul serif dan keterangan asal komoditas","Tab spesifikasi komoditas: grade, asal, kadar air, kemasan, dan minimum pemesanan","Kalender musim panen per bulan untuk setiap komoditas","Langkah mutu bernomor dan daftar dokumen pengapalan","Daerah asal dan pasar tujuan dengan pelabuhan dan Incoterm","Formulir permintaan penawaran (komoditas, volume, Incoterm, negara tujuan) yang menyusun pesan WhatsApp","Galeri, testimoni pembeli, dan tanya jawab","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/saudagar-preview.webp',
   '["/assets/templates/saudagar-1.webp","/assets/templates/saudagar-2.webp"]',
   'saudagar', NULL, 'published', 19);

-- NusaNiaga (2026-10-27, Company Profile; DB lama: migrasi 2026-10-27_037). Demo: PT Arunika Niaga Internasional, importir & distributor bahan baku dan mesin Cikarang (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('nusaniaga',
   'NusaNiaga',
   'Company Profile',
   'Template company profile importir & distributor: hero foto berbilah, chip negara asal, layanan, produk bahan baku & mesin, proses impor, jangkauan, dan formulir penawaran ke WhatsApp.',
   'NusaNiaga membuat perusahaan importir dan distributor tampil rapi dan meyakinkan di depan bagian pengadaan pabrik: judul besar di samping satu foto gudang yang dipotong menjadi bilah-bilah vertikal, chip negara asal yang langsung menuju bagian jangkauan, dan tombol permintaan penawaran di blok warna aksen pada menu atas. Di bawahnya tersusun klien dan strip industri yang berjalan pelan, layanan (sourcing, impor, gudang, distribusi, instalasi mesin, suku cadang), produk bahan baku, mesin, dan suku cadang beserta negara asalnya, proses impor buka-tutup dengan garis alur, negara asal dan area pengantaran, keunggulan dengan angka besar, testimoni bagian pengadaan, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk importir bahan baku, supplier mesin industri, agen sourcing, dan distributor suku cadang. Formulir permintaan penawaran menanyakan kebutuhan, produk, volume, negara asal, Incoterm, dan lokasi pabrik, lalu menyusun pesan WhatsApp; data tidak disimpan di website, tidak ada pelacakan kiriman real-time, dan harga tidak diperbarui otomatis. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir, label kontak, dan judul kolom footer tetap berbahasa Indonesia.',
   '["Hero berbilah: satu foto tegak dipotong menjadi bilah vertikal, dengan chip negara asal yang menuju bagian Jangkauan","Menu atas dengan blok warna aksen untuk tombol permintaan penawaran","Klien dan strip industri yang berjalan pelan","Layanan impor serta produk bahan baku, mesin, dan suku cadang beserta negara asalnya","Proses impor buka-tutup dengan garis alur yang terisi saat digulir","Formulir permintaan penawaran (kebutuhan, produk, volume, negara asal, Incoterm, lokasi pabrik) yang menyusun pesan WhatsApp","Keunggulan dengan angka besar bersatuan, testimoni, tanya jawab, dan peta lokasi","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/nusaniaga-preview.webp',
   '["/assets/templates/nusaniaga-1.webp","/assets/templates/nusaniaga-2.webp"]',
   'nusaniaga', NULL, 'published', 20);

-- Jumantara (2026-10-27, Sekolah & Pendidikan; DB lama: migrasi 2026-10-27_038). Demo: nama "SMA Negeri 1 Purbolinggo" (Lampung Timur) sebagai contoh, data demo lain fiktif.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('jumantara',
   'Jumantara',
   'Sekolah & Pendidikan',
   'Template website sekolah negeri untuk SMA yang rapi dan elegan: slider foto dengan bilah progres, angka sekolah, berita, pengumuman, agenda, dan informasi SPMB.',
   'Jumantara menampilkan website SMA negeri yang profesional dan tenang: bilah utilitas berisi kontak dan tautan PPID atau E-Learning, slider foto selebar layar dengan bilah progres per slide, dan pita angka sekolah di bagian bawah foto. Di bawahnya tersusun layanan cepat, sambutan kepala sekolah, profil dengan tab visi dan misi, kelompok mata pelajaran pilihan, berita, pengumuman, agenda, prestasi, ekstrakurikuler, fasilitas, guru, SPMB, alumni, galeri, tanya jawab, dan peta.

Cocok untuk SMA negeri maupun swasta. Bagian SPMB menautkan portal provinsi dan menyediakan formulir tanya panitia yang menyusun pesan WhatsApp; tidak ada penyimpanan data pendaftar atau pembayaran online. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna tema bisa Anda ubah sendiri lewat CMS tanpa coding; label dan tombol formulir, label kontak, dan tautan lampiran pengumuman tetap berbahasa Indonesia.',
   '["Hero slider foto selebar layar dengan bilah progres per slide, tombol jeda, dan pita angka sekolah","Bilah utilitas berisi kontak, jam layanan, dan tautan cepat seperti PPID dan E-Learning","Berita utama berfoto, pengumuman bertanda Penting, dan agenda dengan ubin tanggal","Bagian SPMB bertab (jalur, jadwal, syarat) dengan tautan ke portal provinsi","Formulir tanya panitia yang menyusun pesan WhatsApp, tanpa penyimpanan data","Sambutan kepala sekolah, visi-misi bertab, mapel pilihan, ekstrakurikuler berfilter, fasilitas, guru, alumni, galeri, FAQ, dan peta","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/jumantara-preview.webp',
   '["/assets/templates/jumantara-1.webp","/assets/templates/jumantara-2.webp"]',
   'jumantara', NULL, 'published', 21);

-- Nawasena (2026-10-27, Sekolah & Pendidikan; DB lama: migrasi 2026-10-27_039). Demo: nama "SMA Negeri 1 Purbolinggo" (Lampung Timur) sebagai contoh, data demo lain fiktif.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('nawasena',
   'Nawasena',
   'Sekolah & Pendidikan',
   'Template website profil sekolah untuk SMA negeri yang elegan: slider foto latar, strip pengumuman, statistik, berita, agenda, dan informasi SPMB.',
   'Nawasena membuat website profil sekolah terasa resmi dan tenang: slider foto latar selebar layar dengan nomor slide vertikal dan tombol jeda, strip pengumuman berjalan, pita statistik sekolah, sambutan kepala sekolah, profil dengan visi, misi, dan sejarah singkat, tab paket mata pelajaran pilihan, prestasi, berita, pita pengumuman dan agenda, ekstrakurikuler, fasilitas, guru, informasi SPMB, galeri, cerita alumni, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk SMA negeri maupun swasta. Formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia; tidak ada penyimpanan data pendaftar atau pembayaran online, dan pendaftaran tetap di portal provinsi. Judul, isi setiap bagian, foto, jadwal, dan satu warna tema (bawaan biru dengan nuansa navy) bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir, label kontak, judul kolom footer, dan beberapa label kecil tetap berbahasa Indonesia.',
   '["Hero slider foto latar dengan nomor slide vertikal, tombol jeda, dan strip pengumuman","Pita statistik sekolah dengan angka yang menghitung naik","Sambutan kepala sekolah, profil, visi, misi, dan sejarah singkat","Tab paket mata pelajaran pilihan kelas XI–XII dan kokurikuler","Berita, pengumuman bertanggal, dan linimasa agenda","Informasi SPMB: jalur, jadwal, syarat, tautan portal provinsi, dan formulir tanya ke WhatsApp","Ekstrakurikuler, fasilitas, guru, galeri, alumni, dan tanya jawab","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/nawasena-preview.webp',
   '["/assets/templates/nawasena-1.webp","/assets/templates/nawasena-2.webp"]',
   'nawasena', NULL, 'published', 22);

-- Pradipta (2026-10-27, Sekolah & Pendidikan; DB lama: migrasi 2026-10-27_040). Demo: nama "SMA Negeri 1 Purbolinggo" (Lampung Timur) sebagai contoh, data demo lain fiktif.
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('pradipta',
   'Pradipta',
   'Sekolah & Pendidikan',
   'Template landing page SMA negeri yang terang dan rapi: hero slider foto dengan thumbnail, statistik, berita, pengumuman, agenda, info SPMB, dan formulir tanya panitia ke WhatsApp.',
   'Pradipta membuat SMA negeri tampil terang, rapi, dan tenang sejak layar pertama: header putih dengan menu yang penunjuknya bergeser mengikuti bagian yang sedang dibaca, slider foto selebar layar dengan judul di kartu putih, dan deret thumbnail foto berbilah progres sebagai tombol slide. Di bawahnya tersusun akses cepat, statistik dalam gelembung angka, profil dengan visi, misi, dan nilai sekolah, sambutan kepala sekolah, kelompok mata pelajaran pilihan dengan foto yang berganti, ekstrakurikuler bersaring, linimasa prestasi per tahun, kartu fasilitas sekolah, berita berfilter kategori, pengumuman, agenda berbentuk ubin kalender, guru, informasi SPMB (tab jalur, jadwal, dan syarat), testimoni, galeri, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk SMA negeri yang membutuhkan landing page SPMB setiap tahun ajaran dan tempat rutin menerbitkan berita, pengumuman, dan agenda. Pendaftaran tetap lewat portal SPMB provinsi; formulir tanya panitia hanya menyusun pesan WhatsApp, data tidak disimpan di website, tidak ada unggah berkas, dan tidak ada pembayaran online. Judul, foto, isi setiap bagian, dan satu warna tema bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir dan tombol kontrol slider tetap berbahasa Indonesia.',
   '["Header putih dengan penunjuk menu yang bergeser mengikuti bagian yang dibaca dan tombol Info SPMB","Hero slider foto selebar layar: judul di kartu putih, thumbnail berbilah progres, jeda, dan geser di HP","Akses cepat ke SPMB, pengumuman, e-learning, dan PPID, statistik dalam gelembung angka, profil, visi, misi, dan nilai sekolah","Kelompok mata pelajaran pilihan, ekstrakurikuler bersaring, linimasa prestasi per tahun, dan kartu fasilitas","Berita berfilter kategori, pengumuman berlabel Penting, dan agenda berbentuk ubin kalender","Info SPMB (tab jalur, jadwal, syarat), tautan portal provinsi, dan formulir tanya tiga langkah yang menyusun pesan WhatsApp","Guru, testimoni orang tua & alumni, galeri, tanya jawab, dan peta lokasi","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/pradipta-preview.webp',
   '["/assets/templates/pradipta-1.webp","/assets/templates/pradipta-2.webp"]',
   'pradipta', NULL, 'published', 23);

-- Sparring Padel (2026-10-28, Olahraga & Komunitas; DB lama: migrasi 2026-10-28_041). Demo: Sparring Padel, klub padel di Kemang, Jakarta Selatan (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('sparring-padel',
   'Sparring Padel',
   'Olahraga & Komunitas',
   'Template website lapangan padel: hero foto dengan Booking cepat ke WhatsApp, jadwal & harga per jam, lapangan indoor/outdoor, cari lawan main per level, turnamen, dan sewa raket.',
   'Sparring Padel membuat lapangan padel Anda tampil energik dan mudah dipesan. Hero-nya memakai foto aksi selebar layar dengan garis lapangan neon dan bilah Booking cepat: pengunjung memilih tanggal, indoor atau outdoor, jam mulai, dan jumlah pemain, lalu pesan WhatsApp untuk admin tersusun otomatis. Di bawahnya ada papan jadwal & harga per jam untuk hari kerja dan akhir pekan, kartu lapangan dengan spesifikasi, formulir cari lawan main dengan level 1 sampai 7, daftar turnamen, harga sewa raket, bola, sepatu, dan coaching, angka komunitas, galeri, tanya jawab, serta lokasi dengan Google Maps.

Cocok untuk pengelola lapangan padel, klub padel, dan komunitas yang menerima booking lewat WhatsApp. Jujur soal batasnya: booking hanya menyusun pesan ke admin, jadwal yang tampil adalah contoh yang Anda perbarui sendiri, ketersediaan dikonfirmasi admin, dan tidak ada pembayaran online maupun akun member. Judul, harga, jadwal, lapangan, level, turnamen, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir tetap berbahasa Indonesia.',
   '["Hero foto aksi dengan garis lapangan neon dan bilah Booking cepat (tanggal, indoor/outdoor, jam, pemain) ke WhatsApp","Papan jadwal & harga per jam untuk hari kerja dan akhir pekan, tombol Book per sesi","Kartu lapangan indoor/outdoor dengan foto dan spesifikasi","Cari lawan main: level 1–7 dan formulir nama, hari, jam ke WhatsApp","Daftar turnamen dengan tanggal, kategori, biaya, kuota, dan tombol Daftar","Harga sewa raket, bola, sepatu, coaching, angka komunitas, galeri, dan FAQ","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1390000.00,
   '/assets/templates/sparring-padel-preview.webp',
   '["/assets/templates/sparring-padel-1.webp","/assets/templates/sparring-padel-2.webp"]',
   'sparring-padel', NULL, 'published', 24);

-- SmashHall (2026-10-28, Olahraga & Komunitas; DB lama: migrasi 2026-10-28_042). Demo: GOR SmashHall, GOR & klub badminton di Bandung (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('smashhall',
   'SmashHall',
   'Olahraga & Komunitas',
   'Template website GOR & klub badminton: cek lapangan kosong, booking lewat WhatsApp, member bulanan, latihan, akademi, kejuaraan, dan toko perlengkapan.',
   'SmashHall membuat GOR badminton tampil bersih dan sporty: foto lapangan yang terang selebar layar, judul besar, dua tombol, dan strip kaca berisi ketersediaan delapan lapangan hari ini yang terisi seperti papan skor. Di bawahnya ada tabel lapangan × jam per hari yang bisa dipilih, harga sewa per jam, fasilitas dengan angka besar, tiga paket member bulanan dengan pilihan periode 3 bulan, jadwal latihan dan pelatih, kelas akademi untuk anak, remaja, dan dewasa, garis waktu kejuaraan internal dan antarklub, toko perlengkapan, galeri, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk GOR, sport center bulu tangkis, klub, dan akademi. Booking, pendaftaran member, akademi, turnamen, dan pesanan toko hanya menyusun pesan WhatsApp ke admin: jadwal yang tampil adalah contoh yang Anda isi sendiri, ketersediaan dikonfirmasi admin, tidak ada pembayaran online, tidak ada akun member, tidak ada keranjang belanja, dan data formulir tidak disimpan di website. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir tetap berbahasa Indonesia.',
   '["Hero foto GOR dengan strip ketersediaan 8 lapangan dan animasi kok yang mendarat","Tabel lapangan × jam per hari: pilih slot kosong lalu booking lewat WhatsApp","Tiga paket member bulanan dengan pilihan harga bulanan atau 3 bulan","Jadwal latihan, pelatih berinisial, dan kelas akademi per kelompok usia","Garis waktu kejuaraan internal & antarklub beserta status dan hasil","Toko perlengkapan (raket, kok, grip, sepatu) dengan tombol pesan via WhatsApp","Formulir booking & pendaftaran yang menyusun pesan WhatsApp; data tidak disimpan di website","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1390000.00,
   '/assets/templates/smashhall-preview.webp',
   '["/assets/templates/smashhall-1.webp","/assets/templates/smashhall-2.webp"]',
   'smashhall', NULL, 'published', 25);

-- PayNow (2026-10-28, Fintech & Startup; DB lama: migrasi 2026-10-28_043). Demo: PayNow, merek dompet digital & payment gateway di Jakarta (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('paynow',
   'PayNow',
   'Fintech & Startup',
   'Template landing page dompet digital & payment gateway: hero foto dengan mockup HP dan notifikasi, fitur bertab, simulasi biaya, keamanan, contoh API, dan pendaftaran merchant ke WhatsApp.',
   'PayNow membuat aplikasi pembayaran atau dompet digital Anda tampil modern dan tepercaya: foto latar di bawah gradasi biru-ungu, judul singkat, tombol unduh aplikasi, dan mockup HP berisi saldo, tombol QRIS, transfer, tagihan, dan isi saldo, lengkap dengan kartu notifikasi yang muncul berurutan. Di bawahnya tersusun strip jenis usaha, fitur bertab dengan layar HP yang berganti, simulasi biaya dari daftar contoh tarif, bagian keamanan, bagian developer dengan daftar endpoint dan contoh kode cURL, Node.js, dan PHP, pita angka, cerita merchant, tanya jawab, tombol Google Play dan App Store, serta formulir pendaftaran merchant.

Cocok untuk startup dompet digital, penyedia payment gateway, dan aplikasi kasir yang ingin memperkenalkan produknya. Template ini halaman pemasaran: tidak memproses pembayaran, tidak menyimpan saldo, dan contoh kode API hanya ilustrasi. Formulir pendaftaran merchant menyusun pesan WhatsApp; data tidak disimpan di website. Izin usaha dan lembaga pengawas Anda tulis sendiri di baris legal footer. Judul, teks, tarif, foto, dan satu warna aksen bisa Anda ubah lewat CMS tanpa coding.',
   '["Hero foto dengan gradasi biru-ungu, mockup HP berisi saldo, dan kartu notifikasi","Fitur bertab (QRIS, transfer, tagihan, isi saldo) dengan layar HP yang berganti","Simulasi biaya dari daftar contoh tarif yang bisa Anda ubah","Bagian developer: daftar endpoint dan contoh kode cURL, Node.js, PHP dengan tombol salin","Keamanan, pita angka, cerita merchant, dan tanya jawab","Formulir pendaftaran merchant yang menyusun pesan WhatsApp dan baris legal di footer","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/paynow-preview.webp',
   '["/assets/templates/paynow-1.webp","/assets/templates/paynow-2.webp"]',
   'paynow', NULL, 'published', 26);

-- MediCare General (2026-10-28, Kesehatan & Rumah Sakit; DB lama: migrasi 2026-10-28_044). Demo: RS MediCare General, rumah sakit umum di Semarang (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('medicare-general',
   'MediCare General',
   'Kesehatan & Rumah Sakit',
   'Template website rumah sakit umum: strip IGD 24 jam, ukuran teks yang bisa diperbesar, jadwal dokter tersaring, pendaftaran online ke WhatsApp, poliklinik, rawat inap, dan BPJS.',
   'MediCare General membuat website rumah sakit umum yang jelas dan mudah dibaca semua usia, termasuk pasien lansia. Di paling atas ada strip merah IGD 24 jam dengan nomor yang bisa langsung ditelepon dan tombol ukuran teks (A, A+, A++). Hero menampilkan foto rumah sakit yang terang sebagai latar dengan tiga ubin besar: Daftar Online, Jadwal Dokter, dan IGD 24 Jam. Di bawahnya tersusun layanan utama, pendaftaran online tiga langkah, jadwal dokter yang bisa disaring per poli dan per hari, daftar poliklinik beserta lokasinya, penunjang medis, pita IGD dengan langkah saat darurat, kelas kamar rawat inap dan jam besuk, alur pasien BPJS, asuransi, dan umum, tanya jawab, serta kontak darurat dengan Google Maps.

Cocok untuk rumah sakit umum swasta, rumah sakit daerah, dan klinik utama dengan IGD. Formulir pendaftaran hanya menyusun pesan WhatsApp ke petugas pendaftaran; data pasien tidak disimpan di website. Tidak ada rekam medis, antrean otomatis, pembayaran online, atau konsultasi video. Jadwal dokter, kelas kamar, dan daftar penjamin adalah teks yang Anda perbarui sendiri lewat CMS tanpa coding; label formulir, nama hari, dan judul kolom tabel tetap berbahasa Indonesia.',
   '["Strip IGD 24 jam dengan nomor telepon dan tombol ukuran teks A, A+, A++","Hero foto rumah sakit dengan ubin Daftar Online, Jadwal Dokter, dan IGD 24 Jam","Jadwal dokter yang bisa disaring per poli dan per hari, dengan tombol Daftar","Pendaftaran online tiga langkah yang menyusun pesan WhatsApp (data pasien tidak disimpan)","Poliklinik, penunjang medis, pita IGD, dan kelas kamar rawat inap dengan jam besuk","Alur pasien BPJS, asuransi, dan umum dalam tab, plus tanya jawab dan kontak darurat","Satu warna tema yang bisa diganti; merah IGD tetap agar mudah dikenali","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1890000.00,
   '/assets/templates/medicare-general-preview.webp',
   '["/assets/templates/medicare-general-1.webp","/assets/templates/medicare-general-2.webp"]',
   'medicare-general', NULL, 'published', 27);

-- MomKid Hospital (2026-10-28, Kesehatan & Rumah Sakit; DB lama: migrasi 2026-10-28_045). Demo: RSIA MomKid, rumah sakit ibu & anak di Tangerang Selatan (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('momkid',
   'MomKid Hospital',
   'Kesehatan & Rumah Sakit',
   'Template website rumah sakit ibu & anak bernuansa pastel: hero foto ibu dan bayi, paket persalinan, jadwal imunisasi interaktif, dokter anak, klinik laktasi, tur kamar bersalin, dan pendaftaran ke WhatsApp.',
   'MomKid Hospital membuat rumah sakit ibu dan anak tampil hangat dan menenangkan di depan calon orang tua: foto ibu dan bayi selebar halaman dengan lapisan peach, tepi bergelombang, dan chip pastel yang mengapung. Di bawahnya tersusun tahap layanan dari kehamilan sampai tumbuh kembang, paket persalinan dengan harga mulai untuk dua pilihan kamar, jadwal imunisasi yang menyorot jadwal berikutnya sesuai umur si kecil, kartu jadwal dokter anak, klinik laktasi, foto tur kamar bersalin, artikel parenting, testimoni orang tua, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk RSIA, klinik bersalin, klinik anak, dan klinik laktasi. Formulir pendaftaran menanyakan layanan, tanggal, waktu, dan cara bayar, lalu menyusun pesan WhatsApp; data tidak disimpan di website, dan tidak ada rekam medis, pembayaran online, maupun konsultasi video. Jadwal imunisasi hanya ringkasan yang Anda sesuaikan dengan anjuran dokter anak. Judul, deskripsi, tombol, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir dan nama hari tetap berbahasa Indonesia.',
   '["Hero foto latar ibu dan bayi dengan lapisan peach, tepi bergelombang, dan chip pastel","Tahap layanan: kehamilan, persalinan, dan tumbuh kembang dalam tab","Paket persalinan dengan harga mulai untuk dua pilihan kamar","Jadwal imunisasi interaktif sesuai umur si kecil (ringkasan, bisa diedit)","Jadwal dokter anak, klinik laktasi, dan tur kamar bersalin","Formulir pendaftaran kunjungan yang menyusun pesan WhatsApp","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1790000.00,
   '/assets/templates/momkid-preview.webp',
   '["/assets/templates/momkid-1.webp","/assets/templates/momkid-2.webp"]',
   'momkid', NULL, 'published', 28);

-- SpecialistPlus (2026-10-28, Kesehatan & Rumah Sakit; DB lama: migrasi 2026-10-28_046). Demo: SpecialistPlus Medical Center, klinik spesialis & laboratorium di Medan (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('specialistplus',
   'SpecialistPlus',
   'Kesehatan & Rumah Sakit',
   'Template website klinik spesialis & laboratorium: hero konsol data, jadwal dokter per klinik, tabel paket MCU, permintaan hasil lab via WhatsApp, dan spesifikasi alat.',
   'SpecialistPlus membuat pusat klinik spesialis, laboratorium, dan radiologi tampil rapi seperti lembar data: foto ruang pemeriksaan selebar layar dengan panel konsol tempat pasien memilih spesialis lalu melihat jumlah dokter, hari praktik, dan jadwal terdekat. Di bawahnya tersusun tab klinik spesialis (jantung, ortopedi, onkologi, dan lainnya) dengan tabel jadwal dokter, tabel perbandingan paket medical check-up, pita permintaan hasil lab, kartu spesifikasi alat seperti MRI, CT scan, cath lab, mammografi, dan lab otomatis, batang perkiraan waktu hasil, testimoni pasien, tanya jawab, serta kontak dengan jam layanan per unit dan Google Maps.

Cocok untuk klinik utama, pusat spesialis, laboratorium klinik, klinik medical check-up, dan pusat diagnostik. Tombol daftar dokter, pesan paket, dan formulir hasil lab hanya menyusun pesan WhatsApp; data tidak disimpan di website dan hasil lab tidak ditampilkan di website. Tidak ada rekam medis, pembayaran online, atau konsultasi video. Judul, jadwal, harga, isi setiap bagian, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding; label formulir dan judul kolom tabel tetap berbahasa Indonesia.',
   '["Hero konsol data: pilih spesialis untuk melihat jumlah dokter, hari praktik, dan jadwal terdekat","Tab klinik spesialis dengan tabel jadwal dokter dan tombol daftar via WhatsApp","Tabel perbandingan paket medical check-up dengan harga dan tombol pesan","Formulir permintaan hasil lab yang menyusun pesan WhatsApp, plus tautan portal pasien","Kartu spesifikasi alat diagnostik dan batang perkiraan waktu hasil","Testimoni pasien, tanya jawab, jam layanan per unit, dan catatan darurat 119","Satu warna aksen yang bisa diganti; navy header, pita hasil lab, dan footer ikut menyesuaikan","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1890000.00,
   '/assets/templates/specialistplus-preview.webp',
   '["/assets/templates/specialistplus-1.webp","/assets/templates/specialistplus-2.webp"]',
   'specialistplus', NULL, 'published', 29);

-- HealthLink (2026-10-28, Kesehatan & Rumah Sakit; DB lama: migrasi 2026-10-28_047). Demo: HealthLink, layanan konsultasi dokter online di Yogyakarta (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('healthlink',
   'HealthLink',
   'Kesehatan & Rumah Sakit',
   'Template website telemedicine bergaya aplikasi: cari dokter online, chat & video call lewat WhatsApp atau aplikasi Anda, resep digital, pengingat kontrol, dan RS mitra.',
   'HealthLink membuat layanan konsultasi dokter online Anda tampil seperti aplikasi yang rapi, dan dirancang dari layar HP lebih dulu. Halaman dibuka dengan foto selebar layar dan kartu putih berisi judul, kolom cari dokter, serta empat ubin besar: chat dokter, video call, tebus obat, dan rekam medis. Di bawahnya ada kartu layanan, cara konsultasi dengan ilustrasi percakapan, daftar dokter online yang bisa dicari dan disaring per spesialis, alur resep digital dan pengantaran obat, ilustrasi riwayat rekam medis, pengingat kontrol, rumah sakit mitra, biaya per sesi dan langganan keluarga, tombol unduh aplikasi, tanya jawab, serta kartu bantuan dan nomor darurat 119.

Cocok untuk klinik, jaringan rumah sakit, dan startup kesehatan yang sudah punya alur konsultasi lewat WhatsApp atau aplikasi sendiri. Template ini halaman pemasaran layanan; konsultasi berjalan lewat WhatsApp atau aplikasi milik Anda, rekam medis tidak disimpan di website, dan tidak ada pembayaran online. Pengingat kontrol dibuat di perangkat pengunjung sebagai file kalender atau tautan Google Calendar. Judul, teks, dokter, harga, foto, tautan aplikasi, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero kartu aplikasi: foto latar, kolom cari dokter, dan empat ubin layanan besar","Daftar dokter online dengan pencarian keluhan, saringan spesialis, status, harga, dan tombol chat","Resep digital & tebus obat, ilustrasi rekam medis, dan cara konsultasi dengan ilustrasi chat","Pengingat kontrol: file kalender .ics atau Google Calendar, dibuat di perangkat pengunjung","RS mitra, biaya per sesi & langganan keluarga, unduh aplikasi, FAQ, dan kartu darurat 119","Dirancang dari HP dulu dengan bilah aksi bawah; satu warna aksen yang bisa diganti","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/healthlink-preview.webp',
   '["/assets/templates/healthlink-1.webp","/assets/templates/healthlink-2.webp"]',
   'healthlink', NULL, 'published', 30);

-- HomeNest (2026-10-28, Properti & Real Estate; DB lama: migrasi 2026-10-28_048). Demo: HomeNest oleh PT Sarang Hunian Lestari, developer perumahan (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('homenest',
   'HomeNest',
   'Properti & Real Estate',
   'Template website properti & jual rumah: hero foto besar dengan panel cari rumah, listing bersaringan, tur virtual, simulasi KPR, profil developer, dan jadwal kunjungan ke WhatsApp.',
   'HomeNest menampilkan rumah yang Anda jual dengan tenang dan elegan: foto rumah selebar layar sebagai latar, judul besar di tengah, dan panel cari rumah (lokasi, tipe, harga) yang langsung menyaring daftar rumah. Setiap kartu memuat foto, harga, klaster, kota, luas tanah dan bangunan, serta jumlah kamar, lengkap dengan tombol simulasi KPR dan tanya unit lewat WhatsApp. Di bawahnya ada tur virtual per ruang dengan tombol menuju tautan tur milik Anda, kalkulator simulasi KPR, profil developer dengan angka dan foto proyek, fasilitas kawasan, cerita pembeli, kartu agen, tanya jawab, serta kantor pemasaran dengan Google Maps.

Cocok untuk developer perumahan, agen properti, dan tim pemasaran klaster. Simulasi KPR hanya perkiraan dengan bunga tetap, bukan penawaran bank; formulir jadwal kunjungan menyusun pesan WhatsApp dan data tidak disimpan di website. Tidak ada tur 360° bawaan dan tidak ada pembayaran tanda jadi online. Rumah, harga, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto rumah selebar layar dengan panel cari lokasi, tipe, dan harga","Daftar rumah dengan saringan lokasi, tipe, harga, dan urutan","Kartu rumah: harga, luas tanah & bangunan, kamar tidur & mandi, tombol WhatsApp","Simulasi KPR (perkiraan angsuran, bukan penawaran bank)","Tur virtual per ruang yang membuka tautan tur Anda","Profil developer, fasilitas kawasan, dan cerita pembeli","Agen per kawasan dan formulir jadwal kunjungan ke WhatsApp","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/homenest-preview.webp',
   '["/assets/templates/homenest-1.webp","/assets/templates/homenest-2.webp"]',
   'homenest', NULL, 'published', 31);

-- Lajur (2026-10-29, Travel & Transportasi; DB lama: migrasi 2026-10-29_049). Demo: Lajur Trans Wisata, PO sewa bus pariwisata di Semarang (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('lajur',
   'Lajur',
   'Travel & Transportasi',
   'Template website sewa bus pariwisata: hero foto dengan bilah minta penawaran, armada bergambar bus, kalkulator rombongan, film perjalanan saat digulir, dan tujuan favorit ke WhatsApp.',
   'Lajur membantu PO dan usaha rental bus menjawab pertanyaan rombongan sejak halaman pertama. Foto jalan pegunungan selebar layar menjadi latar judul dan bilah minta penawaran: pengunjung mengisi jumlah peserta, tanggal berangkat, tujuan, dan lama sewa, lalu langsung melihat rekomendasi armada. Di bawahnya ada tab armada dengan gambar bus berlivery warna Anda, denah kursi, fasilitas, dan harga mulai; kalkulator rombongan yang menyusun kombinasi bus; film sehari perjalanan yang bergerak saat digulir; kartu tujuan favorit; daftar biaya termasuk dan belum termasuk; cara sewa; testimoni; galeri; tanya jawab; serta kontak garasi dengan Google Maps.

Cocok untuk PO bus pariwisata, rental bus, dan biro perjalanan berarmada sendiri. Formulir hanya menyusun pesan WhatsApp; harga final dan ketersediaan armada dikonfirmasi admin. Tidak ada pembayaran online, e-tiket, ketersediaan armada real-time, akun member, atau pelacakan GPS. Armada, harga, rute, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto selebar layar dengan bilah minta penawaran dan rekomendasi armada","Armada bertab: gambar bus SVG berlivery, denah kursi, fasilitas, harga mulai","Kalkulator rombongan: kombinasi bus, sisa kursi, perkiraan harga","Film sehari perjalanan yang bergerak saat halaman digulir","Tujuan favorit dengan harga mulai per bus dan tombol WhatsApp","Daftar biaya termasuk & belum termasuk, cara sewa, testimoni, FAQ","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/lajur-preview.webp',
   '["/assets/templates/lajur-1.webp","/assets/templates/lajur-2.webp"]',
   'lajur', NULL, 'published', 32);

-- Nusaline (2026-10-29, Travel & Transportasi; DB lama: migrasi 2026-10-29_050). Demo: Nusaline, PO bus malam Jakarta–Denpasar dengan kantor pusat di Jakarta Timur (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('nusaline',
   'Nusaline',
   'Travel & Transportasi',
   'Template website PO bus antarkota & bus malam: kartu cari jadwal, tabel jadwal dengan tombol Pesan ke WhatsApp, kelas dengan denah kursi, film perjalanan semalam, rute & titik naik.',
   'Nusaline membuat website PO bus Anda terasa seperti papan keberangkatan malam: foto jalan tol malam selebar layar, judul besar, kartu cari jadwal (dari, ke, tanggal, jumlah penumpang), dan papan keberangkatan mini. Di bawahnya tabel jadwal dengan jam berangkat, jam tiba dan tanda +1 yang dihitung otomatis dari lama perjalanan, kelas, harga mulai, saringan rute dan kelas, serta tombol Pesan yang menyusun pesan WhatsApp lengkap. Bagian kelas menampilkan denah kursi tampak atas yang dibuat otomatis dari konfigurasi 2-2, 2-1, atau 1-1 kabin tidur, lalu film perjalanan semalam yang bergerak saat digulir: bus potongan samping melaju dari malam sampai matahari terbit dengan jam dan penghitung km. Ada juga diagram rute dengan agen per kota, fasilitas kabin, cara pesan, cerita penumpang, tanya jawab, dan kontak dengan Google Maps.

Cocok untuk PO bus antarkota, operator bus malam, dan agen tiket bus. Pemesanan hanya menyusun pesan WhatsApp ke admin: tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time, dan jadwal serta harga dikonfirmasi admin. Jadwal, kelas, rute, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto malam dengan kartu cari jadwal dan papan keberangkatan","Tabel jadwal: jam tiba & +1 otomatis, saringan rute dan kelas","Tombol Pesan menyusun pesan WhatsApp (rute, tanggal, jam, kelas, penumpang)","Kelas dengan denah kursi otomatis 2-2, 2-1, dan kabin tidur 1-1","Film perjalanan semalam yang bergerak saat digulir","Rute & titik naik per kota, fasilitas kabin, FAQ, dan kontak","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1790000.00,
   '/assets/templates/nusaline-preview.webp',
   '["/assets/templates/nusaline-1.webp","/assets/templates/nusaline-2.webp"]',
   'nusaline', NULL, 'published', 33);

-- Lawatan (2026-10-29, Travel & Transportasi; DB lama: migrasi 2026-10-29_051). Demo: Lawatan Tour & Travel, biro perjalanan rombongan di Yogyakarta (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('lawatan',
   'Lawatan',
   'Travel & Transportasi',
   'Template website tour & travel rombongan bergaya kartu pos: paket wisata bersaringan, itinerary bergerak saat digulir, hitung biaya, dan pesan ke WhatsApp.',
   'Lawatan menampilkan biro perjalanan rombongan Anda seperti kumpulan kartu pos: foto pemandangan selebar layar dengan panel kartu pos berisi judul dan pilihan jenis trip (study tour, gathering kantor, keluarga, ziarah) yang langsung menyaring paket. Setiap kartu paket memuat foto, perangko harga mulai per orang, durasi, minimal peserta, yang termasuk, itinerary per hari, serta tombol pesan lewat WhatsApp dan hitung biaya. Bagian itinerary bergerak seperti film saat digulir: bus kecil melaju di garis rute dan kartu pos tiap tempat bergeser bergantian. Di bawahnya ada daftar yang termasuk, formulir hitung & rancang trip dengan estimasi biaya, testimoni, galeri foto, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk biro tour & travel, penyedia study tour sekolah, gathering kantor, dan wisata religi. Formulir hanya menyusun pesan WhatsApp; harga paket contoh dan bisa berubah; kuota, hotel dan jadwal dikonfirmasi admin; tidak ada pembayaran online. Paket, harga, itinerary, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto pemandangan selebar layar dengan panel kartu pos dan chip jenis trip","Paket wisata bersaringan jenis trip dengan perangko harga mulai per orang","Itinerary per hari di setiap paket","Film itinerary yang bergerak saat digulir: rute, bus, dan kartu pos tiap tempat","Formulir hitung & rancang trip dengan estimasi biaya ke WhatsApp","Yang termasuk, testimoni, galeri, tanya jawab, dan Google Maps","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1690000.00,
   '/assets/templates/lawatan-preview.webp',
   '["/assets/templates/lawatan-1.webp","/assets/templates/lawatan-2.webp"]',
   'lawatan', NULL, 'published', 34);

-- Kemudi (2026-10-29, Travel & Transportasi; DB lama: migrasi 2026-10-29_052). Demo: Kemudi Rent Car, rental mobil di Bandung (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('kemudi',
   'Kemudi',
   'Travel & Transportasi',
   'Template website rental mobil lepas kunci & dengan sopir: kartu pesan dengan perkiraan harga, armada per kelas, film proses saat digulir, tabel harga, syarat sewa, dan antar-jemput.',
   'Kemudi membantu usaha rental mobil menjawab pertanyaan pelanggan sebelum mereka chat: foto udara selebar layar dengan kartu pesan di sampingnya, tempat pengunjung memilih lepas kunci atau dengan sopir, mobil, serta tanggal dan jam ambil-kembali, lalu langsung melihat perkiraan harganya. Daftar armada bersaringan kelas menampilkan ilustrasi mobil per kelas atau foto Anda, kursi, transmisi, bahan bakar, bagasi, dan harga. Di bawahnya ada film proses yang berjalan saat halaman digulir, tabel harga 12 jam, 24 jam, dengan sopir, dan luar kota, syarat sewa per layanan, zona antar-jemput dengan peta ilustrasi, cara sewa, ulasan, tanya jawab, serta garasi dengan Google Maps.

Cocok untuk rental mobil harian, rent car dengan sopir, dan layanan antar ke stasiun atau bandara. Pemesanan hanya menyusun pesan WhatsApp; ketersediaan dan harga final dikonfirmasi admin; tidak ada pembayaran online; dokumen tidak diunggah atau disimpan di website. Mobil, harga, teks, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto selebar layar dengan kartu pesan dan perkiraan harga","Armada bersaringan kelas dengan ilustrasi mobil per kelas","Hitung sewa otomatis: blok 24 jam, 12 jam, dan dengan sopir","Film proses yang berjalan saat halaman digulir","Tabel harga, syarat sewa, dan zona antar-jemput dengan peta","Pesanan tersusun otomatis ke WhatsApp","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/kemudi-preview.webp',
   '["/assets/templates/kemudi-1.webp","/assets/templates/kemudi-2.webp"]',
   'kemudi', NULL, 'published', 35);

-- Pesiar (2026-10-29, Travel & Transportasi; DB lama: migrasi 2026-10-29_053). Demo: Pesiar Bali, private tour & sewa mobil dengan sopir di Denpasar (fiktif).
INSERT IGNORE INTO templates
  (slug, name, category, short_description, description, features, price,
   preview_image, gallery, template_code, demo_url, status, sort_order)
VALUES
  ('pesiar',
   'Pesiar',
   'Travel & Transportasi',
   'Template website private tour & sewa mobil dengan sopir: tur sehari, rancang tur sendiri dengan harga per mobil, film peta Bali, antar-jemput bandara, dan pemesanan lewat WhatsApp.',
   'Pesiar menampilkan usaha private tour Anda seperti majalah perjalanan: foto Bali selebar layar dengan judul besar di tengah, lalu kartu tur sehari berisi lama tur, tempat yang dikunjungi, dan harga mulai per mobil. Tamu bisa merancang tur sendiri dengan memilih hingga lima tempat, area jemput, tanggal, dan mobil; panel di sampingnya menghitung perkiraan durasi dan harga per mobil, lalu menyusun pesan WhatsApp. Saat digulir, film peta Bali memperlihatkan sehari perjalanan bersama sopir: mobil menyusuri rute, jam berjalan, dan foto muncul di tiap perhentian. Ada juga tabel harga antar-jemput bandara per area dan formulirnya, kelas mobil dengan gambar garis, daftar sopir, isi harga, cerita tamu, tanya jawab, serta kontak dengan Google Maps.

Cocok untuk usaha tur, rental mobil dengan sopir, dan layanan antar-jemput bandara. Harga yang tampil adalah contoh per mobil yang Anda atur sendiri; formulir hanya menyusun pesan WhatsApp dan data tidak disimpan di website. Tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis. Teks, harga, foto, dan satu warna aksen bisa Anda ubah sendiri lewat CMS tanpa coding.',
   '["Hero foto selebar layar dengan judul di tengah dan dua tombol","Kartu tur sehari dengan harga per mobil dan tombol pesan WhatsApp","Rancang tur sendiri: perkiraan durasi dan harga per mobil","Film peta Bali yang bergerak saat digulir","Tabel harga dan formulir antar-jemput bandara ke WhatsApp","Kelas mobil dengan gambar garis, daftar sopir, dan isi harga","Domain sendiri (dibayar terpisah) dan sertifikat SSL (HTTPS)"]',
   1590000.00,
   '/assets/templates/pesiar-preview.webp',
   '["/assets/templates/pesiar-1.webp","/assets/templates/pesiar-2.webp"]',
   'pesiar', NULL, 'published', 36);

SELECT id, slug, name, price, status, sort_order FROM templates ORDER BY sort_order, id;
