// Skema CMS Aura Studio (docs/platform/TEMPLATE-BRIEFS-2026-10.md §2.4 + §4.2). Urutan section = urutan halaman.
// Kunci company profile (brand, hero, about, services, advantages, gallery, testimonials, cta, contact, footer) tetap
// bermakna sama seperti template lain; section baru memakai kunci Inggris pendek (`featured`, `team`).
// Template baru: tanpa `introduced` (belum ada konten tersimpan).
import type { TemplateField, TemplateListField, TemplateSection } from '../types';

const t = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'text', key, label, ...extra });
const ta = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'textarea', key, label, ...extra });
const img = (key: string, label: string, help?: string): TemplateField => ({ type: 'image', key, label, help });
const url = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({ type: 'url', key, label, ...extra });
const listField = (key: string, label: string, itemLabel: string, fields: TemplateField[], max: number): TemplateListField => ({
  type: 'list',
  key,
  label,
  itemLabel,
  fields,
  max,
});

/** Label kecil abu-abu huruf kapital di atas judul section */
const label = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40 });

export const auraStudioSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama studio, logo, dan warna aksen yang dipakai di seluruh halaman.',
    fields: [
      t('company_name', 'Nama studio / usaha', { placeholder: 'mis. Sekar Ayu Aesthetic Studio', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Rawat kulit dan kuku dengan sentuhan ahli', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img(
        'logo',
        'Logo',
        'PNG/SVG berlatar transparan, maks. 2 MB. Logo tampil di dalam lingkaran bergaris (monogram). Kosongkan untuk memakai simbol bawaan template dan nama usaha.',
      ),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Dipakai untuk tombol reservasi, tombol panah bulat, dan bidang lembut. Teks di atasnya otomatis disesuaikan agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (bagian pembuka)',
    description: 'Judul besar huruf kapital di kiri, foto potret tinggi di kanan, dan daftar layanan singkat.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label lokasi (chip di foto)', { placeholder: 'mis. Coblong, Bandung', maxLength: 40, help: 'Baris kedua chip diambil dari jam operasional di bagian Kontak.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Rawat diri dengan tenang', maxLength: 60, help: 'Ditampilkan dalam huruf kapital. Judul pendek (3–5 kata) paling indah.' }),
      t('highlight', 'Kata yang disorot (opsional)', {
        placeholder: 'mis. tenang',
        maxLength: 40,
        help: 'Bagian dari judul yang diberi warna aksen. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Satu kalimat tentang studio Anda.', maxLength: 200 }),
      t('primary_label', 'Teks tombol reservasi', { placeholder: 'mis. Reservasi', maxLength: 30 }),
      url('primary_url', 'Tautan tombol reservasi', {
        placeholder: 'https://...',
        help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak). Dipakai juga oleh tombol reservasi di menu dan chip "cari jadwal".',
      }),
      t('list_title', 'Judul daftar layanan', {
        placeholder: 'mis. Layanan kami',
        maxLength: 30,
        help: 'Daftar di bawah judul diambil otomatis dari bagian Perawatan (perawatan pertama tiap kategori).',
      }),
      t('secondary_label', 'Teks tautan "lihat semua"', { placeholder: 'mis. Lihat semua perawatan', maxLength: 30, help: 'Kosongkan untuk menyembunyikan tautan.' }),
      url('secondary_url', 'Tautan "lihat semua"', { placeholder: 'https://...', help: 'Kosongkan untuk menuju bagian Perawatan.' }),
      img('image', 'Foto potret', 'Foto tegak (potret), disarankan 1200×1500 px. Wajah sebaiknya di sepertiga atas foto.'),
      t('booking_label', 'Teks chip "cari jadwal" di foto', { placeholder: 'mis. Cari jadwal perawatan di Sekar Ayu', maxLength: 40 }),
      t('chat_label', 'Teks chip pesan (kiri bawah foto)', { placeholder: 'mis. Tulis pesan', maxLength: 30, help: 'Membuka WhatsApp. Kosongkan untuk menyembunyikan.' }),
      t('social_label', 'Teks chip media sosial (kanan bawah foto)', {
        placeholder: 'mis. Ikuti kami',
        maxLength: 30,
        help: 'Ikon diambil dari tautan Instagram/TikTok di bagian Footer.',
      }),
    ],
  },
  {
    key: 'advantages',
    label: 'Mengapa kami',
    description: 'Judul di tengah lingkaran tipis, dikelilingi kartu alasan. Tata letak lingkaran tampil bila ada tepat 4 alasan.',
    toggleable: true,
    fields: [
      label('mis. Alasan memilih kami'),
      t('title', 'Judul (di tengah lingkaran)', { placeholder: 'mis. Mengapa kami?', maxLength: 40 }),
      ta('subtitle', 'Kalimat di bawah judul', { placeholder: 'mis. Empat alasan pelanggan kembali.', maxLength: 140 }),
      listField(
        'items',
        'Alasan',
        'Alasan',
        [
          t('title', 'Judul', { placeholder: 'mis. Terapis berpengalaman', maxLength: 50 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 160 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'services',
    label: 'Perawatan',
    description: 'Kartu foto perawatan dengan tab kategori (mis. Perawatan Wajah / Perawatan Kuku). Klik kartu membuka reservasi lewat WhatsApp.',
    toggleable: true,
    fields: [
      label('mis. Pilih kategori'),
      t('title', 'Judul', {
        placeholder: 'mis. Perawatan kami',
        maxLength: 80,
        help: 'Tampil besar bila perawatan tidak memakai kategori; bila memakai kategori, nama kategori tampil sebagai tab.',
      }),
      ta('subtitle', 'Deskripsi singkat', { placeholder: 'Kalimat pengantar singkat.', maxLength: 220 }),
      t('more_label', 'Teks kartu terakhir', { placeholder: 'mis. Lihat lebih banyak di Instagram', maxLength: 60, help: 'Kosongkan untuk menyembunyikan kartu terakhir.' }),
      url('more_url', 'Tautan kartu terakhir', { placeholder: 'https://instagram.com/...', help: 'Kosongkan untuk memakai tautan Instagram di bagian Footer.' }),
      listField(
        'items',
        'Daftar perawatan',
        'Perawatan',
        [
          t('title', 'Nama perawatan', { placeholder: 'mis. Facial Pembersihan', maxLength: 50 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 160 }),
          img('image', 'Foto', 'Disarankan 1200×1500 px (tegak) atau 1600×1200 px. Kosongkan untuk kartu warna polos.'),
          t('category', 'Kategori (nama tab)', {
            placeholder: 'mis. Perawatan Wajah',
            maxLength: 30,
            help: 'Perawatan dengan kategori yang sama dikelompokkan dalam satu tab. Kosongkan semua untuk satu daftar tanpa tab.',
          }),
          t('count', 'Jumlah pilihan', { placeholder: 'mis. 10+ pilihan', maxLength: 20 }),
          t('price', 'Harga', { placeholder: 'mis. Mulai Rp250.000', maxLength: 24 }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'featured',
    label: 'Perawatan unggulan',
    description: 'Sorotan satu perawatan: judul besar, foto bulat, deskripsi, dan tahapan.',
    toggleable: true,
    fields: [
      label('mis. Perawatan unggulan'),
      t('title', 'Nama perawatan', { placeholder: 'mis. Manikur Jepang', maxLength: 50 }),
      ta('body', 'Deskripsi', { placeholder: 'Jelaskan perawatan ini dan hasil yang bisa diharapkan.', maxLength: 600 }),
      img('image', 'Foto (tampil bulat)', 'Foto persegi, disarankan 1200×1200 px dengan objek di tengah.'),
      t('tags_title', 'Judul daftar "cocok untuk"', { placeholder: 'mis. Cocok untuk', maxLength: 30 }),
      listField('tags', 'Cocok untuk', 'Label', [t('text', 'Label', { placeholder: 'mis. Kuku rapuh setelah gel', maxLength: 40 })], 5),
      listField(
        'steps',
        'Tahapan',
        'Tahap',
        [
          t('title', 'Judul tahap', { placeholder: 'mis. Konsultasi singkat', maxLength: 40 }),
          ta('text', 'Penjelasan', { placeholder: 'Satu kalimat.', maxLength: 140 }),
        ],
        4,
      ),
      t('button_label', 'Teks tautan', { placeholder: 'mis. Reservasi perawatan ini', maxLength: 30 }),
      url('button_url', 'Tautan', { placeholder: 'https://...', help: 'Kosongkan untuk membuka WhatsApp dengan nama perawatan ini.' }),
    ],
  },
  {
    key: 'about',
    label: 'Tentang studio',
    toggleable: true,
    fields: [
      label('mis. Tentang studio'),
      t('title', 'Judul', { placeholder: 'mis. Perawatan yang terasa personal', maxLength: 100 }),
      ta('body', 'Isi', { placeholder: 'Ceritakan studio, pendekatan, dan nilai Anda. Pisahkan paragraf dengan baris kosong.', maxLength: 1200 }),
      img('image', 'Foto', 'Foto tegak, disarankan 1200×1500 px.'),
      t('badge_value', 'Angka sorotan', { placeholder: 'mis. 10+', maxLength: 12, help: 'Tampil di kartu kecil di atas foto. Kosongkan untuk menyembunyikan.' }),
      t('badge_label', 'Keterangan angka sorotan', { placeholder: 'mis. Tahun pengalaman terapis', maxLength: 40 }),
      listField('points', 'Poin unggulan', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Alat steril di setiap sesi', maxLength: 80 })], 6),
    ],
  },
  {
    key: 'clients',
    label: 'Produk & mitra',
    description: 'Strip logo produk atau mitra yang Anda pakai. Logo ditampilkan abu-abu agar seragam.',
    toggleable: true,
    fields: [
      t('title', 'Judul kecil', { placeholder: 'mis. Produk perawatan yang kami pakai', maxLength: 90 }),
      listField(
        'items',
        'Daftar logo',
        'Logo',
        [
          t('name', 'Nama produk / mitra', { placeholder: 'mis. Daun Teduh Skincare', maxLength: 60, help: 'Dipakai sebagai teks alternatif logo, atau ditampilkan sebagai teks bila logo kosong.' }),
          img('logo', 'Logo', 'PNG atau WEBP berlatar transparan, sebaiknya versi mendatar. Kosongkan untuk menampilkan nama saja.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    toggleable: true,
    fields: [
      label('mis. Suasana studio'),
      t('title', 'Judul', { placeholder: 'mis. Ruang yang menenangkan', maxLength: 120 }),
      ta('subtitle', 'Deskripsi singkat', { placeholder: 'Kalimat pengantar singkat.', maxLength: 220 }),
      listField(
        'items',
        'Foto',
        'Foto',
        [img('image', 'Foto', 'Foto tegak, disarankan 1200×1500 px.'), t('caption', 'Keterangan', { placeholder: 'mis. Ruang perawatan pribadi', maxLength: 80 })],
        9,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    toggleable: true,
    fields: [
      label('mis. Kata pelanggan'),
      t('title', 'Judul', { placeholder: 'mis. Cerita pelanggan kami', maxLength: 120 }),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Anisa Rahma', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Pelanggan facial bulanan', maxLength: 80 }),
          ta('quote', 'Testimoni', { placeholder: 'Tulis kesan pelanggan...', maxLength: 300 }),
          img('photo', 'Foto (opsional)', 'Foto persegi. Kosongkan untuk memakai inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'team',
    label: 'Tim terapis',
    toggleable: true,
    fields: [
      label('mis. Tim kami'),
      t('title', 'Judul', { placeholder: 'mis. Terapis yang merawat Anda', maxLength: 120 }),
      ta('subtitle', 'Deskripsi singkat', { placeholder: 'Kalimat pengantar singkat.', maxLength: 220 }),
      listField(
        'items',
        'Anggota tim',
        'Anggota',
        [
          t('name', 'Nama', { placeholder: 'mis. Ayu Paramitha', maxLength: 60 }),
          t('role', 'Peran / keahlian', { placeholder: 'mis. Terapis wajah', maxLength: 60 }),
          img('photo', 'Foto', 'Foto tegak, disarankan 1200×1500 px. Kosongkan untuk memakai inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan reservasi',
    description: 'Blok berwarna aksen lembut sebelum bagian Kontak.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Saatnya meluangkan waktu untuk diri sendiri', maxLength: 90 }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 200 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Reservasi Sekarang', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { placeholder: 'https://...', help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      img('image', 'Foto (opsional)', 'Foto tegak di sisi kanan blok, disarankan 1200×1500 px. Kosongkan untuk blok tanpa foto.'),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    toggleable: true,
    fields: [
      label('mis. Kontak'),
      t('title', 'Judul', { placeholder: 'mis. Kunjungi studio kami', maxLength: 120 }),
      ta('subtitle', 'Deskripsi singkat', { placeholder: 'Kalimat pengantar singkat.', maxLength: 220 }),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@studio.id', maxLength: 120 },
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (022) 555-0123', maxLength: 30 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk semua tombol reservasi dan tombol WhatsApp.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin reservasi perawatan.', maxLength: 160 }),
      t('hours', 'Jam operasional', { placeholder: 'mis. Selasa–Minggu, 10.00–20.00 WIB', maxLength: 80 }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang studio.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Studio. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama usaha.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
    ],
  },
];
