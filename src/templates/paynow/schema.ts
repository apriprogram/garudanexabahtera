// Skema CMS PayNow. Urutan section = urutan halaman: hero dompet → strip jenis usaha → fitur bertab → simulasi biaya →
// keamanan → developer & API → angka → cerita merchant → tanya jawab → unduh aplikasi → daftar merchant → footer.
// Setiap section bisa disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
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

const EYEBROW_HELP = 'Tampil dengan titik gradasi di atas judul. Label singkat (≤ 12 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 30, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 80) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #fitur, #biaya, #unduh, atau #merchant.';

export const paynowSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama merek, logo, dan satu warna aksen. Gradasi biru–ungu, warna malam, dan lavender diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama merek', { placeholder: 'mis. PayNow', maxLength: 60 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Dompet Digital & Payment Gateway',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama merek; nama + tagline paling pas ≤ 60 huruf.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan berwarna terang (tampil di atas latar gelap), maks. 2 MB. Kosongkan untuk memakai simbol PayNow bawaan dan nama merek.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan indigo #4B3FE4. Dipakai tombol, label, dan gradasi; titik gradasi biru dan ungu, warna malam, serta lavender dibuat otomatis agar teks tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (dompet)',
    description: 'Foto latar selebar layar di bawah lapisan gradasi indigo, judul, dua tombol, tiga chip, dan mockup HP berisi saldo, tombol fitur, transaksi terakhir, serta kartu notifikasi.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Dompet digital & payment gateway', maxLength: 50 }),
      t('title', 'Judul utama', { placeholder: 'mis. Bayar apa saja, cukup dari satu aplikasi', maxLength: 80, help: 'Paling bagus ≤ 9 kata.' }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. satu aplikasi', maxLength: 40, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan produk Anda dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Unduh aplikasi', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju bagian Unduh aplikasi. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Untuk merchant', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: `Kosongkan untuk menuju Simulasi biaya. ${SECTION_LINK_HELP}` }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Daftar merchant', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju formulir Daftar merchant.' }),
      img('image', 'Foto latar hero', 'Foto mendatar 16:9, disarankan 1920×1080 px. Tampil di bawah lapisan gradasi gelap; subjek sebaiknya di tengah atau kanan.'),
      listField('chips', 'Chip di bawah tombol', 'Chip', [t('label', 'Teks', { placeholder: 'mis. PIN & biometrik', maxLength: 32 })], 3),
      t('app_greeting', 'HP: sapaan', { placeholder: 'mis. Halo, Rani', maxLength: 24 }),
      t('balance_label', 'HP: label saldo', { placeholder: 'mis. Saldo PayNow', maxLength: 28 }),
      t('balance', 'HP: saldo', { placeholder: 'mis. Rp2.450.000', maxLength: 16, help: 'Angka contoh; tampil menghitung naik.' }),
      listField(
        'actions',
        'HP: tombol fitur',
        'Tombol',
        [t('label', 'Teks', { placeholder: 'mis. QRIS', maxLength: 12, help: 'Ikon dipilih otomatis (QRIS, Transfer, Tagihan, Top-up, Pulsa, dll.).' })],
        4,
      ),
      t('transactions_title', 'HP: judul daftar transaksi', { placeholder: 'mis. Transaksi terakhir', maxLength: 28 }),
      listField(
        'transactions',
        'HP: transaksi contoh',
        'Transaksi',
        [
          t('title', 'Nama', { placeholder: 'mis. Kopi Senja', maxLength: 28 }),
          t('meta', 'Keterangan', { placeholder: 'mis. QRIS · 08.12', maxLength: 32 }),
          t('amount', 'Nominal', { placeholder: 'mis. −Rp45.000', maxLength: 16, help: 'Awali dengan + untuk uang masuk (tampil hijau).' }),
        ],
        3,
      ),
      listField(
        'notifications',
        'Kartu notifikasi',
        'Notifikasi',
        [
          t('title', 'Judul', { placeholder: 'mis. Pembayaran QRIS berhasil', maxLength: 40, help: 'Di HP tampil satu baris (± 26 huruf), di layar lebar maks. dua baris; sisanya dipotong.' }),
          t('text', 'Keterangan', { placeholder: 'mis. Rp45.000 ke Kopi Senja', maxLength: 48, help: 'Di HP tampil satu baris (± 28 huruf), di layar lebar maks. dua baris; sisanya dipotong.' }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'trust',
    label: 'Strip jenis usaha',
    description: 'Pita tipis di bawah hero: judul kecil dan deretan chip jenis usaha yang bergerak pelan (tanpa logo perusahaan).',
    toggleable: true,
    fields: [
      title('mis. Dipakai beragam usaha di sekitar Anda', 70),
      listField(
        'items',
        'Jenis usaha',
        'Jenis usaha',
        [t('label', 'Teks', { placeholder: 'mis. Kedai kopi', maxLength: 28, help: 'Ikon dipilih otomatis dari teks (kopi, warung, apotek, laundry, dll.).' })],
        16,
      ),
    ],
  },
  {
    key: 'features',
    label: 'Fitur (tab)',
    description: 'Tab fitur; setiap tab punya penjelasan, tiga poin, foto, dan layar HP contoh yang berganti sesuai tab.',
    toggleable: true,
    fields: [
      eyebrow('mis. Fitur'),
      title('mis. Semua pembayaran harian dalam satu genggaman'),
      subtitle(),
      listField(
        'items',
        'Tab fitur',
        'Fitur',
        [
          t('label', 'Nama tab', { placeholder: 'mis. QRIS', maxLength: 14, help: 'Ikon & jenis layar HP dipilih otomatis: QRIS, Transfer, Tagihan, atau Top-up.' }),
          t('title', 'Judul', { placeholder: 'mis. Scan, bayar, selesai', maxLength: 50 }),
          ta('text', 'Penjelasan', { placeholder: 'Satu kalimat.', maxLength: 140 }),
          t('points', 'Tiga poin', { placeholder: 'mis. Struk digital · Cek nominal · Riwayat rapi', maxLength: 140, help: 'Pisahkan dengan · (maks. 3 poin tampil).' }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menampilkan HP saja.'),
          t('screen_title', 'Layar HP: judul', { placeholder: 'mis. Bayar QRIS', maxLength: 24 }),
          t('screen_amount', 'Layar HP: nominal', { placeholder: 'mis. Rp45.000', maxLength: 16 }),
          t('screen_note', 'Layar HP: keterangan', { placeholder: 'mis. Kopi Senja · Kemang', maxLength: 36 }),
          t('screen_lines', 'Layar HP: daftar', {
            placeholder: 'mis. Listrik prabayar · Air bersih · Internet rumah',
            maxLength: 90,
            help: 'Tagihan: nama tagihan; Top-up: pilihan nominal; Transfer: catatan. Pisahkan dengan ·',
          }),
          t('screen_button', 'Layar HP: tombol', { placeholder: 'mis. Bayar sekarang', maxLength: 20 }),
        ],
        5,
      ),
    ],
  },
  {
    key: 'fees',
    label: 'Simulasi biaya',
    description: 'Daftar contoh tarif dan kalkulator: nominal + metode bayar → biaya, total dibayar pelanggan, dan dana diterima merchant.',
    toggleable: true,
    fields: [
      eyebrow('mis. Simulasi biaya'),
      title('mis. Hitung biaya sebelum mulai berjualan'),
      subtitle(),
      t('table_label', 'Judul daftar tarif', { placeholder: 'mis. Contoh tarif', maxLength: 30, help: 'Sebutkan bila tarif masih contoh.' }),
      listField(
        'rates',
        'Tarif per metode',
        'Tarif',
        [
          t('name', 'Metode bayar', { placeholder: 'mis. QRIS', maxLength: 32 }),
          t('percent', 'Persen', { placeholder: 'mis. 0,7', maxLength: 8, help: 'Angka persen tanpa %, mis. 0,7. Kosongkan bila hanya biaya tetap.' }),
          t('flat', 'Biaya tetap (Rp)', { placeholder: 'mis. 4000', maxLength: 12, help: 'Rupiah per transaksi, mis. 4000. Kosongkan bila hanya persen.' }),
        ],
        6,
      ),
      t('default_amount', 'Nominal awal simulasi (Rp)', { placeholder: 'mis. 250000', maxLength: 12 }),
      ta('note', 'Catatan di bawah hasil', { placeholder: 'mis. Contoh tarif untuk simulasi; biaya final mengikuti perjanjian merchant.', maxLength: 160 }),
    ],
  },
  {
    key: 'security',
    label: 'Keamanan',
    description: 'Section gelap: foto tegak dengan chip, judul, dan kartu fitur keamanan (ikon otomatis dari judul).',
    toggleable: true,
    fields: [
      eyebrow('mis. Keamanan'),
      title('mis. Setiap transaksi dijaga berlapis'),
      subtitle(),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      t('badge', 'Chip di atas foto', { placeholder: 'mis. Masuk dengan sidik jari', maxLength: 32 }),
      listField(
        'items',
        'Fitur keamanan',
        'Fitur',
        [
          t('title', 'Judul', { placeholder: 'mis. PIN 6 digit', maxLength: 32, help: 'Ikon otomatis: PIN, biometrik, notifikasi, enkripsi.' }),
          ta('text', 'Penjelasan', { maxLength: 120 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'developers',
    label: 'Developer & API',
    description: 'Daftar endpoint, langkah sandbox, dan jendela contoh kode bertab (mis. cURL, Node.js, PHP) dengan tombol salin.',
    toggleable: true,
    fields: [
      eyebrow('mis. Untuk developer'),
      title('mis. Terima pembayaran lewat API'),
      subtitle(),
      listField(
        'endpoints',
        'Endpoint',
        'Endpoint',
        [
          t('method', 'Metode', { placeholder: 'mis. POST', maxLength: 6 }),
          t('path', 'Path', { placeholder: 'mis. /v1/charges', maxLength: 40 }),
          t('text', 'Keterangan', { placeholder: 'mis. Buat tagihan pembayaran', maxLength: 60 }),
        ],
        6,
      ),
      t('steps_title', 'Judul langkah', { placeholder: 'mis. Mulai di sandbox', maxLength: 30 }),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [t('title', 'Judul', { placeholder: 'mis. Daftar sandbox', maxLength: 32 }), t('text', 'Keterangan', { maxLength: 80 })],
        4,
      ),
      listField(
        'samples',
        'Contoh kode',
        'Contoh kode',
        [
          t('label', 'Nama tab', { placeholder: 'mis. cURL', maxLength: 14 }),
          ta('code', 'Kode', { maxLength: 1600, help: 'Teks biasa; tampil dengan huruf mono dan bisa disalin.' }),
        ],
        4,
      ),
      ta('note', 'Catatan di bawah kode', { placeholder: 'mis. Contoh kode untuk ilustrasi.', maxLength: 160 }),
      t('link_label', 'Teks tautan dokumentasi', { placeholder: 'mis. Dokumentasi API', maxLength: 28 }),
      url('link_url', 'Tautan dokumentasi', { help: 'Kosongkan untuk menyembunyikan tautan.' }),
    ],
  },
  {
    key: 'stats',
    label: 'Angka',
    description: 'Pita gradasi selebar layar dengan hingga empat angka yang menghitung naik.',
    toggleable: true,
    fields: [
      title('mis. Dipakai setiap hari oleh pengguna dan merchant', 70),
      listField(
        'items',
        'Angka',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 120.000+', maxLength: 12 }), t('label', 'Keterangan', { placeholder: 'mis. Merchant aktif', maxLength: 32 })],
        4,
      ),
      t('note', 'Catatan kecil', { placeholder: 'mis. Data per Oktober 2026.', maxLength: 100 }),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita merchant',
    description: 'Kartu cerita: foto usaha, kutipan, foto bulat (atau inisial), nama, dan jenis usaha.',
    toggleable: true,
    fields: [
      eyebrow('mis. Cerita merchant'),
      title('mis. Kata mereka yang sudah beralih'),
      listField(
        'items',
        'Cerita',
        'Cerita',
        [
          t('name', 'Nama', { maxLength: 30 }),
          t('role', 'Usaha & kota', { placeholder: 'mis. Pemilik kedai kopi · Bandung', maxLength: 60 }),
          ta('quote', 'Kutipan', { maxLength: 200 }),
          img('image', 'Foto usaha (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
          img('photo', 'Foto orang (opsional)', 'Foto persegi wajah, 480×480 px. Kosongkan untuk inisial.'),
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
      title('mis. Pertanyaan yang sering muncul'),
      subtitle('mis. Belum terjawab? Tim kami siap membantu.'),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Chat tim kami', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Daftar merchant).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'download',
    label: 'Unduh aplikasi',
    description: 'Judul, tombol Google Play & App Store (teks, bukan lencana resmi), kode QR opsional, dan foto tegak dengan kartu notifikasi.',
    toggleable: true,
    fields: [
      eyebrow('mis. Unduh aplikasi'),
      title('mis. Mulai bayar dengan PayNow hari ini'),
      subtitle(),
      t('play_label', 'Teks tombol Android', { placeholder: 'mis. Google Play', maxLength: 20 }),
      url('play_url', 'Tautan Google Play', { help: 'Kosongkan untuk menyembunyikan tombol.' }),
      t('app_label', 'Teks tombol iOS', { placeholder: 'mis. App Store', maxLength: 20 }),
      url('app_url', 'Tautan App Store', { help: 'Kosongkan untuk menyembunyikan tombol.' }),
      img('qr_image', 'Kode QR unduhan (opsional)', 'Gambar persegi kode QR yang mengarah ke halaman unduhan Anda. Kosongkan untuk ikon QR dekoratif.'),
      t('qr_caption', 'Keterangan di samping QR', { placeholder: 'mis. Tersedia untuk Android & iOS', maxLength: 60 }),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      t('card_title', 'Kartu di atas foto: judul', { placeholder: 'mis. Top-up berhasil', maxLength: 40 }),
      t('card_text', 'Kartu di atas foto: keterangan', { placeholder: 'mis. Saldo bertambah Rp250.000', maxLength: 48 }),
    ],
  },
  {
    key: 'contact',
    label: 'Daftar merchant & kontak',
    description:
      'Kontak (WhatsApp, email, telepon, alamat, jam layanan), foto opsional, dan formulir pendaftaran merchant yang menyusun pesan WhatsApp. Data formulir tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Daftar merchant'),
      title('mis. Terima pembayaran digital di usaha Anda'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota', maxLength: 200 }),
      url('maps_url', 'Link Google Maps (opsional)', { placeholder: 'https://maps.app.goo.gl/...', help: 'Dipakai untuk tautan "Lihat peta". Kosongkan untuk membuat dari alamat.' }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (021) 555-0148', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'merchant@merek.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tautan FAQ, dan formulir pendaftaran merchant.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang pendaftaran merchant.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat 09.00–18.00 WIB', maxLength: 90 }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Formulir pendaftaran merchant', maxLength: 60 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 220, help: 'Tampil di bawah tombol kirim. Sebutkan bahwa data tidak disimpan di website.' }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
      listField('form_categories', 'Pilihan jenis usaha di formulir', 'Pilihan', [t('label', 'Pilihan', { placeholder: 'mis. Makanan & minuman', maxLength: 30 })], 8),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita malam indigo: logo, deskripsi, tombol toko aplikasi, menu, media sosial, baris legal (izin & lembaga pengawas), dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang produk Anda.', maxLength: 200 }),
      ta('legal', 'Baris legal', {
        placeholder: 'mis. Nama badan usaha · nomor izin · lembaga pengawas',
        maxLength: 240,
        help: 'Tulis nama badan usaha, izin, dan lembaga pengawas yang BENAR-BENAR Anda miliki. Kosongkan untuk menyembunyikan.',
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Merek', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama merek.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
