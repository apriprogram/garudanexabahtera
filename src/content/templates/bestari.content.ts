// Isi halaman /template/bestari. Sumber fakta: src/templates/bestari (schema.ts, Bestari.tsx, Header.tsx, Hero.tsx,
// Intro.tsx, About.tsx, Programs.tsx, Ppdb.tsx, News.tsx, Community.tsx, Closing.tsx, Footer.tsx). Kata kunci:
// "template website SMA" di paragraf pembuka; "website SMA swasta", "website PPDB SMA", "website SMA negeri", dan
// "website sekolah" di isi. Klaim wajib jujur: formulir PPDB hanya menyusun pesan WhatsApp untuk panitia (tanpa
// penyimpanan data pendaftar dan tanpa pembayaran online); tidak ada e-rapor, absensi, atau sistem informasi akademik.
// Demo: SMA Bestari Cendekia, Yogyakarta (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website SMA yang tampil modern, tenang, dan meyakinkan bagi calon siswa maupun orang tua sejak layar pertama. Slider foto besar, navbar yang menempel di atas, sambutan kepala sekolah, program, guru, berita, pengumuman, dan halaman PPDB sudah tersusun; Anda tinggal mengganti foto dan teksnya.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda butuh website sekolah yang lengkap tetapi tetap sederhana dikelola: calon siswa dan orang tua melihat program, prestasi, dan guru, membaca jadwal serta syarat pendaftaran, lalu mengirim formulir singkat ke panitia lewat WhatsApp.',
    items: [
      'Sekolah yang membutuhkan website SMA swasta untuk menonjolkan kelas kecil, bimbingan kuliah, klub sains, seni, dan olahraga.',
      'Yayasan yang membutuhkan website PPDB SMA untuk promosi penerimaan siswa baru setiap tahun ajaran.',
      'Sekolah yang ingin punya website SMA negeri resmi berisi berita, pengumuman, dan agenda untuk siswa dan orang tua.',
      'MA yang ingin tampilan serupa dengan mengganti isi program dan menyembunyikan bagian yang tidak dipakai.',
    ],
  },
  parts: [
    {
      name: 'Navbar & bilah info',
      text: 'Bilah tipis berisi email, telepon, dan pengumuman PPDB, lalu navbar selebar layar yang transparan di atas foto dan putih saat digulir, dengan tombol daftar; di HP menu dilipat.',
    },
    {
      name: 'Hero slider',
      text: 'Hingga 4 foto latar selebar layar yang berganti otomatis dan berhenti saat disorot, dengan tombol slide dan jeda, geser di HP, judul, dua tombol, dan tiga angka yang menghitung naik.',
    },
    {
      name: 'Kartu sorotan & lencana',
      text: 'Tiga kartu yang menumpang di tepi bawah hero (kartu tengah berwarna tema) dan hingga 6 lencana, misalnya akreditasi, sekolah Adiwiyata, atau bebas perundungan.',
    },
    {
      name: 'Profil & angka sekolah',
      text: 'Judul paragraf besar dua warna, kolase dua foto, poin keunggulan, daftar buka-tutup untuk visi, misi, dan kurikulum, lalu hingga 4 kartu angka besar.',
    },
    {
      name: 'Sambutan & alasan memilih',
      text: 'Foto dan kutipan kepala sekolah, lalu hingga 5 alasan bernomor yang dibuka satu per satu, foto dengan kartu angka, dan kutipan seorang guru.',
    },
    {
      name: 'Program, prestasi & guru',
      text: 'Hingga 6 kartu program berfoto dalam carousel yang bisa digeser dengan ikon otomatis, 8 baris prestasi lomba, dan 6 kartu foto guru beserta jabatannya.',
    },
    {
      name: 'PPDB',
      text: 'Fakta singkat, tab jalur, jadwal berbentuk linimasa, syarat, alur, dan rincian biaya, serta formulir untuk nama, tanggal lahir, orang tua, kelas, jalur, asal sekolah, dan nomor WhatsApp.',
    },
    { name: 'Berita, pengumuman & agenda', text: 'Hingga 9 berita dengan filter kategori dan tanggal, pengumuman dengan label "Penting", serta agenda kegiatan dengan waktu dan tempat.' },
    { name: 'Testimoni, galeri & kontak', text: 'Kutipan orang tua dan alumni, galeri foto, tanya jawab buka-tutup, lalu alamat, telepon, email, jam layanan, media sosial, dan peta Google Maps.' },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir PPDB menghitung usia calon siswa pada tanggal acuan, lalu membuka pesan berisi data pendaftar di WhatsApp panitia; data tidak disimpan di website dan tidak ada pembayaran online.',
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
    'Demo {nama} memakai SMA Bestari Cendekia, SMA swasta fiktif di Yogyakarta dengan bimbingan masuk PTN, robotika, marching band, serta basket dan futsal. Ada contoh jadwal PPDB, berita juara futsal, pengumuman try out, dan agenda open house yang bisa langsung Anda ganti.',
    'Nama kepala sekolah, guru, siswa, orang tua, angka sekolah, dan biaya di demo hanyalah contoh. Tulis data sekolah Anda apa adanya, termasuk akreditasi dan kuota setiap kelas. Foto siswa di demo berasal dari Unsplash, jadi sebaiknya diganti dengan foto kegiatan sekolah Anda sendiri.',
  ],
  custom:
    '{nama} adalah website profil dan informasi sekolah. Bila sekolah Anda membutuhkan PPDB online yang menyimpan data pendaftar, unggah berkas, pembayaran formulir, e-rapor, absensi, atau aplikasi komunikasi guru dan orang tua, fitur itu termasuk website atau aplikasi custom. Ceritakan alur pendaftaran dan administrasi di sekolah Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah calon siswa bisa mendaftar PPDB langsung di website?',
      answer:
        'Calon siswa atau orang tua mengisi formulir singkat: nama, tanggal lahir, orang tua, kelas, jalur, dan asal sekolah. {nama} tidak menyimpan data: isian disusun menjadi pesan dan dibuka di WhatsApp panitia. Berkas dan pembayaran tetap diurus langsung dengan panitia.',
    },
    {
      question: 'Bagaimana formulir memeriksa usia calon siswa?',
      answer:
        'Isi tanggal acuan usia di CMS, misalnya 1 Juli tahun ajaran baru. Formulir menampilkan usia pada tanggal itu, menolak tahun lahir yang tidak wajar untuk SMA, dan menuliskan usianya di pesan WhatsApp.',
    },
    {
      question: 'Apakah template ini cocok untuk MA?',
      answer:
        'Cocok. Ganti isi program, pilihan kelas, dan teks PPDB sesuai kebutuhan madrasah Anda, lalu sembunyikan bagian yang tidak dipakai. Ikon program dan lencana ikut menyesuaikan teks yang Anda tulis.',
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
    'bestari-preview.webp': 'Tampilan beranda template website SMA {nama} di desktop dan HP dengan slider foto siswa dan navbar transparan',
    'bestari-1.webp': 'Bagian program unggulan template {nama} dengan carousel kartu foto bimbingan masuk PTN, sains, dan marching band',
    'bestari-2.webp': 'Bagian PPDB template {nama} dengan fakta pendaftaran, tab jalur, dan formulir pendaftaran singkat',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
