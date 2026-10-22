// STUB fondasi (2026-10-22): konten bawaan Aura Studio — Sekar Ayu Aesthetic Studio (studio FIKTIF, Bandung).
// Sudah memakai kunci Company Profile yang dibaca stub; engineer Aura Studio melengkapinya (foto demo dari
// ./photos.ts, section `featured`/`team`, field baru) sesuai docs/platform/TEMPLATE-BRIEFS-2026-10.md §2.
// Hindari klaim medis/hasil pasti di salinan demo (lihat §2.9 brief). brand.logo sengaja kosong.
import type { SiteContent } from '../types';

/** Hijau sage dari referensi (tombol reservasi). Teks di atas aksen otomatis gelap (--tpl-on-accent). */
export const AURA_STUDIO_ACCENT = '#B8D4A3';

export const auraStudioContent: SiteContent = {
  brand: {
    company_name: 'Sekar Ayu Aesthetic Studio',
    tagline: 'Rawat kulit dan kuku dengan sentuhan ahli',
    logo: '',
    accent_color: AURA_STUDIO_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Studio perawatan kulit & kuku di Bandung',
    title: 'Ruang tenang untuk merawat diri',
    highlight: '',
    subtitle:
      'Perawatan wajah, kuku, dan tubuh oleh terapis berpengalaman, dengan produk terdaftar dan suasana studio yang menenangkan.',
    primary_label: 'Reservasi',
    primary_url: '',
    secondary_label: 'Lihat Perawatan',
    secondary_url: '',
    image: '',
  },
  clients: {
    enabled: false,
    title: 'Memakai produk perawatan pilihan',
    items: [
      { name: 'Daun Teduh Skincare', logo: '' },
      { name: 'Melati Nail Lab', logo: '' },
      { name: 'Embun Botanica', logo: '' },
      { name: 'Kanaya Derma', logo: '' },
    ],
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang kami',
    title: 'Perawatan yang terasa personal, dari konsultasi sampai hasil akhir',
    body:
      'Sekar Ayu berdiri di Bandung sejak 2019. Setiap perawatan diawali konsultasi singkat agar terapis memahami kondisi kulit dan kebutuhan Anda.\n\nKami memakai produk terdaftar, alat yang disterilkan setiap sesi, dan ruang perawatan pribadi agar Anda bisa benar-benar beristirahat.',
    image: '',
    badge_value: '10+',
    badge_label: 'Tahun pengalaman terapis',
    points: [
      { text: 'Konsultasi gratis sebelum perawatan' },
      { text: 'Alat steril di setiap sesi' },
      { text: 'Ruang perawatan pribadi' },
      { text: 'Produk perawatan pilihan' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Perawatan',
    title: 'Pilih perawatan sesuai kebutuhan Anda',
    subtitle: 'Perawatan wajah dan kuku yang dikerjakan teliti oleh terapis bersertifikat.',
    items: [
      { title: 'Konsultasi Kulit', description: 'Analisis kondisi kulit dan rekomendasi rangkaian perawatan yang sesuai.', image: '' },
      { title: 'Facial Pembersihan', description: 'Membersihkan pori, mengangkat sel kulit mati, dan melembapkan kulit wajah.', image: '' },
      { title: 'Perawatan Rutin', description: 'Program perawatan berkala untuk menjaga kulit tetap segar dan terawat.', image: '' },
      { title: 'Peeling Ringan', description: 'Eksfoliasi lembut untuk tampilan kulit yang lebih cerah dan halus.', image: '' },
      { title: 'Manikur Jepang', description: 'Perawatan kuku alami yang membuat kuku tampak sehat dan berkilau tanpa cat.', image: '' },
      { title: 'Nail Art', description: 'Desain kuku sesuai gaya Anda, dari minimalis hingga motif detail.', image: '' },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: 'Mengapa kami',
    title: 'Mengapa memilih Sekar Ayu?',
    subtitle: 'Empat alasan pelanggan kembali merawat diri di studio kami.',
    stats: [
      { value: '4.800+', label: 'Pelanggan terlayani' },
      { value: '4,9', label: 'Rating ulasan' },
      { value: '12', label: 'Terapis bersertifikat' },
      { value: '30+', label: 'Pilihan perawatan' },
    ],
    items: [
      { title: 'Terapis berpengalaman', description: 'Rata-rata lebih dari 10 tahun pengalaman dan rutin mengikuti pelatihan.' },
      { title: 'Layanan yang nyaman', description: 'Teh hangat, musik tenang, dan ruang pribadi di setiap sesi perawatan.' },
      { title: 'Lokasi strategis', description: 'Di pusat kota dengan area parkir yang luas dan mudah dijangkau.' },
      { title: 'Ilmu yang terus diperbarui', description: 'Terapis kami mengikuti pelatihan teknik baru setidaknya dua kali setahun.' },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri',
    title: 'Suasana studio',
    subtitle: 'Ruang perawatan, detail kuku, dan momen bersama pelanggan.',
    items: [
      { image: '', caption: 'Ruang perawatan wajah' },
      { image: '', caption: 'Manikur Jepang dengan hasil alami' },
      { image: '', caption: 'Area tunggu yang tenang' },
      { image: '', caption: 'Rangkaian produk perawatan' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Cerita pelanggan kami',
    items: [
      {
        name: 'Anisa Rahma',
        role: 'Pelanggan facial bulanan',
        quote: 'Terapisnya teliti dan menjelaskan setiap langkah. Suasananya tenang, rasanya seperti istirahat sejenak.',
        photo: '',
      },
      {
        name: 'Maya Kartika',
        role: 'Pelanggan manikur',
        quote: 'Manikur Jepangnya rapi dan kuku saya terlihat sehat tanpa cat. Reservasi lewat WhatsApp juga cepat.',
        photo: '',
      },
      {
        name: 'Dinda Lestari',
        role: 'Pelanggan nail art',
        quote: 'Desainnya persis seperti yang saya minta dan tahan lama. Pasti kembali lagi bulan depan.',
        photo: '',
      },
    ],
  },
  cta: {
    enabled: true,
    title: 'Saatnya meluangkan waktu untuk diri sendiri',
    subtitle: 'Pilih jadwal perawatan Anda. Tim kami akan mengonfirmasi lewat WhatsApp.',
    button_label: 'Reservasi Sekarang',
    button_url: '',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Kunjungi studio kami',
    subtitle: 'Datang langsung atau reservasi lebih dulu agar Anda tidak perlu menunggu.',
    address: 'Jl. Sekar Wangi No. 7, Coblong, Kota Bandung, Jawa Barat 40132',
    email: 'halo@sekarayu.id',
    phone: '(022) 555-0719',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo Sekar Ayu, saya ingin reservasi perawatan.',
    hours: 'Selasa–Minggu, 10.00–20.00 WIB',
    maps_url: '',
  },
  footer: {
    enabled: true,
    description: 'Studio perawatan kulit dan kuku di Bandung. Ruang tenang untuk merawat diri bersama terapis berpengalaman.',
    copyright: '',
    instagram: 'https://instagram.com/sekarayu.studio',
    facebook: '',
    linkedin: '',
    youtube: '',
    tiktok: 'https://tiktok.com/@sekarayu.studio',
  },
};
