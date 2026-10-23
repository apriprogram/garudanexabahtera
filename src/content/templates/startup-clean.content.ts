// Isi halaman /template/startup-clean. Sumber fakta: src/templates/startup-clean (StartupClean.tsx, Hero.tsx,
// Features.tsx, sections.tsx, chrome.tsx), skema bersama src/templates/shared/schema.ts (clients, brandMark) dan
// formulir src/templates/shared/ContactForm.tsx (tanpa server: membuka WhatsApp/email). Demo: Kirana Labs (fiktif).
import type { TemplatePageContent } from './page.types';

export const content: TemplatePageContent = {
  lead:
    '{nama} adalah template website company profile yang modern dan lapang untuk UMKM, startup, studio kreatif, dan bisnis digital. Judulnya terpusat di atas panel foto lebar, layanan atau fitur tersusun dalam kartu bento, dan pengunjung bisa langsung mengirim pesan lewat formulir yang membuka WhatsApp Anda.',
  suitableFor: {
    intro:
      'Template ini pas untuk usaha yang produk atau layanannya perlu dijelaskan singkat dan jelas, terutama bila kebanyakan pengunjung datang dari HP setelah melihat iklan, unggahan media sosial, atau tautan di bio Instagram.',
    items: [
      'UMKM yang ingin terlihat lebih profesional daripada sekadar akun media sosial atau etalase di marketplace.',
      'Startup dan produk aplikasi yang butuh halaman perkenalan berisi fitur, angka dampak, dan ajakan mencoba.',
      'Studio kreatif, agensi kecil, dan penyedia jasa digital yang ingin menampilkan galeri karya.',
      'Usaha rintisan dengan anggaran terbatas yang ingin segera punya domain dan website sendiri.',
    ],
  },
  parts: [
    { name: 'Menu atas', text: 'Header berbentuk pil yang melayang, berisi logo atau simbol bawaan dengan nama usaha, tautan bagian, dan tombol utama.' },
    {
      name: 'Hero (bagian pembuka)',
      text: 'Label kecil, judul terpusat dengan kata yang disorot, deskripsi, dua tombol, dan panel foto lebar di bawahnya.',
    },
    { name: 'Logo klien & mitra', text: 'Strip logo pelanggan atau mitra, hingga 12 logo; tanpa logo, nama klien tampil sebagai teks.' },
    { name: 'Layanan', text: 'Hingga 9 layanan atau fitur dalam kartu bento, masing-masing dengan gambar atau ikon.' },
    { name: 'Cerita (Tentang kami)', text: 'Kisah usaha Anda dengan foto, angka sorotan, dan hingga 6 poin unggulan.' },
    { name: 'Dampak (Keunggulan & angka)', text: 'Hingga 4 angka yang bergerak naik saat terlihat, ditambah hingga 6 keunggulan.' },
    { name: 'Galeri', text: 'Hingga 12 foto dengan keterangan, misalnya suasana toko, tim, atau produk.' },
    { name: 'Testimoni', text: 'Hingga 9 kutipan pelanggan dengan nama, keterangan, dan foto bila ada.' },
    { name: 'Ajakan (CTA)', text: 'Blok ajakan dengan tombol ke WhatsApp atau tautan pilihan Anda.' },
    {
      name: 'Kontak',
      text: 'Kartu alamat, telepon, email, WhatsApp, dan jam operasional, peta Google Maps, serta formulir pesan.',
    },
    { name: 'Footer', text: 'Deskripsi singkat, teks hak cipta, dan tautan media sosial.' },
  ],
  partsNote:
    'Formulir kontak tidak menyimpan pesan di server. Pesan pengunjung disusun lalu dibuka di WhatsApp dengan nomor yang Anda isi, atau di aplikasi email bila nomor WhatsApp kosong, jadi pesannya sampai langsung ke Anda.',
  cms: [
    'Nama usaha, tagline, logo, dan warna aksen; tanpa logo, template memakai simbol bawaan dan nama usaha.',
    'Teks hero, kata yang disorot, deskripsi, serta dua tombol beserta tautannya.',
    'Kartu layanan atau fitur, angka dampak, keunggulan, dan logo pelanggan.',
    'Foto hero, foto cerita, dan galeri, termasuk keterangan tiap foto. Gambar diperkecil otomatis saat diunggah.',
    'Nomor WhatsApp dan pesan awalnya, email, telepon, alamat, jam operasional, dan link Google Maps.',
    'Tautan Instagram, Facebook, LinkedIn, YouTube, dan TikTok; bagian yang tidak dipakai bisa disembunyikan.',
  ],
  cmsNote:
    '{nama} adalah website profil satu halaman, bukan toko online: tidak ada keranjang belanja, stok, atau pembayaran di dalam website.',
  demo: [
    'Demo {nama} memakai Kirana Labs, merek fiktif aplikasi kasir dan stok untuk UMKM. Contohnya menunjukkan cara menyusun fitur produk (kasir di HP, stok, pembayaran QRIS, laporan otomatis), cerita pendiri, angka dampak, dan testimoni pemilik toko dalam satu alur yang ringan dibaca dari HP.',
    'Angka seperti jumlah pengguna dan rating di demo hanyalah contoh. Di website Anda, tulis angka yang benar-benar bisa Anda buktikan, atau sembunyikan bagiannya sampai datanya ada.',
  ],
  custom:
    'Butuh lebih dari website profil? Toko online dengan keranjang dan pembayaran, area login pelanggan, halaman produk yang banyak, atau integrasi dengan aplikasi kasir yang sudah Anda pakai dikerjakan lewat jasa pembuatan website custom. Kami membahas kebutuhannya dalam konsultasi gratis, lalu mengirim penawaran berisi cakupan dan jadwal pengerjaan.',
  faq: [
    {
      question: 'Apa beda {nama} dengan template company profile lain di katalog?',
      answer:
        '{nama} memakai susunan isi company profile yang umum (layanan, cerita, keunggulan, galeri, testimoni, kontak), tetapi tampil lebih lapang dengan header pil melayang, kartu fitur bento, dan formulir kontak ke WhatsApp. Gaya ini cocok untuk UMKM dan produk digital.',
    },
    {
      question: 'Apakah pesan dari formulir kontak tersimpan di website?',
      answer:
        'Tidak. Formulir menyusun pesan pengunjung lalu membukanya di WhatsApp ke nomor yang Anda isi, atau di aplikasi email bila nomor WhatsApp kosong. Pesan sampai langsung ke Anda tanpa perlu membuka dasbor.',
    },
    {
      question: 'Bisakah dipakai untuk menjual produk secara online?',
      answer:
        '{nama} adalah website profil, jadi tidak ada keranjang, stok, atau pembayaran di dalamnya. Anda bisa mengarahkan tombol ke WhatsApp, marketplace, atau toko online yang sudah ada. Toko online sendiri bisa kami buat lewat jasa custom.',
    },
    {
      question: 'Apakah tampilannya rapi di HP?',
      answer:
        'Ya. Tata letaknya menyesuaikan lebar layar, dari HP sampai desktop. Di halaman demo, pada layar laptop atau desktop Anda bisa beralih ke tampilan HP untuk mengeceknya.',
    },
    {
      question: 'Bagaimana jika saya belum punya foto produk yang bagus?',
      answer:
        'Foto dari HP pun bisa dipakai; saat diunggah lewat CMS, gambar diperkecil otomatis agar website tetap ringan. Foto contoh bawaan sebaiknya segera diganti dengan foto usaha Anda sendiri supaya pengunjung melihat bisnis yang sebenarnya.',
    },
  ],
  imageAlts: {
    'startup-clean-preview.webp': 'Tampilan beranda template website UMKM dan startup {nama} di desktop dan HP',
    'startup-clean-1.webp': 'Kartu fitur bento template {nama}: kasir, stok, laporan, dan pembayaran QRIS',
    'startup-clean-2.webp': 'Bagian cerita usaha template {nama} dengan foto pemilik dan poin unggulan',
  },
  guides: ['biaya-website-company-profile', 'template-vs-jasa-website-custom'],
};
