// Isi halaman /template/lawatan. Sumber fakta: src/templates/lawatan (schema.ts, Lawatan.tsx, Header.tsx, Hero.tsx,
// Packages.tsx, Film.tsx, Included.tsx, Custom.tsx, Stories.tsx, Closing.tsx, Footer.tsx, model.ts). Kata kunci:
// "template website tour and travel" di paragraf pembuka; "website paket wisata" dan "website study tour" di isi. Klaim
// wajib jujur: data demo fiktif, formulir hitung biaya hanya menyusun pesan WhatsApp (data tidak disimpan di website),
// harga paket contoh dan bisa berubah, kuota/hotel/jadwal dikonfirmasi admin, tidak ada pembayaran online, e-tiket, atau
// cek kuota real-time. Demo: Lawatan Tour & Travel, biro rombongan fiktif di Yogyakarta.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website tour and travel untuk biro perjalanan rombongan: study tour sekolah, gathering kantor, wisata keluarga, dan ziarah dengan bus pariwisata. Calon peserta langsung melihat paket wisata beserta harga mulai per orang, membaca itinerary per hari, menghitung perkiraan biaya rombongan, lalu mengirim pesan ke WhatsApp Anda.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pelanggan Anda biasanya panitia: guru, staf HRD, atau perwakilan keluarga besar yang harus membandingkan paket, menyampaikan perkiraan biaya ke rombongannya, lalu bertanya detail ke admin sebelum memesan.',
    items: [
      'Biro tour & travel yang butuh website paket wisata rombongan dengan bus pariwisata.',
      'Penyedia study tour yang ingin punya website study tour untuk sekolah dan kampus.',
      'Penyelenggara gathering kantor, outing, atau perjalanan insentif karyawan.',
      'Biro wisata religi dan ziarah untuk rombongan keluarga atau komunitas.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah krem dengan garis airmail tipis di atasnya, logo atau simbol perangko bawaan, tautan ke setiap bagian, dan tombol Konsultasi Trip.',
    },
    {
      name: 'Hero kartu pos',
      text: 'Foto pemandangan selebar layar dengan garis rute dan bus kecil yang tergambar sekali, panel kartu pos berisi judul, kalimat singkat, pilihan jenis trip, dan tombol Lihat paket.',
    },
    {
      name: 'Paket wisata',
      text: 'Hingga 9 kartu paket dengan foto, perangko harga mulai per orang, durasi, minimal peserta, transportasi, yang termasuk, itinerary per hari, serta tombol pesan lewat WhatsApp dan hitung biaya. Chip jenis trip menyaring paket.',
    },
    {
      name: 'Itinerary bergerak',
      text: 'Hingga 6 titik perjalanan yang tampil seperti film saat digulir: bus melaju di garis rute, hari, jam, dan jarak berganti, dan kartu pos tiap tempat bergeser bergantian. Tanpa gerak, bagian ini tampil sebagai garis rute utuh dan kisi kartu pos.',
    },
    { name: 'Yang termasuk', text: 'Hingga 8 ubin bergaya perangko dengan ikon otomatis, misalnya bus, hotel, makan, tiket masuk, pemandu, dan dokumentasi, plus satu baris yang belum termasuk.' },
    {
      name: 'Hitung & rancang trip',
      text: 'Formulir paket, jenis trip, jumlah peserta, rencana bulan berangkat, hotel, kamar, dan catatan dengan panel estimasi biaya yang langsung terhitung dari harga paket.',
    },
    { name: 'Testimoni', text: 'Hingga 6 kartu pos berisi kutipan, nama, keterangan, dan perangko kota asal rombongan, tanpa foto wajah.' },
    { name: 'Galeri', text: 'Hingga 8 foto perjalanan dalam mosaik selebar layar dengan keterangan singkat.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal minimal peserta, harga, dan cara pembayaran.' },
    { name: 'Kontak', text: 'Alamat kantor, jam buka, telepon, WhatsApp, email, dan peta Google Maps berbingkai kartu pos.' },
    { name: 'Footer', text: 'Pita hijau tua dengan perangko besar, deskripsi, catatan kecil, menu, kontak, dan tautan media sosial.' },
  ],
  partsNote:
    'Formulir hitung biaya hanya menyusun pesan WhatsApp; data tidak disimpan di website. Harga paket adalah contoh harga mulai dan bisa berubah; kuota, hotel, dan jadwal dikonfirmasi admin lewat WhatsApp. Tidak ada pembayaran online, e-tiket, atau cek kuota real-time, dan estimasi biaya bukan penawaran final.',
  cms: [
    'Nama biro, tagline, logo, dan satu warna aksen; perangko harga, garis rute, footer, dan panel estimasi ikut menyesuaikan warnanya.',
    'Semua judul, kalimat pengantar, teks tombol, dan tujuan tautan.',
    'Paket wisata: nama, jenis trip, durasi, minimal peserta, transportasi, harga mulai, yang termasuk, itinerary per hari, dan foto. Tambah, ubah urutan, atau hapus.',
    'Jenis trip untuk chip saringan, misalnya study tour, gathering kantor, keluarga, dan ziarah.',
    'Titik itinerary bergerak: nama tempat, hari, jam, jarak perkiraan, keterangan, dan foto kartu pos.',
    'Yang termasuk, testimoni, galeri, dan tanya jawab.',
    'Alamat, telepon, email, nomor WhatsApp, jam buka, link Google Maps, dan menampilkan atau menyembunyikan setiap bagian.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan isian formulir mengikuti desain template. Paket dan harga diperbarui lewat CMS, tidak tersambung ke sistem reservasi, dan estimasi biaya dihitung dari harga mulai per orang yang Anda tulis sendiri.',
  demo: [
    'Demo {nama} memakai biro fiktif Lawatan Tour & Travel di Yogyakarta dengan enam paket rombongan: Jogja, Bromo, Bali, Bandung, Dieng, dan Lombok. Coba pilih jenis trip di hero, tekan Hitung biaya di salah satu kartu, lalu gulir pelan di bagian itinerary untuk melihat bus melaju di garis rute.',
    'Paket, harga, jarak, pelanggan, alamat, dan nomor di demo adalah contoh fiktif. Ganti dengan data asli sebelum website dibagikan, dan tulis keterangan izin usaha hanya sesuai dokumen yang benar-benar Anda miliki.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar cepat aktif. Reservasi dengan kuota real-time, pembayaran uang muka online, e-tiket, akun peserta, atau halaman detail per paket termasuk website custom. Kami merancangnya sesuai alur penjualan biro Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah pelanggan bisa membayar paket langsung di {nama}?',
      answer:
        'Tidak. Tidak ada pembayaran online. Tombol pesan dan formulir hitung biaya menyusun pesan WhatsApp ke nomor Anda, lalu harga final, kuota, dan pembayaran dibicarakan langsung dengan admin.',
    },
    {
      question: 'Bagaimana estimasi biaya di formulir dihitung?',
      answer:
        'Estimasi = jumlah peserta × harga mulai per orang dari paket yang dipilih. Pilihan "Rancang sendiri" tidak memakai angka; admin menghitungnya setelah rute disepakati. Hasilnya estimasi, bukan penawaran final.',
    },
    {
      question: 'Apakah itinerary bergerak membuat website berat?',
      answer:
        'Tidak. Gerakannya hanya menggeser elemen yang sudah ada saat halaman digulir, tanpa video. Pengunjung yang memilih kurangi gerak, layar yang terlalu pendek seperti HP mendatar, dan pratinjau CMS melihat versi diam: garis rute utuh dan semua kartu pos.',
    },
    {
      question: 'Berapa banyak paket dan titik itinerary yang bisa ditampilkan?',
      answer: 'Hingga 9 paket wisata, masing-masing dengan itinerary per hari, dan hingga 6 titik di itinerary bergerak. Chip saringan jenis trip bisa Anda atur sendiri.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo biro?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, perangko harga, garis rute, panel estimasi, dan footer ikut menyesuaikan, dan warna teks dijaga otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'lawatan-preview.webp': 'Tampilan beranda template website tour & travel {nama} di desktop dan HP: foto pemandangan besar dan panel kartu pos dengan pilihan jenis trip',
    'lawatan-1.webp': 'Daftar paket wisata rombongan template {nama} dengan saringan jenis trip, perangko harga, dan itinerary per hari',
    'lawatan-2.webp': 'Itinerary template {nama}: garis rute bertitik dengan bus kecil dan kartu pos tiap tempat perhentian, lengkap dengan hari, jam, dan jarak',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
