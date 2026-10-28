// Skema CMS MediCare General. Urutan section = urutan halaman: hero (foto + tiga ubin aksi) → layanan → pendaftaran
// online → jadwal dokter → poliklinik & penunjang → IGD 24 jam (pita merah) → rawat inap → asuransi & BPJS → tanya jawab
// → kontak → footer. Setiap section bisa disembunyikan. Semua teks demo yang tampil bisa diubah di sini, kecuali label
// formulir, nama hari, dan judul kolom tabel. Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
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
const phone = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({
  type: 'phone',
  key,
  label,
  placeholder: 'mis. 081234567890',
  maxLength: 20,
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

const EYEBROW_HELP = 'Tampil dengan garis biru kecil di atas judul. Label singkat (≤ 14 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 90) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #pendaftaran, #jadwal, #poliklinik, #igd, #rawat-inap, #asuransi, atau #kontak.';
const steps = (key: string, label: string, max: number): TemplateListField =>
  listField(
    key,
    label,
    'Langkah',
    [t('title', 'Judul langkah', { placeholder: 'mis. Bawa surat rujukan', maxLength: 40 }), ta('text', 'Penjelasan', { maxLength: 120 })],
    max,
  );

export const medicareSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama rumah sakit, logo, dan satu warna tema. Warna footer dibuat otomatis dari warna ini. Merah darurat (IGD) tetap.',
    fields: [
      t('company_name', 'Nama rumah sakit', { placeholder: 'mis. RS MediCare General', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Rumah Sakit Umum di Semarang',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama rumah sakit; nama + tagline paling pas ≤ 60 huruf, sebut kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol bawaan dan nama rumah sakit.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna tema',
        help: 'Bawaan biru #0B63C9. Dipakai tombol, ikon, dan tautan; warna teks di atasnya dipilih otomatis agar tetap terbaca. Merah IGD tidak ikut berubah.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto & ubin aksi)',
    description: 'Foto latar selebar layar, judul, deskripsi, dua tombol, dan tiga ubin aksi: dua ubin biasa dan satu ubin IGD merah dengan nomor telepon.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Rumah sakit umum · Semarang', maxLength: 50 }),
      t('title', 'Judul utama', {
        placeholder: 'mis. Berobat lebih tenang, dari daftar sampai pulang',
        maxLength: 70,
        help: 'Paling bagus ≤ 9 kata.',
      }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. lebih tenang', maxLength: 40, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan rumah sakit Anda dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Cari Poliklinik', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju bagian Poliklinik. ${LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Info BPJS & Asuransi', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Asuransi & BPJS.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Daftar Online', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju formulir pendaftaran.' }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1920×1080 px, terang (lobi, selasar, atau gedung). Sisi kiri tertutup lapisan putih: letakkan subjek di kanan.'),
      listField(
        'tiles',
        'Ubin aksi',
        'Ubin',
        [
          t('title', 'Judul ubin', { placeholder: 'mis. Daftar Online', maxLength: 28, help: 'Ikon dipilih otomatis dari judul (daftar, jadwal, poli, dll.).' }),
          t('text', 'Keterangan', { placeholder: 'mis. Pilih poli dan dokter.', maxLength: 70 }),
          url('url', 'Tautan', { help: `Kosongkan untuk menuju formulir pendaftaran (ubin 1) atau jadwal dokter (ubin 2). ${LINK_HELP}` }),
        ],
        2,
      ),
      t('igd_title', 'Ubin IGD: judul', { placeholder: 'mis. IGD 24 Jam', maxLength: 24, help: 'Nomor telepon diambil dari "Telepon IGD" di bagian Kontak.' }),
      t('igd_text', 'Ubin IGD: keterangan', { placeholder: 'mis. Gawat darurat? Telepon sekarang.', maxLength: 60 }),
    ],
  },
  {
    key: 'services',
    label: 'Layanan',
    description: 'Ubin layanan dengan ikon besar yang dipilih otomatis dari nama layanan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Layanan'),
      title('mis. Layanan utama dalam satu tempat'),
      subtitle(),
      listField(
        'items',
        'Layanan',
        'Layanan',
        [
          t('title', 'Nama layanan', { placeholder: 'mis. Rawat jalan', maxLength: 40, help: 'Ikon dipilih otomatis dari nama (IGD, rawat inap, laboratorium, radiologi, farmasi, dll.).' }),
          ta('text', 'Keterangan', { placeholder: 'Satu kalimat pendek.', maxLength: 120 }),
          url('url', 'Tautan (opsional)', { help: `Kosongkan bila ubin tidak perlu ditautkan. ${LINK_HELP}` }),
        ],
        9,
      ),
    ],
  },
  {
    key: 'registration',
    label: 'Pendaftaran online',
    description:
      'Formulir 3 langkah (poli & dokter, data pasien, jadwal kunjungan) yang menyusun pesan WhatsApp ke petugas pendaftaran. Data pasien tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pendaftaran online'),
      title('mis. Daftar berobat dalam 3 langkah'),
      subtitle(),
      t('prepare_title', 'Judul daftar persiapan', { placeholder: 'mis. Siapkan sebelum datang', maxLength: 50 }),
      listField('prepare', 'Daftar persiapan', 'Butir', [t('item', 'Butir', { placeholder: 'mis. KTP atau kartu identitas lain', maxLength: 80 })], 6),
      img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px (mis. meja pendaftaran). Kosongkan untuk menyembunyikan.'),
      ta('emergency_note', 'Catatan darurat di atas formulir', {
        placeholder: 'mis. Keadaan darurat? Jangan daftar online. Langsung ke IGD atau telepon 119.',
        maxLength: 160,
      }),
      ta('form_note', 'Keterangan di bawah tombol', { maxLength: 220, help: 'Sebutkan bahwa data pasien tidak disimpan di website.' }),
      t('form_button', 'Teks tombol kirim', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
    ],
  },
  {
    key: 'doctors',
    label: 'Jadwal dokter',
    description:
      'Tabel jadwal yang bisa disaring per poli dan per hari, dengan tombol "Daftar" yang mengisi formulir pendaftaran. Dokter tampil dengan inisial, tanpa foto.',
    toggleable: true,
    fields: [
      eyebrow('mis. Jadwal dokter'),
      title('mis. Cari dokter dan jam praktiknya'),
      subtitle(),
      ta('note', 'Catatan di bawah tabel', { placeholder: 'mis. Jadwal bisa berubah. Petugas mengonfirmasi saat membalas.', maxLength: 160 }),
      listField(
        'items',
        'Dokter',
        'Dokter',
        [
          t('name', 'Nama & gelar', { placeholder: 'mis. dr. Laras Anindita, Sp.A', maxLength: 60 }),
          t('poli', 'Poli', { placeholder: 'mis. Poli Anak', maxLength: 40, help: 'Tulis sama dengan nama poli di bagian Poliklinik agar saringan cocok.' }),
          t('days', 'Hari praktik', {
            placeholder: 'mis. Senin, Rabu, Jumat',
            maxLength: 60,
            help: 'Pisahkan dengan koma, atau rentang seperti "Senin–Sabtu". Nama hari dipakai untuk saringan hari.',
          }),
          t('hours', 'Jam praktik', { placeholder: 'mis. 08.00–12.00', maxLength: 30 }),
        ],
        30,
      ),
    ],
  },
  {
    key: 'clinics',
    label: 'Poliklinik & penunjang',
    description: 'Angka ringkas, kisi poliklinik dengan lokasinya (ikon otomatis dari nama), lalu kartu foto penunjang medis.',
    toggleable: true,
    fields: [
      eyebrow('mis. Poliklinik'),
      title('mis. 12 poliklinik dalam satu gedung'),
      subtitle(),
      listField(
        'stats',
        'Angka ringkas',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 12', maxLength: 10 }), t('label', 'Keterangan', { placeholder: 'mis. Poliklinik', maxLength: 30 })],
        3,
      ),
      listField(
        'items',
        'Poliklinik',
        'Poli',
        [
          t('name', 'Nama poli', { placeholder: 'mis. Poli Anak', maxLength: 40 }),
          t('location', 'Lokasi', { placeholder: 'mis. Gedung A · Lantai 1', maxLength: 50 }),
        ],
        16,
      ),
      t('support_title', 'Judul penunjang medis', { placeholder: 'mis. Penunjang medis', maxLength: 40 }),
      listField(
        'support',
        'Penunjang medis',
        'Penunjang',
        [
          t('title', 'Nama', { placeholder: 'mis. Laboratorium', maxLength: 40 }),
          ta('text', 'Keterangan', { maxLength: 120 }),
          t('hours', 'Jam buka', { placeholder: 'mis. Buka 24 jam', maxLength: 30 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menampilkan ikon.'),
        ],
        4,
      ),
    ],
  },
  {
    key: 'emergency',
    label: 'IGD 24 jam',
    description: 'Pita merah selebar layar dengan garis detak jantung, nomor IGD besar, tombol telepon IGD & ambulans, catatan 119, foto, dan langkah saat darurat.',
    toggleable: true,
    fields: [
      eyebrow('mis. IGD 24 jam'),
      title('mis. Gawat darurat? Segera ke IGD', 80),
      subtitle(),
      t('call_label', 'Teks tombol telepon IGD', { placeholder: 'mis. Telepon IGD', maxLength: 30, help: 'Nomor diambil dari "Telepon IGD" di bagian Kontak.' }),
      t('ambulance_label', 'Teks tombol ambulans', { placeholder: 'mis. Ambulans', maxLength: 30, help: 'Nomor diambil dari "Telepon ambulans" di bagian Kontak; kosong → tombol disembunyikan.' }),
      ta('note', 'Catatan', { placeholder: 'mis. Nomor darurat nasional: 119.', maxLength: 160 }),
      img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px (mis. ambulans atau pintu IGD). Kosongkan untuk menyembunyikan.'),
      listField(
        'steps',
        'Langkah saat darurat',
        'Langkah',
        [t('title', 'Judul langkah', { placeholder: 'mis. Telepon IGD', maxLength: 40 }), ta('text', 'Penjelasan', { maxLength: 100 })],
        4,
      ),
    ],
  },
  {
    key: 'inpatient',
    label: 'Rawat inap',
    description: 'Tab per kelas kamar (foto, kapasitas, fasilitas) dan kotak jam besuk.',
    toggleable: true,
    fields: [
      eyebrow('mis. Rawat inap'),
      title('mis. Pilih kelas kamar yang sesuai'),
      subtitle(),
      listField(
        'items',
        'Kelas kamar',
        'Kelas',
        [
          t('name', 'Nama kelas', { placeholder: 'mis. VIP', maxLength: 24 }),
          t('capacity', 'Kapasitas', { placeholder: 'mis. 1 pasien per kamar', maxLength: 50 }),
          ta('facilities', 'Fasilitas', { placeholder: 'mis. Kamar mandi dalam · AC · TV', maxLength: 160, help: 'Pisahkan dengan · atau koma; tiap butir tampil dengan tanda centang.' }),
          img('image', 'Foto kamar', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
        ],
        6,
      ),
      t('visiting_title', 'Judul jam besuk', { placeholder: 'mis. Jam besuk', maxLength: 30 }),
      t('visiting_hours', 'Jam besuk', { placeholder: 'mis. Setiap hari 11.00–13.00 dan 17.00–20.00', maxLength: 80 }),
      listField('visiting_rules', 'Aturan besuk', 'Aturan', [t('text', 'Aturan', { placeholder: 'mis. Paling banyak 2 pengunjung per pasien.', maxLength: 100 })], 4),
    ],
  },
  {
    key: 'insurance',
    label: 'Asuransi & BPJS',
    description: 'Tiga tab: alur pasien BPJS, daftar asuransi & perusahaan penjamin, dan alur pasien umum.',
    toggleable: true,
    fields: [
      eyebrow('mis. Asuransi & BPJS'),
      title('mis. Pasien BPJS, asuransi, dan umum'),
      subtitle(),
      t('bpjs_label', 'Tab 1: nama', { placeholder: 'mis. Pasien BPJS', maxLength: 24 }),
      steps('bpjs_steps', 'Tab 1: langkah', 5),
      ta('bpjs_note', 'Tab 1: catatan', { maxLength: 160 }),
      t('insurers_label', 'Tab 2: nama', { placeholder: 'mis. Asuransi & perusahaan', maxLength: 28 }),
      ta('insurers_intro', 'Tab 2: keterangan', { maxLength: 160 }),
      listField('insurers', 'Tab 2: penjamin', 'Penjamin', [t('name', 'Nama asuransi / perusahaan', { maxLength: 50 })], 24),
      t('general_label', 'Tab 3: nama', { placeholder: 'mis. Pasien umum', maxLength: 24 }),
      steps('general_steps', 'Tab 3: langkah', 5),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya bagian admisi lewat WhatsApp', maxLength: 40 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya jawab'),
      title('mis. Pertanyaan yang sering diajukan'),
      subtitle('mis. Belum terjawab? Tanyakan ke bagian informasi.'),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })],
        8,
      ),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & IGD',
    description:
      'Kartu kontak darurat (IGD, ambulans, 119), kartu informasi & pendaftaran, foto gedung, dan peta Google Maps. Nomor IGD juga dipakai di strip merah atas, ubin IGD, dan pita IGD.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Hubungi kami'),
      subtitle(),
      t('emergency_title', 'Judul kartu darurat', { placeholder: 'mis. Kontak darurat', maxLength: 40 }),
      t('info_title', 'Judul kartu informasi', { placeholder: 'mis. Informasi & pendaftaran', maxLength: 40 }),
      t('igd_label', 'Label IGD', { placeholder: 'mis. IGD 24 jam', maxLength: 24, help: 'Tampil di strip merah paling atas.' }),
      phone('igd_phone', 'Telepon IGD', { help: 'Tampil di strip merah atas, ubin IGD hero, dan pita IGD.' }),
      phone('ambulance_phone', 'Telepon ambulans', { help: 'Kosongkan bila tidak ada.' }),
      phone('phone', 'Telepon informasi'),
      phone('whatsapp', 'WhatsApp', { help: 'Dipakai tombol WhatsApp melayang, formulir pendaftaran, dan tautan tanya jawab.' }),
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang layanan rumah sakit.', maxLength: 160 }),
      { type: 'email', key: 'email', label: 'Email', placeholder: 'informasi@rumahsakit.co.id', maxLength: 120 },
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Poliklinik: Senin–Jumat 07.00–21.00', maxLength: 120 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. RS Contoh, Semarang',
        maxLength: 120,
        help: 'Nama rumah sakit + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      img('image', 'Foto gedung (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita biru tua: logo, deskripsi, catatan legal, menu, kontak (IGD), media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang rumah sakit Anda.', maxLength: 220 }),
      ta('note', 'Catatan legal', {
        placeholder: 'mis. Nomor izin operasional dan status akreditasi rumah sakit.',
        maxLength: 200,
        help: 'Isi hanya sesuai dokumen yang benar-benar dimiliki rumah sakit Anda.',
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Rumah Sakit', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama rumah sakit.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
