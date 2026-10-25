// Skema CMS PuncakGear. Urutan section = urutan halaman: hero poster foto layar penuh → kategori → produk terlaris →
// panduan per gunung → sewa alat (kalkulator) → tips keselamatan → cerita pendaki → tanya jawab → basecamp (kontak) →
// footer. Kunci company profile (brand, hero, testimonials, contact, footer) sama artinya dengan template lain; section
// baru memakai kunci Inggris pendek (`categories`, `products`, `guides`, `rental`, `safety`, `faq`). Template baru belum
// punya konten tersimpan, jadi tanpa `introduced`.
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

const sectionLabel = (placeholder: string) =>
  t('eyebrow', 'Label kecil di atas judul', {
    placeholder,
    maxLength: 40,
    help: 'Label yang singkat (maks. 14 huruf, 2 kata) juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const sectionTitle = (placeholder: string, maxLength = 120) => t('title', 'Judul', { placeholder, maxLength });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Basecamp).';
const PRICE_HELP = 'Tulis lengkap dengan angka, mis. Rp35.000. Angkanya dipakai kalkulator.';

export const puncakSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama toko, logo, dan warna aksen (tombol di atas foto, chip aktif, centang, dan garis kontur).',
    fields: [
      t('company_name', 'Nama toko', { placeholder: 'mis. Tapak Rimba Outdoor', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Perlengkapan mendaki, siap dipakai atau disewa', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol puncak & bendera bawaan template dan nama toko.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Paling bagus warna terang menyala (mis. hijau limau). Teks di atas tombol otomatis gelap/terang agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (poster foto layar penuh)',
    description:
      'Foto selebar layar dengan menu transparan, judul besar huruf kapital, tombol pil warna aksen, kartu produk putih di kanan, lalu kalimat besar dan satu angka di bagian bawah.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Dibuat untuk mendaki', maxLength: 40, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul besar', { placeholder: 'mis. Naik Lebih Tinggi', maxLength: 40, help: 'Ditulis huruf kapital otomatis. Paling bagus 2–4 kata pendek.' }),
      ta('subtitle', 'Kalimat di bawah judul', { placeholder: 'mis. Perlengkapan mendaki yang teruji di jalur gunung Indonesia.', maxLength: 140 }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Belanja Perlengkapan', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian Produk.' }),
      t('secondary_label', 'Teks tautan kedua', { placeholder: 'mis. Sewa alat untuk pemula', maxLength: 36 }),
      url('secondary_url', 'Tautan kedua', { help: 'Kosongkan untuk menuju bagian Sewa Alat.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Sewa Alat', maxLength: 24, help: 'Tombol bergaris di kanan menu.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian Sewa Alat.' }),
      img('image', 'Foto latar', 'Foto mendatar pendaki atau pemandangan, disarankan 1920×1200 px, langit di bagian atas agar judul terbaca. Lapisan gelap tipis ditambahkan otomatis.'),
      t('side_label', 'Keterangan kanan atas: label', { placeholder: 'mis. Basecamp sewa', maxLength: 30, help: 'Tampil di layar lebar. Kosongkan label & teks untuk menyembunyikan.' }),
      t('side_text', 'Keterangan kanan atas: teks', { placeholder: 'mis. Malang · Jawa Timur', maxLength: 40 }),
      t('card_title', 'Kartu produk: nama', { placeholder: 'mis. Carrier 60L Ringan', maxLength: 40, help: 'Kartu putih kecil di kanan hero. Kosongkan nama untuk menyembunyikan.' }),
      t('card_price', 'Kartu produk: harga', { placeholder: 'mis. Rp1.249.000', maxLength: 20 }),
      img('card_image', 'Kartu produk: foto', 'Foto produk persegi, disarankan 800×800 px.'),
      url('card_url', 'Kartu produk: tautan', { help: 'Kosongkan untuk menuju bagian Produk.' }),
      t('statement', 'Kalimat besar di bawah', { placeholder: 'mis. Perlengkapan yang tepat untuk setiap langkah menuju puncak', maxLength: 90 }),
      t('statement_label', 'Tautan di bawah kalimat', { placeholder: 'mis. Lihat panduan gunung', maxLength: 30 }),
      url('statement_url', 'Tujuan tautan di bawah kalimat', { help: 'Kosongkan untuk menuju bagian Panduan Gunung.' }),
      t('stat_value', 'Angka', { placeholder: 'mis. 50+', maxLength: 10, help: 'Kosongkan angka & keterangan untuk menyembunyikan.' }),
      t('stat_label', 'Keterangan angka', { placeholder: 'mis. Alat siap disewa', maxLength: 30 }),
    ],
  },
  {
    key: 'categories',
    label: 'Kategori',
    description: 'Kartu foto tegak per kategori. Klik kartu menggulir ke Produk dan menyaring produk dengan kategori yang sama.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kategori'),
      sectionTitle('mis. Semua yang Anda butuhkan untuk naik dan pulang dengan aman'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar kategori',
        'Kategori',
        [
          t('title', 'Nama kategori', {
            placeholder: 'mis. Tenda',
            maxLength: 30,
            help: 'Samakan dengan "Kategori" di produk agar kartu bisa menyaring produk. Ikon dipilih otomatis dari nama.',
          }),
          t('text', 'Keterangan', { placeholder: 'mis. Dome 1–4 orang, double layer', maxLength: 50 }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px. Kosongkan untuk memakai latar kontur bawaan.'),
          url('url', 'Tautan (opsional)', { help: 'Kosongkan untuk menuju bagian Produk dan menyaring kategori ini.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Produk terlaris',
    description: 'Kartu produk dengan foto, label, rating, dan harga, plus filter kategori. Tombol Pesan membuka WhatsApp berisi nama produk.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Produk Terlaris'),
      sectionTitle('mis. Pilihan pendaki musim ini'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan kecil', { placeholder: 'mis. Stok dan ongkir dikonfirmasi lewat WhatsApp.', maxLength: 160 }),
      listField(
        'items',
        'Daftar produk',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Tenda Dome 2 Orang', maxLength: 60 }),
          t('category', 'Kategori', { placeholder: 'mis. Tenda', maxLength: 30, help: 'Dipakai untuk filter. Tulis sama persis untuk produk sekategori.' }),
          t('price', 'Harga', { placeholder: 'mis. Rp899.000', maxLength: 20 }),
          t('old_price', 'Harga coret (opsional)', { placeholder: 'mis. Rp1.050.000', maxLength: 20 }),
          t('badge', 'Label (opsional)', { placeholder: 'mis. Terlaris', maxLength: 20 }),
          t('rating', 'Rating (opsional)', { placeholder: 'mis. 4,9', maxLength: 4, help: 'Angka 1–5. Kosongkan untuk menyembunyikan bintang.' }),
          img('image', 'Foto', 'Foto persegi 1:1, disarankan 1200×1200 px.'),
          url('url', 'Tautan (opsional)', { help: 'Mis. halaman marketplace. Kosongkan untuk membuka WhatsApp dengan nama produk.' }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'guides',
    label: 'Panduan per gunung',
    description:
      'Kartu gunung yang bisa dipilih. Gunung terpilih membuka panel berisi jalur, catatan keselamatan, dan daftar perlengkapan yang bisa dicentang pengunjung.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Panduan Gunung'),
      sectionTitle('mis. Mau mendaki ke mana? Siapkan perlengkapan sesuai gunungnya'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan di bawah panduan', { placeholder: 'mis. Info jalur bisa berubah. Selalu cek pengumuman resmi.', maxLength: 200 }),
      listField(
        'items',
        'Daftar gunung',
        'Gunung',
        [
          t('name', 'Nama gunung', { placeholder: 'mis. Gunung Rinjani', maxLength: 40 }),
          t('location', 'Lokasi', { placeholder: 'mis. Lombok Timur, NTB', maxLength: 50 }),
          t('elevation', 'Ketinggian', { placeholder: 'mis. 3.726 mdpl', maxLength: 20 }),
          t('duration', 'Lama pendakian', { placeholder: 'mis. 3–4 hari', maxLength: 20 }),
          t('level', 'Tingkat kesulitan', { placeholder: 'mis. Sulit', maxLength: 20 }),
          t('route', 'Jalur populer', { placeholder: 'mis. Sembalun – Senaru', maxLength: 40 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1600×1200 px.'),
          ta('summary', 'Gambaran jalur', { placeholder: 'Ceritakan medan jalur dalam 1–2 kalimat.', maxLength: 320 }),
          ta('tip', 'Catatan keselamatan', { placeholder: 'mis. Wajib daftar online. Jalur ditutup saat musim hujan.', maxLength: 260 }),
          ta('gear', 'Perlengkapan yang disarankan', {
            placeholder: 'Satu baris satu barang, mis.\nCarrier 50–60 liter\nSleeping bag suhu nyaman 0–5°C',
            maxLength: 700,
            help: 'Tampil sebagai daftar centang (maks. 16 baris).',
          }),
          url('url', 'Tautan info resmi (opsional)', { help: 'Mis. laman taman nasional. Kosongkan untuk menyembunyikan.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'rental',
    label: 'Sewa alat',
    description: 'Bagian gelap berisi syarat sewa dan kalkulator: pengunjung memilih alat dan jumlah hari, total dihitung otomatis lalu dikirim lewat WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Sewa Alat'),
      sectionTitle('mis. Baru mulai mendaki? Sewa dulu, beli nanti'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px. Tampil di layar lebar.'),
      ta('terms', 'Syarat sewa', { placeholder: 'Satu baris satu syarat, mis.\nJaminan KTP asli\nAmbil di basecamp', maxLength: 400 }),
      t('discount_days', 'Diskon mulai (hari)', { placeholder: 'mis. 4', maxLength: 2, help: 'Kosongkan untuk tanpa diskon lama sewa.' }),
      t('discount_percent', 'Besar diskon (%)', { placeholder: 'mis. 10', maxLength: 2 }),
      t('button_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan Sewa via WhatsApp', maxLength: 30 }),
      listField(
        'items',
        'Alat yang disewakan',
        'Alat',
        [
          t('name', 'Nama alat', { placeholder: 'mis. Tenda Dome 2 Orang', maxLength: 40 }),
          t('price', 'Harga sewa per hari', { placeholder: 'mis. Rp35.000', maxLength: 20, help: PRICE_HELP }),
          t('note', 'Keterangan', { placeholder: 'mis. Double layer, termasuk pasak', maxLength: 50 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'safety',
    label: 'Tips keselamatan',
    description: 'Daftar tips bernomor dengan ikon otomatis, foto, dan kartu nomor darurat.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Tips Keselamatan'),
      sectionTitle('mis. Pulang dengan selamat adalah puncak yang sebenarnya'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto mendatar 16:10, disarankan 1600×1000 px.'),
      t('emergency_title', 'Kartu darurat: judul', { placeholder: 'mis. Keadaan darurat di gunung?', maxLength: 50, help: 'Kosongkan judul & teks untuk menyembunyikan kartu.' }),
      ta('emergency_text', 'Kartu darurat: teks', { placeholder: 'mis. Hubungi 112 atau Basarnas di 115.', maxLength: 200 }),
      listField(
        'items',
        'Tips',
        'Tips',
        [
          t('title', 'Judul', { placeholder: 'mis. Cek cuaca dan status gunung', maxLength: 50, help: 'Ikon dipilih otomatis dari judul (cuaca, daftar, rombongan, hipotermia, air, sampah, dll.).' }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 200 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita pendaki',
    description: 'Kartu kutipan pelanggan dengan nama, keterangan, dan foto (atau inisial).',
    toggleable: true,
    fields: [
      sectionLabel('mis. Cerita Pendaki'),
      sectionTitle('mis. Dipakai pendaki dari pendakian pertama sampai yang kesepuluh'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Laras Kinanti', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Mahasiswi, Malang · Gunung Prau', maxLength: 80 }),
          ta('quote', 'Testimoni', { placeholder: 'Tulis kesan pelanggan...', maxLength: 360 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk memakai inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    description: 'Daftar pertanyaan yang bisa dibuka-tutup, dengan kartu konsultasi WhatsApp di kiri.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Tanya Jawab'),
      sectionTitle('mis. Yang sering ditanyakan pendaki'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('help_title', 'Kartu konsultasi: judul', { placeholder: 'mis. Bingung memilih perlengkapan?', maxLength: 60 }),
      ta('help_text', 'Kartu konsultasi: teks', { placeholder: 'mis. Ceritakan gunung tujuan Anda, kami bantu.', maxLength: 160 }),
      t('button_label', 'Kartu konsultasi: teks tombol', { placeholder: 'mis. Konsultasi via WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu konsultasi: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Apa syarat menyewa alat?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'contact',
    label: 'Basecamp (kontak)',
    toggleable: true,
    fields: [
      sectionLabel('mis. Basecamp'),
      sectionTitle('mis. Mampir ke basecamp kami di Malang'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0341) 555-0128', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@toko.id', maxLength: 120 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk semua tombol pesan, sewa, dan konsultasi di halaman.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang perlengkapan mendaki.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari, 08.00–21.00 WIB', maxLength: 80 }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer gelap: logo, deskripsi, menu, kontak singkat, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang toko Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Toko. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama toko.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
