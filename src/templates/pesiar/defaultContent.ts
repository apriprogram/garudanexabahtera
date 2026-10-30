// Konten demo Pesiar: "Pesiar Bali", usaha private tour & sewa mobil dengan sopir FIKTIF di Denpasar (nama usaha, alamat
// jalan, sopir, tamu, harga, dan email adalah contoh). Salinan singkat berbahasa Indonesia ("Anda"). Harga = contoh per
// mobil ("mulai"), dikonfirmasi admin lewat WhatsApp; tiket masuk dan makan tidak termasuk; formulir hanya menyusun pesan
// WhatsApp (tanpa pembayaran online, tanpa pelacakan penerbangan). Mobil ditulis per kelas (Sedan, MPV, Minibus) tanpa
// merek. Durasi & harga tur = hasil perencana untuk sedan (2 jam jemput & antar + jam tiap tempat; paket 10 jam
// Rp750.000, jam tambahan Rp75.000): Ubud & Kintamani 10 jam, Uluwatu & Jimbaran 8 jam, Bedugul & Tanah Lot 9 jam,
// Lempuyang & Bali timur 11 jam (Rp825.000). Ubah bersamaan bila angka diganti.
import type { SiteContent } from '../types';
import { pesiarPhoto } from './photos';

/** Warna tema bawaan: bougainvillea (putih di atasnya 5,23:1). */
export const PESIAR_ACCENT = '#B5446E';

const BRAND = 'Pesiar Bali';

