// Konten bawaan Corporate Nexa (perusahaan fiktif PT Samudra Karya Persada). Dipakai di demo dan sebagai isi awal CMS
// pembeli. Foto asli Unsplash (public/assets/templates/photos/CREDITS.md), logo klien fiktif. brand.logo sengaja
// kosong: header memakai simbol bawaan template + nama perusahaan (docs/platform/TEMPLATE-DESIGN.md §1.6, §3.2).
import { demoClients, templatePhoto } from '../shared/assets';
import type { SiteContent } from '../types';

export const CORPORATE_NEXA_ACCENT = '#1D4ED8';

export const corporateNexaContent: SiteContent = {
  brand: {
    company_name: 'PT Samudra Karya Persada',
    tagline: 'Konsultan & kontraktor bangunan komersial',
    logo: '',
    accent_color: CORPORATE_NEXA_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Dipercaya 200+ perusahaan sejak 2009',
    title: 'Membangun ruang usaha yang kokoh, tepat waktu, dan sesuai anggaran',
    highlight: 'tepat waktu',
    subtitle:
      'Kami mendampingi perusahaan Anda dari perencanaan, desain, hingga konstruksi gedung kantor, gudang, dan fasilitas komersial dengan standar keselamatan kerja yang ketat.',
    primary_label: 'Konsultasi Proyek',
    primary_url: '',
    secondary_label: 'Lihat Layanan',
    secondary_url: '',
    image: templatePhoto('corporate-nexa-hero'),
  },
  clients: {
    enabled: true,
    title: 'Dipercaya perusahaan konstruksi, properti, dan industri',
    items: demoClients('corporate-nexa'),
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang kami',
    title: 'Mitra konstruksi yang mengutamakan kualitas dan keterbukaan',
    body:
      'Berdiri di Surabaya pada 2009, PT Samudra Karya Persada telah menyelesaikan ratusan proyek gedung komersial di Jawa, Bali, dan Kalimantan. Kami percaya bangunan yang baik lahir dari perencanaan yang matang dan komunikasi yang jujur.\n\nSetiap proyek ditangani tim insinyur, arsitek, dan pengawas lapangan bersertifikat. Anda menerima laporan progres mingguan lengkap dengan foto lapangan, sehingga selalu tahu kondisi proyek tanpa harus datang ke lokasi.',
    image: templatePhoto('corporate-nexa-engineers'),
    image_2: templatePhoto('corporate-nexa-blueprint'),
    badge_value: '15+',
    badge_label: 'Tahun pengalaman',
    points: [
      { text: 'Tim insinyur dan arsitek bersertifikat' },
      { text: 'Laporan progres mingguan yang transparan' },
      { text: 'Garansi pekerjaan struktur hingga 10 tahun' },
      { text: 'Penerapan K3 sesuai standar nasional' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Layanan',
    title: 'Solusi lengkap dari rancangan hingga serah terima',
    subtitle: 'Satu mitra untuk seluruh tahap pembangunan, sehingga koordinasi lebih ringkas dan biaya lebih terkendali.',
    items: [
      { title: 'Perencanaan & desain', description: 'Studi kelayakan, desain arsitektur, perhitungan struktur, dan rencana anggaran biaya yang rinci.', image: '' },
      { title: 'Konstruksi gedung komersial', description: 'Pembangunan kantor, ruko, showroom, dan fasilitas publik dengan material bersertifikat.', image: '' },
      { title: 'Gudang & pabrik', description: 'Konstruksi baja bentang lebar, lantai beton industri, dan instalasi utilitas pabrik.', image: '' },
      { title: 'Renovasi & interior kantor', description: 'Penataan ulang ruang kerja yang fungsional tanpa mengganggu operasional harian Anda.', image: '' },
      { title: 'Manajemen proyek', description: 'Pengawasan mutu, jadwal, dan biaya oleh manajer proyek berpengalaman.', image: '' },
      { title: 'Pemeliharaan gedung', description: 'Perawatan berkala atap, fasad, mekanikal, dan elektrikal agar gedung tetap prima.', image: '' },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: 'Mengapa kami',
    title: 'Hasil kerja yang terukur',
    subtitle: 'Angka-angka ini adalah buah kepercayaan klien yang terus bekerja sama dengan kami.',
    stats: [
      { value: '350+', label: 'Proyek selesai' },
      { value: '200+', label: 'Klien korporat' },
      { value: '98%', label: 'Proyek tepat waktu' },
      { value: '12', label: 'Kota terjangkau' },
    ],
    items: [
      { title: 'Jadwal yang realistis', description: 'Rencana kerja disusun bersama Anda dan dipantau setiap minggu agar serah terima tepat waktu.' },
      { title: 'Biaya transparan', description: 'Rincian anggaran terbuka sejak awal, tanpa biaya tambahan yang tidak disepakati.' },
      { title: 'Tim bersertifikat', description: 'Tenaga ahli bersertifikat SKA dan SKT dengan pengalaman proyek skala besar.' },
      { title: 'Garansi purna jual', description: 'Masa pemeliharaan dan garansi tertulis untuk pekerjaan struktur dan atap.' },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri proyek',
    title: 'Sebagian proyek dan cara kami bekerja',
    subtitle: 'Dari gedung perkantoran hingga penataan kawasan industri, lengkap dengan laporan progres untuk klien.',
    items: [
      { image: templatePhoto('corporate-nexa-facade'), caption: 'Gedung kantor 8 lantai, Surabaya' },
      { image: templatePhoto('corporate-nexa-lobby'), caption: 'Lobi & interior kantor regional, Malang' },
      { image: templatePhoto('corporate-nexa-meeting-room'), caption: 'Ruang rapat direksi, Sidoarjo' },
      { image: templatePhoto('corporate-nexa-steel'), caption: 'Rangka baja gudang distribusi, Gresik' },
      { image: templatePhoto('corporate-nexa-warehouse'), caption: 'Gudang logistik bentang lebar, Pasuruan' },
      { image: templatePhoto('corporate-nexa-site-team'), caption: 'Pengawasan lapangan harian oleh tim K3' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Apa kata klien kami',
    items: [
      {
        name: 'Budi Santoso',
        role: 'Direktur Operasional, PT Logistik Prima Nusantara',
        quote: 'Gudang distribusi kami selesai dua minggu lebih cepat dari jadwal. Laporan mingguannya sangat membantu kami memantau dari kantor pusat.',
        photo: templatePhoto('corporate-nexa-portrait-1'),
      },
      {
        name: 'Rina Wulandari',
        role: 'Manajer Fasilitas, CV Sumber Rasa Jaya',
        quote: 'Renovasi pabrik berjalan tanpa menghentikan produksi. Timnya rapi, disiplin K3, dan komunikasinya jelas.',
        photo: templatePhoto('corporate-nexa-portrait-2'),
      },
      {
        name: 'Hendra Wijaya',
        role: 'Pemilik, Wijaya Motor Group',
        quote: 'Desain showroom kami jadi lebih modern dan anggaran tetap sesuai kesepakatan awal. Sangat direkomendasikan.',
        photo: templatePhoto('corporate-nexa-portrait-3'),
      },
    ],
  },
  cta: {
    enabled: true,
    title: 'Punya rencana pembangunan tahun ini?',
    subtitle: 'Ceritakan kebutuhan proyek Anda. Tim kami akan menyiapkan estimasi awal tanpa biaya.',
    button_label: 'Jadwalkan Konsultasi',
    button_url: '',
    image: templatePhoto('corporate-nexa-meeting'),
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Mari diskusikan proyek Anda',
    subtitle: 'Kunjungi kantor kami atau hubungi lewat telepon, email, maupun WhatsApp. Kami membalas di hari kerja yang sama.',
    address: 'Jl. Raya Darmo No. 128, Surabaya, Jawa Timur 60264',
    email: 'halo@samudrakarya.co.id',
    phone: '(031) 555-0128',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo, saya ingin berkonsultasi tentang proyek pembangunan.',
    hours: 'Senin–Jumat, 08.00–17.00 WIB',
    maps_url: '',
  },
  footer: {
    enabled: true,
    description: 'Konsultan dan kontraktor bangunan komersial yang membantu perusahaan membangun ruang usaha yang aman dan efisien.',
    copyright: '',
    instagram: 'https://instagram.com/samudrakarya',
    facebook: '',
    linkedin: 'https://linkedin.com/company/samudrakarya',
    youtube: '',
    tiktok: '',
  },
};
