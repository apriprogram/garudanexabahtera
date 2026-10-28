// Skema CMS HomeNest. Urutan section = urutan halaman: hero (foto latar + panel cari rumah) → listing → tur virtual →
// simulasi KPR → profil developer → fasilitas kawasan → testimoni → agen & jadwal kunjungan → tanya jawab → kantor
// pemasaran → footer. Setiap section bisa disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa
// `introduced`. Data rumah, harga, agen, dan developer di konten demo fiktif.
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
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: 'Huruf kapital kecil dengan garis tipis. Kosongkan untuk menyembunyikan.' });
const title = (placeholder: string, maxLength = 90) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #rumah, #kpr, #agen, atau #kontak.';

export const homenestSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama, logo, dan satu warna aksen. Hijau tua pita tur, panel KPR, dan footer diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama perusahaan / merek', { placeholder: 'mis. HomeNest', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Jual Rumah di Bogor, Depok, Tangsel & Bekasi',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf, sebut jenis properti dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol HomeNest bawaan dan nama merek.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan hijau tua #2E5141. Dipakai tombol, harga, dan label; versi lebih gelap untuk pita dan footer dibuat otomatis agar teks tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto & cari rumah)',
    description: 'Foto besar sebagai latar, judul di tengah, kalimat singkat, dan panel cari rumah (lokasi, tipe, harga) yang menyaring daftar rumah.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Bogor · Depok · Tangerang Selatan · Bekasi', maxLength: 60 }),
      t('title', 'Judul utama', { placeholder: 'mis. Rumah yang tenang, tak jauh dari kota', maxLength: 70, help: 'Paling bagus ≤ 9 kata.' }),
      ta('subtitle', 'Kalimat singkat', {
        placeholder: 'Jelaskan pilihan rumah Anda dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1920×1080 px. Tampil penuh selebar layar dan terpotong tegak di HP: letakkan rumah di tengah.'),
      t('search_label', 'Teks tombol cari', { placeholder: 'mis. Cari Rumah', maxLength: 24 }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Jadwalkan Kunjungan', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju formulir jadwal kunjungan. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'listings',
    label: 'Daftar rumah',
    description: 'Kartu rumah dengan foto, harga, lokasi, luas tanah/bangunan, kamar tidur/mandi, dan saringan lokasi, tipe, harga, serta urutan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pilihan rumah'),
      title('mis. Rumah yang siap Anda kunjungi'),
      subtitle(),
      t('price_steps', 'Batas rentang harga (juta rupiah)', {
        placeholder: 'mis. 1000, 2000, 3000',
        maxLength: 60,
        help: 'Pisahkan dengan koma. "1000, 2000" menjadi pilihan: di bawah Rp1 M, Rp1 M – Rp2 M, di atas Rp2 M. Kosongkan untuk menyembunyikan saringan harga.',
      }),
      t('empty_text', 'Teks bila tidak ada yang cocok', { placeholder: 'mis. Belum ada rumah yang cocok dengan pilihan ini.', maxLength: 120 }),
      t('kpr_label', 'Teks tombol simulasi di kartu', { placeholder: 'mis. Simulasi KPR', maxLength: 24, help: 'Mengisi harga rumah ke Simulasi KPR. Kosongkan untuk menyembunyikan.' }),
      t('ask_label', 'Teks tombol WhatsApp di kartu', { placeholder: 'mis. Tanya unit', maxLength: 24, help: 'Membuka WhatsApp dengan nama rumah. Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Rumah',
        'Rumah',
        [
          t('title', 'Nama rumah / unit', { placeholder: 'mis. Rumah Teras Kenari', maxLength: 60 }),
          t('cluster', 'Klaster / perumahan', { placeholder: 'mis. Klaster Kenari Asri', maxLength: 60 }),
          t('city', 'Kota', { placeholder: 'mis. Bogor', maxLength: 30, help: 'Pilihan saringan Lokasi dibuat otomatis dari kolom ini.' }),
          t('type', 'Tipe', { placeholder: 'mis. Rumah, Townhouse, atau Kavling', maxLength: 20, help: 'Pilihan saringan Tipe dibuat otomatis dari kolom ini.' }),
          t('price', 'Harga (rupiah)', {
            placeholder: 'mis. 1450000000',
            maxLength: 20,
            help: 'Tulis angka saja (1450000000) atau dengan satuan (1,45 M / 985 jt). Kosongkan bila harga menyusul.',
          }),
          t('lt', 'Luas tanah (m²)', { placeholder: 'mis. 120', maxLength: 6 }),
          t('lb', 'Luas bangunan (m²)', { placeholder: 'mis. 96 (kosongkan untuk kavling)', maxLength: 6 }),
          t('kt', 'Kamar tidur', { placeholder: 'mis. 3', maxLength: 3 }),
          t('km', 'Kamar mandi', { placeholder: 'mis. 2', maxLength: 3 }),
          t('status', 'Status', { placeholder: 'mis. Siap huni / Inden 2027', maxLength: 24 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'tour',
    label: 'Tur virtual',
    description:
      'Pita hijau tua dengan foto besar per ruang (pilihan ruang di samping) dan tombol putar yang membuka tautan tur virtual Anda (tur 360° atau video) di tab baru.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tur virtual'),
      title('mis. Lihat ke dalam sebelum datang'),
      subtitle(),
      t('button_label', 'Teks tombol putar', { placeholder: 'mis. Buka tur virtual', maxLength: 28 }),
      url('url', 'Tautan tur virtual', { help: 'Kosongkan untuk menyembunyikan tombol putar (foto ruang tetap tampil).' }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Tur dibuka di tab baru.', maxLength: 120 }),
      listField(
        'rooms',
        'Ruang',
        'Ruang',
        [
          t('name', 'Nama ruang', { placeholder: 'mis. Ruang keluarga', maxLength: 30 }),
          t('caption', 'Keterangan', { placeholder: 'mis. Plafon tinggi dan cahaya dari dua sisi.', maxLength: 90 }),
          img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1600×1067 px.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'kpr',
    label: 'Simulasi KPR',
    description: 'Kalkulator angsuran (anuitas, bunga tetap): harga, uang muka, tenor, bunga per tahun. Hanya perkiraan, bukan penawaran bank.',
    toggleable: true,
    fields: [
      eyebrow('mis. Simulasi KPR'),
      title('mis. Hitung angsuran Anda'),
      subtitle(),
      t('default_price', 'Harga awal (rupiah)', { placeholder: 'mis. 1450000000', maxLength: 20 }),
      t('default_dp', 'Uang muka awal (%)', { placeholder: 'mis. 20', maxLength: 4 }),
      t('default_tenor', 'Tenor awal (tahun)', { placeholder: 'mis. 15', maxLength: 3 }),
      t('default_rate', 'Bunga awal per tahun (%)', { placeholder: 'mis. 7,5', maxLength: 6, help: 'Angka contoh untuk simulasi, bukan suku bunga bank tertentu.' }),
      ta('note', 'Catatan di bawah hasil', {
        placeholder: 'mis. Simulasi dengan bunga tetap, bukan penawaran bank.',
        maxLength: 220,
        help: 'Sebutkan bahwa hasilnya perkiraan dan bukan penawaran bank.',
      }),
      t('cta_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Tanya agen soal KPR', maxLength: 30, help: 'Mengirim angka simulasi lewat WhatsApp. Kosongkan untuk menyembunyikan.' }),
    ],
  },
  {
    key: 'developer',
    label: 'Profil developer',
    description: 'Cerita singkat, nama developer, empat angka, tiga foto proyek, dan tiga nilai kerja. Garis rumah tipis tergambar sekali.',
    toggleable: true,
    fields: [
      eyebrow('mis. Developer'),
      title('mis. Membangun kawasan, bukan sekadar rumah'),
      t('name', 'Nama developer', { placeholder: 'mis. PT Sarang Hunian Lestari', maxLength: 60 }),
      ta('body', 'Cerita singkat', { placeholder: '1-2 kalimat.', maxLength: 320 }),
      listField('stats', 'Angka', 'Angka', [t('value', 'Angka', { placeholder: 'mis. 1.800+', maxLength: 12 }), t('label', 'Keterangan', { placeholder: 'mis. Rumah terbangun', maxLength: 32 })], 4),
      listField(
        'projects',
        'Foto proyek',
        'Proyek',
        [
          t('name', 'Nama proyek', { placeholder: 'mis. Klaster Kenari Asri', maxLength: 50 }),
          t('city', 'Kota', { placeholder: 'mis. Bogor', maxLength: 30 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
        ],
        3,
      ),
      listField(
        'values',
        'Nilai kerja',
        'Nilai',
        [t('title', 'Judul', { placeholder: 'mis. Jalan yang teduh', maxLength: 40 }), t('text', 'Penjelasan', { placeholder: 'Satu kalimat.', maxLength: 110 })],
        3,
      ),
    ],
  },
  {
    key: 'amenities',
    label: 'Fasilitas kawasan',
    description: 'Foto tegak dan daftar fasilitas dengan ikon otomatis dari nama (taman, kolam, keamanan, masjid, sekolah, stasiun, tol, pasar, dll.) serta jarak.',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas kawasan'),
      title('mis. Semua dekat, tanpa terburu-buru'),
      subtitle(),
      img('image', 'Foto tegak', 'Foto tegak 4:5, disarankan 960×1200 px. Kosongkan untuk menyembunyikan.'),
      listField(
        'items',
        'Fasilitas',
        'Fasilitas',
        [
          t('title', 'Nama fasilitas', { placeholder: 'mis. Stasiun KRL', maxLength: 40, help: 'Ikon dipilih otomatis dari nama.' }),
          t('detail', 'Jarak / keterangan', { placeholder: 'mis. 12 menit', maxLength: 40 }),
        ],
        10,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita pembeli',
    description: 'Tiga kolom kutipan bergaris tipis dengan nama dan keterangan pembeli (tanpa foto).',
    toggleable: true,
    fields: [
      eyebrow('mis. Cerita pembeli'),
      title('mis. Mereka sudah pulang ke rumahnya'),
      listField(
        'items',
        'Cerita',
        'Cerita',
        [
          ta('quote', 'Kutipan', { maxLength: 240 }),
          t('name', 'Nama', { placeholder: 'mis. Raka & Dinda', maxLength: 50 }),
          t('place', 'Keterangan', { placeholder: 'mis. Pembeli di Depok', maxLength: 50 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'agents',
    label: 'Agen & jadwal kunjungan',
    description:
      'Kartu agen (inisial, area, tombol WhatsApp) dan formulir jadwal kunjungan yang menyusun pesan WhatsApp. Data formulir tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Hubungi agen'),
      title('mis. Bicara dengan agen kawasan'),
      subtitle(),
      listField(
        'items',
        'Agen',
        'Agen',
        [
          t('name', 'Nama agen', { maxLength: 50 }),
          t('area', 'Area', { placeholder: 'mis. Bogor & Depok', maxLength: 50 }),
          {
            type: 'phone',
            key: 'whatsapp',
            label: 'WhatsApp agen (opsional)',
            placeholder: 'mis. 081234567890',
            maxLength: 20,
            help: 'Kosongkan untuk memakai nomor WhatsApp di bagian Kantor pemasaran.',
          },
        ],
        4,
      ),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Jadwalkan kunjungan', maxLength: 60 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 220, help: 'Tampil di bawah tombol kirim. Sebutkan bahwa data tidak disimpan di website.' }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    toggleable: true,
    fields: [
      eyebrow('mis. Tanya jawab'),
      title('mis. Sebelum Anda memutuskan'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kantor pemasaran).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kantor pemasaran',
    description: 'Alamat, telepon, WhatsApp, email, jam buka, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kantor pemasaran'),
      title('mis. Mampir ke rumah contoh kami'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Kabupaten Bogor, Jawa Barat',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'pemasaran@perusahaan.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol di kartu rumah, simulasi KPR, agen tanpa nomor sendiri, dan formulir kunjungan.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang rumah yang dijual.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari 09.00–17.00 WIB', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita hijau tua: nama besar, deskripsi, catatan kecil, menu, kontak, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang Anda.', maxLength: 220 }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Harga dan ketersediaan unit dapat berubah.', maxLength: 160 }),
      t('wordmark', 'Teks besar di footer', {
        placeholder: 'mis. HomeNest',
        maxLength: 30,
        help: 'Teks besar di footer. Kosongkan untuk memakai nama perusahaan tanpa PT/CV.',
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Perusahaan', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
