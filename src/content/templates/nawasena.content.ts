// Isi halaman /template/nawasena. Sumber fakta: src/templates/nawasena (schema.ts, Nawasena.tsx, Header.tsx, Hero.tsx,
// Stats.tsx, Welcome.tsx, About.tsx, Programs.tsx, Achievements.tsx, News.tsx, Notices.tsx, Clubs.tsx, Facilities.tsx,
// Teachers.tsx, Spmb.tsx, Gallery.tsx, Alumni.tsx, Closing.tsx, Footer.tsx). Kata kunci: "template website profil
// sekolah" di paragraf pembuka; "website profil SMA" dan "website sekolah negeri" di isi. Klaim wajib jujur: formulir
// tanya SPMB hanya menyusun pesan WhatsApp untuk panitia (tanpa penyimpanan data pendaftar dan tanpa pembayaran online),
// pendaftaran tetap di portal SPMB provinsi, tidak ada e-rapor, absensi, atau sistem informasi akademik.
// Demo: nama SMA Negeri 1 Purbolinggo (Lampung Timur) dipakai sebagai contoh; orang, berita, angka, dan alamat fiktif.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website profil sekolah untuk SMA yang tampil rapi, tenang, dan elegan. Slider foto latar selebar layar, strip pengumuman, statistik sekolah, sambutan kepala sekolah, berita, agenda, dan informasi SPMB sudah tersusun; Anda tinggal mengganti foto dan teksnya lewat CMS.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda membutuhkan website profil SMA yang dipercaya orang tua: informasi resmi tersusun rapi, kabar sekolah mudah diperbarui staf, dan calon murid langsung menemukan jalan ke portal penerimaan.',
    items: [
      'SMA negeri yang ingin memperkenalkan visi, misi, guru, fasilitas, dan prestasi murid dalam satu halaman resmi.',
      'Sekolah yang membutuhkan website sekolah negeri dengan berita, pengumuman, dan agenda yang diperbarui sendiri oleh staf.',
      'Panitia penerimaan murid baru yang perlu menjelaskan jalur, jadwal, dan syarat SPMB, lalu mengarahkan pendaftar ke portal provinsi.',
      'SMA swasta atau MA yang menyukai tampilan navy yang tenang; bagian yang tidak dipakai cukup disembunyikan.',
    ],
  },
  parts: [
    {
      name: 'Header & strip pengumuman',
      text: 'Logo di kotak putih, nama sekolah, enam menu dengan penanda bagian aktif, dan tombol SPMB. Di bawah hero, lima pengumuman terbaru berjalan pelan dan bisa dijeda.',
    },
    {
      name: 'Hero slider foto latar',
      text: 'Hingga 4 foto setinggi layar di bawah lapisan navy, judul serif di tengah, dua tombol, nomor slide tegak dengan garis progres, tombol jeda, dan zoom pelan.',
    },
    { name: 'Statistik sekolah', text: 'Pita navy berisi hingga 6 angka besar yang menghitung naik, lengkap dengan catatan kecil dan keterangan tahun ajaran.' },
    {
      name: 'Sambutan kepala sekolah',
      text: 'Foto tegak dengan papan nama, atau papan navy berinisial bila belum ada foto, kutipan besar bercetak miring, dan isi sambutan beberapa paragraf.',
    },
    {
      name: 'Profil, visi, misi & sejarah',
      text: 'Profil singkat berfoto, sejarah singkat, hingga 5 butir buka-tutup untuk visi, misi bernomor, dan budaya sekolah, serta chip profil lulusan.',
    },
    { name: 'Akademik', text: 'Hingga 5 tab paket mata pelajaran pilihan kelas XI–XII dengan foto yang berganti pudar, daftar mata pelajaran, dan kartu kokurikuler.' },
    { name: 'Prestasi', text: 'Hingga 10 kartu yang bisa digeser: peringkat, lomba, tingkat, tahun, nama murid atau tim, dan bidang.' },
    { name: 'Berita', text: 'Satu berita utama berfoto, tiga berita di sampingnya, dan daftar berita lainnya; hingga 7 berita yang isinya dibuka di tempat.' },
    { name: 'Pengumuman & agenda', text: 'Pita navy berisi hingga 8 pengumuman bertanggal dengan label "Penting" dan lampiran, serta linimasa hingga 8 agenda.' },
    {
      name: 'Ekstrakurikuler, fasilitas & guru',
      text: 'Hingga 12 kartu ekstrakurikuler berikon otomatis dan berjadwal, bento hingga 8 fasilitas, serta hingga 8 kartu guru berfoto atau berinisial.',
    },
    {
      name: 'SPMB',
      text: 'Tombol ke portal SPMB provinsi, kartu jalur dengan kuota, tabel perkiraan jadwal, syarat dokumen, dan formulir tanya panitia.',
    },
    {
      name: 'Galeri, alumni, tanya jawab & kontak',
      text: 'Hingga 8 foto berketerangan, 6 cerita alumni, 10 tanya jawab buka-tutup, lalu alamat, telepon, email, jam layanan, dan peta Google Maps.',
    },
  ],
  partsNote:
    'Formulir tanya SPMB hanya menyusun pesan WhatsApp untuk panitia; data tidak disimpan di website. {nama} tidak menyimpan data pendaftar dan tidak ada pembayaran online. Pendaftaran murid baru tetap dilakukan di portal resmi SPMB provinsi; template ini bukan sistem pendaftaran.',
  cms: [
    'Nama sekolah, tagline, logo, dan satu warna tema; nuansa navy hero, pita, dan footer menyesuaikan otomatis.',
    'Foto dan teks setiap slide hero, teks tombol, dan label strip pengumuman.',
    'Angka sekolah, sambutan kepala sekolah, profil, sejarah singkat, visi, misi, dan chip profil lulusan.',
    'Paket mata pelajaran, prestasi, ekstrakurikuler, fasilitas, dan guru beserta fotonya.',
    'Lencana SPMB, jalur dan kuota, jadwal, syarat dokumen, tautan portal, dan nomor WhatsApp panitia.',
    'Berita, pengumuman, agenda, galeri, cerita alumni, tanya jawab, alamat, dan tautan cepat di footer.',
  ],
  cmsNote:
    'Tanggal berita, pengumuman, dan agenda ditulis tahun-bulan-tanggal agar tampil rapi, misalnya 25 Nov 2026; agenda yang sudah lewat otomatis ditandai "Selesai". Ikon ekstrakurikuler dipilih dari namanya. Pengumuman berjalan berhenti sendiri bila perangkat pengunjung meminta gerak minimal.',
  demo: [
    'Demo {nama} memakai nama SMA Negeri 1 Purbolinggo di Lampung Timur sebagai contoh. Di dalamnya ada tiga paket mata pelajaran pilihan, sanggar tari tradisional Lampung, informasi SPMB 2027/2028 dengan jalur domisili, afirmasi, prestasi, dan mutasi, serta agenda sampai masa pengenalan murid baru.',
    'Nama sekolah di demo dipakai sebagai contoh; nama orang, berita, angka, dan alamat di demo fiktif. Isi dengan data sekolah Anda yang sebenarnya, termasuk akreditasi bila perlu ditampilkan. Foto dari Unsplash sebaiknya diganti foto kegiatan sekolah sendiri.',
  ],
  custom:
    '{nama} dirancang untuk memperkenalkan sekolah dan menyampaikan kabarnya. Tidak ada e-rapor, absensi, atau sistem informasi akademik. Bila sekolah Anda membutuhkan SPMB online yang menyimpan data pendaftar, unggah berkas, e-rapor, absensi, atau aplikasi komunikasi orang tua, fitur itu termasuk website atau aplikasi custom. Ceritakan kebutuhannya, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah formulir SPMB di website menyimpan data calon murid?',
      answer:
        'Tidak. Formulir tanya panitia hanya menyusun pertanyaan menjadi pesan WhatsApp, dan {nama} tidak menyimpan data. Pendaftaran dan berkas tetap diurus di portal resmi provinsi; tombol menuju portal itu ada di bagian SPMB.',
    },
    {
      question: 'Bisakah warna websitenya diganti?',
      answer:
        'Bisa. Pilih satu warna tema di CMS; tombol, label, dan tanggal ikut berubah, sedangkan nuansa navy pada hero, pita angka, pita pengumuman, dan footer dibuat ulang otomatis agar teks tetap terbaca.',
    },
    {
      question: 'Bisakah berita dan pengumuman diperbarui sendiri?',
      answer:
        'Bisa. Staf menulis berita, pengumuman, dan agenda di CMS lengkap dengan tanggal, kategori, dan foto. Dengan fitur tambahan Berita & Pengumuman, setiap tulisan punya halaman sendiri yang bisa dibagikan.',
    },
    {
      question: 'Apakah slider dan pengumuman berjalan bisa dihentikan?',
      answer:
        'Bisa. Slider punya tombol jeda, berhenti saat disorot, difokus, atau digulir keluar layar, dan berhenti sendiri di slide pertama setelah dua putaran. Strip pengumuman juga bisa dijeda, dan keduanya diam bila perangkat pengunjung meminta gerak minimal.',
    },
    {
      question: 'Apakah template ini cocok untuk SMA swasta atau MA?',
      answer:
        'Cocok. Ganti teks profil, paket mata pelajaran, dan informasi penerimaan sesuai sekolah Anda, lalu sembunyikan bagian yang tidak dipakai dari CMS.',
    },
  ],
  imageAlts: {
    'nawasena-preview.webp': 'Tampilan beranda template website profil sekolah {nama} di desktop dan HP dengan slider foto latar dan strip pengumuman',
    'nawasena-1.webp': 'Bagian berita template {nama} dengan satu berita utama dan tiga berita lain',
    'nawasena-2.webp': 'Pita navy template {nama} berisi daftar pengumuman bertanggal dan linimasa agenda sekolah',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
