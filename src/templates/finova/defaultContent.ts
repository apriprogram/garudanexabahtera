// STUB fondasi (2026-10-22): konten bawaan Finova — Lumbung Arta (aplikasi keuangan FIKTIF, Jakarta).
// Sudah memakai kunci Company Profile yang dibaca stub; engineer Finova melengkapinya (foto demo dari ./photos.ts,
// `brand.highlight_color`, section `product`/`faq`, footer kaya) sesuai docs/platform/TEMPLATE-BRIEFS-2026-10.md §3.
// Jangan menulis klaim izin/regulator, bunga, atau imbal hasil di salinan demo (lihat §3.9 brief).
import type { SiteContent } from '../types';

/** Hijau hutan dari referensi (blok CTA & kartu angka). Teks di atas aksen otomatis putih. */
export const FINOVA_ACCENT = '#1F4D43';
/** Hijau limau untuk tombol utama di latar gelap (warna kedua; engineer menjadikannya field `brand.highlight_color`). */
export const FINOVA_HIGHLIGHT = '#D4F27A';

export const finovaContent: SiteContent = {
  brand: {
    company_name: 'Lumbung Arta',
    tagline: 'Kelola uang keluarga dengan lebih tenang',
    logo: '',
    accent_color: FINOVA_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Tabungan, pembayaran, dan kartu dalam satu aplikasi',
    title: 'Keuangan tanpa ribet untuk masa depan yang lebih cerdas',
    highlight: 'lebih cerdas',
    subtitle:
      'Catat pengeluaran, atur anggaran, dan bayar tagihan dari satu aplikasi. Lumbung Arta membantu keluarga dan pelaku usaha mengambil keputusan keuangan dengan lebih yakin.',
    primary_label: 'Mulai Gratis',
    primary_url: '',
    secondary_label: 'Lihat Fitur',
    secondary_url: '',
    image: '',
  },
  clients: {
    enabled: true,
    title: 'Bekerja sama dengan mitra pembayaran tepercaya',
    items: [
      { name: 'Bayarin Cepat', logo: '' },
      { name: 'Kas Nusa', logo: '' },
      { name: 'Teras Dagang', logo: '' },
      { name: 'Rumah Koperasi', logo: '' },
      { name: 'Jaring Kirim', logo: '' },
      { name: 'Pundi Mitra', logo: '' },
    ],
  },
  about: {
    enabled: true,
    eyebrow: 'Kenapa Lumbung Arta',
    title: 'Keuangan lebih rapi, keputusan lebih tepat',
    body:
      'Semua rekening, dompet digital, dan kartu Anda terangkum dalam satu tampilan. Lihat ke mana uang mengalir setiap hari, lalu atur anggaran yang realistis untuk keluarga atau usaha.\n\nData Anda dienkripsi dan hanya Anda yang memutuskan siapa yang boleh melihatnya.',
    image: '',
    badge_value: '2,4 jt+',
    badge_label: 'Pengguna terdaftar',
    points: [
      { text: 'Cashback untuk pembayaran tagihan rutin' },
      { text: 'Pengingat tagihan otomatis sebelum jatuh tempo' },
      { text: 'Laporan bulanan yang mudah dibaca' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Fitur',
    title: 'Sederhana, cepat, dan bebas repot',
    subtitle: 'Daftar dalam hitungan menit, hubungkan akun, lalu kelola keuangan dari mana saja.',
    items: [
      { title: 'Hubungkan rekening & kartu', description: 'Satukan rekening bank, dompet digital, dan kartu dalam satu aplikasi yang aman.', image: '' },
      { title: 'Wawasan pengeluaran', description: 'Lihat pola belanja dan dapatkan saran anggaran yang sesuai kebiasaan Anda.', image: '' },
      { title: 'Buat akun dalam hitungan menit', description: 'Verifikasi data secara online tanpa perlu datang ke kantor cabang.', image: '' },
      { title: 'Kartu virtual', description: 'Buat kartu virtual untuk belanja online dan atur batas pemakaiannya sendiri.', image: '' },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: 'Dalam angka',
    title: 'Dipercaya jutaan pengguna di seluruh Indonesia',
    subtitle: 'Angka yang terus tumbuh bersama pengguna dan mitra kami.',
    stats: [
      { value: '2,4 jt+', label: 'Pengguna terdaftar' },
      { value: '120+', label: 'Kota di Indonesia' },
      { value: '4,8', label: 'Rating aplikasi' },
    ],
    items: [
      { title: 'Data terenkripsi', description: 'Data Anda dienkripsi saat dikirim maupun disimpan.' },
      { title: 'Tanpa biaya tersembunyi', description: 'Semua biaya ditampilkan jelas sebelum Anda menyetujui transaksi.' },
      { title: 'Bantuan 24 jam', description: 'Tim layanan pelanggan siap membantu kapan pun lewat chat.' },
    ],
  },
  gallery: {
    enabled: false,
    eyebrow: 'Galeri',
    title: 'Lumbung Arta bersama pengguna',
    subtitle: 'Momen bersama komunitas dan mitra kami.',
    items: [
      { image: '', caption: 'Edukasi keuangan bersama komunitas UMKM' },
      { image: '', caption: 'Tim produk Lumbung Arta di Jakarta' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Bergabung dengan jutaan pengguna yang mengatur uang lebih cerdas',
    items: [
      {
        name: 'Rina Andriani',
        role: 'Pemilik usaha katering, Surabaya',
        quote: 'Pemasukan usaha dan kebutuhan rumah sekarang terpisah rapi. Laporan bulanannya membantu saya menentukan harga jual.',
        photo: '',
      },
      {
        name: 'Fajar Nugroho',
        role: 'Karyawan swasta, Bekasi',
        quote: 'Pengingat tagihannya menyelamatkan saya dari denda keterlambatan. Tampilannya juga mudah dipahami.',
        photo: '',
      },
      {
        name: 'Sri Wahyuni',
        role: 'Bendahara koperasi, Yogyakarta',
        quote: 'Pencatatan iuran anggota jadi lebih cepat dan transparan. Anggota bisa cek sendiri dari HP.',
        photo: '',
      },
    ],
  },
  cta: {
    enabled: true,
    title: 'Ambil kendali atas keuangan Anda hari ini',
    subtitle: 'Unduh aplikasinya dan mulai atur anggaran pertama Anda dalam lima menit.',
    button_label: 'Mulai Sekarang',
    button_url: '',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Butuh bantuan? Tim kami siap membantu',
    subtitle: 'Hubungi kami untuk pertanyaan produk, kerja sama, atau kemitraan koperasi.',
    address: 'Gedung Arta Lt. 9, Jl. Setia Budi Raya No. 21, Jakarta Selatan 12910',
    email: 'halo@lumbungarta.id',
    phone: '(021) 555-0921',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo Lumbung Arta, saya ingin bertanya tentang aplikasinya.',
    hours: 'Senin–Jumat, 08.00–20.00 WIB',
    maps_url: '',
  },
  footer: {
    enabled: true,
    description: 'Aplikasi keuangan untuk keluarga dan pelaku usaha Indonesia: tabungan, pembayaran, dan anggaran dalam satu tempat.',
    copyright: '',
    instagram: 'https://instagram.com/lumbungarta',
    facebook: 'https://facebook.com/lumbungarta',
    linkedin: 'https://linkedin.com/company/lumbungarta',
    youtube: 'https://youtube.com/@lumbungarta',
    tiktok: '',
  },
};
