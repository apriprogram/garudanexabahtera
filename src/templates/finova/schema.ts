// Skema CMS Finova (docs/platform/TEMPLATE-BRIEFS-2026-10.md §3.4 + §4.3). Urutan section = urutan halaman:
// hero (panel gelap) → mitra (di dalam panel) → angka → produk → fitur (bento) → testimoni → FAQ → ajakan → kontak →
// footer. Kunci company profile (brand, hero, clients, advantages, about, services, testimonials, cta, contact, footer)
// sama artinya dengan template lain; section baru memakai kunci Inggris pendek (`faq`). Finova tidak punya galeri.
// Template baru belum punya konten tersimpan, jadi tidak ada penanda `introduced`.
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

const chipLabel = (placeholder: string) =>
  t('eyebrow', 'Label kecil di atas judul', {
    placeholder,
    maxLength: 40,
    help: 'Tampil sebagai chip kecil bertitik. Label yang singkat juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const sectionTitle = (placeholder: string, maxLength = 120) => t('title', 'Judul', { placeholder, maxLength });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';

export const finovaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama usaha, logo, dan dua warna merek: warna utama (panel gelap, ajakan, teks sorotan) dan warna tombol.',
    fields: [
      t('company_name', 'Nama usaha / aplikasi', { placeholder: 'mis. Lumbung Arta', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Kelola uang keluarga dengan lebih tenang', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol lumbung bawaan template dan nama usaha.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna utama',
        help: 'Dipakai untuk panel gelap hero, pita ajakan, kartu angka, dan teks sorotan. Panel otomatis digelapkan agar teks putih tetap terbaca.',
      },
      {
        type: 'color',
        key: 'highlight_color',
        label: 'Warna tombol & sorotan',
        help: 'Warna terang untuk tombol utama, chip, dan kata sorotan di panel gelap (bawaan hijau limau). Teks di atasnya otomatis disesuaikan.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (panel gelap)',
    description: 'Panel hijau gelap berisi menu, judul, foto dengan kartu saldo melayang, bukti sosial, dan logo mitra.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Tabungan, pembayaran, dan anggaran dalam satu aplikasi', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Kelola uang lebih tenang dan cerdas', maxLength: 90, help: 'Paling bagus 2 baris (± 30–40 karakter).' }),
      t('highlight', 'Kata yang disorot', {
        placeholder: 'mis. tenang dan cerdas',
        maxLength: 60,
        help: 'Bagian dari judul yang diberi warna tombol. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Jelaskan singkat apa yang aplikasi atau layanan Anda bantu.', maxLength: 300 }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Mulai Gratis', maxLength: 30, help: 'Juga dipakai sebagai tombol di menu atas.' }),
      url('primary_url', 'Tautan tombol utama', { help: WA_HELP }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Lihat Fitur', maxLength: 30, help: 'Kosongkan untuk menyembunyikan tombol kedua.' }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Fitur.' }),
      img('image', 'Foto hero', 'Foto tegak 4:5, mis. tangan memegang kartu atau ponsel. Disarankan 1200×1500 px. Hindari logo bank/jaringan kartu milik pihak lain.'),
      t('balance_label', 'Kartu saldo: label', { placeholder: 'mis. Saldo tabungan keluarga', maxLength: 30, help: 'Kartu putih yang melayang di tepi foto. Kosongkan label & nominal untuk menyembunyikan.' }),
      t('balance_value', 'Kartu saldo: nominal', { placeholder: 'mis. Rp12.480.000', maxLength: 24 }),
      t('balance_caption', 'Kartu saldo: keterangan', { placeholder: 'mis. +Rp1.250.000 bulan ini', maxLength: 40 }),
      listField(
        'chips',
        'Chip transaksi (desktop)',
        'Chip',
        [
          t('label', 'Label', { placeholder: 'mis. Bayar listrik', maxLength: 30 }),
          t('value', 'Nominal', { placeholder: 'mis. −Rp350.000', maxLength: 20 }),
        ],
        3,
      ),
      t('proof_value', 'Bukti sosial: angka', { placeholder: 'mis. 2,4 jt+', maxLength: 16, help: 'Tampil besar di samping foto pengguna (foto dari bagian Testimoni).' }),
      ta('proof_text', 'Bukti sosial: keterangan', { placeholder: 'mis. Keluarga dan pelaku usaha sudah mengatur uangnya bersama kami.', maxLength: 120 }),
    ],
  },
  {
    key: 'clients',
    label: 'Mitra & afiliasi',
    description: 'Strip logo mitra di bagian bawah panel hero (di HP: tepat di bawah panel). Logo dibuat satu warna agar seragam.',
    toggleable: true,
    fields: [
      t('title', 'Judul kecil', { placeholder: 'mis. Bekerja sama dengan mitra pembayaran tepercaya', maxLength: 90 }),
      listField(
        'items',
        'Daftar logo',
        'Logo',
        [
          t('name', 'Nama mitra', {
            placeholder: 'mis. Koperasi Sejahtera',
            maxLength: 60,
            help: 'Dipakai sebagai teks alternatif logo, atau ditampilkan sebagai teks bila logo kosong.',
          }),
          img('logo', 'Logo', 'PNG/SVG berlatar transparan, sebaiknya versi mendatar satu warna. Kosongkan untuk menampilkan nama saja.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'advantages',
    label: 'Angka besar',
    description: 'Baris angka raksasa dengan satuan kecil di pojok (mis. "2,4 jt+" → 2,4 dan "jt+"), dipisah garis tegak.',
    toggleable: true,
    fields: [
      sectionTitle('mis. Dipercaya pengguna di seluruh Indonesia', 90),
      listField(
        'stats',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 2,4 jt+', maxLength: 12, help: 'Satuan di belakang angka (jt+, rb, +, %) tampil kecil di pojok kanan atas.' }),
          t('label', 'Keterangan', { placeholder: 'mis. Pengguna terdaftar', maxLength: 40 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'about',
    label: 'Produk',
    description: 'Teks dan poin di kiri, dua kartu tampilan aplikasi (saldo + daftar rekening) di kanan.',
    toggleable: true,
    fields: [
      chipLabel('mis. Produk'),
      sectionTitle('mis. Keuangan lebih rapi, keputusan lebih tepat'),
      ta('body', 'Isi', { placeholder: 'Jelaskan manfaat utama produk. Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      listField('points', 'Poin unggulan', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Pengingat tagihan otomatis', maxLength: 90 })], 4),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Lihat Cara Kerja', maxLength: 30, help: 'Kosongkan untuk menyembunyikan tombol.' }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menuju bagian Fitur.' }),
      img('image', 'Tangkapan layar aplikasi (opsional)', 'Bila diisi, gambar ini menggantikan dua kartu tampilan di kanan. Disarankan 1600×1150 px.'),
      t('mock_title', 'Kartu grafik: judul', { placeholder: 'mis. Pengeluaran minggu ini', maxLength: 40 }),
      t('mock_value', 'Kartu grafik: nominal', { placeholder: 'mis. Rp1.259.750', maxLength: 24 }),
      t('mock_caption', 'Kartu grafik: keterangan', { placeholder: 'mis. 12% lebih hemat dari minggu lalu', maxLength: 60 }),
      t('mock_list_title', 'Kartu daftar: judul', { placeholder: 'mis. Rekening & kartu', maxLength: 30 }),
      listField(
        'mock_items',
        'Kartu daftar: baris',
        'Baris',
        [
          t('label', 'Nama', { placeholder: 'mis. Tabungan keluarga', maxLength: 30 }),
          t('value', 'Nominal', { placeholder: 'mis. Rp8.250.000', maxLength: 24 }),
          t('meta', 'Keterangan kecil', { placeholder: 'mis. •••• 4141', maxLength: 20 }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'services',
    label: 'Fitur (bento)',
    description: 'Judul terpusat lalu kartu abu bento: dua kartu besar, satu kartu lebar dengan peta Indonesia + kartu angka, dan satu kartu kecil.',
    toggleable: true,
    fields: [
      chipLabel('mis. Fitur'),
      sectionTitle('mis. Sederhana, cepat, dan tanpa ribet'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('stat_value', 'Kartu angka: angka', { placeholder: 'mis. 120+', maxLength: 12, help: 'Kartu berwarna utama di kartu lebar (fitur ke-3). Kosongkan untuk menyembunyikan.' }),
      t('stat_label', 'Kartu angka: keterangan', { placeholder: 'mis. Kota sudah terlayani', maxLength: 40 }),
      listField(
        'items',
        'Daftar fitur',
        'Fitur',
        [
          t('title', 'Nama fitur', { placeholder: 'mis. Hubungkan rekening & kartu', maxLength: 60 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 200 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1600×1067 px. Fitur ke-3 tanpa foto menampilkan peta Indonesia.'),
        ],
        4,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Potret besar pengguna dan kartu kutipan dengan tombol panah. Foto pengguna juga tampil di bukti sosial hero.',
    toggleable: true,
    fields: [
      chipLabel('mis. Testimoni'),
      sectionTitle('mis. Bergabung dengan jutaan pengguna yang mengatur uang lebih cerdas'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Sri Wahyuni', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Bendahara koperasi, Yogyakarta', maxLength: 80 }),
          ta('quote', 'Testimoni', { placeholder: 'Tulis kesan pengguna...', maxLength: 400 }),
          img('photo', 'Foto (opsional)', 'Foto tegak 4:5 dengan wajah di sepertiga atas, disarankan 1200×1500 px. Kosongkan untuk memakai inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    description: 'Daftar pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp di kiri.',
    toggleable: true,
    fields: [
      chipLabel('mis. Tanya jawab'),
      sectionTitle('mis. Pertanyaan yang sering diajukan'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih bingung? Tanya langsung ke tim kami', maxLength: 60 }),
      img('image', 'Kartu bantuan: foto (opsional)', 'Foto tegak 4:5, mis. tim layanan pelanggan. Kosongkan untuk menyembunyikan.'),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Apakah ada biaya bulanan?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Pita hijau gelap berkisi dengan tombol utama dan tombol unduh aplikasi.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Ambil kendali atas keuangan Anda hari ini', maxLength: 100 }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Mulai Sekarang', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      t('app_store_label', 'Teks tombol App Store', { placeholder: 'mis. App Store', maxLength: 24 }),
      url('app_store_url', 'Tautan App Store', { help: 'Kosongkan untuk menyembunyikan tombol (juga di footer).' }),
      t('play_store_label', 'Teks tombol Google Play', { placeholder: 'mis. Google Play', maxLength: 24 }),
      url('play_store_url', 'Tautan Google Play', { help: 'Kosongkan untuk menyembunyikan tombol (juga di footer).' }),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    toggleable: true,
    fields: [
      chipLabel('mis. Kontak'),
      sectionTitle('mis. Butuh bantuan? Tim kami siap membantu'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@usaha.id', maxLength: 120 },
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (021) 555-0123', maxLength: 30 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk tombol WhatsApp di seluruh halaman.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang aplikasinya.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat, 08.00–20.00 WIB', maxLength: 80, help: 'Juga tampil di kartu bantuan FAQ.' }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer terang multi-kolom: logo, deskripsi, tombol unduh, kolom tautan, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang usaha Anda.', maxLength: 220 }),
      listField(
        'links',
        'Kolom tautan',
        'Tautan',
        [
          t('group', 'Judul kolom', { placeholder: 'mis. Produk', maxLength: 30, help: 'Tautan dengan judul kolom yang sama dikelompokkan dalam satu kolom.' }),
          t('label', 'Teks tautan', { placeholder: 'mis. Fitur', maxLength: 40 }),
          url('url', 'Tautan', { placeholder: 'mis. #layanan atau https://...', help: 'Kosongkan untuk menuju bagian Kontak.' }),
        ],
        16,
      ),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Usaha. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama usaha.' }),
      ta('legal_note', 'Catatan kecil di bawah', { placeholder: 'mis. Informasi izin usaha atau catatan penting lainnya.', maxLength: 200 }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
