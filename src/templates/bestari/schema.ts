// Skema CMS Bestari. Urutan section = urutan halaman: hero slider → kartu sorotan → lencana → profil → angka →
// sambutan kepala sekolah → alasan memilih → program → prestasi → guru → PPDB → berita → pengumuman → agenda →
// testimoni → galeri → tanya jawab → lokasi & kontak → footer. Kunci company profile (brand, hero, about, testimonials,
// gallery, faq, contact, footer) sama artinya dengan template lain; section sekolah memakai kunci yang sama dengan
// Madani/Cakrawala (news, announcements, agenda, ppdb, achievements) dan BENTUK DATA berita/pengumuman yang sama,
// agar integrasi CRUD berita bisa dipasang dengan cara yang sama. Setiap section bisa disembunyikan. Template baru
// belum punya konten tersimpan, jadi tanpa `introduced`.
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

/**
 * Label kecil di atas judul. `menu` = bagian yang punya item menu (label singkat menggantikan nama menu); `number` =
 * tampil dengan nomor urut "(01)"; `plain` = tanpa nomor (pengumuman & agenda).
 */
const EYEBROW_HELP = {
  menu: 'Tampil dengan nomor urut bagian, mis. "Profil sekolah (01)". Label singkat (≤ 12 huruf, ≤ 2 kata) juga dipakai sebagai nama di menu atas.',
  number: 'Tampil dengan nomor urut bagian, mis. "Prestasi (06)". Kosongkan untuk menyembunyikan.',
  plain: 'Tampil di atas judul kartu. Kosongkan untuk menyembunyikan.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'number') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const highlight = (placeholder: string) =>
  t('highlight', 'Bagian judul yang dicetak miring berwarna', { placeholder, maxLength: 50, help: 'Tulis persis seperti di judul, atau kosongkan.' });
const subtitle = (placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const DATE_HELP = 'Tulis YYYY-MM-DD (mis. 2026-11-07) agar tampil sebagai "7 Nov 2026", atau teks bebas.';
const WA_HELP = 'Kosongkan untuk membuka WhatsApp sekolah (nomor di bagian Lokasi & kontak).';
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #ppdb, #program, #agenda, atau #kontak.';

export const bestariSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna tema',
    description: 'Nama sekolah, logo, dan warna tema. Satu warna mengatur tombol, ikon, label, kartu sorotan, dan nuansa footer.',
    fields: [
      t('company_name', 'Nama sekolah', { placeholder: 'mis. SD Bestari Cendekia', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Sekolah Dasar Swasta di Yogyakarta',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama sekolah: sebut jenjang dan kotanya.',
      }),
      img('logo', 'Logo sekolah', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol Bestari bawaan dan nama sekolah.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Klik pilihan cepat (mis. hijau #047857), tombol "Pakai bawaan" untuk terakota bawaan #C2410C, atau tulis kode hex sendiri. Versi gelap untuk footer dan versi terang untuk teks di latar gelap dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (slider foto)',
    description:
      'Foto besar selebar layar yang berganti otomatis (berhenti saat disorot atau difokus), menu pil putih di atasnya, bilah info kontak & pengumuman paling atas, judul, dua tombol, dan tiga angka singkat.',
    toggleable: true,
    fields: [
      t('topbar_text', 'Pengumuman di bilah paling atas', {
        placeholder: 'mis. PPDB 2027/2028 dibuka 3 November 2026',
        maxLength: 80,
        help: 'Tampil di kanan bilah atas, di samping email & telepon dari bagian Lokasi & kontak. Kosongkan untuk menyembunyikan.',
      }),
      t('topbar_label', 'Teks tautan pengumuman', { placeholder: 'mis. Daftar', maxLength: 20 }),
      url('topbar_url', 'Tautan pengumuman', { help: 'Kosongkan untuk menuju bagian PPDB.' }),
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Sekolah dasar swasta · Yogyakarta', maxLength: 50 }),
      t('title', 'Judul utama (slide 1)', { placeholder: 'mis. Tempat anak tumbuh percaya diri dan senang belajar', maxLength: 80, help: 'Paling bagus 2–3 baris (± 35–55 karakter).' }),
      highlight('mis. senang belajar'),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan sekolah Anda dalam 1–2 kalimat.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 150–200 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Daftar PPDB', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian PPDB.' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Kenali sekolah', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Profil.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Daftar PPDB', maxLength: 22, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian PPDB.' }),
      img('image', 'Foto slide 1', 'Foto mendatar 16:9, disarankan 1920×1080 px. Lapisan gelap tipis ditambahkan otomatis agar teks terbaca.'),
      listField(
        'slides',
        'Slide tambahan',
        'Slide',
        [
          img('image', 'Foto', 'Wajib; slide tanpa foto tidak tampil. Mendatar 16:9, 1920×1080 px.'),
          t('eyebrow', 'Label kecil', { placeholder: 'Kosongkan untuk memakai label slide 1', maxLength: 50 }),
          t('title', 'Judul', { placeholder: 'Kosongkan untuk memakai judul slide 1', maxLength: 80 }),
          t('highlight', 'Bagian judul yang dicetak miring', { maxLength: 50 }),
          ta('subtitle', 'Deskripsi', { maxLength: 200 }),
        ],
        3,
      ),
      listField(
        'stats',
        'Angka singkat di hero',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 640+', maxLength: 10 }), t('label', 'Keterangan', { placeholder: 'mis. Murid aktif', maxLength: 28 })],
        3,
      ),
    ],
  },
  {
    key: 'highlights',
    label: 'Kartu sorotan',
    description:
      'Tiga kartu yang menumpang di tepi bawah hero; kartu tengah berwarna tema. Ikon dan tujuan klik dipilih otomatis dari judul (pendaftaran, program, open house, guru, dll.).',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. Informasi singkat', maxLength: 40, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      listField(
        'items',
        'Kartu',
        'Kartu',
        [
          t('label', 'Label pil', { placeholder: 'mis. PPDB 2027/2028', maxLength: 24 }),
          t('title', 'Judul', { placeholder: 'mis. Pendaftaran murid baru', maxLength: 36 }),
          ta('text', 'Teks', { placeholder: 'Jelaskan dalam 1 kalimat.', maxLength: 120 }),
          t('link_label', 'Teks tautan', { placeholder: 'mis. Mulai daftar', maxLength: 24 }),
          url('url', 'Tautan', { help: `Kosongkan untuk tujuan otomatis dari judul. ${SECTION_LINK_HELP}` }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'badges',
    label: 'Lencana kepercayaan',
    description: 'Deret singkat bergaris tipis di bawah hero (akreditasi, sekolah Adiwiyata, ramah anak, dll.). Ikon dipilih otomatis dari teks.',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. Pengakuan sekolah', maxLength: 40, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      listField('items', 'Lencana', 'Lencana', [t('text', 'Teks', { placeholder: 'mis. Terakreditasi A', maxLength: 32 })], 6),
    ],
  },
  {
    key: 'about',
    label: 'Profil, visi & misi',
    description:
      'Judul paragraf besar dua warna, kolase dua foto dengan kartu angka, profil singkat dengan poin centang, dan daftar buka-tutup "+" (mis. visi, misi, kurikulum).',
    toggleable: true,
    fields: [
      eyebrow('mis. Profil sekolah', 'menu'),
      ta('title', 'Judul (bagian gelap)', { placeholder: 'Kalimat utama tentang sekolah Anda.', maxLength: 140 }),
      ta('title_muted', 'Judul lanjutan (bagian abu-abu)', { placeholder: 'Kalimat penjelas yang tampil lebih pudar.', maxLength: 200 }),
      ta('body', 'Profil singkat', { placeholder: 'Sejarah singkat, yayasan, dan keunggulan sekolah.', maxLength: 600 }),
      img('image', 'Foto utama', 'Foto tegak 4:5, disarankan 960×1200 px.'),
      img('image_small', 'Foto kecil', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      t('badge_value', 'Kartu di foto: angka', { placeholder: 'mis. 2008', maxLength: 10 }),
      t('badge_label', 'Kartu di foto: keterangan', { placeholder: 'mis. Berdiri sejak', maxLength: 30 }),
      listField('points', 'Poin keunggulan', 'Poin', [t('text', 'Poin', { placeholder: 'mis. Terakreditasi A', maxLength: 70 })], 6),
      listField(
        'pillars',
        'Daftar buka-tutup',
        'Butir',
        [
          t('title', 'Judul', { placeholder: 'mis. Visi', maxLength: 40 }),
          t('text', 'Ringkasan (selalu tampil)', { placeholder: 'Satu kalimat.', maxLength: 140 }),
          ta('detail', 'Isi saat dibuka (opsional)', { placeholder: 'Pisahkan baris dengan Enter; tiap baris jadi satu butir.', maxLength: 600 }),
        ],
        5,
      ),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Jadwalkan kunjungan', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
    ],
  },
  {
    key: 'stats',
    label: 'Angka sekolah',
    description: 'Empat kartu angka besar berikon (kartu kedua berwarna tema). Angka berjalan saat pertama terlihat.',
    toggleable: true,
    fields: [
      eyebrow('mis. Dalam angka'),
      title('mis. Sekolah kecil yang dekat dengan setiap anak', 90),
      subtitle(),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 28', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Murid per kelas', maxLength: 30, help: 'Ikon dipilih otomatis dari keterangan.' }),
          ta('text', 'Penjelasan singkat', { maxLength: 90 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'welcome',
    label: 'Sambutan kepala sekolah',
    toggleable: true,
    fields: [
      eyebrow('mis. Sambutan'),
      title('mis. Selamat datang di SD Bestari Cendekia'),
      ta('quote', 'Kutipan', { placeholder: 'Satu kalimat pesan utama kepala sekolah.', maxLength: 220 }),
      ta('body', 'Isi sambutan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      t('name', 'Nama kepala sekolah', { placeholder: 'mis. Dra. Siti Rahmawati, M.Pd.', maxLength: 60 }),
      t('role', 'Jabatan', { placeholder: 'mis. Kepala SD Bestari Cendekia', maxLength: 60 }),
      img('photo', 'Foto kepala sekolah', 'Foto tegak 4:5, disarankan 960×1200 px.'),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Kenali guru kami', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: `Kosongkan untuk menuju bagian Guru. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'why',
    label: 'Alasan memilih sekolah',
    description: 'Daftar bernomor yang bisa dibuka satu per satu, foto dengan kartu angka, dan kutipan seorang guru.',
    toggleable: true,
    fields: [
      eyebrow('mis. Mengapa Bestari'),
      title('mis. Sekolah yang menyesuaikan diri dengan anak, bukan sebaliknya'),
      highlight('mis. dengan anak'),
      subtitle(),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px.'),
      t('image_value', 'Kartu di foto: angka', { placeholder: 'mis. 1 : 14', maxLength: 12 }),
      t('image_label', 'Kartu di foto: keterangan', { placeholder: 'mis. Rasio guru dan murid', maxLength: 40 }),
      listField(
        'items',
        'Alasan',
        'Alasan',
        [t('title', 'Judul', { placeholder: 'mis. Kelas kecil, perhatian besar', maxLength: 60 }), ta('text', 'Penjelasan', { maxLength: 260 })],
        5,
      ),
      ta('quote', 'Kutipan guru', { placeholder: 'Satu-dua kalimat dari guru atau konselor.', maxLength: 240 }),
      t('quote_name', 'Nama pemberi kutipan', { maxLength: 60 }),
      t('quote_role', 'Jabatan pemberi kutipan', { maxLength: 60 }),
      img('quote_photo', 'Foto pemberi kutipan', 'Foto tegak atau persegi; tampil kecil.'),
    ],
  },
  {
    key: 'programs',
    label: 'Program unggulan',
    description: 'Kartu foto dengan ikon bulat otomatis, label pil, nama program, dan deskripsi. Tombol panah membuka WhatsApp dengan nama program.',
    toggleable: true,
    fields: [
      eyebrow('mis. Program', 'menu'),
      title('mis. Belajar lewat buku, percobaan, dan panggung'),
      highlight('mis. panggung'),
      subtitle(),
      listField(
        'items',
        'Program',
        'Program',
        [
          t('name', 'Nama program', { placeholder: 'mis. Literasi & kelas bilingual', maxLength: 50, help: 'Ikon dipilih otomatis dari nama.' }),
          t('label', 'Label pil', { placeholder: 'mis. Kelas 1–6', maxLength: 24 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 180 }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'achievements',
    label: 'Prestasi',
    toggleable: true,
    fields: [
      eyebrow('mis. Prestasi'),
      title('mis. Prestasi murid tahun ini'),
      subtitle(),
      listField(
        'items',
        'Daftar prestasi',
        'Prestasi',
        [
          t('title', 'Peringkat / medali', { placeholder: 'mis. Juara 1', maxLength: 30 }),
          t('event', 'Lomba', { placeholder: 'mis. Lomba baca puisi tingkat kota', maxLength: 90 }),
          t('level', 'Tingkat', { placeholder: 'mis. Kota', maxLength: 20 }),
          t('year', 'Tahun', { placeholder: 'mis. 2026', maxLength: 10 }),
          t('name', 'Nama murid / tim', { placeholder: 'mis. Raka Aditya, kelas 5', maxLength: 60 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'teachers',
    label: 'Guru & tenaga pendidik',
    description: 'Panel dengan judul di kiri dan kartu foto guru (nama + jabatan) di kanan; di HP kartu bisa digeser.',
    toggleable: true,
    fields: [
      eyebrow('mis. Guru kami', 'menu'),
      title('mis. Guru yang mengenal setiap anak'),
      highlight('mis. setiap anak'),
      subtitle(),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Tanya wali kelas', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Guru',
        'Guru',
        [
          t('name', 'Nama', { placeholder: 'mis. Dewi Lestari, S.Pd.', maxLength: 60 }),
          t('role', 'Jabatan / mata pelajaran', { placeholder: 'mis. Wali kelas 1', maxLength: 60 }),
          img('photo', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'ppdb',
    label: 'PPDB (penerimaan murid baru)',
    description:
      'Fakta singkat, tab Jalur · Jadwal · Syarat · Alur · Biaya, dan formulir singkat (tanggal lahir → usia per tanggal acuan) yang menyusun pesan WhatsApp untuk panitia, tanpa penyimpanan data dan tanpa pembayaran online.',
    toggleable: true,
    fields: [
      eyebrow('mis. PPDB 2027/2028'),
      title('mis. Penerimaan murid baru tahun ajaran 2027/2028'),
      subtitle(),
      img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'facts',
        'Fakta singkat',
        'Fakta',
        [t('label', 'Label', { placeholder: 'mis. Gelombang 1', maxLength: 24 }), t('value', 'Isi', { placeholder: 'mis. 3 Nov 2026 – 30 Jan 2027', maxLength: 40 })],
        4,
      ),
      listField(
        'paths',
        'Jalur pendaftaran',
        'Jalur',
        [
          t('name', 'Nama jalur', { placeholder: 'mis. Jalur reguler', maxLength: 40 }),
          t('quota', 'Kuota', { placeholder: 'mis. 70% kuota', maxLength: 30 }),
          ta('text', 'Keterangan', { maxLength: 200 }),
        ],
        6,
      ),
      listField(
        'schedule',
        'Jadwal (linimasa)',
        'Jadwal',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 6 Feb 2027', maxLength: 40, help: DATE_HELP }),
          t('title', 'Kegiatan', { placeholder: 'mis. Observasi kesiapan sekolah', maxLength: 50 }),
          ta('text', 'Keterangan', { maxLength: 140 }),
        ],
        8,
      ),
      listField('requirements', 'Syarat pendaftaran', 'Syarat', [t('text', 'Syarat', { maxLength: 120 })], 10),
      listField(
        'steps',
        'Alur pendaftaran',
        'Langkah',
        [t('title', 'Langkah', { placeholder: 'mis. Isi formulir', maxLength: 40 }), ta('text', 'Keterangan', { maxLength: 140 })],
        6,
      ),
      listField(
        'fees',
        'Rincian biaya (opsional)',
        'Biaya',
        [
          t('item', 'Komponen', { placeholder: 'mis. Uang pangkal', maxLength: 50 }),
          t('amount', 'Nominal', { placeholder: 'mis. Rp6.000.000', maxLength: 30 }),
          t('note', 'Catatan', { placeholder: 'mis. Bisa dicicil', maxLength: 50 }),
        ],
        8,
      ),
      ta('fees_note', 'Catatan biaya', { maxLength: 200 }),
      listField('grades', 'Pilihan kelas di formulir', 'Pilihan', [t('name', 'Pilihan', { placeholder: 'mis. Kelas 1 bilingual', maxLength: 40 })], 6),
      t('age_reference', 'Tanggal acuan usia', {
        placeholder: 'mis. 2027-07-01',
        maxLength: 10,
        help: 'Tulis YYYY-MM-DD. Formulir menghitung usia calon murid pada tanggal ini dan menuliskannya di pesan. Kosongkan untuk memakai tanggal hari ini.',
      }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Formulir pendaftaran singkat', maxLength: 50 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 200 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Kirim lewat WhatsApp', maxLength: 30 }),
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp panitia PPDB',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Kosongkan untuk memakai WhatsApp sekolah. Tanpa nomor, formulir diganti tombol ke Kontak.',
      },
      t('brochure_label', 'Teks tautan brosur (opsional)', { placeholder: 'mis. Unduh brosur PPDB', maxLength: 30 }),
      url('brochure_url', 'Tautan brosur', { help: 'Mis. file PDF di Google Drive.' }),
    ],
  },
  {
    key: 'news',
    label: 'Berita',
    description: 'Kartu berita berfoto dengan tanggal dan kategori; tombol kategori menyaring berita. "Baca selengkapnya" membuka isi berita di kartu.',
    toggleable: true,
    fields: [
      eyebrow('mis. Berita sekolah', 'menu'),
      title('mis. Kabar terbaru dari sekolah'),
      subtitle(),
      t('all_label', 'Teks tombol semua kategori', { placeholder: 'mis. Semua', maxLength: 16 }),
      t('button_label', 'Teks tombol di bawah', { placeholder: 'mis. Berita lainnya di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol di bawah', { help: 'Mis. Instagram atau blog sekolah. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('title', 'Judul', { maxLength: 110 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-14', maxLength: 30, help: DATE_HELP }),
          t('category', 'Kategori', { placeholder: 'mis. Prestasi', maxLength: 20, help: 'Kategori yang sama dikelompokkan di tombol filter.' }),
          ta('excerpt', 'Ringkasan', { maxLength: 200 }),
          ta('body', 'Isi lengkap (opsional)', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 1500 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
          url('url', 'Tautan berita (opsional)', { help: 'Mis. unggahan Instagram. Diisi → "Baca selengkapnya" membuka tautan ini.' }),
        ],
        9,
      ),
    ],
  },
  {
    key: 'announcements',
    label: 'Pengumuman',
    description: 'Daftar pengumuman bertanggal; label seperti "Penting" atau "Wajib" ditonjolkan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pengumuman', 'plain'),
      title('mis. Pengumuman untuk orang tua', 80),
      listField(
        'items',
        'Pengumuman',
        'Pengumuman',
        [
          t('title', 'Judul', { maxLength: 100 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-11-23', maxLength: 30, help: DATE_HELP }),
          ta('text', 'Isi singkat', { maxLength: 240 }),
          t('badge', 'Label (opsional)', { placeholder: 'mis. Penting', maxLength: 16 }),
          url('url', 'Tautan lampiran (opsional)', { help: 'Mis. surat edaran PDF.' }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'agenda',
    label: 'Agenda kegiatan',
    toggleable: true,
    fields: [
      eyebrow('mis. Agenda', 'plain'),
      title('mis. Kegiatan dalam waktu dekat', 80),
      listField(
        'items',
        'Agenda',
        'Agenda',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 2026-11-07', maxLength: 30, help: DATE_HELP }),
          t('title', 'Kegiatan', { maxLength: 90 }),
          t('time', 'Waktu', { placeholder: 'mis. 08.00–11.00 WIB', maxLength: 30 }),
          t('place', 'Tempat', { placeholder: 'mis. Aula sekolah', maxLength: 40 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni orang tua & alumni',
    description: 'Angka sorotan dan kartu kutipan berfoto; kutipan pertama tampil lebih besar.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kata mereka'),
      title('mis. Cerita dari orang tua dan alumni'),
      subtitle(),
      t('stat_value', 'Angka sorotan', { placeholder: 'mis. 1.800+', maxLength: 10 }),
      t('stat_label', 'Keterangan angka', { placeholder: 'mis. alumni sejak 2008', maxLength: 90 }),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Orang tua murid kelas 3', maxLength: 60 }),
          ta('quote', 'Kutipan', { maxLength: 300 }),
          img('photo', 'Foto', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk inisial.'),
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
      eyebrow('mis. Galeri'),
      title('mis. Sehari-hari di sekolah', 80),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Galeri lengkap di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Foto',
        'Foto',
        [img('image', 'Foto', 'Foto pertama tampil paling besar (mendatar 3:2); foto lain dipotong persegi.'), t('caption', 'Keterangan', { maxLength: 80 })],
        8,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya jawab'),
      title('mis. Pertanyaan yang sering diajukan orang tua'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih ada pertanyaan?', maxLength: 50 }),
      ta('help_text', 'Kartu bantuan: teks', { maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya panitia PPDB', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', {
        help: 'Kosongkan untuk membuka WhatsApp panitia PPDB (atau WhatsApp sekolah bila nomor panitia kosong).',
      }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 500 })],
        10,
      ),
    ],
  },
  {
    key: 'contact',
    label: 'Lokasi & kontak',
    description:
      'Peta Google Maps (dimuat saat digulir), alamat, telepon, email, WhatsApp, jam layanan, dan media sosial (dari bagian Footer). Email & telepon juga tampil di bilah paling atas.',
    toggleable: true,
    fields: [
      eyebrow('mis. Lokasi & kontak', 'menu'),
      title('mis. Mampir ke sekolah kami'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. SD Bestari Cendekia Yogyakarta',
        maxLength: 120,
        help: 'Nama sekolah + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk tombol "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0274) 555-0182', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'info@sekolah.sch.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp sekolah',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tanya program, tanya jawab, dan formulir PPDB (bila nomor panitia kosong).',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang sekolah.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat 07.00–15.00 WIB', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita gelap selebar layar: ajakan besar, logo, deskripsi, menu, program, kontak singkat, dan media sosial.',
    toggleable: true,
    fields: [
      t('cta_title', 'Ajakan: judul', { placeholder: 'mis. Kenali sekolah kami lebih dekat', maxLength: 60, help: 'Kosongkan untuk menyembunyikan ajakan.' }),
      ta('cta_text', 'Ajakan: teks', { maxLength: 180 }),
      t('cta_label', 'Ajakan: teks tombol', { placeholder: 'mis. Daftar PPDB', maxLength: 28 }),
      url('cta_url', 'Ajakan: tautan tombol', { help: 'Kosongkan untuk menuju bagian PPDB.' }),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang sekolah Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Sekolah. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama sekolah.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
