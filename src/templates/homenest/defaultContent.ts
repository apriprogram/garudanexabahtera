// Konten demo HomeNest: merek pemasaran rumah milik PT Sarang Hunian Lestari, developer FIKTIF, dengan sembilan rumah,
// townhouse, dan kavling di klaster fiktif di Bogor, Depok, Tangerang Selatan, dan Bekasi (nama rumah, klaster, harga,
// agen, pembeli, alamat jalan, dan email adalah contoh). Salinan singkat berbahasa Indonesia, tanpa nama bank, tanpa
// janji kenaikan nilai atau klaim legalitas sebagai fakta. Simulasi KPR hanya perkiraan (bukan penawaran bank),
// formulir hanya menyusun pesan WhatsApp (data tidak disimpan di website), tautan tur virtual demo hanya contoh.
// Angka "9 klaster aktif" di developer = jumlah rumah di daftar; ubah bersamaan.
import type { SiteContent } from '../types';
import { homenestPhoto } from './photos';

/** Warna tema bawaan: hijau tua (putih di atasnya 8,9:1; di krem 7,7:1). */
export const HOMENEST_ACCENT = '#2E5141';

const BRAND = 'HomeNest';

export const homenestContent: SiteContent = {
  brand: {
    company_name: BRAND,
    tagline: 'Jual Rumah di Bogor, Depok, Tangsel & Bekasi',
    logo: '',
    accent_color: HOMENEST_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Bogor · Depok · Tangerang Selatan · Bekasi',
    title: 'Rumah yang tenang, tak jauh dari kota',
    subtitle:
      'Pilihan rumah, townhouse, dan kavling di empat kota penyangga Jakarta. Cari unit, hitung simulasi KPR, lalu jadwalkan kunjungan bersama agen.',
    image: homenestPhoto('hero'),
    search_label: 'Cari Rumah',
    header_label: 'Jadwalkan Kunjungan',
    header_url: '',
  },
  listings: {
    enabled: true,
    eyebrow: 'Pilihan rumah',
    title: 'Rumah yang siap Anda kunjungi',
    subtitle: 'Sembilan unit di empat kota. Saring sesuai kebutuhan, lalu tanyakan langsung ke agen.',
    price_steps: '1000, 2000, 3000',
    empty_text: 'Belum ada rumah yang cocok dengan pilihan ini.',
    kpr_label: 'Simulasi KPR',
    ask_label: 'Tanya unit',
    items: [
      { title: 'Rumah Teras Kenari', cluster: 'Klaster Kenari Asri', city: 'Bogor', type: 'Rumah', price: '1450000000', lt: '120', lb: '96', kt: '3', km: '2', status: 'Siap huni', image: homenestPhoto('kenari') },
      { title: 'Rumah Taman Palem', cluster: 'Klaster Palem Hijau', city: 'Depok', type: 'Rumah', price: '1180000000', lt: '98', lb: '82', kt: '3', km: '2', status: 'Siap huni', image: homenestPhoto('palem') },
      { title: 'Townhouse Laras', cluster: 'Laras Residence', city: 'Tangerang Selatan', type: 'Townhouse', price: '1950000000', lt: '84', lb: '120', kt: '3', km: '3', status: 'Inden 2027', image: homenestPhoto('laras') },
      { title: 'Rumah Serambi Jati', cluster: 'Klaster Jati Kencana', city: 'Bekasi', type: 'Rumah', price: '985000000', lt: '90', lb: '72', kt: '2', km: '1', status: 'Siap huni', image: homenestPhoto('jati') },
      { title: 'Kavling Bukit Rasamala', cluster: 'Bukit Rasamala', city: 'Bogor', type: 'Kavling', price: '620000000', lt: '150', lb: '', kt: '', km: '', status: 'Siap bangun', image: homenestPhoto('rasamala') },
      { title: 'Townhouse Nara', cluster: 'Nara Townhouse', city: 'Depok', type: 'Townhouse', price: '1620000000', lt: '72', lb: '110', kt: '3', km: '2', status: 'Unit contoh', image: homenestPhoto('nara') },
      { title: 'Rumah Lanai', cluster: 'Klaster Lanai', city: 'Tangerang Selatan', type: 'Rumah', price: '2850000000', lt: '160', lb: '180', kt: '4', km: '3', status: 'Siap huni', image: homenestPhoto('lanai') },
      { title: 'Kavling Tepian Sawo', cluster: 'Tepian Sawo', city: 'Bekasi', type: 'Kavling', price: '540000000', lt: '120', lb: '', kt: '', km: '', status: 'Siap bangun', image: homenestPhoto('sawo') },
      { title: 'Rumah Pendopo Saga', cluster: 'Klaster Saga Lestari', city: 'Bogor', type: 'Rumah', price: '3400000000', lt: '200', lb: '210', kt: '4', km: '4', status: 'Inden 2027', image: homenestPhoto('saga') },
    ],
  },
  tour: {
    enabled: true,
    eyebrow: 'Tur virtual',
    title: 'Lihat ke dalam sebelum datang',
    subtitle: 'Jelajahi ruang demi ruang Rumah Teras Kenari dari layar Anda.',
    button_label: 'Buka tur virtual',
    url: 'https://example.com/virtual-tour',
    note: 'Tautan tur pada demo ini hanya contoh.',
    rooms: [
      { name: 'Ruang keluarga', caption: 'Plafon tinggi dan cahaya dari dua sisi.', image: homenestPhoto('tour-keluarga') },
      { name: 'Dapur & ruang makan', caption: 'Ruang makan berdinding kaca menghadap taman.', image: homenestPhoto('tour-dapur') },
      { name: 'Kamar utama', caption: 'Jendela lebar dan lemari tanam berlapis kayu.', image: homenestPhoto('tour-kamar') },
      { name: 'Taman belakang', caption: 'Teras kayu beratap untuk sore yang santai.', image: homenestPhoto('tour-taman') },
    ],
  },
  kpr: {
    enabled: true,
    eyebrow: 'Simulasi KPR',
    title: 'Hitung angsuran Anda',
    subtitle: 'Ubah harga, uang muka, tenor, dan bunga untuk melihat perkiraannya.',
    default_price: '1450000000',
    default_dp: '20',
    default_tenor: '15',
    default_rate: '7,5',
    note: 'Simulasi dengan bunga tetap (anuitas), bukan penawaran bank. Angsuran sebenarnya mengikuti ketentuan bank pemberi KPR.',
    cta_label: 'Tanya agen soal KPR',
  },
  developer: {
    enabled: true,
    eyebrow: 'Developer',
    title: 'Membangun kawasan, bukan sekadar rumah',
    name: 'PT Sarang Hunian Lestari',
    body: 'Sejak 2012 kami merancang kawasan hunian di selatan dan timur Jakarta: jalan yang teduh, taman di setiap blok, dan rumah yang sejuk tanpa banyak pendingin.',
    stats: [
      { value: '14 thn', label: 'Pengalaman' },
      { value: '9', label: 'Klaster aktif' },
      { value: '1.800+', label: 'Rumah terbangun' },
      { value: '4', label: 'Kota' },
    ],
    projects: [
      { name: 'Klaster Kenari Asri', city: 'Bogor', image: homenestPhoto('kenari') },
      { name: 'Laras Residence', city: 'Tangerang Selatan', image: homenestPhoto('laras') },
      { name: 'Klaster Palem Hijau', city: 'Depok', image: homenestPhoto('palem') },
    ],
    values: [
      { title: 'Jalan yang teduh', text: 'Jalan utama 8 m dengan pohon peneduh di kedua sisi.' },
      { title: 'Sejuk alami', text: 'Bukaan silang dan plafon tinggi mengurangi panas siang.' },
      { title: 'Progres terbuka', text: 'Foto progres pembangunan dikirim berkala kepada pembeli inden.' },
    ],
  },
  amenities: {
    enabled: true,
    eyebrow: 'Fasilitas kawasan',
    title: 'Semua dekat, tanpa terburu-buru',
    subtitle: 'Contoh di Klaster Kenari Asri, Bogor.',
    image: homenestPhoto('fasilitas'),
    items: [
      { title: 'Taman & jogging track', detail: 'Di setiap blok' },
      { title: 'Kolam renang', detail: 'Di clubhouse' },
      { title: 'Keamanan 24 jam', detail: 'Satu gerbang utama' },
      { title: 'Masjid kawasan', detail: '3 menit jalan kaki' },
      { title: 'Sekolah', detail: '5 menit berkendara' },
      { title: 'Stasiun KRL', detail: '12 menit' },
      { title: 'Gerbang tol', detail: '8 menit' },
      { title: 'Pasar modern', detail: '10 menit' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Cerita pembeli',
    title: 'Mereka sudah pulang ke rumahnya',
    items: [
      { quote: 'Agen kami sabar menemani tiga kali kunjungan. Simulasi KPR-nya membantu kami memilih tenor.', name: 'Raka & Dinda', place: 'Pembeli di Depok' },
      { quote: 'Jalan klasternya teduh, anak-anak bisa bersepeda sore hari. Itu yang membuat kami memilih.', name: 'Bu Lestari', place: 'Pembeli di Bogor' },
      { quote: 'Foto progres dikirim tiap bulan, jadi kami tenang menunggu rumah inden selesai.', name: 'Hendra', place: 'Pembeli di Tangerang Selatan' },
    ],
  },
  agents: {
    enabled: true,
    eyebrow: 'Hubungi agen',
    title: 'Bicara dengan agen kawasan',
    subtitle: 'Pilih agen sesuai lokasi, atau jadwalkan kunjungan ke rumah contoh.',
    items: [
      { name: 'Nadia Prameswari', area: 'Bogor & Depok', whatsapp: '' },
      { name: 'Yoga Pratama', area: 'Tangerang Selatan', whatsapp: '' },
      { name: 'Sekar Ayuningtyas', area: 'Bekasi', whatsapp: '' },
    ],
    form_title: 'Jadwalkan kunjungan',
    form_text: 'Formulir ini hanya menyusun pesan WhatsApp; data tidak disimpan di website.',
    form_button: 'Susun pesan WhatsApp',
  },
  faq: {
    enabled: true,
    eyebrow: 'Tanya jawab',
    title: 'Sebelum Anda memutuskan',
    subtitle: 'Belum terjawab? Tanyakan langsung ke agen kami.',
    link_label: 'Tanya lewat WhatsApp',
    link_url: '',
    items: [
      {
        question: 'Berapa tanda jadi untuk memesan unit?',
        answer: 'Besarnya berbeda per klaster dan dijelaskan agen saat kunjungan. Pembayaran dilakukan di kantor pemasaran, tidak lewat website ini.',
      },
      {
        question: 'Bisakah membeli dengan KPR?',
        answer: 'Bisa. Simulasi di halaman ini hanya perkiraan; bunga, tenor, dan persetujuan mengikuti bank pilihan Anda.',
      },
      {
        question: 'Dokumen apa yang bisa saya periksa?',
        answer: 'Minta agen menunjukkan sertifikat tanah dan dokumen izin bangunan unit yang Anda minati, lalu periksa salinannya sebelum membayar.',
      },
      {
        question: 'Kapan rumah inden selesai?',
        answer: 'Jadwal serah terima tertulis di perjanjian jual beli. Pembeli inden menerima foto progres pembangunan secara berkala.',
      },
      {
        question: 'Bisakah berkunjung di akhir pekan?',
        answer: 'Bisa. Kantor pemasaran buka setiap hari; jadwalkan lewat formulir agar agen menyiapkan rumah contoh.',
      },
    ],
  },
  contact: {
    enabled: true,
    eyebrow: 'Kantor pemasaran',
    title: 'Mampir ke rumah contoh kami',
    subtitle: 'Rumah contoh Klaster Kenari Asri buka setiap hari.',
    address: 'Jl. Kenari Raya No. 8, Klaster Kenari Asri, Kabupaten Bogor, Jawa Barat',
    maps_query: 'Kabupaten Bogor, Jawa Barat',
    maps_url: '',
    phone: '081234567890',
    email: 'pemasaran@homenest.test',
    whatsapp: '081234567890',
    whatsapp_message: `Halo ${BRAND}, saya ingin bertanya tentang rumah yang dijual.`,
    hours: 'Setiap hari 09.00–17.00 WIB',
  },
  footer: {
    enabled: true,
    description: 'Rumah, townhouse, dan kavling di Bogor, Depok, Tangerang Selatan, dan Bekasi oleh PT Sarang Hunian Lestari.',
    note: 'Harga dan ketersediaan unit dapat berubah; konfirmasi ke agen kami.',
    wordmark: '',
    copyright: '',
    instagram: 'https://instagram.com/homenest.contoh',
    facebook: '',
    linkedin: '',
    youtube: 'https://youtube.com/@homenest.contoh',
    tiktok: 'https://tiktok.com/@homenest.contoh',
  },
};
