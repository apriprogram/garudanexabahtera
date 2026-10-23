// Isi halaman /template/corporate-nexa. Sumber fakta: src/templates/corporate-nexa (CorporateNexa.tsx, Chrome.tsx,
// Contact.tsx) dan skema bersama src/templates/shared/schema.ts (companyProfileSections + clients, aboutSecondImage,
// ctaImage, brandMark). Demo: PT Samudra Karya Persada (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website company profile untuk perusahaan jasa, konsultan, kontraktor, dan distributor yang ingin memperkenalkan bisnisnya secara rapi dan resmi. Gayanya editorial: foto besar, garis tipis tanpa bayangan, dan satu warna aksen yang bisa Anda samakan dengan warna logo perusahaan.',
  suitableFor: {
    intro:
      'Pilih {nama} bila calon klien biasanya memeriksa profil perusahaan Anda sebelum meminta penawaran, mengundang rapat, atau memasukkan Anda ke daftar vendor. Halaman ini menjawab pertanyaan dasar mereka: siapa Anda, apa layanannya, proyek apa yang pernah dikerjakan, dan ke mana harus menghubungi.',
    items: [
      'Kontraktor, konsultan teknik, dan perusahaan konstruksi yang ingin memamerkan galeri proyek.',
      'Perusahaan jasa B2B seperti logistik, distributor, pengadaan barang, atau perawatan gedung.',
      'Kantor konsultan hukum, pajak, atau manajemen yang butuh profil resmi untuk dikirim ke calon klien.',
      'Perusahaan yang selama ini hanya punya profil PDF atau akun media sosial dan kini butuh website dengan domain sendiri.',
    ],
  },
  parts: [
    { name: 'Menu atas', text: 'Logo atau simbol bawaan beserta nama perusahaan, tautan ke setiap bagian, dan tombol kontak.' },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Judul dengan kata yang disorot warna aksen, deskripsi singkat, dua tombol, dan foto kantor, tim, atau proyek.',
    },
    { name: 'Logo klien & mitra', text: 'Strip logo "dipercaya oleh" berwarna abu-abu agar seragam, hingga 12 logo.' },
    { name: 'Tentang kami', text: 'Cerita perusahaan, dua foto, angka sorotan seperti lama pengalaman, dan hingga 6 poin unggulan.' },
    { name: 'Layanan', text: 'Hingga 9 layanan, masing-masing dengan nama, deskripsi singkat, dan gambar atau ikon.' },
    { name: 'Keunggulan & angka', text: 'Hingga 4 angka pencapaian dan 6 alasan klien memilih perusahaan Anda.' },
    { name: 'Galeri', text: 'Hingga 12 foto proyek dengan keterangan, misalnya jenis pekerjaan dan kotanya.' },
    { name: 'Testimoni', text: 'Hingga 9 kutipan klien dengan nama, jabatan atau perusahaan, dan foto bila ada.' },
    { name: 'Ajakan (CTA)', text: 'Blok ajakan berwarna aksen, bisa dengan foto latar yang diberi lapisan gelap agar teks tetap terbaca.' },
    {
      name: 'Kontak',
      text: 'Alamat, telepon, email, WhatsApp, jam operasional, dan peta Google Maps yang dibuat dari alamat atau link Maps Anda.',
    },
    { name: 'Footer', text: 'Deskripsi singkat, teks hak cipta, dan tautan Instagram, Facebook, LinkedIn, YouTube, serta TikTok.' },
  ],
  partsNote:
    'Semua bagian berada di satu halaman panjang; tautan di menu atas membawa pengunjung langsung ke bagian yang dipilih. Bila nomor WhatsApp diisi, tombol WhatsApp melayang tampil di setiap layar.',
  cms: [
    'Nama perusahaan, tagline, logo, dan warna aksen untuk tombol, tautan, serta sorotan judul.',
    'Semua judul, deskripsi, teks tombol, dan tujuan tautan tombol.',
    'Foto hero, dua foto Tentang kami, foto latar ajakan, dan foto galeri beserta keterangannya.',
    'Daftar layanan, keunggulan, angka pencapaian, logo klien, dan testimoni: tambah, pindahkan urutannya, atau hapus.',
    'Alamat, telepon, email, nomor WhatsApp, pesan awal WhatsApp, jam operasional, dan link Google Maps.',
    'Menampilkan atau menyembunyikan bagian yang belum Anda butuhkan, misalnya Testimoni atau Logo klien.',
  ],
  cmsNote:
    'Tata letak dan urutan bagian mengikuti desain template. Halaman tambahan, formulir yang menyimpan data, atau fitur baru termasuk pekerjaan custom.',
  demo: [
    'Demo {nama} memakai perusahaan fiktif, PT Samudra Karya Persada, sebuah konsultan dan kontraktor bangunan komersial. Di sana terlihat bagaimana layanan dari perancangan sampai serah terima, galeri gedung dan interior kantor, angka pencapaian, serta testimoni klien disusun dalam satu alur yang mudah diikuti calon klien.',
    'Website Anda dimulai dengan isi contoh yang sama seperti demo. Ganti nama, angka, logo klien, dan testimoni dengan data asli perusahaan Anda sebelum alamatnya dibagikan, dan sembunyikan bagian yang belum punya isi.',
  ],
  custom:
    '{nama} sengaja dibuat sederhana supaya cepat aktif. Bila perusahaan Anda butuh halaman tambahan seperti karier atau blog, formulir permintaan penawaran yang tersimpan ke database, katalog produk dengan pencarian, versi dua bahasa, atau integrasi dengan sistem internal, semua itu termasuk website custom. Kami merancangnya dari awal sesuai alur kerja perusahaan Anda, dan biayanya kami sampaikan lewat penawaran setelah konsultasi gratis.',
  faq: [
    {
      question: 'Apakah {nama} hanya untuk perusahaan konstruksi?',
      answer:
        'Tidak. Demo memang memakai contoh kontraktor, tetapi bagian-bagiannya umum: tentang perusahaan, layanan, keunggulan, galeri, testimoni, dan kontak. Perusahaan jasa, konsultan, distributor, atau kantor profesional bisa memakainya dengan mengganti teks dan foto.',
    },
    {
      question: 'Bisakah saya menambah halaman baru, misalnya karier atau blog?',
      answer:
        '{nama} berupa satu halaman panjang dengan bagian tetap. Anda bisa mengubah isi dan menyembunyikan bagian, tetapi halaman baru seperti karier, blog, atau katalog produk termasuk pekerjaan custom. Ceritakan kebutuhannya lewat Pesan Custom.',
    },
    {
      question: 'Bagaimana kalau perusahaan saya belum punya testimoni atau logo klien?',
      answer:
        'Sembunyikan bagian Testimoni dan Logo klien lewat CMS, lalu tampilkan lagi setelah Anda punya izin dari klien. Jangan biarkan nama dan kutipan contoh dari demo tetap tampil di website Anda.',
    },
    {
      question: 'Apakah warna website bisa disamakan dengan logo perusahaan?',
      answer:
        'Bisa. Pilih warna aksen di bagian Identitas & warna; tombol, tautan, dan sorotan judul ikut berubah, dan warna teks di atasnya disesuaikan otomatis agar tetap terbaca.',
    },
    {
      question: 'Apakah peta lokasi kantor bisa ditampilkan?',
      answer:
        'Bisa. Isi alamat di bagian Kontak atau tempel link lokasi dari Google Maps. Bila link dikosongkan, peta dibuat otomatis dari alamat yang Anda tulis.',
    },
  ],
  imageAlts: {
    'corporate-nexa-preview.webp': 'Tampilan beranda template website company profile {nama} di desktop dan HP',
    'corporate-nexa-1.webp': 'Bagian Tentang kami template {nama}: foto tim proyek, angka pengalaman, dan poin unggulan',
    'corporate-nexa-2.webp': 'Galeri proyek template {nama} berisi foto gedung dan interior kantor beserta keterangannya',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
