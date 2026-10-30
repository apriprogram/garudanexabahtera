// Skema CMS Pesiar. Urutan section = urutan halaman: hero (foto latar, judul tengah, dua tombol, bilah kepercayaan) →
// tur sehari → rancang tur sendiri → film "sehari bersama sopir" (peta Bali) → sudah/belum termasuk → mobil & sopir →
// antar-jemput bandara → cerita tamu → tanya jawab → kontak → footer. Setiap section bisa disembunyikan. Template baru
// belum punya konten tersimpan, jadi tanpa `introduced`. Harga, sopir, dan tamu di konten demo fiktif.
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
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 32, help: 'Huruf miring dengan nomor dan garis pendek. Kosongkan untuk menyembunyikan.' });
const title = (placeholder: string, maxLength = 70) => t('title', 'Judul', { placeholder, maxLength, help: 'Paling bagus ≤ 8 kata.' });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 140) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #tur, #rancang, #bandara, #mobil, atau #kontak.';
const PRICE_HELP = 'Tulis angka saja (750000) atau dengan satuan (750rb / 1,1 jt). Kosongkan untuk menyembunyikan harga.';

export const pesiarSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama, logo, dan satu warna aksen untuk tombol, rute di peta, dan sorotan. Hijau tua dan pasir tetap.',
    fields: [
      t('company_name', 'Nama usaha', { placeholder: 'mis. Pesiar Bali', maxLength: 60 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Private tour & sewa mobil dengan sopir',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol Pesiar bawaan dan nama usaha.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan bougainvillea #B5446E. Versi lebih gelap (teks di latar terang) dan lebih terang (di latar hijau tua) dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto & judul)',
    description: 'Foto pemandangan selebar layar, label miring, judul besar di tengah, kalimat singkat, dua tombol, dan bilah tiga keunggulan.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', {
        placeholder: 'mis. Ubud · Kintamani · Uluwatu',
        maxLength: 40,
        help: 'Paling bagus berisi hal baru (mis. tempat tujuan), bukan kata yang sama dengan judul.',
      }),
      t('title', 'Judul utama', { placeholder: 'mis. Bali dengan sopir pribadi Anda.', maxLength: 60, help: 'Paling bagus ≤ 8 kata.' }),
      ta('subtitle', 'Kalimat singkat', {
        placeholder: 'Jelaskan layanan Anda dalam 1-2 kalimat.',
        maxLength: 160,
        help: 'Juga menjadi deskripsi situs di Google; 120-140 huruf paling pas.',
      }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1920×1080 px. Tampil penuh selebar layar di belakang teks; letakkan pemandangan utama di tengah.'),
      t('primary_label', 'Tombol utama: teks', { placeholder: 'mis. Rancang tur', maxLength: 24 }),
      url('primary_url', 'Tombol utama: tujuan', { help: `Kosongkan untuk menuju Rancang tur. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Tombol kedua: teks', { placeholder: 'mis. Antar-jemput bandara', maxLength: 28, help: 'Kosongkan untuk menyembunyikan.' }),
      url('secondary_url', 'Tombol kedua: tujuan', { help: `Kosongkan untuk menuju Antar-jemput bandara. ${SECTION_LINK_HELP}` }),
      listField('trust', 'Bilah keunggulan', 'Keunggulan', [t('text', 'Teks singkat', { placeholder: 'mis. Jemput di hotel', maxLength: 32, help: 'Ikon dipilih otomatis dari kata-katanya.' })], 3),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Pesan Tur', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju Rancang tur. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'tours',
    label: 'Tur sehari',
    description: 'Kartu foto tegak per tur: nama, lama, tempat yang dikunjungi, harga per mobil, tombol pesan (WhatsApp) dan "Ubah rute" (mengisi Rancang tur).',
    toggleable: true,
    fields: [
      eyebrow('mis. Tur'),
      title('mis. Tur sehari favorit'),
      subtitle(),
      t('book_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan tur ini', maxLength: 22, help: 'Membuka WhatsApp dengan nama tur. Kosongkan untuk menyembunyikan.' }),
      t('edit_label', 'Teks tombol ubah rute', { placeholder: 'mis. Ubah rute', maxLength: 22, help: 'Mengisi tempat tur ke Rancang tur sendiri. Kosongkan untuk menyembunyikan.' }),
      t('note', 'Catatan di bawah kartu', { placeholder: 'mis. Harga contoh per mobil. Tiket masuk belum termasuk.', maxLength: 140 }),
      listField(
        'items',
        'Tur',
        'Tur',
        [
          t('name', 'Nama tur', { placeholder: 'mis. Ubud & Kintamani', maxLength: 40 }),
          t('hours', 'Lama tur (jam)', { placeholder: 'mis. 10', maxLength: 4 }),
          t('stops', 'Tempat yang dikunjungi', {
            placeholder: 'mis. Celuk, Ubud, Tegallalang, Kintamani',
            maxLength: 120,
            help: 'Pisahkan dengan koma. Nama yang sama dengan tempat di Rancang tur ikut terisi saat "Ubah rute" ditekan.',
          }),
          t('price', 'Harga mulai (per mobil)', { placeholder: 'mis. 750000', maxLength: 16, help: PRICE_HELP }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'planner',
    label: 'Rancang tur sendiri',
    description:
      'Pengunjung memilih hingga 5 tempat, area jemput, tanggal, dan mobil; panel hijau tua menghitung perkiraan durasi dan harga per mobil, lalu menyusun pesan WhatsApp. Data tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Rancang'),
      title('mis. Rancang tur sendiri'),
      subtitle(),
      t('base_hours', 'Jam paket dasar', { placeholder: 'mis. 10', maxLength: 3, help: 'Harga mobil di bagian Mobil & sopir berlaku untuk jam ini; lebih lama dihitung per jam tambahan.' }),
      t('buffer_hours', 'Jam jemput & antar kembali', { placeholder: 'mis. 2', maxLength: 4, help: 'Ditambahkan ke jam tempat yang dipilih.' }),
      ta('pickup_areas', 'Area jemput', { placeholder: 'mis. Seminyak, Kuta, Canggu, Ubud', maxLength: 300, help: 'Pisahkan dengan koma. Kosongkan untuk menyembunyikan pilihan area.' }),
      listField(
        'destinations',
        'Tempat tujuan',
        'Tempat',
        [
          t('name', 'Nama tempat', { placeholder: 'mis. Tegallalang', maxLength: 32 }),
          t('area', 'Area', { placeholder: 'mis. Ubud utara', maxLength: 32 }),
          t('hours', 'Tambahan jam (perkiraan)', { placeholder: 'mis. 1,5', maxLength: 4, help: 'Lama kunjungan + waktu tempuh dari tempat sebelumnya.' }),
        ],
        16,
      ),
      t('button_label', 'Teks tombol kirim', { placeholder: 'mis. Kirim ke WhatsApp', maxLength: 26 }),
      ta('note', 'Catatan di bawah tombol', {
        maxLength: 200,
        help: 'Sebutkan bahwa formulir hanya menyusun pesan WhatsApp dan harga hanya perkiraan.',
      }),
    ],
  },
  {
    key: 'film',
    label: 'Film: sehari bersama sopir',
    description:
      'Animasi peta Bali yang bergerak saat digulir: mobil menyusuri rute contoh, jam berjalan, dan kartu foto muncul di tiap perhentian. Peta dan rute adalah bagian desain; teks, jam, dan foto hingga 6 perhentian bisa diubah. Perhentian mengisi pin peta berurutan (kurang dari 6 = rute lebih pendek; 6 = kembali ke titik awal).',
    toggleable: true,
    fields: [
      eyebrow('mis. Perjalanan'),
      title('mis. Sehari bersama sopir Anda'),
      subtitle(),
      t('note', 'Catatan kecil', { placeholder: 'mis. Rute contoh. Waktu tempuh perkiraan.', maxLength: 100 }),
      listField(
        'stops',
        'Perhentian (urutan di peta: Seminyak, Celuk, Tegallalang, Kintamani, Tirta Empul, Seminyak)',
        'Perhentian',
        [
          t('time', 'Jam', { placeholder: 'mis. 09.30', maxLength: 5 }),
          t('name', 'Nama tempat', { placeholder: 'mis. Celuk', maxLength: 24 }),
          t('text', 'Satu kalimat', { placeholder: 'mis. Desa perajin perak.', maxLength: 80 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'included',
    label: 'Sudah & belum termasuk',
    description: 'Dua kolom: apa yang sudah termasuk harga dan apa yang belum.',
    toggleable: true,
    fields: [
      eyebrow('mis. Harga'),
      title('mis. Sudah & belum termasuk'),
      subtitle(),
      t('yes_title', 'Judul kolom termasuk', { placeholder: 'mis. Sudah termasuk', maxLength: 30 }),
      listField('yes', 'Sudah termasuk', 'Item termasuk', [t('text', 'Teks', { placeholder: 'mis. Parkir dan tol', maxLength: 60 })], 8),
      t('no_title', 'Judul kolom belum termasuk', { placeholder: 'mis. Belum termasuk', maxLength: 30 }),
      listField('no', 'Belum termasuk', 'Item belum termasuk', [t('text', 'Teks', { placeholder: 'mis. Tiket masuk tempat wisata', maxLength: 60 })], 8),
    ],
  },
  {
    key: 'cars',
    label: 'Mobil & sopir',
    description: 'Kelas mobil dengan gambar garis (atau foto Anda), kapasitas, koper, harga paket per mobil, jam tambahan, dan daftar sopir dengan inisial.',
    toggleable: true,
    fields: [
      eyebrow('mis. Mobil & sopir'),
      title('mis. Mobil nyaman, sopir yang paham jalan'),
      subtitle(),
      listField(
        'items',
        'Mobil',
        'Mobil',
        [
          t('name', 'Kelas mobil', { placeholder: 'mis. MPV', maxLength: 24, help: 'Tulis kelas, bukan merek (Sedan, MPV, Minibus). Gambar garis dipilih otomatis dari nama.' }),
          t('seats', 'Penumpang', { placeholder: 'mis. 6', maxLength: 3 }),
          t('luggage', 'Koper', { placeholder: 'mis. 3 koper', maxLength: 16 }),
          t('price', 'Harga paket per mobil', { placeholder: 'mis. 850000', maxLength: 16, help: PRICE_HELP }),
          t('overtime', 'Harga per jam tambahan', { placeholder: 'mis. 85000', maxLength: 16, help: PRICE_HELP }),
          img('image', 'Foto mobil (opsional)', 'Foto mendatar 16:9. Kosongkan untuk memakai gambar garis bawaan.'),
        ],
        4,
      ),
      t('note', 'Catatan harga di bawah mobil', {
        placeholder: 'mis. Harga contoh per mobil; dikonfirmasi admin lewat WhatsApp.',
        maxLength: 140,
        help: 'Sebutkan bahwa harga adalah contoh dan dikonfirmasi lewat WhatsApp. Kosongkan untuk menyembunyikan.',
      }),
      t('drivers_title', 'Judul daftar sopir', { placeholder: 'mis. Sopir kami', maxLength: 30 }),
      listField(
        'drivers',
        'Sopir',
        'Sopir',
        [t('name', 'Nama', { maxLength: 40 }), t('languages', 'Bahasa', { placeholder: 'mis. Indonesia, Inggris', maxLength: 40 })],
        6,
      ),
    ],
  },
  {
    key: 'transfer',
    label: 'Antar-jemput bandara',
    description: 'Tabel harga per area × mobil, keterangan layanan, dan formulir (tanggal, jam, penerbangan, area, hotel, penumpang, mobil) yang menyusun pesan WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Bandara'),
      title('mis. Antar-jemput bandara'),
      subtitle(),
      img('image', 'Foto di atas formulir', 'Foto mendatar 16:7, disarankan 1200×525 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'zones',
        'Area & harga',
        'Area',
        [
          t('name', 'Area', { placeholder: 'mis. Seminyak & Canggu', maxLength: 36 }),
          t('time', 'Waktu tempuh', { placeholder: 'mis. ± 40 menit', maxLength: 16 }),
          t('price_1', 'Harga mobil ke-1', {
            placeholder: 'mis. 250000',
            maxLength: 16,
            help: 'Harga 1–4 mengikuti urutan daftar di bagian Mobil & sopir. Kosong = tidak tersedia. Tanpa daftar mobil, harga ke-1 tampil sebagai "Harga per mobil".',
          }),
          t('price_2', 'Harga mobil ke-2', { placeholder: 'mis. 300000', maxLength: 16 }),
          t('price_3', 'Harga mobil ke-3', { placeholder: 'mis. 400000', maxLength: 16 }),
          t('price_4', 'Harga mobil ke-4', { placeholder: 'mis. 500000', maxLength: 16 }),
        ],
        8,
      ),
      listField('notes', 'Keterangan layanan', 'Keterangan', [t('text', 'Teks', { placeholder: 'mis. Tunggu hingga 60 menit', maxLength: 40, help: 'Ikon dipilih otomatis.' })], 4),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Pesan antar-jemput', maxLength: 40 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 28 }),
      ta('form_note', 'Formulir: catatan', { maxLength: 200, help: 'Sebutkan bahwa formulir hanya menyusun pesan WhatsApp.' }),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita tamu',
    description: 'Satu kutipan besar sekaligus dengan tombol sebelumnya/berikutnya dan daftar nama (tanpa foto, tanpa putar otomatis).',
    toggleable: true,
    fields: [
      eyebrow('mis. Cerita tamu'),
      title('mis. Catatan kecil dari kursi belakang'),
      listField(
        'items',
        'Cerita',
        'Cerita',
        [
          ta('quote', 'Kutipan', { maxLength: 160 }),
          t('name', 'Nama', { placeholder: 'mis. Rina', maxLength: 40 }),
          t('place', 'Keterangan', { placeholder: 'mis. Keluarga dari Surabaya', maxLength: 50 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. FAQ'),
      title('mis. Jawaban untuk rencana tur Anda'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Sapa kami di WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 100 }), ta('answer', 'Jawaban', { maxLength: 320 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    description: 'Alamat kantor, telepon, WhatsApp, email, jam buka, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Kirim rute Anda, kami siapkan sopirnya'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Denpasar Selatan, Bali',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@usahaanda.com', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol pesan tur, Rancang tur, formulir bandara, dan tanya jawab.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang tur pribadi.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari 07.00–21.00 WITA', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Strip foto panorama selebar layar, lalu pita hijau tua: nama, deskripsi, catatan kecil, menu, kontak, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      img('image', 'Foto panorama', 'Foto sangat lebar 21:6, disarankan 1920×549 px. Kosongkan untuk menyembunyikan strip foto.'),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang usaha Anda.', maxLength: 200 }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Harga dan rute di situs ini contoh.', maxLength: 140 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Usaha', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
