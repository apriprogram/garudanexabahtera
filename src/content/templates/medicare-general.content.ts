// Isi halaman /template/medicare-general. Sumber fakta: src/templates/medicare-general (schema.ts, MediCareGeneral.tsx,
// Header.tsx, Hero.tsx, Services.tsx, Registration.tsx, Doctors.tsx, Clinics.tsx, Emergency.tsx, Inpatient.tsx,
// Insurance.tsx, Faq.tsx, Contact.tsx, Footer.tsx). Kata kunci: "template website rumah sakit" di paragraf pembuka;
// "website rumah sakit umum", "jadwal dokter online", "pendaftaran online rumah sakit", dan "website IGD" di isi. Klaim
// wajib jujur: formulir pendaftaran hanya menyusun pesan WhatsApp (data pasien tidak disimpan di website), tidak ada
// rekam medis, pembayaran online, konsultasi video, atau nomor antrean otomatis; jadwal dokter adalah teks dari CMS;
// tanpa klaim akreditasi. Demo: RS MediCare General, Semarang (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website rumah sakit untuk rumah sakit umum yang ingin informasinya mudah dibaca semua usia, termasuk pasien lansia. Nomor IGD selalu terlihat di strip merah paling atas, pengunjung bisa memperbesar ukuran teks, dan halaman menuntun mereka dari jadwal dokter dan poliklinik sampai pendaftaran berobat lewat WhatsApp.',
  suitableFor: {
    intro:
      'Pilih {nama} bila pasien sering bertanya lewat telepon: dokter mana yang praktik hari ini, poli di lantai berapa, kapan jam besuk, dan bagaimana alur pasien BPJS. Website rumah sakit umum ini menjawabnya dalam satu halaman yang jelas.',
    items: [
      'Rumah sakit umum swasta yang ingin menampilkan jadwal dokter online.',
      'Rumah sakit daerah yang butuh website IGD dengan nomor darurat yang menonjol.',
      'Klinik utama dengan dokter spesialis, laboratorium, dan farmasi.',
      'Rumah sakit yang melayani pasien BPJS, asuransi, dan umum.',
    ],
  },
  parts: [
    {
      name: 'Menu atas & strip IGD',
      text: 'Strip merah berisi nomor IGD yang bisa langsung ditelepon dan tombol ukuran teks A, A+, A++, lalu bilah menu dengan tombol Daftar Online.',
    },
    {
      name: 'Hero dengan ubin aksi',
      text: 'Foto latar, judul, dua tombol, dan tiga ubin besar: Daftar Online, Jadwal Dokter, dan ubin IGD merah dengan nomor telepon.',
    },
    { name: 'Layanan', text: 'Hingga 9 ubin layanan seperti rawat jalan, IGD, rawat inap, laboratorium, radiologi, dan farmasi; ikon dipilih otomatis dari namanya.' },
    {
      name: 'Pendaftaran online',
      text: 'Formulir tiga langkah: poli dan dokter, data pasien (BPJS, umum, atau asuransi), lalu tanggal dan sesi kunjungan, plus daftar dokumen yang perlu dibawa.',
    },
    {
      name: 'Jadwal dokter',
      text: 'Tabel hingga 30 dokter yang bisa disaring per poli dan per hari; tombol Daftar mengisi formulir pendaftaran. Dokter tampil dengan inisial, tanpa foto.',
    },
    {
      name: 'Poliklinik & penunjang',
      text: 'Tiga angka ringkas, hingga 16 poliklinik dengan lokasinya, dan hingga 4 kartu penunjang medis seperti laboratorium dan farmasi.',
    },
    {
      name: 'IGD 24 jam',
      text: 'Pita merah dengan garis detak jantung, nomor IGD besar, tombol IGD dan ambulans, catatan nomor darurat 119, dan langkah saat darurat.',
    },
    { name: 'Rawat inap', text: 'Tab untuk hingga 6 kelas kamar, masing-masing dengan foto, kapasitas, dan daftar fasilitas, ditambah kotak jam besuk dan aturannya.' },
    {
      name: 'Asuransi & BPJS',
      text: 'Tiga tab: alur pasien BPJS, daftar penjamin, dan alur pasien umum.',
    },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal nomor antrean, jam poliklinik, dan letak pintu IGD.' },
    {
      name: 'Kontak & footer',
      text: 'Kontak darurat, informasi dan pendaftaran, foto gedung, peta Google Maps, lalu footer dengan media sosial dan catatan legal.',
    },
  ],
  partsNote:
    'Formulir pendaftaran hanya menyusun pesan WhatsApp untuk petugas pendaftaran; data pasien tidak disimpan di website. Tidak ada rekam medis, nomor antrean otomatis, pembayaran online, atau konsultasi video di website. Jadwal dokter, kelas kamar, dan daftar penjamin adalah teks yang Anda perbarui sendiri lewat CMS, dan jadwal tetap dikonfirmasi petugas lewat WhatsApp.',
  cms: [
    'Nama rumah sakit, tagline, logo, dan satu warna tema; footer biru tua ikut menyesuaikan, sedangkan merah IGD tetap agar mudah dikenali.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautan, termasuk teks tiga ubin di hero.',
    'Nomor IGD, ambulans, informasi, WhatsApp, email, alamat, jam layanan, dan peta.',
    'Jadwal dokter, poliklinik, kelas kamar, jam besuk, alur BPJS, dan daftar penjamin.',
    'Semua foto: hero, penunjang medis, IGD, kamar, dan gedung.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Rawat inap bila rumah sakit Anda hanya melayani rawat jalan.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, label formulir, nama hari, dan judul kolom tabel mengikuti desain template. Catatan legal di footer sebaiknya diisi sesuai izin dan status akreditasi yang benar-benar dimiliki rumah sakit Anda.',
  demo: [
    'Demo {nama} memakai RS MediCare General, rumah sakit umum fiktif di Semarang dengan 12 poliklinik, 14 dokter, dan IGD 24 jam. Di sana terlihat bagaimana pasien lansia memperbesar teks, menemukan nomor IGD, menyaring jadwal dokter, lalu mendaftar berobat.',
    'Nama rumah sakit, nama dokter, jadwal, nomor telepon, alamat, dan nama penjamin di demo adalah contoh. Ganti semuanya dengan data asli rumah sakit Anda sebelum alamat website dibagikan.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman website rumah sakit agar cepat aktif. Bila rumah sakit Anda butuh antrean online yang terhubung ke SIMRS, portal hasil laboratorium, akun pasien, rekam medis elektronik, pembayaran online, atau telekonsultasi, semua itu termasuk website custom. Kami merancangnya sesuai alur kerja rumah sakit Anda, dan biayanya kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Bagaimana cara kerja pendaftaran online di {nama}?',
      answer:
        'Pasien memilih poli dan dokter, mengisi data singkat, lalu memilih tanggal dan sesi kunjungan. Formulir menyusun pesan WhatsApp ke nomor rumah sakit; data pasien tidak disimpan di website, dan petugas membalas untuk mengonfirmasi jadwal.',
    },
    {
      question: 'Apakah jadwal dokter bisa diubah sendiri?',
      answer:
        'Bisa. Jadwal dokter adalah daftar di CMS berisi nama, poli, hari, dan jam praktik. Ubah, tambah, atau hapus dokter kapan saja; saringan poli dan hari di website ikut menyesuaikan.',
    },
    {
      question: 'Apakah pasien bisa melihat hasil lab atau rekam medis di website?',
      answer:
        'Tidak. {nama} tidak terhubung ke sistem informasi rumah sakit, jadi tidak ada rekam medis, hasil lab, atau nomor antrean otomatis di website. Fitur seperti itu bisa dibuat sebagai pekerjaan custom.',
    },
    {
      question: 'Untuk apa tombol ukuran teks A, A+, A++?',
      answer:
        'Tombol itu memperbesar seluruh teks halaman agar mudah dibaca pasien lansia atau pengunjung berpenglihatan lemah. Pilihan ukuran diingat di perangkat pengunjung, tanpa akun dan tanpa data yang dikirim ke server.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo rumah sakit?',
      answer:
        'Bisa. Ganti warna tema di bagian Identitas & warna; tombol, ikon, tautan, dan footer ikut menyesuaikan, dan warna teks dipilih otomatis agar tetap terbaca. Merah IGD sengaja tidak berubah supaya mudah dikenali.',
    },
  ],
  imageAlts: {
    'medicare-general-preview.webp':
      'Tampilan beranda template website rumah sakit {nama} di desktop dan HP: strip IGD merah, foto selasar rumah sakit, dan ubin Daftar Online, Jadwal Dokter, serta IGD 24 Jam',
    'medicare-general-1.webp': 'Bagian jadwal dokter template {nama}: saringan poli dan hari, serta tabel dokter dengan tombol Daftar',
    'medicare-general-2.webp': 'Pita IGD 24 jam template {nama} dengan garis detak jantung, nomor IGD besar, dan langkah saat darurat',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
