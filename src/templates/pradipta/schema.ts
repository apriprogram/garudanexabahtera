// Skema CMS Pradipta. Urutan section = urutan halaman: hero slider → akses cepat → statistik → profil, visi & misi →
// sambutan → akademik → ekstrakurikuler → prestasi → fasilitas → berita → pengumuman → agenda → guru → SPMB → testimoni →
// galeri → tanya jawab → lokasi & kontak → footer. Kunci & BENTUK DATA berita, pengumuman, dan agenda sama dengan Bestari/
// Cakrawala/Madani (siap untuk Berita & Pengumuman dari tulisan). Label menyebut "PPDB/SPMB" agar sekolah yang masih
// memakai istilah lama tetap paham. Setiap section selain identitas bisa disembunyikan. Template baru belum punya
// konten tersimpan, jadi tanpa `introduced`.
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

/** Label kecil di atas judul (pil berikon). `menu` = bagian yang punya item menu atas. */
const EYEBROW_HELP = {
  menu: 'Tampil sebagai label kecil berikon di atas judul. Label singkat (≤ 12 huruf, ≤ 2 kata) juga dipakai sebagai nama di menu atas. Kosongkan untuk menyembunyikan label.',
  plain: 'Tampil sebagai label kecil berikon di atas judul. Kosongkan untuk menyembunyikan.',
} as const;
const eyebrow = (placeholder: string, kind: keyof typeof EYEBROW_HELP = 'plain') =>
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP[kind] });
const title = (placeholder: string, maxLength = 90) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (maxLength = 200, placeholder = 'Kalimat pengantar singkat.') => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const DATE_HELP = 'Tulis YYYY-MM-DD (mis. 2026-11-07) agar tampil sebagai "7 Nov 2026", atau teks bebas.';
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #spmb, #program, #berita, #pengumuman, atau #kontak.';

/** Isian teks satu slide hero (slide 1 di hero, slide tambahan di list). */
/** Teks semua slide ditumpuk di kartu yang sama: kartu setinggi teks terpanjang, slide yang jauh lebih pendek berongga. */
const BALANCE_HELP = 'Samakan panjang judul (±35–45 karakter) dan deskripsi (±120–135 karakter) antarslide agar kartu putih tidak berongga.';

const slideFields = (first: boolean): TemplateField[] => {
  const same = first ? undefined : 'Kosongkan untuk memakai isi slide 1.';
  return [
    t('chip', 'Label kecil di kartu judul', {
      placeholder: 'mis. SMA Negeri · Purbolinggo',
      maxLength: 50,
      help: first ? 'Slide 1 berikon penanda lokasi: cocok untuk jenjang dan alamat singkat.' : same,
    }),
    t('title', first ? 'Judul utama (slide 1)' : 'Judul', {
      placeholder: 'mis. Sekolah negeri yang menyalakan rasa ingin tahu',
      maxLength: 80,
      help: first ? `Menjadi judul utama halaman (H1). ${BALANCE_HELP}` : `${same} ${BALANCE_HELP}`,
    }),
    ta('subtitle', 'Deskripsi', {
      placeholder: 'Jelaskan sekolah Anda dalam 1–2 kalimat.',
      maxLength: 200,
      help: first ? 'Juga dipakai sebagai deskripsi situs di hasil pencarian Google; 120–155 karakter paling pas.' : same,
    }),
    t('caption', 'Teks thumbnail slide', { placeholder: 'mis. Profil sekolah', maxLength: 24, help: 'Tampil di bawah foto kecil penunjuk slide.' }),
    t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Profil Sekolah', maxLength: 26, help: same }),
    url('primary_url', 'Tautan tombol utama', { help: first ? `Kosongkan untuk menuju bagian Profil. ${SECTION_LINK_HELP}` : same }),
    t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Informasi SPMB', maxLength: 26, help: same }),
    url('secondary_url', 'Tautan tombol kedua', { help: first ? `Kosongkan untuk menuju bagian SPMB. ${SECTION_LINK_HELP}` : same }),
  ];
};

