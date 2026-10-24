// Skema CMS Serenity. Urutan section = urutan halaman: hero foto layar penuh (dengan strip fitur) → tentang → kelas
// → cara memulai → paket → cerita peserta → tanya jawab → ajakan → kontak → footer. Kunci company profile (brand,
// hero, about, services, testimonials, cta, contact, footer) sama artinya dengan template lain; section baru memakai
// kunci Inggris pendek (`steps`, `pricing`, `faq`). Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
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
    help: 'Tampil sebagai pil kecil. Label yang singkat juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const sectionTitle = (placeholder: string, maxLength = 120) => t('title', 'Judul', { placeholder, maxLength });
const sectionHighlight = (placeholder: string) =>
  t('highlight', 'Kata yang disorot', {
    placeholder,
    maxLength: 60,
    help: 'Bagian dari judul yang diberi warna gradasi. Tulis persis seperti di judul, atau kosongkan.',
  });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';

export const serenitySections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama usaha, logo, dan warna aksen (tombol, ikon, label, dan awal gradasi judul).',
    fields: [
      t('company_name', 'Nama usaha', { placeholder: 'mis. Aruna Yoga', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Bergerak, bernapas, dan merasa lebih baik', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol matahari & gelombang bawaan template dan nama usaha.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Dipakai untuk ikon, label, tombol aksen, dan gradasi judul. Warna terang otomatis digelapkan untuk teks agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto layar penuh)',
    description: 'Foto pemandangan selebar layar dengan menu transparan, judul dua baris, kartu kaca kecil, dan strip empat fitur di bagian bawah.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Napas tenang, tubuh lebih bugar', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Temukan Keseimbangan di Setiap Gerakan', maxLength: 80, help: 'Paling bagus 2 baris (± 30–40 karakter).' }),
      t('highlight', 'Baris kedua bergradasi', {
        placeholder: 'mis. di Setiap Gerakan',
        maxLength: 50,
        help: 'Akhir judul yang diberi warna gradasi pastel dan dipindah ke baris kedua. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Jelaskan singkat apa yang Anda tawarkan.', maxLength: 260 }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Coba Kelas Pertama', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: WA_HELP }),
      t('secondary_label', 'Teks tombol video', { placeholder: 'mis. Tonton Video', maxLength: 30, help: 'Tombol dengan ikon putar bulat di samping tombol utama.' }),
      url('secondary_url', 'Tautan tombol video', { placeholder: 'https://youtube.com/...', help: 'Mis. video YouTube atau Instagram. Kosongkan untuk menyembunyikan tombol video.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Daftar Kelas', maxLength: 24, help: 'Tombol putih di kanan menu. Kosongkan untuk memakai teks tombol utama.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk memakai tautan tombol utama.' }),
      img('image', 'Foto latar', 'Foto mendatar pemandangan (langit di bagian atas-kiri agar judul terbaca), disarankan 1920×1200 px. Lapisan gelap tipis ditambahkan otomatis.'),
      t('card_title', 'Kartu kaca: judul', { placeholder: 'mis. Yoga untuk Semua', maxLength: 30, help: 'Kartu kecil di kanan atas (layar lebar). Kosongkan judul & teks untuk menyembunyikan.' }),
      t('card_text', 'Kartu kaca: teks', { placeholder: 'mis. Pemula hingga mahir, mulai dari satu kelas.', maxLength: 70 }),
      url('card_url', 'Kartu kaca: tautan', { help: 'Kosongkan untuk menuju bagian Kelas.' }),
      listField(
        'features',
        'Strip fitur di bawah hero',
        'Fitur',
        [
          t('title', 'Judul', { placeholder: 'mis. Vinyasa Flow', maxLength: 24, help: 'Ikon dipilih otomatis dari judul (hatha, vinyasa, yin, pemula, privat, retret, dll.).' }),
          t('text', 'Keterangan', { placeholder: 'mis. Gerak yang mengalir', maxLength: 36 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'about',
    label: 'Tentang',
    description: 'Foto tegak dengan kartu kaca di kiri; judul, cerita, poin, dan angka di kanan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Tentang Kami'),
      sectionTitle('mis. Ruang untuk bergerak, bernapas, dan mengenal tubuh sendiri'),
      sectionHighlight('mis. mengenal tubuh sendiri'),
      ta('body', 'Cerita', { placeholder: 'Ceritakan tentang usaha Anda. Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
      t('badge_value', 'Kartu di foto: teks besar', { placeholder: 'mis. Sejak 2018', maxLength: 24, help: 'Kosongkan teks besar & kecil untuk menyembunyikan kartu.' }),
      t('badge_label', 'Kartu di foto: keterangan', { placeholder: 'mis. Studio yoga di Lembang', maxLength: 60 }),
      listField('points', 'Poin unggulan', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Kelas kecil, maksimal 12 peserta', maxLength: 80 })], 6),
      listField(
        'stats',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 1.500+', maxLength: 12 }),
          t('label', 'Keterangan', { placeholder: 'mis. Anggota komunitas', maxLength: 40 }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'services',
    label: 'Kelas',
    description: 'Kartu kelas dengan gambar, keterangan durasi/level, dan tautan tanya jadwal lewat WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kelas'),
      sectionTitle('mis. Pilih kelas yang pas untuk tubuh Anda'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar kelas',
        'Kelas',
        [
          t('title', 'Nama kelas', { placeholder: 'mis. Vinyasa Flow', maxLength: 60, help: 'Ikon dipilih otomatis dari nama kelas (hatha, vinyasa, yin, pemula, privat, retret, dll.).' }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 200 }),
          t('meta', 'Durasi / level', { placeholder: 'mis. 60 menit · Semua level', maxLength: 40 }),
          img('image', 'Gambar (opsional)', 'Gambar mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk memakai gradasi lembut bawaan dengan ikon.'),
          url('url', 'Tautan (opsional)', { help: 'Kosongkan untuk membuka WhatsApp dengan nama kelas.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'steps',
    label: 'Cara memulai',
    description: 'Panel gradasi lembut berisi langkah bernomor.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Cara Memulai'),
      sectionTitle('mis. Mulai dalam empat langkah sederhana'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Langkah',
        'Langkah',
        [
          t('title', 'Judul', { placeholder: 'mis. Pilih kelas', maxLength: 40 }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 160 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'pricing',
    label: 'Paket',
    description: 'Kartu paket berdampingan. Paket berlabel sorotan tampil gelap dan menonjol.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Paket'),
      sectionTitle('mis. Pilih paket yang pas dengan ritme Anda'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan kecil', { placeholder: 'mis. Harga per orang. Pembayaran di studio.', maxLength: 160 }),
      listField(
        'items',
        'Daftar paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Member Bulanan', maxLength: 40 }),
          t('price', 'Harga', { placeholder: 'mis. Rp450.000', maxLength: 20 }),
          t('period', 'Periode', { placeholder: 'mis. /bulan', maxLength: 20 }),
          t('badge', 'Label sorotan', { placeholder: 'mis. Paling diminati', maxLength: 30, help: 'Paket pertama yang berlabel tampil gelap dan menonjol.' }),
          ta('description', 'Deskripsi', { placeholder: 'Untuk siapa paket ini.', maxLength: 160 }),
          ta('features', 'Isi paket', { placeholder: 'Satu baris satu poin, mis.\n8 kelas dalam sebulan\nVideo latihan di rumah', maxLength: 400 }),
          t('button_label', 'Teks tombol', { placeholder: 'mis. Pilih Member Bulanan', maxLength: 30 }),
          url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp dengan nama paket.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita peserta',
    description: 'Kartu kutipan peserta dengan nama, keterangan, dan foto (atau inisial).',
    toggleable: true,
    fields: [
      sectionLabel('mis. Cerita Peserta'),
      sectionTitle('mis. Mereka menemukan ritme yoganya di sini'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Nadia Paramitha', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Desainer, Bandung', maxLength: 80 }),
          ta('quote', 'Testimoni', { placeholder: 'Tulis kesan peserta...', maxLength: 360 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk memakai inisial.'),
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
      sectionLabel('mis. Tanya Jawab'),
      sectionTitle('mis. Pertanyaan yang sering diajukan'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih ragu memilih kelas?', maxLength: 60 }),
      ta('help_text', 'Kartu bantuan: teks', { placeholder: 'mis. Ceritakan kebutuhan Anda, kami bantu pilihkan.', maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Apa yang perlu saya bawa?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Panel foto membulat dengan judul terpusat dan tombol.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Satu napas dalam bisa mengubah hari Anda', maxLength: 100 }),
      t('highlight', 'Kata yang disorot', { placeholder: 'mis. mengubah hari Anda', maxLength: 60, help: 'Bagian dari judul yang diberi warna gradasi pastel. Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Pesan Kelas Pertama', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1600×900 px. Kosongkan untuk latar gradasi warna aksen.'),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kunjungi Kami'),
      sectionTitle('mis. Studio kami di kaki bukit Lembang'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (022) 555-0123', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@usaha.id', maxLength: 120 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk semua tombol WhatsApp di halaman.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang jadwal kelas.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari, 06.00–20.00 WIB', maxLength: 80 }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Logo, deskripsi, menu, kontak singkat, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang usaha Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Usaha. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama usaha.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
