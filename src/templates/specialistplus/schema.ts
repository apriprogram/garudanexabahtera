// Skema CMS SpecialistPlus. Urutan section = urutan halaman: hero konsol → spesialis (tab + jadwal dokter) → paket MCU
// (tabel perbandingan) → hasil lab (pita navy + formulir) → teknologi alat → waktu hasil → testimoni → tanya jawab →
// kontak → footer. Kunci umum (brand, hero, testimonials, faq, contact, footer) sama artinya dengan template lain;
// `specialists`, `mcu`, `labresults`, `technology`, dan `turnaround` milik SpecialistPlus. Setiap section bisa
// disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
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

const EYEBROW_HELP =
  'Tampil sebagai kode bagian, mis. "SPX-02 · MCU". Label singkat (≤ 14 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan kode.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label bagian', { placeholder, maxLength: 30, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 90) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #spesialis, #mcu, #hasil-lab, atau #kontak.';
const SPLIT_HELP = 'Pisahkan dengan · atau koma; tiap bagian jadi satu label.';

export const specialistplusSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama klinik, logo, dan satu warna aksen. Warna navy header, hero, pita hasil lab, dan footer diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama klinik', { placeholder: 'mis. SpecialistPlus Medical Center', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Klinik Spesialis & Lab Medan',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama klinik; nama + tagline paling pas ≤ 60 huruf, sebut layanan dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol SpecialistPlus bawaan dan nama klinik.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan teal #0E8F8A. Dipakai tombol, tab aktif, tanda centang, dan batang waktu hasil; warna navy dan versi terang untuk teks di atasnya dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (konsol data)',
    description:
      'Foto latar selebar layar, judul, deskripsi, dua tombol, dan panel konsol: pilih spesialis → jumlah dokter, hari praktik, jadwal terdekat, plus tiga angka.',
    toggleable: true,
    fields: [
      t('label_code', 'Kode di depan label bagian', {
        placeholder: 'mis. SPX',
        maxLength: 6,
        help: 'Tampil di depan nomor setiap label bagian, mis. "SPX-02 · MCU". Kosongkan untuk nomor saja.',
      }),
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Pusat spesialis · Laboratorium · Radiologi', maxLength: 60 }),
      t('title', 'Judul utama', {
        placeholder: 'mis. Spesialis, lab, dan radiologi dalam satu pusat',
        maxLength: 80,
        help: 'Paling bagus ≤ 9 kata.',
      }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. satu pusat', maxLength: 40, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan layanan klinik dalam 1 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Pilih Spesialis', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju bagian Spesialis. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Paket MCU', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: `Kosongkan untuk menuju bagian Paket MCU. ${SECTION_LINK_HELP}` }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Daftar Konsultasi', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian Spesialis.' }),
      img('image', 'Foto latar hero', 'Foto mendatar 16:9, disarankan 1920×1080 px, nuansa dingin/terang. Tampil di belakang teks dengan lapisan navy; di HP hanya bagian tengah.'),
      t('console_title', 'Konsol: judul', { placeholder: 'mis. Cari jadwal spesialis', maxLength: 40 }),
      t('console_button', 'Konsol: teks tombol', { placeholder: 'mis. Lihat jadwal dokter', maxLength: 28 }),
      t('console_note', 'Konsol: catatan kecil', {
        placeholder: 'mis. Jadwal contoh. Konfirmasi slot lewat WhatsApp.',
        maxLength: 90,
        help: 'Ingatkan pengunjung bahwa jadwal dikonfirmasi admin.',
      }),
      listField(
        'stats',
        'Angka di konsol',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 120+', maxLength: 10 }),
          t('unit', 'Satuan', { placeholder: 'mis. jenis', maxLength: 10 }),
          t('label', 'Keterangan', { placeholder: 'mis. Pemeriksaan lab', maxLength: 28 }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'specialists',
    label: 'Spesialis & jadwal dokter',
    description:
      'Tab per klinik spesialis (kondisi, tindakan, foto) dan tabel jadwal dokter dengan tombol daftar yang menyusun pesan WhatsApp. Dokter dikelompokkan lewat kolom "Klinik".',
    toggleable: true,
    fields: [
      eyebrow('mis. Spesialis'),
      title('mis. Pilih klinik spesialis'),
      subtitle(),
      t('register_label', 'Teks tombol daftar per dokter', { placeholder: 'mis. Daftar', maxLength: 16 }),
      ta('table_note', 'Catatan di bawah jadwal', { placeholder: 'mis. Jadwal contoh dan dapat berubah.', maxLength: 120 }),
      listField(
        'items',
        'Klinik spesialis',
        'Klinik',
        [
          t('tab', 'Nama tab', { placeholder: 'mis. Jantung', maxLength: 18, help: 'Nama singkat; tulis sama persis di kolom "Klinik" setiap dokter.' }),
          t('name', 'Nama lengkap klinik', { placeholder: 'mis. Jantung & Pembuluh Darah', maxLength: 48 }),
          t('code', 'Kode', { placeholder: 'mis. JTG', maxLength: 4, help: '2-4 huruf, tampil di tab.' }),
          ta('summary', 'Ringkasan', { maxLength: 140 }),
          t('conditions', 'Kondisi yang ditangani', { placeholder: 'mis. Hipertensi · Nyeri dada', maxLength: 140, help: SPLIT_HELP }),
          t('procedures', 'Pemeriksaan & tindakan', { placeholder: 'mis. EKG · Ekokardiografi', maxLength: 140, help: SPLIT_HELP }),
          t('next_slot', 'Jadwal terdekat (di konsol hero)', { placeholder: 'mis. Selasa, 13.00', maxLength: 30 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
        ],
        8,
      ),
      listField(
        'doctors',
        'Jadwal dokter',
        'Dokter',
        [
          t('name', 'Nama & gelar', { placeholder: 'mis. dr. Nama Dokter, Sp.JP', maxLength: 60 }),
          t('clinic', 'Klinik', { placeholder: 'mis. Jantung', maxLength: 18, help: 'Sama persis dengan nama tab klinik.' }),
          t('days', 'Hari praktik', { placeholder: 'mis. Sen · Rab · Jum', maxLength: 40, help: 'Singkatan hari: Sen, Sel, Rab, Kam, Jum, Sab, Min.' }),
          t('hours', 'Jam', { placeholder: 'mis. 08.00–12.00', maxLength: 24 }),
          t('room', 'Ruang', { placeholder: 'mis. Lt. 2 · R-201', maxLength: 24 }),
        ],
        24,
      ),
    ],
  },
  {
    key: 'mcu',
    label: 'Paket medical check-up',
    description:
      'Tabel perbandingan paket (kolom) dan pemeriksaan (baris) dengan tanda centang, harga, dan tombol pesan yang menyusun pesan WhatsApp. Di HP tampil sebagai kartu bertumpuk.',
    toggleable: true,
    fields: [
      eyebrow('mis. MCU'),
      title('mis. Bandingkan paket medical check-up'),
      subtitle(),
      t('order_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan paket', maxLength: 20 }),
      ta('note', 'Catatan di bawah tabel', { placeholder: 'mis. Harga contoh. Puasa 10–12 jam.', maxLength: 140 }),
      listField(
        'packages',
        'Paket',
        'Paket',
        [
          t('code', 'Kode paket', { placeholder: 'mis. A', maxLength: 2, help: '1 huruf; dipakai di kolom "Paket" setiap pemeriksaan.' }),
          t('name', 'Nama paket', { placeholder: 'mis. Eksekutif', maxLength: 28 }),
          t('price', 'Harga', { placeholder: 'mis. Rp1.750.000', maxLength: 16 }),
          t('audience', 'Untuk siapa', { placeholder: 'mis. Usia 35 tahun ke atas', maxLength: 48 }),
          t('duration', 'Durasi', { placeholder: 'mis. ± 3 jam', maxLength: 16 }),
          t('badge', 'Label sorotan (opsional)', { placeholder: 'mis. Disarankan usia 40+', maxLength: 28 }),
        ],
        4,
      ),
      listField(
        'rows',
        'Pemeriksaan',
        'Pemeriksaan',
        [
          t('label', 'Nama pemeriksaan', { placeholder: 'mis. Rontgen dada', maxLength: 48 }),
          t('packages', 'Termasuk di paket', { placeholder: 'mis. A · B · C', maxLength: 16, help: 'Tulis kode paket yang mencakup pemeriksaan ini.' }),
        ],
        16,
      ),
    ],
  },
  {
    key: 'labresults',
    label: 'Hasil lab online',
    description:
      'Pita navy: tiga langkah, catatan privasi, formulir permintaan hasil lab (no. registrasi, tanggal lahir, nama) yang menyusun pesan WhatsApp, dan tautan opsional ke portal pasien milik Anda. Data tidak disimpan dan hasil lab tidak ditampilkan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Hasil lab'),
      title('mis. Minta hasil lab tanpa antre'),
      subtitle(),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [t('title', 'Judul langkah', { maxLength: 40 }), ta('text', 'Penjelasan', { maxLength: 110 })],
        3,
      ),
      ta('notice', 'Catatan privasi', {
        maxLength: 200,
        help: 'Tampil di bawah langkah dan formulir. Sebutkan bahwa hasil lab tidak ditampilkan dan data tidak disimpan di website.',
      }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Permintaan hasil lab', maxLength: 40 }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 28 }),
      t('portal_text', 'Portal: kalimat', { placeholder: 'mis. Sudah punya akun portal pasien?', maxLength: 60 }),
      t('portal_label', 'Portal: teks tautan', { placeholder: 'mis. Buka portal pasien', maxLength: 32 }),
      url('portal_url', 'Portal: alamat', {
        help: 'Alamat portal hasil lab milik Anda (https). Dibuka di tab baru tanpa membawa data formulir. Kosongkan untuk menyembunyikan.',
      }),
    ],
  },
  {
    key: 'technology',
    label: 'Teknologi alat',
    description: 'Kartu spesifikasi alat (foto, kode, nama, satu kalimat, dan baris spesifikasi). Tulis nama alat secara umum, tanpa merek.',
    toggleable: true,
    fields: [
      eyebrow('mis. Teknologi'),
      title('mis. Alat diagnostik di satu gedung'),
      subtitle(),
      listField(
        'items',
        'Alat',
        'Alat',
        [
          t('code', 'Kode', { placeholder: 'mis. MRI', maxLength: 5 }),
          t('name', 'Nama alat', { placeholder: 'mis. MRI 1,5 Tesla', maxLength: 40 }),
          ta('text', 'Kalimat singkat', { maxLength: 120 }),
          ta('specs', 'Spesifikasi', {
            placeholder: 'Durasi: 20–45 menit\nLokasi: Lt. 1 · Radiologi',
            maxLength: 200,
            help: 'Satu baris per spesifikasi, format "Label: nilai" (maks. 4 baris).',
          }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'turnaround',
    label: 'Waktu hasil',
    description: 'Batang horizontal per pemeriksaan, dikelompokkan (mis. Laboratorium dalam jam, Radiologi dalam hari). Panjang batang dibandingkan dalam kelompok yang sama.',
    toggleable: true,
    fields: [
      eyebrow('mis. Waktu hasil'),
      title('mis. Perkiraan waktu hasil pemeriksaan'),
      subtitle(),
      ta('note', 'Catatan di bawah batang', { placeholder: 'mis. Perkiraan; kasus tertentu bisa lebih lama.', maxLength: 160 }),
      listField(
        'items',
        'Pemeriksaan',
        'Pemeriksaan',
        [
          t('name', 'Nama pemeriksaan', { placeholder: 'mis. Darah lengkap', maxLength: 40 }),
          t('group', 'Kelompok', { placeholder: 'mis. Laboratorium', maxLength: 30, help: 'Pemeriksaan dengan kelompok sama tampil di satu panel; pakai satuan yang sama.' }),
          t('value', 'Waktu (angka)', { placeholder: 'mis. 6', maxLength: 6 }),
          t('unit', 'Satuan', { placeholder: 'mis. jam', maxLength: 8 }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni pasien',
    description: 'Kartu kutipan dengan nama depan, kota, dan layanan. Tanpa foto (inisial). Minta izin pasien sebelum menampilkan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimoni'),
      title('mis. Kata pasien kami'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama depan', { maxLength: 30 }),
          t('city', 'Kota', { maxLength: 30 }),
          t('service', 'Layanan', { placeholder: 'mis. MCU Eksekutif', maxLength: 30 }),
          ta('quote', 'Kutipan', { maxLength: 220 }),
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
      eyebrow('mis. FAQ'),
      title('mis. Pertanyaan umum'),
      subtitle('mis. Belum terjawab? Tanyakan langsung ke admin kami.'),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & lokasi',
    description: 'Baris kontak, jam layanan per unit, catatan darurat, foto gedung, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Lokasi & pendaftaran'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Medan Selayang, Medan',
        maxLength: 120,
        help: 'Nama klinik + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon pendaftaran', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'pendaftaran@klinik.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol daftar dokter, pesan paket MCU, dan formulir hasil lab.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang jadwal dokter.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Sabtu 07.00–20.00 WIB', maxLength: 90 }),
      listField(
        'units',
        'Jam layanan per unit',
        'Unit',
        [t('label', 'Unit', { placeholder: 'mis. Laboratorium', maxLength: 30 }), t('value', 'Jam', { placeholder: 'mis. Setiap hari 06.30–21.00', maxLength: 40 })],
        6,
      ),
      ta('emergency', 'Catatan darurat', {
        maxLength: 200,
        help: 'Tampil dengan tombol telepon 119. Bila klinik Anda bukan IGD, katakan dengan jelas.',
      }),
      img('image', 'Foto gedung / lobi (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita navy: logo, deskripsi, menu, daftar klinik, kontak, media sosial, catatan medis, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang klinik Anda.', maxLength: 220 }),
      ta('disclaimer', 'Catatan di bawah footer', {
        placeholder: 'mis. Informasi di website ini bukan pengganti konsultasi dokter.',
        maxLength: 220,
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Klinik', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama klinik.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
