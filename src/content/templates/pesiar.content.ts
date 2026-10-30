// Isi halaman /template/pesiar. Sumber fakta: src/templates/pesiar (schema.ts, Pesiar.tsx, Header.tsx, Hero.tsx,
// Tours.tsx, Planner.tsx, Film.tsx, Transfer.tsx, Cars.tsx, Stories.tsx, Closing.tsx, Footer.tsx, model.ts). Kata kunci:
// "template website private tour" dan "website sewa mobil dengan sopir" di paragraf pembuka; "website tour Bali",
// "website antar-jemput bandara", dan "website rental mobil Bali" di isi. Klaim wajib jujur: data demo fiktif, harga
// contoh per mobil, formulir hanya menyusun pesan WhatsApp (data tidak disimpan di website), tidak ada pembayaran
// online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis; mobil ditulis per kelas tanpa merek.
// Demo: Pesiar Bali (fiktif), Denpasar.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website private tour dan website sewa mobil dengan sopir untuk usaha tur di Bali atau kota wisata lain. Tamu langsung melihat tur sehari, merancang rute sendiri dengan perkiraan durasi dan harga per mobil, memesan antar-jemput bandara, lalu mengirim semuanya lewat WhatsApp.',
  suitableFor: {
    intro:
      'Pilih {nama} bila tamu Anda biasanya bertanya lewat WhatsApp sebelum memesan: ke mana saja, berapa lama, berapa harga satu mobil, dan siapa yang menjemput di bandara. Website ini menjawabnya lebih dulu dengan tampilan yang tenang dan elegan.',
    items: [
      'Usaha private tour yang ingin website tour Bali dengan harga per mobil, bukan per orang.',
      'Rental mobil dengan sopir yang melayani tur sehari dan perjalanan keluarga.',
      'Layanan antar-jemput bandara yang butuh tabel harga per area dan formulir pemesanan.',
      'Sopir lepas atau tim kecil yang ingin terlihat rapi di depan tamu mancanegara maupun lokal.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah transparan di atas foto hero yang berubah warna pasir saat digulir: logo atau simbol bawaan, menu di tengah, dan tombol Pesan Tur.',
    },
    {
      name: 'Hero foto',
      text: 'Foto pemandangan selebar layar, judul besar di tengah, satu kalimat, dua tombol (Rancang tur dan Antar-jemput bandara), serta bilah kaca berisi tiga keunggulan.',
    },
    {
      name: 'Tur sehari',
      text: 'Hingga 8 kartu foto tegak berisi nama tur, lama tur, tempat yang dikunjungi, dan harga mulai per mobil. Tombol pesan membuka WhatsApp; tombol Ubah rute mengisi Rancang tur.',
    },
    {
      name: 'Rancang tur sendiri',
      text: 'Tamu memilih hingga 5 dari 16 tempat, area jemput, tanggal, dan mobil. Panel hijau tua menghitung perkiraan durasi dan harga per mobil (paket dasar plus jam tambahan), lalu menyusun pesan WhatsApp.',
    },
    {
      name: 'Film sehari bersama sopir',
      text: 'Animasi peta Bali yang bergerak saat digulir: mobil menyusuri rute contoh, jam berjalan dari pagi ke sore, dan kartu foto muncul di hingga 6 perhentian yang teks dan fotonya bisa diubah.',
    },
    { name: 'Sudah & belum termasuk', text: 'Dua kolom yang menjelaskan isi harga, misalnya BBM, parkir, dan air mineral, serta tiket masuk dan makan yang belum termasuk.' },
    {
      name: 'Mobil & sopir',
      text: 'Hingga 4 kelas mobil dengan gambar garis bawaan atau foto Anda, kapasitas, koper, harga paket, dan harga jam tambahan, ditambah daftar 6 sopir dengan inisial dan bahasa.',
    },
    {
      name: 'Antar-jemput bandara',
      text: 'Tabel harga hingga 8 area untuk setiap kelas mobil, 4 keterangan layanan, dan formulir berisi tanggal, jam mendarat, nomor penerbangan, area, hotel, penumpang, dan mobil.',
    },
    { name: 'Cerita tamu', text: 'Satu kutipan besar sekaligus dengan tombol sebelumnya dan berikutnya serta daftar nama, hingga 6 cerita tanpa foto wajah.' },
    { name: 'Tanya jawab & kontak', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, lalu alamat, telepon, WhatsApp, email, jam buka, dan peta Google Maps.' },
    { name: 'Footer', text: 'Strip foto panorama selebar layar, nama usaha, deskripsi, menu, kontak, dan tautan media sosial.' },
  ],
  partsNote:
    'Formulir Rancang tur dan antar-jemput bandara hanya menyusun pesan WhatsApp; data tidak disimpan di website. Harga di template adalah contoh per mobil yang Anda atur sendiri dan dikonfirmasi lewat WhatsApp. Tidak ada pembayaran online, e-tiket, ketersediaan mobil real-time, atau pelacakan penerbangan otomatis.',
  cms: [
    'Nama usaha, tagline, logo, dan satu warna aksen; warna teks turunan dijaga otomatis agar tetap terbaca.',
    'Semua judul, kalimat pengantar, teks tombol, dan tujuan tautan.',
    'Daftar tur: nama, lama, tempat yang dikunjungi, harga mulai per mobil, dan foto.',
    'Tempat tujuan di Rancang tur beserta area dan tambahan jamnya, area jemput, jam paket dasar, dan jam jemput-antar.',
    'Kelas mobil, kapasitas, koper, harga paket, harga jam tambahan, foto mobil, serta nama dan bahasa sopir.',
    'Area antar-jemput bandara, waktu tempuh, harga per mobil, dan keterangan layanan.',
    'Teks, jam, dan foto 6 perhentian di film, isi sudah/belum termasuk, cerita tamu, tanya jawab, alamat, nomor WhatsApp, dan peta.',
  ],
  cmsNote:
    'Peta Bali dan rute di film adalah bagian desain; yang Anda ubah adalah teks, jam, dan foto perhentiannya. Tata letak, urutan bagian, dan isian formulir mengikuti desain template.',
  demo: [
    'Demo {nama} memakai usaha fiktif Pesiar Bali di Denpasar dengan empat tur sehari, empat belas tempat tujuan, tiga kelas mobil, dan lima area antar-jemput bandara. Coba tekan Ubah rute di salah satu kartu tur, lalu gulir ke film untuk melihat sehari perjalanan di peta.',
    'Nama usaha, sopir, tamu, harga, alamat, dan email di demo adalah contoh. Ganti dengan data asli sebelum website dibagikan, dan sebut kelas mobil tanpa merek bila armada Anda bisa berganti.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar cepat aktif. Pembayaran online, kalender ketersediaan mobil, akun tamu, pelacakan penerbangan, atau peta rute untuk kota lain termasuk website custom. Kami merancangnya sesuai cara Anda menerima pesanan, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah harga di {nama} dihitung per orang?',
      answer:
        'Tidak. Template ini memakai harga per mobil: paket dasar (misalnya 10 jam) dan harga per jam tambahan untuk setiap kelas mobil. Semua angka Anda isi sendiri lewat CMS dan ditampilkan sebagai perkiraan.',
    },
    {
      question: 'Bagaimana cara kerja Rancang tur sendiri?',
      answer:
        'Tamu memilih hingga 5 tempat, area jemput, tanggal, dan mobil. Website menghitung perkiraan durasi dan harga, lalu menyusun pesan WhatsApp ke nomor Anda; data tidak disimpan di website dan tidak ada pembayaran online.',
    },
    {
      question: 'Apakah formulir bandara melacak penerbangan tamu?',
      answer:
        'Tidak. Formulir hanya mencatat nomor penerbangan dan jam mendarat di pesan WhatsApp. Tidak ada pelacakan penerbangan otomatis; jadwal tetap Anda konfirmasi bersama tamu.',
    },
    {
      question: 'Bisakah film peta dipakai untuk kota selain Bali?',
      answer:
        'Peta dan rute di film adalah bagian desain yang menggambarkan Bali. Teks, jam, dan foto tiap perhentian bisa diubah, dan bagian film bisa disembunyikan. Peta kota lain bisa dibuat sebagai pengerjaan custom.',
    },
    {
      question: 'Apakah nama merek mobil perlu ditulis?',
      answer:
        'Tidak perlu. Template menampilkan kelas mobil seperti Sedan, MPV, dan Minibus dengan keterangan atau setara, sehingga Anda tetap leluasa mengganti armada.',
    },
  ],
  imageAlts: {
    'pesiar-preview.webp': 'Tampilan beranda template website private tour {nama} di desktop dan HP: foto sawah Bali selebar layar dan judul di tengah',
    'pesiar-1.webp': 'Bagian tur sehari di template {nama}: kartu foto tegak berisi lama tur, tempat yang dikunjungi, dan harga mulai per mobil',
    'pesiar-2.webp': 'Bagian Rancang tur sendiri di template {nama}: pilihan tempat tujuan dan panel perkiraan durasi serta harga per mobil',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
