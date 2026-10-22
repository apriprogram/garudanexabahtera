// Konten bawaan Arena Club: Lintang Padel & Tenis Club (klub FIKTIF, Cilandak, Jakarta Selatan). Nama orang di
// pelatih & testimoni fiktif dan tidak berhubungan dengan orang di foto. Foto demo dari ./photos.ts (Unsplash).
// brand.logo sengaja kosong: header & footer memakai simbol lapangan bawaan (ArenaMark) + nama klub.
import type { SiteContent } from '../types';
import { arenaPhoto } from './photos';

/** Biru langit dari referensi (kartu membership). Teks di atas aksen otomatis gelap (--tpl-on-accent). */
export const ARENA_CLUB_ACCENT = '#2FB2FF';

const SPONSOR_DIR = '/assets/templates/logos';
const sponsor = (file: string, name: string) => ({ name, logo: `${SPONSOR_DIR}/arena-club-sponsor-${file}.svg` });

export const arenaClubContent: SiteContent = {
  brand: {
    company_name: 'Lintang Padel & Tenis Club',
    tagline: 'Main lebih seru, latihan lebih terarah',
    logo: '',
    accent_color: ARENA_CLUB_ACCENT,
    header_label: 'Pesan Lapangan',
    header_url: '',
  },
  hero: {
    enabled: true,
    eyebrow: 'Klub padel & tenis · Cilandak, Jakarta Selatan',
    title: 'Ayunan terbaikmu dimulai di lapangan ini',
    highlight: 'lapangan ini',
    subtitle:
      'Lapangan berstandar turnamen, pelatih bersertifikat, dan komunitas pemain yang hangat. Pesan lapangan atau ikut kelas percobaan minggu ini.',
    primary_label: 'Jadwalkan Kelas Percobaan',
    primary_url: '',
    secondary_label: 'Lihat Membership',
    secondary_url: '',
    image: arenaPhoto('hero'),
    proof_text: 'Latih bersama pelatih profesional',
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang Lintang',
    title:
      'Di Lintang, padel dan tenis bukan sekadar olahraga. Sejak 2021, klub ini jadi rumah bagi pemula hingga pemain turnamen.',
    body:
      'Enam lapangan padel dan dua lapangan tenis berstandar turnamen. Lampu merata dan atap kanopi membuat Anda tetap nyaman bermain pagi, siang, maupun malam.\n\nSetiap member mendapat program latihan sesuai level, jadwal main yang fleksibel, dan kesempatan bertanding di liga internal setiap bulan.',
    points: [
      { text: 'Lapangan berstandar turnamen' },
      { text: 'Kelas untuk semua level' },
      { text: 'Pesan cepat lewat WhatsApp' },
      { text: 'Liga internal setiap bulan' },
    ],
    image: arenaPhoto('coach-lesson'),
    image_label: 'Kelas privat & grup',
    badge_value: '24',
    badge_label: 'Pelatih bersertifikat',
    badge_text: 'Siap mendampingi dari servis pertama sampai level turnamen.',
    levels_title: 'Member aktif per level',
    levels: [
      { label: 'Pemula', value: '540' },
      { label: 'Menengah', value: '410' },
      { label: 'Lanjutan', value: '200' },
    ],
  },
  advantages: {
    enabled: true,
    title: 'Lintang dalam angka, terus bertambah bersama komunitas',
    stats: [
      { value: '14.500+', label: 'Jam bermain setahun' },
      { value: '92%', label: 'Member memperpanjang' },
      { value: '1.150+', label: 'Member aktif' },
      { value: '36', label: 'Turnamen & liga setahun' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Program',
    title: 'Program latihan, sewa lapangan, dan liga untuk semua level.',
    subtitle: 'Dari servis pertama sampai poin kemenangan, pilih program yang pas dengan target dan jadwal Anda.',
    button_label: 'Konsultasi Program',
    button_url: '',
    items: [
      {
        title: 'Kelas Pemula',
        tag: 'Kelas grup',
        description: 'Belajar teknik dasar padel dan tenis dalam kelompok kecil, maksimal empat orang per pelatih.',
        image: arenaPhoto('serve'),
      },
      {
        title: 'Latihan Privat',
        tag: 'Satu lawan satu',
        description: 'Sesi bersama pelatih untuk memperbaiki teknik, strategi, dan konsistensi pukulan Anda.',
        image: arenaPhoto('private'),
      },
      {
        title: 'Sewa Lapangan per Jam',
        tag: 'Lapangan',
        description: 'Pesan lapangan padel atau tenis mulai pukul 06.00 hingga 23.00 setiap hari.',
        image: arenaPhoto('balls'),
      },
      {
        title: 'Akademi Junior',
        tag: 'Usia 7–15 tahun',
        description: 'Program terstruktur untuk anak, lengkap dengan evaluasi berkala untuk orang tua.',
        image: arenaPhoto('junior'),
      },
      {
        title: 'Turnamen & Liga',
        tag: 'Kompetisi',
        description: 'Liga internal bulanan dan turnamen terbuka untuk mengukur perkembangan permainan.',
        image: arenaPhoto('match'),
      },
    ],
  },
  pricing: {
    enabled: true,
    eyebrow: 'Membership',
    title: 'Pilih paket membership yang pas dengan ritme main Anda',
    subtitle: 'Semua paket termasuk akses ruang ganti, loker, dan potongan harga di kafe klub.',
    note: 'Harga per bulan, belum termasuk sewa raket. Bisa berhenti kapan saja dengan pemberitahuan 30 hari.',
    items: [
      {
        name: 'Starter',
        price: 'Rp450.000',
        period: '/bulan',
        badge: '',
        description: 'Untuk pemain baru yang ingin rutin bergerak setiap pekan.',
        features: '4 kelas grup\n2 jam sewa lapangan\nMain bareng komunitas',
        button_label: 'Pilih Starter',
        button_url: '',
      },
      {
        name: 'Pro',
        price: 'Rp850.000',
        period: '/bulan',
        badge: 'Paling diminati',
        description: 'Paket favorit member yang ingin cepat naik level.',
        features: '8 kelas grup\n4 jam sewa lapangan\n2 sesi latihan privat\nAkses liga internal',
        button_label: 'Pilih Paket Pro',
        button_url: '',
      },
      {
        name: 'Elite',
        price: 'Rp1.500.000',
        period: '/bulan',
        badge: '',
        description: 'Program intensif untuk pemain yang menyiapkan turnamen.',
        features: 'Kelas grup tanpa batas\n8 jam sewa lapangan\n4 sesi latihan privat\nAnalisis video bulanan',
        button_label: 'Pilih Elite',
        button_url: '',
      },
    ],
  },
  team: {
    enabled: true,
    eyebrow: 'Pelatih',
    title: 'Belajar dari pelatih yang sabar dan berpengalaman',
    subtitle: 'Semua pelatih kami bersertifikat dan rutin mengikuti pelatihan ulang setiap tahun.',
    items: [
      {
        name: 'Dimas Prakoso',
        role: 'Kepala Pelatih Padel',
        photo: arenaPhoto('coach-1'),
        description: 'Sepuluh tahun melatih, spesialis strategi permainan ganda.',
      },
      {
        name: 'Ayu Lestari',
        role: 'Pelatih Tenis',
        photo: arenaPhoto('coach-2'),
        description: 'Sabar menemani pemula, fokus pada teknik servis dan footwork.',
      },
      {
        name: 'Bagas Wirawan',
        role: 'Pelatih Akademi Junior',
        photo: arenaPhoto('coach-3'),
        description: 'Membimbing anak usia 7–15 tahun dengan latihan yang menyenangkan.',
      },
      {
        name: 'Sinta Maharani',
        role: 'Pelatih Fisik & Kebugaran',
        photo: arenaPhoto('coach-4'),
        description: 'Menyusun program kebugaran dan pencegahan cedera untuk member.',
      },
    ],
  },
  events: {
    enabled: true,
    eyebrow: 'Acara',
    title: 'Jadwal turnamen dan acara klub',
    subtitle: 'Daftar lewat WhatsApp. Kuota setiap acara terbatas.',
    items: [
      {
        date: '14 Des 2026',
        title: 'Liga Padel Antar-Member Seri Akhir Tahun',
        location: 'Lapangan padel 1–4 · mulai 07.00',
        tag: 'Turnamen',
        image: arenaPhoto('match'),
        url: '',
      },
      {
        date: '21 Des 2026',
        title: 'Klinik Servis & Volley Akhir Pekan',
        location: 'Lapangan tenis A · 08.00–11.00',
        tag: 'Kelas terbuka',
        image: arenaPhoto('serve'),
        url: '',
      },
      {
        date: '4 Jan 2027',
        title: 'Turnamen Junior Lintang Cup',
        location: 'Lapangan tenis A & B · sepanjang hari',
        tag: 'Akademi',
        image: arenaPhoto('junior'),
        url: '',
      },
      {
        date: '17 Jan 2027',
        title: 'Malam Padel Sosial & Main Bareng',
        location: 'Lapangan padel 1–6 · 19.00–22.00',
        tag: 'Komunitas',
        image: arenaPhoto('night'),
        url: '',
      },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri',
    title: 'Suasana di Lintang',
    subtitle: 'Lapangan, kelas, dan momen turnamen bersama member.',
    items: [
      { image: arenaPhoto('court'), caption: 'Lapangan outdoor di pagi yang cerah' },
      { image: arenaPhoto('gym'), caption: 'Latihan fisik bersama pelatih' },
      { image: arenaPhoto('match'), caption: 'Final liga internal bulan lalu' },
      { image: arenaPhoto('night'), caption: 'Main malam di bawah lampu lapangan' },
      { image: arenaPhoto('balls'), caption: 'Lapangan padel siap dipakai' },
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
        quote: 'Tiga bulan latihan privat, servis dan bandeja saya jauh lebih konsisten. Pelatihnya sabar dan detail.',
        photo: arenaPhoto('portrait-1'),
      },
      {
        name: 'Nadia Putri',
        role: 'Peserta kelas pemula',
        quote: 'Awalnya cuma ikut teman, sekarang main tiga kali seminggu. Komunitasnya ramah untuk pemula.',
        photo: arenaPhoto('portrait-2'),
      },
      {
        name: 'Rina Wijaya',
        role: 'Orang tua peserta akademi junior',
        quote: 'Anak saya makin disiplin dan percaya diri. Laporan perkembangannya juga rutin dikirim lewat WhatsApp.',
        photo: arenaPhoto('portrait-3'),
      },
    ],
  },
  clients: {
    enabled: true,
    title: 'Didukung mitra dan sponsor klub',
    items: [
      sponsor('raket-nusantara', 'Raket Nusantara'),
      sponsor('segar-isotonik', 'Segar Isotonik'),
      sponsor('bumi-sportswear', 'Bumi Sportswear'),
      sponsor('kopi-pagi', 'Kopi Pagi Lapangan'),
      sponsor('fisio-gerak', 'Fisio Gerak'),
    ],
  },
  cta: {
    enabled: true,
    title: 'Siap turun ke lapangan malam ini?',
    subtitle: 'Pesan lapangan atau jadwalkan kelas percobaan gratis. Tim kami membalas lewat WhatsApp dalam hitungan menit.',
    button_label: 'Pesan Sekarang',
    button_url: '',
    image: arenaPhoto('night'),
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
