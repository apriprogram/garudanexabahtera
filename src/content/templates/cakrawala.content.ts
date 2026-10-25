// Isi halaman /template/cakrawala. Sumber fakta: src/templates/cakrawala (schema.ts, Cakrawala.tsx, Header.tsx, Hero.tsx,
// Intro.tsx, Welcome.tsx, Programs.tsx, Industry.tsx, Ppdb.tsx, News.tsx, People.tsx, Campus.tsx, Closing.tsx). Kata
// kunci: "template website SMK" di paragraf pembuka; "website sekolah", "website SMK negeri dan swasta", "website PPDB
// online", dan "website sekolah vokasi" di isi. Klaim wajib jujur: formulir PPDB hanya menyusun pesan WhatsApp untuk
// panitia (tanpa penyimpanan data pendaftar dan tanpa pembayaran online); tidak ada e-rapor, absensi, atau sistem
// informasi akademik. Demo: SMK Cakrawala Karya, Bandung (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website SMK untuk sekolah yang ingin tampil modern, rapi, dan mudah dipercaya orang tua sejak layar pertama. Slider foto besar, pengumuman PPDB, sambutan kepala sekolah, program keahlian, berita, alumni, dan lokasi dengan peta sudah tersusun; Anda tinggal mengganti foto dan teks dengan milik sekolah sendiri.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sekolah Anda butuh website sekolah yang lengkap tetapi tetap sederhana dikelola: calon siswa melihat jurusan dan fasilitas, orang tua membaca jadwal dan syarat pendaftaran, lalu mengirim formulir singkat ke panitia lewat WhatsApp. Satu warna tema bisa diganti, misalnya biru untuk sekolah umum atau hijau untuk sekolah berbasis pesantren.',
    items: [
      'Sekolah yang membutuhkan website SMK negeri dan swasta untuk menonjolkan program keahlian, teaching factory, dan mitra industri.',
      'SMA yang mengganti bagian program keahlian menjadi peminatan dan menyembunyikan bagian khas SMK seperti BKK.',
      'Yayasan yang membutuhkan website sekolah vokasi untuk promosi PPDB setiap tahun ajaran baru.',
      'Sekolah yang selama ini hanya memakai media sosial dan ingin punya alamat website dengan domain sendiri.',
    ],
  },
  parts: [
    {
      name: 'Menu & pengumuman',
      text: 'Bilah pengumuman tipis di paling atas (misalnya PPDB dibuka), lalu logo, menu berbentuk pil di atas foto, dan tombol daftar; di HP menu dilipat.',
    },
    {
      name: 'Hero slider',
      text: 'Hingga 4 foto latar yang berganti otomatis dan berhenti saat disorot, lengkap dengan tombol sebelumnya/berikutnya, nomor slide, geser di HP, judul, dua tombol, dan kartu info PPDB.',
    },
    { name: 'Kartu info & statistik', text: 'Tiga kartu singkat di tepi bawah hero dan hingga 5 angka sekolah, misalnya jumlah siswa, guru, prestasi, alumni, dan akreditasi.' },
    { name: 'Sambutan & profil', text: 'Foto dan kutipan kepala sekolah, profil singkat dengan poin keunggulan, lalu kartu visi dan daftar misi bernomor.' },
    { name: 'Program keahlian', text: 'Hingga 9 kartu jurusan dengan kode, ikon otomatis, deskripsi, chip kompetensi, keterangan kelas, dan tombol tanya lewat WhatsApp.' },
    {
      name: 'Teaching factory & prestasi',
      text: 'Panel biru tinta berisi hingga 4 unit produksi, foto, 3 kartu sertifikasi, dan 12 nama atau logo mitra industri, disusul hingga 8 kartu prestasi lomba.',
    },
    {
      name: 'PPDB',
      text: 'Fakta singkat, tab jalur, jadwal berbentuk linimasa, syarat, alur, dan rincian biaya, serta formulir singkat untuk nama, asal sekolah, jurusan, jalur, dan nomor WhatsApp.',
    },
    { name: 'Berita, pengumuman & agenda', text: 'Hingga 9 berita dengan filter kategori dan tanggal, pengumuman dengan label "Penting", serta agenda kegiatan dengan waktu dan tempat.' },
    { name: 'Alumni & BKK', text: 'Angka sorotan lulusan, cerita alumni berfoto, dan hingga 10 lowongan Bursa Kerja Khusus dengan tombol lamar lewat WhatsApp.' },
    { name: 'Fasilitas, galeri & kontak', text: 'Kartu foto fasilitas, galeri bento, tanya jawab buka-tutup, lalu alamat, telepon, email, jam layanan, media sosial, dan peta Google Maps.' },
  ],
  partsNote:
    'Setiap bagian bisa disembunyikan dari CMS. Formulir PPDB menyusun pesan berisi data pendaftar dan membukanya di WhatsApp panitia; data tidak disimpan di website dan tidak ada pembayaran online.',
  cms: [
    'Nama sekolah, tagline, logo, dan satu warna tema dengan pilihan cepat atau kode warna sendiri.',
    'Foto dan teks setiap slide hero, pengumuman di atas menu, serta kartu info PPDB.',
    'Angka statistik, sambutan kepala sekolah, profil, visi, dan misi.',
    'Daftar jurusan, unit produksi, sertifikasi, mitra industri, dan prestasi.',
    'Jalur, jadwal, syarat, alur, dan biaya PPDB, beserta nomor WhatsApp panitia.',
    'Berita, pengumuman, agenda, alumni, lowongan BKK, fasilitas, galeri, tanya jawab, dan alamat untuk peta.',
  ],
  cmsNote:
    'Tanggal berita, pengumuman, dan agenda ditulis dengan format tahun-bulan-tanggal agar tampil rapi, misalnya 7 Nov 2026. Ikon jurusan dan fasilitas dipilih otomatis dari nama yang Anda tulis.',
  demo: [
    'Demo {nama} memakai SMK Cakrawala Karya, sekolah fiktif di Bandung dengan enam program keahlian: pengembangan perangkat lunak, jaringan komputer, desain komunikasi visual, akuntansi, otomotif, dan perhotelan. Di dalamnya ada contoh jadwal PPDB, lowongan BKK, berita prestasi lomba, dan agenda open house yang bisa langsung Anda ganti.',
    'Nama kepala sekolah, siswa, alumni, mitra industri, angka statistik, dan biaya di demo hanyalah contoh. Tulis data sekolah Anda apa adanya, termasuk akreditasi dan kuota setiap jurusan. Foto siswa di demo berasal dari Unsplash, jadi sebaiknya diganti dengan foto kegiatan sekolah Anda sendiri.',
  ],
  custom:
    '{nama} adalah website profil dan informasi sekolah. Bila sekolah Anda membutuhkan website PPDB online yang menyimpan data pendaftar, unggah berkas, pembayaran formulir, e-rapor, absensi, atau sistem informasi akademik untuk guru dan siswa, fitur itu termasuk website atau aplikasi custom. Ceritakan alur pendaftaran dan administrasi di sekolah Anda, lalu kami kirim penawaran setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pendaftar bisa mengisi PPDB langsung di website?',
      answer:
        'Bisa mengisi formulir singkat, tetapi {nama} tidak menyimpan data. Setelah formulir lolos pemeriksaan, isinya ditampilkan dan dibuka sebagai pesan WhatsApp ke nomor panitia. Berkas dan pembayaran tetap diurus panitia secara langsung atau lewat chat.',
    },
    {
      question: 'Apakah template ini cocok untuk SMA atau MA?',
      answer:
        'Cocok. Ganti judul dan label bagian program keahlian menjadi peminatan, isi MIPA, IPS, atau Bahasa, lalu sembunyikan bagian BKK dan teaching factory bila tidak dipakai. Ikon peminatan ikut menyesuaikan nama yang Anda tulis.',
    },
    {
      question: 'Bisakah warna websitenya diganti hijau?',
      answer:
        'Bisa. Pilih warna dari pilihan cepat di CMS atau tulis kode warna sendiri. Tombol, ikon, label, panel gelap, dan footer ikut berubah, dan warna teks di atasnya disesuaikan otomatis agar tetap terbaca.',
    },
    {
      question: 'Bagaimana cara menampilkan lokasi sekolah di peta?',
      answer:
        'Tulis nama sekolah dan kota seperti di Google Maps, atau alamat lengkap, di bagian lokasi dan kontak. Peta dibuat otomatis dan baru dimuat saat pengunjung menggulir ke bagian itu. Anda juga bisa menempel link lokasi untuk tombol buka di Google Maps.',
    },
    {
      question: 'Apakah berita dan pengumuman bisa diperbarui sendiri?',
      answer:
        'Bisa lewat CMS: tambahkan judul, tanggal, kategori, ringkasan, isi, dan foto berita. Berita lama cukup dihapus atau diganti. Untuk arsip berita yang sangat banyak, tautkan tombol di bawah daftar berita ke Instagram atau blog sekolah.',
    },
  ],
  imageAlts: {
    'cakrawala-preview.webp': 'Tampilan beranda template website SMK {nama} di desktop dan HP dengan slider foto siswa dan menu berbentuk pil',
    'cakrawala-1.webp': 'Bagian PPDB template {nama} dengan tab jalur, jadwal, syarat, dan formulir pendaftaran singkat',
    'cakrawala-2.webp': 'Bagian program keahlian template {nama} dengan kartu jurusan, chip kompetensi, dan tombol tanya',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
