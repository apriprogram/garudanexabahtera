// Skema CMS Jumantara. Urutan section = urutan halaman: hero slider (+ bilah utilitas & angka sekolah) → layanan
// cepat → sambutan kepala sekolah → profil, visi & misi → akademik (kelompok mapel pilihan) → berita → pengumuman →
// agenda → prestasi → ekstrakurikuler → fasilitas → guru → SPMB/PPDB → alumni → galeri → tanya jawab → lokasi &
// kontak → footer. Kunci company profile (brand, hero, services, about, testimonials, gallery, faq, contact, footer)
// sama artinya dengan template lain; section sekolah memakai kunci & BENTUK DATA berita/pengumuman/agenda yang sama
// dengan Bestari, Madani, dan Cakrawala, agar fitur Berita & Pengumuman (site_posts) terpasang dengan cara yang sama.
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

/** Label kecil di atas judul. `menu` = bagian yang punya item menu (label singkat menggantikan nama menu). */
const EYEBROW_HELP = {
  menu: 'Tampil di atas judul dengan garis kecil warna tema. Label singkat (≤ 12 huruf, ≤ 2 kata) juga dipakai sebagai nama di menu atas.',
  plain: 'Tampil di atas judul dengan garis kecil warna tema. Kosongkan untuk menyembunyikan.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'plain') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const DATE_HELP = 'Tulis YYYY-MM-DD (mis. 2026-11-25) agar tampil sebagai "25 Nov 2026" lengkap dengan nama hari, atau teks bebas.';
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #spmb, #akademik, #agenda, atau #kontak.';
const PORTRAIT_HELP = 'Foto tegak 4:5, disarankan 960×1200 px.';

export const jumantaraSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna tema',
    description: 'Nama sekolah, logo, dan warna tema. Satu warna mengatur tombol, ubin tanggal, label, dan nuansa pita gelap (bilah atas, SPMB, footer).',
    fields: [
      t('company_name', 'Nama sekolah', { placeholder: 'mis. SMA Negeri 1 Purbolinggo', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Sekolah negeri di Lampung Timur',
        maxLength: 90,
        help: 'Tampil di bawah nama sekolah dan di judul tab browser (judul di Google) setelah nama sekolah; nama + tagline sebaiknya ≤ 60 huruf.',
      }),
      img('logo', 'Logo sekolah', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol Jumantara bawaan dan nama sekolah.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Klik pilihan cepat, tombol "Pakai bawaan" untuk biru kobalt bawaan #2F5BEA, atau tulis kode hex sendiri. Versi gelap untuk bilah atas, SPMB, dan footer serta versi terang untuk teks di latar gelap dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero: slider foto & angka sekolah',
    description:
      'Bilah tipis paling atas (telepon, email, dan jam layanan dari bagian Lokasi & kontak + tautan cepat), lalu foto besar selebar layar yang berganti otomatis dengan bilah progres per slide dan tombol jeda (berhenti saat disorot atau difokus, dan sendiri setelah dua putaran), judul, dua tombol, dan pita empat angka sekolah di tepi bawah foto.',
    toggleable: true,
    fields: [
      listField(
        'topbar_links',
        'Tautan cepat di bilah paling atas',
        'Tautan',
        [
          t('label', 'Teks', { placeholder: 'mis. PPID', maxLength: 20 }),
          url('url', 'Tautan', { help: 'Mis. laman PPID atau E-Learning sekolah. Kosongkan untuk menuju bagian Layanan.' }),
        ],
        3,
      ),
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. SMA Negeri · Lampung Timur', maxLength: 50 }),
      t('slide_label', 'Nama slide 1 di bilah progres', { placeholder: 'mis. Profil', maxLength: 24 }),
      t('title', 'Judul utama (slide 1)', { placeholder: 'mis. Belajar bermakna, tumbuh berkarakter', maxLength: 80, help: 'Paling bagus 2–3 baris (± 30–50 karakter).' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan sekolah Anda dalam 1–2 kalimat.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 120–160 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Informasi SPMB', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian SPMB.' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Profil sekolah', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Profil.' }),
      t('header_label', 'Tombol SPMB/PPDB di menu atas', { placeholder: 'mis. Info SPMB', maxLength: 22, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian SPMB/PPDB.' }),
      img('image', 'Foto slide 1', 'Foto mendatar 16:9, disarankan 1920×1080 px. Lapisan gelap ditambahkan otomatis di sisi kiri agar teks terbaca.'),
      listField(
        'slides',
        'Slide tambahan',
        'Slide',
        [
          img('image', 'Foto', 'Wajib; slide tanpa foto tidak tampil. Mendatar 16:9, 1920×1080 px.'),
          t('label', 'Nama slide di bilah progres', { placeholder: 'mis. Pembelajaran', maxLength: 24 }),
          t('eyebrow', 'Label kecil', { placeholder: 'Kosongkan untuk memakai label slide 1', maxLength: 50 }),
          t('title', 'Judul', { placeholder: 'Kosongkan untuk memakai judul slide 1', maxLength: 80 }),
          ta('subtitle', 'Deskripsi', { maxLength: 200 }),
        ],
        3,
      ),
      listField(
        'stats',
        'Angka sekolah di bawah foto',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 1.048', maxLength: 10 }), t('label', 'Keterangan', { placeholder: 'mis. Peserta didik', maxLength: 28 })],
        4,
      ),
      t('stats_note', 'Catatan angka', { placeholder: 'mis. Data Tahun Ajaran 2026/2027', maxLength: 80, help: 'Sebut periode datanya. Kosongkan untuk menyembunyikan.' }),
    ],
  },
  {
    key: 'services',
    label: 'Layanan & tautan cepat',
    description: 'Deret ubin bergaris tipis di bawah hero (E-Learning, Perpustakaan Digital, PPID, Legalisir, Tracer Study, Pengaduan). Ikon dipilih otomatis dari nama layanan.',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. Layanan sekolah', maxLength: 40, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      ta('pending_note', 'Teks bila tautan ubin kosong', {
        placeholder: 'mis. Tautan layanan ini sedang disiapkan. Hubungi tata usaha lewat bagian Kontak.',
        maxLength: 160,
        help: 'Tampil saat ubin tanpa tautan diklik. Kosongkan agar ubin tanpa tautan tidak bisa diklik.',
      }),
      listField(
        'items',
        'Layanan',
        'Layanan',
        [
          t('label', 'Nama layanan', { placeholder: 'mis. E-Learning', maxLength: 28, help: 'Ikon dipilih otomatis dari nama.' }),
          t('text', 'Keterangan singkat', { placeholder: 'mis. Materi dan tugas kelas', maxLength: 60 }),
          url('url', 'Tautan', { help: `Mis. alamat e-learning atau laman PPID sekolah. ${SECTION_LINK_HELP}` }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'welcome',
    label: 'Sambutan kepala sekolah',
    toggleable: true,
    fields: [
      eyebrow('mis. Sambutan'),
      title('mis. Selamat datang di SMA Negeri 1 Purbolinggo'),
      ta('quote', 'Kutipan', { placeholder: 'Satu kalimat pesan utama kepala sekolah.', maxLength: 220 }),
      ta('body', 'Isi sambutan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      t('name', 'Nama kepala sekolah', { placeholder: 'mis. Drs. Ahmad Fauzan Hakim, M.Pd.', maxLength: 60 }),
      t('role', 'Jabatan', { placeholder: 'mis. Kepala SMA Negeri 1 Purbolinggo', maxLength: 60 }),
      img('photo', 'Foto kepala sekolah', `${PORTRAIT_HELP} Kosongkan untuk menyembunyikan.`),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Baca profil sekolah', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: `Kosongkan untuk menuju bagian Profil. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'about',
    label: 'Profil, visi & misi',
    description: 'Foto, judul, profil singkat, fakta singkat (status, jenjang, lokasi), lalu kartu bertab, misalnya Visi, Misi, dan Profil lulusan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Profil', 'menu'),
      ta('title', 'Judul', { placeholder: 'Kalimat utama tentang sekolah Anda.', maxLength: 140 }),
      ta('body', 'Profil singkat', { placeholder: 'Gambaran sekolah dan lingkungannya.', maxLength: 600 }),
      img('image', 'Foto', `${PORTRAIT_HELP} Kosongkan untuk menyembunyikan.`),
      listField(
        'facts',
        'Fakta singkat',
        'Fakta',
        [t('label', 'Label', { placeholder: 'mis. Status', maxLength: 24 }), t('value', 'Isi', { placeholder: 'mis. Sekolah negeri', maxLength: 50 })],
        4,
      ),
      listField(
        'tabs',
        'Tab (visi, misi, dll.)',
        'Tab',
        [
          t('title', 'Nama tab', { placeholder: 'mis. Misi', maxLength: 24 }),
          ta('text', 'Paragraf', { maxLength: 300 }),
          ta('points', 'Butir (opsional)', {
            placeholder: 'Satu butir per baris.',
            maxLength: 800,
            help: 'Satu butir per baris; butir pendek (≤ 32 huruf) tampil sebagai chip, butir panjang sebagai daftar bernomor.',
          }),
        ],
        4,
      ),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Lihat fasilitas sekolah', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: `Kosongkan untuk menuju bagian Fasilitas. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'programs',
    label: 'Akademik: mapel pilihan',
    description: 'Kartu kelompok mata pelajaran pilihan dengan ikon otomatis, label, deskripsi, dan daftar mapel. Kartu keempat tampil melebar (mis. kokurikuler).',
    toggleable: true,
    fields: [
      eyebrow('mis. Akademik', 'menu'),
      title('mis. Kelompok mata pelajaran pilihan'),
      subtitle(),
      listField(
        'items',
        'Kelompok',
        'Kelompok',
        [
          t('name', 'Nama kelompok', { placeholder: 'mis. Sains & Teknologi', maxLength: 50, help: 'Ikon dipilih otomatis dari nama.' }),
          t('label', 'Label', { placeholder: 'mis. Kelas XI–XII', maxLength: 24 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 180 }),
          ta('subjects', 'Mata pelajaran (opsional)', { placeholder: 'Satu mapel per baris.', maxLength: 300 }),
        ],
        4,
      ),
      ta('note', 'Catatan di bawah kartu', { maxLength: 200 }),
    ],
  },
  {
    key: 'news',
    label: 'Berita',
    description: 'Berita utama berfoto besar dan daftar berita lainnya dengan tanggal dan kategori. "Baca selengkapnya" membuka isi berita di tempat atau tautan berita.',
    toggleable: true,
    fields: [
      eyebrow('mis. Berita', 'menu'),
      title('mis. Kabar terbaru dari sekolah'),
      subtitle(),
      t('read_label', 'Teks tombol baca', { placeholder: 'mis. Baca selengkapnya', maxLength: 24 }),
      t('all_label', 'Teks tombol semua kategori', {
        placeholder: 'mis. Semua',
        maxLength: 16,
        help: 'Dipakai filter kategori bila fitur Berita & Pengumuman aktif.',
      }),
      t('button_label', 'Teks tombol di samping judul', { placeholder: 'mis. Berita lainnya di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol', { help: 'Mis. Instagram atau blog sekolah. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('title', 'Judul', { maxLength: 110 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-24', maxLength: 30, help: DATE_HELP }),
          t('category', 'Kategori', { placeholder: 'mis. Kokurikuler', maxLength: 20 }),
          ta('excerpt', 'Ringkasan', { maxLength: 200 }),
          ta('body', 'Isi lengkap (opsional)', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 1500 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px. Berita pertama tampil besar.'),
          url('url', 'Tautan berita (opsional)', { help: 'Mis. unggahan Instagram. Diisi → tombol baca membuka tautan ini.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'announcements',
    label: 'Pengumuman',
    description: 'Daftar pengumuman bertanggal; label seperti "Penting" atau "Wajib" ditonjolkan merah lembut, lampiran PDF diberi tanda.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pengumuman', 'menu'),
      title('mis. Pengumuman sekolah', 80),
      listField(
        'items',
        'Pengumuman',
        'Pengumuman',
        [
          t('title', 'Judul', { maxLength: 100 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-23', maxLength: 30, help: DATE_HELP }),
          ta('text', 'Isi singkat', { maxLength: 240 }),
          t('badge', 'Label (opsional)', { placeholder: 'mis. Penting', maxLength: 16 }),
          url('url', 'Tautan lampiran (opsional)', { help: 'Mis. surat edaran PDF.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'agenda',
    label: 'Agenda kegiatan',
    description: 'Ubin tanggal warna tema, nama kegiatan, hari & tanggal lengkap, waktu, dan tempat. Tampil di samping Pengumuman.',
    toggleable: true,
    fields: [
      eyebrow('mis. Agenda'),
      title('mis. Agenda sekolah', 80),
      listField(
        'items',
        'Agenda',
        'Agenda',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 2026-11-25', maxLength: 30, help: DATE_HELP }),
          t('title', 'Kegiatan', { maxLength: 90 }),
          t('time', 'Waktu', { placeholder: 'mis. 07.00 WIB', maxLength: 30 }),
          t('place', 'Tempat', { placeholder: 'mis. Lapangan upacara', maxLength: 40 }),
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
      title('mis. Prestasi murid'),
      subtitle(),
      listField(
        'items',
        'Daftar prestasi',
        'Prestasi',
        [
          t('title', 'Peringkat', { placeholder: 'mis. Juara II', maxLength: 30 }),
          t('event', 'Lomba', { placeholder: 'mis. Lomba Debat Bahasa Inggris', maxLength: 90 }),
          t('level', 'Tingkat', { placeholder: 'mis. Kabupaten', maxLength: 20 }),
          t('year', 'Tahun', { placeholder: 'mis. 2026', maxLength: 10 }),
          t('name', 'Nama murid / tim', { placeholder: 'mis. Tim debat kelas XI', maxLength: 60 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'clubs',
    label: 'Ekstrakurikuler',
    description: 'Kartu kegiatan dengan ikon otomatis, jadwal, dan keterangan; tombol kategori menyaring kartu.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kesiswaan', 'menu'),
      title('mis. Ekstrakurikuler'),
      subtitle(),
      t('all_label', 'Teks tombol semua kategori', { placeholder: 'mis. Semua', maxLength: 16 }),
      ta('footnote', 'Catatan di bawah kartu', { placeholder: 'mis. daftar kegiatan lain yang tidak ditampilkan', maxLength: 200 }),
      listField(
        'items',
        'Kegiatan',
        'Kegiatan',
        [
          t('name', 'Nama kegiatan', { placeholder: 'mis. Pramuka', maxLength: 40, help: 'Ikon dipilih otomatis dari nama.' }),
          t('category', 'Kategori', { placeholder: 'mis. Kepemimpinan', maxLength: 24, help: 'Kategori yang sama dikelompokkan dalam satu tombol saring.' }),
          t('schedule', 'Jadwal', { placeholder: 'mis. Jumat, 14.00–16.00', maxLength: 40 }),
          ta('text', 'Keterangan', { maxLength: 120 }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'facilities',
    label: 'Fasilitas',
    description: 'Rel kartu foto yang bisa digeser, dengan tombol sebelumnya/berikutnya dan garis progres.',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas'),
      title('mis. Ruang belajar dan berkegiatan'),
      subtitle(),
      listField(
        'items',
        'Fasilitas',
        'Fasilitas',
        [t('name', 'Nama', { placeholder: 'mis. Laboratorium IPA', maxLength: 40 }), ta('text', 'Keterangan', { maxLength: 120 }), img('image', 'Foto', PORTRAIT_HELP)],
        8,
      ),
    ],
  },
  {
    key: 'teachers',
    label: 'Guru & tenaga kependidikan',
    description: 'Kartu nama dan jabatan; tanpa foto tampil inisial nama.',
    toggleable: true,
    fields: [
      eyebrow('mis. Guru'),
      title('mis. Guru dan tenaga kependidikan'),
      subtitle(),
      t('button_label', 'Teks tombol (opsional)', { placeholder: 'mis. Daftar lengkap guru', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menyembunyikan tombol.' }),
      listField(
        'items',
        'Guru',
        'Guru',
        [
          t('name', 'Nama', { placeholder: 'mis. Sri Wahyuni, S.Pd.', maxLength: 60 }),
          t('role', 'Jabatan / mata pelajaran', { placeholder: 'mis. Guru Biologi', maxLength: 60 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk inisial.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'spmb',
    label: 'SPMB / PPDB: penerimaan murid baru',
    description:
      'Pita gelap berisi informasi SPMB (dulu PPDB): tombol ke portal SPMB/PPDB provinsi, tab Jalur · Jadwal · Syarat, dan formulir tanya panitia yang hanya menyusun pesan WhatsApp (bukan pendaftaran, tanpa penyimpanan data dan tanpa pembayaran online).',
    toggleable: true,
    fields: [
      eyebrow('mis. SPMB 2027/2028'),
      title('mis. Penerimaan murid baru tahun ajaran 2027/2028'),
      subtitle(),
      listField('badges', 'Lencana singkat', 'Lencana', [t('text', 'Teks', { placeholder: 'mis. Tanpa biaya pendaftaran', maxLength: 40 })], 3),
      t('portal_label', 'Teks tombol portal', { placeholder: 'mis. Buka Portal SPMB Provinsi', maxLength: 36 }),
      url('portal_url', 'Tautan portal SPMB/PPDB provinsi', { help: 'Alamat portal SPMB/PPDB provinsi; periksa setiap tahun ajaran. Kosongkan untuk menyembunyikan tombol.' }),
      t('paths_label', 'Nama tab jalur', { placeholder: 'mis. Jalur', maxLength: 16 }),
      t('schedule_label', 'Nama tab jadwal', { placeholder: 'mis. Jadwal', maxLength: 16 }),
      t('requirements_label', 'Nama tab syarat', { placeholder: 'mis. Syarat', maxLength: 16 }),
      listField(
        'paths',
        'Jalur penerimaan',
        'Jalur',
        [
          t('name', 'Nama jalur', { placeholder: 'mis. Domisili', maxLength: 40 }),
          t('quota', 'Kuota', { placeholder: 'mis. min. 30%', maxLength: 30 }),
          ta('text', 'Keterangan', { maxLength: 200 }),
        ],
        6,
      ),
      ta('paths_note', 'Catatan jalur', { placeholder: 'mis. Persentase kuota mengikuti juknis dinas tahun berjalan.', maxLength: 200 }),
      t('schedule_note', 'Judul kecil jadwal', { placeholder: 'mis. Perkiraan jadwal — mengikuti juknis dinas', maxLength: 90 }),
      listField(
        'schedule',
        'Jadwal (linimasa)',
        'Jadwal',
        [
          t('date', 'Waktu', { placeholder: 'mis. Juni 2027', maxLength: 40, help: DATE_HELP }),
          t('title', 'Kegiatan', { placeholder: 'mis. Pendaftaran & verifikasi daring', maxLength: 60 }),
          ta('text', 'Keterangan', { maxLength: 140 }),
        ],
        8,
      ),
      t('requirements_note', 'Judul kecil syarat', { placeholder: 'mis. Siapkan dokumen berikut — cek juknis terbaru', maxLength: 90 }),
      listField('requirements', 'Syarat & dokumen', 'Syarat', [t('text', 'Syarat', { maxLength: 140 })], 12),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Tanya panitia SPMB lewat WhatsApp', maxLength: 50 }),
      ta('form_text', 'Formulir: keterangan', {
        maxLength: 220,
        help: 'Sampaikan dengan jujur bahwa formulir hanya untuk bertanya: data tidak disimpan di website dan tidak ada pembayaran.',
      }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Kirim lewat WhatsApp', maxLength: 30 }),
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp panitia SPMB/PPDB',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Kosongkan untuk memakai WhatsApp sekolah. Tanpa nomor, formulir diganti tombol ke Kontak.',
      },
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita alumni',
    toggleable: true,
    fields: [
      eyebrow('mis. Alumni'),
      title('mis. Cerita alumni'),
      subtitle(),
      t('link_label', 'Teks tautan di bawah', { placeholder: 'mis. Alumni? Isi Tracer Study', maxLength: 36 }),
      url('link_url', 'Tautan', { help: `Mis. formulir tracer study. Kosongkan untuk menuju bagian Layanan. ${SECTION_LINK_HELP}` }),
      listField(
        'items',
        'Cerita',
        'Cerita',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Lulusan 2025 · Pendidikan Biologi', maxLength: 90 }),
          ta('quote', 'Kutipan', { maxLength: 300 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk inisial.'),
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
      title('mis. Kegiatan di sekolah', 80),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Galeri lengkap di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menyembunyikan.' }),
      listField('items', 'Foto', 'Foto', [img('image', 'Foto', PORTRAIT_HELP), t('caption', 'Keterangan', { maxLength: 80 })], 8),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya jawab'),
      title('mis. Pertanyaan yang sering diajukan'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Belum menemukan jawaban?', maxLength: 50 }),
      ta('help_text', 'Kartu bantuan: teks', { maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp sekolah (atau bagian Kontak bila nomor kosong).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 500 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Lokasi & kontak',
    description: 'Alamat, telepon, WhatsApp, email, jam layanan, dan peta Google Maps (dimuat saat digulir). Telepon, email, dan jam layanan juga tampil di bilah paling atas.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak', 'menu'),
      title('mis. Hubungi dan kunjungi sekolah'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kecamatan, Kabupaten, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. SMA Negeri 1 Purbolinggo Lampung Timur',
        maxLength: 120,
        help: 'Nama sekolah + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk tombol peta; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0725) 555-0182', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'info@sekolah.sch.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp sekolah',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tanya jawab, dan formulir SPMB (bila nomor panitia kosong).',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang sekolah.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat 07.00–16.00 WIB', maxLength: 90 }),
      t('whatsapp_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Chat WhatsApp sekolah', maxLength: 30 }),
      t('maps_label', 'Teks tombol peta', { placeholder: 'mis. Buka di Google Maps', maxLength: 30 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita kobalt-hitam: logo, deskripsi, media sosial, tautan cepat, layanan, kontak, nama sekolah besar, dan catatan.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang sekolah Anda.', maxLength: 220 }),
      t('links_title', 'Judul kolom menu', { placeholder: 'mis. Tautan cepat', maxLength: 30 }),
      t('services_title', 'Judul kolom layanan', { placeholder: 'mis. Layanan', maxLength: 30 }),
      t('contact_title', 'Judul kolom kontak', { placeholder: 'mis. Kontak', maxLength: 30 }),
      ta('note', 'Catatan kecil', { maxLength: 220, help: 'Tampil di baris paling bawah. Kosongkan untuk menyembunyikan.' }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Sekolah. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama sekolah.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
