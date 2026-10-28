// Skema CMS Sparring Padel. Urutan section = urutan halaman: hero foto + bilah booking → jadwal & harga → lapangan
// (indoor/outdoor) → cari lawan main → turnamen → sewa & coaching → komunitas (angka + strip kegiatan) → galeri → tanya
// jawab → lokasi → footer. Setiap section bisa disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa
// `introduced`. Label formulir (Tanggal, Lapangan, Jam, Pemain, Nama, Level, Hari) tetap; semua teks demo lain bisa
// diubah di sini.
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

const EYEBROW_HELP = 'Tampil sebagai label "// JADWAL". Label singkat (≤ 14 huruf, ≤ 2 kata) juga dipakai di menu atas. Kosongkan untuk menyembunyikan label.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 24, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 80) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #jadwal, #lapangan, #cari-lawan, #turnamen, atau #lokasi.';
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Lokasi).';

const scheduleRow = (key: 'weekday' | 'weekend', label: string) =>
  listField(
    key,
    label,
    'Sesi',
    [
      t('label', 'Nama sesi', { placeholder: 'mis. Off-peak, Peak, Prime', maxLength: 16 }),
      t('time', 'Jam', { placeholder: 'mis. 06.00–16.00', maxLength: 20 }),
      t('price', 'Harga', { placeholder: 'mis. Rp300.000', maxLength: 16 }),
      t('hint', 'Catatan kecil (opsional)', { placeholder: 'mis. Paling ramai', maxLength: 20 }),
    ],
    5,
  );

