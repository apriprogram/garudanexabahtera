// Isi halaman /template/bestari. Sumber fakta: src/templates/bestari (schema.ts, Bestari.tsx, Header.tsx, Hero.tsx,
// Intro.tsx, About.tsx, Programs.tsx, Ppdb.tsx, News.tsx, Community.tsx, Closing.tsx, Footer.tsx). Kata kunci:
// "template website SD" di paragraf pembuka; "website sekolah dasar", "website SD swasta", "website PPDB SD", dan
// "website sekolah" di isi. Klaim wajib jujur: formulir PPDB hanya menyusun pesan WhatsApp untuk panitia (tanpa
// penyimpanan data pendaftar dan tanpa pembayaran online); tidak ada e-rapor, absensi, atau sistem informasi akademik.
// Demo: SD Bestari Cendekia, Yogyakarta (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website SD untuk sekolah dasar yang ingin tampil hangat, tenang, dan mudah dipercaya orang tua sejak layar pertama. Slider foto besar, menu berbentuk pil, sambutan kepala sekolah, program unggulan, guru, berita, pengumuman, dan halaman PPDB sudah tersusun; Anda tinggal mengganti foto dan teks dengan milik sekolah sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda butuh website sekolah dasar yang lengkap tetapi tetap sederhana dikelola: orang tua melihat program dan guru, membaca jadwal serta syarat pendaftaran, lalu mengirim formulir singkat ke panitia lewat WhatsApp. Satu warna tema bisa diganti, misalnya terakota bawaan, hijau, atau biru.',
    items: [
      'Sekolah yang membutuhkan website SD swasta untuk menonjolkan kelas kecil, program literasi, sains, seni, dan pramuka.',
      'Yayasan yang membutuhkan website PPDB SD untuk promosi penerimaan murid baru setiap tahun ajaran.',
      'SD negeri yang ingin punya website sekolah resmi berisi berita, pengumuman, dan agenda untuk orang tua.',
      'SMP yang ingin tampilan serupa dengan mengganti isi program dan menyembunyikan bagian yang tidak dipakai.',
    ],
  },
  parts: [
    {
      name: 'Menu & bilah info',
      text: 'Bilah tipis di paling atas berisi email, telepon, dan pengumuman PPDB, lalu menu putih berbentuk pil yang melayang di atas foto dengan tombol daftar; di HP menu dilipat.',
    },
    {
      name: 'Hero slider',
      text: 'Hingga 4 foto latar selebar layar yang berganti otomatis dan berhenti saat disorot, lengkap dengan nomor slide, tombol sebelumnya/berikutnya/jeda, geser di HP, judul, dua tombol, dan tiga angka sekolah.',
    },
    {
      name: 'Kartu sorotan & lencana',
      text: 'Tiga kartu yang menumpang di tepi bawah hero (kartu tengah berwarna tema) dan hingga 6 lencana, misalnya akreditasi, sekolah Adiwiyata, atau sekolah ramah anak.',
    },
    {
      name: 'Profil & angka sekolah',
      text: 'Judul paragraf besar dua warna, kolase dua foto, poin keunggulan, daftar buka-tutup untuk visi, misi, dan kurikulum, lalu hingga 4 kartu angka besar.',
    },
    {
      name: 'Sambutan & alasan memilih',
      text: 'Foto dan kutipan kepala sekolah, lalu hingga 5 alasan bernomor yang dibuka satu per satu, foto dengan kartu angka, dan kutipan seorang guru.',
    },
    { name: 'Program, prestasi & guru', text: 'Hingga 6 kartu program berfoto dengan ikon otomatis, 8 baris prestasi lomba, dan 6 kartu foto guru beserta jabatannya.' },
    {
      name: 'PPDB',
      text: 'Fakta singkat, tab jalur, jadwal berbentuk linimasa, syarat, alur, dan rincian biaya, serta formulir untuk nama, tanggal lahir, orang tua, kelas, jalur, asal TK, dan nomor WhatsApp.',
    },
    { name: 'Berita, pengumuman & agenda', text: 'Hingga 9 berita dengan filter kategori dan tanggal, pengumuman dengan label "Penting", serta agenda kegiatan dengan waktu dan tempat.' },
    { name: 'Testimoni, galeri & kontak', text: 'Kutipan orang tua dan alumni, galeri foto, tanya jawab buka-tutup, lalu alamat, telepon, email, jam layanan, media sosial, dan peta Google Maps.' },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir PPDB menghitung usia calon murid pada tanggal acuan yang Anda tentukan, lalu menyusun pesan berisi data pendaftar dan membukanya di WhatsApp panitia; data tidak disimpan di website dan tidak ada pembayaran online.',
  cms: [
    'Nama sekolah, tagline, logo, dan satu warna tema dengan pilihan cepat atau kode warna sendiri.',
    'Foto dan teks setiap slide hero, pengumuman di bilah atas, tiga angka di hero, dan kartu sorotan.',
    'Lencana, profil, visi, misi, angka sekolah, sambutan kepala sekolah, dan alasan memilih sekolah.',
    'Daftar program, prestasi, dan guru beserta foto masing-masing.',
    'Jalur, jadwal, syarat, alur, biaya, pilihan kelas, tanggal acuan usia, dan nomor WhatsApp panitia PPDB.',
    'Berita, pengumuman, agenda, testimoni, galeri, tanya jawab, dan alamat untuk peta.',
  ],
  cmsNote:
    'Tanggal berita, pengumuman, dan agenda ditulis dengan format tahun-bulan-tanggal agar tampil rapi, misalnya 7 Nov 2026. Ikon program, lencana, dan angka dipilih otomatis dari teks yang Anda tulis.',
  demo: [
    'Demo {nama} memakai SD Bestari Cendekia, sekolah dasar fiktif di Yogyakarta dengan program literasi bilingual, sains dan robotika, seni budaya, serta pramuka. Di dalamnya ada contoh jadwal PPDB, berita lomba baca puisi, pengumuman pembagian rapor, dan agenda open house yang bisa langsung Anda ganti.',
    'Nama kepala sekolah, guru, murid, orang tua, angka sekolah, dan biaya di demo hanyalah contoh. Tulis data sekolah Anda apa adanya, termasuk akreditasi dan kuota setiap kelas. Foto murid di demo berasal dari Unsplash, jadi sebaiknya diganti dengan foto kegiatan sekolah Anda sendiri.',
  ],
  custom:
    '{nama} adalah website profil dan informasi sekolah. Bila sekolah Anda membutuhkan PPDB online yang menyimpan data pendaftar, unggah berkas, pembayaran formulir, e-rapor, absensi, atau aplikasi komunikasi guru dan orang tua, fitur itu termasuk website atau aplikasi custom. Ceritakan alur pendaftaran dan administrasi di sekolah Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah orang tua bisa mendaftar PPDB langsung di website?',
      answer:
        'Orang tua mengisi formulir singkat berisi nama dan tanggal lahir anak, nama orang tua, kelas, dan jalur. {nama} tidak menyimpan data: setelah diperiksa, isian disusun menjadi pesan dan dibuka di WhatsApp panitia. Penyerahan berkas dan pembayaran tetap diurus langsung dengan panitia.',
    },
    {
      question: 'Bagaimana formulir menghitung usia calon murid?',
      answer:
        'Isi tanggal acuan usia di CMS, misalnya 1 Juli tahun ajaran baru. Saat orang tua memilih tanggal lahir, formulir menampilkan usia anak pada tanggal itu dan menuliskannya di pesan WhatsApp untuk panitia.',
    },
    {
      question: 'Apakah template ini cocok untuk SMP?',
      answer:
        'Cocok. Ganti isi program, pilihan kelas, dan teks PPDB sesuai jenjang Anda, lalu sembunyikan bagian yang tidak dipakai. Ikon program dan lencana ikut menyesuaikan teks yang Anda tulis.',
    },
    {
      question: 'Bisakah warna websitenya diganti?',
      answer:
        'Bisa. Pilih warna dari pilihan cepat di CMS atau tulis kode warna sendiri. Tombol, ikon, label, kartu sorotan, dan nuansa footer ikut berubah, dan warna teks di atasnya disesuaikan otomatis agar tetap terbaca.',
    },
    {
      question: 'Apakah berita dan pengumuman bisa diperbarui sendiri?',
      answer:
        'Bisa. Staf sekolah menulis berita, pengumuman, dan agenda langsung di CMS lengkap dengan tanggal, kategori, dan foto, tanpa menyentuh kode. Berita bisa disaring per kategori oleh pengunjung, dan tombol di bawah daftar berita bisa diarahkan ke Instagram sekolah untuk kabar yang lebih lama.',
    },
  ],
  imageAlts: {
    'bestari-preview.webp': 'Tampilan beranda template website SD {nama} di desktop dan HP dengan slider foto murid dan menu putih berbentuk pil',
    'bestari-1.webp': 'Bagian program unggulan template {nama} dengan kartu foto literasi, sains, seni, dan pramuka',
    'bestari-2.webp': 'Bagian PPDB template {nama} dengan fakta pendaftaran, tab jalur, dan formulir pendaftaran singkat',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
