// Skema CMS SkyNusa. Urutan section = urutan halaman: hero lembar spesifikasi → kategori per kebutuhan → drone pilihan
// → paket bundling → sewa harian → garansi servis lokal → kelas terbang gratis → cerita pelanggan → tanya jawab →
// ajakan → kontak → footer. Kunci company profile (brand, hero, testimonials, cta, contact, footer) sama artinya dengan
// template lain; section baru memakai kunci Inggris pendek (`categories`, `products`, `bundles`, `rental`, `warranty`,
// `academy`, `faq`). Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
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
    help: 'Tampil sebagai label kecil bergaya teknis. Label yang singkat juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const sectionTitle = (placeholder: string, maxLength = 120) => t('title', 'Judul', { placeholder, maxLength });
const sectionHighlight = (placeholder: string) =>
  t('highlight', 'Bagian judul yang dibuat lebih muda', {
    placeholder,
    maxLength: 70,
    help: 'Bagian dari judul yang tampil abu lebih muda (judul dua nada). Tulis persis seperti di judul, atau kosongkan.',
  });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const PRICE_HELP = 'Tulis lengkap, mis. Rp12.900.000. Angkanya dipakai untuk menghitung total keranjang.';
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';

export const skynusaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama toko, logo, dan warna aksen (ikon, label, chip hemat; versi mint otomatis untuk tombol di pita gelap).',
    fields: [
      t('company_name', 'Nama toko', { placeholder: 'mis. SkyNusa', maxLength: 80, help: 'Juga tampil sebagai tulisan raksasa bergaris tipis di belakang hero.' }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Toko Drone, Servis & Sewa Drone Jakarta',
        maxLength: 100,
        help: 'Tampil di footer dan judul tab browser (judul di Google): sebut apa yang Anda jual dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol drone bawaan template dan nama toko.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Dipakai untuk ikon, label, dan chip hemat. Di pita gelap warna ini otomatis dipucatkan menjadi mint agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (lembar spesifikasi)',
    description: 'Kanvas abu berkisi: judul dua nada, dua tombol, foto drone tegak dengan hingga 3 kartu angka spesifikasi, dan strip 4 keunggulan toko.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Toko & servis drone · Jakarta', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Drone pilihan untuk foto, wedding & pemetaan', maxLength: 80, help: 'Paling bagus 2–3 baris (± 35–50 karakter).' }),
      t('highlight', 'Bagian judul yang dibuat lebih muda', {
        placeholder: 'mis. untuk foto, wedding & pemetaan',
        maxLength: 60,
        help: 'Bagian dari judul yang tampil abu lebih muda. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan singkat apa yang Anda jual dan apa bedanya.',
        maxLength: 260,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 150–200 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Lihat Drone', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian Drone pilihan.' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Sewa Harian', maxLength: 30 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Sewa harian.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Konsultasi', maxLength: 24, help: 'Tombol gelap di kanan menu. Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: WA_HELP }),
      img('image', 'Foto drone', 'Foto tegak 4:5 (drone di tengah, latar langit/polos), disarankan 1200×1500 px. Lingkar bidik tipis ditambahkan otomatis.'),
      t('image_caption', 'Keterangan di bawah foto', { placeholder: 'mis. Drone Lipat 4K Pro · 249 g', maxLength: 70, help: 'Juga dipakai sebagai teks alternatif foto.' }),
      listField(
        'specs',
        'Kartu angka spesifikasi',
        'Spesifikasi',
        [
          t('value', 'Angka', { placeholder: 'mis. 4K/60', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Video HDR untuk wedding', maxLength: 40 }),
        ],
        3,
      ),
      listField(
        'features',
        'Strip keunggulan di bawah hero',
        'Keunggulan',
        [
          t('title', 'Judul', {
            placeholder: 'mis. Paket bundling',
            maxLength: 28,
            help: 'Ikon dan tujuan klik dipilih otomatis dari judul (paket, garansi/servis, kelas, sewa).',
          }),
          t('text', 'Keterangan', { placeholder: 'mis. Drone + tas + baterai cadangan', maxLength: 40 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'categories',
    label: 'Kategori per kebutuhan',
    description: 'Kartu foto tinggi per kebutuhan (mis. foto, wedding, pemetaan) dengan garis teknis. Klik kartu memfilter daftar Drone.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Pilih sesuai kebutuhan'),
      sectionTitle('mis. Satu toko untuk tiga kebutuhan terbang'),
      sectionHighlight('mis. tiga kebutuhan terbang'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar kategori',
        'Kategori',
        [
          t('title', 'Judul', { placeholder: 'mis. Videografi wedding', maxLength: 50, help: 'Garis teknis & ikon dipilih otomatis dari judul (foto, wedding, pemetaan).' }),
          t('tag', 'Label filter', {
            placeholder: 'mis. Wedding',
            maxLength: 20,
            help: 'Kata singkat yang sama dengan isian "Cocok untuk" di produk. Klik kartu menampilkan produk berlabel ini.',
          }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 180 }),
          img('image', 'Foto', 'Foto 4:3 atau tegak, disarankan 1200×900 px. Kosongkan untuk latar gelap polos.'),
          t('link_label', 'Teks tautan', { placeholder: 'mis. Lihat drone wedding', maxLength: 30, help: 'Kosongkan untuk teks otomatis.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Drone pilihan',
    description: 'Kartu produk dengan foto, label, spesifikasi, harga (bisa dengan harga coret), tombol keranjang, dan tanya stok lewat WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Drone pilihan'),
      sectionTitle('mis. Drone yang paling sering dibawa pulang pelanggan kami'),
      sectionHighlight('mis. paling sering dibawa pulang'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan kecil di bawah daftar', { placeholder: 'mis. Harga sudah termasuk PPN. Stok bisa berubah.', maxLength: 200 }),
      listField(
        'items',
        'Daftar produk',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Drone Lipat 4K Pro', maxLength: 50 }),
          t('use', 'Cocok untuk', { placeholder: 'mis. Foto, Wedding', maxLength: 50, help: 'Pisahkan dengan koma. Sama dengan "Label filter" kategori agar filter berfungsi.' }),
          t('price', 'Harga', { placeholder: 'mis. Rp12.900.000', maxLength: 20, help: PRICE_HELP }),
          t('old_price', 'Harga coret (opsional)', { placeholder: 'mis. Rp13.900.000', maxLength: 20, help: 'Harga sebelum diskon. Selisihnya tampil sebagai "Hemat …".' }),
          t('badge', 'Label sorotan', { placeholder: 'mis. Terlaris', maxLength: 20 }),
          ta('specs', 'Spesifikasi singkat', { placeholder: 'Satu baris satu poin (maks. 3), mis.\n249 g\n4K/30 fps\n31 menit', maxLength: 120 }),
          img('image', 'Foto produk', 'Foto 4:3, disarankan 1200×900 px. Foto berlatar putih otomatis menyatu dengan panggung abu.'),
          url('url', 'Tautan detail (opsional)', { help: 'Mis. halaman marketplace. Kosongkan untuk tautan tanya stok lewat WhatsApp.' }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'bundles',
    label: 'Paket bundling',
    description: 'Pita gelap berisi kartu paket (drone + tas + baterai cadangan, dll.). Paket berlabel pertama bercahaya mint.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Paket bundling'),
      sectionTitle('mis. Paket siap terbang, lebih hemat daripada beli satuan'),
      sectionHighlight('mis. lebih hemat daripada beli satuan'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Paket Wedding', maxLength: 40 }),
          t('badge', 'Label sorotan', { placeholder: 'mis. Paling diminati', maxLength: 24, help: 'Paket pertama yang berlabel tampil menonjol.' }),
          t('price', 'Harga paket', { placeholder: 'mis. Rp15.900.000', maxLength: 20, help: PRICE_HELP }),
          t('old_price', 'Total harga satuan (opsional)', { placeholder: 'mis. Rp17.250.000', maxLength: 20, help: 'Selisihnya tampil sebagai "Hemat …".' }),
          ta('description', 'Deskripsi', { placeholder: 'Untuk siapa paket ini.', maxLength: 160 }),
          ta('contents', 'Isi paket', { placeholder: 'Satu baris satu barang, mis.\nDrone Lipat 4K Pro\nTas ransel\n3 baterai cadangan', maxLength: 400 }),
          img('image', 'Foto isi paket', 'Foto mendatar, disarankan 1200×900 px.'),
          t('button_label', 'Teks tautan tanya', { placeholder: 'mis. Tanya Paket Wedding', maxLength: 30 }),
          url('button_url', 'Tautan tanya', { help: 'Kosongkan untuk membuka WhatsApp dengan nama paket.' }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'rental',
    label: 'Sewa harian',
    description: 'Foto + kalkulator sewa: pengunjung memilih unit, tanggal mulai, dan lama sewa, lalu mengirim pengajuan lewat WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Sewa harian'),
      sectionTitle('mis. Belum siap membeli? Sewa dulu per hari'),
      sectionHighlight('mis. Sewa dulu per hari'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto tegak atau mendatar, disarankan 1200×1500 px.'),
      listField(
        'items',
        'Unit yang disewakan',
        'Unit',
        [
          t('name', 'Nama unit', { placeholder: 'mis. Drone Lipat 4K Pro', maxLength: 50 }),
          t('price', 'Tarif per hari', { placeholder: 'mis. Rp450.000', maxLength: 20, help: 'Angkanya dipakai kalkulator sewa.' }),
          t('note', 'Keterangan', { placeholder: 'mis. Termasuk 3 baterai', maxLength: 50 }),
        ],
        6,
      ),
      t('discount_days', 'Potongan mulai berapa hari', { placeholder: 'mis. 3', maxLength: 3, help: 'Kosongkan bila tidak ada potongan sewa panjang.' }),
      t('discount_percent', 'Besar potongan (%)', { placeholder: 'mis. 10', maxLength: 3 }),
      ta('deposit_note', 'Catatan jaminan', { placeholder: 'mis. Jaminan KTP asli dan deposit Rp1.000.000.', maxLength: 200 }),
      listField('points', 'Poin layanan sewa', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Antar-jemput area Jakarta', maxLength: 70 })], 4),
      t('button_label', 'Teks tombol ajukan', { placeholder: 'mis. Ajukan Sewa via WhatsApp', maxLength: 30 }),
    ],
  },
  {
    key: 'warranty',
    label: 'Garansi servis lokal',
    description: 'Foto bengkel + kartu angka (lama garansi, estimasi servis, dll.), catatan pengecualian, dan tombol klaim.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Garansi servis lokal'),
      sectionTitle('mis. Perlu servis? Bawa ke bengkel kami sendiri'),
      sectionHighlight('mis. bengkel kami sendiri'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto bengkel', 'Foto tegak atau mendatar, disarankan 1200×900 px.'),
      listField(
        'stats',
        'Kartu angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 12 bln', maxLength: 10 }),
          t('label', 'Judul kecil', { placeholder: 'mis. Garansi servis toko', maxLength: 30 }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam 1 kalimat.', maxLength: 120 }),
        ],
        4,
      ),
      ta('note', 'Catatan pengecualian', { placeholder: 'mis. Garansi tidak mencakup kerusakan karena jatuh atau terkena air.', maxLength: 240 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Klaim Garansi', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp dengan pesan klaim garansi.' }),
    ],
  },
  {
    key: 'academy',
    label: 'Kelas terbang gratis',
    description: 'Panel gelap: foto latihan, sesi kelas bernomor, jadwal, lokasi, dan tombol daftar.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kelas terbang gratis'),
      t('badge', 'Chip di foto', { placeholder: 'mis. Gratis untuk pembeli', maxLength: 30 }),
      sectionTitle('mis. Belajar terbang dengan aman sebelum proyek pertama'),
      sectionHighlight('mis. sebelum proyek pertama'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto mendatar atau tegak, disarankan 1200×900 px.'),
      listField(
        'sessions',
        'Sesi kelas',
        'Sesi',
        [
          t('title', 'Judul', { placeholder: 'mis. Dasar & keselamatan', maxLength: 40 }),
          t('meta', 'Durasi / keterangan', { placeholder: 'mis. 45 menit', maxLength: 24 }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam 1 kalimat.', maxLength: 140 }),
        ],
        4,
      ),
      t('schedule', 'Jadwal', { placeholder: 'mis. Setiap Sabtu & Minggu, 07.00–10.00 WIB', maxLength: 70 }),
      t('location', 'Lokasi', { placeholder: 'mis. Lapangan latihan di Jakarta Timur', maxLength: 70 }),
      ta('note', 'Catatan', { placeholder: 'mis. Maksimal 6 peserta per kelas.', maxLength: 160 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Daftar Kelas', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp dengan pesan daftar kelas terbang.' }),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita pelanggan',
    description: 'Kartu kutipan pelanggan dengan nama, keterangan, dan foto (atau inisial).',
    toggleable: true,
    fields: [
      sectionLabel('mis. Cerita pelanggan'),
      sectionTitle('mis. Dipakai untuk karya, acara, dan proyek nyata'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Dimas Prasetyo', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Videografer pernikahan, Bekasi', maxLength: 80 }),
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
    description: 'Daftar pertanyaan bernomor yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp di kiri.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Tanya jawab'),
      sectionTitle('mis. Pertanyaan sebelum membeli atau menyewa'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Bingung memilih drone?', maxLength: 60 }),
      ta('help_text', 'Kartu bantuan: teks', { placeholder: 'mis. Ceritakan kebutuhan Anda, kami bantu pilihkan.', maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Apa saja yang ditanggung garansi?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Panel foto gelap dengan judul dua nada, tombol mint WhatsApp, dan tombol ke Sewa harian.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Siap mengudara minggu ini?', maxLength: 100 }),
      t('highlight', 'Bagian judul yang dibuat lebih muda', { placeholder: 'mis. mengudara', maxLength: 60, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Konsultasi via WhatsApp', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1600×900 px. Kosongkan untuk latar gradasi gelap.'),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kunjungi toko'),
      sectionTitle('mis. Toko, bengkel servis, dan titik ambil sewa di satu tempat'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (021) 555-0123', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@toko.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai untuk semua tombol WhatsApp: keranjang, sewa, paket, garansi, dan kelas.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang drone.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Senin–Sabtu 10.00–20.00 WIB', maxLength: 80 }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Logo, deskripsi, menu, kontak singkat, dan media sosial di pita gelap.',
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
