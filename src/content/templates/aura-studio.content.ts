// Isi halaman /template/aura-studio. Sumber fakta: src/templates/aura-studio (schema.ts, AuraStudio.tsx, Header.tsx,
// Hero.tsx, Services.tsx, Featured.tsx, sections.tsx). Klaim wajib jujur (rencana §5.5): TANPA klaim medis atau janji
// hasil; reservasi lewat WhatsApp, tanpa sistem jadwal. Demo: Sekar Ayu Aesthetic Studio, Bandung (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website untuk klinik kecantikan, salon, spa, nail art, lash & brow studio, dan barbershop yang ingin tampil lembut, rapi, dan meyakinkan. Daftar perawatan dengan harga mulai, galeri, tim terapis, dan tombol reservasi lewat WhatsApp sudah tersusun, jadi Anda tinggal mengganti isinya dengan layanan dan foto studio sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pelanggan biasanya menemukan studio Anda dari Instagram atau rekomendasi teman, lalu bertanya harga dan jadwal lewat WhatsApp. Website membantu mereka melihat pilihan perawatan dan suasana studio dengan tenang sebelum memesan. Tidak ada sistem reservasi otomatis: jadwal tetap Anda atur sendiri di chat.',
    items: [
      'Klinik kecantikan dan estetika yang ingin menampilkan perawatan wajah beserta harga mulai.',
      'Salon rambut, nail art, serta lash & brow studio dengan banyak layanan dalam beberapa kategori.',
      'Spa dan studio perawatan tubuh yang menonjolkan suasana tenang dan ruang privat.',
      'Barbershop yang ingin memperkenalkan kapster, pilihan layanan, dan lokasinya.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Logo atau monogram, tautan bagian, dan menu "Layanan" yang langsung membuka kategori perawatan; di HP menu dilipat.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Judul huruf kapital di kiri, foto potret tinggi di kanan dengan chip lokasi dan jam buka, tombol Reservasi, serta tiga perawatan dari daftar Anda.',
    },
    {
      name: 'Mengapa kami',
      text: 'Judul di tengah lingkaran tipis dikelilingi hingga 6 kartu alasan; tata letak lingkaran tampil bila alasannya tepat empat.',
    },
    {
      name: 'Perawatan',
      text: 'Hingga 12 kartu foto dengan tab kategori (misalnya Perawatan Wajah dan Perawatan Kuku), jumlah pilihan, dan harga mulai. Kartu membuka WhatsApp dengan nama perawatannya.',
    },
    {
      name: 'Perawatan unggulan',
      text: 'Sorotan satu perawatan: foto bulat, deskripsi, label "cocok untuk", dan hingga 4 tahapan.',
    },
    { name: 'Tentang studio', text: 'Cerita studio dengan foto, angka sorotan, dan hingga 6 poin unggulan.' },
    { name: 'Produk & mitra', text: 'Strip logo produk perawatan atau mitra yang Anda pakai, hingga 12 logo.' },
    { name: 'Galeri', text: 'Hingga 9 foto suasana studio dengan keterangan.' },
    { name: 'Testimoni', text: 'Hingga 6 cerita pelanggan dengan keterangan dan foto bila ada.' },
    { name: 'Tim terapis', text: 'Hingga 6 terapis atau kapster dengan nama, keahlian, dan foto.' },
    { name: 'Ajakan reservasi', text: 'Blok berwarna aksen lembut dengan tombol reservasi dan foto tegak (opsional).' },
    {
      name: 'Kontak',
      text: 'Alamat, telepon, email, WhatsApp, jam operasional, peta Google Maps, dan formulir pesan yang membuka WhatsApp.',
    },
    { name: 'Footer', text: 'Deskripsi studio, teks hak cipta, dan tautan media sosial.' },
  ],
  cms: [
    'Nama studio, tagline, logo, dan warna aksen.',
    'Daftar perawatan: nama, deskripsi, foto, kategori (otomatis menjadi tab), jumlah pilihan, dan harga mulai.',
    'Perawatan unggulan beserta label "cocok untuk" dan tahapannya.',
    'Alasan memilih studio, cerita studio, tim terapis, testimoni, galeri, dan logo produk.',
    'Nomor WhatsApp dan pesan awal untuk semua tombol reservasi, jam operasional, alamat, dan link Google Maps.',
    'Tautan Instagram, TikTok, Facebook, YouTube, dan LinkedIn; kartu terakhir di bagian Perawatan bisa diarahkan ke Instagram.',
  ],
  cmsNote: 'Semua teks deskripsi berasal dari Anda. Template ini tidak menambahkan klaim hasil atau klaim medis apa pun.',
  demo: [
    'Demo {nama} memakai Sekar Ayu Aesthetic Studio, studio fiktif di Coblong, Bandung, dengan dua kategori: perawatan wajah (konsultasi kulit, facial pembersihan, peeling ringan, lash lift & brow) dan perawatan kuku (manikur Jepang, nail art, gel, pedikur spa). Perawatan unggulannya, manikur Jepang, menunjukkan cara menjelaskan tahapan perawatan langkah demi langkah.',
    'Nama terapis, harga, dan testimoni di demo adalah contoh. Di website Anda, tulis deskripsi perawatan apa adanya: jelaskan langkah dan pengalaman perawatan, bukan janji hasil medis.',
  ],
  custom:
    '{nama} menampilkan layanan dan mengarahkan pelanggan ke WhatsApp. Bila studio Anda butuh reservasi dengan pilihan jam dan terapis, pembayaran uang muka, kartu member dan poin, atau catatan riwayat perawatan pelanggan, fitur itu termasuk website atau aplikasi custom. Ceritakan alur reservasi di studio Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah daftar harga perawatan bisa saya ubah sendiri?',
      answer:
        'Bisa. Setiap kartu perawatan punya kolom harga berupa teks, misalnya Mulai Rp250.000. Anda bisa menampilkan hingga 12 perawatan, mengelompokkannya per kategori, dan mengubah harganya kapan saja lewat CMS.',
    },
    {
      question: 'Bisakah pelanggan reservasi online?',
      answer:
        'Reservasi dilakukan lewat WhatsApp. Tombol Reservasi, kartu perawatan, dan perawatan unggulan membuka chat ke nomor studio dengan pesan awal berisi nama perawatannya. {nama} tidak punya kalender atau sistem antrean; bila Anda membutuhkannya, sistem reservasi bisa dibuat lewat jasa custom.',
    },
    {
      question: 'Apa yang sebaiknya ditulis di deskripsi perawatan?',
      answer:
        'Jelaskan apa yang dilakukan, berapa lama, dan untuk siapa perawatan itu, misalnya kulit kering atau kuku rapuh. Hindari janji hasil atau klaim medis yang tidak bisa dibuktikan; template ini tidak menambahkan klaim apa pun di luar teks Anda.',
    },
    {
      question: 'Bisakah menampilkan tim terapis dan produk yang dipakai?',
      answer:
        'Bisa. Bagian Tim terapis menampung hingga 6 orang dengan nama, keahlian, dan foto, sedangkan Produk & mitra menampilkan logo produk perawatan yang Anda pakai. Keduanya bisa disembunyikan bila belum siap.',
    },
    {
      question: 'Saya punya salon dan barbershop sekaligus. Bisakah dipisah?',
      answer:
        'Bisa lewat kategori. Isi kolom kategori setiap perawatan, misalnya Salon dan Barbershop, maka tab kategori terbentuk otomatis dan pengunjung bisa memilih. Semuanya tetap berada di satu halaman website.',
    },
  ],
  imageAlts: {
    'aura-studio-preview.webp': 'Tampilan beranda template website klinik kecantikan {nama} di desktop dan HP',
    'aura-studio-1.webp': 'Daftar perawatan template {nama} dengan tab perawatan wajah dan kuku serta harga mulai',
    'aura-studio-2.webp': 'Bagian perawatan unggulan template {nama}: manikur Jepang dengan foto bulat dan empat tahapan',
  },
  guides: ['website-klinik-kecantikan', 'template-vs-jasa-website-custom'],
};
