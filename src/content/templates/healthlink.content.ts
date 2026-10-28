// Isi halaman /template/healthlink. Sumber fakta: src/templates/healthlink (schema.ts, HealthLink.tsx, Header.tsx,
// Hero.tsx, Services.tsx, Doctors.tsx, Care.tsx, Reminders.tsx, Network.tsx, Closing.tsx, Footer.tsx, Dock.tsx). Kata
// kunci: "template website telemedicine" di paragraf pembuka; "website konsultasi dokter online", "website telemedicine
// rumah sakit", dan "landing page aplikasi kesehatan" di isi. Klaim wajib jujur: template ini halaman pemasaran layanan;
// konsultasi berjalan lewat WhatsApp atau aplikasi milik pembeli, rekam medis tidak disimpan di website, tidak ada
// video call di dalam website, tidak ada pembayaran online, pengingat kontrol dibuat di perangkat pengunjung. Demo:
// HealthLink, Yogyakarta (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website telemedicine untuk klinik, jaringan rumah sakit, dan layanan kesehatan yang melayani konsultasi dokter dari jarak jauh. Tampilannya seperti layar beranda aplikasi: kolom cari dokter dan ubin layanan besar langsung di atas foto, lalu halaman menuntun pasien dari memilih dokter sampai menebus resep dan menyimpan jadwal kontrol.',
  suitableFor: {
    intro:
      'Pilih {nama} bila sebagian besar pasien membuka website Anda dari HP dan ingin langsung tahu: dokter siapa yang bisa dihubungi, berapa biayanya, dan bagaimana cara mulai konsultasi.',
    items: [
      'Klinik yang membuka layanan konsultasi dokter online lewat WhatsApp.',
      'Rumah sakit atau jaringan RS yang butuh website telemedicine rumah sakit terpisah dari website utamanya.',
      'Startup kesehatan yang sudah punya aplikasi dan butuh landing page aplikasi kesehatan untuk tombol unduh.',
      'Praktik dokter bersama dengan beberapa spesialis yang ingin jadwalnya mudah dicari.',
      'Apotek atau layanan antar obat yang ingin menjelaskan alur resep digital.',
    ],
  },
  parts: [
    {
      name: 'Menu atas melayang',
      text: 'Bilah putih membulat yang tetap terlihat saat digulir, berisi logo atau simbol bawaan, tautan bagian, dan tombol Konsultasi.',
    },
    {
      name: 'Hero kartu aplikasi',
      text: 'Foto latar selebar layar dengan kartu putih berisi judul, deskripsi, kolom cari dokter, hingga 4 ubin layanan, dan catatan darurat dengan tombol telepon 119.',
    },
    { name: 'Layanan', text: 'Hingga 6 kartu dengan ikon besar yang dipilih otomatis dari nama layanan, satu kalimat, dan label harga atau keterangan.' },
    { name: 'Cara konsultasi', text: 'Hingga 4 langkah bernomor dan kartu ilustrasi percakapan tiga gelembung chat di atas foto.' },
    {
      name: 'Dokter online',
      text: 'Hingga 9 kartu dokter dengan inisial, spesialis, status, harga per sesi, dan tombol chat; bisa dicari menurut nama atau keluhan dan disaring per spesialis.',
    },
    { name: 'Resep & obat', text: 'Foto apotek dan pengantaran, alur hingga 4 langkah, label pilihan pengiriman, dan tombol tebus resep.' },
    { name: 'Rekam medis', text: 'Poin penjelasan dan kartu ilustrasi layar aplikasi berisi hingga 4 riwayat kunjungan, dengan tombol ke aplikasi Anda.' },
    {
      name: 'Pengingat kontrol',
      text: 'Formulir jenis, tanggal, jam, dan waktu pengingat yang membuat file kalender .ics atau tautan Google Calendar langsung di perangkat pasien.',
    },
    { name: 'RS mitra', text: 'Hingga 8 kartu rumah sakit atau klinik berfoto dengan kota dan layanannya, serta 3 angka ringkas.' },
    { name: 'Biaya', text: 'Hingga 3 kartu paket, misalnya per sesi dan langganan keluarga, dengan daftar isi dan satu kartu sorotan.' },
    { name: 'Unduh aplikasi', text: 'Panel gelap warna tema dengan dua tombol toko aplikasi berupa teks biasa dan foto.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, plus tautan WhatsApp.' },
    { name: 'Bantuan & footer', text: 'Ubin WhatsApp, telepon, email, dan jam layanan, alamat dengan Google Maps, kartu darurat, lalu footer dengan catatan medis.' },
  ],
  partsNote:
    'Template ini halaman pemasaran layanan; konsultasi berjalan lewat WhatsApp atau aplikasi milik Anda, rekam medis tidak disimpan di website. Tombol chat dan video call membuka tautan aplikasi atau portal yang Anda isi di CMS, atau WhatsApp bila tautan kosong. Tidak ada video call di dalam website, tidak ada akun pasien, dan tidak ada pembayaran online. Pengingat kontrol dibuat di perangkat pengunjung; tidak ada data yang dikirim atau disimpan di website.',
  cms: [
    'Nama layanan, tagline, logo, dan satu warna aksen; warna tombol, kotak ikon, dan panel aplikasi ikut menyesuaikan.',
    'Semua judul, deskripsi, ubin layanan, label, dan teks tombol, termasuk bilah aksi di HP.',
    'Tautan chat dokter dan video call ke aplikasi atau portal Anda, juga tautan Google Play dan App Store.',
    'Daftar dokter dengan spesialis, kata kunci keluhan untuk pencarian, status, dan harga.',
    'Langkah resep, riwayat kunjungan contoh, pilihan jenis pengingat, rumah sakit mitra, dan paket biaya.',
    'Semua foto, nomor WhatsApp, telepon, email, alamat, dan nomor darurat.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Rekam medis bila aplikasi Anda belum memilikinya.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan label formulir pengingat mengikuti desain template. Status dokter adalah teks yang Anda perbarui sendiri, bukan jadwal yang terhubung ke sistem rumah sakit.',
  demo: [
    'Demo {nama} memakai layanan fiktif HealthLink dari Yogyakarta yang terhubung ke empat rumah sakit mitra fiktif. Di sana terlihat bagaimana pasien mencari dokter menurut keluhan, membaca biaya per sesi, lalu memilih chat atau video call dari HP.',
    'Nama dokter, rumah sakit, harga, angka, dan alamat di demo adalah contoh. Ganti semuanya dengan data asli sebelum website dibagikan, tulis izin dan nama badan usaha hanya sesuai dokumen yang benar-benar Anda miliki, dan pertahankan catatan bahwa konsultasi online bukan untuk keadaan darurat.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman pemasaran agar layanan Anda cepat tampil. Bila Anda butuh video call langsung di website, akun pasien, rekam medis elektronik, jadwal dokter yang terhubung ke sistem rumah sakit, atau pembayaran online, semua itu termasuk website atau aplikasi custom. Biayanya kami sampaikan setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah pasien bisa video call dengan dokter langsung di website {nama}?',
      answer:
        'Tidak. Tombol video call membuka aplikasi, portal, atau tautan rapat yang Anda isi di CMS. Bila kosong, tombol membuka WhatsApp dengan pesan yang sudah tersusun.',
    },
    {
      question: 'Apakah data pasien atau rekam medis disimpan di website?',
      answer:
        'Tidak. Bagian rekam medis hanyalah ilustrasi tampilan aplikasi, kolom cari dokter bekerja di halaman saja, dan pengingat kontrol dibuat sebagai file kalender di perangkat pasien.',
    },
    {
      question: 'Bagaimana cara pasien membayar konsultasi?',
      answer:
        'Website tidak memproses pembayaran. Tombol paket membuka WhatsApp dengan nama paket, lalu tim Anda mengirim detail pembayaran lewat jalur yang biasa Anda pakai.',
    },
    {
      question: 'Bisakah daftar dokter dipakai untuk banyak spesialis?',
      answer:
        'Bisa, hingga 9 dokter. Tombol saringan dibuat otomatis dari kolom spesialis, dan kata kunci keluhan seperti demam atau gatal membantu pasien menemukan dokter yang sesuai.',
    },
    {
      question: 'Apakah tampilannya nyaman di HP?',
      answer:
        'Ya. {nama} dirancang dari layar HP lebih dulu: ubin besar, tombol lebar, kartu yang mudah diketuk, dan bilah aksi Chat Dokter serta Video Call di bagian bawah layar setelah pasien menggulir.',
    },
  ],
  imageAlts: {
    'healthlink-preview.webp': 'Tampilan beranda template website telemedicine {nama} di desktop dan HP: kartu aplikasi dengan kolom cari dokter dan ubin layanan di atas foto',
    'healthlink-1.webp': 'Bagian dokter online template {nama}: kolom cari, saringan spesialis, dan kartu dokter dengan harga per sesi',
    'healthlink-2.webp': 'Bagian pengingat kontrol template {nama}: formulir tanggal dan jam yang membuat file kalender di perangkat pasien',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
