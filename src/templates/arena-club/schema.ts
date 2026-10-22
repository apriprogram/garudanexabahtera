// Skema CMS Arena Club (docs/platform/TEMPLATE-BRIEFS-2026-10.md §1.4 + §4.1). Urutan section = urutan halaman.
// Kunci section/field company profile (brand, hero, about, services, advantages, gallery, testimonials, clients,
// cta, contact, footer) sama artinya dengan template lain; section baru memakai kunci Inggris pendek
// (`pricing`, `team`, `events`). Template baru belum punya konten tersimpan, jadi tidak ada penanda `introduced`.
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
  t('eyebrow', 'Label pil di atas judul', { placeholder, maxLength: 40, help: 'Tampil sebagai pil kecil bergaris. Kosongkan untuk menyembunyikan.' });
const sectionTitle = (placeholder: string, maxLength = 120) => t('title', 'Judul', { placeholder, maxLength });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';

export const arenaClubSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama klub, logo, warna aksen, dan tombol di menu atas.',
    fields: [
      t('company_name', 'Nama klub / usaha', { placeholder: 'mis. Lintang Padel & Tenis Club', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Main lebih seru, latihan lebih terarah', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol lapangan bawaan template dan nama klub.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Dipakai untuk kartu paket unggulan, titik level, chip, dan tombol di atas foto. Teks di atasnya otomatis disesuaikan agar tetap terbaca.',
      },
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Pesan Lapangan', maxLength: 30, help: 'Tombol gelap di kanan menu. Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: WA_HELP }),
    ],
  },
  {
    key: 'hero',
    label: 'Hero (banner foto)',
    description: 'Banner foto besar membulat dengan judul di tengah foto. Pakai foto lapangan atau suasana bermain yang terang.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Klub padel & tenis di Jakarta Selatan', maxLength: 60, help: 'Chip kaca di atas judul. Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Ayunan terbaikmu dimulai di lapangan ini', maxLength: 120 }),
      t('highlight', 'Kata yang digarisbawahi', {
        placeholder: 'mis. lapangan ini',
        maxLength: 60,
        help: 'Bagian dari judul yang diberi garis bawah warna aksen. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Jelaskan singkat fasilitas dan program klub.', maxLength: 300 }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Jadwalkan Kelas Percobaan', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: WA_HELP }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Lihat Membership', maxLength: 30, help: 'Kosongkan untuk menyembunyikan tombol kedua.' }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Membership (atau Program bila Membership disembunyikan).' }),
      img('image', 'Foto banner', 'Foto mendatar yang terang, disarankan 1600×900 px. Bagian tengah foto tertutup judul, jadi subjek sebaiknya agak ke samping.'),
      t('proof_text', 'Teks bukti sosial (kiri bawah)', {
        placeholder: 'mis. Latih bersama pelatih profesional',
        maxLength: 80,
        help: 'Tampil di samping 3 foto pelatih pertama (bagian Pelatih). Kosongkan untuk menyembunyikan.',
      }),
    ],
  },
  {
    key: 'about',
    label: 'Tentang klub',
    description: 'Pernyataan besar tentang klub, lalu tiga kartu: kartu gelap berteks, kartu foto berlabel, dan kartu angka dengan baris titik.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Tentang Lintang'),
      sectionTitle('mis. Sejak 2021, klub ini jadi rumah bagi pemula hingga pemain turnamen.', 220),
      ta('body', 'Isi', {
        placeholder: 'Paragraf pertama tampil besar di kartu gelap (kalimat pertama paling terang). Paragraf berikutnya tampil di bawah judul. Pisahkan paragraf dengan baris kosong.',
        maxLength: 1200,
      }),
      listField('points', 'Poin unggulan (chip di bawah judul)', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Kelas untuk semua level', maxLength: 60 })], 4),
      img('image', 'Foto kartu tengah', 'Foto tegak 4:5, mis. pelatih atau pemain. Disarankan 1200×1500 px.'),
      t('image_label', 'Label kaca di foto', { placeholder: 'mis. Kelas privat & grup', maxLength: 40 }),
      t('badge_value', 'Angka di kartu kanan', { placeholder: 'mis. 24', maxLength: 12, help: 'Angka besar (berjalan saat muncul). Kosongkan untuk menyembunyikan.' }),
      t('badge_label', 'Keterangan angka', { placeholder: 'mis. Pelatih bersertifikat', maxLength: 40 }),
      ta('badge_text', 'Kalimat pendek di bawah angka', { placeholder: 'mis. Siap mendampingi dari servis pertama sampai level turnamen.', maxLength: 140 }),
      t('levels_title', 'Judul baris titik', { placeholder: 'mis. Member aktif per level', maxLength: 40 }),
      listField(
        'levels',
        'Baris titik (level)',
        'Level',
        [
          t('label', 'Nama level', { placeholder: 'mis. Pemula', maxLength: 24 }),
          t('value', 'Jumlah', {
            placeholder: 'mis. 540',
            maxLength: 8,
            help: 'Angka saja. Panjang baris titik dihitung relatif terhadap angka terbesar.',
          }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'advantages',
    label: 'Angka klub',
    description: 'Baris angka terpusat di bawah kartu Tentang.',
    toggleable: true,
    fields: [
      sectionTitle('mis. Lintang dalam angka', 100),
      listField(
        'stats',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 1.150+', maxLength: 12 }),
          t('label', 'Keterangan', { placeholder: 'mis. Member aktif', maxLength: 40 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'services',
    label: 'Program',
    description: 'Teks di kiri dan rel kartu foto yang bisa digeser di kanan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Program'),
      sectionTitle('mis. Program latihan, sewa lapangan, dan liga untuk semua level.'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Konsultasi Program', maxLength: 30, help: 'Kosongkan untuk menyembunyikan tombol.' }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Daftar program',
        'Program',
        [
          t('title', 'Nama program', { placeholder: 'mis. Kelas Pemula', maxLength: 60 }),
          t('tag', 'Label kaca di foto', { placeholder: 'mis. Kelas grup', maxLength: 30 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 200 }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px. Tanpa foto, kartu tampil polos gelap.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'pricing',
    label: 'Paket membership',
    description: 'Pita abu membulat berisi paket unggulan berwarna aksen dan paket lainnya.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Membership'),
      sectionTitle('mis. Pilih paket yang pas dengan ritme main Anda'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan kecil', { placeholder: 'mis. Harga per bulan, belum termasuk sewa raket.', maxLength: 160 }),
      listField(
        'items',
        'Daftar paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Pro', maxLength: 40 }),
          t('price', 'Harga', { placeholder: 'mis. Rp850.000', maxLength: 20 }),
          t('period', 'Periode', { placeholder: 'mis. /bulan', maxLength: 20 }),
          t('badge', 'Label sorotan', {
            placeholder: 'mis. Paling diminati',
            maxLength: 30,
            help: 'Paket pertama yang berlabel tampil besar berwarna aksen. Tanpa label, paket pertama yang disorot.',
          }),
          ta('description', 'Deskripsi', { placeholder: 'Untuk siapa paket ini.', maxLength: 160 }),
          ta('features', 'Benefit', { placeholder: 'Satu benefit per baris, mis.\n8 kelas grup\n4 jam sewa lapangan', maxLength: 400 }),
          t('button_label', 'Teks tombol', { placeholder: 'mis. Pilih Paket Pro', maxLength: 30 }),
          url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp dengan nama paket.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'team',
    label: 'Pelatih',
    description: 'Kartu potret pelatih. Tiga foto pertama juga tampil sebagai avatar di banner.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Pelatih'),
      sectionTitle('mis. Belajar dari pelatih yang sabar dan berpengalaman'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar pelatih',
        'Pelatih',
        [
          t('name', 'Nama', { placeholder: 'mis. Dimas Prakoso', maxLength: 60 }),
          t('role', 'Peran', { placeholder: 'mis. Kepala Pelatih Padel', maxLength: 60 }),
          img('photo', 'Foto', 'Foto tegak 4:5 dengan wajah di sepertiga atas, disarankan 960×1200 px.'),
          ta('description', 'Deskripsi singkat', { placeholder: 'Pengalaman atau keahlian, 1–2 kalimat.', maxLength: 160 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'events',
    label: 'Acara & turnamen',
    description: 'Daftar jadwal acara bergaris dengan tanggal besar.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Acara'),
      sectionTitle('mis. Jadwal turnamen dan acara klub'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar acara',
        'Acara',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 14 Des 2026', maxLength: 30, help: 'Angka di depan tampil besar.' }),
          t('title', 'Nama acara', { placeholder: 'mis. Liga Padel Antar-Member', maxLength: 80 }),
          t('location', 'Lokasi / waktu', { placeholder: 'mis. Lapangan 1–4, pukul 07.00', maxLength: 80 }),
          t('tag', 'Label', { placeholder: 'mis. Turnamen', maxLength: 30 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3. Kosongkan untuk menyembunyikan.'),
          url('url', 'Tautan pendaftaran', { help: 'Kosongkan untuk mendaftar lewat WhatsApp.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    toggleable: true,
    fields: [
      sectionLabel('mis. Galeri'),
      sectionTitle('mis. Suasana di klub'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Foto',
        'Foto',
        [img('image', 'Foto', 'Disarankan 1600×1067 px. Foto pertama tampil paling besar.'), t('caption', 'Keterangan', { placeholder: 'mis. Final liga internal', maxLength: 80 })],
        12,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni member',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kata member'),
      sectionTitle('mis. Mereka berkembang bersama kami'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Rizky Pratama', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Member sejak 2022', maxLength: 80 }),
          ta('quote', 'Testimoni', { placeholder: 'Tulis kesan member...', maxLength: 400 }),
          img('photo', 'Foto (opsional)', 'Foto persegi. Kosongkan untuk memakai inisial.'),
        ],
        9,
      ),
    ],
  },
  {
    key: 'clients',
    label: 'Mitra & sponsor',
    description: 'Strip logo mitra dan sponsor yang bergerak pelan.',
    toggleable: true,
    fields: [
      t('title', 'Judul kecil', { placeholder: 'mis. Didukung mitra dan sponsor klub', maxLength: 90 }),
      listField(
        'items',
        'Daftar logo',
        'Logo',
        [
          t('name', 'Nama mitra', {
            placeholder: 'mis. Toko Raket Jaya',
            maxLength: 60,
            help: 'Dipakai sebagai teks alternatif logo, atau ditampilkan sebagai teks bila logo kosong.',
          }),
          img('logo', 'Logo', 'PNG/SVG berlatar transparan, sebaiknya versi mendatar. Kosongkan untuk menampilkan nama saja.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Blok ajakan membulat dengan foto lapangan malam.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Siap turun ke lapangan?', maxLength: 100 }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Pesan Sekarang', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      img('image', 'Foto latar (opsional)', 'Foto diberi lapisan gelap agar teks terbaca. Kosongkan untuk latar navy polos.'),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & lokasi',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kontak'),
      sectionTitle('mis. Kunjungi klub kami'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@klub.id', maxLength: 120 },
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (021) 555-0123', maxLength: 30 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk tombol pesan lapangan, paket, dan acara di seluruh halaman.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin pesan lapangan.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari, 06.00–23.00 WIB', maxLength: 80, help: 'Juga tampil di kartu gelap bagian Tentang.' }),
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
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang klub.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Klub. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama klub.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...', help: 'Tautan sosial juga tampil di kanan bawah banner (desktop).' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
