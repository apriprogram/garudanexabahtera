// Isi halaman /template/velora. Sumber fakta: src/templates/velora (schema.ts, Velora.tsx, Header.tsx, Hero.tsx,
// Company.tsx, Lineup.tsx, Ownership.tsx, Engineering.tsx, Stories.tsx, TestDrive.tsx, Contact.tsx, Footer.tsx). Kata
// kunci: "template website perusahaan otomotif" di paragraf pembuka; "website dealer mobil", "template company profile
// bahasa Inggris", dan "website perusahaan multinasional" di isi. Klaim wajib jujur: formulir test drive & newsletter
// hanya menyusun pesan WhatsApp/email (tanpa penyimpanan data), tidak ada sistem booking, stok, atau pembayaran online;
// nama & angka di demo fiktif; SEMUA teks yang tampil (termasuk label & pesan galat formulir, label kontak, judul kolom
// footer, nama bulan pada tanggal) adalah field CMS, jadi bisa diganti lewat CMS, termasuk ke bahasa Indonesia.
// Demo: Velora Motor Group, grup otomotif fiktif ber-HQ di Zurich.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website perusahaan otomotif berbahasa Inggris dengan gaya showroom yang gelap dan elegan. Kartu foto lebar dengan menu di dalamnya, jajaran model yang bisa disaring, carousel teknologi, testimoni, newsroom, dan formulir test drive sudah tersusun; Anda tinggal mengganti foto, teks, dan warna aksennya.',
  suitableFor: {
    intro:
      'Pilih {nama} bila perusahaan Anda perlu tampil setara merek internasional di depan klien, mitra, atau investor dari luar negeri. Ini template company profile bahasa Inggris yang paling lengkap di katalog kami, dengan salinan demo yang sudah ditulis dalam bahasa Inggris korporat.',
    items: [
      'Grup otomotif, distributor, atau importir yang butuh website dealer mobil dengan daftar model, harga mulai, dan ajakan test drive.',
      'Perusahaan multinasional, anak perusahaan asing, atau kantor regional yang membutuhkan website perusahaan multinasional berbahasa Inggris.',
      'Eksportir dan produsen yang ingin menampilkan lini produk, fasilitas pabrik, dan riset kepada pembeli luar negeri.',
      'Penyewaan mobil premium, layanan langganan kendaraan, atau bengkel resmi yang ingin terlihat seperti merek besar.',
    ],
  },
  parts: [
    {
      name: 'Hero kartu foto & menu',
      text: 'Kartu foto lebar membulat dengan logo, menu di dalam satu pil putih, tombol pil, dan tombol menu bulat. Judulnya menaruh satu kata di dalam pil bergaris dengan chip panah, ditemani kartu sorotan kecil yang bisa menautkan video.',
    },
    {
      name: 'Filosofi perusahaan',
      text: 'Judul besar di kiri, paragraf tentang perusahaan di kanan, lalu hingga 4 prinsip bernomor.',
    },
    {
      name: 'Bento kartu foto',
      text: 'Satu kartu foto tinggi dan dua kartu foto gelap, masing-masing dengan chip ikon dan label, ditambah hingga 4 baris abu berpanah untuk syarat kepemilikan, leasing, atau layanan personal.',
    },
    {
      name: 'Jajaran model',
      text: 'Panel gelap berisi hingga 8 kartu model dengan foto, kalimat singkat, harga mulai, dan tiga spesifikasi. Tombol filter dibuat otomatis dari kolom kategori tiap model, misalnya "SUV, Electric", dan benar-benar menyaring kartu.',
    },
    {
      name: 'Langkah kepemilikan',
      text: 'Dua sampai empat langkah berikon dengan tautan, tombol test drive, dan foto tegak dengan kartu angka di sudutnya.',
    },
    {
      name: 'Teknologi & angka',
      text: 'Carousel hingga 6 kartu foto: kartu yang dipilih melebar dan menampilkan penjelasannya, di HP menjadi rel geser. Setelahnya hingga 4 angka raksasa bertitik merah yang menghitung naik saat terlihat.',
    },
    {
      name: 'Testimoni dinding potret',
      text: 'Hingga 10 potret tersusun bertingkat di atas judul; klik potret untuk menampilkan kutipan, nama, dan keterangan orangnya, atau pindah dengan tombol panah.',
    },
    {
      name: 'Newsroom, test drive & dealer',
      text: 'Hingga 6 kartu berita bertanggal, kartu test drive berfoto dengan formulir, kantor pusat, daftar studio atau dealer, dan peta Google Maps.',
    },
    {
      name: 'Footer & newsletter',
      text: 'Kalimat besar, kotak newsletter, logo, deskripsi, kolom model, menu, kontak, dan media sosial.',
    },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir test drive memeriksa nama, email, nomor telepon, model, dan tanggal, lalu menyusun pesan yang dikirim pengunjung sendiri lewat WhatsApp atau email; newsletter juga hanya membuka aplikasi email. Website tidak menyimpan data, tidak punya sistem booking atau stok, dan tidak memproses pembayaran.',
  cms: [
    'Nama perusahaan, tagline, logo, dan satu warna aksen; versi gelap dan terangnya dibuat otomatis agar teks tetap terbaca.',
    'Foto hero, label kecil, judul beserta kata di dalam pil, deskripsi, tombol, dan kartu sorotan; tombol putar hanya muncul bila Anda mengisi tautan video.',
    'Prinsip perusahaan, kartu bento, dan baris berpanah beserta tujuan tautannya.',
    'Daftar model lengkap dengan kategori untuk filter, harga, spesifikasi, foto, dan tautan.',
    'Langkah kepemilikan, kartu teknologi, angka perusahaan, testimoni, dan berita.',
    'Semua teks formulir test drive (label, pilihan, pesan galat, tombol, kalimat pesan), WhatsApp dan email penerima, kantor pusat, studio, peta, newsletter, judul kolom footer, nama bulan pada tanggal, dan media sosial.',
  ],
  cmsNote:
    'Salinan demo berbahasa Inggris, tetapi semua teks yang tampil bisa Anda tulis ulang lewat CMS dalam bahasa apa pun, termasuk bahasa Indonesia, dari menu sampai label dan pesan galat formulir. Ikon kartu dan langkah dipilih otomatis dari judul yang Anda tulis.',
  demo: [
    'Demo {nama} memakai Velora Motor Group, grup otomotif fiktif yang berkantor pusat di Zurich dengan lima model rekaan, jaringan studio di Eropa, Timur Tengah, dan Asia, serta tim teknologi dan motorsport. Isinya contoh yang siap Anda ganti dengan produk, kantor, dan cerita perusahaan sendiri.',
    'Nama model, orang, harga, spesifikasi, berita, angka, alamat email, dan nomor telepon di demo semuanya fiktif, dan emblem merek mobil asli di foto sudah dihapus. Ganti dengan data perusahaan Anda sendiri, termasuk foto produk dan fasilitas.',
  ],
  custom:
    '{nama} adalah website company profile. Bila perusahaan Anda membutuhkan konfigurator mobil, pemeriksaan stok dealer, booking test drive dengan kalender, pembayaran uang muka, portal dealer, atau situs dua bahasa, fitur itu termasuk website atau aplikasi custom. Ceritakan kebutuhan Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pengunjung bisa memesan test drive langsung di website?',
      answer:
        'Pengunjung mengisi nama, email, telepon, model, studio, dan tanggal. {nama} menyusunnya menjadi pesan yang dikirim pengunjung lewat WhatsApp atau email ke tim Anda. Website tidak menyimpan data dan tidak punya kalender, jadi jadwal tetap dikonfirmasi tim penjualan Anda.',
    },
    {
      question: 'Apakah websitenya harus berbahasa Inggris?',
      answer:
        'Tidak. Demo ditulis dalam bahasa Inggris untuk perusahaan yang melayani klien luar negeri, tetapi semua teks yang tampil, termasuk label formulir dan pesan galatnya, bisa Anda ganti ke bahasa Indonesia lewat CMS. Situs tetap satu bahasa; dua bahasa sekaligus termasuk pekerjaan custom.',
    },
    {
      question: 'Apakah cocok untuk perusahaan selain otomotif?',
      answer:
        'Cocok untuk perusahaan besar yang punya lini produk, misalnya alat berat, elektronik, atau manufaktur. Ganti model menjadi produk Anda, ubah kategori filter, dan sembunyikan bagian yang tidak dipakai.',
    },
    {
      question: 'Bisakah warna aksen merahnya diganti?',
      answer:
        'Bisa. Pilih warna dari pilihan cepat di CMS atau tulis kode warna sendiri. Chip panah, titik, tombol formulir, dan label ikut berubah, sedangkan latar gelap dan putih tulang tetap sama sehingga tampilannya selalu konsisten.',
    },
  ],
  imageAlts: {
    'velora-preview.webp': 'Tampilan beranda template website perusahaan otomotif {nama} di desktop dan HP dengan kartu foto mobil di jalan pegunungan',
    'velora-1.webp': 'Bagian jajaran model template {nama} dengan panel gelap, tombol filter kategori, dan kartu mobil berharga',
    'velora-2.webp': 'Bagian testimoni template {nama} dengan dinding potret bertingkat di atas judul dan kutipan pelanggan',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
