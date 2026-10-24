// Isi halaman /template/serenity. Sumber fakta: src/templates/serenity (schema.ts, Serenity.tsx, Header.tsx, Hero.tsx,
// Programs.tsx, Pricing.tsx, Faq.tsx, Closing.tsx). Klaim wajib jujur: pendaftaran lewat WhatsApp, TANPA sistem
// jadwal/pembayaran, tanpa klaim medis atau janji hasil. Demo: Aruna Yoga, Lembang (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website untuk studio yoga dan pilates, instruktur yoga privat, kelas olahraga ringan, dan penyelenggara retret yoga yang ingin tampil tenang serta rapi. Pembuka foto selebar layar, daftar kelas, paket harga, cerita peserta, dan tombol daftar lewat WhatsApp sudah tersusun, jadi Anda tinggal mengganti isinya dengan kelas dan suasana studio Anda sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon peserta biasanya ingin tahu dulu suasana studio, jenis kelas, dan harganya sebelum berani datang, terutama pemula yang merasa belum cukup lentur. Halaman yang lapang membantu mereka merasa nyaman, lalu bertanya jadwal lewat WhatsApp. Jadwal dan pembayaran tetap Anda atur sendiri; tidak ada kalender pemesanan otomatis.',
    items: [
      'Studio yoga dengan beberapa jenis kelas, misalnya Hatha, Vinyasa, dan Yin.',
      'Studio pilates atau kelas olahraga ringan yang ingin menampilkan jadwal dan paket member.',
      'Instruktur yoga privat yang mengajar di studio, di rumah peserta, atau secara online.',
      'Penyelenggara retret dan kelas yoga akhir pekan di alam terbuka.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Logo atau simbol bawaan, tautan bagian dengan garis bawah tipis di bagian yang sedang dibaca, tombol daftar, dan tombol cari; di HP menu dilipat.',
    },
    {
      name: 'Pencarian di menu',
      text: 'Pengunjung mengetik kata seperti "vinyasa" atau "paket" lalu langsung diarahkan ke kelas, paket, langkah, atau pertanyaan yang cocok di halaman.',
    },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Foto pemandangan selebar layar dengan menu transparan, judul dua baris yang baris keduanya bergradasi, tombol utama, tombol video, kartu kaca kecil, dan strip empat jenis kelas di bawahnya.',
    },
    { name: 'Tentang', text: 'Foto tegak dengan kartu keterangan, cerita studio, hingga 6 poin unggulan, dan 3 angka pencapaian.' },
    {
      name: 'Kelas',
      text: 'Hingga 6 kartu kelas dengan foto, durasi dan level, deskripsi, dan tautan tanya jadwal yang membuka WhatsApp berisi nama kelasnya.',
    },
    { name: 'Cara memulai', text: 'Panel lembut berisi hingga 4 langkah bernomor, misalnya pilih kelas, daftar, datang, dan berlatih di rumah.' },
    {
      name: 'Paket',
      text: 'Hingga 4 kartu harga dengan isi paket per baris; paket berlabel sorotan tampil gelap dan menonjol. Tombolnya membuka WhatsApp dengan nama paket.',
    },
    { name: 'Cerita peserta', text: 'Hingga 6 kutipan peserta dengan nama, keterangan, dan foto atau inisial.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan dan tombol WhatsApp di sampingnya.' },
    { name: 'Ajakan', text: 'Panel foto membulat dengan judul, tombol utama, dan tombol menuju paket.' },
    { name: 'Kontak', text: 'Alamat, telepon, email, jam buka, tombol WhatsApp, dan peta Google Maps.' },
    { name: 'Footer', text: 'Deskripsi singkat, menu halaman, kontak ringkas, tombol media sosial, dan teks hak cipta.' },
  ],
  partsNote: 'Setiap bagian bisa disembunyikan dari CMS bila belum Anda perlukan, misalnya Paket atau Cerita peserta.',
  cms: [
    'Nama studio, tagline, logo, dan satu warna aksen yang ikut mewarnai ikon, label, dan gradasi judul.',
    'Foto latar hero, judul, kata yang bergradasi, tombol utama, tautan video, kartu kaca, dan empat jenis kelas di bawah hero.',
    'Kelas lengkap dengan foto, durasi, level, dan tautan sendiri bila tidak ingin memakai WhatsApp.',
    'Langkah memulai, paket dan harganya, cerita peserta, serta tanya jawab.',
    'Nomor WhatsApp dan pesan awal untuk semua tombol daftar, jam buka, alamat, dan link Google Maps.',
    'Tautan Instagram, YouTube, TikTok, Facebook, dan LinkedIn di footer.',
  ],
  cmsNote: 'Ikon kelas dipilih otomatis dari namanya (Hatha, Vinyasa, Yin, Pemula, Privat, Retret), jadi Anda tidak perlu mengunggah ikon.',
  demo: [
    'Demo {nama} memakai Aruna Yoga, studio fiktif di kaki bukit Lembang, dengan enam kelas: Hatha Yoga, Vinyasa Flow, Yin & Restoratif, Yoga Pemula, kelas privat, dan retret yoga. Tiga paket contoh menunjukkan cara menampilkan kelas percobaan, member bulanan yang disorot, dan sesi privat.',
    'Nama peserta, angka, dan harga di demo hanyalah contoh. Tulis deskripsi kelas apa adanya: gerakan apa yang dilatih, berapa lama, dan untuk level siapa. Kelas yoga adalah latihan kebugaran, bukan pengganti layanan kesehatan, dan template ini tidak menambahkan klaim hasil apa pun.',
  ],
  custom:
    '{nama} menampilkan kelas dan mengarahkan calon peserta ke WhatsApp. Bila studio Anda butuh jadwal kelas dengan kuota, pembayaran member online, kartu member dengan sisa kelas, atau aplikasi video latihan untuk peserta, fitur itu termasuk website atau aplikasi custom. Ceritakan alur pendaftaran di studio Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Bisakah peserta memesan jadwal kelas langsung di website?',
      answer:
        'Pendaftaran dilakukan lewat WhatsApp. Tombol daftar, tautan tanya jadwal di kartu kelas, dan tombol paket membuka chat ke nomor Anda dengan pesan berisi nama kelas atau paketnya. {nama} tidak punya kalender atau kuota kelas; bila Anda membutuhkannya, sistem jadwal bisa dibuat lewat jasa custom.',
    },
    {
      question: 'Apakah foto di demo boleh saya pakai?',
      answer:
        'Foto demo berasal dari Unsplash dan hanya contoh suasana. Sebaiknya ganti dengan foto studio, kelas, dan instruktur Anda sendiri lewat CMS supaya calon peserta melihat tempat yang sebenarnya. Bila foto kelas dikosongkan, kartu memakai gradasi lembut bawaan dengan ikon.',
    },
    {
      question: 'Bagaimana kalau saya tidak punya video?',
      answer:
        'Cukup kosongkan tautan tombol video di CMS, maka tombol itu tidak tampil dan tombol utama tetap ada. Bila punya video kelas di YouTube atau Instagram, tempel tautannya dan pengunjung akan membukanya di tab baru.',
    },
    {
      question: 'Bisakah dipakai untuk studio pilates atau instruktur privat?',
      answer:
        'Bisa. Semua judul bagian, nama kelas, paket, dan langkah bisa Anda ganti, misalnya menjadi kelas mat pilates atau paket sesi privat di rumah peserta. Warna aksen juga bisa disesuaikan dengan identitas studio Anda.',
    },
    {
      question: 'Apa yang sebaiknya ditulis di deskripsi kelas?',
      answer:
        'Jelaskan gerakan yang dilatih, durasi, level, dan perlengkapan yang perlu dibawa. Hindari janji hasil atau klaim kesehatan yang tidak bisa dibuktikan; bila ada syarat tertentu, tulis jelas di tanya jawab agar peserta bisa menyiapkan diri.',
    },
  ],
  imageAlts: {
    'serenity-preview.webp': 'Tampilan beranda template website studio yoga {nama} di desktop dan HP dengan hero foto bukit senja',
    'serenity-1.webp': 'Bagian kelas template {nama} dengan kartu foto Hatha Yoga, Vinyasa Flow, dan Yin & Restoratif',
    'serenity-2.webp': 'Bagian paket template {nama} dengan tiga kartu harga dan satu paket member yang disorot',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
