// Isi halaman /template/jumantara. Sumber fakta: src/templates/jumantara (schema.ts, Jumantara.tsx, Header.tsx,
// Hero.tsx, Services.tsx, About.tsx, Academics.tsx, News.tsx, Clubs.tsx, Facilities.tsx, People.tsx, Spmb.tsx,
// Closing.tsx, Footer.tsx). Kata kunci: "template website sekolah negeri" di paragraf pembuka; "website SMA
// profesional" di isi ("template website SMA" milik Bestari). Klaim wajib jujur: formulir SPMB hanya menyusun pesan
// WhatsApp untuk bertanya (tanpa penyimpanan data dan tanpa pembayaran online), pendaftaran tetap di portal resmi SPMB
// provinsi; tidak ada e-rapor, absensi, atau sistem informasi akademik. Demo: nama SMA Negeri 1 Purbolinggo sebagai
// contoh, isi fiktif.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website sekolah negeri untuk SMA yang rapi, tenang, dan mudah dipercaya orang tua sejak layar pertama. Slider foto selebar layar dengan bilah progres per slide, pita angka sekolah, layanan cepat, berita, pengumuman, agenda, dan informasi SPMB sudah tersusun; sekolah tinggal mengganti foto dan teksnya.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda butuh website sekolah negeri yang terasa seperti lembaga publik yang terurus: informasi resmi mudah ditemukan, kabar sekolah diperbarui rutin, dan alur penerimaan murid baru dijelaskan dengan jujur.',
    items: [
      'SMA negeri yang ingin punya website SMA profesional untuk murid, orang tua, dan alumni.',
      'Sekolah negeri yang butuh halaman SPMB berisi jalur, perkiraan jadwal, dan syarat, dengan tautan ke portal provinsi.',
      'SMA swasta atau MA yang menyukai tampilan biru yang tenang dan cukup mengganti isinya.',
      'Sekolah dengan tim humas yang menulis berita setiap pekan dan ingin pengumuman penting langsung terlihat.',
    ],
  },
  parts: [
    {
      name: 'Bilah utilitas & header',
      text: 'Bilah tipis berisi telepon, email, jam layanan, dan hingga 3 tautan cepat seperti PPID, lalu header yang transparan di atas foto dan putih saat digulir, dengan tombol Info SPMB.',
    },
    {
      name: 'Hero slider',
      text: 'Hingga 4 foto latar selebar layar dengan judul per slide, bilah progres yang bisa diklik, tombol jeda, dan geser di HP. Slider berhenti saat disorot dan setelah dua putaran.',
    },
    {
      name: 'Angka sekolah',
      text: 'Pita empat angka di bagian bawah foto, misalnya peserta didik dan guru, yang menghitung naik sekali, ditambah catatan periode data.',
    },
    {
      name: 'Layanan cepat',
      text: 'Hingga 8 ubin bergaris tipis seperti E-Learning, Perpustakaan Digital, PPID, Legalisir, Tracer Study, dan Pengaduan, dengan ikon yang dipilih otomatis dari nama layanan.',
    },
    {
      name: 'Sambutan & profil',
      text: 'Kutipan kepala sekolah (dengan foto bila diisi), isi sambutan, lalu profil singkat, empat fakta singkat, dan kartu bertab untuk visi, misi, dan profil lulusan.',
    },
    {
      name: 'Akademik',
      text: 'Hingga 4 kartu kelompok mata pelajaran pilihan untuk kelas XI–XII beserta daftar mapelnya; kartu keempat tampil melebar, cocok untuk kokurikuler.',
    },
    {
      name: 'Berita, pengumuman & agenda',
      text: 'Berita utama berfoto besar dan daftar berita lain, pengumuman dengan label Penting dan tanda lampiran PDF, serta agenda dengan ubin tanggal, waktu, dan tempat.',
    },
    {
      name: 'Prestasi & ekstrakurikuler',
      text: 'Hingga 8 kartu prestasi lengkap dengan tingkat lomba dan tahun, lalu hingga 12 kegiatan ekstrakurikuler yang bisa disaring per kategori.',
    },
    {
      name: 'Fasilitas & guru',
      text: 'Rel kartu foto fasilitas yang bisa digeser, lalu hingga 12 kartu guru dan tenaga kependidikan dengan foto atau inisial.',
    },
    {
      name: 'SPMB',
      text: 'Pita gelap berisi tab jalur, jadwal, dan syarat, tombol ke portal SPMB provinsi, serta formulir tanya panitia untuk nama, asal SMP/MTs, jalur yang diminati, dan pertanyaan.',
    },
    {
      name: 'Alumni, galeri, FAQ & kontak',
      text: 'Cerita alumni dengan tautan Tracer Study, galeri foto, tanya jawab buka-tutup, lalu kontak lengkap dan peta Google Maps.',
    },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir tanya panitia SPMB hanya menyusun pesan WhatsApp; website tidak menyimpan data calon murid dan tidak ada pembayaran online. Pendaftaran tetap dilakukan di portal resmi SPMB provinsi; {nama} hanya menautkannya.',
  cms: [
    'Nama sekolah, tagline, logo, dan satu warna tema; bilah atas, pita SPMB, dan footer ikut menyesuaikan.',
    'Foto, label, dan teks setiap slide hero, empat angka sekolah, catatan periode, dan tautan cepat di bilah atas.',
    'Ubin layanan beserta tautannya, sambutan kepala sekolah, profil, serta isi tab visi dan misi.',
    'Kelompok mapel pilihan, prestasi, ekstrakurikuler beserta kategorinya, fasilitas, guru, dan cerita alumni.',
    'Jalur, kuota, jadwal, syarat, alamat portal SPMB provinsi, dan nomor WhatsApp panitia.',
    'Berita, pengumuman, agenda, galeri, tanya jawab, alamat untuk peta, dan media sosial.',
  ],
  cmsNote:
    'Tanggal berita, pengumuman, dan agenda ditulis dengan format tahun-bulan-tanggal agar tampil rapi; agenda juga menampilkan nama hari. Ikon layanan, mapel, dan ekstrakurikuler dipilih otomatis dari teks yang Anda tulis.',
  demo: [
    'Demo {nama} berisi contoh pengumuman asesmen akhir semester, agenda Hari Guru, berita projek kokurikuler, dan informasi SPMB tahun ajaran 2027/2028 yang bisa langsung Anda ganti.',
    'Demo memakai nama SMA Negeri 1 Purbolinggo sebagai contoh; kepala sekolah, guru, alumni, berita, angka, dan alamatnya fiktif. Ganti semuanya dengan data resmi sekolah Anda; akreditasi boleh dicantumkan bila sekolah menghendakinya. Foto demo dari Unsplash sebaiknya diganti foto kegiatan sekolah Anda.',
  ],
  custom:
    '{nama} adalah website profil dan informasi sekolah. Tidak ada e-rapor, absensi, atau sistem informasi akademik; tautan E-Learning, Perpustakaan Digital, dan PPID mengarah ke layanan yang sudah dimiliki sekolah. Angka sekolah, pengumuman, dan agenda tidak diperbarui otomatis; staf memperbaruinya lewat CMS. Pendaftaran yang menyimpan data, unggah berkas, atau pembayaran termasuk pekerjaan custom; ceritakan kebutuhannya, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Di mana calon murid mendaftar SPMB?',
      answer:
        'Di portal resmi SPMB provinsi, bukan di website sekolah. Tombol di bagian SPMB membuka portal itu. Formulir di halaman sekolah hanya untuk bertanya kepada panitia: isiannya disusun menjadi pesan WhatsApp, website tidak menyimpan data, dan tidak ada pembayaran online.',
    },
    {
      question: 'Apakah {nama} cocok untuk SMA swasta atau MA?',
      answer:
        'Cocok. Ganti isi bagian SPMB sesuai alur penerimaan di sekolah Anda, ubah kelompok mapel, lalu sembunyikan bagian yang tidak dipakai, misalnya tautan PPID.',
    },
    {
      question: 'Bisakah warna websitenya diganti dari biru?',
      answer:
        'Bisa. Pilih warna lain di CMS atau tulis kode warna sendiri. Tombol, ubin tanggal agenda, label, dan versi gelap untuk bilah atas, pita SPMB, serta footer ikut berubah, dan warna teks di atasnya disesuaikan otomatis agar tetap terbaca.',
    },
    {
      question: 'Bagaimana sekolah memperbarui berita, pengumuman, dan agenda?',
      answer:
        'Staf menulisnya langsung di CMS lengkap dengan tanggal, kategori, label Penting, lampiran, dan foto, tanpa menyentuh kode. Berita pertama otomatis tampil besar.',
    },
    {
      question: 'Apakah SMA Negeri 1 Purbolinggo di demo adalah data sungguhan?',
      answer:
        'Bukan. Nama sekolah hanya dipakai sebagai contoh; sambutan, berita, angka, guru, alumni, alamat, telepon, dan email di demo adalah ilustrasi yang Anda ganti dengan data sekolah sendiri.',
    },
  ],
  imageAlts: {
    'jumantara-preview.webp': 'Tampilan beranda template website sekolah negeri {nama} di desktop dan HP dengan slider foto, bilah progres, dan angka sekolah',
    'jumantara-1.webp': 'Bagian berita template {nama} dengan berita utama berfoto dan daftar kabar sekolah terbaru',
    'jumantara-2.webp': 'Bagian SPMB template {nama} dengan tab jalur, jadwal, syarat, dan formulir tanya panitia lewat WhatsApp',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