export const pradiptaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna tema',
    description: 'Nama sekolah, logo, dan satu warna tema. Pita biru langit, garis kartu, label, dan tombol ikut warna ini.',
    fields: [
      t('company_name', 'Nama sekolah', { placeholder: 'mis. SMA Negeri 1 Purbolinggo', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. SMA Negeri di Lampung Timur',
        maxLength: 90,
        help: 'Tampil di judul tab browser (judul di Google) setelah nama sekolah: sebut jenjang dan kabupaten/kotanya.',
      }),
      img('logo', 'Logo sekolah', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol Pradipta dan nama sekolah.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Bawaan biru azure #0077B6. Pilih warna lain atau tulis kode hex sendiri; warna latar lembut, garis, dan teks kecil disesuaikan otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (slider foto latar)',
    description:
      'Foto selebar layar yang berganti otomatis (berhenti saat disorot, difokus, atau dijeda; berhenti sendiri setelah dua putaran). Teks tampil di kartu putih, thumbnail foto menjadi tombol slide.',
    toggleable: true,
    fields: [
      ...slideFields(true),
      img('image', 'Foto slide 1', 'Foto mendatar 16:9, disarankan 1920×1080 px. Di HP dipotong 6:5 dari tengah.'),
      listField('slides', 'Slide tambahan', 'Slide', [img('image', 'Foto', 'Wajib; slide tanpa foto tidak tampil. Mendatar 16:9, 1920×1080 px.'), ...slideFields(false)], 3),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Info SPMB', maxLength: 22, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian PPDB/SPMB.' }),
    ],
  },
  {
    key: 'quicklinks',
    label: 'Akses cepat',
    description: 'Empat ubin besar di bawah hero menuju bagian yang paling dicari atau layanan sekolah (e-learning, PPID). Ikon dipilih otomatis dari judul.',
    toggleable: true,
    fields: [
      t('title', 'Judul untuk pembaca layar', { placeholder: 'mis. Akses cepat', maxLength: 40, help: 'Tidak tampil, dibacakan pembaca layar.' }),
      ta('pending_note', 'Catatan untuk ubin tanpa tautan', {
        maxLength: 200,
        help: 'Ubin yang tautannya belum ada (mis. E-Learning atau PPID) menjadi tombol yang membuka catatan ini. Kosongkan agar ubin itu tampil tanpa tombol.',
      }),
      listField(
        'items',
        'Ubin',
        'Ubin',
        [
          t('title', 'Judul', {
            placeholder: 'mis. SPMB 2027/2028',
            maxLength: 28,
            help: 'Ikon dipilih dari judul: SPMB, berita, pengumuman, agenda, kontak, perpustakaan, e-learning, PPID, legalisir, alumni.',
          }),
          t('text', 'Teks singkat', { maxLength: 80 }),
          url('url', 'Tautan', {
            help: 'Mis. #spmb, #berita, #pengumuman, #kontak, atau tautan luar (e-learning, PPID). Kosongkan untuk menebak dari judul; bila tidak cocok, ubin membuka catatan di atas.',
          }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'stats',
    label: 'Statistik sekolah',
    description: 'Angka di gelembung bulat yang menghitung naik saat terlihat, dengan keterangan periode data.',
    toggleable: true,
    fields: [
      eyebrow('mis. Statistik'),
      title('mis. Sekolah dalam angka'),
      subtitle(),
      t('note', 'Keterangan periode/sumber data', { placeholder: 'mis. Data Tahun Ajaran 2026/2027', maxLength: 120, help: 'Tampil di bawah angka. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 1.048', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Peserta didik', maxLength: 28 }),
          t('note', 'Catatan kecil (opsional)', { placeholder: 'mis. X 360 · XI 352 · XII 336', maxLength: 40 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'about',
    label: 'Profil, visi & misi',
    description: 'Profil singkat, foto, data ringkas, visi, misi bernomor, dan nilai yang ditumbuhkan sekolah.',
    toggleable: true,
    fields: [
      eyebrow('mis. Profil Sekolah', 'menu'),
      ta('title', 'Judul', { placeholder: 'mis. Mengenal sekolah kami', maxLength: 120 }),
      ta('body', 'Profil singkat', { maxLength: 600 }),
      img('image', 'Foto profil', 'Foto tegak 4:5, disarankan 960×1200 px.'),
      listField(
        'facts',
        'Data ringkas',
        'Data',
        [t('label', 'Label', { placeholder: 'mis. Jenjang', maxLength: 24 }), t('value', 'Isi', { placeholder: 'mis. SMA Negeri', maxLength: 48 })],
        4,
      ),
      t('vision_title', 'Judul visi', { placeholder: 'mis. Visi', maxLength: 24 }),
      ta('vision', 'Visi', { maxLength: 220 }),
      t('mission_title', 'Judul misi', { placeholder: 'mis. Misi', maxLength: 24 }),
      listField('mission', 'Misi', 'Misi', [ta('text', 'Butir misi', { maxLength: 140 })], 6),
      t('values_title', 'Judul nilai', { placeholder: 'mis. Nilai yang kami tumbuhkan', maxLength: 60 }),
      listField(
        'values',
        'Nilai',
        'Nilai',
        [t('title', 'Nilai', { placeholder: 'mis. Kolaborasi', maxLength: 32, help: 'Ikon dipilih otomatis dari teks.' }), t('text', 'Penjelasan', { maxLength: 110 })],
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
      title('mis. Selamat datang di sekolah kami'),
      ta('quote', 'Kutipan', { maxLength: 200 }),
      ta('body', 'Isi sambutan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 900 }),
      t('name', 'Nama kepala sekolah', { maxLength: 60 }),
      t('role', 'Jabatan', { placeholder: 'mis. Kepala Sekolah', maxLength: 60 }),
      img('photo', 'Foto kepala sekolah', 'Foto tegak 4:5, disarankan 960×1200 px.'),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Kenali guru kami', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menuju bagian Guru.' }),
    ],
  },
  {
    key: 'programs',
    label: 'Akademik (kelompok mapel pilihan)',
    description: 'Daftar buka-tutup kelompok mata pelajaran pilihan; foto di sampingnya berganti mengikuti kelompok yang dibuka.',
    toggleable: true,
    fields: [
      eyebrow('mis. Akademik', 'menu'),
      title('mis. Kelompok mata pelajaran pilihan'),
      subtitle(240),
      listField(
        'items',
        'Kelompok mapel',
        'Kelompok',
        [
          t('title', 'Nama kelompok', { placeholder: 'mis. Sains & Teknologi', maxLength: 50 }),
          ta('subjects', 'Mata pelajaran', { placeholder: 'mis. Biologi, Kimia, Fisika', maxLength: 220, help: 'Pisahkan dengan koma; tiap mata pelajaran tampil sebagai chip.' }),
          ta('text', 'Penjelasan', { maxLength: 240 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosong → foto kelompok sebelumnya tetap tampil.'),
        ],
        5,
      ),
      ta('note', 'Catatan di bawah daftar', { maxLength: 160 }),
      t('extra_title', 'Kartu tambahan: judul', { placeholder: 'mis. Kokurikuler', maxLength: 40, help: 'Kosongkan untuk menyembunyikan kartu.' }),
      ta('extra_text', 'Kartu tambahan: teks', { maxLength: 220 }),
    ],
  },
  {
    key: 'studentlife',
    label: 'Ekstrakurikuler',
    description: 'Kartu ekstrakurikuler dengan tombol saring per kategori. Ikon dipilih otomatis dari nama.',
    toggleable: true,
    fields: [
      eyebrow('mis. Ekstrakurikuler', 'menu'),
      title('mis. Ruang tumbuh di luar kelas'),
      subtitle(),
      t('all_label', 'Teks tombol semua kategori', { placeholder: 'mis. Semua', maxLength: 16 }),
      listField(
        'items',
        'Ekstrakurikuler',
        'Ekskul',
        [
          t('name', 'Nama', { placeholder: 'mis. Pramuka', maxLength: 40 }),
          t('category', 'Kategori', { placeholder: 'mis. Kepemimpinan', maxLength: 24, help: 'Kategori yang sama dikelompokkan di satu tombol saring.' }),
          t('schedule', 'Jadwal', { placeholder: 'mis. Jumat, 14.00 WIB', maxLength: 40 }),
          ta('text', 'Penjelasan', { maxLength: 140 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk ikon.'),
        ],
        12,
      ),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Jadwal lengkap ekstrakurikuler', maxLength: 36, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk menyembunyikan tombol.' }),
    ],
  },
  {
    key: 'achievements',
    label: 'Prestasi',
    description: 'Linimasa mendatar per tahun (tahun terbaru dulu) yang bisa digeser.',
    toggleable: true,
    fields: [
      eyebrow('mis. Prestasi'),
      title('mis. Jejak prestasi murid'),
      subtitle(),
      t('note', 'Catatan di bawah linimasa', { placeholder: 'mis. Data dari catatan kesiswaan', maxLength: 140 }),
      listField(
        'items',
        'Prestasi',
        'Prestasi',
        [
          t('title', 'Capaian', { placeholder: 'mis. Juara II', maxLength: 30 }),
          t('event', 'Lomba / kegiatan', { maxLength: 90 }),
          t('level', 'Tingkat', { placeholder: 'mis. Kabupaten', maxLength: 20 }),
          t('year', 'Tahun', { placeholder: 'mis. 2026', maxLength: 10, help: 'Prestasi dikelompokkan per tahun.' }),
          t('name', 'Nama murid / tim', { maxLength: 60 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'facilities',
    label: 'Fasilitas',
    description: 'Kartu sarana sekolah: laboratorium, perpustakaan, lapangan, tempat ibadah, sanggar. Ikon dipilih otomatis dari nama; foto opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas'),
      title('mis. Sarana belajar dan berkegiatan'),
      subtitle(),
      listField(
        'items',
        'Fasilitas',
        'Fasilitas',
        [
          t('name', 'Nama', { placeholder: 'mis. Laboratorium IPA', maxLength: 40 }),
          t('text', 'Keterangan singkat', { placeholder: 'mis. Ruang praktikum fisika, kimia, dan biologi.', maxLength: 100 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk ikon.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'news',
    label: 'Berita',
    description: 'Kartu berita berfoto dengan tanggal dan kategori; tombol kategori menyaring berita. "Baca selengkapnya" membuka isi berita di kartu.',
    toggleable: true,
    fields: [
      eyebrow('mis. Berita', 'menu'),
      title('mis. Kabar terbaru dari sekolah', 110),
      subtitle(280),
      t('all_label', 'Teks tombol semua kategori', { placeholder: 'mis. Semua', maxLength: 16 }),
      t('button_label', 'Teks tombol di bawah', { placeholder: 'mis. Berita lainnya di Instagram', maxLength: 36 }),
      url('button_url', 'Tautan tombol di bawah', { help: 'Mis. Instagram atau blog sekolah. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Berita',
        'Berita',
        [
          t('title', 'Judul', { maxLength: 110 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-20', maxLength: 30, help: DATE_HELP }),
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
    description: 'Daftar pengumuman bertanggal; label seperti "Penting" atau "Wajib" ditonjolkan merah lembut.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pengumuman'),
      title('mis. Informasi untuk murid dan orang tua', 80),
      listField(
        'items',
        'Pengumuman',
        'Pengumuman',
        [
          t('title', 'Judul', { maxLength: 100 }),
          t('date', 'Tanggal', { placeholder: 'mis. 2026-10-23', maxLength: 30, help: DATE_HELP }),
          ta('text', 'Isi singkat', { maxLength: 240, help: 'Sebut sasarannya di awal, mis. "Untuk kelas XII."' }),
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
    description: 'Daftar kegiatan dengan ubin kalender (bulan, tanggal, hari) bila tanggal ditulis YYYY-MM-DD.',
    toggleable: true,
    fields: [
      eyebrow('mis. Agenda'),
      title('mis. Kegiatan mendatang', 80),
      listField(
        'items',
        'Agenda',
        'Agenda',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 2026-11-25', maxLength: 30, help: 'Tulis YYYY-MM-DD agar tampil sebagai ubin kalender, atau teks bebas.' }),
          t('title', 'Kegiatan', { maxLength: 90 }),
          t('time', 'Waktu', { placeholder: 'mis. 07.00 WIB', maxLength: 30 }),
          t('place', 'Tempat', { placeholder: 'mis. Aula sekolah', maxLength: 40 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'teachers',
    label: 'Guru & tenaga kependidikan',
    toggleable: true,
    fields: [
      eyebrow('mis. Guru'),
      title('mis. Guru yang mendampingi setiap murid'),
      subtitle(220),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Tanya wali kelas', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp sekolah.' }),
      listField(
        'items',
        'Guru',
        'Guru',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Jabatan / mapel', { placeholder: 'mis. Guru Biologi · Wali kelas XI', maxLength: 60 }),
          img('photo', 'Foto', 'Foto persegi 1:1, disarankan 480×480 px. Kosongkan untuk inisial.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'spmb',
    label: 'PPDB/SPMB (penerimaan murid baru)',
    description:
      'Tab Jalur · Jadwal · Syarat, tautan ke portal SPMB provinsi, dan formulir tanya tiga langkah yang menyusun pesan WhatsApp untuk panitia. Data tidak disimpan di website dan tidak ada pembayaran online.',
    toggleable: true,
    fields: [
      eyebrow('mis. SPMB 2027/2028'),
      title('mis. Penerimaan murid baru tahun ajaran 2027/2028', 110),
      subtitle(280),
      listField('badges', 'Poin singkat', 'Poin', [t('text', 'Teks', { placeholder: 'mis. Tanpa biaya pendaftaran', maxLength: 40 })], 3),
      t('portal_label', 'Teks tombol portal', { placeholder: 'mis. Buka Portal SPMB Provinsi', maxLength: 30, help: 'Kosongkan untuk menyembunyikan tombol.' }),
      url('portal_url', 'Tautan portal SPMB/PPDB', { help: 'Portal SPMB provinsi untuk tahun berjalan. Dibuka di tab baru.' }),
      t('portal_note', 'Catatan di bawah tombol portal', { maxLength: 120 }),
      t('tab_paths', 'Nama tab jalur', { placeholder: 'mis. Jalur', maxLength: 16 }),
      t('tab_schedule', 'Nama tab jadwal', { placeholder: 'mis. Jadwal', maxLength: 16 }),
      t('tab_requirements', 'Nama tab syarat', { placeholder: 'mis. Syarat', maxLength: 16 }),
      listField(
        'paths',
        'Jalur',
        'Jalur',
        [
          t('name', 'Nama jalur', { placeholder: 'mis. Domisili', maxLength: 40 }),
          t('quota', 'Kuota', { placeholder: 'mis. min. 30%', maxLength: 30 }),
          ta('text', 'Penjelasan', { maxLength: 200 }),
        ],
        6,
      ),
      ta('paths_note', 'Catatan jalur', { maxLength: 160 }),
      listField(
        'schedule',
        'Jadwal',
        'Tahap',
        [
          t('date', 'Waktu', { placeholder: 'mis. Juni 2027', maxLength: 40, help: DATE_HELP }),
          t('title', 'Tahap', { placeholder: 'mis. Pendaftaran & verifikasi', maxLength: 50 }),
          ta('text', 'Penjelasan', { maxLength: 140 }),
        ],
        8,
      ),
      ta('schedule_note', 'Catatan jadwal', { maxLength: 160 }),
      listField('requirements', 'Syarat', 'Syarat', [ta('text', 'Syarat', { maxLength: 200 })], 10),
      ta('requirements_note', 'Catatan syarat', { maxLength: 160 }),
      t('form_title', 'Formulir tanya: judul', { placeholder: 'mis. Tanya Panitia SPMB', maxLength: 50 }),
      ta('form_text', 'Formulir tanya: pengantar', { maxLength: 240, help: 'Jelaskan bahwa formulir hanya untuk bertanya dan data tidak disimpan di website.' }),
      listField('topics', 'Topik pertanyaan', 'Topik', [t('name', 'Topik', { placeholder: 'mis. Jalur & kuota', maxLength: 30 })], 6),
      t('form_button', 'Formulir tanya: teks tombol WhatsApp', { placeholder: 'mis. Buka WhatsApp Panitia', maxLength: 30 }),
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp panitia PPDB/SPMB',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Kosongkan untuk memakai WhatsApp sekolah. Tanpa nomor sama sekali, formulir diganti tombol ke bagian Kontak.',
      },
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni orang tua & alumni',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimoni'),
      title('mis. Kata orang tua dan alumni'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Alumni? Isi Tracer Study', maxLength: 36 }),
      url('link_url', 'Tautan', { help: 'Mis. formulir tracer study alumni. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Orang tua murid kelas XI', maxLength: 80 }),
          ta('quote', 'Kutipan', { maxLength: 300 }),
          img('photo', 'Foto', 'Foto persegi 1:1, disarankan 480×480 px. Kosongkan untuk inisial.'),
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
        [img('image', 'Foto', 'Foto pertama tampil paling besar (mendatar 4:3, 1200×900 px); foto lain dipotong otomatis.'), t('caption', 'Keterangan', { maxLength: 80 })],
        8,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya Jawab'),
      title('mis. Pertanyaan yang sering diajukan', 110),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih ada pertanyaan?', maxLength: 50 }),
      ta('help_text', 'Kartu bantuan: teks', { maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp panitia SPMB (atau WhatsApp sekolah).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 500 })], 10),
    ],
  },
  {
    key: 'contact',
    label: 'Lokasi & kontak',
    description: 'Peta Google Maps (dimuat saat digulir), alamat, telepon, email, WhatsApp, dan jam layanan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak', 'menu'),
      title('mis. Kunjungi atau hubungi sekolah'),
      subtitle(280),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kecamatan, Kabupaten, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Purbolinggo, Lampung Timur',
        maxLength: 120,
        help: 'Nama sekolah + kecamatan seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk tautan "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0725) 555-0182', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'info@sekolah.sch.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp sekolah',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol tanya guru & tanya jawab, dan formulir SPMB (bila nomor panitia kosong).',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang sekolah.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Jumat, 07.00–16.00 WIB', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita biru langit berisi ajakan, lalu footer putih: logo, deskripsi, tautan bagian, kontak, dan media sosial.',
    toggleable: true,
    fields: [
      t('band_title', 'Pita atas: judul', { placeholder: 'mis. Informasi SPMB 2027/2028', maxLength: 60, help: 'Kosongkan untuk menyembunyikan pita.' }),
      ta('band_text', 'Pita atas: teks', { maxLength: 180 }),
      t('band_label', 'Pita atas: teks tombol', { placeholder: 'mis. Lihat Info SPMB', maxLength: 28 }),
      url('band_url', 'Pita atas: tautan tombol', { help: 'Kosongkan untuk menuju bagian PPDB/SPMB.' }),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang sekolah Anda.', maxLength: 220 }),
      ta('note', 'Catatan kecil di bawah', { placeholder: 'mis. Catatan atau penafian singkat.', maxLength: 200 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Sekolah.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama sekolah.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
