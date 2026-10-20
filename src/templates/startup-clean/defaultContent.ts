// Konten bawaan Startup Clean (startup fiktif). Dipakai di demo dan sebagai isi awal CMS pembeli.
import type { SiteContent } from '../types';

export const STARTUP_CLEAN_ACCENT = '#7C3AED';

export const startupCleanContent: SiteContent = {
  brand: {
    company_name: 'Kirana Labs',
    tagline: 'Kasir & stok online untuk UMKM',
    logo: '',
    accent_color: STARTUP_CLEAN_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Baru: laporan laba harian otomatis',
    title: 'Kelola toko lebih rapi, jualan makin lancar',
    highlight: 'jualan makin lancar',
    subtitle:
      'Kirana membantu UMKM mencatat penjualan, memantau stok, dan membaca laporan keuangan dari satu aplikasi yang mudah dipakai di HP maupun laptop.',
    primary_label: 'Coba Gratis 14 Hari',
    primary_url: '',
    secondary_label: 'Lihat Fitur',
    secondary_url: '',
    image: '',
  },
  about: {
    enabled: true,
    eyebrow: 'Cerita kami',
    title: 'Dibuat oleh pelaku usaha, untuk pelaku usaha',
    body:
      'Kirana lahir di Yogyakarta pada 2021 dari pengalaman kami mengelola toko keluarga yang masih mencatat semuanya di buku. Kami ingin setiap UMKM punya alat yang sama canggihnya dengan bisnis besar, tanpa harus rumit dan mahal.\n\nKini ribuan warung, kedai kopi, toko kelontong, dan butik di seluruh Indonesia memakai Kirana setiap hari untuk berjualan dengan lebih tenang.',
    image: '',
    badge_value: '4,8/5',
    badge_label: 'Rating dari pengguna',
    points: [
      { text: 'Bisa dipakai tanpa pelatihan khusus' },
      { text: 'Data tersimpan aman di cloud' },
      { text: 'Tetap jalan saat internet putus' },
      { text: 'Tim dukungan berbahasa Indonesia' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Fitur',
    title: 'Semua yang toko Anda butuhkan, dalam satu aplikasi',
    subtitle: 'Mulai dari kasir sampai laporan keuangan. Aktifkan fitur sesuai kebutuhan usaha Anda.',
    items: [
      {
        title: 'Kasir cepat di HP & laptop',
        description: 'Catat transaksi dalam hitungan detik, terima pembayaran tunai maupun QRIS, lalu cetak atau kirim struk lewat WhatsApp.',
        image: '',
      },
      { title: 'Stok real-time', description: 'Stok berkurang otomatis setiap ada penjualan, lengkap dengan peringatan stok menipis.', image: '' },
      { title: 'Laporan otomatis', description: 'Laba, omzet, dan produk terlaris tersaji rapi setiap hari tanpa hitung manual.', image: '' },
      { title: 'Multi-cabang', description: 'Pantau semua cabang dari satu akun, kapan pun dan di mana pun.', image: '' },
      { title: 'Pembayaran QRIS', description: 'Terima pembayaran non-tunai dari semua dompet digital dan mobile banking.', image: '' },
      { title: 'Katalog online', description: 'Bagikan katalog produk dan terima pesanan pelanggan langsung dari tautan toko Anda.', image: '' },
      { title: 'Dukungan 7 hari', description: 'Tim kami siap membantu lewat chat setiap hari, termasuk akhir pekan.', image: '' },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: 'Dampak',
    title: 'Tumbuh bersama ribuan UMKM',
    subtitle: 'Kami ukur keberhasilan dari seberapa besar usaha pengguna kami berkembang.',
    stats: [
      { value: '12.000+', label: 'UMKM aktif' },
      { value: '35', label: 'Kota di Indonesia' },
      { value: '2 jt+', label: 'Transaksi per bulan' },
      { value: '4,8', label: 'Rating pengguna' },
    ],
    items: [
      { title: 'Mudah dipelajari', description: 'Tampilan sederhana yang bisa langsung dipakai karyawan baru di hari pertama.' },
      { title: 'Harga bersahabat', description: 'Paket mulai dari harga secangkir kopi per hari, tanpa biaya tersembunyi.' },
      { title: 'Data aman', description: 'Enkripsi dan cadangan otomatis setiap hari, jadi data Anda tidak hilang.' },
      { title: 'Tim lokal', description: 'Kami memahami cara UMKM Indonesia berjualan dan siap mendampingi.' },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri',
    title: 'Kirana di lapangan',
    subtitle: 'Momen bersama mitra UMKM dan tim kami.',
    items: [
      { image: '', caption: 'Pelatihan UMKM di Bandung' },
      { image: '', caption: 'Tim produk saat sprint review' },
      { image: '', caption: 'Kedai kopi mitra di Yogyakarta' },
      { image: '', caption: 'Booth Kirana di pameran UMKM' },
      { image: '', caption: 'Dasbor laporan di aplikasi' },
      { image: '', caption: 'Workshop laporan keuangan' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Dicintai pemilik usaha',
    items: [
      {
        name: 'Sari Rahmawati',
        role: 'Pemilik Kedai Kopi Senja, Yogyakarta',
        quote: 'Dulu tutup buku butuh dua jam setiap malam. Sekarang laporan langsung jadi, saya tinggal cek dari HP.',
        photo: '',
      },
      {
        name: 'Agus Prasetyo',
        role: 'Pemilik Toko Berkah Jaya, Medan',
        quote: 'Stok tidak pernah selisih lagi. Peringatan stok menipisnya sangat membantu saat belanja ke grosir.',
        photo: '',
      },
      {
        name: 'Dewi Lestari',
        role: 'Pendiri Butik Lestari, Bandung',
        quote: 'Tiga cabang bisa saya pantau sekaligus. Timnya juga cepat membalas kalau ada pertanyaan.',
        photo: '',
      },
    ],
  },
  cta: {
    enabled: true,
    title: 'Siap merapikan toko Anda?',
    subtitle: 'Coba semua fitur gratis selama 14 hari. Tidak perlu kartu kredit.',
    button_label: 'Mulai Sekarang',
    button_url: '',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Ada pertanyaan? Kami siap membantu',
    subtitle: 'Kirim pesan lewat formulir di bawah dan tim kami akan membalas melalui WhatsApp dalam hitungan menit.',
    address: 'Jl. Kaliurang Km 5 No. 21, Sleman, Daerah Istimewa Yogyakarta 55281',
    email: 'halo@kiranalabs.id',
    phone: '(0274) 555-0721',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo Kirana, saya ingin tahu lebih lanjut tentang aplikasinya.',
    hours: 'Setiap hari, 08.00–21.00 WIB',
    maps_url: '',
  },
  footer: {
    enabled: true,
    description: 'Aplikasi kasir dan stok online yang membantu UMKM Indonesia berjualan dengan lebih rapi.',
    copyright: '',
    instagram: 'https://instagram.com/kiranalabs',
    facebook: '',
    linkedin: 'https://linkedin.com/company/kiranalabs',
    youtube: 'https://youtube.com/@kiranalabs',
    tiktok: 'https://tiktok.com/@kiranalabs',
  },
};
