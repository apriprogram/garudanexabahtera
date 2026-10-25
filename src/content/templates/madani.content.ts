// Isi halaman /template/madani. Sumber fakta: src/templates/madani (schema.ts, Madani.tsx, Header.tsx, Hero.tsx,
// About.tsx, Ppdb.tsx, PpdbForm.tsx, News.tsx, Board.tsx, Closing.tsx). Kata kunci: lihat madani.ts. Klaim wajib jujur:
// formulir PPDB hanya menyusun pesan WhatsApp untuk panitia (TIDAK menyimpan data, tanpa akun pendaftar, tanpa
// pembayaran online); bukan sistem informasi sekolah (tanpa e-rapor, absensi, database siswa). Demo: SMA IT Nurul Azka,
// Kota Bogor (fiktif); nama orang, angka, prestasi, dan biaya hanyalah contoh.
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website sekolah Islam untuk SMA Islam terpadu, madrasah aliyah, dan sekolah berasrama yang ingin tampil teduh, rapi, dan mudah dipahami orang tua. Halamannya sudah berisi slider foto sekolah, sambutan kepala sekolah, profil dengan visi dan misi, program unggulan, prestasi, berita, pengumuman, agenda, dan bagian PPDB lengkap dengan formulir minat yang dikirim lewat WhatsApp.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda butuh website SMA Islam yang menjawab pertanyaan calon wali murid dalam satu halaman: seperti apa suasana sekolahnya, apa saja programnya, kapan pendaftaran dibuka, dan berapa biayanya. Panitia cukup menunggu pesan WhatsApp yang sudah berisi data calon siswa, lalu melanjutkan seleksi seperti biasa.',
    items: [
      'SMA Islam terpadu yang ingin website sekolah Islam terpadu dengan program tahfidz, sains, dan bahasa.',
      'Madrasah aliyah yang butuh website madrasah aliyah sederhana untuk profil, berita, dan pengumuman.',
      'Sekolah berasrama atau boarding school yang ingin menampilkan asrama putra dan putri secara jelas.',
      'Yayasan pendidikan yang ingin website PPDB online sederhana tanpa sistem pendaftaran yang rumit.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Logo atau simbol kubah dan buku bawaan, menu pil yang hanya berisi bagian yang tampil, dan tombol PPDB berwarna sorotan. Di HP menu dilipat.',
    },
    {
      name: 'Hero slider foto',
      text: 'Hingga 4 foto latar selebar layar, masing-masing dengan judul dan deskripsi sendiri. Slide berganti otomatis, berhenti saat disorot, bisa diatur dengan tombol dan keyboard, serta bisa digeser di HP. Ada dua tombol dan kartu info PPDB.',
    },
    {
      name: 'Strip info & sambutan',
      text: 'Empat keunggulan singkat berikon, lalu sambutan kepala sekolah dengan foto, kutipan, isi sambutan, nama, dan jabatan.',
    },
    {
      name: 'Profil, visi & misi',
      text: 'Tab Profil (cerita sekolah dan hingga 6 data singkat), Visi, Misi (hingga 8 butir), dan Nilai sekolah (hingga 4).',
    },
    { name: 'Statistik', text: 'Hingga 5 kartu angka, misalnya jumlah siswa, guru, prestasi, alumni, dan akreditasi, yang dihitung naik saat terlihat.' },
    { name: 'Program unggulan', text: 'Hingga 6 kartu berfoto dengan label, keterangan singkat, dan tombol tanya program lewat WhatsApp.' },
    { name: 'Prestasi & fasilitas', text: 'Pita gelap berisi kartu angka dan hingga 10 prestasi lengkap dengan tahun dan tingkatnya, lalu foto fasilitas dan hingga 10 fasilitas berikon.' },
    {
      name: 'PPDB',
      text: 'Jalur pendaftaran dalam tab, jadwal berupa linimasa, syarat umum, alur bernomor, rincian biaya opsional, dan formulir minat: nama calon siswa, jenis kelamin, asal sekolah, jalur, program, orang tua, dan nomor WhatsApp.',
    },
    {
      name: 'Berita, pengumuman & agenda',
      text: 'Hingga 6 kartu berita yang isinya bisa dibuka di tempat, hingga 8 pengumuman bertanggal dengan lencana seperti Penting, dan hingga 8 agenda dengan waktu dan tempat.',
    },
    { name: 'Galeri & alumni', text: 'Mozaik hingga 6 foto kegiatan, lalu cerita alumni dengan foto, angkatan, dan kegiatan sekarang.' },
    {
      name: 'Tanya jawab, ajakan & lokasi',
      text: 'Hingga 10 pertanyaan yang bisa dibuka-tutup, pita ajakan, lalu alamat, telepon, email, WhatsApp, jam layanan, media sosial, dan peta Google Maps.',
    },
  ],
  partsNote:
    'Formulir PPDB tidak menyimpan data: isiannya disusun menjadi pesan WhatsApp untuk nomor panitia yang Anda tulis di CMS, jadi tidak ada akun pendaftar dan tidak ada pembayaran online di website.',
  cms: [
    'Nama sekolah, tagline, logo, warna tema, dan warna sorotan (opsional, otomatis bila dikosongkan).',
    'Foto dan teks setiap slide hero, tombol, serta kartu info PPDB.',
    'Sambutan kepala sekolah, profil, visi, misi, nilai, dan angka statistik.',
    'Program, prestasi, fasilitas, galeri, dan cerita alumni beserta fotonya.',
    'Jalur, kuota, jadwal, syarat, alur, biaya, pilihan program, dan nomor WhatsApp panitia PPDB.',
    'Berita, pengumuman, agenda, tanya jawab, alamat, kata kunci peta, dan media sosial.',
  ],
  cmsNote:
    'Warna tema bisa dipilih dari warna cepat (misalnya hijau atau biru) atau kode warna sendiri; tombol, ikon, pita gelap, dan warna sorotan ikut menyesuaikan. Tanggal berita dan agenda ditulis dengan format tahun-bulan-tanggal agar tampil rapi.',
  demo: [
    'Demo {nama} memakai SMA IT Nurul Azka, sekolah Islam terpadu fiktif di Kota Bogor dengan program tahfidz, kelas olimpiade sains, bilingual Arab dan Inggris, serta asrama putra dan putri. PPDB di demo berisi empat jalur, yaitu reguler, prestasi, tahfidz, dan beasiswa yatim dan dhuafa.',
    'Nama guru dan siswa, angka statistik, prestasi, jadwal, dan biaya di demo hanyalah contoh. Ganti semuanya dengan data sekolah Anda sendiri, termasuk foto kegiatan yang benar-benar terjadi di sekolah, sebelum website dipublikasikan.',
  ],
  custom:
    '{nama} adalah website profil dan informasi sekolah, bukan sistem informasi sekolah: tidak ada e-rapor, absensi, database siswa, akun orang tua, maupun pendaftaran yang tersimpan di server. Bila sekolah Anda membutuhkan PPDB dengan unggah berkas, pembayaran online, atau portal siswa, fitur itu termasuk website atau aplikasi custom. Ceritakan kebutuhannya, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah calon siswa bisa mendaftar langsung di website?',
      answer:
        'Bisa mengisi formulir minat. Isinya disusun menjadi pesan WhatsApp untuk panitia PPDB dan tidak disimpan di website. Seleksi, berkas, dan pembayaran tetap Anda atur seperti biasa setelah panitia membalas pesan tersebut.',
    },
    {
      question: 'Bisakah warnanya diganti selain hijau?',
      answer:
        'Bisa. Di CMS ada pilihan warna tema dan warna sorotan. Pilih biru, merah marun, ungu, atau tulis kode warna sendiri; teks di atas tombol otomatis dibuat kontras agar tetap terbaca.',
    },
    {
      question: 'Apakah cocok untuk madrasah aliyah atau SMP Islam?',
      answer:
        'Cocok. Semua judul, jalur PPDB, syarat, dan pilihan program bisa Anda ubah, jadi template ini juga bisa dipakai madrasah aliyah, SMP Islam terpadu, atau pondok pesantren yang menyelenggarakan sekolah formal.',
    },
    {
      question: 'Bagaimana cara memperbarui berita dan pengumuman?',
      answer:
        'Lewat CMS: tambahkan berita dengan foto, ringkasan, dan isi lengkap, atau tambahkan pengumuman dengan lencana Penting. Tidak perlu coding, dan perubahan langsung tampil setelah disimpan.',
    },
    {
      question: 'Apakah bisa menampilkan lokasi sekolah di peta?',
      answer:
        'Bisa. Peta Google Maps dibuat otomatis dari alamat atau dari kata kunci peta, misalnya nama sekolah seperti yang tercantum di Google Maps, lengkap dengan tombol untuk membuka petunjuk arah.',
    },
  ],
  imageAlts: {
    'madani-preview.webp': 'Tampilan beranda template website sekolah Islam {nama} di desktop dan HP dengan slider foto siswi berjilbab',
    'madani-1.webp': 'Bagian PPDB template {nama} dengan tab jalur pendaftaran, linimasa jadwal, dan formulir minat',
    'madani-2.webp': 'Bagian program unggulan template {nama} dengan kartu berfoto, label, dan tombol tanya lewat WhatsApp',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
