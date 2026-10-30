// Konten demo Kemudi: rental mobil FIKTIF "Kemudi Rent Car" di Bandung (alamat garasi, harga, pelanggan, email, dan
// nomor adalah contoh). Enam mobil dari lima kelas, semuanya ditulis sebagai KELAS + "atau setara" (tanpa merek/tipe).
// Salinan singkat berbahasa Indonesia, tanpa klaim izin/asuransi/sertifikat sebagai fakta. Formulir hanya menyusun
// pesan WhatsApp: tidak ada pembayaran online; ketersediaan dan harga final dikonfirmasi admin; dokumen tidak diunggah
// atau disimpan di website. Harga = contoh.
import type { SiteContent } from '../types';
import { kemudiPhoto } from './photos';

/** Warna tema bawaan: biru elektrik (putih di atasnya 5,85:1; sebagai teks di putih 5,85:1, di abu 5,31:1). */
export const KEMUDI_ACCENT = '#0050FF';

const BRAND = 'Kemudi Rent Car';

export const kemudiContent: SiteContent = {
  brand: {
    company_name: BRAND,
    tagline: 'Rental mobil lepas kunci & dengan sopir',
    logo: '',
    accent_color: KEMUDI_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Rental mobil Bandung',
    title: 'Sewa mobil tanpa ribet, harga jelas.',
    highlight: 'harga jelas.',
    subtitle: 'Lepas kunci atau dengan sopir di Bandung. Pilih mobil dan jadwal, lihat perkiraan harganya, lalu pesan langsung lewat WhatsApp.',
    image: kemudiPhoto('hero'),
    link_label: 'Lihat semua mobil',
    card_title: 'Pesan mobil',
    button_label: 'Pesan via WhatsApp',
    card_note: 'Harga perkiraan; ketersediaan dikonfirmasi admin. Tidak ada pembayaran online.',
    header_label: 'Pesan Mobil',
    header_url: '',
  },
  fleet: {
    enabled: true,
    eyebrow: 'Mobil',
    title: 'Pilih mobil Anda',
    subtitle: 'Enam mobil dari lima kelas, untuk harian di kota sampai rombongan ke luar kota.',
    book_label: 'Pesan',
    price_note: 'Harga contoh per unit; harga final dikonfirmasi admin via WhatsApp.',
    items: [
      { name: 'City car', class: 'City car', seats: '5', transmission: 'Otomatis', fuel: 'Bensin', luggage: '2', price_12: '250000', price_24: '325000', price_driver: '525000', price_out: '+Rp50.000/hari', image: '' },
      { name: 'MPV keluarga', class: 'MPV', seats: '7', transmission: 'Otomatis', fuel: 'Bensin', luggage: '3', price_12: '350000', price_24: '450000', price_driver: '650000', price_out: '+Rp75.000/hari', image: '' },
      { name: 'MPV hemat', class: 'MPV', seats: '7', transmission: 'Manual', fuel: 'Bensin', luggage: '3', price_12: '300000', price_24: '375000', price_driver: '600000', price_out: '+Rp75.000/hari', image: '' },
      { name: 'SUV', class: 'SUV', seats: '7', transmission: 'Otomatis', fuel: 'Diesel', luggage: '4', price_12: '850000', price_24: '1100000', price_driver: '1300000', price_out: '+Rp100.000/hari', image: '' },
      { name: 'MPV premium', class: 'MPV premium', seats: '7', transmission: 'Otomatis', fuel: 'Bensin', luggage: '4', price_12: '750000', price_24: '950000', price_driver: '1150000', price_out: '+Rp100.000/hari', image: '' },
      { name: 'Minibus', class: 'Minibus', seats: '14', transmission: 'Manual', fuel: 'Diesel', luggage: '6', price_12: '', price_24: '', price_driver: '1250000', price_out: '+Rp150.000/hari', image: '' },
    ],
  },
  film: {
    enabled: true,
    eyebrow: 'Proses',
    title: 'Mobil siap, Anda tinggal jalan',
    subtitle: 'Setiap unit melewati empat tahap sebelum kuncinya sampai di tangan Anda.',
    car_label: 'MPV 7 kursi',
    chapters: [
      { title: 'Rancang', text: 'Unit dipilih sesuai jadwal dan jumlah penumpang Anda.' },
      { title: 'Cek', text: 'Mesin, ban, rem, dan AC dicek sebelum serah terima.' },
      { title: 'Siap', text: 'Kabin bersih dan BBM penuh saat diserahkan.' },
      { title: 'Jalan', text: 'Ambil sendiri di garasi, atau mobil kami antar.' },
    ],
    // Urutan = posisi di gambar, dibaca seperti huruf Z: kaca tengah, atap, panel belakang (tutup BBM), roda depan
    callouts: [
      { text: '7 kursi + 3 koper' },
      { text: 'AC dingin, 2 blower' },
      { text: 'Diserahkan dengan BBM penuh' },
      { text: 'Dicek & dibersihkan tiap serah terima' },
    ],
    final_title: 'Diantar ke lokasi Anda',
    final_text: 'Rumah, hotel, stasiun, atau bandara. Biaya antar sesuai zona.',
  },
  pricing: {
    enabled: true,
    eyebrow: 'Harga',
    title: 'Harga sewa per hari',
    subtitle: 'Harga contoh per unit. Pilih kolom sesuai layanan yang Anda perlukan.',
    note: 'Harga contoh; lepas kunci belum termasuk BBM, tol, parkir. Harga final dikonfirmasi admin.',
    image: kemudiPhoto('interior'),
    included_title: 'Sudah termasuk',
    included: [
      { text: 'Mobil dicek sebelum diserahkan' },
      { text: 'Kabin bersih dan wangi' },
      { text: 'STNK asli di dalam mobil' },
      { text: 'Bantuan admin lewat WhatsApp' },
    ],
  },
  requirements: {
    enabled: true,
    eyebrow: 'Syarat',
    title: 'Syarat sewa',
    subtitle: 'Siapkan dokumen ini sebelum serah terima.',
    self_label: 'Lepas kunci',
    self_image: kemudiPhoto('kunci'),
    self_docs: [
      { title: 'KTP asli', text: 'Atas nama penyewa, dicek saat serah terima.' },
      { title: 'SIM A aktif', text: 'Wajib untuk penyewa yang mengemudi.' },
      { title: 'Identitas tambahan', text: 'KK, kartu pegawai, atau paspor (salah satu).' },
      { title: 'Deposit', text: 'Besarnya dijelaskan admin; dikembalikan setelah mobil dicek.' },
    ],
    self_rules: [
      { text: 'Kembalikan dengan BBM setara saat diambil.' },
      { text: 'Pemakaian ke luar kota memakai tarif luar kota.' },
      { text: 'Telat lebih dari 2 jam dihitung satu blok 12 jam.' },
    ],
    driver_label: 'Dengan sopir',
    driver_image: kemudiPhoto('sopir'),
    driver_docs: [
      { title: 'Identitas pemesan', text: 'KTP atau paspor salah satu penumpang.' },
      { title: 'Jadwal & titik jemput', text: 'Jam jemput, alamat, dan jumlah penumpang.' },
      { title: 'Rencana rute', text: 'Untuk perkiraan biaya tol, parkir, dan BBM.' },
      { title: 'Uang muka', text: 'Besarnya sesuai kesepakatan dengan admin.' },
    ],
    driver_rules: [
      { text: 'Harga per 12 jam sudah termasuk sopir.' },
      { text: 'BBM, tol, parkir, dan makan sopir sesuai kesepakatan.' },
      { text: 'Sopir cadangan untuk perjalanan jauh.' },
    ],
    note: 'Dokumen dicek langsung saat serah terima; website tidak mengunggah atau menyimpan dokumen Anda.',
  },
  delivery: {
    enabled: true,
    eyebrow: 'Antar-jemput',
    title: 'Antar-jemput mobil',
    subtitle: 'Mobil diantar ke rumah, hotel, stasiun, atau bandara. Biaya sesuai zona.',
    garage_label: 'Garasi Kemudi',
    note: 'Di luar zona ini? Tanya admin. Waktu tempuh perkiraan; biaya antar dikonfirmasi admin.',
    zones: [
      { name: 'Pusat kota Bandung', detail: '± 15 menit dari garasi', fee: 'Gratis', image: kemudiPhoto('kota') },
      { name: 'Stasiun Bandung', detail: '± 20 menit dari garasi', fee: '+Rp50.000', image: kemudiPhoto('stasiun') },
      { name: 'Bandara Husein Sastranegara', detail: '± 25 menit dari garasi', fee: '+Rp75.000', image: kemudiPhoto('bandara') },
      { name: 'Lembang & Dago Atas', detail: '± 45 menit dari garasi', fee: '+Rp100.000', image: kemudiPhoto('lembang') },
    ],
  },
  steps: {
    enabled: true,
    eyebrow: 'Cara sewa',
    title: 'Empat langkah sewa mobil',
    subtitle: 'Dari pilih mobil sampai kunci kembali, semuanya lewat chat.',
    items: [
      { title: 'Pilih mobil & jadwal', text: 'Isi formulir di atas atau chat admin langsung.' },
      { title: 'Konfirmasi admin', text: 'Ketersediaan dan harga final dikirim lewat WhatsApp.' },
      { title: 'Serah terima', text: 'Dokumen dicek, mobil diantar atau diambil di garasi.' },
      { title: 'Kembalikan mobil', text: 'Kondisi dicek bersama, deposit dikembalikan.' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Ulasan',
    title: 'Pengalaman menyewa di Kemudi',
    subtitle: 'Cerita singkat dari penyewa lepas kunci dan dengan sopir.',
    image: kemudiPhoto('keluarga'),
    items: [
      { quote: 'Mobil datang ke hotel jam tujuh pagi, bersih dan BBM penuh. Liburan keluarga jadi santai.', name: 'Rina', place: 'Liburan keluarga, Jakarta', rating: '5' },
      { quote: 'Dua hari keliling Lembang dan Ciwidey dengan sopir. Sopirnya sabar dan hafal jalan alternatif.', name: 'Dimas', place: 'Perjalanan kantor, Surabaya', rating: '5' },
      { quote: 'Prosesnya jelas: harga, deposit, dan syarat dijelaskan sebelum serah terima.', name: 'Sari', place: 'Lepas kunci, Bandung', rating: '4' },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: 'FAQ',
    title: 'Tanya jawab sewa mobil',
    subtitle: 'Masih ada yang belum jelas? Kirim saja pertanyaannya.',
    link_label: 'Chat admin di WhatsApp',
    link_url: '',
    image: kemudiPhoto('bersih'),
    image_caption: 'Dicuci & dicek tiap serah terima',
    items: [
      {
        question: 'Apakah harga di website sudah final?',
        answer: 'Belum. Harga di website adalah contoh; harga final dan ketersediaan mobil dikonfirmasi admin lewat WhatsApp.',
      },
      {
        question: 'Bagaimana cara membayar?',
        answer: 'Pembayaran dan deposit diatur admin saat konfirmasi atau di garasi. Website ini tidak menerima pembayaran online.',
      },
      {
        question: 'Bisakah lepas kunci ke luar kota?',
        answer: 'Bisa dengan tarif luar kota. Sebutkan tujuan Anda saat memesan agar admin menghitung biayanya.',
      },
      {
        question: 'Bagaimana jika terlambat mengembalikan mobil?',
        answer: 'Kabari admin secepatnya. Kelebihan waktu dihitung per blok 12 jam sesuai tabel harga.',
      },
      {
        question: 'Apakah mobil bisa diantar ke hotel atau bandara?',
        answer: 'Bisa. Biaya antar mengikuti zona di bagian Antar-jemput dan dikonfirmasi admin.',
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Garasi & kontak',
    subtitle: 'Ambil mobil di garasi kami, atau minta diantar.',
    address: 'Jl. Kemudi Raya No. 12, Sukajadi, Kota Bandung, Jawa Barat',
    maps_query: 'Sukajadi, Kota Bandung, Jawa Barat',
    maps_url: '',
    phone: '081234567890',
    email: 'halo.kemudi@example.com',
    whatsapp: '081234567890',
    whatsapp_message: `Halo ${BRAND}, saya ingin bertanya tentang sewa mobil.`,
    hours: 'Garasi 07.00–21.00 · admin WhatsApp 24 jam',
  },
  footer: {
    enabled: true,
    cta_title: 'Butuh mobil hari ini?',
    cta_label: 'Chat admin',
    description: 'Rental mobil lepas kunci dan dengan sopir di Bandung, dari city car sampai minibus 14 kursi.',
    note: 'Harga dan ketersediaan contoh; dikonfirmasi admin.',
    copyright: '',
    instagram: 'https://instagram.com/kemudi.contoh',
    facebook: '',
    linkedin: '',
    youtube: '',
    tiktok: 'https://tiktok.com/@kemudi.contoh',
  },
};
