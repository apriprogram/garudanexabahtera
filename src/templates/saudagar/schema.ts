// Skema CMS Saudagar. Urutan section = urutan halaman: hero tiga foto lengkung → tentang → komoditas (tab + kartu
// spesifikasi) → proses mutu → kalender panen → asal & pasar tujuan → galeri → testimoni → tanya jawab → pita ajakan →
// kontak & formulir penawaran → footer. Kunci company profile (brand, hero, about, gallery, testimonials, faq, cta,
// contact, footer) sama artinya dengan template lain. Setiap section kecuali brand bisa disembunyikan. Template baru
// belum punya konten tersimpan, jadi tanpa `introduced`.
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

const EYEBROW_HELP = 'Tampil miring dengan tanda pisah di depannya, mis. "— Komoditas". Kosongkan untuk menyembunyikan.';
/** `inMenu`: section yang ada di menu; label satu kata (maks. 12 huruf) sekaligus menjadi nama menunya (./model navItems). */
const eyebrow = (placeholder: string, inMenu = false) =>
  t('eyebrow', 'Label kecil di atas judul', {
    placeholder,
    maxLength: 40,
    help: inMenu ? `${EYEBROW_HELP} Bila hanya satu kata (maks. 12 huruf), juga dipakai sebagai nama menu.` : EYEBROW_HELP,
  });
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const highlight = (placeholder: string) =>
  t('highlight', 'Bagian judul yang dicetak miring', { placeholder, maxLength: 40, help: 'Tulis persis seperti di judul, atau kosongkan.' });
const subtitle = (placeholder = 'Kalimat pengantar singkat.', maxLength = 280) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #products, #season, atau #kontak.';
const ARCH_HELP = 'Foto tegak 4:5, mis. 960 × 1200 px; tampil berbingkai lengkung. Kosongkan untuk menyembunyikan.';