export const pesiarContent: SiteContent = {
  brand: {
    company_name: BRAND,
    tagline: 'Private tour & sewa mobil dengan sopir',
    logo: '',
    accent_color: PESIAR_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Ubud · Kintamani · Uluwatu',
    title: 'Bali dengan sopir pribadi Anda.',
    subtitle:
      'Tur sehari keliling Bali dan antar-jemput bandara. Rute Anda yang tentukan, harganya dihitung per mobil, bukan per orang.',
    image: pesiarPhoto('hero'),
    primary_label: 'Rancang tur',
    primary_url: '#rancang',
    secondary_label: 'Antar-jemput bandara',
    secondary_url: '#bandara',
    trust: [{ text: 'Harga per mobil' }, { text: 'Jemput di hotel' }, { text: 'Mobil ber-AC & air mineral' }],
    header_label: 'Pesan Tur',
    header_url: '',
  },
  tours: {
    enabled: true,
    eyebrow: 'Tur',
    title: 'Tur sehari favorit',
    subtitle: 'Harga per mobil, sudah dengan sopir dan BBM. Rute bisa Anda ubah sebelum berangkat.',
    book_label: 'Pesan tur ini',
    edit_label: 'Ubah rute',
    note: 'Harga contoh per mobil (sedan), bukan per orang. Tiket masuk dan makan belum termasuk.',
    items: [
      { name: 'Ubud & Kintamani', hours: '10', stops: 'Celuk, Ubud, Tegallalang, Kintamani, Tirta Empul', price: '750000', image: pesiarPhoto('ubud') },
      { name: 'Uluwatu & Jimbaran', hours: '8', stops: 'Nusa Dua, Uluwatu, Jimbaran', price: '750000', image: pesiarPhoto('uluwatu') },
      { name: 'Bedugul & Tanah Lot', hours: '9', stops: 'Jatiluwih, Bedugul, Tanah Lot', price: '750000', image: pesiarPhoto('tanahlot') },
      { name: 'Lempuyang & Bali timur', hours: '11', stops: 'Lempuyang, Tirta Gangga, Taman Ujung', price: '825000', image: pesiarPhoto('lempuyang') },
    ],
  },
  planner: {
    enabled: true,
    eyebrow: 'Rancang',
    title: 'Rancang tur sendiri',
    subtitle: 'Pilih hingga 5 tempat. Durasi tiap tempat sudah termasuk perkiraan waktu tempuh.',
    base_hours: '10',
    buffer_hours: '2',
    pickup_areas: 'Seminyak, Kuta, Legian, Canggu, Jimbaran, Nusa Dua, Sanur, Ubud',
    destinations: [
      { name: 'Celuk', area: 'Gianyar', hours: '1' },
      { name: 'Ubud', area: 'Gianyar', hours: '2' },
      { name: 'Tegallalang', area: 'Ubud utara', hours: '1,5' },
      { name: 'Kintamani', area: 'Bangli', hours: '2' },
      { name: 'Tirta Empul', area: 'Tampaksiring', hours: '1,5' },
      { name: 'Jatiluwih', area: 'Tabanan', hours: '2' },
      { name: 'Bedugul', area: 'Tabanan', hours: '2,5' },
      { name: 'Tanah Lot', area: 'Tabanan', hours: '2,5' },
      { name: 'Nusa Dua', area: 'Badung selatan', hours: '1,5' },
      { name: 'Uluwatu', area: 'Bukit', hours: '2,5' },
      { name: 'Jimbaran', area: 'Bukit', hours: '2' },
      { name: 'Lempuyang', area: 'Karangasem', hours: '5,5' },
      { name: 'Tirta Gangga', area: 'Karangasem', hours: '2' },
      { name: 'Taman Ujung', area: 'Karangasem', hours: '1,5' },
    ],
    button_label: 'Kirim ke WhatsApp',
    note: 'Formulir hanya menyusun pesan WhatsApp; harga contoh per mobil, tiket masuk dan makan tidak termasuk. Tidak ada pembayaran online.',
  },
  film: {
    enabled: true,
    eyebrow: 'Perjalanan',
    title: 'Sehari bersama sopir Anda',
    subtitle: 'Contoh tur Ubud & Kintamani, dari jemput di hotel sampai kembali sore hari.',
    note: 'Rute contoh. Waktu tempuh perkiraan dan mengikuti lalu lintas.',
    stops: [
      { time: '08.00', name: 'Seminyak', text: 'Sopir menjemput di lobi hotel. Air mineral sudah di mobil.', image: pesiarPhoto('seminyak') },
      { time: '09.30', name: 'Celuk', text: 'Desa perajin perak. Lihat perhiasan dibuat dengan tangan.', image: pesiarPhoto('celuk') },
      { time: '11.00', name: 'Tegallalang', text: 'Sawah terasering. Waktu santai untuk berjalan dan berfoto.', image: pesiarPhoto('tegallalang') },
      { time: '13.00', name: 'Kintamani', text: 'Makan siang menghadap Gunung dan Danau Batur.', image: pesiarPhoto('kintamani') },
      { time: '15.30', name: 'Tirta Empul', text: 'Pura mata air suci di Tampaksiring.', image: pesiarPhoto('tirtaempul') },
      { time: '18.00', name: 'Seminyak', text: 'Kembali ke hotel saat matahari terbenam.', image: pesiarPhoto('senja') },
    ],
  },
  transfer: {
    enabled: true,
    eyebrow: 'Bandara',
    title: 'Antar-jemput bandara',
    subtitle: 'Sopir menunggu di pintu kedatangan dengan papan nama Anda.',
    image: pesiarPhoto('bandara'),
    zones: [
      { name: 'Kuta & Legian', time: '± 20 menit', price_1: '200000', price_2: '250000', price_3: '350000', price_4: '' },
      { name: 'Seminyak & Canggu', time: '± 40 menit', price_1: '250000', price_2: '300000', price_3: '400000', price_4: '' },
      { name: 'Nusa Dua & Jimbaran', time: '± 30 menit', price_1: '250000', price_2: '300000', price_3: '400000', price_4: '' },
      { name: 'Ubud', time: '± 90 menit', price_1: '350000', price_2: '400000', price_3: '550000', price_4: '' },
      { name: 'Sanur', time: '± 30 menit', price_1: '250000', price_2: '300000', price_3: '400000', price_4: '' },
    ],
    notes: [{ text: 'Papan nama di pintu kedatangan' }, { text: 'Tunggu hingga 60 menit' }, { text: 'Bantu angkat koper' }, { text: 'Air mineral di mobil' }],
    form_title: 'Pesan antar-jemput',
    form_button: 'Susun pesan WhatsApp',
    form_note: 'Formulir hanya menyusun pesan WhatsApp. Tidak ada pembayaran online dan tidak ada pelacakan penerbangan otomatis.',
  },
  cars: {
    enabled: true,
    eyebrow: 'Mobil & sopir',
    title: 'Mobil nyaman, sopir yang paham jalan',
    subtitle: 'Semua mobil ber-AC dan dicek sebelum berangkat. Kami menyebut kelas mobil, bukan merek.',
    items: [
      { name: 'Sedan', seats: '4', luggage: '2 koper', price: '750000', overtime: '75000', image: '' },
      { name: 'MPV', seats: '6', luggage: '3 koper', price: '850000', overtime: '85000', image: '' },
      { name: 'Minibus', seats: '12', luggage: '8 koper', price: '1100000', overtime: '110000', image: '' },
    ],
    note: 'Harga contoh per mobil; dikonfirmasi admin lewat WhatsApp.',
    drivers_title: 'Sopir kami',
    drivers: [
      { name: 'Wayan Sudarsa', languages: 'Indonesia, Inggris' },
      { name: 'Made Arimbawa', languages: 'Indonesia, Inggris, Jepang' },
      { name: 'Komang Ayu Lestari', languages: 'Indonesia, Inggris' },
      { name: 'Ketut Widana', languages: 'Indonesia, Inggris, Jerman' },
    ],
  },
  included: {
    enabled: true,
    eyebrow: 'Harga',
    title: 'Sudah & belum termasuk',
    subtitle: 'Harga dihitung per mobil, bukan per orang.',
    yes_title: 'Sudah termasuk',
    yes: [
      { text: 'Mobil ber-AC dan BBM' },
      { text: 'Sopir selama paket 10 jam' },
      { text: 'Parkir dan tol' },
      { text: 'Air mineral di mobil' },
      { text: 'Jemput & antar di hotel' },
    ],
    no_title: 'Belum termasuk',
    no: [{ text: 'Tiket masuk tempat wisata' }, { text: 'Makan dan minum' }, { text: 'Pengeluaran pribadi' }, { text: 'Tip untuk sopir (sukarela)' }],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Cerita tamu',
    title: 'Catatan kecil dari kursi belakang',
    items: [
      { quote: 'Sopirnya sabar menunggu di Tegallalang, lalu menyarankan tempat makan siang dengan pemandangan Batur.', name: 'Rina', place: 'Keluarga dari Surabaya' },
      { quote: 'Pesawat kami terlambat hampir satu jam, tetapi sopir tetap menunggu dengan papan nama.', name: 'Daniel', place: 'Pasangan dari Jakarta' },
      { quote: 'Kami berenam, jadi harga per mobil jauh lebih hemat. Rutenya juga bisa diubah di jalan.', name: 'Sari', place: 'Rombongan teman, Bandung' },
      { quote: 'Mobilnya bersih dan dingin. Anak-anak tidur nyenyak di perjalanan pulang dari Bedugul.', name: 'Hendra', place: 'Keluarga dari Malang' },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: 'FAQ',
    title: 'Jawaban untuk rencana tur Anda',
    subtitle: 'Harga per mobil, jam tur, sampai penjemputan di bandara.',
    link_label: 'Sapa kami di WhatsApp',
    link_url: '',
    items: [
      {
        question: 'Apakah harga dihitung per orang?',
        answer: 'Tidak. Harga dihitung per mobil untuk paket 10 jam, jadi satu mobil bisa dipakai bersama keluarga atau teman.',
      },
      {
        question: 'Bagaimana jika tur lebih dari 10 jam?',
        answer: 'Jam tambahan dihitung per jam sesuai mobil yang dipilih. Perkiraannya terlihat di bagian Rancang tur sendiri.',
      },
      {
        question: 'Apa saja yang belum termasuk?',
        answer: 'Tiket masuk tempat wisata, makan dan minum, serta pengeluaran pribadi. Tip untuk sopir bersifat sukarela.',
      },
      {
        question: 'Bagaimana cara membayar?',
        answer: 'Setelah jadwal dikonfirmasi lewat WhatsApp, admin menjelaskan cara pembayarannya. Website ini tidak memproses pembayaran.',
      },
      {
        question: 'Bagaimana jika penerbangan saya terlambat?',
        answer: 'Kabari kami lewat WhatsApp. Sopir menunggu hingga 60 menit dari jadwal mendarat; lebih dari itu dibicarakan bersama.',
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Kirim rute Anda, kami siapkan sopirnya',
    subtitle: 'Kantor kami di Denpasar; sopir menjemput di seluruh area layanan.',
    address: 'Jl. Bunga Kertas No. 8, Denpasar Selatan, Bali',
    maps_query: 'Denpasar Selatan, Bali',
    maps_url: '',
    phone: '081234567890',
    email: 'halo@example.com',
    whatsapp: '081234567890',
    whatsapp_message: `Halo ${BRAND}, saya ingin bertanya tentang tur pribadi.`,
    hours: 'Setiap hari 07.00–21.00 WITA',
  },
  footer: {
    enabled: true,
    image: pesiarPhoto('panorama'),
    description: 'Private tour dan antar-jemput bandara di Bali dengan sopir pribadi. Harga dihitung per mobil.',
    note: 'Harga dan rute di situs ini contoh; konfirmasi lewat WhatsApp.',
    copyright: '',
    instagram: 'https://instagram.com/pesiarbali.contoh',
    facebook: '',
    linkedin: '',
    youtube: 'https://youtube.com/@pesiarbali.contoh',
    tiktok: 'https://tiktok.com/@pesiarbali.contoh',
  },
};
