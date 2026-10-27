// Skema CMS Altura. Urutan section = urutan halaman: hero dua panel → tentang → tiga pilar → deret layanan berjalan →
// pita angka → keunggulan → proyek unggulan (akordion) → portofolio berfilter → pimpinan → penghargaan → testimoni →
// wawasan → ajakan → kontak → teks formulir enquiry → footer. Kunci company profile (brand, hero, about, testimonials,
// cta, contact, footer) sama artinya dengan template lain; section baru memakai kunci Inggris pendek. Label & bantuan CMS
// berbahasa Indonesia (pembeli Indonesia), contoh isian boleh berbahasa Inggris karena konten demo berbahasa Inggris.
// SETIAP teks yang tampil di situs punya field di sini (termasuk nama menu, label baris kontak, judul kolom footer, dan
// semua teks formulir enquiry di section `enquiry`), jadi seluruh situs bisa diganti ke bahasa Indonesia. Setiap section
// halaman bisa disembunyikan (`enquiry` bagian dari Kontak, jadi tanpa sakelar sendiri). Template baru belum punya konten
// tersimpan, jadi tanpa `introduced`.
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

/** Label pil kecil di atas judul. `menu` = section yang punya item di menu atas (lihat `menuLabel`). */
const EYEBROW_HELP = {
  menu: 'Tampil di pil kecil di atas judul. Kosongkan untuk menyembunyikan pil. Bila "Nama di menu" kosong, label singkat ini (≤ 14 huruf, ≤ 2 kata) dipakai sebagai nama di menu.',
  plain: 'Tampil di pil kecil di atas judul. Kosongkan untuk menyembunyikan.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'plain') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
/** Nama section di menu atas, menu HP, dan kolom menu footer. */
const menuLabel = (placeholder: string) =>
  t('menu_label', 'Nama di menu', {
    placeholder,
    maxLength: 18,
    help: 'Nama bagian ini di menu atas dan footer. Kosongkan untuk memakai label kecil di atas judul (bila singkat), atau nama bawaan berbahasa Inggris.',
  });
/** Teks kecil bawaan yang wajib ada (label isian, tombol, pesan galat): kosong → kembali ke teks bawaan Inggris. */
const REQUIRED_TEXT_HELP = 'Wajib ada; bila dikosongkan, teks bawaan berbahasa Inggris dipakai lagi.';
const HIDE_HELP = 'Kosongkan untuk menyembunyikan.';
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #developments, #portfolio, #leadership, atau #contact.';
const button = (labelPlaceholder: string, urlHelp: string) => [
  t('button_label', 'Teks tombol', { placeholder: labelPlaceholder, maxLength: 30 }),
  url('button_url', 'Tautan tombol', { help: `${urlHelp} ${SECTION_LINK_HELP}` }),
];

export const alturaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna tema',
    description:
      'Nama perusahaan, logo, dan warna tema. Satu warna (limau bawaan) mengatur tombol, lingkaran angka, satu kartu pilar, dan nuansa pita gelap & footer.',
    fields: [
      t('company_name', 'Nama perusahaan', { placeholder: 'mis. Altura Developments', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Global real estate developer & investment manager',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama perusahaan: sebut bidang usaha Anda.',
      }),
      img('logo', 'Logo perusahaan', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol Altura bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Klik pilihan cepat, tombol "Pakai bawaan" untuk limau bawaan #D4EC5E, atau tulis kode hex sendiri. Warna teks di atasnya, versi gelap untuk pita & footer, dan versi terang untuk teks di latar gelap dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (dua panel)',
    description:
      'Kiri foto menara tegak, kanan panel krem dengan judul besar, deskripsi, tombol, lingkaran angka (mis. 40 tahun pengalaman), dan pil berfoto (ke video perusahaan atau bagian halaman). Menu pil putih menumpang di atasnya.',
    toggleable: true,
    fields: [
      t('title', 'Judul utama', {
        placeholder: 'mis. Raising the standard of urban living',
        maxLength: 70,
        help: 'Paling bagus 3 baris (± 30–45 karakter).',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan perusahaan Anda dalam 1–2 kalimat.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 150–200 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol', { placeholder: 'mis. View all services', maxLength: 28 }),
      url('primary_url', 'Tautan tombol', { help: `Kosongkan untuk menuju bagian Pilar (layanan). ${SECTION_LINK_HELP}` }),
      img('image', 'Foto menara (panel kiri)', 'Foto tegak 3:4, disarankan 1200×1600 px. Gedung utama di tengah.'),
      t('image_caption', 'Keterangan di foto', { placeholder: 'mis. The Verdant Residences, Singapore', maxLength: 60, help: 'Tampil di chip kecil di sudut foto. Kosongkan untuk menyembunyikan.' }),
      t('stat_value', 'Lingkaran angka: angka', { placeholder: 'mis. 40', maxLength: 6, help: 'Paling pas 2–3 karakter (mis. 40 atau 120+); angka lebih panjang tampil lebih kecil.' }),
      t('stat_label', 'Lingkaran angka: keterangan', { placeholder: 'mis. years of experience', maxLength: 32 }),
      t('watch_label', 'Pil berfoto: teks', {
        placeholder: 'mis. Watch our story',
        maxLength: 22,
        help: 'Kosongkan untuk menyembunyikan pil. Ikon play hanya tampil bila tautannya video (YouTube, Vimeo, atau file .mp4); selain itu ikon panah, jadi tulis teks yang sesuai.',
      }),
      url('watch_url', 'Pil berfoto: tautan', { help: `Tautan video (mis. YouTube) atau bagian halaman. Kosongkan untuk menuju bagian Proyek. ${SECTION_LINK_HELP}` }),
      img('watch_image', 'Pil berfoto: foto kecil', 'Foto mendatar kecil di dalam pil. Kosongkan untuk pil gelap polos.'),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Get in touch', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju bagian Kontak. ${SECTION_LINK_HELP}` }),
      t('call_label', 'Teks sebelum nomor telepon di menu atas', {
        placeholder: 'mis. Call us:',
        maxLength: 16,
        help: 'Nomor diambil dari Telepon di bagian Kontak; tampil di layar lebar. Kosongkan untuk menyembunyikan.',
      }),
    ],
  },
  {
    key: 'about',
    label: 'Tentang perusahaan',
    description: 'Pil label kecil di kiri, judul besar dua baris di kanan, paragraf singkat, dan tautan teks.',
    toggleable: true,
    fields: [
      menuLabel('mis. About'),
      eyebrow('mis. Who we are', 'menu'),
      title('mis. We develop landmark real estate across four continents', 120),
      ta('body', 'Paragraf', { placeholder: 'Sejarah singkat, skala usaha, dan cara kerja perusahaan.', maxLength: 500 }),
      ...button('mis. Meet our leadership', 'Kosongkan untuk menuju bagian Pimpinan.'),
    ],
  },
  {
    key: 'pillars',
    label: 'Tiga pilar (kartu bernomor)',
    description:
      'Tiga kartu tinggi bernomor 01/02/03: kartu 1 gelap, kartu 2 berwarna tema dengan foto gedung di bagian bawah, kartu 3 berfoto. Kartu tanpa foto tampil gelap. Seluruh kartu bisa diklik.',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. What we stand for', maxLength: 50, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      listField(
        'items',
        'Kartu',
        'Kartu',
        [
          t('title', 'Judul', { placeholder: 'mis. What we do', maxLength: 32 }),
          ta('text', 'Teks', { placeholder: 'Satu-dua kalimat.', maxLength: 160 }),
          t('link_label', 'Teks tautan', { placeholder: 'mis. Our services', maxLength: 24 }),
          url('url', 'Tautan', { help: SECTION_LINK_HELP }),
          img('image', 'Foto', 'Kartu 2: foto gedung di bagian bawah kartu; kartu lain: foto latar. Tegak 4:5, 960×1200 px. Kosongkan untuk kartu gelap polos.'),
        ],
        3,
      ),
    ],
  },
  {
    key: 'amenities',
    label: 'Deret layanan berjalan',
    description: 'Deret pil bergaris berisi teks dan pil foto kecil yang bergerak pelan (berhenti saat disorot; diam bila gerak dimatikan pengunjung).',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. What every Altura address includes', maxLength: 60, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      listField(
        'items',
        'Pil',
        'Pil',
        [t('text', 'Teks', { placeholder: 'mis. Comprehensive amenities', maxLength: 32 }), img('image', 'Foto kecil (opsional)', 'Tampil sebagai pil foto sebelum teks. Mendatar.')],
        8,
      ),
    ],
  },
  {
    key: 'stats',
    label: 'Pita angka',
    description: 'Pita gelap di atas foto cakrawala dengan hingga 4 angka raksasa di ujung garis tipis bertitik, di ketinggian berbeda. Angka berjalan saat pertama terlihat.',
    toggleable: true,
    fields: [
      eyebrow('mis. Altura in numbers'),
      title('mis. Four decades of building, measured', 80),
      img('image', 'Foto latar', 'Foto cakrawala mendatar 16:9, 1600×900 px. Dibuat gelap otomatis agar angka terbaca. Kosongkan untuk pita gelap polos.'),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 48+', maxLength: 10, help: 'Tanda "+" di akhir tampil kecil berwarna tema.' }),
          t('label', 'Keterangan', { placeholder: 'mis. Completed projects', maxLength: 36 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'difference',
    label: 'Keunggulan',
    description: 'Foto, judul, dan tombol di kiri; hingga 6 keunggulan berikon garis di kanan. Ikon dipilih otomatis dari judul.',
    toggleable: true,
    fields: [
      eyebrow('mis. Why Altura'),
      title('mis. What makes us different', 80),
      subtitle(),
      img('image', 'Foto', 'Foto mendatar 4:3, 1200×900 px. Kosongkan untuk menyembunyikan.'),
      ...button('mis. Talk to our team', 'Kosongkan untuk menuju bagian Kontak.'),
      listField(
        'items',
        'Keunggulan',
        'Keunggulan',
        [
          t('title', 'Judul', { placeholder: 'mis. Security & compliance', maxLength: 40, help: 'Ikon dipilih otomatis dari judul.' }),
          ta('text', 'Penjelasan', { maxLength: 160 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'developments',
    label: 'Proyek unggulan (akordion)',
    description:
      'Pita gelap dengan kartu proyek tinggi bertumpuk: kartu aktif melebar berfoto (klik, sorot, atau fokus keyboard), kartu lain sempit berlabel tegak. Di HP menjadi rel geser.',
    toggleable: true,
    fields: [
      menuLabel('mis. Developments'),
      eyebrow('mis. Developments', 'menu'),
      title('mis. Discover luxury living at an attainable price', 90),
      ...button('mis. View all projects', 'Kosongkan untuk menuju bagian Portofolio.'),
      listField(
        'items',
        'Proyek',
        'Proyek',
        [
          t('name', 'Nama proyek', { placeholder: 'mis. The Canopy Residences', maxLength: 40 }),
          t('category', 'Jenis', { placeholder: 'mis. Residential tower', maxLength: 30 }),
          t('location', 'Lokasi', { placeholder: 'mis. Singapore', maxLength: 40 }),
          ta('text', 'Deskripsi singkat', { maxLength: 140 }),
          img('image', 'Foto', 'Wajib; proyek tanpa foto tidak tampil. Persegi 1200×1200 px, gedung di tengah.'),
          t('link_label', 'Teks tombol', { placeholder: 'mis. Request details', maxLength: 22 }),
          url('url', 'Tautan tombol', { help: `Kosongkan untuk menuju bagian Kontak. ${SECTION_LINK_HELP}` }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'portfolio',
    label: 'Portofolio properti (dengan filter)',
    description:
      'Kartu properti berfoto dengan tombol filter dari kolom Kategori (mis. Residential, Commercial, Hospitality, Mixed-use): nama, lokasi, harga, dan hingga 3 spesifikasi berikon otomatis.',
    toggleable: true,
    fields: [
      menuLabel('mis. Portfolio'),
      eyebrow('mis. Portfolio', 'menu'),
      title('mis. Find a place you will call home', 90),
      subtitle(),
      t('all_label', 'Teks tombol filter "semua"', { placeholder: 'mis. All', maxLength: 16 }),
      listField(
        'items',
        'Properti',
        'Properti',
        [
          t('name', 'Nama properti', { placeholder: 'mis. Palm Grove Villa', maxLength: 40 }),
          t('category', 'Kategori (untuk filter)', { placeholder: 'mis. Residential', maxLength: 24 }),
          t('location', 'Lokasi', { placeholder: 'mis. Bali, Indonesia', maxLength: 40 }),
          t('price', 'Harga', { placeholder: 'mis. From $340,000', maxLength: 28 }),
          t('spec_1', 'Spesifikasi 1', { placeholder: 'mis. 300 m²', maxLength: 20, help: 'Ikon dipilih otomatis (m²/sq ft, beds, baths, floors, parking).' }),
          t('spec_2', 'Spesifikasi 2', { placeholder: 'mis. 4 beds', maxLength: 20 }),
          t('spec_3', 'Spesifikasi 3', { placeholder: 'mis. 3 baths', maxLength: 20 }),
          img('image', 'Foto', 'Mendatar 4:3, 1200×900 px.'),
          url('url', 'Tautan (opsional)', { help: `Kosongkan agar kartu tidak bisa diklik. ${SECTION_LINK_HELP}` }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'leadership',
    label: 'Pimpinan',
    description: 'Judul terpusat dan hingga 4 kartu foto pimpinan (nama, jabatan, tautan LinkedIn opsional); kartu tengah sedikit turun. Di HP menjadi rel geser.',
    toggleable: true,
    fields: [
      menuLabel('mis. Leadership'),
      eyebrow('mis. Leadership', 'menu'),
      title('mis. Global executive leadership', 80),
      subtitle(),
      listField(
        'items',
        'Pimpinan',
        'Pimpinan',
        [
          t('name', 'Nama', { placeholder: 'mis. Elena Marquez', maxLength: 50 }),
          t('role', 'Jabatan', { placeholder: 'mis. Group Chief Executive Officer', maxLength: 60 }),
          img('photo', 'Foto', 'Tegak 4:5, 960×1200 px. Kosongkan untuk inisial.'),
          url('linkedin', 'LinkedIn (opsional)', { placeholder: 'https://linkedin.com/in/...' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'awards',
    label: 'Penghargaan',
    description: 'Pita krem dengan judul terpusat dan deret pil penghargaan yang bergerak pelan (dua baris bila ≥ 6 penghargaan).',
    toggleable: true,
    fields: [
      eyebrow('mis. Awards'),
      title('mis. Recognitions we have earned', 80),
      subtitle(),
      listField(
        'items',
        'Penghargaan',
        'Penghargaan',
        [
          t('title', 'Nama penghargaan', { placeholder: 'mis. Residential Developer of the Year', maxLength: 50 }),
          t('issuer', 'Pemberi & tahun', { placeholder: 'mis. Asia Habitat Awards 2025', maxLength: 50 }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Daftar kutipan bergaris tipis di kiri dan foto tinggi di kanan dengan kartu nilai (mis. 4.9 rata-rata penilaian penghuni).',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimonials'),
      title('mis. Trusted by residents and partners', 80),
      img('image', 'Foto', 'Tegak 4:5, 960×1200 px. Kosongkan untuk menyembunyikan.'),
      t('rating_value', 'Kartu di foto: angka', { placeholder: 'mis. 4.9', maxLength: 8 }),
      t('rating_label', 'Kartu di foto: keterangan', { placeholder: 'mis. Average resident rating', maxLength: 40 }),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          ta('quote', 'Kutipan', { maxLength: 280 }),
          t('name', 'Nama', { maxLength: 50 }),
          t('role', 'Keterangan', { placeholder: 'mis. Resident, The Canopy Residences', maxLength: 60 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah. Kosongkan untuk inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'insights',
    label: 'Wawasan & berita',
    description: 'Tiga kartu artikel berfoto dengan label kategori dan tanggal. Isi dari CMS (tanpa sistem blog).',
    toggleable: true,
    fields: [
      menuLabel('mis. Insights'),
      eyebrow('mis. Insights', 'menu'),
      title('mis. Discover insight and trends', 80),
      ...button('mis. View all insights', 'Kosongkan untuk menyembunyikan tombol.'),
      listField(
        'items',
        'Artikel',
        'Artikel',
        [
          t('title', 'Judul', { maxLength: 90 }),
          t('category', 'Kategori', { placeholder: 'mis. Design', maxLength: 20 }),
          t('date', 'Tanggal', {
            placeholder: 'mis. 2026-10-08',
            maxLength: 30,
            help: 'Tulis YYYY-MM-DD (mis. 2026-10-08) agar tampil sebagai "Oct 8, 2026" (bahasa Inggris), atau teks bebas yang tampil apa adanya, mis. "8 Okt 2026".',
          }),
          img('image', 'Foto', 'Mendatar 3:2, 1200×800 px.'),
          url('url', 'Tautan artikel', { help: 'Mis. artikel di LinkedIn atau situs berita. Kosongkan agar kartu tidak bisa diklik.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (foto gelap)',
    description: 'Panel foto gelap besar dengan judul terpusat dan dua tombol.',
    toggleable: true,
    fields: [
      title('mis. Your dream home awaits', 70),
      subtitle(),
      img('image', 'Foto latar', 'Foto gelap/malam mendatar 16:9, 1600×900 px. Lapisan gelap ditambahkan otomatis. Kosongkan untuk panel gelap polos.'),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Book a private viewing', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju formulir di bagian Kontak. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Chat on WhatsApp', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk membuka WhatsApp perusahaan (nomor di bagian Kontak).' }),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & kantor',
    description:
      'Judul, telepon, email, jam layanan, daftar kantor, peta Google Maps (opsional), dan di sebelahnya formulir enquiry yang menyusun pesan WhatsApp atau email (teksnya diatur di bagian "Formulir enquiry"). Formulir tidak menyimpan data dan tidak mengirim ke server.',
    toggleable: true,
    fields: [
      menuLabel('mis. Contact'),
      eyebrow('mis. Contact', 'menu'),
      title('mis. Let’s talk about your next address', 90),
      subtitle(),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. +65 6555 0100', maxLength: 30, help: 'Tulis dengan kode negara (mis. +65) agar bisa ditekan dari HP di luar negeri.' },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'enquiries@perusahaan.com', maxLength: 120, help: 'Dipakai tombol email di formulir.' },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp perusahaan',
        placeholder: 'mis. +65 8555 0100',
        maxLength: 20,
        help: 'Tulis dengan kode negara (mis. +65, +971, +44). Nomor diawali 0 dianggap nomor Indonesia (+62). Dipakai tombol WhatsApp melayang dan formulir.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Hello, I would like to know more about your developments.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Mon–Fri, 9:00–18:00 (SGT)', maxLength: 60 }),
      ta('address', 'Alamat kantor pusat', { placeholder: 'Alamat lengkap kantor pusat', maxLength: 200, help: 'Juga dipakai untuk peta bila kata kunci peta kosong.' }),
      listField(
        'offices',
        'Kantor',
        'Kantor',
        [
          t('city', 'Kota', { placeholder: 'mis. Dubai', maxLength: 30 }),
          t('label', 'Keterangan', { placeholder: 'mis. Regional office', maxLength: 30 }),
          t('address', 'Alamat', { maxLength: 120 }),
          { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. +971 4 555 0100', maxLength: 30 },
        ],
        6,
      ),
      t('maps_query', 'Kata kunci peta (opsional)', {
        placeholder: 'mis. Marina South, Singapore',
        maxLength: 120,
        help: 'Isi untuk menampilkan peta Google Maps. Kosongkan untuk menyembunyikan peta.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk tautan di bawah peta; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      t('phone_label', 'Label kecil: telepon', { placeholder: 'mis. Phone', maxLength: 24, help: `Tampil di atas nomor telepon. ${HIDE_HELP}` }),
      t('email_label', 'Label kecil: email', { placeholder: 'mis. Email', maxLength: 24, help: HIDE_HELP }),
      t('hours_label', 'Label kecil: jam layanan', { placeholder: 'mis. Office hours', maxLength: 24, help: HIDE_HELP }),
      t('address_label', 'Label kecil: alamat', { placeholder: 'mis. Headquarters', maxLength: 24, help: HIDE_HELP }),
      t('offices_title', 'Judul daftar kantor', { placeholder: 'mis. Our offices', maxLength: 30, help: HIDE_HELP }),
      t('maps_label', 'Teks tautan di bawah peta', { placeholder: 'mis. Open in Google Maps', maxLength: 30, help: `Tampil bila link lokasi diisi. ${HIDE_HELP}` }),
    ],
  },
  {
    key: 'enquiry',
    label: 'Formulir enquiry (teks & label)',
    description:
      'Semua teks formulir di sebelah info kontak: judul, pilihan keperluan, label isian, contoh isian, tombol, catatan, pesan galat, dan isi pesan WhatsApp/email yang tersusun. Bawaan berbahasa Inggris; tulis ulang dalam bahasa Indonesia bila situs Anda berbahasa Indonesia. Formulir tampil bila WhatsApp atau email perusahaan diisi di bagian Kontak.',
    fields: [
      t('title', 'Judul formulir', { placeholder: 'mis. Send an enquiry', maxLength: 50 }),
      ta('text', 'Teks pengantar', { maxLength: 200 }),
      listField('interests', 'Pilihan keperluan', 'Pilihan', [t('name', 'Pilihan', { placeholder: 'mis. Buying a home', maxLength: 40 })], 8),
      t('label_name', 'Label isian: nama', { placeholder: 'mis. Full name', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('label_email', 'Label isian: email', { placeholder: 'mis. Email', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('label_phone', 'Label isian: telepon', { placeholder: 'mis. Phone', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('label_interest', 'Label isian: keperluan', { placeholder: 'mis. Enquiry about', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('label_office', 'Label isian: kantor tujuan', { placeholder: 'mis. Preferred office', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('label_message', 'Label isian: pesan', { placeholder: 'mis. Message', maxLength: 30, help: `${REQUIRED_TEXT_HELP} Label isian juga dipakai di isi pesan yang tersusun.` }),
      t('optional_text', 'Penanda isian opsional', { placeholder: 'mis. (optional)', maxLength: 20, help: HIDE_HELP }),
      t('placeholder_email', 'Contoh di isian email', { placeholder: 'mis. name@company.com', maxLength: 40, help: HIDE_HELP }),
      t('placeholder_phone', 'Contoh di isian telepon', { placeholder: 'mis. +65 8555 0123', maxLength: 30, help: HIDE_HELP }),
      t('placeholder_message', 'Contoh di isian pesan', { maxLength: 90, help: HIDE_HELP }),
      t('prompt_interest', 'Pilihan kosong: keperluan', { placeholder: 'mis. Select a topic', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('prompt_office', 'Pilihan kosong: kantor', { placeholder: 'mis. Any office', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      t('submit_label', 'Tombol: susun pesan', { placeholder: 'mis. Prepare my message', maxLength: 30, help: REQUIRED_TEXT_HELP }),
      ta('note', 'Catatan di bawah tombol', { maxLength: 160, help: `Jelaskan bahwa data tidak disimpan. ${HIDE_HELP}` }),
      t('ready_title', 'Setelah disusun: judul', { placeholder: 'mis. Your message is ready', maxLength: 40, help: REQUIRED_TEXT_HELP }),
      t('ready_text', 'Setelah disusun: keterangan', { maxLength: 120, help: HIDE_HELP }),
      t('whatsapp_label', 'Tombol: buka WhatsApp', { placeholder: 'mis. Open WhatsApp', maxLength: 28, help: REQUIRED_TEXT_HELP }),
      t('email_label', 'Tombol: kirim email', { placeholder: 'mis. Send by email', maxLength: 28, help: REQUIRED_TEXT_HELP }),
      t('edit_label', 'Tombol: ubah isian', { placeholder: 'mis. Edit details', maxLength: 28, help: REQUIRED_TEXT_HELP }),
      t('call_text', 'Teks bila WhatsApp & email kosong', { maxLength: 120, help: `Tampil di atas tombol telepon sebagai ganti formulir. ${HIDE_HELP}` }),
      t('error_name', 'Pesan galat: nama', { maxLength: 100, help: REQUIRED_TEXT_HELP }),
      t('error_email', 'Pesan galat: email', { maxLength: 100, help: REQUIRED_TEXT_HELP }),
      t('error_phone', 'Pesan galat: telepon', { maxLength: 100, help: REQUIRED_TEXT_HELP }),
      t('error_interest', 'Pesan galat: keperluan', { maxLength: 100, help: REQUIRED_TEXT_HELP }),
      t('error_message', 'Pesan galat: pesan', { maxLength: 100, help: `${REQUIRED_TEXT_HELP} Pesan minimal 10 karakter.` }),
      t('greeting', 'Isi pesan: salam pembuka', { placeholder: 'mis. Hello Altura, I would like to make an enquiry.', maxLength: 120, help: `Baris pertama pesan WhatsApp/email. ${HIDE_HELP}` }),
      t('closing', 'Isi pesan: penutup', { placeholder: 'mis. Thank you.', maxLength: 60, help: HIDE_HELP }),
      t('subject', 'Subjek email', { placeholder: 'mis. Enquiry', maxLength: 40, help: 'Subjek = teks ini, keperluan, dan nama pengirim. Kosongkan untuk keperluan dan nama saja.' }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita gelap: logo, deskripsi, media sosial, kolom tautan (menu, proyek, kantor, kontak) dengan judul kolom, dan nama perusahaan raksasa yang samar.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang perusahaan Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Perusahaan. All rights reserved.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama perusahaan (bahasa Inggris: "© 2026 Nama. All rights reserved.").' }),
      t('menu_title', 'Judul kolom menu', { placeholder: 'mis. Company', maxLength: 24, help: HIDE_HELP }),
      t('projects_title', 'Judul kolom proyek', { placeholder: 'mis. Developments', maxLength: 24, help: HIDE_HELP }),
      t('offices_title', 'Judul kolom kantor', { placeholder: 'mis. Offices', maxLength: 24, help: HIDE_HELP }),
      t('contact_title', 'Judul kolom kontak', { placeholder: 'mis. Contact', maxLength: 24, help: HIDE_HELP }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
