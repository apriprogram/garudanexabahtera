// Isi halaman /template/specialistplus. Sumber fakta: src/templates/specialistplus (schema.ts, SpecialistPlus.tsx,
// Header.tsx, Hero.tsx, Specialists.tsx, Mcu.tsx, LabResults.tsx, Technology.tsx, Turnaround.tsx, Community.tsx,
// Contact.tsx, Footer.tsx). Kata kunci: "template website klinik spesialis" di paragraf pembuka; "website klinik
// spesialis", "website laboratorium klinik", "website medical check-up", dan "website pusat diagnostik" di isi. Klaim
// wajib jujur: tombol daftar, pesan paket MCU, dan formulir hasil lab hanya menyusun pesan WhatsApp (data tidak disimpan
// di website); hasil lab tidak ditampilkan di website; tidak ada rekam medis, pembayaran online, konsultasi video, atau
// antrean real-time; jadwal dan harga adalah teks dari CMS; nama alat ditulis umum tanpa merek. Demo: SpecialistPlus
// Medical Center, Medan (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website klinik spesialis untuk pusat layanan yang memadukan poli spesialis, laboratorium, dan radiologi. Hero-nya berupa foto ruang pemeriksaan dengan panel konsol: pengunjung memilih spesialis lalu langsung melihat jumlah dokter, hari praktik, dan jadwal terdekat, sebelum menelusuri paket medical check-up dan cara meminta hasil lab.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pasien biasanya mencari jadwal dokter, harga paket, dan lama hasil pemeriksaan sebelum datang. Tampilannya rapi seperti lembar data: tabel, angka, dan baris keterangan, bukan paragraf panjang.',
    items: [
      'Klinik utama atau pusat spesialis yang butuh website klinik spesialis dengan jadwal dokter per poli.',
      'Laboratorium klinik yang ingin website laboratorium klinik dengan alur permintaan hasil yang jelas.',
      'Klinik medical check-up yang perlu membandingkan beberapa paket dalam satu tabel.',
      'Pusat diagnostik atau radiologi yang ingin memperkenalkan alat dan perkiraan waktu hasil.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah navy yang tetap terlihat saat digulir, berisi logo atau simbol bawaan, tautan ke setiap bagian, dan tombol Daftar Konsultasi.',
    },
    {
      name: 'Hero konsol data',
      text: 'Foto latar selebar layar, judul, dua tombol, dan panel konsol: pilih spesialis untuk melihat jumlah dokter, hari praktik, dan jadwal terdekat, plus tiga angka ringkas.',
    },
    {
      name: 'Spesialis & jadwal dokter',
      text: 'Hingga 8 klinik dalam bentuk tab, masing-masing dengan foto, kondisi yang ditangani, tindakan, dan tabel jadwal hingga 24 dokter beserta tombol daftar.',
    },
    { name: 'Paket medical check-up', text: 'Tabel perbandingan hingga 4 paket dan 16 pemeriksaan dengan tanda centang, harga, dan tombol pesan; di HP tampil sebagai kartu.' },
    {
      name: 'Hasil lab online',
      text: 'Pita berwarna berisi tiga langkah, catatan privasi, formulir permintaan hasil lab, dan tautan opsional ke portal pasien milik klinik.',
    },
    { name: 'Teknologi alat', text: 'Hingga 6 kartu alat diagnostik dengan foto, kode, satu kalimat, dan baris spesifikasi seperti durasi dan lokasi.' },
    { name: 'Waktu hasil', text: 'Batang perkiraan waktu hasil hingga 12 pemeriksaan, dikelompokkan, misalnya laboratorium dalam jam dan radiologi dalam hari.' },
    { name: 'Testimoni pasien', text: 'Hingga 6 kutipan dengan nama depan, kota, dan layanan yang dipakai, tanpa foto.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, misalnya soal rujukan dan persiapan pemeriksaan.' },
    {
      name: 'Kontak & lokasi',
      text: 'Alamat, telepon, WhatsApp, email, jam layanan per unit, catatan darurat dengan tombol telepon 119, foto gedung, dan peta Google Maps.',
    },
    { name: 'Footer', text: 'Deskripsi singkat, menu, daftar klinik, kontak, media sosial, dan catatan bahwa informasi di website bukan pengganti konsultasi dokter.' },
  ],
  partsNote:
    'Tombol daftar dokter, pesan paket MCU, dan formulir hasil lab hanya menyusun pesan WhatsApp; data tidak disimpan di website. Hasil lab tidak ditampilkan di website ini. Template ini tidak memiliki rekam medis, pembayaran online, konsultasi video, maupun antrean real-time; jadwal dan harga yang tampil adalah teks yang Anda perbarui sendiri lewat CMS.',
  cms: [
    'Nama klinik, tagline, logo, dan satu warna aksen; warna navy header, pita hasil lab, dan footer ikut menyesuaikan.',
    'Semua judul, deskripsi, teks tombol, kode label bagian, dan tujuan tautan.',
    'Daftar klinik spesialis, dokter beserta hari, jam, dan ruangnya, serta jadwal terdekat yang tampil di konsol hero.',
    'Paket MCU, harga, dan pemeriksaan yang termasuk di setiap paket.',
    'Langkah permintaan hasil lab, catatan privasi, dan alamat portal pasien bila klinik Anda punya.',
    'Kartu alat, waktu hasil per pemeriksaan, testimoni, dan tanya jawab: tambah, ubah urutan, atau hapus.',
    'Alamat, telepon, WhatsApp, email, jam layanan per unit, catatan darurat, foto gedung, dan link Google Maps.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan isian formulir mengikuti desain template. Tulis nama alat secara umum, dan klaim izin atau akreditasi hanya sesuai dokumen klinik Anda.',
  demo: [
    'Demo {nama} memakai klinik fiktif SpecialistPlus Medical Center di Medan dengan enam klinik spesialis: jantung, ortopedi, onkologi, saraf, paru, dan penyakit dalam. Di sana terlihat bagaimana jadwal dokter, empat paket medical check-up, lima alat diagnostik, dan perkiraan waktu hasil disusun untuk pasien yang baru pertama kali datang.',
    'Nama dokter, jadwal, harga, testimoni, dan alamat di demo adalah contoh. Ganti semuanya dengan data asli klinik Anda sebelum alamat website dibagikan.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman agar website pusat diagnostik Anda cepat aktif. Portal hasil lab dengan login pasien, pendaftaran yang tersambung ke sistem antrean, rekam medis, pembayaran online, atau konsultasi video termasuk website atau aplikasi custom. Kami merancangnya sesuai alur kerja klinik Anda, dengan biaya yang kami sampaikan setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah pasien bisa melihat hasil lab di website {nama}?',
      answer:
        'Tidak. Hasil lab tidak ditampilkan di website. Formulir hanya menyusun pesan WhatsApp berisi nomor registrasi, nama, dan tanggal lahir, lalu admin Anda yang mengirim hasilnya. Bila klinik sudah punya portal pasien, alamatnya bisa dipasang sebagai tautan.',
    },
    {
      question: 'Bagaimana cara kerja tombol daftar di jadwal dokter?',
      answer:
        'Tombol menyusun pesan WhatsApp berisi nama dokter, klinik, dan jadwalnya. Admin Anda yang mengonfirmasi slot. Data tidak disimpan di website dan tidak ada sistem antrean real-time.',
    },
    {
      question: 'Apakah jadwal dokter dan harga paket MCU diperbarui otomatis?',
      answer: 'Tidak. Jadwal dan harga adalah teks yang Anda ubah sendiri lewat CMS kapan saja, jadi samakan dengan yang berlaku di klinik.',
    },
    {
      question: 'Apakah {nama} cocok untuk klinik dengan spesialis selain jantung, ortopedi, dan onkologi?',
      answer:
        'Cocok. Nama tab, kode, kondisi, dan tindakan setiap klinik bisa Anda isi sendiri, misalnya anak, kandungan, mata, atau THT. Ikon dipilih otomatis dari nama klinik.',
    },
    {
      question: 'Bisakah warna website disamakan dengan logo klinik?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, tab aktif, tanda centang, dan warna navy ikut menyesuaikan, dan warna teks dipilih otomatis agar tetap terbaca.',
    },
  ],
  imageAlts: {
    'specialistplus-preview.webp':
      'Tampilan beranda template website klinik spesialis {nama} di desktop dan HP: foto ruang pemeriksaan dengan panel konsol pilih spesialis',
    'specialistplus-1.webp': 'Bagian spesialis template {nama}: tab klinik dan tabel jadwal dokter dengan tombol daftar',
    'specialistplus-2.webp': 'Tabel perbandingan paket medical check-up di template {nama} dengan harga dan tanda centang',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
