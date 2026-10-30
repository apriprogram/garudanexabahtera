// Skema CMS Kemudi. Urutan section = urutan halaman: hero (foto latar + kartu pesan mobil) → armada → film proses
// (animasi gulir) → harga → syarat sewa → antar-jemput → cara sewa → ulasan → tanya jawab → garasi & kontak → footer.
// Setiap section bisa disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa `introduced`. Mobil, harga,
// zona, dan pelanggan di konten demo fiktif; mobil ditulis sebagai kelas ("MPV keluarga"), bukan merek/tipe.
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
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 30, help: 'Tampil di label bulat bernomor. Kosongkan untuk menyembunyikan.' });
const title = (placeholder: string, maxLength = 70) => t('title', 'Judul', { placeholder, maxLength, help: 'Paling bagus ≤ 8 kata.' });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 140) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #mobil, #harga, #syarat, atau #kontak.';
const PRICE_HELP = 'Tulis angka saja (450000) atau dengan satuan (450rb / 1,1 jt). Kosongkan bila tidak tersedia.';

export const kemudiSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama, logo, dan satu warna aksen. Warna bodi mobil ilustrasi, tombol, dan versi terang/gelapnya dibuat otomatis agar teks tetap terbaca.',
    fields: [
      t('company_name', 'Nama rental / merek', { placeholder: 'mis. Kemudi Rent Car', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Rental mobil lepas kunci & dengan sopir',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol setir bawaan dan nama merek.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan biru #0050FF. Dipakai tombol, harga, pilihan aktif, dan warna bodi mobil ilustrasi.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto & kartu pesan)',
    description: 'Foto besar sebagai latar, judul, kalimat singkat, dan kartu pesan mobil: layanan, mobil, tanggal & jam ambil/kembali, perkiraan harga, lalu pesan lewat WhatsApp.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Rental mobil Bandung', maxLength: 50 }),
      t('title', 'Judul utama', { placeholder: 'mis. Sewa mobil tanpa ribet, harga jelas.', maxLength: 60, help: 'Paling bagus ≤ 8 kata.' }),
      t('highlight', 'Kata yang digarisbawahi', {
        placeholder: 'mis. harga jelas.',
        maxLength: 30,
        help: 'Harus sama persis dengan bagian judul. Kosongkan untuk tanpa garis.',
      }),
      ta('subtitle', 'Kalimat singkat', {
        placeholder: 'Jelaskan layanan rental Anda dalam 1-2 kalimat.',
        maxLength: 160,
        help: 'Juga menjadi deskripsi situs di Google; 120-140 huruf paling pas (hero tetap ringkas).',
      }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1920×1080 px. Paling bagus foto dari atas (drone) dengan mobil di tengah-kanan.'),
      t('link_label', 'Teks tautan ke daftar mobil', { placeholder: 'mis. Lihat semua mobil', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      t('card_title', 'Judul kartu pesan', { placeholder: 'mis. Pesan mobil', maxLength: 30 }),
      t('button_label', 'Teks tombol kartu', { placeholder: 'mis. Pesan via WhatsApp', maxLength: 28 }),
      ta('card_note', 'Catatan di bawah tombol', {
        placeholder: 'mis. Harga perkiraan; ketersediaan dikonfirmasi admin.',
        maxLength: 120,
        help: 'Sebutkan bahwa harga perkiraan dan dikonfirmasi admin.',
      }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Pesan Mobil', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju kartu pesan. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'fleet',
    label: 'Armada mobil',
    description:
      'Kartu mobil dengan ilustrasi sesuai kelas (city car, MPV, SUV, MPV premium, minibus) atau foto Anda, spesifikasi, dan harga. Saringan kelas dibuat otomatis dari kolom Kelas.',
    toggleable: true,
    fields: [
      eyebrow('mis. Mobil'),
      title('mis. Pilih mobil Anda'),
      subtitle(),
      t('book_label', 'Teks tombol di kartu', { placeholder: 'mis. Pesan', maxLength: 16, help: 'Mengisi kartu pesan di hero dengan mobil ini.' }),
      t('price_note', 'Catatan harga di bawah saringan', {
        placeholder: 'mis. Harga contoh per unit; harga final dikonfirmasi admin via WhatsApp.',
        maxLength: 110,
        help: 'Satu kalimat; sebutkan bahwa harga final dikonfirmasi admin. Kosongkan untuk menyembunyikan.',
      }),
      listField(
        'items',
        'Mobil',
        'Mobil',
        [
          t('name', 'Nama mobil', { placeholder: 'mis. MPV keluarga', maxLength: 30, help: 'Tulis kelasnya; "atau setara" ditambahkan otomatis. Hindari merek/tipe bila unit bisa berganti.' }),
          t('class', 'Kelas', {
            placeholder: 'mis. City car, MPV, SUV, MPV premium, Minibus',
            maxLength: 20,
            help: 'Untuk saringan dan bentuk ilustrasi: city/hatchback, MPV, SUV, premium, minibus. MPV bernama "hemat" atau "ringkas" memakai siluet MPV yang lebih pendek.',
          }),
          t('seats', 'Jumlah kursi', { placeholder: 'mis. 7', maxLength: 10 }),
          t('transmission', 'Transmisi', { placeholder: 'mis. Otomatis', maxLength: 12 }),
          t('fuel', 'Bahan bakar', { placeholder: 'mis. Bensin', maxLength: 12 }),
          t('luggage', 'Bagasi', { placeholder: 'mis. 3 (koper)', maxLength: 12 }),
          t('price_12', 'Harga lepas kunci 12 jam', { placeholder: 'mis. 350000', maxLength: 16, help: PRICE_HELP }),
          t('price_24', 'Harga lepas kunci 24 jam', {
            placeholder: 'mis. 450000',
            maxLength: 16,
            help: `${PRICE_HELP} Tanpa harga 24 jam = khusus dengan sopir; tanpa harga 24 jam dan sopir = "Harga via admin".`,
          }),
          t('price_driver', 'Harga dengan sopir per 12 jam', { placeholder: 'mis. 650000', maxLength: 16, help: PRICE_HELP }),
          t('price_out', 'Tambahan luar kota', { placeholder: 'mis. +Rp75.000/hari', maxLength: 24 }),
          img('image', 'Foto mobil (opsional)', 'Foto mendatar 16:10, disarankan 1200×750 px. Kosongkan untuk memakai ilustrasi kelas mobil.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'film',
    label: 'Film proses (animasi gulir)',
    description:
      'Pita grafit penuh: mobil cetak biru tergambar, diwarnai, diberi keterangan, lalu berangkat seiring halaman digulir. Tanpa animasi (pratinjau CMS, kurangi gerak) tampil sebagai gambar diam + daftar tahap.',
    toggleable: true,
    fields: [
      eyebrow('mis. Proses'),
      title('mis. Mobil siap, Anda tinggal jalan'),
      subtitle(),
      t('car_label', 'Nama unit di panel', { placeholder: 'mis. MPV 7 kursi', maxLength: 20 }),
      listField(
        'chapters',
        'Tahap',
        'Tahap',
        [t('title', 'Nama tahap', { placeholder: 'mis. Cek', maxLength: 16 }), t('text', 'Keterangan', { placeholder: 'Satu kalimat.', maxLength: 70 })],
        4,
      ),
      listField(
        'callouts',
        'Keterangan pada mobil',
        'Keterangan',
        [t('text', 'Teks', { placeholder: 'mis. AC dingin, 2 blower', maxLength: 40, help: 'Urutan posisi di gambar: kaca tengah, atap, panel belakang, roda depan.' })],
        4,
      ),
      t('final_title', 'Judul penutup', { placeholder: 'mis. Diantar ke lokasi Anda', maxLength: 36 }),
      t('final_text', 'Kalimat penutup', { placeholder: 'Satu kalimat.', maxLength: 80 }),
    ],
  },
  {
    key: 'pricing',
    label: 'Harga sewa',
    description: 'Tabel harga dari data armada (12 jam, 24 jam, dengan sopir, luar kota), catatan, foto, dan daftar "sudah termasuk".',
    toggleable: true,
    fields: [
      eyebrow('mis. Harga'),
      title('mis. Harga sewa per hari'),
      subtitle(),
      ta('note', 'Catatan di bawah tabel', { placeholder: 'mis. Harga contoh; lepas kunci belum termasuk BBM, tol, parkir.', maxLength: 160 }),
      img('image', 'Foto samping', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      t('included_title', 'Judul daftar', { placeholder: 'mis. Sudah termasuk', maxLength: 30 }),
      listField('included', 'Sudah termasuk', 'Butir', [t('text', 'Teks', { placeholder: 'mis. Kabin bersih dan wangi', maxLength: 50 })], 6),
    ],
  },
  {
    key: 'requirements',
    label: 'Syarat sewa',
    description: 'Dua tab (lepas kunci / dengan sopir): dokumen dengan ikon otomatis, aturan singkat, dan foto. Website tidak mengunggah dokumen.',
    toggleable: true,
    fields: [
      eyebrow('mis. Syarat'),
      title('mis. Syarat sewa'),
      subtitle(),
      t('self_label', 'Tab 1: nama', { placeholder: 'mis. Lepas kunci', maxLength: 20 }),
      img('self_image', 'Tab 1: foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'self_docs',
        'Tab 1: dokumen',
        'Dokumen',
        [t('title', 'Dokumen', { placeholder: 'mis. SIM A aktif', maxLength: 30, help: 'Ikon dipilih otomatis (KTP, SIM, deposit, dll.).' }), t('text', 'Keterangan', { maxLength: 70 })],
        6,
      ),
      listField('self_rules', 'Tab 1: aturan', 'Aturan', [t('text', 'Aturan', { maxLength: 80 })], 6),
      t('driver_label', 'Tab 2: nama', { placeholder: 'mis. Dengan sopir', maxLength: 20 }),
      img('driver_image', 'Tab 2: foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      listField('driver_docs', 'Tab 2: dokumen', 'Dokumen', [t('title', 'Dokumen', { maxLength: 30 }), t('text', 'Keterangan', { maxLength: 70 })], 6),
      listField('driver_rules', 'Tab 2: aturan', 'Aturan', [t('text', 'Aturan', { maxLength: 80 })], 6),
      ta('note', 'Catatan dokumen', {
        placeholder: 'mis. Dokumen dicek saat serah terima; website tidak menyimpan dokumen Anda.',
        maxLength: 160,
      }),
    ],
  },
  {
    key: 'delivery',
    label: 'Antar-jemput',
    description: 'Daftar zona antar dengan biaya dan peta kota abstrak (bukan peta asli); rute dari garasi tergambar ke zona yang dipilih.',
    toggleable: true,
    fields: [
      eyebrow('mis. Antar-jemput'),
      title('mis. Antar-jemput mobil'),
      subtitle(),
      t('garage_label', 'Nama titik garasi di peta', { placeholder: 'mis. Garasi Kemudi', maxLength: 30 }),
      ta('note', 'Catatan', { placeholder: 'mis. Biaya antar dikonfirmasi admin.', maxLength: 140 }),
      listField(
        'zones',
        'Zona',
        'Zona',
        [
          t('name', 'Nama zona', { placeholder: 'mis. Stasiun Bandung', maxLength: 40 }),
          t('detail', 'Keterangan', { placeholder: 'mis. ± 20 menit dari garasi', maxLength: 40 }),
          t('fee', 'Biaya', { placeholder: 'mis. Gratis / +Rp50.000', maxLength: 20 }),
          img('image', 'Foto kecil (opsional)', 'Foto persegi, disarankan 480×480 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'steps',
    label: 'Cara sewa',
    description: 'Langkah sewa berurutan dengan ikon otomatis dan garis penghubung.',
    toggleable: true,
    fields: [
      eyebrow('mis. Cara sewa'),
      title('mis. Empat langkah sewa mobil'),
      subtitle(),
      listField(
        'items',
        'Langkah',
        'Langkah',
        [t('title', 'Langkah', { placeholder: 'mis. Konfirmasi admin', maxLength: 30 }), t('text', 'Keterangan', { placeholder: 'Satu kalimat.', maxLength: 80 })],
        5,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Ulasan pelanggan',
    description: 'Foto suasana dan kartu ulasan dengan inisial (tanpa foto wajah), nama depan, keterangan, dan bintang opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Ulasan'),
      title('mis. Pengalaman menyewa di Kemudi'),
      subtitle('mis. Cerita singkat dari penyewa lepas kunci dan dengan sopir.'),
      img('image', 'Foto suasana', 'Foto tegak 4:5, disarankan 960×1200 px, tanpa wajah yang dikenali. Kosongkan untuk menyembunyikan.'),
      listField(
        'items',
        'Ulasan',
        'Ulasan',
        [
          ta('quote', 'Kutipan', { maxLength: 140 }),
          t('name', 'Nama', { placeholder: 'mis. Rina', maxLength: 30 }),
          t('place', 'Keterangan', { placeholder: 'mis. Liburan keluarga, Jakarta', maxLength: 40 }),
          t('rating', 'Bintang (1-5, opsional)', { placeholder: 'mis. 5', maxLength: 1 }),
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
      title('mis. Tanya jawab sewa mobil'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Chat admin di WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      img('image', 'Foto samping', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      t('image_caption', 'Keterangan foto', { placeholder: 'mis. Dicuci & dicek tiap serah terima', maxLength: 40 }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 100 }), ta('answer', 'Jawaban', { maxLength: 300 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Garasi & kontak',
    description: 'Alamat garasi, jam buka, telepon, WhatsApp, email, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Garasi & kontak'),
      subtitle(),
      ta('address', 'Alamat garasi', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Sukajadi, Kota Bandung',
        maxLength: 120,
        help: 'Nama garasi + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@rental.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, kartu pesan di hero, tanya jawab, dan footer.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang sewa mobil.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Garasi 07.00–21.00 · admin WhatsApp 24 jam', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita grafit: ajakan besar dengan nomor telepon & tombol WhatsApp, deskripsi, menu, kontak, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      t('cta_title', 'Ajakan besar', { placeholder: 'mis. Butuh mobil hari ini?', maxLength: 40, help: 'Kosongkan untuk menyembunyikan baris ajakan.' }),
      t('cta_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Chat admin', maxLength: 24 }),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang rental Anda.', maxLength: 200 }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Harga dan ketersediaan dikonfirmasi admin.', maxLength: 140 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Rental', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
