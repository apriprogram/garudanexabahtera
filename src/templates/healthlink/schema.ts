// Skema CMS HealthLink. Urutan section = urutan halaman: hero kartu aplikasi → layanan → cara konsultasi → dokter online
// → resep & obat → rekam medis → pengingat kontrol → RS mitra → biaya → aplikasi → tanya jawab → bantuan → footer.
// Semua teks demo yang tampil bisa diubah di sini (kecuali label isian formulir yang tetap). Setiap section bisa
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

const EYEBROW_HELP = 'Label kecil berbentuk kapsul di atas judul. Label singkat (≤ 14 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 30, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 70) => t('title', 'Judul', { placeholder, maxLength, help: 'Pendek saja, ± 3-7 kata.' });
const subtitle = (placeholder = 'Satu kalimat pendek.', maxLength = 120) => t('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #dokter, #resep, #pengingat, atau #kontak.';
const APP_LINK_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Bantuan) dengan pesan otomatis.';

export const healthlinkSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama layanan, logo, dan satu warna aksen. Warna tombol, kotak ikon, dan pita aplikasi diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama layanan', { placeholder: 'mis. HealthLink', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Konsultasi Dokter Online Yogyakarta',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama layanan; nama + tagline paling pas ≤ 60 huruf, sebut layanan dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol HealthLink bawaan dan nama layanan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan cyan #0891B2. Tombol memakai versi yang lebih gelap agar teks putih tetap terbaca; kotak ikon dan pita aplikasi dibuat otomatis.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (kartu aplikasi)',
    description:
      'Foto latar selebar layar dengan kartu putih ala aplikasi di atasnya: label, judul, deskripsi, kolom cari dokter, dan empat ubin layanan. Juga tombol menu atas dan bilah aksi bawah di HP.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kapsul di atas judul', { placeholder: 'mis. Terhubung ke 12 RS mitra di DIY', maxLength: 48 }),
      t('title', 'Judul utama', { placeholder: 'mis. Dokter online yang terhubung ke rumah sakit', maxLength: 70, help: 'Paling bagus ≤ 9 kata.' }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. terhubung', maxLength: 30, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan layanan Anda dalam 1-2 kalimat.',
        maxLength: 160,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('search_placeholder', 'Teks di kolom cari', { placeholder: 'mis. Cari dokter, spesialis, atau keluhan', maxLength: 48, help: 'Kolom cari menyaring daftar di bagian Dokter online.' }),
      t('search_button', 'Teks tombol cari', { placeholder: 'mis. Cari', maxLength: 16 }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1920×1080 px. Letakkan orang/subjek di kanan tengah: sisi kiri tertutup kartu di layar lebar.'),
      listField(
        'tiles',
        'Ubin layanan di kartu',
        'Ubin',
        [
          t('label', 'Nama', { placeholder: 'mis. Chat Dokter', maxLength: 20, help: 'Ikon dipilih otomatis dari nama (chat, video, obat, apotek, rekam, pengingat, lab, RS).' }),
          t('text', 'Keterangan', { placeholder: 'mis. Dokter umum & spesialis', maxLength: 28 }),
          url('link_url', 'Tautan', {
            help: `Kosongkan untuk tujuan otomatis: chat/video → tautan chat/video di bawah, obat → Resep, rekam → Rekam medis, pengingat → Pengingat. ${SECTION_LINK_HELP}`,
          }),
        ],
        4,
      ),
      listField(
        'chips',
        'Label kaca di atas foto (layar lebar)',
        'Label',
        [t('label', 'Judul', { placeholder: 'mis. Dokter online', maxLength: 22 }), t('text', 'Keterangan', { placeholder: 'mis. Umum & spesialis', maxLength: 30 })],
        2,
      ),
      t('emergency_note', 'Catatan darurat di kartu', {
        placeholder: 'mis. Darurat? Hubungi 119 atau datang ke IGD terdekat.',
        maxLength: 90,
        help: 'Tampil dengan tombol telepon ke nomor darurat di bagian Bantuan. Kosongkan untuk menyembunyikan.',
      }),
      url('chat_url', 'Tautan chat dokter (aplikasi/portal)', { help: APP_LINK_HELP }),
      url('video_url', 'Tautan video call (aplikasi/portal)', { help: APP_LINK_HELP }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Konsultasi', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk memakai tautan chat dokter.' }),
      t('dock_chat_label', 'Bilah bawah HP: tombol chat', { placeholder: 'mis. Chat Dokter', maxLength: 18, help: 'Bilah aksi yang muncul di HP setelah hero digulir lewat. Kosongkan kedua tombol untuk menyembunyikannya.' }),
      t('dock_video_label', 'Bilah bawah HP: tombol video', { placeholder: 'mis. Video Call', maxLength: 18 }),
    ],
  },
  {
    key: 'services',
    label: 'Layanan',
    description: 'Kartu besar dengan ikon otomatis dari judul, satu kalimat, dan label kecil (harga atau keterangan).',
    toggleable: true,
    fields: [
      eyebrow('mis. Layanan'),
      title('mis. Semua kebutuhan berobat, dalam satu aplikasi'),
      subtitle(),
      listField(
        'items',
        'Layanan',
        'Layanan',
        [
          t('title', 'Nama layanan', { placeholder: 'mis. Chat dokter umum', maxLength: 32, help: 'Ikon dipilih otomatis dari nama (chat, video, resep, apotek, antar, rekam, pengingat, lab, keluarga, RS).' }),
          t('text', 'Keterangan', { placeholder: 'Satu kalimat pendek.', maxLength: 80 }),
          t('meta', 'Label kecil', { placeholder: 'mis. Mulai Rp35.000', maxLength: 28 }),
          url('link_url', 'Tautan (opsional)', { help: `Kosongkan untuk tujuan otomatis sesuai ikon. ${SECTION_LINK_HELP}` }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'steps',
    label: 'Cara konsultasi',
    description: 'Langkah bernomor di kiri, lalu foto dengan kartu ilustrasi percakapan (tiga gelembung chat).',
    toggleable: true,
    fields: [
      eyebrow('mis. Cara konsultasi'),
      title('mis. Tiga langkah, tanpa antre'),
      subtitle(),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [t('title', 'Judul langkah', { placeholder: 'mis. Pilih dokter', maxLength: 32 }), t('text', 'Keterangan', { maxLength: 80 })],
        4,
      ),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menampilkan kartu percakapan saja.'),
      t('chat_doctor_name', 'Percakapan: nama dokter', { placeholder: 'mis. dr. Sekar Ayuningtyas', maxLength: 40, help: 'Nama contoh; tampil dengan inisial, bukan foto.' }),
      t('chat_doctor_role', 'Percakapan: keterangan dokter', { placeholder: 'mis. Dokter umum · Online', maxLength: 40 }),
      t('chat_patient', 'Gelembung 1 (pasien)', { maxLength: 90 }),
      t('chat_doctor', 'Gelembung 2 (dokter)', { maxLength: 90 }),
      t('chat_reply', 'Gelembung 3 (pasien)', { maxLength: 90 }),
      t('chat_note', 'Label kecil kartu percakapan', { placeholder: 'mis. Ilustrasi percakapan', maxLength: 40 }),
    ],
  },
  {
    key: 'doctors',
    label: 'Dokter online',
    description:
      'Kolom cari + saringan spesialis (dibuat otomatis dari daftar) + kartu dokter dengan inisial, spesialis, status, harga, dan tombol chat. Nama dokter tampil tanpa foto.',
    toggleable: true,
    fields: [
      eyebrow('mis. Dokter online'),
      title('mis. Pilih dokter yang tepat'),
      subtitle(),
      t('button_label', 'Teks tombol di kartu', { placeholder: 'mis. Chat', maxLength: 14, help: 'Membuka tautan chat dokter, atau WhatsApp dengan nama dokter di pesannya.' }),
      t('empty_text', 'Teks bila tidak ada hasil', { maxLength: 90 }),
      t('note', 'Catatan di bawah daftar', { placeholder: 'mis. Jadwal dan status dokter adalah contoh.', maxLength: 160 }),
      listField(
        'items',
        'Dokter',
        'Dokter',
        [
          t('name', 'Nama & gelar', { placeholder: 'mis. dr. Bima Prasetyo, Sp.A', maxLength: 50 }),
          t('specialty', 'Spesialis', { placeholder: 'mis. Spesialis anak', maxLength: 40, help: 'Juga menjadi tombol saringan (spesialis yang sama = satu tombol).' }),
          t('keywords', 'Kata kunci keluhan (untuk pencarian)', { placeholder: 'mis. demam, batuk, pilek', maxLength: 90, help: 'Tidak tampil; dipakai kolom cari.' }),
          t('status', 'Status', { placeholder: 'mis. Online atau Jadwal 19.00', maxLength: 24, help: 'Kata "Online"/"Tersedia" → titik hijau, selain itu titik abu.' }),
          t('price', 'Harga', { placeholder: 'mis. Rp35.000 / sesi', maxLength: 24 }),
        ],
        9,
      ),
    ],
  },
  {
    key: 'prescription',
    label: 'Resep & obat',
    description: 'Foto apotek dengan foto kecil pengantaran, alur tiga langkah, label pilihan pengiriman, dan tombol tebus resep.',
    toggleable: true,
    fields: [
      eyebrow('mis. Resep & obat'),
      title('mis. Resep digital, obat sampai di rumah'),
      subtitle(),
      img('image', 'Foto utama', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan foto.'),
      img('image_2', 'Foto kecil (opsional)', 'Foto mendatar 4:3, 1200×900 px, tampil kecil di pojok foto utama.'),
      t('photo_label', 'Label kaca di foto', { placeholder: 'mis. Apotek mitra', maxLength: 30 }),
      listField('steps', 'Alur', 'Langkah', [t('title', 'Judul', { maxLength: 32 }), t('text', 'Keterangan', { maxLength: 80 })], 4),
      listField('options', 'Label pilihan pengiriman', 'Label', [t('label', 'Label', { placeholder: 'mis. Ambil di apotek', maxLength: 32 })], 4),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Tebus Resep', maxLength: 22 }),
      url('button_url', 'Tautan tombol', { help: APP_LINK_HELP }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Obat keras hanya diberikan dengan resep dokter.', maxLength: 120 }),
    ],
  },
  {
    key: 'records',
    label: 'Rekam medis',
    description: 'Teks dan poin di kiri, lalu kartu ilustrasi layar aplikasi berisi riwayat kunjungan. Ilustrasi saja: website tidak menyimpan rekam medis.',
    toggleable: true,
    fields: [
      eyebrow('mis. Rekam medis'),
      title('mis. Riwayat kesehatan di genggaman'),
      subtitle(),
      listField('points', 'Poin', 'Poin', [t('text', 'Poin', { maxLength: 60 })], 4),
      t('screen_title', 'Kartu layar: judul', { placeholder: 'mis. Riwayat kunjungan', maxLength: 30 }),
      t('screen_profile', 'Kartu layar: label profil', { placeholder: 'mis. Profil keluarga · 3', maxLength: 30 }),
      listField(
        'visits',
        'Kartu layar: kunjungan',
        'Kunjungan',
        [
          t('date', 'Tanggal', { placeholder: 'mis. 12 Okt', maxLength: 8 }),
          t('title', 'Judul', { placeholder: 'mis. Chat dokter umum', maxLength: 40 }),
          t('detail', 'Keterangan', { placeholder: 'mis. dr. Sekar A. · Resep 2 obat', maxLength: 50 }),
          t('tag', 'Label', { placeholder: 'mis. Selesai', maxLength: 14 }),
        ],
        4,
      ),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Buka di aplikasi', maxLength: 22 }),
      url('button_url', 'Tautan tombol', { help: 'Tautan aplikasi/portal pasien Anda. Kosongkan untuk membuka WhatsApp.' }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Ilustrasi tampilan aplikasi. Rekam medis tidak disimpan di website ini.', maxLength: 120 }),
    ],
  },
  {
    key: 'reminders',
    label: 'Pengingat kontrol',
    description:
      'Formulir kecil (jenis, tanggal, jam, waktu pengingat, catatan) yang membuat file kalender .ics atau tautan Google Calendar di perangkat pengunjung. Tidak ada data yang dikirim atau disimpan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pengingat'),
      title('mis. Jangan lewatkan jadwal kontrol'),
      subtitle(),
      img('image', 'Foto (layar lebar)', 'Foto mendatar 4:3, disarankan 1200×900 px. Tampil di layar lebar saja. Kosongkan untuk menyembunyikan.'),
      t('photo_label', 'Label kaca di foto', { maxLength: 40 }),
      listField('types', 'Pilihan jenis pengingat', 'Pilihan', [t('label', 'Pilihan', { placeholder: 'mis. Kontrol ke dokter', maxLength: 30 })], 6),
      t('form_button', 'Teks tombol formulir', { placeholder: 'mis. Buat pengingat', maxLength: 22 }),
      t('privacy_note', 'Catatan privasi', { maxLength: 140, help: 'Sebutkan bahwa pengingat dibuat di perangkat pengunjung dan tidak disimpan di website.' }),
    ],
  },
  {
    key: 'hospitals',
    label: 'RS mitra',
    description: 'Kartu rumah sakit/klinik mitra (foto, nama, kota, layanan) dan tiga angka ringkas.',
    toggleable: true,
    fields: [
      eyebrow('mis. RS mitra'),
      title('mis. Terhubung ke rumah sakit mitra'),
      subtitle(),
      listField(
        'items',
        'Rumah sakit',
        'Rumah sakit',
        [
          t('name', 'Nama', { maxLength: 40 }),
          t('city', 'Kota', { placeholder: 'mis. Sleman', maxLength: 30 }),
          t('services', 'Layanan', { placeholder: 'mis. IGD 24 jam · Rawat inap', maxLength: 50 }),
          img('image', 'Foto', 'Foto mendatar 4:3, 1200×900 px. Hindari papan nama yang bukan milik mitra Anda.'),
        ],
        8,
      ),
      listField('stats', 'Angka ringkas', 'Angka', [t('value', 'Angka', { placeholder: 'mis. 12', maxLength: 10 }), t('label', 'Keterangan', { maxLength: 30 })], 3),
      t('note', 'Catatan kecil', { maxLength: 100 }),
    ],
  },
  {
    key: 'pricing',
    label: 'Biaya',
    description: 'Kartu paket: nama, harga, periode, keterangan, daftar isi, label sorotan, dan foto opsional. Tombol membuka WhatsApp dengan nama paket.',
    toggleable: true,
    fields: [
      eyebrow('mis. Biaya'),
      title('mis. Biaya jelas sebelum konsultasi'),
      subtitle(),
      listField(
        'plans',
        'Paket',
        'Paket',
        [
          t('name', 'Nama paket', { maxLength: 30 }),
          t('price', 'Harga', { placeholder: 'mis. Rp35.000', maxLength: 16 }),
          t('period', 'Periode', { placeholder: 'mis. / sesi', maxLength: 12 }),
          t('text', 'Keterangan', { maxLength: 70 }),
          ta('features', 'Isi paket', { placeholder: 'Satu baris satu poin (maks. 4 baris).', maxLength: 200 }),
          t('badge', 'Label sorotan', { placeholder: 'mis. Untuk keluarga', maxLength: 20, help: 'Isi untuk menyorot kartu ini. Kosongkan untuk kartu biasa.' }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, 1200×900 px; tampil di kartu bersorot.'),
          t('button_label', 'Teks tombol', { placeholder: 'mis. Pilih paket', maxLength: 18 }),
        ],
        3,
      ),
      t('note', 'Catatan kecil', { placeholder: 'mis. Harga contoh. Pembayaran tidak diproses di website ini.', maxLength: 140 }),
    ],
  },
  {
    key: 'download',
    label: 'Unduh aplikasi',
    description: 'Pita gelap warna tema: simbol aplikasi, judul, dua tombol toko (teks biasa, tanpa lencana resmi), dan foto tegak.',
    toggleable: true,
    fields: [
      eyebrow('mis. Aplikasi'),
      title('mis. Bawa dokter di saku Anda'),
      subtitle(),
      img('image', 'Foto (layar lebar)', 'Foto tegak 4:5, disarankan 960×1200 px. Tampil di layar lebar saja. Kosongkan untuk menyembunyikan.'),
      t('android_label', 'Tombol 1: teks', { placeholder: 'mis. Google Play', maxLength: 20 }),
      url('android_url', 'Tombol 1: tautan', { help: 'Kosongkan untuk menyembunyikan tombol. Tanpa kedua tautan, tombol WhatsApp yang tampil.' }),
      t('ios_label', 'Tombol 2: teks', { placeholder: 'mis. App Store', maxLength: 20 }),
      url('ios_url', 'Tombol 2: tautan'),
      t('note', 'Catatan kecil', { maxLength: 90 }),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya jawab'),
      title('mis. Sebelum Anda konsultasi'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Bantuan).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Bantuan & kontak',
    description: 'Ubin WhatsApp, telepon, email, dan jam layanan; alamat dengan tautan Google Maps; kartu darurat dengan tombol telepon; foto.',
    toggleable: true,
    fields: [
      eyebrow('mis. Bantuan'),
      title('mis. Ada pertanyaan? Tim kami siap bantu'),
      subtitle(),
      img('image', 'Foto (layar lebar)', 'Foto mendatar 4:3, 1200×900 px. Kosongkan untuk menyembunyikan.'),
      ta('address', 'Alamat kantor', { placeholder: 'Jl. Contoh No. 1, Kota', maxLength: 160 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Umbulharjo, Kota Yogyakarta',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link Google Maps (opsional)', { placeholder: 'https://maps.app.goo.gl/...', help: 'Dipakai untuk tautan "Buka di Google Maps".' }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'bantuan@layanan.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol chat/video bila tautan aplikasi kosong, tombol dokter, dan paket.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin konsultasi dengan dokter.', maxLength: 160 }),
      t('hours', 'Jam layanan', { placeholder: 'mis. Setiap hari 07.00–22.00 WIB', maxLength: 60 }),
      t('emergency_title', 'Kartu darurat: judul', { placeholder: 'mis. Kondisi darurat?', maxLength: 40 }),
      ta('emergency_text', 'Kartu darurat: teks', { maxLength: 160, help: 'Ingatkan bahwa konsultasi online bukan untuk keadaan darurat.' }),
      t('emergency_phone', 'Nomor darurat', {
        placeholder: 'mis. 119',
        maxLength: 20,
        help: 'Angka saja, 3-15 digit. 119 = nomor darurat nasional. Kosongkan untuk menyembunyikan tombol telepon.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Logo, deskripsi, menu, media sosial, catatan medis, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang layanan Anda.', maxLength: 180 }),
      ta('disclaimer', 'Catatan medis', {
        placeholder: 'mis. Informasi di situs ini bukan pengganti pemeriksaan langsung oleh dokter.',
        maxLength: 220,
        help: 'Juga tempat menulis nama badan usaha dan izin Anda sesuai dokumen yang benar-benar dimiliki.',
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Layanan', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama layanan.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
