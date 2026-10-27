// Skema CMS Dermaga. Urutan section = urutan halaman: hero rute → klien → tentang → layanan → pasar (pita warna tema) →
// proses → galeri → testimoni → tanya jawab → ajakan → kontak & formulir penawaran → footer. Kunci company profile
// (brand, hero, clients, about, services, gallery, testimonials, faq, cta, contact, footer) sama artinya dengan template
// lain; `markets` dan `process` milik Dermaga. Setiap section bisa disembunyikan. Template baru belum punya konten
// tersimpan, jadi tanpa `introduced`.
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

const EYEBROW_HELP = 'Tampil sebagai label bernomor, mis. "02 / Layanan". Label singkat (≤ 14 huruf) juga dipakai di menu atas. Kosongkan untuk menyembunyikan label.';
const eyebrow = (placeholder: string) => t('eyebrow', 'Label kecil di atas judul', { placeholder, maxLength: 40, help: EYEBROW_HELP });
const title = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const subtitle = (placeholder = 'Kalimat pengantar singkat.', maxLength = 280) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength });
const SECTION_LINK_HELP = 'Boleh tautan ke bagian halaman, mis. #layanan, #pasar, #proses, atau #kontak.';

export const dermagaSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama perusahaan, logo, dan satu warna aksen. Warna pita pasar dan footer gelap diturunkan otomatis dari warna ini.',
    fields: [
      t('company_name', 'Nama perusahaan', { placeholder: 'mis. PT Lintas Dermaga Nusantara', maxLength: 80 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Jasa Ekspor Impor Surabaya',
        maxLength: 60,
        help: 'Tampil di judul tab Google setelah nama perusahaan; nama + tagline paling pas ≤ 60 huruf, sebut layanan dan kotanya.',
      }),
      img('logo', 'Logo', 'PNG/SVG transparan, maks. 2 MB. Kosongkan untuk memakai simbol Dermaga bawaan dan nama perusahaan.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Bawaan teal #0F5C63. Dipakai tombol, nomor bagian, pin rute, dan pita pasar; versi gelap untuk footer dan versi terang untuk teks di atasnya dibuat otomatis agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (rute)',
    description:
      'Judul besar, deskripsi, dua tombol, lalu foto lebar dengan garis rute dan tiga label pelabuhan, serta empat angka ringkas di bawah foto.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Ekspor · impor · freight forwarding — Surabaya', maxLength: 60 }),
      t('title', 'Judul utama', {
        placeholder: 'mis. Ekspor dan impor yang tertata, dari gudang sampai pelabuhan tujuan',
        maxLength: 90,
        help: 'Paling bagus 2-3 baris, ± 50-70 huruf.',
      }),
      t('highlight', 'Kata berwarna di judul', { placeholder: 'mis. tertata', maxLength: 40, help: 'Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan layanan Anda dalam 1-2 kalimat.',
        maxLength: 200,
        help: 'Juga menjadi deskripsi situs di Google; 120-155 huruf paling pas.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Minta Penawaran', maxLength: 28 }),
      url('primary_url', 'Tautan tombol utama', { help: `Kosongkan untuk menuju formulir di bagian Kontak. ${SECTION_LINK_HELP}` }),
      t('secondary_label', 'Teks tautan kedua', { placeholder: 'mis. Lihat layanan', maxLength: 28 }),
      url('secondary_url', 'Tautan kedua', { help: 'Kosongkan untuk menuju bagian Layanan.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Minta Penawaran', maxLength: 24, help: 'Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk menuju bagian Kontak.' }),
      img(
        'image',
        'Foto hero',
        'Foto mendatar 16:9, disarankan 1920×1080 px. Tampil terpotong 21:9 di layar lebar dan 4:5 di HP: letakkan subjek di tengah.',
      ),
      {
        type: 'list',
        key: 'ports',
        label: 'Titik rute di atas foto',
        itemLabel: 'Titik rute',
        max: 3,
        fields: [
          t('code', 'Kode', { placeholder: 'mis. SUB', maxLength: 6, help: 'Kode pelabuhan atau kota, 3-5 huruf.' }),
          t('name', 'Nama', { placeholder: 'mis. Tanjung Perak, Surabaya', maxLength: 32 }),
        ],
      },
      listField(
        'stats',
        'Angka ringkas di bawah foto',
        'Angka',
        [t('value', 'Angka', { placeholder: 'mis. 1.200+', maxLength: 12 }), t('label', 'Keterangan', { placeholder: 'mis. Pengiriman per tahun', maxLength: 28 })],
        4,
      ),
    ],
  },
  {
    key: 'clients',
    label: 'Klien',
    description: 'Kisi nama (atau logo) klien dengan keterangan sektor dan kota. Tanpa logo, nama ditulis sebagai teks.',
    toggleable: true,
    fields: [
      title('mis. Dipercaya eksportir dan importir dari berbagai sektor', 90),
      listField(
        'items',
        'Klien',
        'Klien',
        [
          t('name', 'Nama klien', { placeholder: 'mis. Rimbajati Furnitur', maxLength: 60 }),
          t('sector', 'Sektor · kota', { placeholder: 'mis. Furnitur · Jepara', maxLength: 40 }),
          img('logo', 'Logo (opsional)', 'PNG/SVG transparan; tampil abu-abu. Kosongkan untuk menulis nama.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'about',
    label: 'Tentang kami',
    description: 'Foto mendatar, cerita perusahaan, baris fakta (label di kiri, nilai di kanan), dan tautan ke proses kerja.',
    toggleable: true,
    fields: [
      eyebrow('mis. Tentang kami'),
      title('mis. Satu tim untuk dokumen, gudang, dan kapal'),
      ta('body', 'Cerita perusahaan', { placeholder: 'Pisahkan paragraf dengan baris kosong.', maxLength: 1200 }),
      img('image', 'Foto', 'Foto mendatar 3:2, disarankan 1200×800 px.'),
      listField(
        'facts',
        'Baris fakta',
        'Fakta',
        [t('label', 'Label', { placeholder: 'mis. Gudang konsolidasi', maxLength: 32 }), t('value', 'Nilai', { placeholder: 'mis. 2.400 m²', maxLength: 40 })],
        6,
      ),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Lihat cara kerja kami', maxLength: 32 }),
      url('link_url', 'Tujuan tautan', { help: `Kosongkan untuk menuju bagian Proses. ${SECTION_LINK_HELP}` }),
    ],
  },
  {
    key: 'services',
    label: 'Layanan',
    description: 'Kartu bernomor bergaris tipis dengan ikon otomatis dari judul, deskripsi, label singkat, dan foto opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Layanan'),
      title('mis. Pakai satu layanan, atau serahkan seluruh perjalanannya'),
      subtitle(),
      listField(
        'items',
        'Layanan',
        'Layanan',
        [
          t('title', 'Nama layanan', { placeholder: 'mis. Konsolidasi LCL', maxLength: 60, help: 'Ikon dipilih otomatis dari nama (kapal, kontainer, gudang, dokumen, truk, dll.).' }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan dalam 1-2 kalimat.', maxLength: 220 }),
          t('tags', 'Label singkat', { placeholder: 'mis. FCL · LCL', maxLength: 48, help: 'Pisahkan dengan · , mis. FCL · LCL' }),
          img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
        ],
        9,
      ),
    ],
  },
  {
    key: 'markets',
    label: 'Pasar & rute',
    description: 'Pita warna aksen selebar layar: kawasan tujuan beserta pelabuhan dan jumlah negara, label Incoterm, dan foto opsional.',
    toggleable: true,
    fields: [
      eyebrow('mis. Pasar'),
      title('mis. Rute rutin ke 38 negara di lima kawasan'),
      subtitle(),
      img('image', 'Foto (opsional)', 'Foto mendatar 3:2, disarankan 1200×800 px. Kosongkan untuk menyembunyikan.'),
      t('terms_label', 'Judul label Incoterm', { placeholder: 'mis. Incoterm yang kami tangani', maxLength: 40 }),
      t('terms', 'Incoterm', { placeholder: 'mis. EXW · FOB · CIF · DAP', maxLength: 80, help: 'Pisahkan dengan · atau koma; tiap kata jadi satu label.' }),
      listField(
        'regions',
        'Kawasan tujuan',
        'Kawasan',
        [
          t('name', 'Nama kawasan', { placeholder: 'mis. Asia Timur', maxLength: 40 }),
          t('ports', 'Pelabuhan', { placeholder: 'mis. Shanghai · Busan · Yokohama', maxLength: 90 }),
          t('count', 'Jumlah', { placeholder: 'mis. 6 negara', maxLength: 16 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'process',
    label: 'Proses kerja',
    description: 'Tabel langkah bernomor: judul, penjelasan, dan dokumen atau hasil di setiap langkah.',
    toggleable: true,
    fields: [
      eyebrow('mis. Proses'),
      title('mis. Lima langkah dari pertanyaan pertama sampai barang diterima'),
      subtitle(),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [
          t('title', 'Judul langkah', { placeholder: 'mis. Booking & jadwal muat', maxLength: 60 }),
          ta('text', 'Penjelasan', { maxLength: 220 }),
          t('output', 'Dokumen / hasil', { placeholder: 'mis. Konfirmasi booking', maxLength: 40 }),
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
      title('mis. Di gudang, di terminal, dan di tepi dermaga'),
      subtitle(),
      listField(
        'items',
        'Foto',
        'Foto',
        [
          img('image', 'Foto', 'Foto pertama tampil lebar 21:9: 1600×900 px; lainnya 3:2 1200×800 px.'),
          t('caption', 'Keterangan', { placeholder: 'mis. Forklift memindahkan palet di gudang', maxLength: 80 }),
        ],
        9,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Kartu kutipan klien dengan rute pengiriman, nama, jabatan, dan foto persegi (atau inisial).',
    toggleable: true,
    fields: [
      eyebrow('mis. Testimoni'),
      title('mis. Kata pengirim yang sudah berangkat bersama kami'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { maxLength: 60 }),
          t('role', 'Jabatan & perusahaan', { placeholder: 'mis. Manajer ekspor, produsen furnitur', maxLength: 80 }),
          t('route', 'Rute', { placeholder: 'mis. Surabaya → Busan · LCL 6 CBM', maxLength: 48, help: 'mis. Surabaya → Busan · LCL 6 CBM' }),
          ta('quote', 'Kutipan', { maxLength: 400 }),
          img('photo', 'Foto', 'Foto persegi wajah, 480×480 px. Kosongkan untuk inisial.'),
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
      title('mis. Pertanyaan yang sering kami terima'),
      subtitle('mis. Belum terjawab? Tanyakan langsung ke tim kami.', 200),
      t('link_label', 'Teks tautan', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('link_url', 'Tujuan tautan', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [t('question', 'Pertanyaan', { maxLength: 120 }), ta('answer', 'Jawaban', { maxLength: 500 })],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan',
    description: 'Kotak bergaris tipis dengan garis rute kecil di atasnya, judul, dan dua tombol.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Siap berangkat?', maxLength: 40 }),
      title('mis. Kirim detail barang Anda, kami susun penawarannya', 100),
      subtitle('Satu-dua kalimat ajakan.', 220),
      t('button_label', 'Teks tombol utama', { placeholder: 'mis. Minta Penawaran', maxLength: 30 }),
      url('button_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju formulir di bagian Kontak.' }),
      t('secondary_label', 'Teks tautan kedua', { placeholder: 'mis. Konsultasi via WhatsApp', maxLength: 30 }),
      url('secondary_url', 'Tautan kedua', { help: 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).' }),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & formulir penawaran',
    description:
      'Baris kontak, peta Google Maps, dan formulir permintaan penawaran (produk, volume, Incoterm, negara tujuan/asal) yang menyusun pesan WhatsApp. Data formulir tidak disimpan di website.',
    toggleable: true,
    fields: [
      eyebrow('mis. Kontak'),
      title('mis. Ceritakan kiriman Anda'),
      subtitle(),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 200 }),
      t('maps_query', 'Kata kunci peta', {
        placeholder: 'mis. Pelabuhan Tanjung Perak, Surabaya',
        maxLength: 120,
        help: 'Nama kantor + kota seperti di Google Maps, atau alamat lengkap. Kosongkan untuk memakai alamat.',
      }),
      url('maps_url', 'Link atau kode embed Google Maps (opsional)', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Link lokasi dipakai untuk "Buka di Google Maps"; kode embed (<iframe …>) dipakai untuk petanya.',
      }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (031) 555-0182', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'penawaran@perusahaan.co.id', maxLength: 120 },
      {
        type: 'phone',
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: 'mis. 081234567890',
        maxLength: 20,
        help: 'Dipakai tombol WhatsApp melayang, tombol ajakan, dan formulir penawaran.',
      },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang pengiriman barang.', maxLength: 160 }),
      t('hours', 'Jam kerja', { placeholder: 'mis. Senin–Jumat 08.00–17.00 WIB', maxLength: 90 }),
      t('form_title', 'Formulir: judul', { placeholder: 'mis. Formulir permintaan penawaran', maxLength: 60 }),
      ta('form_text', 'Formulir: keterangan', { maxLength: 220, help: 'Tampil di bawah tombol kirim. Sebutkan bahwa data tidak disimpan di website.' }),
      t('form_button', 'Formulir: teks tombol', { placeholder: 'mis. Susun pesan WhatsApp', maxLength: 30 }),
      listField(
        'form_services',
        'Pilihan jenis layanan di formulir',
        'Pilihan',
        [t('label', 'Pilihan', { placeholder: 'mis. Ekspor', maxLength: 30 })],
        6,
      ),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita teal-hitam: logo, deskripsi, menu, media sosial, nama perusahaan berukuran besar, dan hak cipta.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang perusahaan Anda.', maxLength: 220 }),
      t('wordmark', 'Teks besar di footer', {
        placeholder: 'mis. Lintas Dermaga Nusantara',
        maxLength: 30,
        help: 'Teks besar di footer. Kosongkan untuk memakai nama perusahaan tanpa PT/CV.',
      }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Perusahaan', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama perusahaan.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
