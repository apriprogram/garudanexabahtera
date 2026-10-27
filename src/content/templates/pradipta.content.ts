// Isi halaman /template/pradipta. Sumber fakta: src/templates/pradipta (schema.ts, Pradipta.tsx, Header.tsx, Hero.tsx,
// Intro.tsx, About.tsx, Programs.tsx, StudentLife.tsx, Facilities.tsx, News.tsx, Teachers.tsx, Spmb.tsx, SpmbForm.tsx,
// Community.tsx, Closing.tsx, Footer.tsx). Kata kunci: "template landing page SMA" di kalimat pertama; "landing page SPMB" dan "website
// SPMB SMA" di isi. Klaim wajib jujur: formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia (tanpa
// penyimpanan data, unggah berkas, atau pembayaran online); pendaftaran tetap di portal SPMB provinsi; tidak ada e-rapor,
// absensi, atau sistem informasi akademik. Demo: nama "SMA Negeri 1 Purbolinggo" (Lampung Timur) sebagai contoh, data
// lain fiktif.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template landing page SMA negeri yang tampil terang, rapi, dan tenang. Header putih dengan menu yang penunjuknya bergeser, slider foto selebar layar dengan thumbnail, statistik, berita, pengumuman, agenda, dan halaman SPMB sudah tersusun dalam satu halaman; sekolah tinggal mengganti foto dan tulisannya sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda ingin satu halaman yang jelas bagi calon murid, orang tua, dan alumni: kabar terbaru mudah ditemukan dan pertanyaan langsung sampai ke panitia lewat WhatsApp.',
    items: [
      'SMA negeri yang setiap tahun ajaran membutuhkan landing page SPMB berisi jalur, jadwal, dan syarat umum.',
      'Sekolah yang ingin punya website SPMB SMA yang mengarahkan pendaftar ke portal provinsi sekaligus menjawab pertanyaan orang tua.',
      'Sekolah yang rutin menerbitkan berita kegiatan, pengumuman untuk murid, dan agenda bagi orang tua.',
      'MA atau SMK yang menginginkan tampilan serupa dengan menyembunyikan bagian yang tidak dipakai.',
    ],
  },
  parts: [
    {
      name: 'Header putih & menu bergeser',
      text: 'Bilah putih yang menempel di atas, menu di lintasan biru langit dengan penunjuk putih yang bergeser mengikuti bagian yang sedang dibaca, dan tombol Info SPMB; di HP menu dilipat.',
    },
    {
      name: 'Hero slider foto dengan thumbnail',
      text: 'Hingga 4 foto latar selebar layar; judul dan dua tombol di kartu putih, thumbnail berbilah progres sebagai tombol slide, tombol jeda, dan geser di HP.',
    },
    {
      name: 'Akses cepat & statistik',
      text: 'Empat ubin besar menuju SPMB, pengumuman, atau layanan seperti e-learning dan PPID; ubin tanpa tautan membuka catatan singkat. Lalu hingga 6 angka sekolah di gelembung bulat dengan keterangan periode data.',
    },
    {
      name: 'Profil, visi, misi & nilai',
      text: 'Profil singkat dengan foto, data ringkas, visi, misi bernomor, dan hingga 8 nilai yang ditumbuhkan sekolah, misalnya delapan dimensi profil lulusan.',
    },
    { name: 'Sambutan kepala sekolah', text: 'Foto kepala sekolah atau papan nama berinisial, kutipan besar, beberapa paragraf sambutan, nama dan jabatan, serta tombol menuju bagian guru.' },
    {
      name: 'Akademik: kelompok mapel pilihan',
      text: 'Hingga 5 kelompok mata pelajaran pilihan dalam daftar buka-tutup, dengan foto yang berganti mengikuti kelompok yang dibuka, chip mata pelajaran, catatan, dan kartu kokurikuler.',
    },
    {
      name: 'Ekstrakurikuler, prestasi & fasilitas',
      text: 'Hingga 12 kartu ekstrakurikuler yang bisa disaring per kategori, linimasa prestasi mendatar yang dikelompokkan per tahun dan bisa digeser, serta hingga 8 kartu fasilitas seperti laboratorium, perpustakaan, dan lapangan.',
    },
    {
      name: 'Berita, pengumuman & agenda',
      text: 'Hingga 9 berita dengan filter kategori, pengumuman bertanggal dengan label Penting, dan agenda berbentuk ubin kalender.',
    },
    {
      name: 'Guru & SPMB',
      text: 'Kartu guru berfoto atau berinisial, lalu tab jalur, jadwal, dan syarat, tombol menuju portal SPMB provinsi, serta formulir tanya tiga langkah: data siswa, pilihan jalur dan topik, lalu kontak.',
    },
    {
      name: 'Testimoni, galeri, tanya jawab & kontak',
      text: 'Kutipan orang tua dan alumni, galeri bento, tanya jawab buka-tutup dengan kartu bantuan, lalu alamat, telepon, email, jam layanan, dan peta Google Maps.',
    },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia; {nama} tidak menyimpan data apa pun di website. Pendaftaran tetap di portal SPMB provinsi, tanpa unggah berkas, dan tidak ada pembayaran online.',
  cms: [
    'Nama sekolah, tagline, logo, dan satu warna tema; pita biru langit, garis kartu, dan warna teks kecil menyesuaikan sendiri.',
    'Foto, label, judul, deskripsi, teks thumbnail, dan dua tombol untuk setiap slide hero, serta tombol di menu atas.',
    'Ubin akses cepat, angka statistik beserta catatannya, profil, visi, misi, nilai sekolah, dan sambutan kepala sekolah.',
    'Kelompok mata pelajaran pilihan, ekstrakurikuler beserta kategorinya, prestasi per tahun, fasilitas, dan daftar guru.',
    'Jalur, kuota, jadwal, syarat, tautan portal, topik pertanyaan, dan nomor WhatsApp panitia SPMB.',
    'Berita, pengumuman, agenda, testimoni, galeri, tanya jawab, alamat untuk peta, dan media sosial di footer.',
  ],
  cmsNote:
    'Tanggal ditulis tahun-bulan-tanggal agar tampil rapi, misalnya 7 Nov 2026, dan agenda menjadi ubin kalender. Ikon dipilih dari teks yang Anda tulis. Statistik, prestasi, berita, dan agenda diisi sendiri di CMS, tidak tersambung otomatis ke Dapodik; pengumuman tidak terhapus otomatis setelah tanggalnya lewat.',
  demo: [
    'Demo {nama} memakai nama SMA Negeri 1 Purbolinggo, Lampung Timur, sebagai contoh. Isinya mencakup tiga kelompok mapel pilihan, sanggar tari Lampung, Pramuka, contoh jadwal SPMB, pengumuman asesmen, dan agenda Hari Guru.',
    'Nama kepala sekolah, guru, murid, alamat, angka, berita, dan prestasi di demo bersifat fiktif dan hanya ilustrasi. Tulis data sekolah Anda apa adanya, termasuk akreditasi bila ingin ditampilkan. Foto dari Unsplash sebaiknya diganti foto kegiatan sekolah sendiri.',
  ],
  custom:
    '{nama} adalah landing page informasi sekolah, tanpa e-rapor, absensi, atau sistem informasi akademik. Pendaftaran online yang menyimpan data pendaftar, unggah berkas, pembayaran, atau aplikasi komunikasi guru dan orang tua termasuk pekerjaan custom. Ceritakan kebutuhan sekolah Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Bisakah calon murid mendaftar langsung di website ini?',
      answer:
        'Tidak. Pendaftaran SMA negeri tetap dilakukan di portal SPMB provinsi, dan {nama} menyediakan tombol menuju portal itu. Formulir di halaman ini hanya untuk bertanya kepada panitia: isiannya disusun menjadi pesan WhatsApp, dan {nama} tidak menyimpan data pendaftar.',
    },
    {
      question: 'Apakah template ini memakai istilah SPMB atau PPDB?',
      answer:
        'Bawaannya memakai SPMB (Sistem Penerimaan Murid Baru). Judul, label bagian, dan teks tombol bisa Anda tulis ulang di CMS, misalnya menjadi PPDB; nama menu SPMB, label formulir tanya, dan pembuka pesan WhatsApp-nya tetap memakai istilah SPMB.',
    },
    {
      question: 'Bagaimana slider dan thumbnail-nya bekerja?',
      answer:
        'Foto berganti dengan pudar dan bilah progres di thumbnail menunjukkan sisa waktunya. Slider berhenti saat disorot, punya tombol jeda, bisa digeser di HP, dan berhenti sendiri setelah dua putaran.',
    },
    {
      question: 'Bisakah warna biru diganti?',
      answer:
        'Bisa. Pilih satu warna tema di CMS; latar biru langit, garis kartu, tombol, dan label ikut menyesuaikan, dan warna teks kecil digelapkan otomatis agar tetap terbaca.',
    },
    {
      question: 'Apakah berita dan pengumuman bisa diperbarui sendiri?',
      answer:
        'Bisa. Staf sekolah menulis berita, pengumuman, dan agenda di CMS lengkap dengan tanggal, kategori, dan foto; dengan fitur tambahan Berita & Pengumuman setiap tulisan mendapat halaman sendiri.',
    },
  ],
  imageAlts: {
    'pradipta-preview.webp':
      'Tampilan beranda template landing page SMA {nama} di desktop dan HP dengan slider foto, kartu judul putih, dan thumbnail slide',
    'pradipta-1.webp': 'Bagian berita template {nama} dengan tombol filter kategori dan empat kartu berita berfoto bertanggal',
    'pradipta-2.webp': 'Bagian SPMB template {nama} dengan tab jalur, jadwal, dan syarat serta formulir tanya panitia tiga langkah',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
