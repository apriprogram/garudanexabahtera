// Skema CMS Nawasena. Urutan section = urutan halaman: hero slider foto latar (+ strip pengumuman) → pita angka →
// sambutan → profil → akademik → prestasi → berita → pengumuman → agenda → ekstrakurikuler → fasilitas → guru → SPMB →
// galeri → alumni → tanya jawab → lokasi & kontak → footer. Kunci company profile (brand, hero, about, testimonials,
// gallery, faq, contact, footer) sama artinya dengan template lain; section sekolah memakai kunci dan BENTUK DATA yang
// sama dengan Bestari/Cakrawala/Madani (news, announcements, agenda, achievements), agar fitur Berita & Pengumuman
// (site_posts) terpasang dengan cara yang sama. Setiap section (selain identitas) bisa disembunyikan. Template baru belum
// punya konten tersimpan, jadi tanpa `introduced`.
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
 * tampil dengan nomor urut "/02 — Profil".
 */
const EYEBROW_HELP = {
  menu: 'Tampil dengan nomor urut bagian, mis. "/02 — Profil". Label singkat (≤ 14 huruf, ≤ 2 kata) juga dipakai sebagai nama di menu atas.',
  number: 'Tampil dengan nomor urut bagian, mis. "/04 — Prestasi". Kosongkan untuk menampilkan nomornya saja.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'number') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const DATE_HELP = 'Tulis YYYY-MM-DD (mis. 2026-11-25) agar tampil sebagai "25 Nov 2026", atau teks bebas (mis. "12–14 Jul 2027").';
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #spmb, #pengumuman, #agenda, atau #kontak.';

export const nawasenaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna tema',
    description: 'Nama sekolah, logo, dan satu warna tema. Warna navy untuk hero, pita angka, pita pengumuman, dan footer dibuat otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama sekolah', { placeholder: 'mis. SMA Negeri 1 Purbolinggo', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. SMA Negeri di Lampung Timur',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama sekolah: sebut jenjang dan kabupaten/kotanya.',
      }),
      img('logo', 'Logo sekolah', 'PNG/SVG berlatar transparan, maks. 2 MB. Tampil di kotak putih kecil di samping nama. Kosongkan untuk memakai simbol Nawasena bawaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Bawaan biru #2563EB (klik "Pakai bawaan" untuk kembali). Warna navy untuk hero, pita angka, pengumuman, dan footer dibuat otomatis dari warna ini agar tetap serasi dan terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (slider foto latar)',
    description:
      'Foto latar selebar layar yang berganti pelan dengan efek zoom halus (berhenti saat disorot, difokus, atau dijeda, dan berhenti sendiri setelah dua putaran), judul di tengah, dua tombol, nomor slide di tepi kanan, dan strip pengumuman berjalan di bawahnya.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. SMA Negeri 1 Purbolinggo · Lampung Timur', maxLength: 50 }),
      t('title', 'Judul utama (slide 1)', { placeholder: 'mis. Berakar kuat, menjangkau cita', maxLength: 80, help: 'Paling bagus 2–3 baris (± 30–50 karakter).' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan sekolah Anda dalam 1–2 kalimat.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 150–200 karakter paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Informasi SPMB', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju bagian SPMB. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Profil sekolah', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Profil.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. SPMB 2027', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian SPMB.' }),
      img('image', 'Foto slide 1', 'Foto mendatar 16:9, disarankan 1920×1080 px. Lapisan navy ditambahkan otomatis agar teks putih terbaca.'),
      listField(
        'slides',
        'Slide tambahan',
        'Slide',
        [
          img('image', 'Foto', 'Wajib; slide tanpa foto tidak tampil. Mendatar 16:9, 1920×1080 px.'),
          t('eyebrow', 'Label kecil', { placeholder: 'Kosongkan untuk memakai label slide 1', maxLength: 50 }),
          t('title', 'Judul', { placeholder: 'Kosongkan untuk memakai judul slide 1', maxLength: 80 }),
          ta('subtitle', 'Deskripsi', { maxLength: 200 }),
        ],
        3,
      ),
      t('ticker_label', 'Label strip pengumuman', {
        placeholder: 'mis. Pengumuman',
        maxLength: 20,
        help: 'Kosongkan untuk menyembunyikan strip pengumuman. Isinya diambil otomatis dari 5 pengumuman terbaru.',
      }),
      t('ticker_link_label', 'Teks tautan di strip pengumuman', { placeholder: 'mis. Lihat semua', maxLength: 20 }),
    ],
  },
  {
    key: 'stats',
    label: 'Statistik sekolah',
    description: 'Pita navy lanjutan hero: judul kecil, keterangan periode data, dan hingga 6 angka serif besar yang menghitung naik saat terlihat.',
    toggleable: true,
    fields: [
      title('mis. SMA Negeri 1 Purbolinggo dalam angka', 80),
      t('note', 'Keterangan data', {
        placeholder: 'mis. Data Tahun Ajaran 2026/2027',
        maxLength: 120,
        help: 'Sebut tahun ajaran atau sumber angkanya agar pengunjung tahu periodenya.',
      }),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 1.048', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Peserta didik', maxLength: 30 }),
          t('note', 'Catatan kecil (opsional)', { placeholder: 'mis. Kelas X 360 · XI 352 · XII 336', maxLength: 60 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'welcome',
    label: 'Sambutan kepala sekolah',
    description:
      'Foto kepala sekolah dengan papan nama navy di kiri (tanpa foto: papan navy dengan inisial, logo, nama, dan jabatan), kutipan besar miring dan isi sambutan di kanan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Sambutan'),
      title('mis. Sambutan Kepala Sekolah', 90),
      ta('quote', 'Kutipan besar', { placeholder: 'Satu kalimat pesan utama kepala sekolah.', maxLength: 220 }),
      ta('body', 'Isi sambutan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      t('name', 'Nama kepala sekolah', { placeholder: 'mis. Dra. Ratna Kurniasih, M.Pd.', maxLength: 60 }),
      t('role', 'Jabatan', { placeholder: 'mis. Kepala SMA Negeri 1 Purbolinggo', maxLength: 60 }),
      img('photo', 'Foto kepala sekolah', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan → papan navy dengan inisial nama.'),
      t('button_label', 'Teks tautan (opsional)', { placeholder: 'mis. Baca sambutan lengkap', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan', { help: SECTION_LINK_HELP }),
    ],
  },
  {
    key: 'about',
    label: 'Profil, visi & misi',
    description: 'Profil singkat dan foto, sejarah singkat, daftar buka-tutup (visi, misi, budaya sekolah), dan chip dimensi profil lulusan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Profil', 'menu'),
      title('mis. Sekolah negeri yang berakar di Purbolinggo'),
      ta('body', 'Profil singkat', { placeholder: 'Siapa sekolah Anda, untuk siapa, dan bagaimana belajar di sana.', maxLength: 600 }),
      img('image', 'Foto profil', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
      t('history_title', 'Judul sejarah', { placeholder: 'mis. Sejarah singkat', maxLength: 60 }),
      ta('history_text', 'Sejarah singkat', { placeholder: 'Tulis apa adanya; kosongkan bila belum ada.', maxLength: 600 }),
      t('founded', 'Tahun berdiri', { placeholder: 'mis. 1984', maxLength: 40, help: 'Mis. 1984. Kosongkan untuk menyembunyikan.' }),
      listField(
        'pillars',
        'Daftar buka-tutup',
        'Butir',
        [
          t('title', 'Judul', { placeholder: 'mis. Visi', maxLength: 40 }),
          t('text', 'Ringkasan (selalu tampil)', { placeholder: 'Satu kalimat.', maxLength: 160 }),
          ta('detail', 'Isi saat dibuka (opsional)', { placeholder: 'Satu butir per baris; tiap baris jadi satu nomor.', maxLength: 600 }),
        ],
        5,
      ),
      t('dimensions_title', 'Judul chip', { placeholder: 'mis. Delapan dimensi profil lulusan', maxLength: 60 }),
      listField('dimensions', 'Chip', 'Chip', [t('text', 'Teks', { placeholder: 'mis. Penalaran Kritis', maxLength: 40 })], 10),
    ],
  },
  {
    key: 'programs',
    label: 'Akademik (paket mata pelajaran pilihan)',
    description: 'Tab per paket mata pelajaran pilihan kelas XI–XII dengan foto yang berganti pelan, daftar mata pelajaran, rencana studi, dan kartu kokurikuler.',
    toggleable: true,
    fields: [
      eyebrow('mis. Akademik', 'menu'),
      title('mis. Paket mata pelajaran pilihan untuk kelas XI–XII'),
      subtitle(),
      listField(
        'items',
        'Paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Sains & Teknologi', maxLength: 50 }),
          t('label', 'Label kecil', { placeholder: 'mis. Paket 1', maxLength: 30 }),
          ta('description', 'Deskripsi', { placeholder: 'Untuk murid yang …', maxLength: 220 }),
          ta('subjects', 'Mata pelajaran', { placeholder: 'Biologi\nKimia\nFisika', maxLength: 400, help: 'Satu mata pelajaran per baris.' }),
          t('fit', 'Rencana studi', { placeholder: 'mis. Sering dipilih untuk rencana studi kesehatan dan teknik.', maxLength: 140 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
        ],
        5,
      ),
      t('fit_label', 'Label rencana studi', { placeholder: 'mis. Rencana studi', maxLength: 24, help: 'Label kecil sebelum isian "Rencana studi" tiap paket.' }),
      t('note', 'Catatan di bawah tab', { placeholder: 'mis. Komposisi paket mengikuti kurikulum yang berlaku.', maxLength: 200 }),
      t('extra_title', 'Kartu tambahan: judul', { placeholder: 'mis. Kokurikuler', maxLength: 50, help: 'Kosongkan untuk menyembunyikan kartu.' }),
      ta('extra_text', 'Kartu tambahan: teks', { maxLength: 280 }),
    ],
  },
  {
    key: 'achievements',
    label: 'Prestasi',
    description: 'Kartu prestasi yang bisa digeser (tombol sebelumnya/berikutnya): peringkat besar, lomba, tingkat, tahun, nama murid/tim, dan bidang.',
    toggleable: true,
    fields: [
      eyebrow('mis. Prestasi', 'menu'),
      title('mis. Prestasi murid di berbagai bidang'),
      subtitle(),
      listField(
        'items',
        'Prestasi',
        'Prestasi',
        [
          t('title', 'Peringkat', { placeholder: 'mis. Juara II', maxLength: 30 }),
          t('event', 'Lomba', { placeholder: 'mis. Lomba Debat Bahasa Inggris', maxLength: 90 }),
          t('level', 'Tingkat', { placeholder: 'mis. Kabupaten', maxLength: 20 }),
          t('year', 'Tahun', { placeholder: 'mis. 2026', maxLength: 10 }),
          t('name', 'Nama murid / tim', { placeholder: 'mis. Tim debat kelas XI', maxLength: 60 }),
          t('category', 'Bidang', { placeholder: 'mis. Akademik', maxLength: 24 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'news',
    label: 'Berita',
    description:
      'Tata letak majalah: satu berita utama berfoto, tiga berita di sampingnya, dan daftar berita lainnya. "Baca selengkapnya" membuka isi berita di tempat. Dengan fitur Berita & Pengumuman, tulisan tampil di sini dan punya halaman sendiri.',
    toggleable: true,
    fields: [
      eyebrow('mis. Berita', 'menu'),
      title('mis. Kabar terbaru dari sekolah'),
      subtitle(),
      t('more_title', 'Judul daftar ringkas', { placeholder: 'mis. Berita lainnya', maxLength: 30, help: 'Tampil di atas berita ke-5 dan seterusnya (tanpa foto).' }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Berita lainnya di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol', { help: 'Mis. Instagram atau blog sekolah. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('title', 'Judul', { maxLength: 110 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-26', maxLength: 30, help: DATE_HELP }),
          t('category', 'Kategori', { placeholder: 'mis. Prestasi', maxLength: 20 }),
          ta('excerpt', 'Ringkasan', { maxLength: 200 }),
          ta('body', 'Isi lengkap (opsional)', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 1500 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px. Berita ke-5 dan seterusnya tampil tanpa foto.'),
          url('url', 'Tautan berita (opsional)', { help: 'Mis. unggahan Instagram. Diisi → "Baca selengkapnya" membuka tautan ini.' }),
        ],
        7,
      ),
    ],
  },
  {
    key: 'announcements',
    label: 'Pengumuman',
    description: 'Kartu pengumuman bertanggal di pita navy; label seperti "Penting" ditonjolkan. Lima pengumuman terbaru juga berjalan di strip bawah hero.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pengumuman'),
      title('mis. Pengumuman sekolah', 80),
      listField(
        'items',
        'Pengumuman',
        'Pengumuman',
        [
          t('title', 'Judul', { maxLength: 100 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-23', maxLength: 30, help: DATE_HELP }),
          ta('text', 'Isi singkat', { maxLength: 240 }),
          t('badge', 'Label (opsional)', { placeholder: 'mis. Penting, Kelas XII, Alumni', maxLength: 16 }),
          url('url', 'Tautan lampiran (opsional)', { help: 'Mis. surat edaran PDF.' }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'agenda',
    label: 'Agenda sekolah',
    description: 'Linimasa kegiatan di samping pengumuman. Agenda bertanggal YYYY-MM-DD yang sudah lewat otomatis ditandai "Selesai" dan pindah ke bawah.',
    toggleable: true,
    fields: [
      eyebrow('mis. Agenda', 'menu'),
      title('mis. Agenda sekolah', 80),
      listField(
        'items',
        'Agenda',
        'Agenda',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 2026-11-25', maxLength: 30, help: DATE_HELP }),
          t('title', 'Kegiatan', { maxLength: 90 }),
          t('time', 'Waktu', { placeholder: 'mis. 07.00 WIB', maxLength: 30 }),
          t('place', 'Tempat', { placeholder: 'mis. Aula sekolah', maxLength: 40 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'clubs',
    label: 'Ekstrakurikuler',
    description: 'Kartu ekstrakurikuler dengan ikon otomatis dari nama, jadwal latihan, dan deretan ekstrakurikuler lainnya.',
    toggleable: true,
    fields: [
      eyebrow('mis. Ekstrakurikuler'),
      title('mis. Bakat yang diasah sepulang sekolah'),
      subtitle(),
      listField(
        'items',
        'Ekstrakurikuler',
        'Ekstrakurikuler',
        [
          t('name', 'Nama', { placeholder: 'mis. Pramuka', maxLength: 40, help: 'Ikon dipilih otomatis dari nama.' }),
          t('category', 'Kategori', { placeholder: 'mis. Wajib kelas X', maxLength: 30 }),
          ta('text', 'Keterangan', { maxLength: 160 }),
          t('schedule', 'Jadwal', { placeholder: 'mis. Jumat, 14.00 WIB', maxLength: 40 }),
        ],
        12,
      ),
      t('more_title', 'Judul daftar lainnya', { placeholder: 'mis. Ekstrakurikuler lainnya', maxLength: 40 }),
      ta('more', 'Ekstrakurikuler lainnya', { placeholder: 'Pisahkan dengan koma atau baris baru.', maxLength: 400 }),
    ],
  },
  {
    key: 'facilities',
    label: 'Fasilitas',
    description: 'Bento foto berketerangan untuk fasilitas berfoto, lalu kartu teks untuk fasilitas tanpa foto.',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas'),
      title('mis. Sarana untuk belajar dan berkegiatan'),
      subtitle(),
      listField(
        'items',
        'Fasilitas',
        'Fasilitas',
        [
          t('name', 'Nama', { placeholder: 'mis. Laboratorium IPA', maxLength: 50 }),
          ta('caption', 'Keterangan', { maxLength: 140 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan → tampil sebagai kartu teks.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'teachers',
    label: 'Guru & tenaga kependidikan',
    description: 'Kartu guru berfoto tegak; tanpa foto tampil inisial di kotak navy. Bila tidak ada guru yang berfoto, kartu tampil ringkas (inisial, nama, jabatan).',
    toggleable: true,
    fields: [
      eyebrow('mis. Guru'),
      title('mis. Guru dan pembina'),
      subtitle(),
      listField(
        'items',
        'Guru',
        'Guru',
        [
          t('name', 'Nama', { placeholder: 'mis. Sri Handayani, S.Pd.', maxLength: 60 }),
          t('role', 'Jabatan / mata pelajaran', { placeholder: 'mis. Guru Biologi · Wali kelas XI', maxLength: 70 }),
          img('photo', 'Foto (opsional)', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan → inisial.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'spmb',
    label: 'SPMB / PPDB (penerimaan murid baru)',
    description:
      'Informasi SPMB (dulu PPDB): tautan portal provinsi, kartu jalur, tabel perkiraan jadwal, syarat dokumen, dan formulir tanya panitia yang hanya menyusun pesan WhatsApp (bukan pendaftaran; tanpa penyimpanan data, tanpa pembayaran).',
    toggleable: true,
    fields: [
      eyebrow('mis. SPMB 2027/2028'),
      title('mis. Sistem Penerimaan Murid Baru 2027/2028'),
      subtitle(),
      listField('badges', 'Lencana singkat', 'Lencana', [t('text', 'Teks', { placeholder: 'mis. Tanpa biaya pendaftaran', maxLength: 40 })], 4),
      t('portal_title', 'Kartu portal: label kecil', { placeholder: 'mis. Portal resmi', maxLength: 40 }),
      t('portal_label', 'Teks tombol portal', { placeholder: 'mis. Buka Portal SPMB Provinsi', maxLength: 36 }),
      url('portal_url', 'Tautan portal', {
        help: 'Alamat portal SPMB provinsi; perbarui setiap tahun sesuai pengumuman dinas. Kosongkan untuk menyembunyikan kartu portal.',
      }),
      t('paths_title', 'Judul jalur', { placeholder: 'mis. Jalur pendaftaran', maxLength: 60 }),
      listField(
        'paths',
        'Jalur pendaftaran',
        'Jalur',
        [
          t('name', 'Nama jalur', { placeholder: 'mis. Domisili', maxLength: 40 }),
          t('quota', 'Kuota', { placeholder: 'mis. min. 30%', maxLength: 30 }),
          ta('text', 'Keterangan', { maxLength: 200 }),
        ],
        6,
      ),
      ta('paths_note', 'Catatan jalur', { maxLength: 200 }),
      t('schedule_title', 'Judul jadwal', { placeholder: 'mis. Perkiraan jadwal, mengikuti juknis dinas', maxLength: 80 }),
      listField(
        'schedule',
        'Jadwal',
        'Jadwal',
        [
          t('date', 'Waktu', { placeholder: 'mis. Juni 2027', maxLength: 40 }),
          t('title', 'Kegiatan', { placeholder: 'mis. Pendaftaran & verifikasi', maxLength: 60 }),
          ta('text', 'Keterangan', { maxLength: 160 }),
        ],
        8,
      ),
      t('requirements_title', 'Judul syarat', { placeholder: 'mis. Siapkan dokumen berikut', maxLength: 80 }),
      listField('requirements', 'Syarat dokumen', 'Syarat', [t('text', 'Syarat', { maxLength: 160 })], 12),
      t('form_title', 'Formulir tanya: judul', { placeholder: 'mis. Tanya panitia SPMB', maxLength: 50 }),
      ta('form_text', 'Formulir tanya: keterangan', { maxLength: 240, help: 'Jelaskan bahwa formulir ini hanya untuk bertanya, bukan pendaftaran.' }),
      t('form_button', 'Formulir tanya: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
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
    key: 'gallery',
    label: 'Galeri',
    description: 'Bento foto berketerangan: foto pertama tegak paling besar.',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri'),
      title('mis. Potret keseharian sekolah', 80),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Galeri lengkap di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Foto',
        'Foto',
        [
          img('image', 'Foto', 'Foto pertama tampil tegak paling besar (4:5); foto lain mendatar 4:3 atau 3:2.'),
          t('caption', 'Keterangan', { maxLength: 80 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita alumni',
    description: 'Kutipan alumni: kutipan pertama tampil besar, sisanya dalam kartu. Tanpa foto tampil inisial.',
    toggleable: true,
    fields: [
      eyebrow('mis. Alumni'),
      title('mis. Cerita alumni'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Alumni? Isi tracer study', maxLength: 40 }),
      url('link_url', 'Tautan', { help: 'Mis. formulir tracer study. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Alumni',
        'Alumni',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Lulusan 2025 · Pendidikan Biologi', maxLength: 90 }),
          ta('quote', 'Kutipan', { maxLength: 300 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan → inisial.'),
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
      eyebrow('mis. Tanya jawab'),
      title('mis. Pertanyaan yang sering diajukan'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih ada pertanyaan?', maxLength: 50 }),
      ta('help_text', 'Kartu bantuan: teks', { maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Ajukan pertanyaan', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', {
        help: 'Kosongkan untuk membuka WhatsApp panitia SPMB (atau WhatsApp sekolah bila nomor panitia kosong).',
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
    description: 'Alamat, telepon, email, jam layanan, tombol WhatsApp, dan peta Google Maps (dimuat saat digulir).',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak', 'menu'),
      title('mis. Kunjungi dan hubungi sekolah', 90),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kecamatan, Kabupaten, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. SMA Negeri 1 Purbolinggo Lampung Timur',
        maxLength: 120,
        help: 'Nama sekolah + kabupaten seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk tautan "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0725) 555-0141', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'info@sekolah.sch.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp sekolah',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol di bagian ini, tanya jawab, dan formulir tanya SPMB (bila nomor panitia kosong).',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang sekolah.', maxLength: 160 }),
      t('whatsapp_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Hubungi lewat WhatsApp', maxLength: 30 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat 07.00–15.30 WIB', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita navy: ajakan, nama sekolah besar, logo & deskripsi, menu, tautan cepat, kontak singkat, media sosial, dan catatan kecil.',
    toggleable: true,
    fields: [
      t('cta_title', 'Ajakan: judul', { placeholder: 'mis. SPMB 2027/2028', maxLength: 60, help: 'Kosongkan untuk menyembunyikan ajakan.' }),
      ta('cta_text', 'Ajakan: teks', { maxLength: 180 }),
      t('cta_label', 'Ajakan: teks tombol', { placeholder: 'mis. Lihat informasi SPMB', maxLength: 28 }),
      url('cta_url', 'Ajakan: tautan tombol', { help: 'Kosongkan untuk menuju bagian SPMB.' }),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang sekolah Anda.', maxLength: 220 }),
      t('links_title', 'Judul tautan cepat', { placeholder: 'mis. Tautan cepat', maxLength: 30 }),
      listField(
        'links',
        'Tautan cepat',
        'Tautan',
        [
          t('label', 'Teks', { placeholder: 'mis. E-Learning', maxLength: 40 }),
          url('url', 'Tautan', {
            help: 'Mis. alamat E-Learning, laman PPID, perpustakaan digital, legalisir, tracer study, pengaduan, atau #spmb. Kosongkan bila alamatnya belum ada: pengunjung melihat catatan di bawah.',
          }),
        ],
        8,
      ),
      ta('links_note', 'Catatan untuk tautan yang belum diisi', {
        maxLength: 200,
        help: 'Tampil saat pengunjung mengeklik tautan cepat yang alamatnya masih kosong. Kosongkan untuk menyembunyikan tautan tanpa alamat.',
      }),
      ta('note', 'Catatan kecil', { maxLength: 200, help: 'Hapus setelah semua isi contoh diganti.' }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Sekolah', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama sekolah.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
