// Skema CMS MomKid Hospital. Urutan section = urutan halaman: hero cradle → perjalanan (tab 3 tahap) → paket persalinan
// (pilihan kamar) → jadwal imunisasi (pita mint) → dokter anak → klinik laktasi → tur kamar bersalin → artikel parenting
// → testimoni → tanya jawab → ajakan (pita peach) → kontak & formulir pendaftaran → footer mint. Setiap section bisa
// disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa `introduced`. Label formulir, "mulai",
// "Berikutnya", dan nama hari tetap (bukan isian CMS).
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

const EYEBROW_HELP = 'Tampil sebagai label pil mint di atas judul. Label singkat (≤ 14 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 30, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 80) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar yang singkat.', maxLength = 160) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #paket, #imunisasi, #dokter-anak, #laktasi, #tur, atau #kontak.';
const LIST_HELP = 'Pisahkan dengan titik tengah (·) atau koma; tiap bagian jadi satu chip.';

export const momkidSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama rumah sakit, logo, dan satu warna aksen. Warna pastel kartu dan pita ajakan diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama rumah sakit / klinik', { placeholder: 'mis. RSIA MomKid', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Rumah Sakit Ibu & Anak Tangerang Selatan',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf, sebut layanan dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol MomKid bawaan dan nama rumah sakit.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan peach #E8826A. Dipakai tombol, titik jadwal, dan kartu pastel; warna teks yang tetap terbaca dibuat otomatis.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto latar)',
    description: 'Foto selebar layar dengan lapisan peach dari kiri dan tepi bawah bergelombang: label, judul, deskripsi, dua tombol, catatan kecil, dan hingga 3 chip pastel di atas foto.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. RSIA · Tangerang Selatan', maxLength: 40 }),
      t('title', 'Judul utama', { placeholder: 'mis. Tempat hangat untuk Bunda dan si kecil', maxLength: 70, help: 'Paling bagus ≤ 9 kata.' }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. hangat', maxLength: 30, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan layanan Anda dalam 1 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Lihat Paket Persalinan', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju bagian Paket persalinan. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Konsultasi Dokter Anak', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju bagian Dokter anak.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Daftar Kunjungan', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju formulir di bagian Kontak.' }),
      t('note', 'Catatan kecil di bawah tombol', { placeholder: 'mis. IGD ibu & anak buka 24 jam', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      img(
        'image',
        'Foto hero',
        'Foto mendatar 16:9, disarankan 1920×1080 px. Letakkan subjek (ibu & bayi) di sepertiga KANAN foto: sisi kiri tertutup lapisan peach untuk teks.',
      ),
      listField(
        'chips',
        'Chip di atas foto',
        'Chip',
        [
          t('label', 'Teks chip', { placeholder: 'mis. Klinik laktasi', maxLength: 22 }),
          url('url', 'Tautan chip (opsional)', { help: `Kosongkan untuk chip tanpa tautan. ${SECTION_LINK_HELP}` }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'journey',
    label: 'Perjalanan (tahap layanan)',
    description: 'Tab bertahap (mis. Kehamilan → Persalinan → Tumbuh kembang): tiap tahap punya foto, judul, penjelasan, chip layanan, dan satu tautan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Perjalanan Bunda'),
      title('mis. Didampingi dari kehamilan sampai si kecil tumbuh'),
      subtitle(),
      listField(
        'stages',
        'Tahap',
        'Tahap',
        [
          t('name', 'Nama tahap (tab)', { placeholder: 'mis. Kehamilan', maxLength: 20, help: 'Ikon tab dipilih otomatis dari nama.' }),
          t('period', 'Keterangan waktu', { placeholder: 'mis. Trimester 1–3', maxLength: 24 }),
          t('title', 'Judul tahap', { placeholder: 'mis. Kontrol rutin yang tenang', maxLength: 60 }),
          ta('text', 'Penjelasan', { maxLength: 160 }),
          t('services', 'Layanan (chip)', { placeholder: 'mis. Kontrol kehamilan · USG · Kelas ibu hamil', maxLength: 220, help: LIST_HELP }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
          t('link_label', 'Teks tautan', { placeholder: 'mis. Lihat paket persalinan', maxLength: 28 }),
          url('link_url', 'Tujuan tautan', { help: `Kosongkan untuk menuju formulir di bagian Kontak. ${SECTION_LINK_HELP}` }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'packages',
    label: 'Paket persalinan',
    description: 'Kartu paket dengan harga "mulai" untuk dua pilihan kamar (tombol pilih kamar di atas kartu), isi paket, lama rawat, dan tombol tanya ke WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Paket persalinan'),
      title('mis. Paket persalinan yang jelas sejak awal'),
      subtitle(),
      t('option_a', 'Pilihan kamar pertama', { placeholder: 'mis. Kamar Kelas 1', maxLength: 24 }),
      t('option_b', 'Pilihan kamar kedua (opsional)', { placeholder: 'mis. Kamar VIP', maxLength: 24, help: 'Kosongkan bila hanya ada satu harga; tombol pilih kamar disembunyikan.' }),
      t('button_label', 'Teks tombol di kartu', { placeholder: 'mis. Tanya paket ini', maxLength: 24 }),
      ta('note', 'Catatan harga', { placeholder: 'mis. Harga mulai, biaya akhir mengikuti kondisi medis.', maxLength: 220 }),
      listField(
        'items',
        'Paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Normal', maxLength: 30 }),
          t('summary', 'Keterangan singkat', { maxLength: 90 }),
          t('price_a', 'Harga mulai (kamar pertama)', { placeholder: 'mis. Rp6,5 jt', maxLength: 16 }),
          t('price_b', 'Harga mulai (kamar kedua)', { placeholder: 'mis. Rp9,8 jt', maxLength: 16 }),
          t('stay', 'Lama rawat', { placeholder: 'mis. Rawat 2 hari', maxLength: 24 }),
          t('badge', 'Label sorotan (opsional)', { placeholder: 'mis. Paling lengkap', maxLength: 22, help: 'Kartu berlabel tampil mint.' }),
          ta('inclusions', 'Isi paket', { maxLength: 300, help: 'Pisahkan dengan titik tengah (·); maks. 6 butir tampil.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'immunization',
    label: 'Jadwal imunisasi',
    description: 'Pita mint berisi garis waktu umur 0-18 bulan dengan chip vaksin; pengunjung memilih umur si kecil untuk menyorot jadwal berikutnya. Selalu disertai catatan "ringkasan".',
    toggleable: true,
    fields: [
      eyebrow('mis. Imunisasi'),
      title('mis. Jadwal imunisasi si kecil'),
      subtitle(),
      t('select_label', 'Label pilihan umur', { placeholder: 'mis. Umur si kecil', maxLength: 24 }),
      t('start_age', 'Umur yang terpilih saat dibuka (bulan)', { placeholder: 'mis. 4', maxLength: 2, help: 'Angka 0-60. Kosongkan untuk 0 (baru lahir).' }),
      ta('note', 'Catatan', {
        placeholder: 'mis. Ringkasan, ikuti anjuran dokter anak.',
        maxLength: 160,
        help: 'Kosongkan untuk kalimat bawaan "Ringkasan, ikuti anjuran dokter anak."',
      }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Jadwalkan imunisasi', maxLength: 28, help: 'Membuka WhatsApp dengan umur yang dipilih.' }),
      listField(
        'items',
        'Jadwal',
        'Jadwal',
        [
          t('age', 'Umur (bulan)', { placeholder: 'mis. 2', maxLength: 2, help: 'Angka 0-60; 0 = saat lahir.' }),
          t('label', 'Label umur', { placeholder: 'mis. 2 bulan', maxLength: 20, help: 'Kosongkan untuk dibuat dari angka umur.' }),
          ta('vaccines', 'Vaksin', { placeholder: 'mis. DPT-HB-Hib 1 · Polio 1', maxLength: 160, help: LIST_HELP }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'pediatrics',
    label: 'Dokter anak',
    description: 'Kartu jadwal dokter dengan inisial (tanpa foto), fokus layanan, hari praktik dalam strip mingguan, jam, dan tombol buat janji lewat WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Dokter anak'),
      title('mis. Konsultasi dengan dokter anak'),
      subtitle(),
      t('button_label', 'Teks tombol di kartu', { placeholder: 'mis. Buat janji', maxLength: 20 }),
      ta('note', 'Catatan jadwal', { placeholder: 'mis. Jadwal praktik bisa berubah.', maxLength: 160 }),
      listField(
        'items',
        'Dokter',
        'Dokter',
        [
          t('name', 'Nama & gelar', { placeholder: 'mis. dr. Nadia Prameswari, Sp.A', maxLength: 60 }),
          t('focus', 'Fokus layanan', { placeholder: 'mis. Tumbuh kembang anak', maxLength: 50 }),
          t('days', 'Hari praktik', { placeholder: 'mis. Sen · Rab · Jum', maxLength: 40, help: 'Pisahkan dengan · atau koma: Sen, Sel, Rab, Kam, Jum, Sab, Min (atau nama hari lengkap).' }),
          t('hours', 'Jam praktik', { placeholder: 'mis. 08.00–12.00', maxLength: 24 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'lactation',
    label: 'Klinik laktasi',
    description: 'Foto berbentuk lengkung lembut, daftar layanan dengan ikon, jadwal klinik, dan tombol daftar.',
    toggleable: true,
    fields: [
      eyebrow('mis. Klinik laktasi'),
      title('mis. Menyusui lebih tenang, didampingi konselor'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Daftar konsultasi laktasi', maxLength: 32 }),
      url('button_url', 'Tautan tombol', { help: `Kosongkan untuk membuka WhatsApp dengan pesan pendaftaran laktasi. ${SECTION_LINK_HELP}` }),
      listField(
        'services',
        'Layanan',
        'Layanan',
        [t('title', 'Nama layanan', { placeholder: 'mis. Konseling menyusui', maxLength: 40 }), ta('text', 'Keterangan', { maxLength: 120 })],
        6,
      ),
      listField(
        'schedule',
        'Jadwal klinik',
        'Jadwal',
        [t('day', 'Hari', { placeholder: 'mis. Senin–Jumat', maxLength: 30 }), t('hours', 'Jam', { placeholder: 'mis. 09.00–15.00', maxLength: 30 })],
        4,
      ),
    ],
  },
  {
    key: 'tour',
    label: 'Tur kamar bersalin',
    description: 'Deretan foto ruangan yang bisa digeser (dengan tombol sebelumnya/berikutnya), jadwal tur, dan tombol jadwalkan tur lewat WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tur kamar bersalin'),
      title('mis. Kenali ruangannya sebelum hari H'),
      subtitle(),
      t('schedule', 'Jadwal tur', { placeholder: 'mis. Setiap Sabtu pukul 10.00 dan 13.00', maxLength: 100 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Jadwalkan tur', maxLength: 28 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp dengan pesan di bawah.' }),
      t('message', 'Pesan WhatsApp tur', { placeholder: 'mis. Halo, saya ingin menjadwalkan tur kamar bersalin.', maxLength: 160 }),
      listField(
        'items',
        'Foto ruangan',
        'Foto',
        [img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px.'), t('caption', 'Nama ruangan', { placeholder: 'mis. Ruang bersalin', maxLength: 40 })],
        8,
      ),
    ],
  },
  {
    key: 'articles',
    label: 'Artikel parenting',
    description: 'Kartu artikel dengan foto opsional, kategori, waktu baca, ringkasan, dan tautan ke blog atau media sosial Anda.',
    toggleable: true,
    fields: [
      eyebrow('mis. Artikel parenting'),
      title('mis. Bacaan singkat untuk Ayah dan Bunda'),
      subtitle(),
      t('link_label', 'Teks tautan semua artikel', { placeholder: 'mis. Lihat semua artikel', maxLength: 30 }),
      url('link_url', 'Tautan semua artikel', { help: 'Alamat blog atau halaman artikel Anda. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Artikel',
        'Artikel',
        [
          t('title', 'Judul artikel', { maxLength: 80 }),
          t('category', 'Kategori', { placeholder: 'mis. Kehamilan', maxLength: 24 }),
          t('minutes', 'Waktu baca', { placeholder: 'mis. 4 menit baca', maxLength: 20 }),
          ta('excerpt', 'Ringkasan', { maxLength: 120 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
          url('url', 'Tautan artikel', { help: 'Alamat artikel di blog, Instagram, atau Medium Anda. Kosongkan untuk kartu tanpa tautan.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Kartu cerita orang tua: kutipan, nama, keterangan kota & layanan, dan foto bulat (atau inisial).',
    toggleable: true,
    fields: [
      eyebrow('mis. Cerita orang tua'),
      title('mis. Kata Ayah dan Bunda'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Bunda Anisa', maxLength: 40 }),
          t('detail', 'Kota & layanan', { placeholder: 'mis. Serpong · persalinan normal', maxLength: 60 }),
          ta('quote', 'Kutipan', { maxLength: 260 }),
          img('photo', 'Foto', 'Foto persegi, 480×480 px, hanya dengan izin orang tersebut. Kosongkan untuk inisial.'),
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
      title('mis. Yang sering Bunda tanyakan'),
      subtitle('mis. Belum terjawab? Tanyakan langsung ke admin kami.'),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 420 })], 8),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan',
    description: 'Pita peach bergelombang dengan ilustrasi hati dan bintang, judul, deskripsi, dan dua tombol.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Sampai jumpa di MomKid', maxLength: 30 }),
      title('mis. Siap menyambut si kecil bersama kami?'),
      subtitle('Satu kalimat ajakan.'),
      t('button_label', 'Teks tombol utama', { placeholder: 'mis. Daftar Kunjungan', maxLength: 28 }),
      url('button_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju formulir di bagian Kontak.' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Chat dengan admin', maxLength: 28 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & formulir pendaftaran',
    description:
      'Baris kontak, kotak keadaan darurat, peta Google Maps, dan formulir pendaftaran kunjungan (layanan, tanggal, waktu, cara bayar) yang menyusun pesan WhatsApp. Data formulir tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Daftar kunjungan'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. RSIA MomKid, Tangerang Selatan',
        maxLength: 120,
        help: 'Nama rumah sakit + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 021 1234 5678', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@rumahsakit.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol buat janji, dan formulir pendaftaran.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Poliklinik Senin–Sabtu 08.00–20.00 · IGD 24 jam', maxLength: 90 }),
      t('emergency_title', 'Kotak darurat: judul', { placeholder: 'mis. Kondisi darurat?', maxLength: 40 }),
      ta('emergency_text', 'Kotak darurat: isi', {
        maxLength: 200,
        help: 'Arahkan pasien ke IGD atau telepon 119. Kosongkan untuk kalimat bawaan.',
      }),
      { type: 'phone', key: 'emergency_phone', label: 'Telepon IGD', placeholder: 'mis. 021 1234 5679', maxLength: 30, help: 'Kosongkan bila tidak ada; 119 tetap tampil.' },
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Formulir pendaftaran', maxLength: 60 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 220, help: 'Tampil di bawah tombol kirim. Sebutkan bahwa data tidak disimpan di website.' }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
      listField('form_services', 'Pilihan layanan di formulir', 'Pilihan', [t('label', 'Pilihan', { placeholder: 'mis. Imunisasi', maxLength: 40 })], 8),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita mint bergelombang: logo, deskripsi, menu, kontak, media sosial, catatan, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang rumah sakit Anda.', maxLength: 220 }),
      ta('disclaimer', 'Catatan kaki', {
        placeholder: 'mis. Informasi di situs ini bersifat umum dan bukan pengganti konsultasi dengan dokter.',
        maxLength: 220,
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Rumah Sakit', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
