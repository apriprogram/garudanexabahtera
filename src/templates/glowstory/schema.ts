// Skema CMS GlowStory. Urutan section = urutan halaman: hero kolase → strip berjalan → kategori → produk terlaris →
// kuis jenis kulit → langganan isi ulang → ulasan berfoto → brand lokal → tanya jawab → ajakan → kontak → footer.
// Kunci company profile (brand, hero, testimonials, cta, contact, footer) sama artinya dengan template lain; section
// toko memakai kunci Inggris pendek (`perks`, `categories`, `products`, `quiz`, `refill`, `brands`, `faq`). Template
// baru belum punya konten tersimpan, jadi tanpa `introduced`.
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

const sectionLabel = (placeholder: string) =>
  t('eyebrow', 'Label kecil di atas judul', {
    placeholder,
    maxLength: 40,
    help: 'Huruf kapital kecil di atas judul. Label yang singkat juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const sectionTitle = (placeholder: string, maxLength = 100) => t('title', 'Judul', { placeholder, maxLength });
const sectionHighlight = (placeholder: string) =>
  t('highlight', 'Kata miring berwarna', {
    placeholder,
    maxLength: 40,
    help: 'Bagian dari judul yang ditulis miring dengan warna aksen. Tulis persis seperti di judul, atau kosongkan.',
  });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 280 });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';
const ROUTINE_HELP =
  'Satu baris satu langkah dengan format: Langkah | Nama produk | Harga. Harga boleh dikosongkan; langkah berharga bisa langsung dimasukkan ke keranjang.';

