// Skema CMS NusaNiaga. Urutan section = urutan halaman: hero berbilah → klien & strip industri → layanan → produk →
// proses impor → jangkauan (negara asal & area pengantaran) → keunggulan & angka → testimoni → tanya jawab → pita ajakan
// → kontak & formulir penawaran → footer. Setiap section (selain identitas) bisa disembunyikan. Template baru belum
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

/** Label berbingkai di atas judul section (juga nama di menu atas bila singkat). */
const tag = (placeholder: string) =>
  t('eyebrow', 'Label berbingkai di atas judul', {
    placeholder,
    maxLength: 24,
    help: 'Tampil sebagai label huruf kapital berbingkai, mis. "PROSES IMPOR". Label singkat (≤ 14 huruf, ≤ 2 kata) juga dipakai sebagai nama di menu atas. Kosongkan untuk menyembunyikan.',
  });
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (maxLength = 280, placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #kontak, #produk, #jangkauan, atau tautan https://.';

export const nusaniagaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna aksen',
    description: 'Nama perusahaan, tagline, logo, dan satu warna aksen yang mengatur blok tombol di menu, tombol, label, garis proses, dan pita ajakan.',
    fields: [
      t('company_name', 'Nama perusahaan', { placeholder: 'mis. PT Arunika Niaga Internasional', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Importir Bahan Baku & Mesin',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama perusahaan; nama + tagline paling pas ≤ 60 huruf.',
      }),
      img('logo', 'Logo perusahaan', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol NusaNiaga bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan merah crimson #A61E3A. Mengatur blok tombol di menu, tombol, label, garis proses, pita ajakan, dan garis atas footer; warna teks di atasnya disesuaikan otomatis.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto berbilah)',
    description:
      'Judul besar di kanan, satu foto tegak di kiri yang tampil terpotong menjadi bilah-bilah vertikal, chip negara asal yang menuju bagian Jangkauan, dan dua tombol. Juga mengatur tombol di blok warna pada menu atas.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label berbingkai di atas judul', { placeholder: 'mis. Importir & distributor · Cikarang', maxLength: 48 }),
      t('title', 'Judul utama', {
        placeholder: 'mis. Bahan baku dan mesin impor, sampai di lini produksi Anda',
        maxLength: 90,
        help: 'Paling bagus 3-4 baris, ± 50-60 huruf.',
      }),
      t('highlight', 'Bagian judul berwarna aksen', {
        placeholder: 'mis. lini produksi',
        maxLength: 40,
        help: 'Bagian judul yang diberi warna aksen. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan perusahaan Anda dalam 1–2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('origin_label', 'Judul chip negara asal', {
        placeholder: 'mis. Negara asal',
        maxLength: 30,
        help: 'Judul kecil di atas chip negara. Chip diambil dari daftar Negara asal di bagian Jangkauan (maks. 8 pertama).',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Minta Penawaran', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju formulir penawaran di bagian Kontak. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Lihat produk', maxLength: 28, help: 'Kosongkan untuk menyembunyikan.' }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Produk.' }),
      t('header_label', 'Teks tombol di menu atas', {
        placeholder: 'mis. Minta Penawaran',
        maxLength: 24,
        help: 'Tombol di blok warna pada menu atas. Kosongkan untuk menyembunyikan.',
      }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian Kontak.' }),
      img('image', 'Foto hero', 'Foto tegak 4:5, disarankan 1440×1800 px. Tampil terpotong menjadi bilah vertikal: 4 bilah di layar lebar, 3 di HP. Letakkan subjek di tengah.'),
    ],
  },
  {
    key: 'clients',
    label: 'Klien & industri',
    description: 'Nama atau logo klien di samping judul singkat, lalu strip berjalan berisi industri yang Anda layani.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Memasok bahan baku untuk 140+ pabrik di Jawa', maxLength: 100 }),
      t('industries_label', 'Judul strip industri', { placeholder: 'mis. Industri yang kami layani', maxLength: 40 }),
      listField('industries', 'Industri', 'Industri', [t('name', 'Nama industri', { placeholder: 'mis. Kemasan plastik', maxLength: 32 })], 10),
      listField(
        'items',
        'Klien',
        'Klien',
        [
          t('name', 'Nama klien', { placeholder: 'mis. PT Contoh Plastik', maxLength: 60 }),
          img('logo', 'Logo', 'SVG/PNG transparan, tinggi tampil 28 px. Kosong → nama ditulis.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'services',
    label: 'Layanan',
    description: 'Kartu layanan berikon dengan garis aksen di atas, deskripsi, dan maksimal tiga poin singkat.',
    toggleable: true,
    fields: [
      tag('mis. Layanan'),
      title('mis. Dari mencari pemasok sampai barang masuk gudang pabrik Anda'),
      subtitle(),
      listField(
        'items',
        'Daftar layanan',
        'Layanan',
        [
          t('title', 'Nama layanan', { placeholder: 'mis. Sourcing pemasok luar negeri', maxLength: 60, help: 'Ikon dipilih otomatis dari nama layanan.' }),
          ta('description', 'Deskripsi', { maxLength: 220 }),
          ta('points', 'Poin singkat', { placeholder: 'Satu baris = satu poin', maxLength: 160, help: 'Satu baris = satu poin, maks. 3 poin.' }),
          img('image', 'Foto (opsional)', 'Opsional, 16:10, 1200×750 px. Kosongkan untuk kartu berikon.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Produk',
    description: 'Produk atau kategori yang Anda pasok: foto, jenis, negara asal, keterangan kemasan atau minimum pesanan. Di HP tampil sebagai rel geser.',
    toggleable: true,
    fields: [
      tag('mis. Produk'),
      title('mis. Bahan baku, mesin, dan suku cadang yang kami pasok'),
      subtitle(),
      t('note', 'Catatan di bawah daftar', { placeholder: 'mis. Data teknis dan harga dikirim setelah formulir diisi.', maxLength: 160 }),
      listField(
        'items',
        'Daftar produk',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Resin plastik PP & HDPE', maxLength: 60 }),
          t('kind', 'Jenis', { placeholder: 'mis. Bahan baku', maxLength: 24, help: 'mis. Bahan baku, Mesin, Suku cadang' }),
          t('origin', 'Negara asal', { placeholder: 'mis. Korea Selatan · Thailand', maxLength: 60, help: 'Negara asal, pisahkan dengan ·' }),
          t('spec', 'Kemasan / MOQ / kapasitas', { placeholder: 'mis. Sak 25 kg · mulai 1 palet', maxLength: 60, help: 'Kemasan / MOQ / kapasitas' }),
          ta('description', 'Deskripsi', { maxLength: 200 }),
          img('image', 'Foto', '16:10, 1200×750 px.'),
        ],
        9,
      ),
    ],
  },
  {
    key: 'process',
    label: 'Proses impor',
    description: 'Langkah-langkah dalam daftar buka-tutup dengan garis alur bernomor yang terisi saat bagian ini mulai terlihat, foto, dan catatan.',
    toggleable: true,
    fields: [
      tag('mis. Proses impor'),
      title('mis. Lima langkah dari permintaan sampai barang tiba di pabrik'),
      subtitle(),
      img('image', 'Foto', 'Opsional, 16:10, 1200×750 px. Kosongkan untuk menyembunyikan.'),
      t('note', 'Catatan', { placeholder: 'mis. Barang dari stok gudang bisa diantar lebih cepat.', maxLength: 160 }),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [
          t('title', 'Nama langkah', { placeholder: 'mis. Penawaran landed cost', maxLength: 60 }),
          t('duration', 'Waktu', { placeholder: 'mis. Minggu 2–6', maxLength: 24, help: 'mis. Minggu 2–6' }),
          ta('text', 'Penjelasan', { maxLength: 300 }),
          t('output', 'Hasil untuk klien', { placeholder: 'mis. Penawaran tertulis', maxLength: 60, help: 'Dokumen/hasil yang diterima klien' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'coverage',
    label: 'Jangkauan',
    description: 'Negara asal pemasok beserta produknya, area pengantaran, dan satu foto. Negara asal juga tampil sebagai chip di hero.',
    toggleable: true,
    fields: [
      tag('mis. Jangkauan'),
      title('mis. Dari 18 negara asal ke kawasan industri di Jawa dan Sumatra'),
      subtitle(),
      img('image', 'Foto', 'Opsional, 16:10, 1600×1000 px. Kosongkan untuk menyembunyikan.'),
      t('origins_label', 'Judul daftar negara asal', { placeholder: 'mis. Negara asal utama', maxLength: 30 }),
      listField(
        'origins',
        'Negara asal',
        'Negara',
        [
          t('code', 'Kode negara', { placeholder: 'mis. DE', maxLength: 3, help: 'Kode negara 2 huruf, mis. DE' }),
          t('country', 'Nama negara', { placeholder: 'mis. Jerman', maxLength: 32 }),
          t('products', 'Produk dari negara ini', { placeholder: 'mis. Mesin CNC, bearing', maxLength: 80 }),
        ],
        12,
      ),
      t('areas_label', 'Judul area pengantaran', { placeholder: 'mis. Area pengantaran', maxLength: 30 }),
      t('areas', 'Area pengantaran', {
        placeholder: 'mis. Jabodetabek · Karawang · Bandung',
        maxLength: 200,
        help: 'Pisahkan dengan · atau koma; tiap kata jadi satu label.',
      }),
    ],
  },
  {
    key: 'advantages',
    label: 'Keunggulan & angka',
    description: 'Empat angka besar bersatuan dalam satu kartu, foto, dan alasan memilih perusahaan Anda.',
    toggleable: true,
    fields: [
      tag('mis. Keunggulan'),
      title('mis. Satu mitra impor, satu jadwal, satu rincian biaya'),
      subtitle(),
      img('image', 'Foto', 'Opsional, 16:10, 1200×750 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'items',
        'Alasan',
        'Alasan',
        [
          t('title', 'Judul', { placeholder: 'mis. Stok penyangga di Cikarang', maxLength: 60, help: 'Ikon dipilih otomatis dari judul.' }),
          ta('description', 'Deskripsi', { maxLength: 220 }),
        ],
        6,
      ),
      listField(
        'stats',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 2.400+', maxLength: 12, help: 'mis. 2.400+ atau 6.500' }),
          t('unit', 'Satuan', { placeholder: 'mis. SKU', maxLength: 16, help: 'Satuan di chip, mis. negara, SKU, m²' }),
          t('label', 'Keterangan', { placeholder: 'mis. Bahan baku, mesin, dan suku cadang', maxLength: 60 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Kutipan klien dalam satu kartu bergaris: nama, jabatan, foto, kutipan, dan produk yang mereka beli.',
    toggleable: true,
    fields: [
      tag('mis. Testimoni'),
      title('mis. Kata bagian pengadaan yang sudah bekerja sama dengan kami'),
      subtitle(200),
      listField(
        'items',
        'Daftar testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Jabatan & perusahaan', { placeholder: 'mis. Manajer pengadaan, pabrik kemasan, Karawang', maxLength: 80 }),
          t('purchase', 'Produk yang dibeli', { placeholder: 'mis. Resin PP · asal Korea Selatan', maxLength: 60, help: 'Produk yang dibeli, mis. Resin PP · asal Korea Selatan' }),
          ta('quote', 'Kutipan', { maxLength: 400 }),
          img('photo', 'Foto', 'Persegi 480×480 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab',
    description: 'Pertanyaan dalam dua kolom kartu buka-tutup, ditambah tautan bertanya lewat WhatsApp.',
    toggleable: true,
    fields: [
      tag('mis. FAQ'),
      title('mis. Pertanyaan yang sering diajukan bagian pengadaan'),
      subtitle(200),
      t('link_label', 'Teks tautan bertanya', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      url('link_url', 'Tujuan tautan bertanya', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 500 })],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan',
    description: 'Pita warna aksen selebar layar dengan judul, deskripsi, dan dua tombol.',
    toggleable: true,
    fields: [
      tag('mis. Mulai impor'),
      title('mis. Kirim spesifikasi Anda, kami susun penawarannya', 100),
      subtitle(220),
      t('button_label', 'Teks tombol utama', { placeholder: 'mis. Isi Formulir Penawaran', maxLength: 30 }),
      url('button_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju formulir penawaran di bagian Kontak. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Chat lewat WhatsApp', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & formulir penawaran',
    description:
      'Alamat, telepon, email, WhatsApp, jam operasional, peta Google Maps, dan formulir permintaan penawaran yang menyusun pesan WhatsApp (data tidak disimpan di website).',
    toggleable: true,
    fields: [
      tag('mis. Kontak'),
      title('mis. Ceritakan kebutuhan pabrik Anda'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jalan, kawasan industri, kota', maxLength: 200 }),
      t('maps_query', 'Lokasi di peta', {
        placeholder: 'mis. Cikarang, Kabupaten Bekasi',
        maxLength: 120,
        help: 'Teks yang dicari di Google Maps bila tautan peta kosong. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Tautan Google Maps', { help: 'Tempel link Google Maps atau kode <iframe> sematan. Kosongkan untuk peta dari lokasi di atas.' }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 0218901234', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'mis. penawaran@perusahaan.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'Nomor WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol ajakan, dan formulir penawaran.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang produk Anda.', maxLength: 160 }),
      t('hours', 'Jam operasional', { placeholder: 'mis. Senin–Jumat 08.00–17.00 WIB', maxLength: 90 }),
      t('form_title', 'Judul formulir', { placeholder: 'mis. Formulir permintaan penawaran', maxLength: 60 }),
      ta('form_text', 'Keterangan formulir', {
        placeholder: 'Jelaskan bahwa formulir menyusun pesan WhatsApp.',
        maxLength: 220,
        help: 'Tampil di bawah tombol formulir. Sebaiknya tetap menyebut bahwa data tidak disimpan di website.',
      }),
      t('form_button', 'Teks tombol formulir', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
      listField('form_needs', 'Pilihan Kebutuhan di formulir', 'Pilihan', [t('label', 'Pilihan', { placeholder: 'mis. Bahan baku', maxLength: 30 })], 6),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer putih bergaris aksen di atas: deskripsi, media sosial, menu, daftar produk, dan kontak singkat.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: 'Kosongkan untuk teks otomatis', maxLength: 120, help: 'Kosong → © tahun ini + nama perusahaan.' }),
      url('instagram', 'Instagram'),
      url('facebook', 'Facebook'),
      url('linkedin', 'LinkedIn'),
      url('youtube', 'YouTube'),
      url('tiktok', 'TikTok'),
    ],
  },
];
