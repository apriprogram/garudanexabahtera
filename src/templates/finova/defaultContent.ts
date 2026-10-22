// Konten bawaan Finova: Lumbung Arta (aplikasi tabungan, pembayaran, dan anggaran FIKTIF, Jakarta Selatan).
// Brief: docs/platform/TEMPLATE-BRIEFS-2026-10.md §3. Salinan demo sengaja tanpa klaim izin/regulator, suku bunga,
// imbal hasil, atau jaminan keuntungan (§3.9): pembeli menambahkan sendiri sesuai izin usahanya. Nama orang di
// testimoni fiktif dan tidak berhubungan dengan orang di foto.
import type { SiteContent } from '../types';
import { finovaPhoto } from './photos';

/** Hijau hutan dari referensi (blok CTA & kartu angka). Teks di atas aksen otomatis putih. */
export const FINOVA_ACCENT = '#1F4D43';
/** Hijau limau untuk tombol utama, chip, dan sorotan di latar gelap (`brand.highlight_color`). */
export const FINOVA_HIGHLIGHT = '#D4F27A';

const PARTNER_LOGO = (file: string) => `/assets/templates/logos/finova-partner-${file}.svg`;

export const finovaContent: SiteContent = {
  brand: {
    company_name: 'Lumbung Arta',
    tagline: 'Kelola uang keluarga dengan lebih tenang',
    logo: '',
    accent_color: FINOVA_ACCENT,
    highlight_color: FINOVA_HIGHLIGHT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Tabungan, pembayaran, dan anggaran dalam satu aplikasi',
    title: 'Kelola uang lebih tenang dan cerdas',
    highlight: 'tenang dan cerdas',
    subtitle:
      'Catat pengeluaran, atur anggaran, dan bayar tagihan dari satu aplikasi. Lumbung Arta membantu keluarga, UMKM, dan koperasi mengambil keputusan keuangan dengan lebih yakin.',
    primary_label: 'Mulai Gratis',
    primary_url: '',
    secondary_label: 'Lihat Fitur',
    secondary_url: '',
    image: finovaPhoto('hero'),
    balance_label: 'Saldo tabungan keluarga',
    balance_value: 'Rp12.480.000',
    balance_caption: '+Rp1.250.000 bulan ini',
    chips: [
      { label: 'Bayar listrik', value: '−Rp350.000' },
      { label: 'Cashback tagihan', value: '+Rp25.000' },
    ],
    proof_value: '2,4 jt+',
    proof_text: 'Keluarga dan pelaku usaha sudah mengatur uangnya bersama kami.',
  },
  clients: {
    enabled: true,
    title: 'Bekerja sama dengan mitra pembayaran tepercaya',
    items: [
      { name: 'Bayarin', logo: PARTNER_LOGO('bayarin-cepat') },
      { name: 'Kas Nusa', logo: PARTNER_LOGO('kas-nusa') },
      { name: 'Teras Dagang', logo: PARTNER_LOGO('teras-dagang') },
      { name: 'Rumah Koperasi', logo: PARTNER_LOGO('rumah-koperasi') },
      { name: 'Jaring Kirim', logo: PARTNER_LOGO('jaring-kirim') },
      { name: 'Pundi Mitra', logo: PARTNER_LOGO('pundi-mitra') },
    ],
  },
  advantages: {
    enabled: true,
    title: 'Lumbung Arta dalam angka',
    stats: [
      { value: '2,4 jt+', label: 'Pengguna terdaftar' },
      { value: '120+', label: 'Kota di Indonesia' },
      { value: '1.500+', label: 'Koperasi & UMKM mitra' },
      { value: '4,8', label: 'Rating di toko aplikasi' },
    ],
  },
  about: {
    enabled: true,
    eyebrow: 'Produk',
    title: 'Keuangan lebih rapi, keputusan lebih tepat',
    body:
      'Semua rekening, dompet digital, dan kartu Anda terangkum dalam satu tampilan. Lihat ke mana uang mengalir setiap hari, lalu atur anggaran yang realistis untuk keluarga atau usaha.',
    points: [
      { text: 'Cashback untuk pembayaran tagihan rutin' },
      { text: 'Pengingat tagihan sebelum jatuh tempo' },
      { text: 'Laporan bulanan yang mudah dibaca' },
    ],
    button_label: 'Lihat Cara Kerja',
    button_url: '',
    image: '',
    mock_title: 'Pengeluaran minggu ini',
    mock_value: 'Rp1.259.750',
    mock_caption: '12% lebih hemat dari minggu lalu',
    mock_list_title: 'Rekening & kartu',
    mock_items: [
      { label: 'Tabungan keluarga', value: 'Rp8.250.000', meta: '•••• 4141' },
      { label: 'Kas usaha katering', value: 'Rp3.760.000', meta: '•••• 8345' },
      { label: 'Kartu virtual belanja', value: 'Rp470.000', meta: '•••• 2207' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Fitur',
    title: 'Sederhana, cepat, dan tanpa ribet',
    subtitle: 'Daftar dalam hitungan menit, hubungkan akun Anda, lalu kelola keuangan keluarga maupun usaha dari mana saja.',
    stat_value: '120+',
    stat_label: 'Kota sudah terlayani',
    items: [
      {
        title: 'Hubungkan rekening & kartu',
        description: 'Satukan rekening bank, dompet digital, dan kartu dalam satu aplikasi. Saldo diperbarui otomatis setiap hari.',
        image: finovaPhoto('card'),
      },
      {
        title: 'Pantau arus kas usaha',
        description: 'Pisahkan uang usaha dan rumah tangga, lalu lihat laporan pemasukan dan pengeluaran yang mudah dibaca.',
        image: finovaPhoto('owner'),
      },
      {
        title: 'Buat akun dalam hitungan menit',
        description: 'Verifikasi data secara online dari kota mana pun di Indonesia, tanpa perlu datang ke kantor.',
        image: '',
      },
      {
        title: 'Iuran koperasi lebih transparan',
        description: 'Pengurus mencatat iuran anggota dengan cepat, anggota bisa memeriksa sendiri dari HP.',
        image: finovaPhoto('community'),
      },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Bergabung dengan jutaan pengguna yang mengatur uang lebih cerdas',
    items: [
      {
        name: 'Sri Wahyuni',
        role: 'Bendahara koperasi, Yogyakarta',
        quote: 'Pencatatan iuran anggota jadi jauh lebih cepat dan transparan. Anggota bisa cek sendiri dari HP, rapat bulanan pun lebih singkat.',
        photo: finovaPhoto('portrait-1'),
      },
      {
        name: 'Fajar Nugroho',
        role: 'Karyawan swasta, Bekasi',
        quote: 'Pengingat tagihannya menyelamatkan saya dari denda keterlambatan. Tampilannya juga mudah dipahami orang tua saya.',
        photo: finovaPhoto('portrait-2'),
      },
      {
        name: 'Rina Andriani',
        role: 'Pemilik usaha katering, Surabaya',
        quote: 'Pemasukan usaha dan kebutuhan rumah sekarang terpisah rapi. Laporan bulanannya membantu saya menentukan harga jual.',
        photo: finovaPhoto('portrait-3'),
      },
      {
        name: 'Bayu Pratama',
        role: 'Konsultan keuangan keluarga, Bandung',
        quote: 'Klien saya lebih mudah diajak menyusun anggaran karena datanya sudah rapi di satu tempat. Diskusi jadi lebih fokus.',
        photo: finovaPhoto('portrait-4'),
      },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: 'Tanya jawab',
    title: 'Pertanyaan yang sering diajukan',
    subtitle: 'Belum menemukan jawabannya? Tim kami siap membantu lewat chat setiap hari kerja.',
    help_title: 'Masih bingung? Tanya langsung ke tim kami',
    image: finovaPhoto('app'),
    button_label: 'Tanya lewat WhatsApp',
    button_url: '',
    items: [
      {
        question: 'Apakah Lumbung Arta bisa dipakai gratis?',
        answer: 'Bisa. Fitur pencatatan, anggaran, dan pengingat tagihan bisa dipakai gratis. Biaya transaksi tertentu selalu ditampilkan jelas sebelum Anda menyetujuinya.',
      },
      {
        question: 'Bagaimana data saya dijaga?',
        answer: 'Data dienkripsi saat dikirim maupun disimpan, dan Anda yang menentukan rekening mana saja yang terhubung. Akses bisa dicabut kapan pun dari menu Pengaturan.',
      },
      {
        question: 'Bisakah dipakai untuk usaha atau koperasi?',
        answer: 'Bisa. Pisahkan kas usaha dari keuangan rumah tangga, catat iuran anggota koperasi, lalu unduh laporan bulanan untuk rapat pengurus.',
      },
      {
        question: 'Berapa lama proses pendaftaran?',
        answer: 'Umumnya kurang dari lima menit. Siapkan nomor HP dan email aktif, lalu ikuti langkah verifikasi di aplikasi.',
      },
      {
        question: 'Ke mana saya menghubungi bila ada kendala?',
        answer: 'Hubungi tim kami lewat WhatsApp atau email di bagian Kontak. Rata-rata balasan pertama kurang dari 15 menit pada jam layanan.',
      },
    ],
  },
  cta: {
    enabled: true,
    title: 'Ambil kendali atas keuangan Anda hari ini',
    subtitle: 'Unduh aplikasinya dan susun anggaran pertama Anda dalam lima menit.',
    button_label: 'Mulai Sekarang',
    button_url: '',
    app_store_label: 'App Store',
    app_store_url: 'https://apps.apple.com/id/app/lumbung-arta/id6740000000',
    play_store_label: 'Google Play',
    play_store_url: 'https://play.google.com/store/apps/details?id=id.lumbungarta.app',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Butuh bantuan? Tim kami siap membantu',
    subtitle: 'Hubungi kami untuk pertanyaan produk, kerja sama, atau kemitraan koperasi dan UMKM.',
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
    description: 'Aplikasi keuangan untuk keluarga, UMKM, dan koperasi di Indonesia: tabungan, pembayaran, dan anggaran dalam satu tempat.',
    links: [
      { group: 'Produk', label: 'Fitur', url: '#layanan' },
      { group: 'Produk', label: 'Cara kerja', url: '#tentang' },
      { group: 'Produk', label: 'Testimoni', url: '#testimoni' },
      { group: 'Produk', label: 'Tanya jawab', url: '#faq' },
      { group: 'Solusi', label: 'Keluarga', url: '#layanan' },
      { group: 'Solusi', label: 'UMKM', url: '#layanan' },
      { group: 'Solusi', label: 'Koperasi', url: '#layanan' },
      { group: 'Solusi', label: 'Konsultan keuangan', url: '#kontak' },
      { group: 'Perusahaan', label: 'Tentang kami', url: '#tentang' },
      { group: 'Perusahaan', label: 'Kemitraan', url: '#kontak' },
      { group: 'Perusahaan', label: 'Hubungi kami', url: '#kontak' },
    ],
    copyright: '',
    legal_note: 'Tampilan saldo dan transaksi di halaman ini adalah ilustrasi.',
    instagram: 'https://instagram.com/lumbungarta',
    facebook: 'https://facebook.com/lumbungarta',
    linkedin: 'https://linkedin.com/company/lumbungarta',
    youtube: 'https://youtube.com/@lumbungarta',
    tiktok: '',
  },
};