export const saudagarSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama perusahaan, logo, dan satu warna aksen. Warna aksen mengatur batang kalender panen, garis tab aktif, dan simbol.',
    fields: [
      t('company_name', 'Nama perusahaan', { placeholder: 'mis. PT Saudagar Hasil Bumi', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Eksportir Kopi, Kakao & Rempah',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama perusahaan; nama + tagline sebaiknya ≤ 60 karakter.',
      }),
      img('logo', 'Logo perusahaan', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol Saudagar bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan saffron #B7791F. Versi gelap untuk teks berwarna dan versi terang untuk pita gelap dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero tiga foto',
    description: 'Judul serif besar di tengah, deskripsi, dua tombol, lalu tiga foto berbingkai lengkung dengan keterangan asal. Foto tengah wajib, dua foto samping boleh dikosongkan.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Eksportir hasil bumi · Makassar', maxLength: 50 }),
      t('title', 'Judul', { placeholder: 'mis. Kopi, kakao, dan rempah dari tanah Sulawesi', maxLength: 90, help: 'Tampil 2–3 baris; ± 40–60 karakter paling pas.' }),
      highlight('mis. tanah Sulawesi'),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Siapa Anda, apa yang dikirim, dan ke mana.',
        maxLength: 200,
        help: 'Juga dipakai sebagai deskripsi di Google; 120–155 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Minta penawaran', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju formulir penawaran (#kontak). ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tautan kedua', { placeholder: 'mis. Lihat komoditas', maxLength: 28 }),
      url('secondary_url', 'Tautan kedua', { help: `Kosongkan untuk menuju bagian Komoditas (#products). ${SECTION_LINK_HELP}` }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Minta penawaran', maxLength: 22, help: 'Kosongkan untuk menyembunyikan tombol.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju formulir penawaran. ${SECTION_LINK_HELP}` }),
      img('image', 'Foto tengah', 'Foto tegak 4:5, mis. 1200 × 1500 px; foto utama hero berbingkai lengkung.'),
      t('caption', 'Keterangan foto tengah', { placeholder: 'mis. Kopi arabika · Toraja', maxLength: 60 }),
      img('image_left', 'Foto kiri', 'Foto tegak 4:5, mis. 960 × 1200 px. Kosongkan untuk menyembunyikan.'),
      t('caption_left', 'Keterangan foto kiri', { placeholder: 'mis. Kakao · Luwu Utara', maxLength: 60 }),
      img('image_right', 'Foto kanan', 'Foto tegak 4:5, mis. 960 × 1200 px. Kosongkan untuk menyembunyikan.'),
      t('caption_right', 'Keterangan foto kanan', { placeholder: 'mis. Pala & fuli · Maluku Utara', maxLength: 60 }),
    ],
  },
  {
    key: 'about',
    label: 'Tentang perusahaan',
    description: 'Pernyataan besar, cerita perusahaan, nama pendiri, foto berbingkai lengkung, dan hingga 3 angka besar.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tentang kami', true),
      t('title', 'Pernyataan besar', { placeholder: 'Satu kalimat tentang cara Anda bekerja.', maxLength: 140 }),
      highlight('mis. kami periksa sendiri'),
      ta('body', 'Cerita perusahaan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 700, help: 'Paragraf dipisah baris kosong.' }),
      img('image', 'Foto', ARCH_HELP),
      t('image_caption', 'Keterangan foto', { placeholder: 'mis. Sortir tangan di gudang Makassar', maxLength: 60 }),
      t('founder_name', 'Nama pendiri / pimpinan', { placeholder: 'mis. Andi Rahmat Saputra', maxLength: 60 }),
      t('founder_role', 'Jabatan', { placeholder: 'mis. Pendiri & direktur', maxLength: 60 }),
      listField(
        'stats',
        'Angka besar',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 1.200+', maxLength: 12, help: 'Angka seperti "15" atau "1.200+" menghitung naik saat terlihat.' }),
          t('label', 'Keterangan', { placeholder: 'mis. ton dikirim sepanjang 2025', maxLength: 60 }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Komoditas & spesifikasi',
    description:
      'Tab per kategori (mis. Kopi, Kakao, Rempah, Kelapa) dengan foto dan pengantar, lalu kartu spesifikasi per komoditas. Hanya satu kategori → tab otomatis hilang. Tombol di kartu membuka formulir penawaran dengan komoditas itu terpilih.',
    toggleable: true,
    fields: [
      eyebrow('mis. Komoditas', true),
      title('mis. Spesifikasi komoditas yang kami kirim'),
      subtitle(),
      t('label_grade', 'Nama baris "Grade"', { placeholder: 'Grade', maxLength: 24, help: 'Ganti bila Anda menulis dalam bahasa lain. Kosong → "Grade".' }),
      t('label_origin', 'Nama baris "Asal"', { placeholder: 'Asal', maxLength: 24 }),
      t('label_moisture', 'Nama baris "Kadar air"', { placeholder: 'Kadar air', maxLength: 24 }),
      t('label_packaging', 'Nama baris "Kemasan"', { placeholder: 'Kemasan', maxLength: 24 }),
      t('label_moq', 'Nama baris "Min. pesanan"', { placeholder: 'Min. pesanan', maxLength: 24 }),
      t('button_label', 'Teks tautan di kartu', { placeholder: 'mis. Minta penawaran', maxLength: 24, help: 'Kosongkan untuk menyembunyikan tautan.' }),
      t('note', 'Catatan di bawah kartu', { placeholder: 'mis. Harga mengikuti pasar dan dikirim lewat penawaran tertulis.', maxLength: 160 }),
      listField(
        'categories',
        'Kategori (tab)',
        'Kategori',
        [
          t('name', 'Nama kategori', { placeholder: 'mis. Kopi', maxLength: 24 }),
          ta('intro', 'Pengantar', { placeholder: 'Satu-dua kalimat tentang kategori ini.', maxLength: 220 }),
          img('image', 'Foto kategori', 'Foto tegak 4:5, mis. 960 × 1200 px. Kosongkan → kartu memakai lebar penuh.'),
          t('origin', 'Daerah asal', { placeholder: 'mis. Toraja & Enrekang', maxLength: 60 }),
        ],
        4,
      ),
      listField(
        'items',
        'Kartu komoditas',
        'Komoditas',
        [
          t('category', 'Kategori', { placeholder: 'mis. Kopi', maxLength: 24, help: 'Tulis persis seperti nama kategori.' }),
          t('name', 'Nama komoditas', { placeholder: 'mis. Kopi Arabika Toraja', maxLength: 50 }),
          t('variety', 'Varietas / olahan', { placeholder: 'mis. Arabika · giling basah', maxLength: 60 }),
          t('grade', 'Grade', { placeholder: 'mis. Grade 1, screen 16+', maxLength: 40 }),
          t('origin', 'Asal', { placeholder: 'mis. Tana Toraja & Enrekang, Sulsel', maxLength: 50 }),
          t('moisture', 'Kadar air', { placeholder: 'mis. Maks. 12,5%', maxLength: 30 }),
          t('packaging', 'Kemasan', { placeholder: 'mis. Karung goni 60 kg', maxLength: 50 }),
          t('moq', 'Minimum pesanan', { placeholder: 'mis. 1 kontainer 20 ft', maxLength: 40 }),
          ta('note', 'Catatan', { placeholder: 'mis. Profil cokelat, rempah, dan buah kering.', maxLength: 160 }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'quality',
    label: 'Proses mutu',
    description: 'Langkah bernomor dari pembelian sampai kontainer disegel, satu foto, dan daftar dokumen yang disiapkan bersama pembeli.',
    toggleable: true,
    fields: [
      eyebrow('mis. Mutu', true),
      title('mis. Lima langkah sebelum karung masuk kontainer'),
      subtitle(),
      img('image', 'Foto', ARCH_HELP),
      t('image_caption', 'Keterangan foto', { placeholder: 'mis. Uji cita rasa sampel kopi', maxLength: 60 }),
      t('points_title', 'Judul daftar dokumen', { placeholder: 'mis. Dokumen yang kami siapkan bersama tim Anda', maxLength: 60 }),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [
          t('title', 'Judul langkah', { placeholder: 'mis. Uji kadar air', maxLength: 50 }),
          ta('text', 'Penjelasan', { placeholder: 'Apa yang dilakukan dan dicatat.', maxLength: 200 }),
        ],
        6,
      ),
      listField('points', 'Dokumen', 'Dokumen', [t('text', 'Nama dokumen', { placeholder: 'mis. Invoice dan packing list', maxLength: 70 })], 6),
    ],
  },
  {
    key: 'season',
    label: 'Kalender panen',
    description: 'Satu baris per komoditas dengan batang musim panen dan panen raya per bulan. Bulan ditulis biasa, mis. "Mei–Sep" atau "Apr–Jul, Okt–Des".',
    toggleable: true,
    fields: [
      eyebrow('mis. Musim panen', true),
      title('mis. Kalender panen untuk merencanakan kontrak'),
      subtitle(),
      t('legend_harvest', 'Keterangan batang muda', {
        placeholder: 'Musim panen',
        maxLength: 24,
        help: 'Juga awalan teks tiap baris, mis. "Musim panen Mei–Sep". Kosong → "Panen".',
      }),
      t('legend_peak', 'Keterangan batang tegas', {
        placeholder: 'Panen raya',
        maxLength: 24,
        help: 'Juga awalan teks tiap baris, mis. "panen raya Jun–Agu". Kosong → "puncak".',
      }),
      t('month_labels', 'Nama bulan', {
        placeholder: 'Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des',
        maxLength: 90,
        help: '12 nama bulan dipisah koma (mis. untuk versi bahasa Inggris). Kosong → nama bulan Indonesia.',
      }),
      t('note', 'Catatan di bawah kalender', { placeholder: 'mis. Musim bergeser mengikuti cuaca setiap tahun.', maxLength: 200 }),
      listField(
        'items',
        'Baris komoditas',
        'Baris',
        [
          t('name', 'Komoditas', { placeholder: 'mis. Kopi arabika', maxLength: 40 }),
          t('origin', 'Daerah', { placeholder: 'mis. Toraja & Enrekang', maxLength: 40 }),
          t('harvest', 'Musim panen', { placeholder: 'mis. Mei–Sep', maxLength: 30, help: 'mis. Mei–Sep, 5-9, atau Apr–Jul, Okt–Des. Teks lain tampil tanpa batang.' }),
          t('peak', 'Panen raya', { placeholder: 'mis. Jun–Agu', maxLength: 30 }),
          t('note', 'Catatan', { placeholder: 'mis. Panen kedua lebih kecil.', maxLength: 80 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'markets',
    label: 'Asal & pasar tujuan',
    description: 'Daerah asal dengan foto bulat, lalu negara tujuan beserta pelabuhan, komoditas, dan Incoterm.',
    toggleable: true,
    fields: [
      eyebrow('mis. Asal & tujuan', true),
      title('mis. Dari kebun di Sulawesi ke pelabuhan pembeli kami'),
      subtitle(),
      t('origins_title', 'Judul daftar asal', { placeholder: 'mis. Asal komoditas', maxLength: 40 }),
      t('destinations_title', 'Judul daftar tujuan', { placeholder: 'mis. Pasar tujuan', maxLength: 40 }),
      t('port_note', 'Catatan pelabuhan', { placeholder: 'mis. Semua kiriman berangkat dari Pelabuhan Makassar.', maxLength: 160 }),
      listField(
        'origins',
        'Daerah asal',
        'Daerah',
        [
          t('name', 'Nama daerah', { placeholder: 'mis. Toraja & Enrekang', maxLength: 40 }),
          t('commodity', 'Komoditas', { placeholder: 'mis. Kopi arabika & robusta', maxLength: 50 }),
          img('image', 'Foto bulat', 'Foto 1:1 atau 4:5; tampil bulat. Kosongkan → simbol perusahaan.'),
        ],
        6,
      ),
      listField(
        'destinations',
        'Negara tujuan',
        'Negara',
        [
          t('country', 'Negara', { placeholder: 'mis. Jepang', maxLength: 40 }),
          t('port', 'Pelabuhan', { placeholder: 'mis. Osaka & Yokohama', maxLength: 50 }),
          t('commodities', 'Komoditas', { placeholder: 'mis. Kopi arabika', maxLength: 60 }),
          t('terms', 'Incoterm', { placeholder: 'mis. FOB · CIF', maxLength: 30 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    description: 'Foto berbingkai lengkung dengan keterangan dan lokasi, dari kebun sampai pemuatan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri', true),
      title('mis. Dari kebun ke kontainer'),
      listField(
        'items',
        'Foto',
        'Foto',
        [
          img('image', 'Foto', 'Foto tegak 4:5, mis. 960 × 1200 px.'),
          t('caption', 'Keterangan', { placeholder: 'mis. Memetik buah kopi merah', maxLength: 60 }),
          t('place', 'Lokasi', { placeholder: 'mis. Kebun mitra, Toraja Utara', maxLength: 40 }),
        ],
        9,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni pembeli',
    description: 'Kutipan pembeli dengan foto bulat (opsional; tanpa foto → inisial).',
    toggleable: true,
    fields: [
      eyebrow('mis. Kata pembeli'),
      title('mis. Pembeli yang kembali setiap musim'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Daisuke Hamano', maxLength: 60 }),
          t('role', 'Jabatan & kota', { placeholder: 'mis. Pemilik roastery · Osaka, Jepang', maxLength: 80 }),
          ta('quote', 'Kutipan', { placeholder: 'Pengalaman pembeli bekerja sama dengan Anda.', maxLength: 320 }),
          img('photo', 'Foto', 'Foto 1:1, mis. 480 × 480 px. Kosongkan → inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab',
    description: 'Pertanyaan buka-tutup dan tautan untuk bertanya langsung.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya jawab'),
      title('mis. Pertanyaan sebelum kontrak pertama'),
      subtitle('mis. Belum menemukan jawabannya? Tanyakan langsung ke tim penjualan kami.', 200),
      t('button_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 28, help: 'Kosongkan untuk menyembunyikan tautan.' }),
      url('button_url', 'Tujuan tautan', { help: `Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak). ${SECTION_LINK_HELP}` }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Berapa minimum pemesanan?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawaban singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan',
    description: 'Pita gelap espresso selebar layar: judul, deskripsi, tombol, tautan kedua, dan foto lengkung opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Mulai dari sampel'),
      title('mis. Minta sampel dan penawaran untuk musim panen berikutnya', 100),
      highlight('mis. musim panen berikutnya'),
      subtitle('Ajakan singkat.', 240),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Minta penawaran', maxLength: 28 }),
      url('button_url', 'Tautan tombol', { help: `Kosongkan untuk menuju formulir penawaran. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tautan kedua', { placeholder: 'mis. Chat tim penjualan', maxLength: 28 }),
      url('secondary_url', 'Tautan kedua', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      img('image', 'Foto', ARCH_HELP),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & formulir penawaran',
    description:
      'Formulir permintaan penawaran (komoditas, volume, Incoterm, negara & pelabuhan tujuan) yang menyusun pesan WhatsApp untuk tim penjualan; data tidak disimpan di website. Lalu alamat, kontak, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Minta penawaran'),
      subtitle(),
      t('form_title', 'Judul formulir', { placeholder: 'mis. Formulir permintaan penawaran', maxLength: 60 }),
      t('form_greeting', 'Salam pembuka pesan', {
        placeholder: 'mis. Halo PT Saudagar Hasil Bumi, saya ingin meminta penawaran.',
        maxLength: 120,
        help: 'Baris pertama pesan WhatsApp. Kosong → "Halo {nama perusahaan}, saya ingin meminta penawaran."',
      }),
      t('form_note', 'Catatan di bawah tombol', { placeholder: 'mis. Formulir ini hanya menyusun pesan WhatsApp; data tidak disimpan di website.', maxLength: 200 }),
      ta('address', 'Alamat', { placeholder: 'Alamat kantor / gudang', maxLength: 200 }),
      t('maps_query', 'Lokasi untuk peta', { placeholder: 'mis. Kota Makassar, Sulawesi Selatan', maxLength: 120, help: 'Kosong → peta memakai alamat.' }),
      url('maps_url', 'Tautan Google Maps', { help: 'Tautan embed atau kode <iframe> dari Google Maps (opsional).' }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 0812-3456-7890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'mis. ekspor@perusahaan.co.id', maxLength: 120 },
      { type: 'phone', key: 'whatsapp', label: 'Nomor WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Tujuan pesan formulir dan tombol WhatsApp melayang.' },
      t('whatsapp_message', 'Pesan awal tombol WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang komoditas ekspor.', maxLength: 160 }),
      t('hours', 'Jam kerja', { placeholder: 'mis. Senin–Jumat 08.00–17.00 WITA', maxLength: 90 }),
      listField('incoterms', 'Pilihan Incoterm', 'Incoterm', [t('label', 'Incoterm', { placeholder: 'mis. FOB Makassar', maxLength: 40 })], 6),
      listField('units', 'Satuan volume', 'Satuan', [t('label', 'Satuan', { placeholder: 'mis. kontainer 20 ft', maxLength: 30 })], 5),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Nama perusahaan besar, deskripsi singkat, menu, kontak, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang perusahaan.', maxLength: 280 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Perusahaan', maxLength: 120, help: 'Kosongkan untuk teks otomatis berisi tahun dan nama perusahaan.' }),
      url('instagram', 'Instagram'),
      url('facebook', 'Facebook'),
      url('linkedin', 'LinkedIn'),
      url('youtube', 'YouTube'),
      url('tiktok', 'TikTok'),
    ],
  },
];
