// Isi panjang halaman kategori /template/kategori/{slug} (docs/platform/SEO-PLAN.md §5.5 langkah 2): intro, panduan
// "Apa yang perlu ada di website {niche}" berbentuk checklist (≥ 300 kata unik per kategori, dicek
// src/content/__tests__/categories.test.ts) dan FAQ 3–5 butir. Hanya dimuat chunk halaman kategori.
// Tanpa nama, harga, atau jumlah template (itu dari data), tanpa klaim yang tidak bisa dibuktikan.
import type { FaqItem } from '../seo/jsonld';
import type { CategorySlug } from '../seo/paths';

export interface ChecklistItem {
  title: string;
  text: string;
}

export interface CategoryPageContent {
  /** 2–4 kalimat di bawah H1. */
  intro: string;
  /** Paragraf pembuka panduan checklist. */
  guideIntro: string;
  checklist: readonly ChecklistItem[];
  faq: readonly FaqItem[];
}

export const CATEGORY_CONTENT: Readonly<Record<CategorySlug, CategoryPageContent>> = {
  'company-profile': {
    intro:
      'Website company profile adalah kartu nama digital perusahaan Anda: tempat calon klien memeriksa siapa Anda, apa layanannya, dan bagaimana menghubungi Anda. Template di kategori ini sudah berisi bagian tentang perusahaan, layanan, keunggulan, galeri, testimoni, dan kontak dengan peta. Pilih desainnya, ganti isinya lewat CMS, dan website aktif dengan domain sendiri.',
    guideIntro:
      'Desain yang rapi baru separuh pekerjaan. Calon klien menilai perusahaan dari isinya, jadi siapkan bahan berikut sebelum atau sesudah memesan template. Daftar ini juga berguna bila nanti Anda memilih website custom. Isi yang lengkap juga membuat website lebih mudah ditemukan, karena mesin pencari membaca teks, judul, dan keterangan foto yang Anda tulis.',
    checklist: [
      {
        title: 'Penjelasan singkat di bagian pembuka',
        text: 'Dalam satu kalimat, sebutkan apa yang perusahaan Anda kerjakan dan untuk siapa. Pengunjung yang datang dari Google atau tautan WhatsApp memutuskan dalam beberapa detik apakah mereka berada di tempat yang tepat.',
      },
      {
        title: 'Daftar layanan yang spesifik',
        text: 'Tulis layanan dengan nama yang dicari orang, misalnya renovasi kantor atau pengiriman antarkota, lengkap dengan satu-dua kalimat cakupan. Hindari daftar umum seperti "solusi terbaik" yang tidak menjelaskan apa pun.',
      },
      {
        title: 'Bukti yang bisa diperiksa',
        text: 'Foto proyek asli, logo klien yang sudah memberi izin, dan angka yang bisa Anda pertanggungjawabkan, misalnya tahun berdiri atau jumlah proyek selesai. Bukti yang jujur lebih meyakinkan daripada klaim besar.',
      },
      {
        title: 'Profil perusahaan dan tim',
        text: 'Ceritakan sejak kapan perusahaan berdiri, cara kerja, dan siapa yang akan dihubungi klien. Untuk perusahaan B2B, informasi ini sering menjadi bahan pertimbangan sebelum rapat, pengadaan, atau tender.',
      },
      {
        title: 'Kontak lengkap dan lokasi',
        text: 'Alamat kantor, telepon, WhatsApp, email, jam operasional, dan peta. Pastikan nama dan alamatnya sama persis dengan profil Google Business dan media sosial perusahaan agar mesin pencari tidak bingung.',
      },
      {
        title: 'Satu ajakan yang jelas',
        text: 'Setiap bagian sebaiknya berujung pada satu tindakan, misalnya minta penawaran atau chat lewat WhatsApp, supaya pengunjung yang sudah yakin tidak perlu mencari tombol.',
      },
      {
        title: 'Domain sendiri dengan HTTPS',
        text: 'Alamat seperti namaperusahaan.com dengan gembok HTTPS terlihat lebih resmi daripada subdomain gratis, lebih mudah diingat, dan bisa dicantumkan di kartu nama, proposal, maupun kop surat.',
      },
      {
        title: 'Tampilan yang rapi di HP',
        text: 'Banyak calon klien membuka tautan website dari WhatsApp di HP. Pastikan teks terbaca tanpa memperbesar layar, tombol mudah diketuk, dan foto tidak terlalu berat. Pilih foto yang tajam dan relevan, lalu perbarui isinya setiap kali ada proyek atau layanan baru.',
      },
    ],
    faq: [
      {
        question: 'Apa saja isi website company profile dari template ini?',
        answer:
          'Satu halaman panjang berisi bagian pembuka, logo klien, tentang perusahaan, layanan, keunggulan dan angka, galeri, testimoni, ajakan, kontak dengan peta, dan footer. Bagian yang belum Anda butuhkan bisa disembunyikan lewat CMS.',
      },
      {
        question: 'Apakah saya perlu menyiapkan teks dan foto sendiri?',
        answer:
          'Ya. Website dimulai dengan isi contoh seperti di demo, lalu Anda menggantinya lewat CMS. Siapkan profil singkat perusahaan, daftar layanan, foto proyek atau kantor, logo, dan data kontak.',
      },
      {
        question: 'Bisakah ditambah halaman karier atau katalog produk?',
        answer:
          'Template company profile berupa satu halaman dengan bagian tetap. Halaman tambahan seperti karier, blog, atau katalog produk termasuk jasa pembuatan website custom, dengan biaya lewat penawaran setelah konsultasi gratis.',
      },
    ],
  },
  'kecantikan-klinik': {
    intro:
      'Calon pelanggan klinik kecantikan dan salon biasanya ingin tahu tiga hal sebelum datang: perawatan apa saja yang tersedia, kisaran harganya, dan bagaimana memesan jadwal. Template di kategori ini menjawabnya dalam satu halaman yang lembut dan rapi, dengan tombol reservasi yang membuka WhatsApp studio Anda.',
    guideIntro:
      'Website klinik kecantikan atau salon yang baik membuat calon pelanggan merasa tenang sebelum datang. Gunakan daftar berikut untuk menyiapkan isinya, apa pun template yang Anda pilih. Isi yang jelas juga membantu website muncul saat orang mencari perawatan di kota Anda.',
    checklist: [
      {
        title: 'Daftar perawatan per kategori',
        text: 'Kelompokkan layanan, misalnya perawatan wajah, rambut, kuku, atau tubuh, supaya pengunjung cepat menemukan yang mereka cari. Satu-dua kalimat penjelasan per perawatan sudah cukup.',
      },
      {
        title: 'Harga mulai yang jujur',
        text: 'Pengunjung lebih nyaman bertanya bila sudah tahu kisaran harga. Tulis "mulai Rp…" dan jelaskan apa yang membuat harga bisa berbeda, misalnya panjang rambut, jenis produk, atau durasi perawatan.',
      },
      {
        title: 'Foto asli studio dan hasil kerja',
        text: 'Foto ruang perawatan, alat yang bersih, dan hasil kerja Anda sendiri membangun rasa percaya. Hindari foto stok yang terlihat jauh berbeda dari tempat aslinya, karena pelanggan akan membandingkannya saat datang.',
      },
      {
        title: 'Profil terapis atau kapster',
        text: 'Nama, keahlian, dan pengalaman orang yang menangani pelanggan membuat studio terasa lebih personal dan membantu pelanggan memilih jadwal dengan terapis favoritnya.',
      },
      {
        title: 'Cara reservasi yang jelas',
        text: 'Bila reservasi lewat WhatsApp, siapkan pesan awal yang berisi nama perawatan sehingga Anda tidak perlu bertanya ulang. Cantumkan juga jam buka dan kebijakan pembatalan atau keterlambatan bila ada.',
      },
      {
        title: 'Lokasi, parkir, dan jam buka',
        text: 'Alamat lengkap, peta, petunjuk parkir, dan jam operasional mengurangi pertanyaan berulang di chat, terutama untuk pelanggan baru yang belum pernah datang.',
      },
      {
        title: 'Bahasa yang aman dan bertanggung jawab',
        text: 'Jelaskan proses dan pengalaman perawatan tanpa menjanjikan hasil medis. Untuk tindakan yang membutuhkan tenaga medis, cantumkan informasi tenaga ahli dan izin hanya bila memang Anda miliki.',
      },
      {
        title: 'Nama layanan yang dicari orang',
        text: 'Gunakan nama perawatan yang biasa diketik pelanggan di Google atau Instagram, misalnya facial, creambath, nail art, atau lash lift, bukan hanya nama paket internal. Nama yang familier membantu pengunjung dan mesin pencari memahami layanan Anda.',
      },
      {
        title: 'Testimoni dengan izin',
        text: 'Kutipan pelanggan asli, lengkap dengan nama depan atau inisial dan jenis perawatannya, lebih dipercaya daripada ulasan tanpa nama. Mintalah izin sebelum menampilkan nama atau foto pelanggan, terutama foto wajah.',
      },
    ],
    faq: [
      {
        question: 'Apakah ada sistem booking online di template ini?',
        answer:
          'Belum. Reservasi dilakukan lewat WhatsApp: tombol di website membuka chat ke nomor studio dengan pesan awal berisi nama perawatan, lalu jadwal Anda konfirmasi sendiri. Sistem reservasi dengan pilihan jam dan terapis bisa dibuat lewat jasa custom.',
      },
      {
        question: 'Bisakah saya menampilkan harga setiap perawatan?',
        answer:
          'Bisa. Setiap perawatan punya kolom harga berupa teks, misalnya Mulai Rp250.000, yang bisa Anda ubah kapan saja lewat CMS.',
      },
      {
        question: 'Apakah cocok untuk barbershop atau nail art?',
        answer:
          'Cocok. Isi website sepenuhnya Anda tentukan: ganti kategori, nama layanan, foto, dan warna aksen sesuai jenis usaha Anda, dari salon rambut dan nail art sampai spa dan barbershop.',
      },
    ],
  },
  'olahraga-komunitas': {
    intro:
      'Klub dan tempat olahraga menerima pertanyaan yang sama setiap hari: jam buka, harga sewa lapangan, paket membership, dan jadwal kelas. Template di kategori ini merangkum semuanya di satu halaman berfoto besar, dengan tombol pesan yang langsung membuka WhatsApp pengelola. Pemesanan dikonfirmasi lewat chat; template ini tidak memiliki sistem booking otomatis.',
    guideIntro:
      'Pemain baru dan orang tua calon murid ingin yakin sebelum datang ke lapangan. Siapkan informasi berikut agar website klub Anda menjawab pertanyaan mereka tanpa harus bolak-balik chat. Informasi yang lengkap juga membantu klub muncul saat orang mencari lapangan di sekitar mereka.',
    checklist: [
      {
        title: 'Fasilitas dan jumlah lapangan',
        text: 'Sebutkan jenis dan jumlah lapangan, permukaannya, lampu untuk main malam, ruang ganti, dan parkir. Foto lapangan yang terang lebih meyakinkan daripada deskripsi panjang.',
      },
      {
        title: 'Harga sewa dan paket membership',
        text: 'Tulis harga per jam atau per bulan beserta isi paketnya. Pengunjung yang sudah tahu harga datang dengan pertanyaan yang lebih siap, dan admin klub lebih sedikit menjawab hal yang sama.',
      },
      {
        title: 'Program dan kelas untuk tiap level',
        text: 'Pisahkan kelas pemula, latihan privat, akademi anak, dan liga, supaya calon member tahu harus mulai dari mana dan berapa kali latihan per minggu.',
      },
      {
        title: 'Profil pelatih',
        text: 'Nama, spesialisasi, dan pengalaman pelatih membantu orang tua dan pemula memilih kelas. Foto pelatih yang ramah juga membuat klub terasa lebih terbuka.',
      },
      {
        title: 'Jadwal acara dan turnamen',
        text: 'Daftar acara yang selalu diperbarui menunjukkan klub Anda aktif. Hapus acara yang sudah lewat agar informasinya tetap akurat dan tidak membingungkan.',
      },
      {
        title: 'Cara memesan yang jelas',
        text: 'Bila pemesanan lewat WhatsApp, jelaskan informasi yang perlu dikirim, misalnya tanggal, jam, dan jumlah pemain. Saat pesanan sudah sangat ramai, pertimbangkan sistem booking terpisah agar jadwal tidak bentrok.',
      },
      {
        title: 'Lokasi, jam buka, dan peta',
        text: 'Alamat lengkap dan peta memudahkan pemain baru menemukan klub, terutama bila lapangannya berada di dalam kompleks, gedung, atau area sekolah.',
      },
      {
        title: 'Aturan main dan fasilitas pendukung',
        text: 'Tulis aturan sederhana seperti sepatu yang diizinkan, penyewaan raket atau bola, toleransi keterlambatan, dan kebijakan saat hujan untuk lapangan terbuka. Informasi kecil ini mencegah salah paham ketika pemain baru datang.',
      },
      {
        title: 'Foto suasana komunitas',
        text: 'Selain foto lapangan kosong, tampilkan suasana latihan, turnamen, dan kegiatan member. Calon member ingin melihat siapa yang bermain di sana dan apakah suasananya cocok untuk level mereka. Mintalah izin sebelum memajang foto anak-anak atau member yang wajahnya terlihat jelas.',
      },
    ],
    faq: [
      {
        question: 'Apakah template klub olahraga punya sistem booking lapangan?',
        answer:
          'Tidak. Tombol pesan lapangan, paket, dan acara membuka WhatsApp dengan pesan awal yang Anda atur, lalu jadwal dikonfirmasi lewat chat. Sistem booking dengan slot dan pembayaran online bisa dibuat lewat jasa website custom.',
      },
      {
        question: 'Bisakah dipakai untuk futsal, badminton, atau gym?',
        answer:
          'Bisa. Demo memakai contoh klub padel dan tenis, tetapi program, paket, pelatih, dan foto bisa Anda ganti sesuai cabang olahraga apa pun, dan bagian yang tidak relevan bisa disembunyikan.',
      },
      {
        question: 'Apakah harga paket bisa diubah sendiri?',
        answer:
          'Bisa. Harga, periode, dan benefit setiap paket ditulis di CMS dan bisa Anda ubah kapan saja, misalnya saat ada promo atau penyesuaian harga.',
      },
    ],
  },
  'fintech-startup': {
    intro:
      'Produk keuangan dan aplikasi baru perlu menjelaskan banyak hal dalam waktu singkat: manfaatnya, cara kerjanya, dan mengapa calon pengguna bisa memercayainya. Template di kategori ini menyusun penjelasan itu menjadi landing page modern dengan angka, kartu tampilan aplikasi, testimoni, FAQ, dan tombol unduh aplikasi.',
    guideIntro:
      'Calon pengguna produk keuangan cenderung berhati-hati. Gunakan daftar berikut agar landing page Anda menjawab keraguan mereka dengan informasi yang benar dan mudah dicek. Website yang terbuka soal produk, biaya, dan legalitas juga lebih mudah dikutip mesin pencari dan asisten AI.',
    checklist: [
      {
        title: 'Manfaat utama dalam satu kalimat',
        text: 'Jelaskan masalah yang diselesaikan produk Anda, bukan sekadar daftar fitur. "Mencatat iuran anggota tanpa buku kas" lebih mudah dipahami daripada "solusi keuangan terintegrasi".',
      },
      {
        title: 'Cara kerja yang mudah diikuti',
        text: 'Tiga sampai empat langkah dari mendaftar sampai memakai fitur utama membantu calon pengguna membayangkan prosesnya dan memperkirakan waktu yang dibutuhkan.',
      },
      {
        title: 'Tampilan produk yang nyata',
        text: 'Tangkapan layar atau kartu tampilan yang menunjukkan antarmuka sebenarnya lebih meyakinkan daripada ilustrasi umum. Pastikan angka di dalamnya jelas berupa contoh.',
      },
      {
        title: 'Informasi legalitas yang benar',
        text: 'Untuk layanan keuangan, calon pengguna akan mencari nama badan usaha dan izin yang berlaku. Tulis hanya izin yang benar-benar Anda miliki, lengkap dengan nomornya, dan jangan memakai logo lembaga tanpa hak.',
      },
      {
        title: 'Biaya dan syarat yang terbuka',
        text: 'Bila ada biaya admin, bunga, iuran, atau syarat keanggotaan, sebutkan dengan jelas. Bagian tanya jawab adalah tempat yang tepat untuk menjawab keraguan seperti ini.',
      },
      {
        title: 'Testimoni dan angka yang bisa dibuktikan',
        text: 'Gunakan testimoni pengguna asli yang sudah memberi izin, serta angka pengguna atau transaksi yang sumbernya bisa Anda tunjukkan bila ditanya.',
      },
      {
        title: 'Tautan unduh dan kontak bantuan',
        text: 'Arahkan pengunjung ke App Store, Google Play, atau WhatsApp layanan pelanggan, dan cantumkan jam layanan supaya mereka tahu kapan pertanyaannya dijawab.',
      },
      {
        title: 'Keamanan data yang dijelaskan dengan jujur',
        text: 'Bila aplikasi Anda menyimpan data pengguna, jelaskan secara sederhana bagaimana data dijaga dan tautkan kebijakan privasi. Hindari janji seperti "100% aman" yang tidak bisa dijamin siapa pun.',
      },
      {
        title: 'Ajakan yang tidak menekan',
        text: 'Pakai ajakan yang jelas seperti unduh aplikasi atau tanya lewat WhatsApp, tanpa hitung mundur palsu atau janji keuntungan. Untuk produk keuangan, ajakan yang tenang dan informasi yang lengkap justru membuat calon pengguna lebih percaya, dan mengurangi pertanyaan yang sama di layanan pelanggan.',
      },
    ],
    faq: [
      {
        question: 'Apakah template fintech bisa memproses transaksi?',
        answer:
          'Tidak. Template ini adalah website perkenalan; kartu saldo dan grafik di dalamnya hanya tampilan berisi teks yang Anda tulis. Transaksi, login pengguna, dan dasbor keuangan dibuat sebagai aplikasi atau sistem custom.',
      },
      {
        question: 'Apakah cocok untuk koperasi simpan pinjam?',
        answer:
          'Cocok untuk memperkenalkan koperasi kepada calon anggota: manfaat, cara bergabung, dan tanya jawab. Pendaftaran anggota dan pencatatan simpanan tetap dilakukan di sistem koperasi Anda.',
      },
      {
        question: 'Bisakah saya menambahkan tautan Play Store dan App Store?',
        answer:
          'Bisa. Tombol unduh App Store dan Google Play tampil di blok ajakan dan footer bila tautannya diisi, dan disembunyikan bila kosong.',
      },
    ],
  },
  'yoga-wellness': {
    intro:
      'Calon peserta kelas yoga dan pilates, terutama pemula, biasanya ingin tahu suasana studio, kelas yang cocok untuk level mereka, dan harga paketnya sebelum berani datang. Template di kategori ini menyusun semuanya dalam satu halaman yang lapang dan tenang: foto besar, kartu kelas, paket harga, cerita peserta, dan tombol daftar yang membuka WhatsApp studio Anda. Jadwal dan pembayaran tetap Anda atur sendiri; template ini tidak memiliki kalender pemesanan otomatis.',
    guideIntro:
      'Orang yang baru mulai berlatih sering ragu: apakah tubuhnya cukup lentur, kelas mana yang aman untuk pemula, dan apa yang perlu dibawa. Siapkan informasi berikut agar website studio Anda menjawab keraguan itu sebelum mereka bertanya. Daftar ini berlaku untuk studio yoga, studio pilates, instruktur privat, maupun penyelenggara retret, dan isi yang jelas juga membantu studio muncul saat orang mencari kelas di kota mereka.',
    checklist: [
      {
        title: 'Jenis kelas dengan level yang jelas',
        text: 'Sebutkan setiap kelas dengan nama yang biasa dicari orang, misalnya Hatha, Vinyasa, Yin, atau mat pilates, lalu tulis durasi, level, dan intensitasnya. Calon peserta jadi tahu kelas mana yang ramah pemula dan mana yang butuh pengalaman.',
      },
      {
        title: 'Jadwal yang mudah dicek',
        text: 'Calon peserta perlu tahu hari dan jam setiap kelas. Bila jadwal sering berubah, tulis jadwal tetap di deskripsi kelas dan arahkan pertanyaan jadwal terbaru ke WhatsApp, supaya informasi di website tidak tertinggal dari kenyataan.',
      },
      {
        title: 'Paket dan harga yang terbuka',
        text: 'Tampilkan harga kelas percobaan, kelas lepas, paket beberapa kali datang, dan member bulanan beserta masa berlakunya. Calon peserta yang sudah tahu harga lebih cepat memutuskan, dan admin studio tidak perlu menjawab pertanyaan yang sama berulang kali.',
      },
      {
        title: 'Profil instruktur',
        text: 'Nama, latar belakang pelatihan, dan gaya mengajar instruktur membantu peserta memilih kelas. Cantumkan sertifikasi hanya bila memang dimiliki, lengkap dengan nama lembaganya, dan hindari gelar yang tidak bisa diperiksa.',
      },
      {
        title: 'Panduan untuk peserta pertama kali',
        text: 'Jelaskan apa yang perlu dibawa (misalnya matras, handuk, dan botol minum), pakaian yang nyaman, kapan sebaiknya datang sebelum kelas dimulai, serta apakah matras bisa dipinjam. Informasi kecil ini mengurangi rasa canggung pemula di hari pertama.',
      },
      {
        title: 'Bahasa yang aman soal kesehatan',
        text: 'Gambarkan gerakan, suasana, dan pengalaman kelas tanpa menjanjikan kesembuhan, berat badan turun sekian kilo, atau hasil medis lain. Sarankan peserta yang sedang cedera, hamil, atau punya kondisi kesehatan tertentu untuk berkonsultasi dulu dan memberi tahu instruktur sebelum kelas.',
      },
      {
        title: 'Foto asli studio dan suasana kelas',
        text: 'Foto ruang latihan, cahaya, matras, dan kelas yang sedang berjalan membantu calon peserta membayangkan suasananya. Hindari foto stok berisi pose ekstrem yang membuat pemula merasa tidak sanggup, dan mintalah izin sebelum memajang wajah peserta.',
      },
      {
        title: 'Cara mendaftar dan kebijakan kelas',
        text: 'Bila pendaftaran lewat WhatsApp, siapkan pesan awal berisi nama kelas atau paket supaya Anda tidak perlu bertanya ulang. Tulis juga kebijakan pembatalan, keterlambatan, dan batas waktu memakai sisa kelas dalam paket.',
      },
      {
        title: 'Lokasi dan kelas di luar studio',
        text: 'Alamat, peta, petunjuk parkir, dan jam buka memudahkan peserta baru menemukan studio. Bila Anda juga mengajar privat di rumah peserta, kelas online, atau retret akhir pekan, jelaskan area layanan, perlengkapan yang dibutuhkan, dan cara memesannya.',
      },
    ],
    faq: [
      {
        question: 'Apakah template yoga punya jadwal kelas dan pembayaran online?',
        answer:
          'Tidak. Tombol daftar membuka WhatsApp dengan pesan awal yang Anda atur, sedangkan tautan tanya jadwal di kartu kelas dan tombol paket otomatis menyertakan nama kelas atau paketnya. Jadwal dan pembayaran Anda konfirmasi lewat chat. Jadwal dengan kuota, pembayaran member online, atau kartu member dengan sisa kelas bisa dibuat lewat jasa website custom.',
      },
      {
        question: 'Bisakah dipakai untuk studio pilates, instruktur privat, atau retret?',
        answer:
          'Bisa. Nama kelas, paket, langkah memulai, dan foto bisa Anda ganti sesuai layanan Anda, misalnya kelas mat pilates, sesi privat di rumah peserta, atau retret akhir pekan. Bagian yang belum diperlukan bisa disembunyikan lewat CMS.',
      },
      {
        question: 'Apakah harga paket bisa saya ubah sendiri?',
        answer:
          'Bisa. Nama paket, harga, dan isi paket per baris ditulis di CMS dan bisa Anda ubah kapan saja, misalnya saat mengadakan kelas percobaan atau promo member. Satu paket bisa diberi label sorotan supaya tampil lebih menonjol.',
      },
      {
        question: 'Apakah cocok untuk spa atau pijat?',
        answer:
          'Template di kategori ini disusun untuk kelas: kartu kelas dengan durasi dan level, paket member, dan langkah memulai. Untuk spa, pijat, atau perawatan tubuh yang dipesan per layanan, kategori klinik kecantikan & salon biasanya lebih pas karena berisi daftar perawatan dengan harga per layanan.',
      },
    ],
  },
  'toko-online': {
    intro:
      'Template di kategori ini dibuat untuk toko yang menjual barang fisik, dari drone, kebutuhan tani, dan perlengkapan mendaki sampai aksesoris HP dan skincare. Katalog berfoto, harga, paket hemat, dan fitur pembeda tiap jenis toko sudah tersusun; pembeli lalu memesan lewat WhatsApp dengan nama produk di pesannya. Template ini tidak punya pembayaran online atau checkout otomatis.',
    guideIntro:
      'Pembeli online membandingkan beberapa toko sebelum memesan. Mereka mencari tahu apakah barangnya cocok, berapa total harganya, dan apakah tokonya bisa dipercaya. Siapkan informasi berikut agar website toko Anda menjawab pertanyaan itu sebelum pembeli menutup halaman, sekaligus memberi Google alasan untuk menampilkan toko Anda.',
    checklist: [
      {
        title: 'Foto produk yang jujur dan seragam',
        text: 'Pakai latar dan pencahayaan yang sama untuk semua produk, tampilkan beberapa sudut, dan sertakan foto ukuran asli atau saat dipakai. Foto yang konsisten membuat katalog terlihat rapi dan mengurangi retur karena barang tidak sesuai bayangan pembeli.',
      },
      {
        title: 'Harga lengkap dengan varian',
        text: 'Tulis harga untuk setiap varian, misalnya ukuran, warna, atau tipe HP. Bila ada harga coret, pastikan harga normalnya memang pernah berlaku. Pembeli yang sudah tahu harga datang dengan pesanan, bukan dengan pertanyaan.',
      },
      {
        title: 'Cara memesan yang tidak membingungkan',
        text: 'Jelaskan apa yang perlu dikirim pembeli lewat WhatsApp: nama produk, varian, jumlah, dan kota tujuan. Tombol pesan yang sudah berisi nama produk menghemat waktu admin dan pembeli sekaligus.',
      },
      {
        title: 'Pencarian sesuai cara pembeli berpikir',
        text: 'Pembeli aksesoris mencari berdasarkan tipe HP, pendaki berdasarkan gunung tujuan, petani berdasarkan jenis tanaman, dan pembeli skincare berdasarkan jenis kulit. Pengelompokan seperti ini lebih cepat mengantar mereka ke produk yang tepat daripada daftar panjang tanpa filter.',
      },
      {
        title: 'Paket bundling yang masuk akal',
        text: 'Gabungkan barang yang memang biasa dibeli bersama, lalu tunjukkan harga paket dan harga bila dibeli terpisah. Paket yang jelas menaikkan nilai belanja tanpa membuat pembeli merasa dipaksa.',
      },
      {
        title: 'Ongkos kirim, area, dan metode pembayaran',
        text: 'Sebutkan kota asal pengiriman, kurir yang dipakai, perkiraan lama kirim, dan cara bayar seperti transfer bank, QRIS, atau bayar di tempat. Ketidakjelasan ongkos kirim adalah alasan paling umum pembeli batal di tengah jalan.',
      },
      {
        title: 'Garansi, retur, dan layanan purna jual',
        text: 'Tulis syarat tukar barang, masa garansi, dan ke mana pembeli menghubungi bila ada masalah. Untuk barang elektronik seperti drone atau power bank, garansi servis lokal sering menjadi alasan utama orang memilih toko Anda.',
      },
      {
        title: 'Ulasan pembeli yang nyata',
        text: 'Tampilkan ulasan beserta produk yang dibeli dan, bila diizinkan, foto dari pembeli. Ulasan yang spesifik lebih dipercaya daripada pujian umum; jangan menulis ulasan karangan.',
      },
      {
        title: 'Konten panduan yang membantu memilih',
        text: 'Tips memilih produk, daftar perlengkapan per kebutuhan, atau panduan perawatan menjawab pertanyaan yang diketik orang di Google. Konten seperti ini membawa pengunjung baru dan menunjukkan bahwa toko Anda paham produknya.',
      },
      {
        title: 'Identitas toko dan kontak yang lengkap',
        text: 'Cantumkan nama toko, alamat atau kota, jam operasional, nomor WhatsApp, dan tautan toko Anda di marketplace bila ada. Pembeli yang baru pertama kali mampir ingin tahu bahwa ada orang dan tempat nyata di balik toko ini.',
      },
    ],
    faq: [
      {
        question: 'Apakah template toko online punya pembayaran online?',
        answer:
          'Tidak. Pesanan dikirim lewat WhatsApp: tombol pesan berisi nama produk, dan di sebagian template pembeli bisa mengumpulkan produk di keranjang (daftar belanja di halaman) lalu mengirim daftarnya sekaligus. Pembayaran Anda konfirmasi sendiri, misalnya lewat transfer, QRIS, atau bayar di tempat. Payment gateway, stok, dan ongkos kirim otomatis bisa dibuat lewat jasa website custom.',
      },
      {
        question: 'Apakah produk, harga, dan foto bisa saya ubah sendiri?',
        answer:
          'Bisa. Produk, harga, foto, kategori, dan paket ditulis di CMS dan bisa Anda ubah kapan saja tanpa menyentuh kode, misalnya saat ada promo atau produk baru.',
      },
      {
        question: 'Saya sudah berjualan di marketplace. Apakah masih perlu website?',
        answer:
          'Website memberi toko Anda alamat sendiri yang bisa ditemukan di Google, tempat menampilkan panduan dan paket tanpa batasan format marketplace, dan tautan yang mudah dibagikan. Anda tetap bisa berjualan di marketplace seperti biasa.',
      },
      {
        question: 'Bisakah template ini dipakai untuk jenis produk lain?',
        answer:
          'Bisa. Demo memakai contoh toko tertentu, tetapi kategori, produk, foto, judul bagian, dan warna bisa diganti sesuai barang yang Anda jual, dan bagian yang tidak relevan bisa disembunyikan.',
      },
    ],
  },
  'sekolah-pendidikan': {
    intro:
      'Template di kategori ini dibuat untuk sekolah menengah, dari SMA dan SMK sampai sekolah islam dan madrasah. Slider foto sekolah, statistik, sambutan kepala sekolah, berita, pengumuman, informasi PPDB, alumni, peta lokasi, dan kontak sudah tersusun, dan semuanya bisa Anda ubah sendiri lewat CMS. Template ini adalah website profil sekolah, bukan sistem akademik atau aplikasi PPDB dengan database.',
    guideIntro:
      'Orang tua dan calon siswa membuka website sekolah untuk mencari kepastian: sekolah seperti apa ini, bagaimana cara mendaftar, dan apakah informasinya masih berlaku. Siapkan isi berikut agar website sekolah Anda menjawab pertanyaan itu tanpa harus menelepon tata usaha, sekaligus membantu sekolah muncul saat orang mencari sekolah di daerah Anda.',
    checklist: [
      {
        title: 'Profil, visi-misi, dan akreditasi',
        text: 'Tulis sejarah singkat, visi-misi, status akreditasi, dan nilai yang dipegang sekolah. Orang tua ingin tahu karakter sekolah sebelum membandingkan biaya dan jarak.',
      },
      {
        title: 'Sambutan kepala sekolah yang personal',
        text: 'Sambutan singkat dengan foto dan nama kepala sekolah membuat sekolah terasa dekat. Hindari kalimat umum yang bisa ditempel di sekolah mana pun; sebutkan hal yang benar-benar khas.',
      },
      {
        title: 'Informasi PPDB yang lengkap dan bertanggal',
        text: 'Cantumkan jalur pendaftaran, jadwal, syarat berkas, alur, biaya bila ada, dan kontak panitia. Tanggal yang jelas mencegah pertanyaan berulang, dan informasi tahun lalu sebaiknya segera diperbarui atau dihapus.',
      },
      {
        title: 'Program unggulan atau jurusan',
        text: 'SMA dapat menonjolkan program seperti tahfidz, kelas sains, atau bilingual. SMK sebaiknya menjelaskan setiap kompetensi keahlian, mitra industri, praktik kerja lapangan, dan peluang kerja lulusannya.',
      },
      {
        title: 'Berita dan pengumuman yang rutin diperbarui',
        text: 'Pisahkan berita kegiatan dari pengumuman resmi seperti libur, jadwal ujian, atau hasil seleksi. Website yang beritanya berhenti setahun lalu membuat orang ragu sekolahnya masih aktif.',
      },
      {
        title: 'Agenda dan kalender kegiatan',
        text: 'Daftar kegiatan mendatang membantu orang tua menyiapkan waktu, misalnya pengambilan rapor, pentas seni, atau kunjungan industri. Hapus agenda yang sudah lewat agar informasinya tetap akurat.',
      },
      {
        title: 'Prestasi siswa dan sekolah',
        text: 'Tampilkan prestasi dengan tingkat lomba, tahun, dan nama kegiatan. Prestasi yang spesifik lebih meyakinkan daripada daftar panjang tanpa keterangan.',
      },
      {
        title: 'Galeri dan fasilitas',
        text: 'Foto kelas, laboratorium, perpustakaan, masjid atau tempat ibadah, dan lapangan memberi gambaran nyata. Mintalah izin sebelum memajang foto siswa yang wajahnya terlihat jelas.',
      },
      {
        title: 'Cerita alumni',
        text: 'Kutipan alumni beserta tempat mereka melanjutkan kuliah atau bekerja menunjukkan hasil pendidikan sekolah. Gunakan cerita nyata dengan izin, bukan testimoni karangan.',
      },
      {
        title: 'Lokasi, kontak, dan jam layanan',
        text: 'Alamat lengkap dengan peta, nomor telepon atau WhatsApp, email, jam layanan tata usaha, dan media sosial memudahkan calon siswa datang langsung. Pastikan nomor yang dicantumkan memang dipantau selama masa pendaftaran.',
      },
    ],
    faq: [
      {
        question: 'Apakah template sekolah punya sistem PPDB online dengan database?',
        answer:
          'Tidak. Formulir pendaftaran di halaman menyusun pesan WhatsApp untuk panitia; data tidak disimpan di server dan tidak ada pembayaran online. Sistem PPDB dengan akun calon siswa, unggah berkas, dan dasbor panitia bisa dibuat lewat jasa website custom.',
      },
      {
        question: 'Bisakah dipakai untuk SMP, MA, atau madrasah?',
        answer:
          'Bisa. Nama sekolah, jenjang, program, dan judul setiap bagian bisa diganti dari CMS, dan bagian yang tidak relevan bisa disembunyikan.',
      },
      {
        question: 'Apakah berita dan pengumuman bisa diperbarui sendiri?',
        answer:
          'Bisa. Berita, pengumuman, agenda, dan prestasi ditulis lewat CMS tanpa menyentuh kode, jadi staf sekolah bisa memperbaruinya kapan saja.',
      },
      {
        question: 'Apakah template sekolah sudah punya rapor online atau absensi siswa?',
        answer:
          'Belum. Template ini adalah website profil dan informasi sekolah. Rapor online, absensi, dan sistem akademik lain termasuk aplikasi custom yang bisa kami buatkan setelah konsultasi.',
      },
    ],
  },
};
