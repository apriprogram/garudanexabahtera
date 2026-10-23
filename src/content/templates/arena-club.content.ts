// Isi halaman /template/arena-club. Sumber fakta: src/templates/arena-club (schema.ts, ArenaClub.tsx, Programs.tsx,
// People.tsx, Closing.tsx). Klaim wajib jujur (rencana §5.5): pemesanan lapangan, paket, dan acara lewat WhatsApp;
// TIDAK ada sistem booking, kalender, slot, atau pembayaran di website. Demo: Lintang Padel & Tenis Club (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website untuk klub dan tempat olahraga: lapangan padel dan tenis, futsal, badminton, mini soccer, gym, hingga akademi olahraga anak. Foto lapangan tampil besar, program latihan dan paket membership tersusun jelas, dan setiap tombol pesan mengarah ke WhatsApp klub Anda.',
  suitableFor: {
    intro:
      '{nama} cocok untuk klub yang menerima pesanan lapangan, pendaftaran kelas, dan pertanyaan membership lewat WhatsApp. Template ini tidak memiliki sistem booking otomatis: tidak ada kalender jadwal, pengecekan slot kosong, atau pembayaran di website. Pengunjung menekan tombol, lalu WhatsApp terbuka dengan pesan awal yang Anda tentukan, dan jadwalnya Anda konfirmasi lewat chat.',
    items: [
      'Lapangan padel dan tenis yang ingin memperkenalkan fasilitas, pelatih, dan kelas untuk pemula.',
      'Futsal, mini soccer, dan badminton yang menyewakan lapangan per jam dan rutin mengadakan liga.',
      'Gym dan studio kebugaran dengan paket membership bulanan.',
      'Akademi olahraga anak yang perlu menampilkan program latihan, pelatih, dan jadwal acara.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Logo atau simbol lapangan bawaan, tautan ke setiap bagian, dan tombol gelap seperti "Pesan Lapangan" yang membuka WhatsApp.',
    },
    {
      name: 'Hero (banner foto)',
      text: 'Banner foto membulat dengan judul di tengah, kata yang digarisbawahi warna aksen, dua tombol, dan teks bukti sosial di samping foto tiga pelatih pertama.',
    },
    {
      name: 'Tentang klub',
      text: 'Pernyataan besar tentang klub dan tiga kartu: kartu gelap berisi cerita dan jam buka, kartu foto berlabel, serta kartu angka dengan baris titik jumlah member per level.',
    },
    { name: 'Angka klub', text: 'Hingga 4 angka terpusat, misalnya jumlah lapangan atau member aktif.' },
    {
      name: 'Program',
      text: 'Hingga 8 program dalam rel kartu foto yang bisa digeser, misalnya kelas pemula, latihan privat, sewa lapangan per jam, dan liga.',
    },
    {
      name: 'Paket membership',
      text: 'Hingga 4 paket dengan harga, periode, label sorotan, dan daftar benefit; tombol tiap paket membuka WhatsApp dengan nama paketnya.',
    },
    { name: 'Pelatih', text: 'Hingga 8 kartu potret pelatih dengan nama, peran, dan deskripsi singkat.' },
    {
      name: 'Acara & turnamen',
      text: 'Hingga 6 jadwal acara dengan tanggal besar, lokasi atau waktu, label, foto, dan tautan pendaftaran; tanpa tautan, pendaftaran lewat WhatsApp.',
    },
    { name: 'Galeri', text: 'Hingga 12 foto suasana klub; foto pertama tampil paling besar.' },
    { name: 'Testimoni member', text: 'Hingga 9 kutipan member dengan keterangan dan foto bila ada.' },
    { name: 'Mitra & sponsor', text: 'Strip logo mitra dan sponsor yang bergerak pelan, hingga 12 logo.' },
    { name: 'Ajakan (CTA)', text: 'Blok ajakan membulat dengan foto lapangan malam, atau latar navy polos bila foto dikosongkan.' },
    { name: 'Kontak & lokasi', text: 'Alamat, telepon, email, WhatsApp, jam buka, dan peta Google Maps.' },
    { name: 'Footer', text: 'Deskripsi klub, teks hak cipta, dan tautan media sosial.' },
  ],
  partsNote: 'Semua bagian ada di satu halaman panjang, dan tombol WhatsApp melayang tampil bila nomor WhatsApp klub diisi.',
  cms: [
    'Nama klub, tagline, logo, warna aksen, serta teks dan tautan tombol di menu atas.',
    'Program latihan, paket membership (harga, periode, label, benefit), dan daftar pelatih.',
    'Jadwal acara dan turnamen: tambahkan acara baru, ubah tanggalnya, atau hapus yang sudah lewat.',
    'Angka klub, baris level member, foto banner, galeri, dan logo sponsor.',
    'Nomor WhatsApp dan pesan awal untuk tombol pesan lapangan, paket, dan pendaftaran acara.',
    'Alamat, jam buka, link Google Maps, tautan media sosial, dan bagian mana saja yang ditampilkan.',
  ],
  cmsNote:
    'Jadwal acara dan harga diubah manual lewat CMS. Tidak ada kalender atau slot lapangan yang terisi sendiri dari pemesanan.',
  demo: [
    'Demo {nama} memakai Lintang Padel & Tenis Club, klub fiktif di Cilandak, Jakarta Selatan. Di sana terlihat program seperti kelas pemula, latihan privat, sewa lapangan per jam, akademi junior, dan liga, lengkap dengan tiga paket membership, profil pelatih, serta jadwal turnamen akhir tahun.',
    'Nama klub, harga paket, jumlah member, dan jadwal di demo semuanya contoh. Di website Anda, tombol pesan membuka WhatsApp dengan nomor klub Anda, bukan formulir booking.',
  ],
  custom:
    'Banyak klub akhirnya butuh lebih dari profil: booking lapangan dengan slot dan pembayaran online, pendaftaran member dengan akun, kartu member digital, atau rekap jadwal pelatih. Fitur seperti itu tidak ada di {nama}, tetapi bisa kami bangun sebagai website atau aplikasi Android dan iOS custom. Ceritakan alur pemesanan di klub Anda lewat konsultasi gratis, lalu kami kirim penawaran.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah {nama} punya sistem booking lapangan otomatis?',
      answer:
        'Tidak. {nama} tidak punya kalender, pengecekan slot, atau pembayaran booking. Tombol Pesan Lapangan, paket, dan acara membuka WhatsApp klub dengan pesan awal yang Anda atur, lalu jadwal dikonfirmasi lewat chat. Sistem booking online bisa dibuat terpisah lewat jasa website custom.',
    },
    {
      question: 'Bisakah harga paket membership saya ubah sendiri?',
      answer:
        'Bisa. Di bagian Paket membership Anda mengatur hingga 4 paket: nama, harga, periode, label sorotan, deskripsi, dan benefit satu per baris. Harga ditulis sebagai teks, jadi bebas ditulis seperti Rp850.000 per bulan.',
    },
    {
      question: 'Apakah cocok untuk futsal atau gym, bukan hanya padel?',
      answer:
        'Cocok. Demo memakai klub padel dan tenis, tetapi bagiannya umum: program, paket, pelatih, acara, galeri, dan lokasi. Ganti foto dan teks sesuai cabang olahraga Anda, lalu sembunyikan bagian yang tidak relevan.',
    },
    {
      question: 'Bagaimana cara menampilkan jadwal turnamen?',
      answer:
        'Tambahkan acara di bagian Acara & turnamen: tanggal, nama acara, lokasi atau waktu, label, foto, dan tautan pendaftaran. Tanpa tautan, tombol daftar membuka WhatsApp. Acara yang sudah lewat perlu Anda hapus sendiri.',
    },
    {
      question: 'Bisakah menampilkan beberapa lokasi lapangan?',
      answer:
        'Bagian Kontak menampilkan satu alamat dan satu peta. Lokasi lain bisa Anda sebutkan di teks Tentang klub atau di deskripsi program. Halaman terpisah per cabang dengan peta masing-masing termasuk pekerjaan custom.',
    },
  ],
  imageAlts: {
    'arena-club-preview.webp': 'Tampilan beranda template website klub olahraga {nama} di desktop dan HP dengan banner foto lapangan',
    'arena-club-1.webp': 'Bagian Tentang klub template {nama}: kartu jam buka, foto pelatih, dan jumlah member per level',
    'arena-club-2.webp': 'Paket membership template {nama} dengan harga, periode, dan daftar benefit',
  },
  guides: ['template-vs-jasa-website-custom'],
};