export const glowstorySections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama toko, logo, dan warna aksen (tombol utama, label diskon, dan kata miring di judul).',
    fields: [
      t('company_name', 'Nama toko', { placeholder: 'mis. Seruni Beauty', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Perawatan harian dari brand lokal pilihan', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol tetes & kilau bawaan template dan nama toko.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Dipakai untuk tombol utama, label diskon, panel ajakan, dan kata miring di judul. Warna terang otomatis digelapkan untuk teks agar tetap terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (kolase foto)',
    description: 'Judul besar dengan kata miring berwarna di kiri; kolase satu foto tegak dan dua foto kecil di kanan, lengkap dengan kartu produk unggulan dan lencana rating.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Sejak 2019 — brand lokal terkurasi', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Kulit sehat dimulai dari rutinitas kecil.', maxLength: 80, help: 'Paling bagus 3 baris (± 35–45 karakter).' }),
      t('highlight', 'Kata miring berwarna', { placeholder: 'mis. rutinitas', maxLength: 40, help: 'Bagian dari judul yang ditulis miring dengan warna aksen. Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Jelaskan singkat apa yang Anda jual.', maxLength: 260 }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Belanja sekarang', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju bagian Produk terlaris.' }),
      t('secondary_label', 'Teks tautan kedua', { placeholder: 'mis. Ikuti kuis kulit', maxLength: 30 }),
      url('secondary_url', 'Tautan kedua', { help: 'Kosongkan untuk menuju kuis jenis kulit.' }),
      img('image', 'Foto utama (tegak)', 'Foto tegak 4:5, disarankan 1200×1500 px. Foto ini dimuat paling awal.'),
      img('image_2', 'Foto kecil atas', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      img('image_3', 'Foto kecil bawah', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk menyembunyikan.'),
      t('rating_value', 'Lencana rating: angka', { placeholder: 'mis. 4,9', maxLength: 6, help: 'Lencana gelap di atas kolase. Kosongkan angka untuk menyembunyikan.' }),
      t('rating_label', 'Lencana rating: keterangan', { placeholder: 'mis. 6.420 ulasan pembeli', maxLength: 40 }),
      t('featured_label', 'Kartu unggulan: label', { placeholder: 'mis. Paling laris', maxLength: 24, help: 'Kartu putih di sudut foto utama. Kosongkan nama produk untuk menyembunyikan.' }),
      t('featured_name', 'Kartu unggulan: nama produk', { placeholder: 'mis. Serum Niasinamida 5%', maxLength: 50 }),
      t('featured_price', 'Kartu unggulan: harga', { placeholder: 'mis. Rp119.000 · 20 ml', maxLength: 40 }),
      url('featured_url', 'Kartu unggulan: tautan', { help: 'Kosongkan untuk menuju bagian Produk terlaris.' }),
    ],
  },
  {
    key: 'perks',
    label: 'Strip berjalan',
    description: 'Pita gelap di bawah hero berisi keunggulan toko yang bergerak pelan (diam di pratinjau dan bila pengunjung mematikan animasi).',
    toggleable: true,
    fields: [listField('items', 'Isi strip', 'Keunggulan', [t('text', 'Teks', { placeholder: 'mis. Gratis ongkir di atas Rp150.000', maxLength: 50 })], 8)],
  },
  {
    key: 'categories',
    label: 'Kategori',
    description: 'Kartu foto tegak per kategori. Tombolnya menyaring Produk terlaris sesuai nama kategori.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kategori'),
      sectionTitle('mis. Belanja sesuai kebutuhan'),
      sectionHighlight('mis. kebutuhan'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar kategori',
        'Kategori',
        [
          t('name', 'Nama kategori', { placeholder: 'mis. Skincare', maxLength: 30, help: 'Samakan dengan isian "Kategori" di produk agar tombolnya bisa menyaring produk.' }),
          ta('description', 'Deskripsi', { placeholder: 'Jelaskan isi kategori dalam satu kalimat.', maxLength: 140 }),
          t('count', 'Keterangan jumlah', { placeholder: 'mis. 48 produk', maxLength: 20 }),
          img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
          url('url', 'Tautan (opsional)', { help: 'Kosongkan untuk menyaring Produk terlaris di halaman ini.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Produk terlaris',
    description: 'Grid kartu produk dengan foto, merek, harga, harga coret, rating, label, dan tombol keranjang. Pengunjung bisa menyaring per kategori; keranjang dikirim sebagai pesanan WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Terlaris'),
      sectionTitle('mis. Paling sering dibeli ulang'),
      sectionHighlight('mis. dibeli ulang'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar produk',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Serum Niasinamida 5%', maxLength: 60 }),
          t('brand', 'Merek', { placeholder: 'mis. Kembang Lab', maxLength: 40 }),
          t('category', 'Kategori', { placeholder: 'mis. Skincare', maxLength: 30, help: 'Dipakai untuk tombol saring di atas grid.' }),
          t('meta', 'Ukuran / keterangan', { placeholder: 'mis. 20 ml · semua jenis kulit', maxLength: 50 }),
          t('price', 'Harga', { placeholder: 'mis. Rp119.000', maxLength: 20, help: 'Tulis dengan angka agar total keranjang bisa dihitung.' }),
          t('old_price', 'Harga coret (opsional)', { placeholder: 'mis. Rp139.000', maxLength: 20 }),
          t('rating', 'Rating', { placeholder: 'mis. 4,9', maxLength: 4 }),
          t('reviews', 'Jumlah ulasan', { placeholder: 'mis. 1.284', maxLength: 10 }),
          t('badge', 'Label', { placeholder: 'mis. Terlaris atau -20%', maxLength: 20, help: 'Label di sudut foto. Kosongkan untuk menyembunyikan.' }),
          img('image', 'Foto produk', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
          url('url', 'Tautan beli (opsional)', { help: 'Mis. halaman produk di marketplace. Kosongkan untuk memakai tombol keranjang (pesan lewat WhatsApp).' }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'quiz',
    label: 'Kuis jenis kulit',
    description:
      'Kuis 2–4 pertanyaan di halaman (tanpa login). Jawaban ke-1 setiap pertanyaan memberi poin untuk Tipe kulit ke-1, jawaban ke-2 untuk tipe ke-2, dan seterusnya; tipe dengan poin terbanyak menjadi hasil, lengkap dengan rutinitas pagi & malam.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kuis Kulit'),
      sectionTitle('mis. Kenali kulitmu, temukan rutinitas yang pas.'),
      sectionHighlight('mis. rutinitas'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px. Tampil di samping kuis (layar lebar).'),
      t('start_label', 'Teks tombol mulai', { placeholder: 'mis. Mulai kuis', maxLength: 24 }),
      ta('note', 'Catatan kecil', { placeholder: 'mis. Hasil kuis adalah saran umum, bukan diagnosis dokter.', maxLength: 200 }),
      listField(
        'questions',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Beberapa jam setelah cuci muka, kulitmu terasa…', maxLength: 100 }),
          t('answer_1', 'Jawaban 1 (poin untuk tipe 1)', { placeholder: 'mis. Kencang dan kering', maxLength: 70 }),
          t('answer_2', 'Jawaban 2 (poin untuk tipe 2)', { placeholder: 'mis. Mengilap di seluruh wajah', maxLength: 70 }),
          t('answer_3', 'Jawaban 3 (poin untuk tipe 3)', { placeholder: 'mis. Mengilap di area T saja', maxLength: 70 }),
          t('answer_4', 'Jawaban 4 (poin untuk tipe 4)', { placeholder: 'mis. Mudah merah atau perih', maxLength: 70, help: 'Jawaban yang kosong tidak ditampilkan. Pertanyaan butuh minimal 2 jawaban.' }),
        ],
        4,
      ),
      listField(
        'types',
        'Tipe kulit & rutinitas',
        'Tipe kulit',
        [
          t('name', 'Nama tipe', { placeholder: 'mis. Kulit Berminyak', maxLength: 40 }),
          ta('summary', 'Penjelasan singkat', { placeholder: 'Ciri-ciri dan fokus perawatannya.', maxLength: 220 }),
          ta('morning', 'Rutinitas pagi', { placeholder: 'Pembersih | Gel Pembersih Teh Hijau | Rp65.000', maxLength: 600, help: ROUTINE_HELP }),
          ta('night', 'Rutinitas malam', { placeholder: 'Pembersih | Gel Pembersih Teh Hijau | Rp65.000', maxLength: 600, help: ROUTINE_HELP }),
          ta('tip', 'Tips (opsional)', { placeholder: 'mis. Jangan lewatkan pelembap.', maxLength: 200 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'refill',
    label: 'Langganan isi ulang',
    description: 'Pengunjung memilih produk dan jadwal kirim; harga per kiriman, hemat per kiriman, dan perkiraan hemat setahun dihitung otomatis. Tombolnya membuka WhatsApp berisi pilihan tersebut.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Langganan'),
      sectionTitle('mis. Isi ulang otomatis, tidak pernah kehabisan.'),
      sectionHighlight('mis. tidak pernah'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
      t('badge', 'Label di foto', { placeholder: 'mis. Hemat hingga 15%', maxLength: 30, help: 'Kosongkan untuk menyembunyikan.' }),
      listField(
        'products',
        'Produk yang bisa dilanggan',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Gel Pembersih Teh Hijau', maxLength: 60 }),
          t('size', 'Ukuran', { placeholder: 'mis. Isi ulang 200 ml', maxLength: 30 }),
          t('price', 'Harga normal', { placeholder: 'mis. Rp98.000', maxLength: 20, help: 'Tulis dengan angka agar potongan bisa dihitung.' }),
        ],
        6,
      ),
      listField(
        'intervals',
        'Pilihan jadwal kirim',
        'Jadwal',
        [
          t('label', 'Teks pilihan', { placeholder: 'mis. Setiap 4 minggu', maxLength: 30 }),
          t('weeks', 'Jarak kirim (minggu)', { placeholder: 'mis. 4', maxLength: 2, help: 'Angka minggu, dipakai untuk menghitung jumlah kiriman setahun.' }),
          t('discount', 'Potongan (%)', { placeholder: 'mis. 12', maxLength: 2 }),
        ],
        4,
      ),
      listField('points', 'Keuntungan langganan', 'Keuntungan', [t('text', 'Keuntungan', { placeholder: 'mis. Berhenti kapan saja', maxLength: 70 })], 5),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Mulai langganan', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp berisi produk dan jadwal yang dipilih.' }),
      ta('note', 'Catatan kecil', { placeholder: 'mis. Dibayar per kiriman, tanpa penagihan otomatis.', maxLength: 200 }),
    ],
  },
  {
    key: 'testimonials',
    label: 'Ulasan berfoto',
    description: 'Ringkasan rating dan kartu ulasan pelanggan; foto pelanggan bisa diperbesar. Ulasan tanpa foto tampil sebagai kartu kutipan berwarna.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Ulasan'),
      sectionTitle('mis. Dipakai, difoto, lalu dibeli lagi.'),
      sectionHighlight('mis. dibeli lagi'),
      t('rating_value', 'Rating rata-rata', { placeholder: 'mis. 4,9', maxLength: 6, help: 'Kosongkan untuk menyembunyikan ringkasan rating.' }),
      t('rating_label', 'Keterangan rating', { placeholder: 'mis. dari 6.420 ulasan pembeli', maxLength: 50 }),
      listField(
        'items',
        'Ulasan',
        'Ulasan',
        [
          t('name', 'Nama', { placeholder: 'mis. Laras Pramesti', maxLength: 60 }),
          t('role', 'Kota / jenis kulit', { placeholder: 'mis. Sleman · kulit kombinasi', maxLength: 60 }),
          t('product', 'Produk yang diulas', { placeholder: 'mis. Serum Niasinamida 5%', maxLength: 60 }),
          t('rating', 'Bintang (1–5)', { placeholder: 'mis. 5', maxLength: 3 }),
          ta('quote', 'Ulasan', { placeholder: 'Tulis ulasan pelanggan (dengan izin mereka).', maxLength: 360 }),
          img('photo', 'Foto pelanggan (opsional)', 'Foto produk atau pemakaian dari pelanggan, tegak 4:5. Kosongkan untuk kartu kutipan tanpa foto.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'brands',
    label: 'Brand lokal',
    description: 'Strip nama atau logo brand yang Anda jual, bergerak pelan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Brand lokal'),
      sectionTitle('mis. Dari peracik kecil di seluruh Nusantara'),
      listField(
        'items',
        'Daftar brand',
        'Brand',
        [
          t('name', 'Nama brand', { placeholder: 'mis. Kembang Lab', maxLength: 40 }),
          t('city', 'Kota asal (opsional)', { placeholder: 'mis. Bandung', maxLength: 30 }),
          img('logo', 'Logo (opsional)', 'PNG/SVG berlatar transparan. Kosongkan untuk menampilkan nama brand dengan huruf template.'),
        ],
        12,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    description: 'Daftar pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp di kiri.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Tanya Jawab'),
      sectionTitle('mis. Pertanyaan yang sering diajukan'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Bingung memilih produk?', maxLength: 60 }),
      ta('help_text', 'Kartu bantuan: teks', { placeholder: 'mis. Ceritakan jenis kulitmu, kami bantu pilihkan.', maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Berapa lama pengiriman pesanan?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'cta',
    label: 'Ajakan (CTA)',
    description: 'Pita warna aksen dengan judul, tombol, dan foto di kanan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Klub Seruni'),
      t('title', 'Judul', { placeholder: 'mis. Dapat kabar rilis lebih dulu.', maxLength: 80 }),
      t('highlight', 'Kata miring', { placeholder: 'mis. lebih dulu', maxLength: 40, help: 'Bagian dari judul yang ditulis miring. Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Kalimat ajakan singkat.', maxLength: 220 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Gabung lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk pita tanpa foto.'),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    toggleable: true,
    fields: [
      sectionLabel('mis. Bantuan'),
      sectionTitle('mis. Butuh bantuan memilih?'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk semua tombol WhatsApp dan pesanan dari keranjang.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang produk.', maxLength: 160 }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0274) 555-0123', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@toko.id', maxLength: 120 },
      t('hours', 'Jam layanan', { placeholder: 'mis. Setiap hari, 08.00–21.00 WIB', maxLength: 80 }),
      ta('address', 'Alamat toko / gudang (opsional)', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tautan "Buka di Google Maps" di bawah alamat. Dibuat otomatis dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Pita gelap berisi logo, deskripsi, menu, kontak singkat, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang toko Anda.', maxLength: 220 }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Toko. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama toko.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
