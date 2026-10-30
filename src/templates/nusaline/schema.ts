// Skema CMS Nusaline. Urutan section = urutan halaman: hero (foto malam + cari jadwal + papan keberangkatan) → jadwal
// keberangkatan → kelas (denah kursi) → film perjalanan semalam → rute & titik naik → fasilitas kabin → cara pesan →
// cerita penumpang → tanya jawab → kontak → footer. Setiap section bisa disembunyikan. Template baru belum punya konten
// tersimpan, jadi tanpa `introduced`. Jadwal, harga, agen, dan penumpang di konten demo fiktif.
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
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 30, help: 'Tampil sebagai "→ LABEL" huruf mono. Kosongkan untuk menyembunyikan.' });
const title = (placeholder: string, maxLength = 70) => t('title', 'Judul', { placeholder, maxLength, help: 'Paling pas ≤ 8 kata.' });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 140) => ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #jadwal, #kelas, #rute, atau #kontak.';

export const nusalineSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama, logo, dan satu warna aksen. Warna neon di latar gelap dan warna teks di latar terang dibuat otomatis agar tetap terbaca.',
    fields: [
      t('company_name', 'Nama PO / merek', { placeholder: 'mis. Nusaline', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Bus malam Jakarta–Bali setiap hari',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf, sebut rute utamanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol bulan & jalur bawaan dan nama merek.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan raspberry #D81E5B. Dipakai tombol, livery bus di film, dan sorotan; latar malam tetap biru gelap.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto malam & cari jadwal)',
    description: 'Foto malam selebar layar, judul, kalimat singkat, dua tombol, kartu cari jadwal (dari, ke, tanggal, penumpang), dan papan "berangkat malam ini" dari tiga jadwal pertama.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Bus malam · berangkat tiap hari', maxLength: 60 }),
      t('title', 'Judul utama', { placeholder: 'mis. Tidur nyenyak, bangun di kota tujuan.', maxLength: 60, help: 'Paling bagus ≤ 8 kata.' }),
      t('highlight', 'Kata yang disorot di judul', {
        placeholder: 'mis. kota tujuan',
        maxLength: 30,
        help: 'Harus sama persis dengan bagian judul; tampil berwarna neon. Kosongkan bila tidak perlu.',
      }),
      ta('subtitle', 'Kalimat singkat', {
        placeholder: 'Sebut rute dan cara pesan dalam 1–2 kalimat.',
        maxLength: 160,
        help: 'Juga menjadi deskripsi situs di Google; 120–140 huruf paling pas.',
      }),
      img('image', 'Foto latar', 'Foto malam mendatar 16:9, disarankan 1920×1080 px, bagian kiri gelap (judul di kiri). Tampil penuh selebar layar.'),
      t('primary_label', 'Teks tombol utama', {
        placeholder: 'mis. Pilih kelas',
        maxLength: 24,
        help: 'Menuju bagian Kelas (jadwal sudah punya tombol "Cari jadwal" di kartu). Kosongkan untuk menyembunyikan.',
      }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Lihat rute', maxLength: 24, help: 'Menuju bagian Rute & titik naik. Kosongkan untuk menyembunyikan.' }),
      t('search_title', 'Judul kartu cari jadwal', { placeholder: 'mis. Jadwal bus malam', maxLength: 30 }),
      t('search_button', 'Teks tombol cari', { placeholder: 'mis. Cari jadwal', maxLength: 20 }),
      t('board_title', 'Judul papan keberangkatan', { placeholder: 'mis. Berangkat malam ini', maxLength: 30, help: 'Papan berisi tiga jadwal pertama. Kosongkan untuk menyembunyikan papan.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Cek Jadwal', maxLength: 20, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju tabel jadwal. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'schedule',
    label: 'Jadwal keberangkatan',
    description: 'Tabel jadwal (berangkat, tiba, durasi, kelas, harga mulai) dengan saringan rute & kelas dan tombol Pesan yang menyusun pesan WhatsApp. Jam tiba dan "+1" dihitung dari jam berangkat + durasi.',
    toggleable: true,
    fields: [
      eyebrow('mis. Jadwal'),
      title('mis. Jadwal keberangkatan'),
      subtitle(),
      t('note', 'Catatan di bawah tabel', {
        placeholder: 'mis. Jadwal dan harga contoh; kursi dikonfirmasi admin lewat WhatsApp.',
        maxLength: 160,
        help: 'Sebutkan bahwa kursi dan harga dikonfirmasi admin.',
      }),
      t('book_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan', maxLength: 16 }),
      t('empty_text', 'Teks bila tidak ada jadwal yang cocok', { placeholder: 'mis. Belum ada jadwal untuk pilihan ini.', maxLength: 100 }),
      listField(
        'items',
        'Jadwal',
        'Jadwal',
        [
          t('from', 'Kota asal', { placeholder: 'mis. Jakarta', maxLength: 30, help: 'Pilihan Dari dan chip rute dibuat otomatis dari kolom ini.' }),
          t('to', 'Kota tujuan', { placeholder: 'mis. Surabaya', maxLength: 30 }),
          t('depart', 'Jam berangkat', { placeholder: 'mis. 19.00', maxLength: 5, help: 'Format 24 jam, mis. 19.00.' }),
          t('duration', 'Lama perjalanan', { placeholder: 'mis. 12 jam atau 10j 30m', maxLength: 16, help: 'Jam tiba dan tanda +1 (tiba besok) dihitung otomatis.' }),
          t('class', 'Kelas', { placeholder: 'mis. Sleeper', maxLength: 30, help: 'Samakan dengan nama kelas di bagian Kelas agar saringan kelas cocok.' }),
          t('price', 'Harga mulai (rupiah)', { placeholder: 'mis. 650000', maxLength: 14, help: 'Angka saja atau "650 rb". Kosongkan bila harga ditanyakan ke admin.' }),
        ],
        16,
      ),
    ],
  },
  {
    key: 'classes',
    label: 'Kelas & denah kursi',
    description: 'Tab per kelas: denah kursi tampak atas yang dibuat otomatis dari konfigurasi (2-2, 2-1, 1-1 kabin tidur) dan jumlah kursi, fitur, jarak kaki, harga mulai, dan foto opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kelas'),
      title('mis. Pilih kelas perjalanan'),
      subtitle(),
      t('book_label', 'Teks tombol pesan kelas', { placeholder: 'mis. Pesan kelas ini', maxLength: 24, help: 'Menyaring tabel jadwal dengan kelas ini. Kosongkan untuk menyembunyikan.' }),
      t('note', 'Catatan kecil harga', { placeholder: 'mis. Harga mulai contoh; harga final dari admin.', maxLength: 100 }),
      listField(
        'items',
        'Kelas',
        'Kelas',
        [
          t('name', 'Nama kelas', { placeholder: 'mis. Sleeper', maxLength: 30 }),
          t('layout', 'Konfigurasi kursi', { placeholder: 'mis. 2-2, 2-1, atau 1-1', maxLength: 5, help: 'Kursi kiri-kanan per baris. 1-1 atau nama "Sleeper" = kabin tidur (dua dek bila lebih dari 6 baris).' }),
          t('seats', 'Jumlah kursi / kabin', { placeholder: 'mis. 32', maxLength: 3, help: '4–60.' }),
          t('legroom', 'Jarak kaki / panjang kasur', { placeholder: 'mis. 90 cm', maxLength: 12 }),
          ta('features', 'Fitur (satu per baris)', { placeholder: 'Kursi rebah\nSelimut dan bantal\nPort USB', maxLength: 260, help: 'Maks. 5 baris; ikon dipilih otomatis dari kata kunci.' }),
          t('price', 'Harga mulai (rupiah)', { placeholder: 'mis. 545000', maxLength: 14 }),
          img('image', 'Foto kelas (opsional)', 'Foto kabin asli, mendatar 3:2, disarankan 1200×800 px. Kosong: kelas kabin tidur menampilkan ilustrasi kabin, kelas kursi tanpa foto.'),
        ],
        4,
      ),
    ],
  },
  {
    key: 'film',
    label: 'Film perjalanan semalam',
    description: 'Animasi seperti video saat digulir: bus potongan samping melaju dari malam sampai pagi, jam dan penghitung km berjalan, dan keterangan per bab. Diam (gambar + daftar bab) di pratinjau CMS dan bila pengunjung mematikan animasi.',
    toggleable: true,
    fields: [
      eyebrow('mis. Perjalanan'),
      title('mis. Satu malam di dalam Nusaline'),
      subtitle(),
      t('distance', 'Jarak perjalanan (km)', { placeholder: 'mis. 780', maxLength: 6, help: 'Penghitung km berjalan dari 0 sampai angka ini. Kosongkan untuk menyembunyikan penghitung.' }),
      listField(
        'chapters',
        'Bab perjalanan',
        'Bab',
        [
          t('time', 'Jam', { placeholder: 'mis. 22.30', maxLength: 5, help: 'Urut dari berangkat sampai tiba; lewat tengah malam dihitung otomatis.' }),
          t('title', 'Judul bab', { placeholder: 'mis. Lampu kabin diredupkan', maxLength: 40, help: 'Bab berisi kata "istirahat" membuat bus berhenti sejenak di film.' }),
          t('text', 'Keterangan', { placeholder: 'Satu kalimat.', maxLength: 100 }),
        ],
        5,
      ),
    ],
  },
  {
    key: 'routes',
    label: 'Rute & titik naik',
    description: 'Diagram jalur dengan kota-kota pemberhentian; pengunjung memilih kota untuk melihat agen (nama, alamat, jam) dan foto kota.',
    toggleable: true,
    fields: [
      eyebrow('mis. Rute'),
      title('mis. Rute & titik naik'),
      subtitle(),
      t('note', 'Catatan kecil', { placeholder: 'mis. Alamat dan jam agen contoh; konfirmasi lewat WhatsApp.', maxLength: 120 }),
      t('link_label', 'Teks tautan WhatsApp', { placeholder: 'mis. Tanya titik naik', maxLength: 24, help: 'Menyusun pesan berisi nama kota. Kosongkan untuk menyembunyikan.' }),
      listField(
        'stops',
        'Kota di rute',
        'Kota',
        [
          t('city', 'Nama kota', { placeholder: 'mis. Yogyakarta', maxLength: 24 }),
          t('code', 'Kode kota', { placeholder: 'mis. YK', maxLength: 4, help: 'Dipakai di diagram dan papan keberangkatan. Kosongkan untuk 3 huruf pertama.' }),
          img('image', 'Foto kota (opsional)', 'Foto mendatar 4:3, disarankan 1000×750 px.'),
        ],
        8,
      ),
      listField(
        'points',
        'Agen / titik naik',
        'Agen',
        [
          t('city', 'Kota', { placeholder: 'mis. Yogyakarta', maxLength: 24, help: 'Samakan dengan nama kota di daftar Kota di rute.' }),
          t('name', 'Nama agen', { placeholder: 'mis. Agen Giwangan', maxLength: 40 }),
          t('address', 'Alamat', { placeholder: 'mis. Terminal Giwangan, Yogyakarta', maxLength: 90 }),
          t('hours', 'Jam buka', { placeholder: 'mis. 15.00–20.30', maxLength: 30 }),
        ],
        24,
      ),
    ],
  },
  {
    key: 'onboard',
    label: 'Fasilitas di kabin',
    description: 'Susunan bento: satu foto kabin besar, ikon fasilitas (ikon dipilih otomatis dari nama), dan dua foto kecil opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Fasilitas'),
      title('mis. Fasilitas di kabin'),
      subtitle(),
      img('image', 'Foto kabin besar', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
      t('caption', 'Keterangan foto besar', { placeholder: 'mis. Kabin redup saat malam', maxLength: 40 }),
      listField(
        'items',
        'Fasilitas',
        'Fasilitas',
        [
          t('title', 'Nama fasilitas', { placeholder: 'mis. Port USB', maxLength: 30, help: 'Ikon dipilih otomatis dari nama.' }),
          t('text', 'Keterangan', { placeholder: 'mis. Isi daya ponsel di setiap kursi.', maxLength: 70 }),
        ],
        8,
      ),
      listField(
        'photos',
        'Foto kecil',
        'Foto',
        [img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1000×750 px.'), t('caption', 'Keterangan', { placeholder: 'mis. Bagasi di bawah bus', maxLength: 30 })],
        2,
      ),
    ],
  },
  {
    key: 'steps',
    label: 'Cara pesan',
    description: 'Tiga langkah bernomor berbentuk sobekan tiket, plus satu catatan jujur tentang cara kerja pemesanan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Cara pesan'),
      title('mis. Cara pesan tiket'),
      subtitle(),
      t('note', 'Catatan di bawah langkah', {
        placeholder: 'mis. Pemesanan hanya menyusun pesan WhatsApp; tidak ada pembayaran online.',
        maxLength: 160,
        help: 'Jelaskan bahwa website hanya menyusun pesan WhatsApp.',
      }),
      listField(
        'items',
        'Langkah',
        'Langkah',
        [t('title', 'Judul', { placeholder: 'mis. Pilih jadwal', maxLength: 30 }), t('text', 'Penjelasan', { placeholder: 'Satu kalimat.', maxLength: 110 })],
        4,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Cerita penumpang',
    description: 'Kartu kutipan dengan inisial, nama, dan rute + kelas (tanpa foto wajah).',
    toggleable: true,
    fields: [
      eyebrow('mis. Cerita penumpang'),
      title('mis. Kesan setelah semalam di perjalanan'),
      subtitle('mis. Cerita singkat dari penumpang bus malam kami.', 110),
      listField(
        'items',
        'Cerita',
        'Cerita',
        [
          ta('quote', 'Kutipan', { maxLength: 140 }),
          t('name', 'Nama', { placeholder: 'mis. Rina', maxLength: 40 }),
          t('route', 'Rute & kelas', { placeholder: 'mis. Jakarta → Yogyakarta · Eksekutif', maxLength: 50 }),
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
      title('mis. Sebelum Anda berangkat'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Hubungi admin lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 100 }), ta('answer', 'Jawaban', { maxLength: 320 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & kantor pusat',
    description: 'Alamat kantor pusat, call center, WhatsApp, email, jam operasional, dan peta Google Maps.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Kantor pusat & call center'),
      subtitle(),
      ta('address', 'Alamat kantor pusat', { placeholder: 'Jl. Contoh No. 1, Kota', maxLength: 160 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Cakung, Jakarta Timur',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Call center / telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'tiket@perusahaan.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp admin',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol Pesan di jadwal, tautan titik naik, dan tanya jawab.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang jadwal bus.', maxLength: 160 }),
      t('hours', 'Jam operasional', { placeholder: 'mis. Kantor 07.00–21.00 · WhatsApp 24 jam', maxLength: 80 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita malam: daftar rute huruf mono (menuju jadwal), deskripsi, menu, kontak, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang PO Anda.', maxLength: 200 }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Pemesanan lewat WhatsApp; jadwal dan harga dikonfirmasi admin.', maxLength: 140 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama PO', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
