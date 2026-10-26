// Skema CMS Velora (label & bantuan berbahasa Indonesia untuk pembeli; contoh placeholder boleh berbahasa Inggris karena
// salinan demo berbahasa Inggris). Urutan section = urutan halaman: hero kartu foto → filosofi → bento → jajaran model →
// langkah kepemilikan → teknologi (carousel) → angka → testimoni (dinding potret) → newsroom → test drive (formulir) →
// dealer & kontak → footer. Kunci company profile (brand, hero, testimonials, cta, contact, footer) sama artinya dengan
// template lain; section khas memakai kunci Inggris pendek. Template baru belum punya konten tersimpan, jadi tanpa
// `introduced`. Setiap section bisa disembunyikan.
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

const EYEBROW_HELP = {
  menu: 'Tampil di atas judul dengan garis merah pendek dan dipakai sebagai nama bagian ini di menu atas (paling pas 1–2 kata). Kosong → menu memakai judul.',
  plain: 'Tampil di atas judul dengan garis merah pendek. Kosongkan untuk menyembunyikan.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'plain') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
const title = (placeholder: string, maxLength = 90) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Kalimat pengantar singkat.', maxLength = 280) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #lineup, #how, #cta (test drive), atau #kontak.';
const DATE_HELP = 'Tulis YYYY-MM-DD (mis. 2026-11-07) agar tampil sebagai "7 Nov 2026", atau teks bebas.';

export const veloraSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna aksen',
    description: 'Nama perusahaan, logo, dan satu warna aksen untuk chip panah, titik, dan sorotan kecil. Latar gelap & putih tulang tetap.',
    fields: [
      t('company_name', 'Nama perusahaan', { placeholder: 'mis. Velora Motor Group', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Premium cars & electric mobility · Zurich',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama perusahaan.',
      }),
      img('logo', 'Logo perusahaan', 'PNG/SVG berlatar transparan dan berwarna terang (tampil di atas latar gelap), maks. 2 MB. Kosongkan untuk memakai simbol Velora bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan merah #E3342F. Versi lebih gelap (teks di latar terang) dan lebih terang (teks di latar gelap) dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (kartu foto)',
    description:
      'Kartu foto lebar membulat dengan menu di dalamnya: label kecil, judul dengan satu kata di dalam pil + chip panah, deskripsi, tombol, dan kartu sorotan kecil (layar lebar) yang bisa menautkan video.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Drive the future today', maxLength: 50 }),
      t('title', 'Judul utama', {
        placeholder: 'mis. Seven decades of driving what comes next',
        maxLength: 70,
        help: 'Paling bagus 2–3 baris (± 30–50 karakter).',
      }),
      t('highlight', 'Kata di dalam pil', {
        placeholder: 'mis. driving',
        maxLength: 24,
        help: 'Tulis persis seperti di judul (satu-dua kata). Tampil di dalam pil bergaris dengan chip panah. Kosongkan untuk judul biasa.',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan perusahaan Anda dalam 1–2 kalimat.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 150–200 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol', { placeholder: 'mis. Explore models', maxLength: 26 }),
      url('primary_url', 'Tautan tombol', { help: 'Kosongkan untuk menuju jajaran model.' }),
      img('image', 'Foto hero', 'Foto mendatar 16:9, disarankan 1600×900 px; subjek di kanan-tengah. Lapisan gelap tipis ditambahkan otomatis agar teks terbaca.'),
      t('header_label', 'Teks tombol pil di menu atas', { placeholder: 'mis. Find a dealer', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol pil di menu atas', { help: 'Kosongkan untuk menuju bagian Dealer & kontak.' }),
      t('review_title', 'Kartu sorotan: judul', {
        placeholder: 'mis. Model spotlight',
        maxLength: 30,
        help: 'Kartu kecil di kanan bawah hero (hanya layar lebar). Kosongkan untuk menyembunyikannya.',
      }),
      t('review_text', 'Kartu sorotan: keterangan', { placeholder: 'mis. Kestrel GT · first drive, 4 min', maxLength: 50 }),
      img('review_image', 'Kartu sorotan: gambar sampul', 'Mendatar 16:10, disarankan 1200×750 px.'),
      t('review_label', 'Kartu sorotan: teks tautan', { placeholder: 'mis. Watch the review', maxLength: 24 }),
      url('review_url', 'Kartu sorotan: tautan', {
        placeholder: 'https://youtube.com/watch?v=...',
        help: 'Tautan video YouTube/Vimeo (atau file .mp4) menampilkan tombol putar di sampul. Tautan lain atau bagian halaman (mis. #lineup) menampilkan panah. Kosongkan untuk menuju jajaran model.',
      }),
    ],
  },
  {
    key: 'philosophy',
    label: 'Filosofi perusahaan',
    description: 'Judul besar di kiri, paragraf di kanan, dan hingga 4 prinsip bernomor.',
    toggleable: true,
    fields: [
      eyebrow('mis. Company', 'menu'),
      title('mis. Our philosophy rests on three convictions'),
      subtitle('Paragraf tentang perusahaan Anda.', 600),
      listField(
        'points',
        'Prinsip',
        'Prinsip',
        [t('title', 'Judul', { placeholder: 'mis. Engineering comes first', maxLength: 50 }), ta('text', 'Penjelasan', { maxLength: 160 })],
        4,
      ),
    ],
  },
  {
    key: 'bento',
    label: 'Bento (kartu foto & baris berpanah)',
    description:
      'Satu kartu foto tinggi, dua kartu foto gelap bertumpuk (masing-masing dengan chip label), dan hingga 4 baris abu berpanah. Ikon chip dipilih otomatis dari label.',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. Explore Velora', maxLength: 50, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      listField(
        'items',
        'Kartu foto',
        'Kartu',
        [
          t('label', 'Label chip', { placeholder: 'mis. Electric', maxLength: 20 }),
          t('title', 'Keterangan', { placeholder: 'mis. Charge at home, on the road, everywhere', maxLength: 70 }),
          img('image', 'Foto', 'Kartu pertama tegak 4:5 (960×1200 px), kartu lain mendatar 3:2 (1200×800 px). Kartu tanpa foto tidak tampil.'),
          url('url', 'Tautan', { help: SECTION_LINK_HELP }),
        ],
        3,
      ),
      listField(
        'rows',
        'Baris berpanah',
        'Baris',
        [
          t('title', 'Judul', { placeholder: 'mis. Leasing options', maxLength: 36 }),
          t('text', 'Keterangan singkat', { placeholder: 'mis. From 24 to 60 months', maxLength: 70 }),
          url('url', 'Tautan', { help: SECTION_LINK_HELP }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'lineup',
    label: 'Jajaran model',
    description:
      'Panel gelap berisi kartu model dengan tombol filter. Filter dibuat otomatis dari kolom "Kategori" (pisahkan dengan koma, mis. "SUV, Electric").',
    toggleable: true,
    fields: [
      eyebrow('mis. Models', 'menu'),
      title('mis. Our model lineup'),
      subtitle(),
      t('all_label', 'Teks filter "semua"', { placeholder: 'mis. All', maxLength: 16 }),
      t('button_label', 'Teks tombol di bawah', { placeholder: 'mis. Book a test drive', maxLength: 28, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menuju bagian Test drive.' }),
      listField(
        'items',
        'Model',
        'Model',
        [
          t('name', 'Nama model', { placeholder: 'mis. Velora Aster', maxLength: 40 }),
          t('category', 'Kategori', { placeholder: 'mis. Electric, Sedan', maxLength: 40, help: 'Dipakai untuk tombol filter; pisahkan beberapa kategori dengan koma.' }),
          t('tagline', 'Kalimat singkat', { maxLength: 70 }),
          t('price', 'Harga', { placeholder: 'mis. From $48,900', maxLength: 30 }),
          t('spec_1', 'Spesifikasi 1', { placeholder: 'mis. 640 km range', maxLength: 28 }),
          t('spec_2', 'Spesifikasi 2', { placeholder: 'mis. 0–100 km/h 5.1 s', maxLength: 28 }),
          t('spec_3', 'Spesifikasi 3', { maxLength: 28 }),
          img('image', 'Foto', 'Mendatar 4:3, disarankan 1200×900 px.'),
          url('url', 'Tautan kartu', { help: `Kosongkan untuk menuju bagian Test drive. ${SECTION_LINK_HELP}` }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'how',
    label: 'Langkah kepemilikan',
    description: 'Judul, deskripsi, 2–4 langkah berikon (ikon dipilih otomatis dari judul), tombol, dan foto tegak dengan kartu angka.',
    toggleable: true,
    fields: [
      eyebrow('mis. How it works', 'menu'),
      title('mis. Ownership in easy steps'),
      subtitle(),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [
          t('title', 'Judul', { placeholder: 'mis. Configure & reserve', maxLength: 40 }),
          ta('text', 'Penjelasan', { maxLength: 180 }),
          t('link_label', 'Teks tautan', { placeholder: 'mis. Start configuring', maxLength: 24 }),
          url('url', 'Tautan', { help: SECTION_LINK_HELP }),
        ],
        4,
      ),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Book a test drive', maxLength: 28 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menuju bagian Test drive.' }),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk tata letak satu kolom.'),
      t('badge_value', 'Kartu di foto: angka', { placeholder: 'mis. 3 years', maxLength: 14 }),
      t('badge_label', 'Kartu di foto: keterangan', { placeholder: 'mis. Service & software updates included', maxLength: 50 }),
    ],
  },
  {
    key: 'engineering',
    label: 'Teknologi (carousel kartu)',
    description:
      'Kartu foto berderet; kartu yang dipilih melebar dan menampilkan penjelasan (klik kartu atau tombol panah). Di HP menjadi rel geser. Ikon dipilih otomatis dari judul.',
    toggleable: true,
    fields: [
      eyebrow('mis. Technology', 'menu'),
      title('mis. Engineered in Zurich, proven everywhere'),
      subtitle(),
      listField(
        'items',
        'Kartu',
        'Kartu',
        [
          t('title', 'Judul', { placeholder: 'mis. Battery systems', maxLength: 36 }),
          ta('text', 'Penjelasan', { maxLength: 200 }),
          img('image', 'Foto', 'Mendatar 4:3, disarankan 1200×900 px; bagian tengah foto terlihat saat kartu menyempit.'),
          t('link_label', 'Teks tautan', { placeholder: 'mis. Learn more', maxLength: 24 }),
          url('url', 'Tautan', { help: 'Opsional.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'stats',
    label: 'Angka perusahaan',
    description: 'Hingga 4 angka raksasa dengan titik merah. Angka berjalan saat pertama terlihat.',
    toggleable: true,
    fields: [
      eyebrow('mis. By the numbers'),
      title('mis. A global group with a family-run mindset'),
      subtitle(),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 1.2M', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Vehicles delivered per year', maxLength: 40 }),
          ta('text', 'Penjelasan singkat', { maxLength: 110 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni (dinding potret)',
    description:
      'Dinding potret bertingkat di atas judul terpusat; klik potret untuk menampilkan kutipannya. Testimoni tanpa foto tetap bisa dipilih dengan tombol panah.',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimonials'),
      title('mis. Trusted by drivers'),
      t('title_muted', 'Judul lanjutan (abu-abu)', { placeholder: 'mis. and partners worldwide', maxLength: 60 }),
      subtitle(),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Read more stories', maxLength: 28, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { maxLength: 50 }),
          t('role', 'Keterangan', { placeholder: 'mis. Aster owner, Toronto', maxLength: 50 }),
          ta('quote', 'Kutipan', { maxLength: 260 }),
          img('photo', 'Foto', 'Potret tegak 4:5, disarankan 480×600 px. Kosongkan untuk inisial.'),
        ],
        10,
      ),
    ],
  },
  {
    key: 'newsroom',
    label: 'Newsroom',
    description: 'Hingga 6 kartu berita (3 per baris di layar lebar) di bidang gelap.',
    toggleable: true,
    fields: [
      eyebrow('mis. Newsroom', 'menu'),
      title('mis. Latest from Velora'),
      t('button_label', 'Teks tombol', { placeholder: 'mis. All news', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol'),
      t('read_label', 'Teks tautan di kartu berita', { placeholder: 'mis. Read story', maxLength: 20, help: 'Tampil pada berita yang punya tautan.' }),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('title', 'Judul', { maxLength: 100 }),
          t('category', 'Kategori', { placeholder: 'mis. Motorsport', maxLength: 24 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-14', maxLength: 30, help: DATE_HELP }),
          ta('excerpt', 'Ringkasan', { maxLength: 200 }),
          img('image', 'Foto', 'Mendatar 3:2, disarankan 1200×800 px.'),
          url('url', 'Tautan berita', { help: 'Kosongkan bila belum ada halaman berita.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Test drive (formulir)',
    description:
      'Kartu gelap berfoto dengan ajakan dan formulir pemesanan test drive. Formulir hanya menyusun pesan WhatsApp/email untuk tim Anda: tidak ada data yang disimpan di website. Semua label, pesan galat, dan teks tombol formulir bisa diubah di bawah.',
    toggleable: true,
    fields: [
      eyebrow('mis. Test drive', 'menu'),
      title('mis. Book a test drive'),
      subtitle(),
      listField('points', 'Poin singkat', 'Poin', [t('text', 'Poin', { placeholder: 'mis. No obligation to buy', maxLength: 60 })], 4),
      img('image', 'Foto latar', 'Mendatar 16:9, disarankan 1600×900 px. Kosongkan untuk latar gelap polos.'),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Your test drive', maxLength: 40 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Prepare my request', maxLength: 28 }),
      t('label_name', 'Formulir: label nama', { placeholder: 'mis. Full name', maxLength: 30 }),
      t('label_email', 'Formulir: label email', { placeholder: 'mis. Email', maxLength: 30 }),
      t('label_phone', 'Formulir: label telepon', { placeholder: 'mis. Phone', maxLength: 30 }),
      t('label_model', 'Formulir: label model', { placeholder: 'mis. Model', maxLength: 30, help: 'Pilihan model diambil dari bagian Jajaran model.' }),
      t('model_prompt', 'Formulir: pilihan awal model', { placeholder: 'mis. Choose a model', maxLength: 30 }),
      t('label_studio', 'Formulir: label studio', { placeholder: 'mis. Preferred studio', maxLength: 30, help: 'Pilihan studio diambil dari daftar studio di Dealer & kontak.' }),
      t('studio_prompt', 'Formulir: pilihan awal studio', { placeholder: 'mis. Any studio', maxLength: 30 }),
      t('label_date', 'Formulir: label tanggal', { placeholder: 'mis. Preferred date', maxLength: 30 }),
      t('label_note', 'Formulir: label catatan', { placeholder: 'mis. Notes', maxLength: 30 }),
      t('optional_label', 'Formulir: penanda isian opsional', { placeholder: 'mis. optional', maxLength: 16, help: 'Tampil dalam kurung setelah label isian yang tidak wajib.' }),
      ta('form_note', 'Formulir: catatan di bawah tombol', { maxLength: 160, help: 'Kosongkan untuk menyembunyikan.' }),
      t('error_name', 'Pesan galat: nama kosong', { maxLength: 80 }),
      t('error_email', 'Pesan galat: email tidak valid', { maxLength: 80 }),
      t('error_phone', 'Pesan galat: telepon tidak valid', { maxLength: 90 }),
      t('error_model', 'Pesan galat: model belum dipilih', { maxLength: 80 }),
      t('error_date', 'Pesan galat: tanggal tidak valid / sudah lewat', { maxLength: 80 }),
      t('ready_title', 'Setelah diisi: judul', { placeholder: 'mis. Your request is ready', maxLength: 40 }),
      ta('ready_text', 'Setelah diisi: keterangan', { maxLength: 160 }),
      t('send_whatsapp', 'Setelah diisi: tombol WhatsApp', { placeholder: 'mis. Send via WhatsApp', maxLength: 28 }),
      t('send_email', 'Setelah diisi: tombol email', { placeholder: 'mis. Send via email', maxLength: 28 }),
      t('edit_label', 'Setelah diisi: tombol ubah', { placeholder: 'mis. Edit details', maxLength: 28 }),
      t('message_intro', 'Pesan: kalimat pembuka', {
        placeholder: 'mis. Hello {company}, I would like to book a test drive.',
        maxLength: 120,
        help: '{company} diganti nama perusahaan. Isian formulir menyusul per baris dengan label isian di atas.',
      }),
      t('message_closing', 'Pesan: kalimat penutup', { placeholder: 'mis. Thank you.', maxLength: 60 }),
      t('email_subject', 'Pesan: subjek email', { placeholder: 'mis. Test drive request', maxLength: 60, help: 'Nama model yang dipilih ditambahkan di belakangnya.' }),
      t('talk_label', 'Teks di atas kontak cepat', { placeholder: 'mis. Prefer to talk?', maxLength: 40, help: 'Tampil di atas nomor telepon & tautan WhatsApp di kiri bawah kartu.' }),
      ta('fallback_text', 'Teks bila WhatsApp & email kosong', { maxLength: 160, help: 'Formulir diganti teks ini + tombol ke Dealer & kontak.' }),
      t('fallback_button', 'Tombol bila WhatsApp & email kosong', { placeholder: 'mis. Contact us', maxLength: 28 }),
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp penerima (opsional)',
        placeholder: 'mis. +41 79 555 01 54',
        maxLength: 24,
        help: 'Kosongkan untuk memakai WhatsApp di bagian Dealer & kontak.',
      },
      { type: 'email', key: 'email', label: 'Email penerima (opsional)', placeholder: 'sales@company.com', maxLength: 120, help: 'Kosongkan untuk memakai email di bagian Dealer & kontak.' },
    ],
  },
  {
    key: 'contact',
    label: 'Dealer & kontak',
    description:
      'Kantor pusat (alamat, telepon, email, WhatsApp, jam layanan) dengan label baris yang bisa diubah, daftar studio/dealer, dan peta Google Maps (dimuat saat digulir).',
    toggleable: true,
    fields: [
      eyebrow('mis. Dealers', 'menu'),
      title('mis. Visit a Velora studio'),
      subtitle(),
      ta('address', 'Alamat kantor pusat', { placeholder: 'Street, postcode, city, country', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Zurich, Switzerland',
        maxLength: 120,
        help: 'Nama perusahaan + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk tombol "Open in Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. +41 44 555 01 54', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'hello@company.com', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. +41 79 555 01 54',
        maxLength: 24,
        help: 'Dipakai tombol WhatsApp melayang, kontak, dan formulir test drive. Sertakan kode negara.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Hello, I would like to know more about your models.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Mon–Fri 08:00–18:30 (CET)', maxLength: 90 }),
      t('label_address', 'Label baris: alamat', { placeholder: 'mis. Headquarters', maxLength: 30 }),
      t('label_phone', 'Label baris: telepon', { placeholder: 'mis. Phone', maxLength: 30 }),
      t('label_email', 'Label baris: email', { placeholder: 'mis. Email', maxLength: 30 }),
      t('label_hours', 'Label baris: jam layanan', { placeholder: 'mis. Opening hours', maxLength: 30 }),
      t('whatsapp_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Chat on WhatsApp', maxLength: 28, help: 'Dipakai di kartu kantor pusat dan di kartu test drive.' }),
      t('maps_label', 'Teks tombol Google Maps', { placeholder: 'mis. Open in Google Maps', maxLength: 28 }),
      listField(
        'offices',
        'Studio / dealer',
        'Studio',
        [
          t('city', 'Kota / nama studio', { placeholder: 'mis. London', maxLength: 40 }),
          t('address', 'Alamat singkat', { maxLength: 90 }),
          { type: 'phone', key: 'phone', label: 'Telepon', maxLength: 30 },
        ],
        8,
      ),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description:
      'Bidang gelap: kalimat besar, newsletter (membuka aplikasi email, tanpa penyimpanan data), logo, deskripsi, kolom tautan, kontak, dan media sosial. Semua teks kecil newsletter dan judul kolom bisa diubah di sini.',
    toggleable: true,
    fields: [
      t('statement', 'Kalimat besar', { placeholder: 'mis. Engineered in Zurich. Driven everywhere.', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('newsletter_title', 'Newsletter: judul', { placeholder: 'mis. Keep up with the latest', maxLength: 50, help: 'Kosongkan untuk menyembunyikan newsletter.' }),
      t('newsletter_text', 'Newsletter: teks', { maxLength: 120 }),
      t('newsletter_button', 'Newsletter: teks tombol', { placeholder: 'mis. Subscribe', maxLength: 20 }),
      {
        type: 'email',
        key: 'newsletter_email',
        label: 'Newsletter: email penerima',
        placeholder: 'news@company.com',
        maxLength: 120,
        help: 'Pengunjung mengirim permintaan berlangganan lewat aplikasi email ke alamat ini. Kosongkan untuk memakai email di Dealer & kontak.',
      },
      t('newsletter_label', 'Newsletter: label isian email', { placeholder: 'mis. Your email address', maxLength: 40 }),
      t('newsletter_note', 'Newsletter: catatan di bawah isian', { maxLength: 120, help: 'Kosongkan untuk menyembunyikan.' }),
      t('newsletter_error', 'Newsletter: pesan galat email', { maxLength: 80 }),
      t('newsletter_ready_title', 'Newsletter: judul setelah diisi', { placeholder: 'mis. Almost done', maxLength: 30 }),
      t('newsletter_ready_text', 'Newsletter: keterangan setelah diisi', { maxLength: 120, help: '{email} diganti alamat email pengunjung.' }),
      t('newsletter_open', 'Newsletter: tombol buka email', { placeholder: 'mis. Open email app', maxLength: 24 }),
      t('newsletter_change', 'Newsletter: tombol ganti email', { placeholder: 'mis. Change email', maxLength: 24 }),
      t('newsletter_subject', 'Newsletter: subjek email', { placeholder: 'mis. Newsletter subscription', maxLength: 60, help: 'Nama perusahaan ditambahkan di belakangnya.' }),
      t('newsletter_message', 'Newsletter: isi email', {
        placeholder: 'mis. Hello {company}, please add {email} to your newsletter.',
        maxLength: 160,
        help: '{company} diganti nama perusahaan, {email} diganti email pengunjung.',
      }),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang perusahaan Anda.', maxLength: 220 }),
      t('models_title', 'Judul kolom model', { placeholder: 'mis. Models', maxLength: 24, help: 'Kolom berisi nama model dari Jajaran model.' }),
      t('links_title', 'Judul kolom menu', { placeholder: 'mis. Explore', maxLength: 24 }),
      t('contact_title', 'Judul kolom kontak', { placeholder: 'mis. Contact', maxLength: 24 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Company. All rights reserved.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama perusahaan.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
