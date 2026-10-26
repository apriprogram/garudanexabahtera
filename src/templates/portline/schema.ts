// Skema CMS Portline (label, bantuan, placeholder berbahasa Indonesia untuk pembeli; contoh placeholder boleh Inggris).
// Urutan section = urutan halaman: hero slider → berita (mosaik bertagar) → liputan media → angka → perusahaan grup →
// armada → jaringan global → keberlanjutan → karier → pimpinan → kontak (formulir → WhatsApp/email) → footer. Setiap
// section bisa disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
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
  menu: 'Tampil di atas judul dengan garis pendek. Label singkat (≤ 14 huruf, ≤ 2 kata) juga dipakai sebagai nama di menu atas.',
  plain: 'Tampil di atas judul dengan garis pendek. Kosongkan untuk menyembunyikan.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'plain') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
const title = (placeholder: string, maxLength = 90) =>
  t('title', 'Judul', { placeholder, maxLength, help: 'Tampil dengan HURUF KAPITAL tebal; 3–7 kata paling pas.' });
const subtitle = (placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 260 });
const DATE_HELP = 'Tulis YYYY-MM-DD (mis. 2026-10-14) agar tampil sebagai "14 Oct 2026", atau teks bebas.';
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #fleet, #divisions, #newsroom, atau #kontak.';

