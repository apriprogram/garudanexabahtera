// Skema CMS Madani (website sekolah Islam, SMA/MA). Urutan section = urutan halaman: hero slider foto → strip info →
// sambutan → profil (visi & misi) → statistik → program → prestasi → fasilitas → PPDB → berita → pengumuman → agenda →
// galeri → alumni → tanya jawab → ajakan → lokasi & kontak → footer. Kunci company profile (brand, hero, about, cta,
// contact, footer) sama artinya dengan template lain; section baru memakai kunci Inggris pendek. Template baru belum
// punya konten tersimpan, jadi tanpa `introduced`. Setiap section bisa disembunyikan (toggleable).
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
  t('eyebrow', 'Label kecil di atas judul', {
    placeholder,
    maxLength: 40,
    help: 'Tampil dengan titik warna tema. Label yang singkat juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const title = (placeholder: string, maxLength = 120) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const DATE_HELP = 'Tulis tahun-bulan-tanggal, mis. 2026-11-14, agar tampil sebagai “14 Nov 2026”. Teks lain tampil apa adanya.';
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Lokasi & Kontak).';

export const madaniSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna tema',
    description:
      'Nama sekolah, logo, dan warna tema. Pilih salah satu warna cepat (mis. hijau atau biru) atau tulis kode warna sendiri; semua tombol, ikon, pita gelap, dan warna sorotan ikut menyesuaikan.',
    fields: [
      t('company_name', 'Nama sekolah', { placeholder: 'mis. SMA IT Nurul Azka', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Sekolah Islam Terpadu & Boarding di Bogor',
        maxLength: 100,
        help: 'Tampil di footer dan judul tab browser (“Nama sekolah — Tagline”). Sebut jenis sekolah dan kota agar mudah ditemukan di Google.',
      }),
      img('logo', 'Logo sekolah', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol kubah & buku bawaan template.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Warna utama website (tombol, ikon, judul, pita gelap). Warna terang otomatis digelapkan untuk teks agar tetap terbaca.',
      },
      {
        type: 'color',
        key: 'highlight_color',
        label: 'Warna sorotan (opsional)',
        help: 'Warna tombol “Daftar PPDB”, kata yang disorot, dan kartu sorotan. Kosongkan agar dihitung otomatis dari warna tema (hijau → hijau muda, biru → hijau mint).',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (slider foto)',
    description:
      'Slider foto latar di dalam bingkai membulat dengan menu di atasnya, judul, dua tombol, dan kartu info PPDB. Isi di bawah ini adalah slide pertama; tambah hingga 3 slide lagi di “Slide tambahan”.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. PPDB 2027/2028 telah dibuka', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama (H1)', { placeholder: 'mis. Tumbuh Berilmu, Berakhlak, dan Berprestasi', maxLength: 80, help: 'Paling bagus 2–3 baris (± 35–45 karakter).' }),
      t('highlight', 'Kata yang disorot', {
        placeholder: 'mis. Berakhlak',
        maxLength: 40,
        help: 'Bagian dari judul yang diberi warna sorotan. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan singkat sekolah Anda: jenjang, kota, dan program unggulan.',
        maxLength: 260,
        help: 'Juga dipakai sebagai deskripsi halaman di hasil pencarian Google.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Daftar PPDB', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian PPDB (atau WhatsApp bila bagian PPDB disembunyikan).' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Profil Sekolah', maxLength: 30 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Profil.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. PPDB 2027', maxLength: 24, help: 'Kosongkan untuk memakai teks tombol utama.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk memakai tautan tombol utama.' }),
      img('image', 'Foto latar slide pertama', 'Foto mendatar, disarankan 1920×1200 px. Lapisan gelap tipis ditambahkan otomatis agar teks terbaca.'),
      listField(
        'slides',
        'Slide tambahan',
        'Slide',
        [
          img('image', 'Foto latar', 'Foto mendatar, disarankan 1920×1200 px. Slide hanya tampil bila fotonya diisi.'),
          t('eyebrow', 'Label kecil', { placeholder: 'mis. Asrama putra & putri', maxLength: 60, help: 'Kosongkan untuk memakai label slide pertama.' }),
          t('title', 'Judul', { placeholder: 'mis. Belajar Nyaman di Lingkungan yang Asri', maxLength: 80, help: 'Kosongkan untuk memakai judul slide pertama.' }),
          t('highlight', 'Kata yang disorot', { placeholder: 'mis. Lingkungan yang Asri', maxLength: 40 }),
          ta('subtitle', 'Deskripsi', { placeholder: 'Kosongkan untuk memakai deskripsi slide pertama.', maxLength: 260 }),
        ],
        3,
      ),
      t('card_label', 'Kartu info: label', { placeholder: 'mis. Info PPDB', maxLength: 24, help: 'Kartu kecil di pojok kanan bawah hero. Kosongkan judul & teks untuk menyembunyikan.' }),
      t('card_title', 'Kartu info: judul', { placeholder: 'mis. Gelombang 1 dibuka', maxLength: 40 }),
      t('card_text', 'Kartu info: teks', { placeholder: 'mis. 1 Desember 2026 – 31 Januari 2027', maxLength: 70 }),
      t('card_badge', 'Kartu info: lencana', { placeholder: 'mis. Akreditasi A', maxLength: 24 }),
      url('card_url', 'Kartu info: tautan', { help: 'Kosongkan untuk menuju bagian PPDB.' }),
    ],
  },
  {
    key: 'highlights',
    label: 'Strip info singkat',
    description: 'Empat keunggulan singkat tepat di bawah hero. Ikon dipilih otomatis dari judul (akreditasi, kurikulum, tahfidz, asrama, dll.).',
    toggleable: true,
    fields: [
      listField(
        'items',
        'Info',
        'Info',
        [
          t('title', 'Judul', { placeholder: 'mis. Akreditasi A (Unggul)', maxLength: 32 }),
          t('text', 'Keterangan', { placeholder: 'mis. Terakreditasi BAN-PDM', maxLength: 48 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'welcome',
    label: 'Sambutan kepala sekolah',
    description: 'Foto kepala sekolah, judul, kutipan, isi sambutan, nama, dan jabatan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Sambutan Kepala Sekolah'),
      title('mis. Menyiapkan generasi yang kuat imannya dan santun akhlaknya'),
      ta('quote', 'Kutipan', { placeholder: 'Satu kalimat pesan utama kepala sekolah.', maxLength: 200 }),
      ta('body', 'Isi sambutan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 1400 }),
      t('name', 'Nama kepala sekolah', { placeholder: 'mis. Ustadzah Rahmi Fauziah, M.Pd.', maxLength: 80 }),
      t('role', 'Jabatan', { placeholder: 'mis. Kepala SMA IT Nurul Azka', maxLength: 80 }),
      img('image', 'Foto kepala sekolah', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
    ],
  },
  {
    key: 'about',
    label: 'Profil, visi & misi',
    description: 'Tab Profil, Visi, Misi, dan Nilai sekolah. Tab yang isinya kosong otomatis disembunyikan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Profil Sekolah'),
      title('mis. Sekolah Islam terpadu yang memadukan ilmu umum dan Al-Qur’an'),
      ta('body', 'Profil singkat', { placeholder: 'Sejarah singkat, yayasan, kurikulum. Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      img('image', 'Foto profil', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
      listField(
        'facts',
        'Data singkat',
        'Data',
        [
          t('label', 'Label', { placeholder: 'mis. Berdiri', maxLength: 24 }),
          t('value', 'Isi', { placeholder: 'mis. 2009', maxLength: 32 }),
        ],
        6,
      ),
      ta('vision', 'Visi', { placeholder: 'Tulis visi sekolah.', maxLength: 300 }),
      listField('missions', 'Misi', 'Misi', [ta('text', 'Misi', { placeholder: 'mis. Menyelenggarakan pembelajaran terpadu...', maxLength: 200 })], 8),
      listField(
        'values',
        'Nilai sekolah',
        'Nilai',
        [
          t('title', 'Nilai', { placeholder: 'mis. Adab', maxLength: 24 }),
          ta('text', 'Penjelasan', { placeholder: 'Satu kalimat.', maxLength: 140 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'stats',
    label: 'Statistik',
    description: 'Kartu angka (siswa, guru, prestasi, alumni, akreditasi). Kartu terakhir tampil dengan warna sorotan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Sekolah dalam Angka'),
      title('mis. Tumbuh bersama ratusan keluarga sejak 2009'),
      subtitle('mis. Data tahun ajaran 2026/2027.'),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 486', maxLength: 10, help: 'Angka biasa (486, 2.300+) dihitung naik saat terlihat; huruf (A) tampil apa adanya.' }),
          t('label', 'Keterangan', { placeholder: 'mis. Siswa aktif', maxLength: 32 }),
          ta('text', 'Penjelasan', { placeholder: 'Satu kalimat.', maxLength: 120 }),
        ],
        5,
      ),
    ],
  },
  {
    key: 'programs',
    label: 'Program unggulan',
    description: 'Kartu program dengan label, foto, keterangan, dan tombol panah ke WhatsApp. Kartu pertama tampil dengan warna sorotan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Program Unggulan'),
      title('mis. Program yang menumbuhkan iman, ilmu, dan keterampilan'),
      subtitle(),
      listField(
        'items',
        'Program',
        'Program',
        [
          t('label', 'Label kecil', { placeholder: 'mis. Unggulan', maxLength: 20 }),
          t('title', 'Nama program', { placeholder: 'mis. Tahfidz Al-Qur’an', maxLength: 50 }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1–2 kalimat.', maxLength: 220 }),
          t('meta', 'Keterangan singkat', { placeholder: 'mis. Target 6–10 juz', maxLength: 40 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
          url('url', 'Tautan (opsional)', { help: 'Kosongkan untuk membuka WhatsApp dengan nama program.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'achievements',
    label: 'Prestasi',
    description: 'Pita gelap berisi kartu angka prestasi dan daftar prestasi per tahun dengan tingkatnya.',
    toggleable: true,
    fields: [
      eyebrow('mis. Prestasi Siswa'),
      title('mis. Prestasi yang tumbuh dari kebiasaan belajar yang baik'),
      subtitle(),
      t('stat_value', 'Kartu angka: angka', { placeholder: 'mis. 127', maxLength: 10, help: 'Kosongkan angka & keterangan untuk menyembunyikan kartu.' }),
      t('stat_label', 'Kartu angka: keterangan', { placeholder: 'mis. prestasi tingkat kota hingga nasional', maxLength: 80 }),
      listField(
        'items',
        'Daftar prestasi',
        'Prestasi',
        [
          t('year', 'Tahun', { placeholder: 'mis. 2026', maxLength: 10 }),
          t('title', 'Prestasi', { placeholder: 'mis. Medali Perak Olimpiade Sains', maxLength: 90 }),
          t('detail', 'Siswa / tim', { placeholder: 'mis. Aisyah Putri R., kelas XI', maxLength: 80 }),
          t('level', 'Tingkat', { placeholder: 'mis. Nasional', maxLength: 24 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'facilities',
    label: 'Fasilitas',
    description: 'Satu foto besar dan daftar fasilitas berikon. Ikon dipilih otomatis dari nama fasilitas (masjid, laboratorium, perpustakaan, asrama, lapangan, dll.).',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas'),
      title('mis. Fasilitas yang mendukung belajar dan ibadah'),
      subtitle(),
      img('image', 'Foto fasilitas', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
      t('image_caption', 'Keterangan foto', { placeholder: 'mis. Laboratorium IPA terpadu', maxLength: 50 }),
      listField(
        'items',
        'Fasilitas',
        'Fasilitas',
        [
          t('title', 'Nama fasilitas', { placeholder: 'mis. Masjid Sekolah', maxLength: 40 }),
          t('text', 'Keterangan', { placeholder: 'mis. Pusat ibadah dan kajian.', maxLength: 90 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'ppdb',
    label: 'PPDB (pendaftaran siswa baru)',
    description:
      'Jalur pendaftaran (tab), jadwal berupa linimasa, syarat, alur, biaya (opsional), dan formulir minat yang menyusun pesan WhatsApp untuk panitia. Formulir TIDAK menyimpan data dan tidak menerima pembayaran.',
    toggleable: true,
    fields: [
      eyebrow('mis. PPDB 2027/2028'),
      title('mis. Penerimaan Peserta Didik Baru'),
      subtitle('Untuk siapa PPDB ini dan cara mendaftarnya.'),
      t('status', 'Status pendaftaran', { placeholder: 'mis. Gelombang 1 dibuka', maxLength: 40, help: 'Tampil sebagai lencana dengan titik menyala. Kosongkan untuk menyembunyikan.' }),
      t('quota', 'Kuota', { placeholder: 'mis. Kuota 168 siswa', maxLength: 40 }),
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp panitia PPDB', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Tujuan pesan formulir. Kosongkan untuk memakai WhatsApp di bagian Lokasi & Kontak.' },
      listField(
        'tracks',
        'Jalur pendaftaran',
        'Jalur',
        [
          t('name', 'Nama jalur', { placeholder: 'mis. Reguler', maxLength: 32 }),
          t('quota', 'Kuota', { placeholder: 'mis. 96 kursi', maxLength: 24 }),
          ta('description', 'Penjelasan', { placeholder: 'Untuk siapa jalur ini.', maxLength: 220 }),
          ta('requirements', 'Syarat / tahapan khusus', { placeholder: 'Satu baris satu poin, mis.\nRapor semester 1–5\nTes baca Al-Qur’an', maxLength: 400 }),
        ],
        5,
      ),
      listField(
        'schedule',
        'Jadwal (linimasa)',
        'Jadwal',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 1 Des 2026 – 31 Jan 2027', maxLength: 40 }),
          t('title', 'Kegiatan', { placeholder: 'mis. Pendaftaran Gelombang 1', maxLength: 60 }),
          t('text', 'Keterangan', { placeholder: 'Satu kalimat.', maxLength: 120 }),
          t('status', 'Status (opsional)', { placeholder: 'mis. Dibuka', maxLength: 20, help: 'Tahap yang berstatus tampil menonjol di linimasa.' }),
        ],
        8,
      ),
      ta('requirements', 'Syarat umum', { placeholder: 'Satu baris satu syarat, mis.\nLulusan SMP/MTs tahun 2027\nFotokopi rapor', maxLength: 600 }),
      listField(
        'steps',
        'Alur pendaftaran',
        'Langkah',
        [
          t('title', 'Langkah', { placeholder: 'mis. Isi formulir minat', maxLength: 40 }),
          ta('text', 'Keterangan', { placeholder: 'Satu kalimat.', maxLength: 140 }),
        ],
        5,
      ),
      listField(
        'fees',
        'Rincian biaya (opsional)',
        'Biaya',
        [
          t('name', 'Komponen', { placeholder: 'mis. Uang pangkal', maxLength: 40 }),
          t('amount', 'Nominal', { placeholder: 'mis. Rp12.500.000', maxLength: 24 }),
          t('note', 'Catatan', { placeholder: 'mis. Bisa dicicil 3 kali', maxLength: 40 }),
        ],
        8,
      ),
      ta('fees_note', 'Catatan biaya', { placeholder: 'mis. Pembayaran langsung ke rekening sekolah setelah konfirmasi panitia.', maxLength: 200 }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Formulir minat pendaftaran', maxLength: 50, help: 'Kosongkan judul & teks tombol untuk menyembunyikan formulir.' }),
      ta('form_text', 'Formulir: penjelasan', { placeholder: 'Jelaskan bahwa formulir menyusun pesan WhatsApp.', maxLength: 220 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Kirim lewat WhatsApp', maxLength: 30 }),
      ta('program_options', 'Formulir: pilihan program', { placeholder: 'Satu baris satu pilihan, mis.\nReguler (pulang-pergi)\nAsrama (boarding)', maxLength: 200 }),
    ],
  },
  {
    key: 'news',
    label: 'Berita',
    description: 'Kartu berita dengan foto, kategori, tanggal, ringkasan, dan isi lengkap yang bisa dibuka di tempat.',
    toggleable: true,
    fields: [
      eyebrow('mis. Berita Sekolah'),
      title('mis. Kabar terbaru dari sekolah'),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('category', 'Kategori', { placeholder: 'mis. Prestasi', maxLength: 20 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-12', maxLength: 30, help: DATE_HELP }),
          t('title', 'Judul berita', { placeholder: 'mis. Tim olimpiade meraih tiga medali', maxLength: 110 }),
          ta('excerpt', 'Ringkasan', { placeholder: '1–2 kalimat yang tampil di kartu.', maxLength: 220 }),
          ta('body', 'Isi lengkap (opsional)', { placeholder: 'Tampil saat “Baca selengkapnya” diklik. Pisahkan paragraf dengan baris kosong.', maxLength: 1500 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
          url('url', 'Tautan berita lengkap (opsional)', { help: 'Mis. unggahan Instagram atau artikel di situs lain.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'announcements',
    label: 'Pengumuman',
    description: 'Daftar pengumuman bertanggal. Isi “Lencana” (mis. Penting) agar pengumuman diberi tanda menonjol.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pengumuman'),
      title('mis. Pengumuman sekolah'),
      listField(
        'items',
        'Pengumuman',
        'Pengumuman',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-24', maxLength: 30, help: DATE_HELP }),
          t('title', 'Judul', { placeholder: 'mis. Jadwal Penilaian Tengah Semester', maxLength: 90 }),
          ta('text', 'Isi singkat', { placeholder: '1–2 kalimat.', maxLength: 240 }),
          t('badge', 'Lencana', { placeholder: 'mis. Penting', maxLength: 16, help: 'Kosongkan untuk pengumuman biasa.' }),
          url('url', 'Tautan (opsional)', { help: 'Mis. #ppdb untuk menuju bagian PPDB, atau tautan berkas di Google Drive.' }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'agenda',
    label: 'Agenda kegiatan',
    description: 'Daftar kegiatan mendatang dengan tanggal, waktu, tempat, dan kategori.',
    toggleable: true,
    fields: [
      eyebrow('mis. Agenda'),
      title('mis. Agenda kegiatan'),
      listField(
        'items',
        'Kegiatan',
        'Kegiatan',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 2026-11-14', maxLength: 30, help: DATE_HELP }),
          t('title', 'Nama kegiatan', { placeholder: 'mis. Kajian akbar orang tua & siswa', maxLength: 70 }),
          t('time', 'Waktu', { placeholder: 'mis. 08.00–11.00 WIB', maxLength: 30 }),
          t('place', 'Tempat', { placeholder: 'mis. Masjid sekolah', maxLength: 40 }),
          t('category', 'Kategori', { placeholder: 'mis. Kajian', maxLength: 16 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    description: 'Hingga 6 foto kegiatan dalam susunan mozaik: foto pertama melebar, foto kedua meninggi, sisanya kotak.',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri'),
      title('mis. Potret kegiatan siswa'),
      listField(
        'items',
        'Foto',
        'Foto',
        [img('image', 'Foto', 'Foto mendatar 4:3 (1200×900 px); foto kedua sebaiknya tegak 4:5 (1200×1500 px).'), t('caption', 'Keterangan', { placeholder: 'mis. Latihan pramuka', maxLength: 50 })],
        6,
      ),
    ],
  },
  {
    key: 'alumni',
    label: 'Alumni',
    description: 'Kartu angka lulusan dan cerita alumni dengan foto, angkatan, dan kegiatan sekarang.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kata Alumni'),
      title('mis. Alumni kami melanjutkan langkah ke berbagai kampus'),
      subtitle(),
      t('stat_value', 'Kartu angka: angka', { placeholder: 'mis. 94%', maxLength: 10, help: 'Kosongkan angka & keterangan untuk menyembunyikan kartu.' }),
      t('stat_label', 'Kartu angka: keterangan', { placeholder: 'mis. lulusan melanjutkan ke perguruan tinggi', maxLength: 70 }),
      listField(
        'items',
        'Cerita alumni',
        'Alumni',
        [
          t('name', 'Nama', { placeholder: 'mis. Nabila Khairunnisa', maxLength: 60 }),
          t('year', 'Angkatan', { placeholder: 'mis. Angkatan 2023', maxLength: 30 }),
          t('now', 'Kegiatan sekarang', { placeholder: 'mis. Mahasiswi kedokteran di Yogyakarta', maxLength: 70 }),
          ta('quote', 'Cerita', { placeholder: 'Kesan alumni tentang sekolah.', maxLength: 320 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk memakai inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    description: 'Daftar pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya Jawab'),
      title('mis. Pertanyaan seputar sekolah dan PPDB'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih ada pertanyaan?', maxLength: 60 }),
      ta('help_text', 'Kartu bantuan: teks', { placeholder: 'mis. Panitia siap menjawab lewat WhatsApp.', maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Chat panitia PPDB', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp panitia PPDB.' }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Apakah siswa wajib tinggal di asrama?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Pita warna tema dengan ornamen geometris, judul, dan dua tombol.',
    toggleable: true,
    fields: [
      t('title', 'Judul', { placeholder: 'mis. Mari bergabung bersama keluarga besar sekolah kami', maxLength: 100 }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
      t('button_label', 'Teks tombol utama', { placeholder: 'mis. Daftar PPDB', maxLength: 30 }),
      url('button_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian PPDB.' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Tanya panitia', maxLength: 30 }),
      url('secondary_url', 'Tautan tombol kedua', { help: WA_HELP }),
    ],
  },
  {
    key: 'contact',
    label: 'Lokasi & kontak',
    description: 'Alamat, telepon, email, WhatsApp, jam layanan, dan peta Google Maps yang dibuat dari alamat atau kata kunci peta.',
    toggleable: true,
    fields: [
      eyebrow('mis. Lokasi & Kontak'),
      title('mis. Kunjungi kampus kami'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kecamatan, Kota, Provinsi', maxLength: 250 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. SMA IT Nurul Azka Bogor',
        maxLength: 120,
        help: 'Nama sekolah seperti di Google Maps agar penanda peta tepat. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi atau kode sematan dari Google Maps. Dipakai untuk tombol “Buka di Google Maps”.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0251) 7530-417', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'info@sekolah.sch.id', maxLength: 120 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk tombol WhatsApp di halaman dan tombol melayang.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Assalamu’alaikum, saya ingin bertanya tentang sekolah.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat 07.00–15.00 WIB', maxLength: 80 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Logo, deskripsi, menu, kontak singkat, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang sekolah.', maxLength: 240 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Sekolah. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama sekolah.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/school/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
