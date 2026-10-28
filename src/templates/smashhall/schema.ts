// Skema CMS SmashHall. Urutan section = urutan halaman: hero rally (foto + strip ketersediaan) → ketersediaan lapangan
// → fasilitas → member bulanan → latihan & pelatih → akademi → kejuaraan (pita gelap) → perlengkapan → galeri → tanya
// jawab → kontak & formulir → footer. Setiap section kecuali identitas bisa disembunyikan. Template baru belum punya
// konten tersimpan, jadi tanpa `introduced`. Legenda tabel dan judul kolom jadwal bisa diedit; label formulir tetap.
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

const EYEBROW_HELP = 'Label kecil berikon kok di atas judul. Label singkat (≤ 10 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 32, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 80) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #ketersediaan, #member, #akademi, atau #kontak.';

export const smashhallSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama GOR, logo, dan satu warna aksen untuk tombol, pil jadwal, dan ikon kok.',
    fields: [
      t('company_name', 'Nama GOR / klub', { placeholder: 'mis. GOR SmashHall', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. GOR & Klub Badminton di Bandung',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf, sebut kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol kok bawaan dan nama GOR.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan merah-oranye #F0542D. Warna teks di atas tombol dan versi gelap untuk teks dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto + strip lapangan)',
    description:
      'Foto latar selebar layar dengan judul, deskripsi, dua tombol, dan strip kaca berisi ketersediaan lapangan hari ini (diambil dari bagian Ketersediaan).',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. GOR badminton · Antapani, Bandung', maxLength: 60 }),
      t('title', 'Judul utama', { placeholder: 'mis. Main, latihan, dan bertanding di satu GOR', maxLength: 70, help: 'Paling bagus ≤ 9 kata.' }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. satu GOR', maxLength: 40, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jumlah lapangan, jam buka, dan cara booking dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Cek Lapangan', maxLength: 24 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju bagian Ketersediaan. ${LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Gabung Member', maxLength: 24 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Member.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Booking', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian Ketersediaan.' }),
      img('image', 'Foto latar hero', 'Foto mendatar 16:9, disarankan 1920×1080 px, subjek di sisi KANAN (teks hero di kiri).'),
      t('strip_title', 'Strip: judul', { placeholder: 'mis. Hari ini', maxLength: 24 }),
      t('strip_note', 'Strip: catatan kecil', { placeholder: 'mis. Contoh data. Ketersediaan dikonfirmasi admin via WhatsApp.', maxLength: 90 }),
      t('strip_link', 'Strip: teks tautan', { placeholder: 'mis. Lihat semua jadwal', maxLength: 28 }),
    ],
  },
  {
    key: 'availability',
    label: 'Ketersediaan lapangan',
    description:
      'Pilihan hari, tabel lapangan × jam (kosong/penuh), harga per jam, dan tombol booking yang menyusun pesan WhatsApp. Data contoh yang Anda isi sendiri; tidak tersambung ke sistem booking.',
    toggleable: true,
    fields: [
      eyebrow('mis. Ketersediaan'),
      title('mis. Cek lapangan kosong, lalu booking'),
      subtitle(),
      t('hours', 'Jam yang ditampilkan', {
        placeholder: 'mis. 16.00 · 17.00 · 18.00 · 19.00 · 20.00 · 21.00',
        maxLength: 80,
        help: 'Pisahkan dengan · atau koma, maks. 8 jam. Di HP paling pas 6 jam.',
      }),
      listField(
        'courts',
        'Lapangan',
        'Lapangan',
        [
          t('name', 'Nama lapangan', { placeholder: 'mis. Lapangan 1', maxLength: 24 }),
          t('short', 'Kode singkat', { placeholder: 'mis. L1', maxLength: 4, help: 'Tampil di tabel dan strip hero.' }),
        ],
        8,
      ),
      listField(
        'days',
        'Hari',
        'Hari',
        [
          t('label', 'Nama hari', { placeholder: 'mis. Senin', maxLength: 12 }),
          ta('full', 'Slot penuh', {
            placeholder: 'mis. L1 19.00, L3 20.00',
            maxLength: 300,
            help: 'Tulis slot yang PENUH: kode lapangan + jam, pisahkan dengan koma. Slot lain tampil kosong. Isi 7 hari berurutan Senin–Minggu agar strip hero memakai hari ini.',
          }),
        ],
        7,
      ),
      listField(
        'prices',
        'Harga sewa',
        'Harga',
        [t('label', 'Waktu', { placeholder: 'mis. Malam · 16.00–23.00', maxLength: 32 }), t('price', 'Harga', { placeholder: 'mis. Rp65.000/jam', maxLength: 24 })],
        3,
      ),
      t('free_label', 'Label slot kosong', { placeholder: 'mis. Kosong', maxLength: 16, help: 'Legenda tabel & strip hero, juga jumlah slot per hari ("38 kosong").' }),
      t('full_label', 'Label slot penuh', { placeholder: 'mis. Penuh', maxLength: 16 }),
      t('chosen_label', 'Label slot dipilih', { placeholder: 'mis. Dipilih', maxLength: 16 }),
      ta('note', 'Catatan di bawah tabel', { maxLength: 180, help: 'Sebutkan bahwa jadwal adalah contoh dan booking dikonfirmasi admin.' }),
      t('button_label', 'Teks tombol booking', { placeholder: 'mis. Booking via WhatsApp', maxLength: 28 }),
    ],
  },
  {
    key: 'facilities',
    label: 'Fasilitas',
    description: 'Foto GOR, empat angka ringkas, dan chip fasilitas (ikon dipilih otomatis dari nama).',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas'),
      title('mis. Lapangan terang, lantai empuk, istirahat nyaman'),
      subtitle(),
      img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'stats',
        'Angka ringkas',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 8', maxLength: 10 }), t('label', 'Keterangan', { placeholder: 'mis. Lapangan karpet vinyl', maxLength: 32 })],
        4,
      ),
      listField('items', 'Chip fasilitas', 'Fasilitas', [t('label', 'Fasilitas', { placeholder: 'mis. Ruang ganti & shower', maxLength: 32 })], 10),
    ],
  },
  {
    key: 'membership',
    label: 'Member bulanan',
    description: 'Tiga kartu paket dengan pilihan harga bulanan atau paket 3 bulan, jumlah sesi, keuntungan, dan tombol gabung lewat WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Member'),
      title('mis. Paket member bulanan'),
      subtitle(),
      t('monthly_label', 'Pilihan periode 1', { placeholder: 'mis. Bulanan', maxLength: 16 }),
      t('quarterly_label', 'Pilihan periode 2', { placeholder: 'mis. 3 bulan', maxLength: 16, help: 'Kosongkan untuk menyembunyikan pilihan periode.' }),
      t('quarterly_note', 'Catatan periode 2', { placeholder: 'mis. Hemat hingga 10%', maxLength: 32 }),
      t('unit', 'Satuan harga', { placeholder: 'mis. /bulan', maxLength: 16 }),
      listField(
        'plans',
        'Paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Rutin', maxLength: 24 }),
          t('price', 'Harga per bulan (bulanan)', { placeholder: 'mis. Rp600.000', maxLength: 16 }),
          t('price_quarter', 'Harga per bulan (paket 3 bulan)', { placeholder: 'mis. Rp550.000', maxLength: 16, help: 'Kosongkan bila sama.' }),
          t('sessions', 'Jumlah sesi', { placeholder: 'mis. 8 sesi × 2 jam per bulan', maxLength: 48 }),
          ta('perks', 'Keuntungan', { placeholder: 'Satu keuntungan per baris.', maxLength: 200 }),
          t('badge', 'Label sorotan', { placeholder: 'mis. Untuk main rutin', maxLength: 24, help: 'Isi pada SATU paket untuk menampilkannya sebagai kartu gelap.' }),
        ],
        3,
      ),
      ta('note', 'Catatan di bawah paket', { maxLength: 160 }),
      t('button_label', 'Teks tombol paket', { placeholder: 'mis. Gabung', maxLength: 20 }),
    ],
  },
  {
    key: 'training',
    label: 'Latihan & pelatih',
    description: 'Jadwal latihan mingguan (hari, jam, program, level, pelatih) dan kartu pelatih dengan inisial (tanpa foto).',
    toggleable: true,
    fields: [
      eyebrow('mis. Latihan'),
      title('mis. Jadwal latihan & pelatih'),
      subtitle(),
      t('columns', 'Judul kolom jadwal', {
        placeholder: 'mis. Hari · Jam · Program · Level · Pelatih',
        maxLength: 80,
        help: 'Lima judul kolom (tampil di layar lebar), pisahkan dengan ·. Kolom yang dikosongkan memakai judul bawaan.',
      }),
      listField(
        'sessions',
        'Jadwal latihan',
        'Jadwal',
        [
          t('day', 'Hari', { placeholder: 'mis. Senin', maxLength: 16 }),
          t('time', 'Jam', { placeholder: 'mis. 19.00–21.00', maxLength: 16 }),
          t('program', 'Program', { placeholder: 'mis. Latihan ganda', maxLength: 40 }),
          t('level', 'Level', { placeholder: 'mis. Menengah', maxLength: 24 }),
          t('coach', 'Pelatih', { placeholder: 'mis. Coach Dimas', maxLength: 32 }),
        ],
        10,
      ),
      t('coaches_title', 'Judul daftar pelatih', { placeholder: 'mis. Pelatih', maxLength: 32 }),
      listField(
        'coaches',
        'Pelatih',
        'Pelatih',
        [
          t('name', 'Nama', { maxLength: 40 }),
          t('focus', 'Fokus melatih', { placeholder: 'mis. Teknik dasar dan kelas anak', maxLength: 60 }),
          t('level', 'Level peserta', { placeholder: 'mis. Anak & pemula', maxLength: 40 }),
          t('years', 'Pengalaman', { placeholder: 'mis. Melatih sejak 2016', maxLength: 32, help: 'Tulis pengalaman, bukan klaim lisensi/sertifikat.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'academy',
    label: 'Akademi',
    description: 'Kartu kelompok usia (anak, remaja, dewasa) dengan foto, jadwal, fokus latihan, biaya, dan tombol daftar lewat WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Akademi'),
      title('mis. Akademi untuk anak, remaja, dan dewasa'),
      subtitle(),
      listField(
        'groups',
        'Kelompok',
        'Kelompok',
        [
          t('name', 'Nama kelompok', { placeholder: 'mis. Anak', maxLength: 24 }),
          t('ages', 'Usia', { placeholder: 'mis. 7–12 th', maxLength: 12 }),
          t('schedule', 'Jadwal', { placeholder: 'mis. Sabtu & Minggu · 08.00–10.00', maxLength: 48 }),
          ta('focus', 'Fokus latihan', { maxLength: 100 }),
          t('price', 'Biaya', { placeholder: 'mis. Rp400.000/bulan', maxLength: 24 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
        ],
        3,
      ),
      t('button_label', 'Teks tombol daftar', { placeholder: 'mis. Daftar akademi', maxLength: 28 }),
    ],
  },
  {
    key: 'championships',
    label: 'Kejuaraan',
    description: 'Pita gelap: foto, garis waktu turnamen (tanggal, nama, kategori, status, biaya atau hasil), dan tombol daftar lewat WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kejuaraan'),
      title('mis. Kejuaraan internal & antarklub'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'events',
        'Turnamen',
        'Turnamen',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 16 Nov', maxLength: 12, help: 'Tanggal + bulan singkat.' }),
          t('name', 'Nama turnamen', { maxLength: 60 }),
          t('category', 'Kategori', { placeholder: 'mis. Ganda putra · Umum', maxLength: 48 }),
          t('status', 'Status', { placeholder: 'mis. Pendaftaran dibuka', maxLength: 24, help: 'Kata "dibuka" → label oranye; "selesai" → label abu.' }),
          t('info', 'Biaya / hasil', { placeholder: 'mis. Rp150.000 per pasangan · 32 pasangan', maxLength: 90 }),
        ],
        5,
      ),
      t('button_label', 'Teks tombol daftar', { placeholder: 'mis. Daftar turnamen', maxLength: 28 }),
      ta('note', 'Catatan kecil', { maxLength: 120 }),
    ],
  },
  {
    key: 'shop',
    label: 'Perlengkapan',
    description: 'Kartu produk (foto, kategori, harga, catatan) dengan tombol pesan lewat WhatsApp. Tanpa keranjang belanja atau pembayaran online.',
    toggleable: true,
    fields: [
      eyebrow('mis. Perlengkapan'),
      title('mis. Toko kecil di lobi GOR'),
      subtitle(),
      listField(
        'items',
        'Produk',
        'Produk',
        [
          t('name', 'Nama produk', { maxLength: 40 }),
          t('category', 'Kategori', { placeholder: 'mis. Raket', maxLength: 24 }),
          t('price', 'Harga', { placeholder: 'mis. Rp385.000', maxLength: 20 }),
          t('note', 'Catatan singkat', { maxLength: 80 }),
          img('image', 'Foto (opsional)', 'Foto 4:3, disarankan 1200×900 px.'),
        ],
        8,
      ),
      ta('note', 'Catatan di bawah produk', { maxLength: 160 }),
      t('button_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan', maxLength: 16 }),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri'),
      title('mis. Suasana di SmashHall'),
      subtitle(),
      listField(
        'items',
        'Foto',
        'Foto',
        [
          img('image', 'Foto', 'Foto pertama tampil besar 16:9 (1600×900 px); lainnya 3:2 (1200×800 px).'),
          t('caption', 'Keterangan', { placeholder: 'mis. Smash di sesi sparing malam', maxLength: 80 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. FAQ'),
      title('mis. Pertanyaan yang sering masuk'),
      subtitle('mis. Belum terjawab? Tanya admin lewat WhatsApp.'),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya admin', maxLength: 28 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & formulir',
    description:
      'Baris kontak, peta Google Maps, dan formulir booking & pendaftaran (keperluan, nama, tanggal, jam, jumlah pemain) yang menyusun pesan WhatsApp. Data formulir tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Datang, main, atau tanya dulu'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. GOR SmashHall Antapani Bandung',
        maxLength: 120,
        help: 'Nama GOR + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 022-555-0182', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@gor-anda.com', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp admin',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, booking slot, paket, akademi, toko, dan formulir.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang booking lapangan.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari 07.00–23.00 WIB', maxLength: 90 }),
      t('hours_short', 'Jam buka singkat (menu atas)', { placeholder: 'mis. Buka 07.00–23.00', maxLength: 24, help: 'Tampil di menu atas layar lebar. Kosongkan untuk menyembunyikan.' }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Formulir booking & pendaftaran', maxLength: 60 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 220, help: 'Tampil di bawah tombol. Sebutkan bahwa data tidak disimpan di website.' }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer putih bergaris warna tema di atasnya: logo, deskripsi, menu, kontak, jam buka, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang GOR Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama GOR', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama GOR.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
