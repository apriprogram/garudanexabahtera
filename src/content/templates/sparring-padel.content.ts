// Isi halaman /template/sparring-padel. Sumber fakta: src/templates/sparring-padel (schema.ts, SparringPadel.tsx,
// Header.tsx, Hero.tsx, BookingBar.tsx, Schedule.tsx, Courts.tsx, Matchmaking.tsx, Tournaments.tsx, Community.tsx,
// Closing.tsx, Footer.tsx). Kata kunci: "template website padel" di paragraf pembuka; "website booking lapangan padel",
// "website lapangan padel", dan "website klub padel" di isi. Klaim wajib jujur: booking hanya menyusun pesan WhatsApp ke
// admin; jadwal yang tampil adalah contoh dan ketersediaan dikonfirmasi admin; tidak ada pembayaran online dan tidak ada
// akun member; tanpa klaim federasi atau sanksi turnamen. Demo: Sparring Padel, Kemang, Jakarta Selatan (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website padel untuk pengelola lapangan dan klub yang menerima booking lewat WhatsApp. Hero-nya memakai foto aksi selebar layar dengan garis lapangan neon dan bilah Booking cepat, lalu halaman menuntun pemain dari jadwal dan harga per jam, pilihan lapangan, cari lawan main, sampai turnamen dan sewa raket.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pemain biasanya bertanya jam kosong, harga per jam, dan lawan main lewat chat. Website booking lapangan padel ini menjawab pertanyaan itu lebih dulu, lalu mengirim mereka ke WhatsApp admin dengan pesan yang sudah lengkap.',
    items: [
      'Pengelola lapangan padel indoor maupun outdoor yang ingin booking lebih rapi tanpa sistem rumit.',
      'Klub padel yang mengadakan mabar, Americano, atau liga dan butuh website klub padel untuk komunitasnya.',
      'Lapangan baru yang perlu website lapangan padel untuk promosi di Instagram dan Google Maps.',
      'Venue olahraga yang menyewakan raket, bola, dan sepatu, atau membuka kelas pemula dan coaching.',
      'Komunitas pemain yang ingin mempertemukan anggota dengan level permainan yang setara.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah biru gelap yang tetap terlihat saat digulir, berisi logo atau simbol raket bawaan, tautan ke setiap bagian, dan tombol Book Now yang selalu tampil, juga di HP.',
    },
    {
      name: 'Hero & Booking cepat',
      text: 'Foto latar selebar layar, judul, deskripsi, dua tombol, garis lapangan neon, dan bilah booking berisi tanggal, indoor atau outdoor, jam mulai, dan jumlah pemain.',
    },
    {
      name: 'Jadwal & harga',
      text: 'Papan harga per jam dengan dua tab, misalnya hari kerja dan akhir pekan, hingga 5 sesi per tab dengan tombol Book, ditambah 4 fakta singkat seperti jam buka.',
    },
    { name: 'Lapangan', text: 'Hingga 6 kartu lapangan dengan foto, permukaan, lampu, dan ukuran; tab Indoor dan Outdoor muncul otomatis bila keduanya diisi.' },
    {
      name: 'Cari lawan main',
      text: 'Penjelasan level 1 sampai 7, tiga langkah singkat, dan formulir nama, level, hari, serta jam yang menyusun pesan untuk admin.',
    },
    { name: 'Turnamen', text: 'Hingga 6 acara dengan ubin tanggal, kategori, biaya, kuota, tombol Daftar, dan satu foto.' },
    { name: 'Sewa & coaching', text: 'Hingga 6 ubin harga sewa raket, bola, sepatu, coaching, atau kelas, dengan ikon yang dipilih otomatis dari nama item.' },
    { name: 'Komunitas', text: 'Pita gelap berisi 4 angka yang menghitung naik, satu foto, tombol gabung grup, dan hingga 8 kegiatan yang berjalan pelan.' },
    { name: 'Galeri', text: 'Hingga 8 foto aksi tersusun bertingkat dengan keterangan; foto tegak dan mendatar boleh dicampur.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal cara booking dan jumlah pemain.' },
    { name: 'Lokasi', text: 'Alamat, jam buka, telepon, email, tombol WhatsApp, dan peta Google Maps.' },
    { name: 'Footer', text: 'Deskripsi singkat, menu, kontak, ikon media sosial, garis lapangan neon, dan catatan kecil yang bisa Anda ubah.' },
  ],
  partsNote:
    'Booking hanya menyusun pesan WhatsApp ke admin; jadwal yang tampil adalah contoh, ketersediaan dikonfirmasi admin; tidak ada pembayaran online dan tidak ada akun member. Formulir cari lawan main dan tombol Daftar turnamen bekerja dengan cara yang sama, dan data tidak disimpan di website.',
  cms: [
    'Nama klub, tagline, logo, dan satu warna aksen; warna biru gelap dan versi teks yang terbaca dibuat otomatis.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautan, termasuk teks tombol Book Now.',
    'Jam buka untuk pilihan jam di Booking cepat, nama tab jadwal, sesi, harga per jam, dan catatan kecil.',
    'Kartu lapangan, level pemain, langkah cari lawan, daftar turnamen, dan item sewa: tambah, ubah urutan, atau hapus.',
    'Foto hero, foto lapangan, foto turnamen, foto sewa, foto komunitas, dan galeri beserta keterangannya.',
    'Alamat, telepon, email, nomor WhatsApp admin, jam buka, dan link Google Maps.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Turnamen saat belum ada acara.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan label formulir seperti Tanggal, Jam mulai, dan Level mengikuti desain template. Harga dan jadwal adalah teks yang Anda perbarui sendiri; website tidak membaca jadwal lapangan secara otomatis.',
  demo: [
    'Demo {nama} memakai klub fiktif Sparring Padel di Kemang, Jakarta Selatan, dengan empat lapangan indoor dan dua outdoor yang buka pukul 06.00 sampai 24.00. Di sana terlihat bagaimana harga per jam, pilihan lapangan, level pemain, dan turnamen bulanan disusun untuk pemain yang ingin langsung booking.',
    'Harga, jadwal, turnamen, angka komunitas, dan alamat di demo adalah contoh. Ganti semuanya dengan data asli lapangan Anda sebelum alamat website dibagikan.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman agar cepat aktif. Bila lapangan Anda butuh jadwal yang tersambung ke sistem kasir, pembayaran online, akun member, poin loyalitas, atau sistem matchmaking otomatis, semua itu termasuk website custom. Kami merancangnya sesuai alur kerja tim Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Bagaimana cara kerja Booking cepat di {nama}?',
      answer:
        'Pengunjung memilih tanggal, indoor atau outdoor, jam mulai, dan jumlah pemain. Website lalu menyusun pesan WhatsApp ke nomor admin Anda. Admin yang mengonfirmasi lapangan, harga, dan cara bayar.',
    },
    {
      question: 'Apakah jadwal kosong tampil otomatis?',
      answer:
        'Tidak. Papan jadwal & harga berisi sesi dan harga yang Anda tulis sendiri di CMS sebagai contoh. Ketersediaan lapangan selalu dikonfirmasi admin lewat WhatsApp.',
    },
    {
      question: 'Bisakah pemain membayar atau membuat akun di website?',
      answer:
        'Tidak. {nama} tidak memproses pembayaran dan tidak punya akun member. Pembayaran mengikuti cara yang sudah Anda pakai, misalnya transfer setelah konfirmasi admin.',
    },
    {
      question: 'Bagaimana fitur cari lawan main bekerja?',
      answer:
        'Pemain memilih level 1 sampai 7, hari, dan jam, lalu pesannya terkirim ke WhatsApp admin. Admin mencarikan pasangan atau lawan dari komunitas. Nama dan penjelasan level bisa Anda ubah.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo klub?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol Book Now, garis lapangan, dan angka ikut berubah, dan warna teks dipilih otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'sparring-padel-preview.webp': 'Tampilan beranda template website padel {nama} di desktop dan HP: foto pemain padel, judul, dan bilah Booking cepat',
    'sparring-padel-1.webp': 'Papan jadwal dan harga per jam template {nama} dengan tab hari kerja dan akhir pekan serta tombol Book',
    'sparring-padel-2.webp': 'Bagian lapangan template {nama} dengan tab indoor dan outdoor serta kartu foto lapangan padel',
  },
  guides: ['template-vs-jasa-website-custom'],
};
