// Skema CMS Lawatan. Urutan section = urutan halaman (jalur keputusan pengunjung): hero (foto latar + panel kartu pos
// dengan chip jenis trip) → paket wisata → film itinerary (gulir) → yang termasuk → hitung & rancang trip → testimoni →
// galeri → tanya jawab → kontak → footer. Setiap section bisa disembunyikan. Template baru belum punya konten tersimpan,
// jadi tanpa `introduced`. Paket, harga, jarak, dan pelanggan di konten demo fiktif/contoh.
import type { TemplateField, TemplateListField, TemplateSection } from '../types';

const t = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'text', key, label, ...extra });
const ta = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'textarea', key, label, ...extra });
const img = (key: string, label: string, help?: string): TemplateField => ({ type: 'image', key, label, help });
const url = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({
  type: 'url',
  key,
  label,
  placeholder: 'https://...',
  ...extra,
});
const listField = (key: string, label: string, itemLabel: string, fields: TemplateField[], max: number): TemplateListField => ({
  type: 'list',
  key,
  label,
  itemLabel,
  fields,
  max,
});

const eyebrow = (placeholder: string) =>
  t('eyebrow', 'Label perangko di atas judul', {
    placeholder,
    maxLength: 32,
    help: 'Huruf kapital kecil dalam bingkai putus-putus, diberi nomor otomatis (01, 02, …). Kosongkan untuk menyembunyikan.',
  });
const title = (placeholder: string, maxLength = 70) => t('title', 'Judul', { placeholder, maxLength, help: 'Paling pas ≤ 8 kata.' });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 120) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #paket, #itinerary, #hitung, atau #kontak.';

