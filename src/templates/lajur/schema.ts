// Skema CMS Lajur. Urutan section = urutan halaman: hero (foto latar + bilah minta penawaran) → armada → kalkulator
// rombongan → film sehari perjalanan → tujuan → harga termasuk → cara sewa → testimoni → galeri → FAQ → kontak →
// footer. Setiap section bisa disembunyikan. Template baru belum punya konten tersimpan, jadi tanpa `introduced`.
// Armada, harga, rute, dan testimoni di konten demo FIKTIF (contoh).
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
  t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: 'Tampil dengan nomor urut dan tiga garis miring. Kosongkan untuk menyembunyikan.' });
const title = (placeholder: string, maxLength = 90) => t('title', 'Judul', { placeholder, maxLength, help: 'Paling bagus ≤ 8 kata.' });
const subtitle = (placeholder = 'Satu kalimat pengantar singkat.', maxLength = 160) =>
  ta('subtitle', 'Kalimat pengantar', { placeholder, maxLength, help: 'Satu kalimat, paling pas ≤ 110 huruf.' });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #armada, #rombongan, #tujuan, #harga, atau #kontak.';

export const lajurSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama, logo, dan satu warna aksen untuk tombol, livery bus, garis lajur, dan sorotan. Warna teks dijaga otomatis agar terbaca.',
    fields: [
      t('company_name', 'Nama perusahaan / PO', { placeholder: 'mis. Lajur Trans Wisata', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Sewa bus pariwisata Jawa–Bali',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama; nama + tagline paling pas ≤ 60 huruf.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol jalan bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan amber #FFB703. Dipakai sebagai isian tombol, livery bus, dan garis; teks aksen dibuat lebih gelap/terang otomatis.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto & minta penawaran)',
    description:
      'Foto besar sebagai latar, judul, kalimat singkat, dua tombol, dan bilah minta penawaran (jumlah peserta, tanggal, tujuan, lama sewa) yang menyusun pesan WhatsApp beserta rekomendasi armada.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Sewa bus pariwisata · Jawa–Bali', maxLength: 60 }),
      t('title', 'Judul utama', { placeholder: 'mis. Sewa bus pariwisata untuk setiap rombongan.', maxLength: 70, help: 'Paling bagus ≤ 8 kata.' }),
      t('highlight', 'Bagian judul yang disorot', {
        placeholder: 'mis. setiap rombongan',
        maxLength: 40,
        help: 'Ditulis persis seperti di judul; tampil berwarna aksen. Kosongkan bila tidak perlu.',
      }),
      ta('subtitle', 'Kalimat singkat', {
        placeholder: 'Jelaskan layanan Anda dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-140 huruf paling pas.',
      }),
      img('image', 'Foto latar', 'Foto mendatar 16:9, disarankan 1920×1080 px. Sisi kiri tertutup lapisan gelap untuk teks; di HP dipotong tegak.'),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Cek armada & harga', maxLength: 28, help: 'Menuju bagian Armada. Kosongkan untuk menyembunyikan.' }),
      t('secondary_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Chat via WhatsApp', maxLength: 28, help: 'Kosongkan untuk menyembunyikan.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Minta penawaran', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: `Kosongkan untuk menuju bilah minta penawaran. ${SECTION_LINK_HELP}` }),
      t('quote_button', 'Bilah penawaran: teks tombol', { placeholder: 'mis. Minta penawaran', maxLength: 24 }),
      ta('quote_note', 'Bilah penawaran: catatan kecil', {
        maxLength: 200,
        help: 'Sebutkan bahwa formulir hanya menyusun pesan WhatsApp dan harga final dikonfirmasi admin.',
      }),
    ],
  },
  {
    key: 'fleet',
    label: 'Armada',
    description:
      'Tab per jenis bus dengan gambar bus (dipilih otomatis dari jumlah kursi) atau foto Anda, denah kursi, fasilitas, dan harga mulai. Data bus juga dipakai kalkulator rombongan dan rekomendasi di hero.',
    toggleable: true,
    fields: [
      eyebrow('mis. Armada'),
      title('mis. Pilih bus sesuai rombongan'),
      subtitle(),
      t('included_note', 'Catatan di bawah harga', { placeholder: 'mis. Termasuk sopir & kernet', maxLength: 60 }),
      t('price_note', 'Keterangan harga', { placeholder: 'mis. Harga contoh, dikonfirmasi admin', maxLength: 60 }),
      t('choose_label', 'Teks tombol pilih bus', { placeholder: 'mis. Pilih bus ini', maxLength: 24, help: 'Mengisi jenis bus di bilah penawaran hero.' }),
      t('map_label', 'Teks tombol denah kursi', { placeholder: 'mis. Lihat denah kursi', maxLength: 28 }),
      listField(
        'items',
        'Jenis bus',
        'Bus',
        [
          t('name', 'Nama kelas bus', { placeholder: 'mis. Big bus', maxLength: 30, help: 'Tulis kelas, bukan merek atau tipe kendaraan.' }),
          t('seats', 'Jumlah kursi', { placeholder: 'mis. 50', maxLength: 3, help: '≥ 40 kursi bergambar big bus, ≥ 24 medium bus, selain itu microbus.' }),
          t('layout', 'Susunan kursi', { placeholder: 'mis. 2-2', maxLength: 5, help: 'Kursi kiri-kanan lorong, mis. 2-2 atau 2-1.' }),
          t('units', 'Jumlah unit (opsional)', { placeholder: 'mis. 6', maxLength: 3, help: 'Membatasi jumlah bus jenis ini di rekomendasi. Kosongkan bila tidak dibatasi.' }),
          t('price', 'Harga mulai (rupiah)', { placeholder: 'mis. 3200000', maxLength: 20, help: 'Angka saja atau dengan satuan (3,2 jt). Kosongkan bila harga menyusul.' }),
          t('price_unit', 'Satuan harga', { placeholder: 'mis. / hari', maxLength: 20 }),
          ta('facilities', 'Fasilitas', {
            placeholder: 'mis. AC, Kursi reclining, Toilet, Karaoke & TV, Port USB',
            maxLength: 200,
            help: 'Pisahkan dengan koma (maks. 8). Ikon dipilih otomatis dari nama.',
          }),
          img('image', 'Foto bus (opsional)', 'Foto mendatar 16:9, disarankan 1600×900 px, tanpa pelat & nama PO lain. Kosongkan untuk memakai gambar bus bawaan.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'convoy',
    label: 'Kalkulator rombongan',
    description:
      'Penggeser jumlah peserta (10–300) yang menyusun kombinasi bus dari data Armada: jumlah bus paling sedikit, lalu kursi kosong paling sedikit, dengan perkiraan harga per hari dan tombol WhatsApp.',
    toggleable: true,
    fields: [
      eyebrow('mis. Rombongan'),
      title('mis. Berapa bus yang Anda butuhkan?'),
      subtitle(),
      t('default_people', 'Jumlah peserta awal', { placeholder: 'mis. 120', maxLength: 3 }),
      ta('note', 'Catatan di bawah hasil', { placeholder: 'mis. Perkiraan dari harga contoh per hari.', maxLength: 200 }),
      t('button_label', 'Teks tombol WhatsApp', { placeholder: 'mis. Minta penawaran', maxLength: 30, help: 'Ditambah otomatis "untuk 120 peserta". Kosongkan untuk menyembunyikan.' }),
    ],
  },
  {
    key: 'film',
    label: 'Film sehari perjalanan',
    description:
      'Pita gelap selebar layar berisi animasi bus berjalan dari pagi sampai malam saat halaman digulir, dengan jam berjalan dan bab perjalanan. Tanpa gerak (pratinjau, pengaturan kurangi gerak): gambar diam + daftar bab.',
    toggleable: true,
    fields: [
      eyebrow('mis. Sehari penuh'),
      title('mis. Satu hari bersama rombongan Anda'),
      subtitle(),
      listField(
        'chapters',
        'Bab perjalanan',
        'Bab',
        [
          t('time', 'Jam', { placeholder: 'mis. 05.00', maxLength: 5, help: 'Jam saat bab dimulai. Jam besar berjalan dari bab pertama sampai malam (paling awal 21.00).' }),
          t('title', 'Judul bab', { placeholder: 'mis. Penjemputan', maxLength: 30 }),
          t('text', 'Keterangan', { placeholder: 'mis. Bus tiba 30 menit lebih awal di titik jemput.', maxLength: 90 }),
        ],
        5,
      ),
    ],
  },
  {
    key: 'routes',
    label: 'Tujuan favorit',
    description: 'Kartu tujuan dengan foto tegak, lama perjalanan, harga mulai per bus, dan tombol tanya rute lewat WhatsApp. Nama tujuan juga menjadi pilihan di bilah penawaran.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tujuan'),
      title('mis. Tujuan favorit rombongan'),
      subtitle(),
      t('origin', 'Kota asal', { placeholder: 'mis. dari Semarang', maxLength: 40 }),
      t('price_unit', 'Satuan harga', { placeholder: 'mis. / bus', maxLength: 20 }),
      t('ask_label', 'Teks tombol WhatsApp di kartu', { placeholder: 'mis. Tanya rute ini', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      listField(
        'items',
        'Tujuan',
        'Tujuan',
        [
          t('name', 'Nama tujuan', { placeholder: 'mis. Dieng', maxLength: 30 }),
          t('duration', 'Lama perjalanan', { placeholder: 'mis. 2 hari', maxLength: 24 }),
          t('price', 'Harga mulai (rupiah)', { placeholder: 'mis. 6800000', maxLength: 20, help: 'Kosongkan bila harga menyusul.' }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px.'),
        ],
        8,
      ),
    ],
  },
  {
    key: 'included',
    label: 'Harga termasuk',
    description: 'Dua kolom: yang sudah termasuk harga sewa dan yang belum (dengan keterangan singkat), plus catatan harga.',
    toggleable: true,
    fields: [
      eyebrow('mis. Harga'),
      title('mis. Harga sudah termasuk'),
      subtitle(),
      t('included_title', 'Judul kolom termasuk', { placeholder: 'mis. Termasuk', maxLength: 30 }),
      listField('included', 'Sudah termasuk', 'Butir', [t('text', 'Butir', { placeholder: 'mis. Sopir & kernet', maxLength: 60 })], 10),
      t('excluded_title', 'Judul kolom belum termasuk', { placeholder: 'mis. Belum termasuk', maxLength: 30 }),
      listField(
        'excluded',
        'Belum termasuk',
        'Biaya',
        [t('text', 'Biaya', { placeholder: 'mis. Tol', maxLength: 60 }), t('note', 'Keterangan', { placeholder: 'mis. sesuai kesepakatan', maxLength: 40 })],
        8,
      ),
      ta('note', 'Catatan harga', { placeholder: 'mis. Harga contoh; harga final dikonfirmasi admin.', maxLength: 200 }),
    ],
  },
  {
    key: 'steps',
    label: 'Cara sewa',
    description: 'Langkah bernomor yang dihubungkan garis lajur putus-putus (tergambar sekali), dengan ikon bus di langkah pertama.',
    toggleable: true,
    fields: [
      eyebrow('mis. Cara sewa'),
      title('mis. Cara sewa bus'),
      subtitle(),
      listField(
        'items',
        'Langkah',
        'Langkah',
        [t('title', 'Judul langkah', { placeholder: 'mis. Kirim kebutuhan', maxLength: 30 }), t('text', 'Keterangan', { maxLength: 110 })],
        5,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Kartu kutipan pelanggan dengan inisial (tanpa foto), peran & kota, dan perjalanan.',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimoni'),
      title('mis. Kata panitia rombongan'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          ta('quote', 'Kutipan', { maxLength: 160 }),
          t('name', 'Nama depan', { placeholder: 'mis. Rina', maxLength: 40 }),
          t('role', 'Peran & kota', { placeholder: 'mis. Panitia study tour, Kudus', maxLength: 60 }),
          t('trip', 'Perjalanan', { placeholder: 'mis. Dieng · 3 bus', maxLength: 40 }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'gallery',
    label: 'Galeri',
    description: 'Strip foto tegak selebar layar (tanpa jarak tepi) dengan keterangan yang muncul saat disorot.',
    toggleable: true,
    fields: [
      eyebrow('mis. Galeri'),
      title('mis. Cerita dari perjalanan'),
      subtitle(),
      listField(
        'items',
        'Foto',
        'Foto',
        [img('image', 'Foto', 'Foto tegak 4:5, disarankan 960×1200 px.'), t('caption', 'Keterangan', { placeholder: 'mis. Istirahat di dataran tinggi', maxLength: 60 })],
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
      title('mis. Pertanyaan yang sering masuk'),
      subtitle(),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField('items', 'Pertanyaan', 'Pertanyaan', [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 400 })], 8),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & garasi',
    description: 'Alamat garasi/kantor, jam, telepon, WhatsApp, email, dan peta Google Maps selebar sisi kanan layar.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Mampir ke garasi kami'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Pedurungan, Kota Semarang',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. 081234567890', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'admin@perusahaan.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, bilah penawaran, kalkulator rombongan, kartu tujuan, dan FAQ.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang sewa bus.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Kantor 08.00–17.00, admin WhatsApp 24 jam', maxLength: 90 }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita aksen "siap berangkat" dengan tombol, lalu bagian gelap: logo, deskripsi, menu, kontak, media sosial, dan hak cipta.',
    toggleable: true,
    fields: [
      t('cta_title', 'Pita ajakan: judul', { placeholder: 'mis. Rombongan siap berangkat?', maxLength: 60, help: 'Kosongkan untuk menyembunyikan pita.' }),
      t('cta_text', 'Pita ajakan: kalimat', { maxLength: 140 }),
      t('cta_label', 'Pita ajakan: teks tombol', { placeholder: 'mis. Minta penawaran', maxLength: 24 }),
      url('cta_url', 'Pita ajakan: tautan tombol', { help: `Kosongkan untuk menuju bilah minta penawaran. ${SECTION_LINK_HELP}` }),
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu kalimat tentang layanan Anda.', maxLength: 220 }),
      t('note', 'Catatan kecil', { placeholder: 'mis. Harga dan armada dapat berubah.', maxLength: 160 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Perusahaan', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
