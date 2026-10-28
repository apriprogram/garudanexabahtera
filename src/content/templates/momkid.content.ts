// Isi halaman /template/momkid. Sumber fakta: src/templates/momkid (schema.ts, MomKid.tsx, Header.tsx, Hero.tsx,
// Journey.tsx, Packages.tsx, Immunization.tsx, Pediatrics.tsx, Lactation.tsx, Tour.tsx, Articles.tsx,
// Testimonials.tsx, Closing.tsx, Contact.tsx, VisitForm.tsx, Footer.tsx). Kata kunci: "template website rumah sakit ibu
// dan anak" di paragraf pembuka; "website RSIA", "website klinik bersalin", dan "website rumah sakit ibu & anak" di isi.
// Klaim wajib jujur: formulir pendaftaran hanya menyusun pesan WhatsApp (data tidak disimpan di website), tidak ada rekam
// medis, pembayaran online, atau konsultasi video; jadwal imunisasi hanya ringkasan (ikuti anjuran dokter anak); tanpa
// klaim akreditasi. Demo: RSIA MomKid, Tangerang Selatan (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead: '{nama} adalah template website rumah sakit ibu dan anak bernuansa pastel hangat untuk RSIA, klinik bersalin, dan klinik anak. Hero-nya memakai foto ibu dan bayi sebagai latar, lalu halaman menuntun calon pasien dari tahap kehamilan, paket persalinan, dan jadwal imunisasi sampai formulir pendaftaran kunjungan.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon pasien biasanya membuka website RSIA Anda sebelum memilih tempat kontrol kehamilan atau bersalin. Mereka ingin tahu layanan apa saja yang ada, kisaran biaya persalinan, jadwal dokter anak, dan cara mendaftar tanpa harus menelepon dulu.',
    items: [
      'Rumah sakit ibu dan anak (RSIA) yang ingin website rumah sakit ibu & anak yang ramah.',
      'Klinik bersalin dan klinik pratama yang butuh website klinik bersalin sederhana.',
      'Klinik anak dan praktik bersama dokter anak dengan jadwal praktik dan imunisasi.',
      'Klinik laktasi atau konselor menyusui yang ingin memperkenalkan layanannya.',
      'Rumah sakit umum yang ingin halaman khusus layanan ibu dan anak.',
    ],
  },
  parts: [
    {
      name: 'Menu atas',
      text: 'Bilah krem yang tetap terlihat saat digulir, berisi logo atau simbol buaian bawaan, kapsul menu ke bagian utama, dan tombol Daftar Kunjungan.',
    },
    {
      name: 'Hero foto latar',
      text: 'Foto ibu dan bayi selebar layar dengan lapisan peach, tepi bawah bergelombang, judul, deskripsi, dua tombol, catatan kecil seperti jam IGD, dan hingga 3 chip pastel yang mengapung di atas foto.',
    },
    {
      name: 'Perjalanan layanan',
      text: 'Hingga 4 tahap dalam bentuk tab, misalnya kehamilan, persalinan, dan tumbuh kembang, masing-masing dengan foto, penjelasan singkat, chip layanan, dan satu tombol.',
    },
    {
      name: 'Paket persalinan',
      text: 'Hingga 4 kartu paket dengan harga mulai untuk dua pilihan kamar, lama rawat, isi paket, label sorotan, dan tombol tanya paket lewat WhatsApp.',
    },
    {
      name: 'Jadwal imunisasi',
      text: 'Garis waktu hingga 12 titik umur dengan chip vaksin. Pengunjung memilih umur si kecil untuk melihat jadwal berikutnya, lalu menjadwalkan lewat WhatsApp.',
    },
    { name: 'Dokter anak', text: 'Hingga 8 kartu dokter dengan inisial, fokus layanan, strip hari praktik, jam praktik, dan tombol buat janji.' },
    { name: 'Klinik laktasi', text: 'Foto berbentuk lengkung lembut, hingga 6 layanan dengan ilustrasi, hingga 4 baris jadwal klinik, dan tombol daftar.' },
    { name: 'Tur kamar bersalin', text: 'Hingga 8 foto ruangan yang bisa digeser, jadwal tur, dan tombol jadwalkan tur lewat WhatsApp.' },
    { name: 'Artikel parenting', text: 'Hingga 6 kartu artikel dengan kategori, waktu baca, ringkasan, dan tautan ke blog atau media sosial Anda.' },
    { name: 'Testimoni', text: 'Hingga 6 cerita orang tua dengan nama, kota, layanan, dan foto bila sudah ada izinnya.' },
    { name: 'Tanya jawab', text: 'Hingga 8 pertanyaan yang bisa dibuka dan ditutup, termasuk kapan harus langsung ke IGD.' },
    { name: 'Ajakan', text: 'Pita peach dengan ilustrasi hati dan bintang, judul, dan dua tombol menuju formulir atau WhatsApp.' },
    {
      name: 'Kontak & pendaftaran',
      text: 'Alamat, telepon, WhatsApp, email, jam layanan, kotak keadaan darurat, peta Google Maps, dan formulir pendaftaran kunjungan.',
    },
    { name: 'Footer', text: 'Pita mint berisi deskripsi, menu, kontak, tautan media sosial, dan catatan kaki.' },
  ],
  partsNote:
    'Formulir pendaftaran menanyakan layanan, usia kehamilan atau umur anak, tanggal, waktu, dan cara bayar, lalu hanya menyusun pesan WhatsApp untuk admin; data tidak disimpan di website. Template ini tidak memiliki rekam medis, antrean online, pembayaran online, maupun konsultasi video. Untuk kondisi darurat, halaman selalu mengarahkan pasien ke IGD atau telepon 119.',
  cms: [
    'Nama rumah sakit, tagline, logo, dan satu warna aksen.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautan.',
    'Foto hero, foto tiap tahap layanan, foto klinik laktasi, foto tur ruangan, dan foto artikel.',
    'Tahap layanan, paket persalinan dan harganya, jadwal imunisasi, serta jadwal dokter anak.',
    'Layanan dan jadwal klinik laktasi, artikel, testimoni, dan tanya jawab: tambah, ubah urutan, atau hapus.',
    'Alamat, telepon, nomor WhatsApp, email, jam layanan, nomor IGD, link Google Maps, dan pilihan layanan di formulir.',
    'Menampilkan atau menyembunyikan setiap bagian, misalnya Paket persalinan bila harga belum siap dipublikasikan.',
  ],
  cmsNote:
    'Tata letak, urutan bagian, dan isian formulir mengikuti desain template. Jadwal imunisasi di website hanyalah ringkasan, ikuti anjuran dokter anak; isinya Anda sesuaikan sendiri dengan tim medis Anda.',
  demo: [
    'Demo {nama} memakai rumah sakit fiktif RSIA MomKid di Tangerang Selatan. Di sana terlihat bagaimana tahap layanan, tiga paket persalinan, jadwal imunisasi, empat dokter anak, dan tur kamar bersalin disusun untuk calon orang tua.',
    'Nama rumah sakit, dokter, orang tua di testimoni, harga, dan alamat di demo adalah contoh fiktif. Ganti semuanya dengan data asli sebelum website dibagikan, dan tulis klaim akreditasi atau izin hanya sesuai dokumen yang dimiliki rumah sakit Anda.',
  ],
  custom:
    '{nama} dibuat sebagai satu halaman agar cepat aktif. Pendaftaran yang tersimpan di sistem, antrean poliklinik, akun pasien, hasil laboratorium online, pembayaran, atau integrasi SIMRS termasuk website custom; biayanya kami sampaikan setelah konsultasi gratis.',
  mobileLink: true,
  faq: [
    {
      question: 'Apakah {nama} cocok untuk klinik bersalin kecil?',
      answer:
        'Cocok. Semua bagian bisa disembunyikan lewat CMS, jadi klinik bersalin bisa memakai tahap layanan, paket persalinan, dan formulir saja, lalu menambah bagian lain saat layanannya ada.',
    },
    {
      question: 'Bagaimana cara kerja formulir pendaftaran?',
      answer:
        'Pengunjung memilih layanan, tanggal, waktu, dan cara bayar. Formulir lalu menyusun pesan WhatsApp ke nomor admin Anda; data tidak disimpan di website, sehingga konfirmasi jadwal tetap dilakukan admin lewat WhatsApp.',
    },
    {
      question: 'Apakah jadwal imunisasi di template ini bisa diubah?',
      answer:
        'Bisa. Umur dan nama vaksin di garis waktu adalah teks yang Anda ubah sendiri lewat CMS. Jadwal itu tampil sebagai ringkasan dengan catatan untuk mengikuti anjuran dokter anak, bukan sebagai saran medis.',
    },
    {
      question: 'Apakah pasien bisa melihat rekam medis atau membayar di website?',
      answer:
        'Tidak. {nama} adalah website informasi dan pendaftaran lewat WhatsApp: tidak ada rekam medis, pembayaran online, maupun konsultasi video. Fitur seperti itu bisa dibuat sebagai pekerjaan custom.',
    },
    {
      question: 'Bisakah warnanya disamakan dengan logo rumah sakit?',
      answer:
        'Bisa. Ganti warna aksen di bagian Identitas & warna; tombol, kartu pastel, dan pita ajakan ikut menyesuaikan, dan warna teks dipilih otomatis agar tetap mudah dibaca.',
    },
  ],
  imageAlts: {
    'momkid-preview.webp': 'Tampilan beranda template website rumah sakit ibu dan anak {nama} di desktop dan HP: foto ibu dan bayi dengan lapisan peach dan chip pastel',
    'momkid-1.webp': 'Bagian paket persalinan template {nama}: kartu pastel Normal, Caesar, dan Premium dengan pilihan kamar',
    'momkid-2.webp': 'Pita mint jadwal imunisasi template {nama}: garis waktu umur si kecil dengan chip vaksin',
  },
  guides: ['template-vs-jasa-website-custom', 'biaya-website-company-profile'],
};
