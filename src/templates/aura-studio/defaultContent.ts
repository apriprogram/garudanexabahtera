// Konten bawaan Aura Studio — Sekar Ayu Aesthetic Studio (studio FIKTIF, Coblong, Bandung). Dipakai demo dan situs
// baru (konten null). Foto demo dari ./photos.ts; brand.logo sengaja kosong (situs pembeli memakai simbol bawaan
// AuraMark + nama usaha sampai pembeli mengunggah logo sendiri). Salinan tanpa klaim medis atau hasil pasti, tanpa
// nomor izin fiktif (brief §2.9). Nama di testimoni & tim fiktif dan tidak berhubungan dengan orang di foto.
import type { SiteContent } from '../types';
import { auraPhoto } from './photos';

/** Hijau sage dari referensi (tombol reservasi). Teks di atas aksen otomatis gelap (--tpl-on-accent). */
export const AURA_STUDIO_ACCENT = '#B8D4A3';

const FACE = 'Perawatan Wajah';
const NAILS = 'Perawatan Kuku';

export const auraStudioContent: SiteContent = {
  brand: {
    company_name: 'Sekar Ayu Aesthetic Studio',
    tagline: 'Rawat kulit dan kuku dengan sentuhan ahli',
    logo: '',
    accent_color: AURA_STUDIO_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Coblong, Bandung',
    title: 'Rawat diri dengan tenang',
    highlight: '',
    subtitle: 'Perawatan wajah dan kuku oleh terapis berpengalaman, di studio yang bersih, tenang, dan hangat.',
    primary_label: 'Reservasi',
    primary_url: '',
    list_title: 'Layanan kami',
    secondary_label: 'Lihat semua perawatan',
    secondary_url: '',
    image: auraPhoto('aura-studio-hero'),
    booking_label: 'Cari jadwal perawatan di Sekar Ayu',
    chat_label: 'Tulis pesan',
    social_label: 'Ikuti kami',
  },
  advantages: {
    enabled: true,
    eyebrow: 'Alasan memilih kami',
    title: 'Mengapa kami?',
    subtitle: 'Empat hal yang membuat pelanggan kembali merawat diri di studio kami.',
    items: [
      {
        title: 'Terapis berpengalaman',
        description: 'Rata-rata lebih dari 10 tahun menangani kulit dan kuku, dan rutin mengikuti pelatihan teknik baru.',
      },
      {
        title: 'Layanan yang nyaman',
        description: 'Teh hangat, musik tenang, dan ruang perawatan pribadi agar Anda benar-benar bisa beristirahat.',
      },
      {
        title: 'Lokasi strategis',
        description: 'Di pusat kota Bandung, dekat kampus dan pusat belanja, dengan area parkir yang lega.',
      },
      {
        title: 'Ilmu yang terus diperbarui',
        description: 'Terapis kami mengikuti pelatihan setidaknya dua kali setahun untuk mengenal teknik dan produk terbaru.',
      },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Pilih kategori',
    title: 'Perawatan kami',
    subtitle: 'Setiap perawatan diawali konsultasi singkat agar hasilnya sesuai kebutuhan kulit dan kuku Anda.',
    more_label: 'Lihat lebih banyak di Instagram',
    more_url: '',
    items: [
      {
        title: 'Konsultasi Kulit',
        description: 'Analisis kondisi kulit dan saran rangkaian perawatan yang sesuai untuk Anda.',
        image: auraPhoto('aura-studio-texture'),
        category: FACE,
        count: '15 menit',
        price: 'Gratis',
      },
      {
        title: 'Facial Pembersihan',
        description: 'Membersihkan pori, mengangkat sel kulit mati, dan melembapkan kulit wajah.',
        image: auraPhoto('aura-studio-facial'),
        category: FACE,
        count: '6 pilihan',
        price: 'Mulai Rp250.000',
      },
      {
        title: 'Perawatan Rutin',
        description: 'Program perawatan berkala untuk menjaga kulit tetap segar dan terawat.',
        image: auraPhoto('aura-studio-therapist'),
        category: FACE,
        count: '10+ program',
        price: 'Mulai Rp350.000',
      },
      {
        title: 'Peeling Ringan',
        description: 'Eksfoliasi lembut agar kulit tampak lebih cerah dan terasa halus.',
        image: auraPhoto('aura-studio-products'),
        category: FACE,
        count: '4 pilihan',
        price: 'Mulai Rp300.000',
      },
      {
        title: 'Lash Lift & Brow',
        description: 'Lentik alami untuk bulu mata dan rapikan alis sesuai bentuk wajah.',
        image: auraPhoto('aura-studio-lash'),
        category: FACE,
        count: '5 pilihan',
        price: 'Mulai Rp200.000',
      },
      {
        title: 'Perawatan Kulit Berjerawat',
        description: 'Pembersihan lembut dan perawatan rutin agar kulit berjerawat terasa lebih nyaman.',
        image: auraPhoto('aura-studio-sage'),
        category: FACE,
        count: '3 program',
        price: 'Mulai Rp300.000',
      },
      {
        title: 'Manikur Jepang',
        description: 'Perawatan kuku alami dengan pasta dan bubuk mineral, kuku tampak sehat dan berkilau tanpa cat.',
        image: auraPhoto('aura-studio-nail-care'),
        category: NAILS,
        count: '2 pilihan',
        price: 'Mulai Rp180.000',
      },
      {
        title: 'Nail Art',
        description: 'Desain kuku sesuai gaya Anda, dari minimalis hingga motif detail.',
        image: auraPhoto('aura-studio-nailart'),
        category: NAILS,
        count: '30+ desain',
        price: 'Mulai Rp150.000',
      },
      {
        title: 'Gel & Kutek',
        description: 'Kutek gel yang rapi dan awet, dengan pilihan warna lembut sampai berani.',
        image: auraPhoto('aura-studio-nail-salon'),
        category: NAILS,
        count: '60+ warna',
        price: 'Mulai Rp120.000',
      },
      {
        title: 'Pedikur Spa',
        description: 'Rendam air hangat, scrub, perawatan kuku kaki, dan pijat ringan.',
        image: '',
        category: NAILS,
        count: '3 pilihan',
        price: 'Mulai Rp160.000',
      },
    ],
  },
  featured: {
    enabled: true,
    eyebrow: 'Perawatan unggulan',
    title: 'Manikur Jepang',
    body:
      'Teknik perawatan kuku asal Jepang yang memakai pasta dan bubuk mineral. Cocok dilakukan setelah pemakaian gel, agar kuku tampak sehat, rapi, dan berkilau alami tanpa cat. Hasilnya bertahan hingga beberapa minggu dengan perawatan rumah yang sederhana.',
    image: auraPhoto('aura-studio-manicure'),
    tags_title: 'Cocok untuk',
    tags: [{ text: 'Kuku rapuh setelah gel' }, { text: 'Tampilan alami' }, { text: 'Persiapan acara penting' }],
    steps: [
      { title: 'Konsultasi singkat', text: 'Terapis melihat kondisi kuku dan kulit di sekitarnya.' },
      { title: 'Membersihkan & membentuk', text: 'Kutikula dirapikan dan kuku dibentuk sesuai keinginan Anda.' },
      { title: 'Pasta & bubuk mineral', text: 'Pasta dioleskan lalu dipoles sampai kuku berkilau alami.' },
      { title: 'Pijat tangan', text: 'Diakhiri pijat tangan singkat dengan krim pelembap.' },
    ],
    button_label: 'Reservasi perawatan ini',
    button_url: '',
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang studio',
    title: 'Perawatan yang terasa personal, dari konsultasi sampai hasil akhir',
    body:
      'Sekar Ayu berdiri di Bandung sejak 2019. Setiap perawatan diawali konsultasi singkat agar terapis memahami kondisi kulit, kuku, dan kebutuhan Anda.\n\nKami memakai produk terdaftar, alat yang disterilkan setiap sesi, dan ruang perawatan pribadi agar Anda bisa benar-benar beristirahat.',
    image: auraPhoto('aura-studio-interior'),
    badge_value: '10+',
    badge_label: 'Tahun pengalaman terapis',
    points: [
      { text: 'Konsultasi gratis sebelum perawatan' },
      { text: 'Alat steril di setiap sesi' },
      { text: 'Ruang perawatan pribadi' },
      { text: 'Produk perawatan pilihan' },
    ],
  },
  clients: {
    enabled: false,
    title: 'Produk perawatan yang kami pakai',
    items: [
      { name: 'Daun Teduh Skincare', logo: '' },
      { name: 'Melati Nail Lab', logo: '' },
      { name: 'Embun Botanica', logo: '' },
      { name: 'Kanaya Derma', logo: '' },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Suasana studio',
    title: 'Ruang yang tenang untuk merawat diri',
    subtitle: 'Area tunggu yang terang, ruang perawatan pribadi, dan sentuhan akhir di setiap sesi.',
    items: [
      { image: auraPhoto('aura-studio-lounge'), caption: 'Area tunggu yang terang dan lega' },
      { image: auraPhoto('aura-studio-room'), caption: 'Ruang perawatan pribadi' },
      { image: auraPhoto('aura-studio-massage'), caption: 'Pijat wajah di akhir sesi facial' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Kata pelanggan',
    title: 'Cerita pelanggan kami',
    items: [
      {
        name: 'Anisa Rahma',
        role: 'Pelanggan facial bulanan',
        quote: 'Terapisnya teliti dan menjelaskan setiap langkah. Suasananya tenang, rasanya seperti istirahat sejenak dari rutinitas.',
        photo: auraPhoto('aura-studio-portrait-1'),
      },
      {
        name: 'Maya Kartika',
        role: 'Pelanggan manikur Jepang',
        quote: 'Kuku saya terlihat sehat dan berkilau tanpa cat. Reservasi lewat WhatsApp juga cepat dibalas.',
        photo: auraPhoto('aura-studio-portrait-2'),
      },
      {
        name: 'Dinda Lestari',
        role: 'Pelanggan nail art',
        quote: 'Desainnya persis seperti yang saya minta dan rapi sampai ke ujung. Pasti kembali lagi bulan depan.',
        photo: auraPhoto('aura-studio-portrait-3'),
      },
    ],
  },
  team: {
    enabled: true,
    eyebrow: 'Tim kami',
    title: 'Terapis yang merawat Anda',
    subtitle: 'Terapis bersertifikat yang ramah, teliti, dan senang menjelaskan setiap langkah perawatan.',
    items: [
      { name: 'Ayu Paramitha', role: 'Pendiri & terapis senior', photo: auraPhoto('aura-studio-team-1') },
      { name: 'Nadia Putri', role: 'Terapis wajah', photo: auraPhoto('aura-studio-team-2') },
      { name: 'Siti Rahmawati', role: 'Nail artist', photo: auraPhoto('aura-studio-team-3') },
    ],
  },
  cta: {
    enabled: true,
    title: 'Saatnya meluangkan waktu untuk diri sendiri',
    subtitle: 'Pilih perawatan dan jadwal yang Anda inginkan. Tim kami akan mengonfirmasi lewat WhatsApp.',
    button_label: 'Reservasi Sekarang',
    button_url: '',
    image: auraPhoto('aura-studio-glow'),
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
    tiktok: 'https://tiktok.com/@sekarayu.studio',
    facebook: '',
    youtube: '',
    linkedin: '',
  },
};