export const portlineSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas, warna & bahasa',
    description:
      'Nama perusahaan, logo, warna tema, dan bahasa teks bawaan. Satu warna tema mengatur tombol, garis aktif, tagar, pita biru, serta navy judul dan footer.',
    fields: [
      t('company_name', 'Nama perusahaan', { placeholder: 'mis. Portline Group', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Integrated shipping & logistics, Rotterdam',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama perusahaan: sebut bidang usaha dan kota/negara.',
      }),
      img('logo', 'Logo perusahaan', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol Portline bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Klik pilihan cepat (mis. hijau #047857), tombol "Pakai bawaan" untuk biru laut bawaan #1565C0, atau tulis kode hex sendiri. Navy untuk judul & footer, pita biru, dan versi terang/gelap dibuat otomatis agar tetap terbaca.',
      },
      t('language', 'Bahasa teks bawaan', {
        placeholder: 'en',
        maxLength: 2,
        help: 'Tulis en (Inggris) atau id (Indonesia). Mengatur teks tombol, label formulir, pesan galat, dan nama menu cadangan; semua teks lain Anda tulis sendiri di setiap bagian.',
      }),
    ],
  },
  {
    key: 'hero',
    label: 'Hero (slider foto)',
    description:
      'Foto besar selebar layar yang berganti otomatis (berhenti saat disorot/difokus) dengan indeks 01 / 02 / 03 di kanan, lingkaran radar, menu dua lapis di atasnya, dan deret logo perusahaan grup di bawahnya.',
    toggleable: true,
    fields: [
      t('utility_1_label', 'Tombol biru atas 1: teks', { placeholder: 'mis. Container Lines', maxLength: 24, help: 'Tombol kecil di bilah paling atas. Kosongkan untuk menyembunyikan.' }),
      url('utility_1_url', 'Tombol biru atas 1: tautan', { help: `Kosongkan untuk menuju bagian Perusahaan grup. ${SECTION_LINK_HELP}` }),
      t('utility_2_label', 'Tombol biru atas 2: teks', { placeholder: 'mis. Track a shipment', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('utility_2_url', 'Tombol biru atas 2: tautan', {
        help: 'Mis. halaman pelacakan milik Anda sendiri. Kosongkan untuk membuka formulir kontak dengan topik "status pengiriman" (bukan pelacak sungguhan).',
      }),
      t('lang_current', 'Bahasa aktif (pilihan bahasa)', { placeholder: 'mis. EN', maxLength: 4, help: 'Kosongkan untuk menyembunyikan pilihan bahasa.' }),
      t('lang_other', 'Bahasa lain', { placeholder: 'mis. ID', maxLength: 4 }),
      url('lang_other_url', 'Tautan versi bahasa lain', {
        help: 'Mis. alamat situs berbahasa Indonesia milik Anda. Kosong → "ID" tampil sebagai teks biasa (dekoratif), bukan tautan.',
      }),
      t('slide_label', 'Label slide 1 di indeks', { placeholder: 'mis. Ocean freight', maxLength: 24 }),
      t('title', 'Judul utama (slide 1)', {
        placeholder: 'mis. Connecting world trade, port by port',
        maxLength: 70,
        help: 'Tampil dengan HURUF KAPITAL tebal, 2–3 baris (± 30–45 karakter).',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan perusahaan Anda dalam 1–2 kalimat.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 150–200 karakter paling pas.',
      }),
      t('link_label', 'Teks tautan di bawah deskripsi', { placeholder: 'mis. About Portline', maxLength: 28 }),
      url('link_url', 'Tujuan tautan', { help: `Kosongkan untuk menuju bagian Perusahaan grup. ${SECTION_LINK_HELP}` }),
      img('image', 'Foto slide 1', 'Foto mendatar 16:9, disarankan 1920×1080 px, objek utama di kanan. Lapisan navy di kiri ditambahkan otomatis.'),
      listField(
        'slides',
        'Slide tambahan',
        'Slide',
        [
          img('image', 'Foto', 'Wajib; slide tanpa foto tidak tampil. Mendatar 16:9, 1920×1080 px.'),
          t('label', 'Label di indeks', { placeholder: 'mis. Terminals', maxLength: 24 }),
          t('title', 'Judul', { placeholder: 'Kosongkan untuk memakai judul slide 1', maxLength: 70 }),
          ta('subtitle', 'Deskripsi', { maxLength: 200 }),
        ],
        3,
      ),
      t('service_label', 'Label layanan di kanan deret logo', { placeholder: 'mis. Ro-Ro & feeder services', maxLength: 36 }),
      url('service_url', 'Tautan label layanan', { help: `Kosongkan untuk menuju bagian Armada. ${SECTION_LINK_HELP}` }),
      listField(
        'companies',
        'Logo perusahaan grup / anak usaha',
        'Perusahaan',
        [
          t('name', 'Nama', { placeholder: 'mis. Portline Terminals', maxLength: 40 }),
          img('logo', 'Logo (opsional)', 'Tampil putih satu warna di atas foto. Kosongkan untuk simbol bawaan + nama.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'newsroom',
    label: 'Berita (newsroom)',
    description:
      'Mosaik ubin berita: ubin pertama berlapis biru pejal, ubin lain berfoto dengan judul putih. Tombol tagar (mis. #Lines #Terminals) benar-benar menyaring berita. "Read story" membuka isi berita di bawah mosaik, atau tautan berita bila diisi.',
    toggleable: true,
    fields: [
      eyebrow('mis. Newsroom', 'menu'),
      title('mis. Portline newsroom'),
      t('all_label', 'Teks tombol semua tagar', { placeholder: 'mis. All', maxLength: 16 }),
      t('button_label', 'Teks tautan di bawah mosaik', { placeholder: 'mis. Media enquiries', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan di bawah mosaik', { help: 'Mis. halaman media Anda. Kosongkan untuk membuka formulir kontak dengan topik media.' }),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('title', 'Judul', { maxLength: 100 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-14', maxLength: 30, help: DATE_HELP }),
          t('tags', 'Tagar', { placeholder: 'mis. Lines, Terminals', maxLength: 60, help: 'Pisahkan dengan koma. Tagar yang sama dikelompokkan di tombol filter.' }),
          ta('excerpt', 'Ringkasan', { maxLength: 200 }),
          ta('body', 'Isi lengkap (opsional)', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 1500 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
          url('url', 'Tautan berita (opsional)', { help: 'Diisi → "Read story" membuka tautan ini, bukan isi lengkap.' }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'press',
    label: 'Liputan media (In the press)',
    description: 'Deret kutipan judul liputan media dengan tombol ‹ › untuk menggeser. Tulis nama media dan judul liputan apa adanya.',
    toggleable: true,
    fields: [
      eyebrow('mis. In the press'),
      title('mis. In the press', 60),
      listField(
        'items',
        'Liputan',
        'Liputan',
        [
          t('outlet', 'Nama media', { placeholder: 'mis. Harbour Ledger', maxLength: 40 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-16', maxLength: 30, help: DATE_HELP }),
          t('headline', 'Judul liputan', { maxLength: 120 }),
          url('url', 'Tautan artikel (opsional)'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'stats',
    label: 'Angka perusahaan',
    description: 'Empat angka besar dengan ikon garis dan pemisah vertikal; angka berjalan saat pertama terlihat. Ikon dipilih otomatis dari keterangan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Portline in numbers'),
      t('title', 'Judul (opsional)', { placeholder: 'mis. One group since 1968', maxLength: 60 }),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 140+', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Vessels in operation', maxLength: 36, help: 'Ikon otomatis: kapal, terminal, negara, karyawan, kantor, dll.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'divisions',
    label: 'Perusahaan grup / layanan',
    description:
      'Kartu layanan berfoto dengan lencana ikon bulat yang menumpang foto. Tombol di kartu membuka tautan sendiri, atau formulir kontak dengan unit bisnis itu terpilih. Kartu ajakan biru di akhir (opsional).',
    toggleable: true,
    fields: [
      eyebrow('mis. Group companies', 'menu'),
      title('mis. Five companies, one connected chain'),
      subtitle(),
      listField(
        'items',
        'Perusahaan',
        'Perusahaan',
        [
          t('name', 'Nama', { placeholder: 'mis. Portline Terminals', maxLength: 50, help: 'Ikon lencana dipilih otomatis dari nama (kapal, terminal, energi, darat & udara, galangan).' }),
          t('label', 'Label kecil', { placeholder: 'mis. Ports', maxLength: 20 }),
          ta('description', 'Deskripsi', { maxLength: 200 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1080×810 px.'),
          t('link_label', 'Teks tombol', { placeholder: 'mis. View detail', maxLength: 24 }),
          url('url', 'Tautan tombol (opsional)', { help: 'Kosongkan untuk membuka formulir kontak dengan unit bisnis ini terpilih.' }),
        ],
        6,
      ),
      t('cta_title', 'Kartu ajakan: judul', { placeholder: 'mis. One partner for the whole route?', maxLength: 60, help: 'Kosongkan untuk menyembunyikan kartu ajakan.' }),
      ta('cta_text', 'Kartu ajakan: teks', { maxLength: 180 }),
      t('cta_label', 'Kartu ajakan: teks tombol', { placeholder: 'mis. Contact the group desk', maxLength: 30 }),
      url('cta_url', 'Kartu ajakan: tautan', { help: 'Kosongkan untuk menuju formulir kontak.' }),
    ],
  },
  {
    key: 'fleet',
    label: 'Armada / kelas kapal',
    description: 'Carousel kartu melebar: kartu aktif lebar dengan foto, deskripsi, dan data utama; kartu lain sempit. Tombol ← → atau klik kartu. Di HP kartu digeser.',
    toggleable: true,
    fields: [
      eyebrow('mis. Our fleet', 'menu'),
      title('mis. Purpose-built ships for every trade'),
      subtitle(),
      listField(
        'items',
        'Kelas kapal',
        'Kelas kapal',
        [
          t('name', 'Nama kelas / unit', { placeholder: 'mis. Meridian class', maxLength: 40 }),
          t('type', 'Jenis', { placeholder: 'mis. Container ship', maxLength: 40 }),
          t('capacity', 'Kapasitas', { placeholder: 'mis. 15,000 TEU', maxLength: 24 }),
          ta('description', 'Deskripsi', { maxLength: 200 }),
          ta('specs', 'Data utama (satu baris per data)', { placeholder: 'Length overall: 366 m\nService speed: 17 knots', maxLength: 240, help: 'Format "Nama: nilai", satu per baris, maks. 4 baris.' }),
          img('image', 'Foto', 'Foto mendatar 16:10, disarankan 1400×875 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'network',
    label: 'Jaringan global',
    description: 'Daftar kawasan yang bisa dibuka (hub utama + angka) dan foto dengan lingkaran radar serta kartu kantor pusat.',
    toggleable: true,
    fields: [
      eyebrow('mis. Global network', 'menu'),
      title('mis. Where we operate'),
      subtitle(),
      img('image', 'Foto', 'Foto mendatar 16:10, disarankan 1600×1000 px. Kosongkan untuk menyembunyikan.'),
      t('image_label', 'Kartu di foto: label', { placeholder: 'mis. Headquarters', maxLength: 30 }),
      t('image_value', 'Kartu di foto: isi', { placeholder: 'mis. Rotterdam, the Netherlands', maxLength: 50 }),
      t('image_caption', 'Kartu di foto: keterangan kecil', { placeholder: 'mis. 51.92° N · 4.48° E', maxLength: 40 }),
      listField(
        'items',
        'Kawasan',
        'Kawasan',
        [
          t('region', 'Kawasan', { placeholder: 'mis. Europe', maxLength: 36 }),
          t('value', 'Angka singkat', { placeholder: 'mis. 14 terminals', maxLength: 30 }),
          t('hubs', 'Hub / kota', { placeholder: 'mis. Rotterdam, Hamburg, Antwerp', maxLength: 140, help: 'Pisahkan dengan koma.' }),
          ta('text', 'Keterangan', { maxLength: 180 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'sustainability',
    label: 'Keberlanjutan',
    description: 'Pita biru pejal: pernyataan besar, paragraf, hingga 4 komitmen bernomor, dan foto. Tulis program yang benar-benar dijalankan, tanpa klaim yang tidak bisa dibuktikan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Sustainability', 'menu'),
      ta('title', 'Pernyataan besar', { placeholder: 'Satu kalimat sikap perusahaan.', maxLength: 140 }),
      ta('text', 'Paragraf', { maxLength: 320 }),
      img('image', 'Foto', 'Foto mendatar 16:10, disarankan 1600×1000 px. Kosongkan untuk menyembunyikan.'),
      t('button_label', 'Teks tombol (opsional)', { placeholder: 'mis. Read our progress report', maxLength: 32 }),
      url('button_url', 'Tautan tombol', { help: 'Mis. laporan keberlanjutan PDF. Tombol tampil bila teks & tautan diisi.' }),
      listField(
        'items',
        'Komitmen',
        'Komitmen',
        [t('title', 'Judul', { placeholder: 'mis. Cleaner fuels', maxLength: 40 }), ta('text', 'Keterangan', { maxLength: 160 })],
        4,
      ),
    ],
  },
  {
    key: 'careers',
    label: 'Karier',
    description: 'Banner foto kru dengan lapisan navy, judul, paragraf, poin bidang karier, tombol, dan email rekrutmen.',
    toggleable: true,
    fields: [
      eyebrow('mis. Careers', 'menu'),
      title('mis. Build a career at sea and ashore'),
      ta('text', 'Paragraf', { maxLength: 300 }),
      img('image', 'Foto', 'Foto mendatar 16:10, disarankan 1600×1000 px. Kosongkan untuk panel navy polos.'),
      listField('points', 'Poin bidang karier', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Officer cadet programme', maxLength: 50 })], 6),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Talk to recruitment', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: 'Mis. halaman lowongan Anda. Kosongkan untuk membuka formulir kontak dengan topik karier.' }),
      { type: 'email', key: 'email', label: 'Email rekrutmen (opsional)', placeholder: 'careers@perusahaan.com', maxLength: 120 },
    ],
  },
  {
    key: 'leadership',
    label: 'Pimpinan',
    description: 'Kartu foto pimpinan dengan nama, jabatan, profil singkat, dan tautan LinkedIn (opsional).',
    toggleable: true,
    fields: [
      eyebrow('mis. Leadership'),
      title('mis. Executive board'),
      subtitle(),
      listField(
        'items',
        'Pimpinan',
        'Pimpinan',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Jabatan', { placeholder: 'mis. Chief Executive Officer', maxLength: 60 }),
          ta('bio', 'Profil singkat', { maxLength: 200 }),
          img('photo', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk inisial.'),
          url('linkedin', 'LinkedIn (opsional)', { placeholder: 'https://linkedin.com/in/...' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & formulir',
    description:
      'Kantor pusat, kantor regional, jam kantor, dan formulir pertanyaan berbahasa situs. Formulir HANYA menyusun pesan yang dikirim pengunjung sendiri lewat WhatsApp atau email; tidak ada data yang disimpan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Contact', 'menu'),
      title('mis. Talk to the right team'),
      subtitle(),
      ta('address', 'Alamat kantor pusat', { placeholder: 'mis. Portline House, Harbour Quay 1, Rotterdam', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Rotterdam, the Netherlands',
        maxLength: 120,
        help: 'Untuk tautan "View on map". Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link Google Maps (opsional)', { placeholder: 'https://maps.app.goo.gl/...' }),
      { type: 'phone', key: 'phone', label: 'Telepon kantor pusat', placeholder: 'mis. +31 10 555 0140', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email (penerima formulir)', placeholder: 'enquiries@perusahaan.com', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp (penerima formulir)',
        placeholder: 'mis. +31 6 1234 5678 atau 081234567890',
        maxLength: 24,
        help: 'Dipakai tombol WhatsApp melayang dan formulir. Nomor luar negeri tulis dengan kode negara (+31 …).',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Hello, I have a question about shipping.', maxLength: 160 }),
      t('hours', 'Jam kantor', { placeholder: 'mis. Monday–Friday, 08:00–18:00 CET', maxLength: 90 }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Send an enquiry', maxLength: 50 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 200 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Prepare message', maxLength: 30 }),
      listField('enquiry_types', 'Pilihan jenis pertanyaan', 'Jenis', [t('name', 'Jenis', { placeholder: 'mis. Freight quote', maxLength: 40 })], 8),
      listField(
        'offices',
        'Kantor regional',
        'Kantor',
        [
          t('city', 'Kota', { placeholder: 'mis. Singapore', maxLength: 40 }),
          t('address', 'Alamat / keterangan', { maxLength: 120 }),
          { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. +65 6555 0140', maxLength: 30 },
        ],
        6,
      ),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer navy multi-kolom (perusahaan, grup, armada, media, kontak) dengan kolom merek di kanan: logo, telepon, email, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang perusahaan Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Perusahaan. All rights reserved.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama perusahaan.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