export const lawatanSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama, logo, dan satu warna aksen. Hijau tua footer dan panel estimasi diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama biro / merek', { placeholder: 'mis. Lawatan Tour & Travel', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Paket wisata rombongan',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol perangko bawaan dan nama merek.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan hijau daun #277A36. Dipakai tombol, perangko harga, garis rute, dan label; versi gelap untuk footer dibuat otomatis agar teks tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto & kartu pos)',
    description: 'Foto pemandangan selebar layar sebagai latar dan panel kartu pos krem berisi judul, kalimat singkat, chip jenis trip, dan tombol yang menyaring paket.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label perangko', { placeholder: 'mis. Tour & travel · Yogyakarta', maxLength: 60 }),
      t('title', 'Judul utama', { placeholder: 'mis. Liburan rombongan, semua kami yang atur.', maxLength: 64, help: 'Paling bagus ≤ 8 kata.' }),
      t('highlight', 'Kata yang disorot di judul', {
        placeholder: 'mis. semua kami yang atur',
        maxLength: 40,
        help: 'Harus sama persis dengan bagian judul; tampil berwarna aksen. Kosongkan bila tidak perlu.',
      }),
      ta('subtitle', 'Kalimat singkat', {
        placeholder: 'Jelaskan paket Anda dalam 1-2 kalimat.',
        maxLength: 160,
        help: 'Juga menjadi deskripsi situs di Google; 120-140 huruf paling pas.',
      }),
      img('image', 'Foto latar', 'Foto pemandangan mendatar 16:9, disarankan 1920×1080 px, dengan langit lapang di atas. Di HP terpotong tegak: letakkan objek utama sedikit ke kanan.'),
      t('image_caption', 'Keterangan foto', { placeholder: 'mis. Bromo, Jawa Timur', maxLength: 40, help: 'Chip kecil di pojok kanan bawah foto. Kosongkan untuk menyembunyikan.' }),
      t('chips_label', 'Judul pilihan jenis trip', { placeholder: 'mis. Pilih jenis trip', maxLength: 30 }),
      t('button_label', 'Teks tombol paket', { placeholder: 'mis. Lihat paket', maxLength: 24 }),
      t('link_label', 'Teks tautan WhatsApp', { placeholder: 'mis. Konsultasi dulu lewat WhatsApp', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Konsultasi Trip', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju formulir hitung biaya. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'packages',
    label: 'Paket wisata',
    description: 'Kartu pos paket: foto, perangko harga, durasi, minimal peserta, yang termasuk, itinerary per hari, dan tombol pesan lewat WhatsApp. Chip jenis trip menyaring paket.',
    toggleable: true,
    fields: [
      eyebrow('mis. Paket wisata'),
      title('mis. Paket wisata rombongan'),
      subtitle(),
      t('trip_types', 'Jenis trip (chip saringan)', {
        placeholder: 'mis. Study tour, Gathering kantor, Keluarga, Ziarah',
        maxLength: 120,
        help: 'Pisahkan dengan koma, maks. 5. Juga muncul di hero dan formulir hitung biaya. Kosongkan untuk mengambil dari kolom jenis trip tiap paket.',
      }),
      ta('note', 'Catatan di bawah paket', {
        placeholder: 'mis. Harga mulai per orang dan bisa berubah; dikonfirmasi admin lewat WhatsApp.',
        maxLength: 200,
        help: 'Sebutkan bahwa harga contoh dan dikonfirmasi admin.',
      }),
      t('order_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan paket', maxLength: 24, help: 'Membuka WhatsApp dengan nama paket. Kosongkan untuk menyembunyikan.' }),
      t('calc_label', 'Teks tombol hitung biaya', { placeholder: 'mis. Hitung biaya', maxLength: 24, help: 'Mengisi paket ke formulir hitung biaya. Kosongkan untuk menyembunyikan.' }),
      t('empty_text', 'Teks bila tidak ada yang cocok', { placeholder: 'mis. Belum ada paket untuk jenis trip ini.', maxLength: 100 }),
      listField(
        'items',
        'Paket',
        'Paket',
        [
          t('title', 'Nama paket', { placeholder: 'mis. Jogja Heritage 3H2M', maxLength: 40 }),
          t('types', 'Jenis trip', { placeholder: 'mis. Study tour, Keluarga', maxLength: 80, help: 'Pisahkan dengan koma; tulis sama seperti chip jenis trip.' }),
          t('duration', 'Durasi', { placeholder: 'mis. 3 hari 2 malam', maxLength: 24 }),
          t('min_people', 'Minimal peserta', { placeholder: 'mis. 40', maxLength: 4 }),
          t('transport', 'Transportasi', { placeholder: 'mis. Bus pariwisata', maxLength: 32, help: 'Tulis kelas, bukan merek: mis. Big bus 50 kursi atau setara.' }),
          t('price', 'Harga mulai per orang (rupiah)', {
            placeholder: 'mis. 875000',
            maxLength: 14,
            help: 'Angka saja (875000) atau dengan satuan (875 rb / 1,15 jt). Kosongkan bila harga menyusul.',
          }),
          t('includes', 'Yang termasuk', { placeholder: 'mis. Hotel bintang 3, Makan 6×, Tiket masuk', maxLength: 100, help: 'Pisahkan dengan koma; tiga pertama tampil di kartu.' }),
          ta('itinerary', 'Itinerary per hari', { placeholder: 'Satu baris per hari, mis.\nBorobudur, check-in hotel\nKeraton, Malioboro', maxLength: 400 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
        ],
        9,
      ),
    ],
  },
  {
    key: 'film',
    label: 'Itinerary (film gulir)',
    description:
      'Pita krem yang "diputar" saat digulir: garis rute bertitik dengan bus kecil, penghitung hari/jam/km, dan deretan kartu pos per titik yang bergeser. Tanpa gerak (atau di pratinjau) tampil sebagai garis rute utuh + kisi kartu pos.',
    toggleable: true,
    fields: [
      eyebrow('mis. Itinerary'),
      title('mis. Tiga hari di Jogja dalam satu gulir'),
      subtitle('mis. Contoh study tour 3H2M. Jam dan jarak perkiraan.'),
      listField(
        'stops',
        'Titik perjalanan',
        'Titik',
        [
          t('name', 'Nama titik', { placeholder: 'mis. Borobudur', maxLength: 24, help: 'Ikon kecil di garis rute dipilih otomatis dari nama (sekolah, candi, hotel, pantai, gunung, pulang, dll.).' }),
          t('day', 'Hari', { placeholder: 'mis. Hari 1', maxLength: 12 }),
          t('time', 'Jam', { placeholder: 'mis. 09.30', maxLength: 8 }),
          t('km', 'Jarak tempuh sejak berangkat (km, kumulatif, opsional)', {
            placeholder: 'mis. 105',
            maxLength: 6,
            help: 'Angka naik di setiap titik; isi semua titik untuk penghitung km (perkiraan).',
          }),
          t('text', 'Keterangan singkat', { placeholder: 'mis. Naik candi bersama pemandu lokal.', maxLength: 70 }),
          img('image', 'Foto kartu pos', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'included',
    label: 'Yang termasuk',
    description: 'Ubin bergaya perangko dengan ikon otomatis dari judul (bus, hotel, makan, tiket, pemandu, dokumentasi) dan satu baris "belum termasuk".',
    toggleable: true,
    fields: [
      eyebrow('mis. Termasuk'),
      title('mis. Bus, hotel, dan makan sudah termasuk'),
      subtitle(),
      t('excluded', 'Baris "belum termasuk"', { placeholder: 'mis. Belum termasuk: pengeluaran pribadi, tips.', maxLength: 120 }),
      listField(
        'items',
        'Ubin',
        'Ubin',
        [
          t('title', 'Judul', { placeholder: 'mis. Bus pariwisata', maxLength: 28, help: 'Ikon dipilih otomatis dari judul.' }),
          t('text', 'Keterangan', { placeholder: 'mis. AC, kursi reclining, sopir cadangan.', maxLength: 70 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'custom',
    label: 'Hitung & rancang trip',
    description:
      'Formulir paket, jenis trip, jumlah peserta, rencana bulan, hotel, kamar, dan catatan dengan panel estimasi hijau tua (peserta × harga paket). Hanya menyusun pesan WhatsApp; tidak ada pembayaran online.',
    toggleable: true,
    fields: [
      eyebrow('mis. Hitung biaya'),
      title('mis. Hitung & rancang trip Anda'),
      subtitle(),
      t('custom_label', 'Teks pilihan paket bebas', { placeholder: 'mis. Rancang sendiri', maxLength: 30 }),
      ta('note', 'Catatan jujur di panel estimasi', {
        placeholder: 'mis. Estimasi saja; harga final dikonfirmasi admin lewat WhatsApp.',
        maxLength: 200,
        help: 'Sebutkan bahwa hasilnya estimasi dan tidak ada pembayaran online.',
      }),
      t('button_label', 'Teks tombol kirim', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Kartu pos miring dengan kutipan, perangko kota, dan inisial pelanggan (tanpa foto).',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimoni'),
      title('mis. Kartu pos dari rombongan'),
      subtitle('mis. Panitia sekolah, kantor, dan keluarga yang sudah berangkat bersama kami.'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          ta('quote', 'Kutipan', { maxLength: 140 }),
          t('name', 'Nama', { placeholder: 'mis. Rina', maxLength: 30 }),
          t('role', 'Keterangan', { placeholder: 'mis. Panitia study tour', maxLength: 40 }),
          t('city', 'Kota (di perangko)', { placeholder: 'mis. Kudus', maxLength: 16 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    description: 'Mosaik foto selebar layar di pita gelap dengan keterangan; 6 atau 8 foto membentuk mosaik penuh, jumlah lain tampil sebagai kisi rata.',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri'),
      title('mis. Album perjalanan rombongan'),
      subtitle(),
      listField(
        'items',
        'Foto',
        'Foto',
        [
          img('image', 'Foto', 'Foto 4:3 atau 3:2, disarankan 1200 px lebar. Foto ke-1 tampil tegak dan ke-2 melebar (8 foto: juga ke-6 tegak, ke-7 melebar).'),
          t('caption', 'Keterangan', { placeholder: 'mis. Pagi di tepi pantai', maxLength: 40 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. FAQ'),
      title('mis. Yang biasa ditanyakan panitia'),
      subtitle('mis. Jawaban singkat soal peserta, harga, dan pembayaran.'),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Kirim pertanyaan lewat WhatsApp', maxLength: 40 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    description: 'Alamat kantor, jam buka, telepon, WhatsApp, email, dan peta Google Maps berbingkai kartu pos.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Singgah ke kantor kami di Kotagede'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Kotagede, Yogyakarta',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@biro-anda.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol pesan paket, formulir hitung biaya, dan tautan tanya jawab.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang paket wisata.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Senin–Sabtu 08.00–17.00 WIB', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita hijau tua bergaris airmail: logo, deskripsi, catatan kecil, perangko besar, menu, kontak, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang biro Anda.', maxLength: 200 }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Harga paket contoh dan bisa berubah.', maxLength: 140 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Biro', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
