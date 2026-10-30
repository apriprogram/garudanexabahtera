// Konten demo Nusaline: PO bus malam FIKTIF dengan kantor pusat di Jakarta Timur (jalan fiktif) dan keberangkatan harian
// Jakarta–Semarang–Yogyakarta–Surabaya–Malang–Denpasar. Jadwal, harga, agen, penumpang, alamat, dan email adalah
// contoh. Nama terminal (Pulo Gebang, Giwangan, Purabaya, dll.) tempat nyata; agen di sana fiktif. Salinan singkat
// berbahasa Indonesia, tanpa klaim izin/sertifikat/asuransi sebagai fakta, tanpa merek/tipe kendaraan. Pemesanan hanya
// menyusun pesan WhatsApp: tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time.
// Angka di salinan = data: 6 kota di rute, 3 kelas, jarak film 780 km (Jakarta–Surabaya, perkiraan).
import type { SiteContent } from '../types';
import { nusalinePhoto } from './photos';

/** Warna tema bawaan: raspberry (putih di atasnya 4,93:1). */
export const NUSALINE_ACCENT = '#D81E5B';

const BRAND = 'Nusaline';

export const nusalineContent: SiteContent = {
  brand: {
    company_name: BRAND,
    tagline: 'Bus malam Jakarta–Bali setiap hari',
    logo: '',
    accent_color: NUSALINE_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Bus malam · berangkat tiap hari',
    title: 'Tidur nyenyak, bangun di kota tujuan.',
    highlight: 'kota tujuan',
    subtitle: 'Bus malam dari Jakarta ke Semarang, Yogyakarta, Surabaya, Malang, dan Denpasar. Pilih kelas, lalu pesan tiket lewat WhatsApp.',
    image: nusalinePhoto('hero'),
    primary_label: 'Pilih kelas',
    secondary_label: 'Lihat rute',
    search_title: 'Jadwal bus malam',
    search_button: 'Cari jadwal',
    board_title: 'Berangkat malam ini',
    header_label: 'Cek Jadwal',
    header_url: '',
  },
  schedule: {
    enabled: true,
    eyebrow: 'Jadwal',
    title: 'Jadwal keberangkatan',
    subtitle: 'Berangkat setiap hari dari agen kami. Pilih rute, lalu pesan lewat WhatsApp.',
    note: 'Jadwal dan harga contoh; kursi dikonfirmasi admin lewat WhatsApp.',
    book_label: 'Pesan',
    empty_text: 'Belum ada jadwal untuk pilihan ini.',
    items: [
      { from: 'Jakarta', to: 'Surabaya', depart: '17.00', duration: '13j 30m', class: 'Super Eksekutif', price: '420000' },
      { from: 'Jakarta', to: 'Surabaya', depart: '19.00', duration: '12 jam', class: 'Sleeper', price: '650000' },
      { from: 'Jakarta', to: 'Yogyakarta', depart: '19.30', duration: '10j 30m', class: 'Sleeper', price: '545000' },
      { from: 'Jakarta', to: 'Yogyakarta', depart: '18.00', duration: '11 jam', class: 'Eksekutif', price: '295000' },
      { from: 'Jakarta', to: 'Semarang', depart: '20.00', duration: '8j 30m', class: 'Eksekutif', price: '260000' },
      { from: 'Jakarta', to: 'Malang', depart: '16.00', duration: '15j 30m', class: 'Super Eksekutif', price: '470000' },
      { from: 'Jakarta', to: 'Denpasar', depart: '13.00', duration: '25 jam', class: 'Sleeper', price: '890000' },
      { from: 'Yogyakarta', to: 'Jakarta', depart: '18.30', duration: '11 jam', class: 'Eksekutif', price: '295000' },
      { from: 'Surabaya', to: 'Jakarta', depart: '17.30', duration: '12j 30m', class: 'Sleeper', price: '650000' },
      { from: 'Denpasar', to: 'Jakarta', depart: '12.00', duration: '26 jam', class: 'Super Eksekutif', price: '760000' },
    ],
  },
  classes: {
    enabled: true,
    eyebrow: 'Kelas',
    title: 'Pilih kelas perjalanan',
    subtitle: 'Tiga kelas untuk perjalanan malam. Semua ber‑AC dan berangkat dari agen yang sama.',
    book_label: 'Pesan kelas ini',
    note: 'Harga mulai contoh; harga final dari admin.',
    items: [
      {
        name: 'Eksekutif',
        layout: '2-2',
        seats: '32',
        legroom: '90 cm',
        features: 'Kursi rebah dengan sandaran kaki\nSelimut dan bantal\nPort USB di tiap kursi\nToilet di dalam bus\nSnack dan air mineral',
        // = harga termurah kelas ini di tabel jadwal (Jakarta → Semarang 20.00)
        price: '260000',
        image: nusalinePhoto('eksekutif'),
      },
      {
        name: 'Super Eksekutif',
        layout: '2-1',
        seats: '24',
        legroom: '110 cm',
        features: 'Kursi lebar, rebah lebih dalam\nSandaran kaki dan betis\nLampu baca pribadi\nPort USB di tiap kursi\nSnack dan air mineral',
        price: '420000',
        image: nusalinePhoto('premium'),
      },
      {
        name: 'Sleeper',
        layout: '1-1',
        seats: '20',
        legroom: '180 cm',
        features: 'Kabin pribadi bertirai\nKasur, bantal, dan selimut\nLampu baca dan port USB\nToilet di dalam bus\nSnack dan air mineral',
        price: '545000',
        // Tanpa foto: template menampilkan ilustrasi kabin tidur (foto kabin bus tidur asli belum tersedia di demo)
        image: '',
      },
    ],
  },
  film: {
    enabled: true,
    eyebrow: 'Perjalanan',
    title: 'Satu malam di dalam Nusaline',
    subtitle: 'Perjalanan Jakarta–Surabaya dalam satu malam, dari naik bus sampai pagi tiba.',
    distance: '780',
    chapters: [
      { time: '19.00', title: 'Boarding & snack', text: 'Bus berangkat dari agen. Snack dan air mineral dibagikan saat naik.' },
      { time: '22.30', title: 'Lampu kabin diredupkan', text: 'Tirai ditutup dan kabin tenang; lampu baca tetap bisa dinyalakan.' },
      { time: '03.30', title: 'Istirahat & salat subuh', text: 'Berhenti sekitar 30 menit di rest area untuk ke toilet dan salat.' },
      { time: '07.00', title: 'Tiba di Surabaya', text: 'Turun di agen tujuan, bagasi diambil di samping bus.' },
    ],
  },
  routes: {
    enabled: true,
    eyebrow: 'Rute',
    title: 'Rute & titik naik',
    subtitle: 'Satu jalur malam dari Jakarta sampai Bali. Pilih kota untuk melihat agen terdekat.',
    note: 'Alamat dan jam agen contoh; konfirmasi titik naik lewat WhatsApp.',
    link_label: 'Tanya titik naik',
    stops: [
      { city: 'Jakarta', code: 'JKT', image: nusalinePhoto('jakarta') },
      { city: 'Semarang', code: 'SMG', image: nusalinePhoto('semarang') },
      { city: 'Yogyakarta', code: 'YK', image: nusalinePhoto('yogyakarta') },
      { city: 'Surabaya', code: 'SBY', image: nusalinePhoto('surabaya') },
      { city: 'Malang', code: 'MLG', image: nusalinePhoto('malang') },
      { city: 'Denpasar', code: 'DPS', image: nusalinePhoto('bali') },
    ],
    points: [
      { city: 'Jakarta', name: 'Kantor Pusat Cakung', address: 'Jl. Lintas Malam No. 8, Cakung, Jakarta Timur', hours: '07.00–21.00' },
      { city: 'Jakarta', name: 'Agen Pulo Gebang', address: 'Terminal Terpadu Pulo Gebang, Jakarta Timur', hours: '14.00–20.00' },
      { city: 'Jakarta', name: 'Agen Kampung Rambutan', address: 'Terminal Kampung Rambutan, Jakarta Timur', hours: '14.00–19.30' },
      { city: 'Semarang', name: 'Agen Banyumanik', address: 'Jl. Kenari Senja No. 3, Banyumanik, Semarang', hours: '17.00–22.00' },
      { city: 'Semarang', name: 'Agen Mangkang', address: 'Terminal Mangkang, Semarang', hours: '16.00–21.00' },
      { city: 'Yogyakarta', name: 'Agen Giwangan', address: 'Terminal Giwangan, Umbulharjo, Yogyakarta', hours: '15.00–20.30' },
      { city: 'Yogyakarta', name: 'Agen Jombor', address: 'Terminal Jombor, Sleman', hours: '15.30–20.00' },
      { city: 'Surabaya', name: 'Agen Bungurasih', address: 'Terminal Purabaya (Bungurasih), Sidoarjo', hours: '14.00–20.00' },
      { city: 'Surabaya', name: 'Agen Dharmawangsa', address: 'Jl. Rembulan Timur No. 21, Gubeng, Surabaya', hours: '08.00–20.00' },
      { city: 'Malang', name: 'Agen Arjosari', address: 'Terminal Arjosari, Blimbing, Malang', hours: '13.00–17.00' },
      { city: 'Denpasar', name: 'Agen Mengwi', address: 'Terminal Mengwi, Badung', hours: '09.00–13.00' },
      { city: 'Denpasar', name: 'Agen Ubung', address: 'Jl. Bintang Pagi No. 5, Ubung, Denpasar', hours: '09.00–12.30' },
    ],
  },
  onboard: {
    enabled: true,
    eyebrow: 'Fasilitas',
    title: 'Fasilitas di kabin',
    subtitle: 'Yang Anda dapat di setiap perjalanan malam, dari selimut sampai camilan.',
    image: nusalinePhoto('cabin'),
    caption: 'Kabin redup saat malam',
    items: [
      { title: 'Selimut & bantal', text: 'Bersih untuk setiap perjalanan, dibagikan saat naik.' },
      { title: 'Port USB', text: 'Isi daya ponsel di setiap kursi dan kabin.' },
      { title: 'Toilet', text: 'Di bagian belakang bus, bisa dipakai sepanjang jalan.' },
      { title: 'Snack & air mineral', text: 'Satu paket camilan dan air untuk tiap penumpang.' },
      { title: 'Lampu baca', text: 'Tetap bisa dinyalakan saat lampu kabin redup.' },
      { title: 'Wi-Fi', text: 'Tergantung armada; tanyakan saat memesan.' },
    ],
    photos: [
      { image: nusalinePhoto('snack'), caption: 'Camilan untuk perjalanan' },
      { image: nusalinePhoto('bagasi'), caption: 'Bagasi di bawah bus' },
    ],
  },
  steps: {
    enabled: true,
    eyebrow: 'Cara pesan',
    title: 'Cara pesan tiket',
    subtitle: 'Tiga langkah dari pilih jadwal sampai naik bus.',
    note: 'Pemesanan hanya menyusun pesan WhatsApp; tidak ada pembayaran online, e-tiket, atau pilihan kursi real-time.',
    items: [
      { title: 'Pilih jadwal', text: 'Cek jam berangkat, kelas, dan harga mulai di tabel jadwal.' },
      { title: 'Kirim pesan WhatsApp', text: 'Tombol Pesan menyusun rute, tanggal, dan jumlah penumpang. Admin mengonfirmasi kursi.' },
      { title: 'Bayar & berangkat', text: 'Bayar sesuai arahan admin, lalu datang ke agen 30 menit sebelum berangkat.' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Cerita penumpang',
    title: 'Kesan setelah semalam di perjalanan',
    subtitle: 'Cerita singkat penumpang bus malam kami.',
    items: [
      { quote: 'Kabin sleeper-nya rapi dan tenang. Saya tidur sampai Surabaya, bangun sudah pagi.', name: 'Dimas', route: 'Jakarta → Surabaya · Sleeper' },
      { quote: 'Admin cepat membalas WhatsApp dan memberi kursi dekat jendela sesuai permintaan.', name: 'Rina', route: 'Jakarta → Yogyakarta · Eksekutif' },
      { quote: 'Berhenti di rest area pas subuh, jadi sempat salat dan minum teh hangat.', name: 'Pak Hendra', route: 'Jakarta → Malang · Super Eksekutif' },
      { quote: 'Pergi dengan dua anak, selimut dan bantalnya bersih. Anak-anak tidur sepanjang jalan.', name: 'Bu Sari', route: 'Jakarta → Denpasar · Sleeper' },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: 'FAQ',
    title: 'Sebelum Anda berangkat',
    subtitle: 'Ringkasan ketentuan kursi, bagasi, tiket anak, dan ubah jadwal.',
    link_label: 'Hubungi admin lewat WhatsApp',
    link_url: '',
    items: [
      {
        question: 'Bisakah memilih nomor kursi?',
        answer: 'Bisa diminta lewat WhatsApp. Admin mengonfirmasi kursi yang masih kosong; website ini tidak menampilkan kursi secara langsung.',
      },
      {
        question: 'Bagaimana cara membayar tiket?',
        answer: 'Pembayaran mengikuti arahan admin setelah kursi dikonfirmasi. Tidak ada pembayaran online di website ini.',
      },
      {
        question: 'Berapa batas bagasi?',
        answer: 'Satu koper besar di bagasi bawah dan satu tas kecil di kabin per penumpang. Barang besar tanyakan dulu ke admin.',
      },
      {
        question: 'Kapan harus tiba di agen?',
        answer: 'Paling lambat 30 menit sebelum jam berangkat untuk lapor dan menaruh bagasi.',
      },
      {
        question: 'Apakah anak perlu tiket sendiri?',
        answer: 'Anak yang memakai kursi sendiri memerlukan tiket. Tanyakan ketentuan untuk balita yang dipangku ke admin.',
      },
      {
        question: 'Bisakah mengubah jadwal keberangkatan?',
        answer: 'Bisa, sesuai ketentuan yang disampaikan admin saat konfirmasi. Hubungi kami paling lambat sehari sebelum berangkat.',
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Kantor pusat & call center',
    subtitle: 'Datang ke kantor pusat atau hubungi admin kami.',
    address: 'Jl. Lintas Malam No. 8, Cakung, Jakarta Timur 13910',
    maps_query: 'Cakung, Jakarta Timur',
    maps_url: '',
    phone: '081234567890',
    email: 'tiket@example.com',
    whatsapp: '081234567890',
    whatsapp_message: `Halo ${BRAND}, saya ingin bertanya tentang jadwal bus.`,
    hours: 'Kantor 07.00–21.00 · WhatsApp 24 jam',
  },
  footer: {
    enabled: true,
    description: 'Bus malam Jakarta, Semarang, Yogyakarta, Surabaya, Malang, dan Denpasar. Berangkat setiap hari dari agen kami.',
    note: 'Pemesanan lewat WhatsApp; jadwal dan harga dikonfirmasi admin.',
    copyright: '',
    instagram: 'https://instagram.com/nusaline.contoh',
    facebook: 'https://facebook.com/nusaline.contoh',
    linkedin: 'https://linkedin.com/company/nusaline-contoh',
    youtube: 'https://youtube.com/@nusaline.contoh',
    tiktok: 'https://tiktok.com/@nusaline.contoh',
  },
};