export const sparringSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama klub, logo, dan satu warna aksen. Warna biru-malam dan versi terang/gelap aksen dibuat otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama klub', { placeholder: 'mis. Sparring Padel', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Lapangan Padel Kemang, Jakarta Selatan',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama klub; nama + tagline paling pas ≤ 60 huruf, sebut olahraga dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol raket bawaan dan nama klub.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan aqua neon #00D2B4. Dipakai tombol Book Now, garis lapangan, dan angka; warna biru-malam serta versi teks yang tetap terbaca dibuat otomatis.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero & booking cepat',
    description:
      'Foto latar selebar layar dengan judul, deskripsi, dua tombol, garis lapangan neon, dan bilah Booking cepat (tanggal, indoor/outdoor, jam, jumlah pemain) yang menyusun pesan WhatsApp.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Kemang · Jakarta Selatan · 06.00–24.00', maxLength: 60 }),
      t('title', 'Judul utama', { placeholder: 'mis. Pesan lapangan padel, temukan lawan selevel.', maxLength: 70, help: 'Paling bagus ≤ 9 kata.' }),
      t('highlight', 'Kata miring berwarna di judul', { placeholder: 'mis. selevel', maxLength: 30, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Sebut jumlah lapangan, lokasi, dan jam buka dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol pertama', { placeholder: 'mis. Lihat jadwal & harga', maxLength: 28 }),
      url('primary_url', 'Tautan tombol pertama', { help: `Kosongkan untuk menuju bagian Jadwal. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Cari lawan main', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Cari lawan main.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Book Now', maxLength: 16, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bilah Booking cepat di hero.' }),
      img(
        'image',
        'Foto latar hero',
        'Foto mendatar 16:9, disarankan 1920×1080 px, suasana gelap. Letakkan pemain di sepertiga kanan: teks ada di kiri, dan HP memotong foto tegak di sekitar pemain.',
      ),
      t('booking_title', 'Booking cepat: judul', { placeholder: 'mis. Booking cepat', maxLength: 30 }),
      t('booking_button', 'Booking cepat: teks tombol', { placeholder: 'mis. Book Now', maxLength: 16 }),
      t('booking_hours', 'Booking cepat: jam buka untuk pilihan jam', {
        placeholder: 'mis. 06.00–24.00',
        maxLength: 20,
        help: 'Pilihan "Jam" dibuat per jam dari jam buka sampai satu jam sebelum tutup.',
      }),
      ta('booking_note', 'Booking cepat: catatan', {
        placeholder: 'mis. Admin mengonfirmasi ketersediaan lewat WhatsApp. Tanpa pembayaran online.',
        maxLength: 140,
        help: 'Tampil di bawah bilah. Sebutkan bahwa ketersediaan dikonfirmasi admin.',
      }),
    ],
  },
  {
    key: 'schedule',
    label: 'Jadwal & harga',
    description: 'Papan harga per jam dengan dua tab (hari kerja / akhir pekan), tombol Book per sesi yang membuka WhatsApp, fakta singkat, dan catatan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Jadwal'),
      title('mis. Harga per jam, jelas sebelum main'),
      subtitle(),
      t('weekday_label', 'Nama tab pertama', { placeholder: 'mis. Senin–Jumat', maxLength: 24 }),
      t('weekend_label', 'Nama tab kedua', { placeholder: 'mis. Sabtu, Minggu & libur', maxLength: 24 }),
      t('price_unit', 'Satuan harga', { placeholder: 'mis. /jam', maxLength: 12 }),
      t('book_label', 'Teks tombol per sesi', { placeholder: 'mis. Book', maxLength: 12 }),
      scheduleRow('weekday', 'Sesi tab pertama'),
      scheduleRow('weekend', 'Sesi tab kedua'),
      listField(
        'facts',
        'Fakta singkat',
        'Fakta',
        [t('label', 'Label', { placeholder: 'mis. Buka', maxLength: 20 }), t('value', 'Nilai', { placeholder: 'mis. 06.00–24.00', maxLength: 28 })],
        4,
      ),
      ta('note', 'Catatan di bawah papan', { placeholder: 'mis. Contoh jadwal dan harga. Ketersediaan dikonfirmasi admin lewat WhatsApp.', maxLength: 160 }),
    ],
  },
  {
    key: 'courts',
    label: 'Lapangan',
    description: 'Kartu lapangan dengan foto dan spesifikasi; tab Indoor/Outdoor muncul bila kedua jenis diisi.',
    toggleable: true,
    fields: [
      eyebrow('mis. Lapangan'),
      title('mis. Pilih indoor atau outdoor'),
      subtitle(),
      t('indoor_label', 'Nama tab indoor', { placeholder: 'mis. Indoor', maxLength: 16 }),
      t('outdoor_label', 'Nama tab outdoor', { placeholder: 'mis. Outdoor', maxLength: 16 }),
      t('surface_label', 'Label permukaan', { placeholder: 'mis. Permukaan', maxLength: 16 }),
      t('lights_label', 'Label lampu', { placeholder: 'mis. Lampu', maxLength: 16 }),
      t('size_label', 'Label ukuran', { placeholder: 'mis. Ukuran', maxLength: 16 }),
      listField(
        'items',
        'Lapangan',
        'Lapangan',
        [
          t('type', 'Jenis', { placeholder: 'Indoor atau Outdoor', maxLength: 10, help: 'Tulis Indoor atau Outdoor.' }),
          t('name', 'Nama', { placeholder: 'mis. Court 1–2 Panorama', maxLength: 40 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
          t('surface', 'Permukaan', { placeholder: 'mis. Rumput sintetis biru', maxLength: 40 }),
          t('lights', 'Lampu', { placeholder: 'mis. LED, terang merata', maxLength: 40 }),
          t('size', 'Ukuran', { placeholder: 'mis. 10 × 20 m', maxLength: 24 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'matchmaking',
    label: 'Cari lawan main',
    description: 'Penjelasan level 1–7 dan formulir (nama, level, hari, jam) yang menyusun pesan WhatsApp ke admin. Data formulir tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Cari lawan'),
      title('mis. Belum punya lawan? Kami carikan.'),
      subtitle(),
      listField('steps', 'Langkah singkat', 'Langkah', [t('title', 'Langkah', { placeholder: 'mis. Pilih level 1–7', maxLength: 48 })], 3),
      listField(
        'levels',
        'Level pemain',
        'Level',
        [
          t('level', 'Angka', { placeholder: 'mis. 3', maxLength: 3 }),
          t('name', 'Nama level', { placeholder: 'mis. Menengah', maxLength: 20 }),
          t('text', 'Penjelasan', { placeholder: 'mis. Servis stabil, mulai berani main di net.', maxLength: 90 }),
        ],
        7,
      ),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Cari lawan main', maxLength: 40 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Kirim ke WhatsApp', maxLength: 30 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 200, help: 'Tampil di bawah tombol. Sebutkan bahwa data tidak disimpan di website.' }),
    ],
  },
  {
    key: 'tournaments',
    label: 'Turnamen',
    description: 'Daftar acara dengan ubin tanggal, kategori, biaya, kuota, dan tombol Daftar yang membuka WhatsApp, plus satu foto.',
    toggleable: true,
    fields: [
      eyebrow('mis. Turnamen'),
      title('mis. Turnamen bulan ini'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      t('button_label', 'Teks tombol per acara', { placeholder: 'mis. Daftar', maxLength: 16 }),
      ta('note', 'Catatan di bawah daftar', { placeholder: 'mis. Jadwal turnamen contoh; pendaftaran dikonfirmasi admin.', maxLength: 160 }),
      listField(
        'items',
        'Acara',
        'Acara',
        [
          t('day', 'Tanggal', { placeholder: 'mis. 14', maxLength: 2 }),
          t('month', 'Bulan', { placeholder: 'mis. Nov', maxLength: 6 }),
          t('title', 'Nama acara', { placeholder: 'mis. Americano Malam Minggu', maxLength: 60 }),
          t('category', 'Kategori', { placeholder: 'mis. Campuran · Level 2–4', maxLength: 48 }),
          t('fee', 'Biaya', { placeholder: 'mis. Rp150.000/orang', maxLength: 28 }),
          t('slots', 'Kuota', { placeholder: 'mis. 24 pemain', maxLength: 24 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'rental',
    label: 'Sewa & coaching',
    description: 'Foto tegak dan ubin harga (ikon otomatis dari nama: raket, bola, sepatu, coaching, kelas), plus tautan WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Sewa'),
      title('mis. Datang tanpa raket? Tenang.'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'items',
        'Item sewa',
        'Item',
        [
          t('name', 'Nama', { placeholder: 'mis. Raket padel', maxLength: 32, help: 'Ikon dipilih otomatis dari nama (raket, bola, sepatu, coaching, kelas).' }),
          t('price', 'Harga', { placeholder: 'mis. Rp50.000', maxLength: 16 }),
          t('unit', 'Satuan', { placeholder: 'mis. /sesi', maxLength: 16 }),
        ],
        6,
      ),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya stok lewat WhatsApp', maxLength: 40 }),
      url('link_url', 'Tujuan tautan', { help: WA_HELP }),
    ],
  },
  {
    key: 'community',
    label: 'Komunitas',
    description: 'Pita biru-malam: judul, tombol gabung, foto, empat angka yang menghitung naik, dan strip kegiatan yang berjalan pelan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Komunitas'),
      title('mis. Main rutin bareng komunitas'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto mendatar 16:9, disarankan 1600×900 px (tampil 4:3). Kosongkan untuk menyembunyikan.'),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Gabung grup komunitas', maxLength: 32 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      listField(
        'stats',
        'Angka',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 1.200+', maxLength: 12 }), t('label', 'Keterangan', { placeholder: 'mis. Member komunitas', maxLength: 32 })],
        4,
      ),
      listField('activities', 'Kegiatan (strip berjalan)', 'Kegiatan', [t('label', 'Kegiatan', { placeholder: 'mis. Mabar Jumat malam', maxLength: 32 })], 8),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    description: 'Susunan foto bertingkat (masonry) dengan keterangan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri'),
      title('mis. Suasana di lapangan'),
      subtitle(),
      listField(
        'items',
        'Foto',
        'Foto',
        [
          img('image', 'Foto', 'Foto tegak 4:5 (960×1200 px) atau mendatar 3:2 (1200×800 px); keduanya boleh dicampur.'),
          t('caption', 'Keterangan', { placeholder: 'mis. Smash di Court 3', maxLength: 80 }),
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
      title('mis. Sebelum Anda booking'),
      subtitle('mis. Belum terjawab? Tanya admin langsung.', 200),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: WA_HELP }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Lokasi & kontak',
    description: 'Alamat, jam buka, telepon, email, tombol WhatsApp, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Lokasi'),
      title('mis. Datang dan main di Kemang'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Kemang, Jakarta Selatan',
        maxLength: 120,
        help: 'Nama tempat + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 0812-3456-7890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'booking@klubanda.com', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp admin',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Tujuan semua pesan booking, cari lawan, daftar turnamen, dan tombol WhatsApp melayang.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya soal booking lapangan.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari 06.00–24.00', maxLength: 90 }),
      t('button_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Book via WhatsApp', maxLength: 30 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita biru-malam: logo, deskripsi, menu, kontak, media sosial, garis lapangan neon, hak cipta, dan catatan.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang klub Anda.', maxLength: 220 }),
      ta('note', 'Catatan kecil di bawah', {
        placeholder: 'mis. Booking di website ini hanya menyusun pesan WhatsApp ke admin.',
        maxLength: 200,
        help: 'Kosongkan untuk menyembunyikan.',
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Klub', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama klub.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
