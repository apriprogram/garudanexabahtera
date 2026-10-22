// STUB fondasi (2026-10-22): konten bawaan Arena Club — Lintang Padel & Tenis Club (klub FIKTIF, Jakarta Selatan).
// Sudah memakai kunci Company Profile yang dibaca stub; engineer Arena Club melengkapinya (foto demo dari
// ./photos.ts, section `pricing`/`team`/`events`, field baru) sesuai docs/platform/TEMPLATE-BRIEFS-2026-10.md §1.
// brand.logo sengaja kosong: header memakai simbol bawaan template + nama klub.
import type { SiteContent } from '../types';

/** Biru langit dari referensi (kartu membership). Teks di atas aksen otomatis gelap (--tpl-on-accent). */
export const ARENA_CLUB_ACCENT = '#2FB2FF';

export const arenaClubContent: SiteContent = {
  brand: {
    company_name: 'Lintang Padel & Tenis Club',
    tagline: 'Main lebih seru, latihan lebih terarah',
    logo: '',
    accent_color: ARENA_CLUB_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Klub padel & tenis di Jakarta Selatan',
    title: 'Temukan juara dalam dirimu, mulai dari lapangan ini',
    highlight: 'mulai dari lapangan ini',
    subtitle:
      'Lapangan berstandar turnamen, pelatih bersertifikat, dan komunitas pemain yang hangat. Pesan lapangan atau ikut kelas pertama Anda hari ini.',
    primary_label: 'Pesan Lapangan',
    primary_url: '',
    secondary_label: 'Lihat Membership',
    secondary_url: '',
    image: '',
  },
  clients: {
    enabled: true,
    title: 'Didukung mitra dan sponsor klub',
    items: [
      { name: 'Raket Nusantara', logo: '' },
      { name: 'Segar Isotonik', logo: '' },
      { name: 'Bumi Sportswear', logo: '' },
      { name: 'Kopi Pagi Lapangan', logo: '' },
      { name: 'Fisio Gerak', logo: '' },
    ],
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang Lintang',
    title: 'Di Lintang, kami tidak sekadar bermain. Sejak 2021, klub ini jadi rumah bagi pemain pemula hingga atlet turnamen.',
    body:
      'Enam lapangan padel dan dua lapangan tenis kami memakai permukaan berstandar turnamen, pencahayaan malam yang merata, dan area tunggu yang nyaman.\n\nSetiap member mendapat program latihan sesuai level, jadwal main yang fleksibel, dan kesempatan bertanding di liga internal setiap bulan.',
    image: '',
    badge_value: '24',
    badge_label: 'Pelatih bersertifikat',
    points: [
      { text: 'Lapangan berstandar turnamen' },
      { text: 'Kelas untuk semua level' },
      { text: 'Pemesanan cepat lewat WhatsApp' },
      { text: 'Liga internal setiap bulan' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Program',
    title: 'Program latihan, sewa lapangan, dan pengalaman bermain dalam satu klub',
    subtitle: 'Dari servis pertama sampai poin kemenangan, ada program yang pas untuk Anda.',
    items: [
      { title: 'Kelas Pemula', description: 'Belajar teknik dasar padel dan tenis dalam kelompok kecil, maksimal empat orang per pelatih.', image: '' },
      { title: 'Latihan Privat', description: 'Sesi satu lawan satu dengan pelatih untuk memperbaiki teknik dan strategi bermain.', image: '' },
      { title: 'Sewa Lapangan per Jam', description: 'Pesan lapangan padel atau tenis mulai pukul 06.00 hingga 23.00 setiap hari.', image: '' },
      { title: 'Akademi Junior', description: 'Program terstruktur untuk anak usia 7–15 tahun, lengkap dengan evaluasi berkala.', image: '' },
      { title: 'Turnamen & Liga', description: 'Liga internal bulanan dan turnamen terbuka untuk mengukur perkembangan permainan.', image: '' },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: 'Dalam angka',
    title: 'Beberapa fakta tentang klub kami',
    subtitle: 'Angka yang terus bertambah bersama komunitas pemain Lintang.',
    stats: [
      { value: '12.000+', label: 'Jam bermain per tahun' },
      { value: '89%', label: 'Member yang memperpanjang' },
      { value: '1.200+', label: 'Member aktif' },
      { value: '48', label: 'Turnamen per tahun' },
    ],
    items: [
      { title: 'Pelatih bersertifikat', description: 'Seluruh pelatih kami bersertifikat dan rutin mengikuti pelatihan ulang.' },
      { title: 'Jadwal fleksibel', description: 'Kelas pagi, sore, dan malam, termasuk akhir pekan.' },
      { title: 'Fasilitas lengkap', description: 'Ruang ganti, loker, kafe sehat, dan area parkir luas.' },
      { title: 'Komunitas hangat', description: 'Main bareng, sparring, dan acara sosial setiap pekan.' },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri',
    title: 'Suasana di Lintang',
    subtitle: 'Lapangan, kelas, dan momen turnamen bersama member.',
    items: [
      { image: '', caption: 'Lapangan padel utama di sore hari' },
      { image: '', caption: 'Kelas pemula akhir pekan' },
      { image: '', caption: 'Final liga internal bulan lalu' },
      { image: '', caption: 'Akademi junior berlatih footwork' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Kata member',
    title: 'Mereka berkembang bersama Lintang',
    items: [
      {
        name: 'Rizky Pratama',
        role: 'Member sejak 2022',
        quote: 'Dalam tiga bulan latihan privat, servis dan bandeja saya jauh lebih konsisten. Pelatihnya sabar dan detail.',
        photo: '',
      },
      {
        name: 'Nadia Putri',
        role: 'Peserta kelas pemula',
        quote: 'Awalnya cuma ikut teman, sekarang main tiga kali seminggu. Komunitasnya ramah untuk pemula.',
        photo: '',
      },
      {
        name: 'Hendra Wijaya',
        role: 'Orang tua peserta akademi junior',
        quote: 'Anak saya makin disiplin dan percaya diri. Laporan perkembangannya juga rutin dikirim.',
        photo: '',
      },
    ],
  },
  cta: {
    enabled: true,
    title: 'Siap turun ke lapangan?',
    subtitle: 'Pesan lapangan atau jadwalkan kelas percobaan gratis. Tim kami membalas lewat WhatsApp dalam hitungan menit.',
    button_label: 'Pesan Sekarang',
    button_url: '',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Kunjungi klub kami',
    subtitle: 'Datang langsung untuk tur lapangan, atau tanyakan jadwal kosong lewat WhatsApp.',
    address: 'Jl. Bentang Raya No. 18, Cilandak, Jakarta Selatan 12430',
    email: 'halo@lintangclub.id',
    phone: '(021) 555-0418',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo Lintang Club, saya ingin pesan lapangan.',
    hours: 'Setiap hari, 06.00–23.00 WIB',
    maps_url: '',
  },
  footer: {
    enabled: true,
    description: 'Klub padel dan tenis untuk semua level di Jakarta Selatan. Main, latihan, dan bertanding bersama komunitas.',
    copyright: '',
    instagram: 'https://instagram.com/lintangclub',
    facebook: '',
    linkedin: '',
    youtube: 'https://youtube.com/@lintangclub',
    tiktok: 'https://tiktok.com/@lintangclub',
  },
};
