// Skema CMS TaniMakmur. Urutan section = urutan halaman: hero ladang (dengan strip keunggulan) → kategori → pilih
// tanamanmu (paket tanam) → produk terlaris → konsultasi penyuluh → panduan → testimoni → tanya jawab → kontak → footer.
// Kunci company profile (brand, hero, testimonials, contact, footer) sama artinya dengan template lain; section baru
// memakai kunci Inggris pendek (`categories`, `bundles`, `products`, `consult`, `tips`, `faq`). Template baru belum punya
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

const sectionLabel = (placeholder: string) =>
  t('eyebrow', 'Label kecil di atas judul', {
    placeholder,
    maxLength: 40,
    help: 'Label yang singkat juga dipakai di menu atas. Kosongkan untuk menyembunyikan.',
  });
const sectionTitle = (placeholder: string, maxLength = 110) => t('title', 'Judul', { placeholder, maxLength });
const sectionHighlight = (placeholder: string) =>
  t('highlight', 'Kata yang disorot', {
    placeholder,
    maxLength: 60,
    help: 'Bagian dari judul yang diberi warna aksen. Tulis persis seperti di judul, atau kosongkan.',
  });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 260 });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';
const PRICE_HELP = 'Tulis lengkap, mis. Rp28.000.';

export const taniSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama toko, logo, dan warna aksen (lingkaran ajakan di hero, tombol pesan, bintang ulasan, label).',
    fields: [
      t('company_name', 'Nama toko', { placeholder: 'mis. TaniMakmur', maxLength: 80 }),
      t('tagline', 'Tagline', { placeholder: 'mis. Benih, pupuk & alat tani untuk panen yang lebih tenang', maxLength: 100, help: 'Tampil di footer dan judul tab browser.' }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol tunas bawaan template dan nama toko.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Paling bagus warna cerah (kuning, oranye, hijau muda) karena tampil di atas hijau tua. Teks di atas tombol otomatis gelap atau putih agar terbaca.',
      },
    ],
  },
  {
    key: 'hero',
    label: 'Hero (foto ladang)',
    description:
      'Foto ladang selebar layar dengan judul putih besar, foto bulat dengan lingkaran ajakan, kartu kutipan kecil, kartu angka, dan strip keunggulan berjalan di bawahnya.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Toko tani untuk petani muda & urban farmer', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', { placeholder: 'mis. Benih tepat, panen lebih tenang', maxLength: 60, help: 'Paling bagus 3–5 kata pendek (± 20–40 karakter).' }),
      t('highlight', 'Kata yang disorot', { placeholder: 'mis. panen', maxLength: 30, help: 'Bagian judul yang diberi warna aksen. Tulis persis seperti di judul, atau kosongkan.' }),
      ta('subtitle', 'Deskripsi', { placeholder: 'Jelaskan singkat apa yang toko Anda jual.', maxLength: 220 }),
      t('primary_label', 'Teks lingkaran ajakan', { placeholder: 'mis. Mulai Belanja', maxLength: 22, help: 'Tampil di lingkaran warna aksen di samping foto bulat. Paling bagus 1–2 kata.' }),
      url('primary_url', 'Tautan lingkaran ajakan', { help: 'Kosongkan untuk menuju bagian Produk terlaris.' }),
      t('secondary_label', 'Teks tautan konsultasi', { placeholder: 'mis. Konsultasi gratis via WhatsApp', maxLength: 40, help: 'Tautan berikon WhatsApp di bawah deskripsi. Kosongkan untuk menyembunyikan.' }),
      url('secondary_url', 'Tautan konsultasi', { help: WA_HELP }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Konsultasi Gratis', maxLength: 24, help: 'Kosongkan untuk memakai teks tautan konsultasi.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: 'Kosongkan untuk memakai tautan konsultasi.' }),
      img('image', 'Foto latar', 'Foto mendatar ladang/kebun, disarankan 1920×1200 px. Lapisan hijau gelap ditambahkan otomatis agar judul terbaca.'),
      img('spot_image', 'Foto bulat', 'Foto tanaman atau produk, dipotong bulat. Disarankan persegi 1000×1000 px. Kosongkan untuk menyembunyikan (lingkaran ajakan pindah ke bawah deskripsi).'),
      img('card_image', 'Kartu kutipan: foto', 'Foto kecil di kartu kanan (layar lebar), disarankan 480×360 px.'),
      t('card_quote', 'Kartu kutipan: kutipan', { placeholder: 'mis. Cabai di pekarangan saya berbuah lebat.', maxLength: 90, help: 'Kosongkan kutipan & nama untuk menyembunyikan kartu.' }),
      t('card_name', 'Kartu kutipan: nama', { placeholder: 'mis. Pak Darto, petani cabai di Magelang', maxLength: 60 }),
      t('stats_label', 'Keterangan di samping angka', { placeholder: 'mis. Dipercaya petani & penghobi kebun', maxLength: 60 }),
      listField(
        'stats',
        'Angka',
        'Angka',
        [
          t('value', 'Angka', { placeholder: 'mis. 4,9/5', maxLength: 12 }),
          t('label', 'Keterangan', { placeholder: 'mis. Rata-rata ulasan pembeli', maxLength: 60 }),
        ],
        3,
      ),
      listField(
        'ticker',
        'Strip keunggulan berjalan',
        'Keunggulan',
        [t('text', 'Teks', { placeholder: 'mis. Benih bersertifikat', maxLength: 40, help: 'Ikon dipilih otomatis dari teks (benih, pupuk, kirim, konsultasi, bayar, dll.).' })],
        8,
      ),
    ],
  },
  {
    key: 'categories',
    label: 'Kategori',
    description: 'Kartu kategori bernomor dengan foto. Klik kartu menggulir ke Produk terlaris dan memfilter kategori yang sama.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kategori'),
      sectionTitle('mis. Semua kebutuhan tanam dalam satu toko'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar kategori',
        'Kategori',
        [
          t('title', 'Nama kategori', { placeholder: 'mis. Benih', maxLength: 40, help: 'Samakan dengan kategori produk agar klik kartu memfilter produknya. Ikon dipilih otomatis dari nama.' }),
          ta('text', 'Deskripsi', { placeholder: 'Jelaskan dalam 1 kalimat.', maxLength: 140 }),
          t('meta', 'Keterangan kecil', { placeholder: 'mis. 64 produk', maxLength: 24 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px. Kosongkan untuk memakai latar hijau bawaan dengan ikon.'),
          url('url', 'Tautan (opsional)', { help: 'Kosongkan untuk menuju Produk terlaris dengan filter kategori ini.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'bundles',
    label: 'Pilih tanamanmu (paket tanam)',
    description:
      'Tombol pilihan tanaman; tanaman yang dipilih menampilkan paket lengkap di panel hijau tua: foto, isi paket dengan harga, jadwal tanam bergaris, total harga, dan tombol pesan lewat WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Paket Tanam'),
      sectionTitle('mis. Pilih tanamanmu, kami siapkan paketnya'),
      sectionHighlight('mis. kami siapkan paketnya'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan kecil di bawah panel', { placeholder: 'mis. Perkiraan panen tergantung cuaca dan perawatan.', maxLength: 200 }),
      listField(
        'items',
        'Daftar paket',
        'Paket',
        [
          t('crop', 'Nama tanaman (tombol pilihan)', { placeholder: 'mis. Cabai', maxLength: 20, help: 'Ikon dipilih otomatis (cabai, tomat, hidroponik, sayur daun).' }),
          t('title', 'Nama paket', { placeholder: 'mis. Paket Cabai Rawit dalam Pot', maxLength: 60 }),
          ta('description', 'Deskripsi', { placeholder: 'Untuk siapa paket ini dan hasil yang bisa diharapkan.', maxLength: 220 }),
          img('image', 'Foto', 'Foto tanaman, disarankan persegi 1200×1200 px.'),
          t('level', 'Tingkat kesulitan', { placeholder: 'mis. Pemula', maxLength: 20 }),
          t('harvest', 'Perkiraan panen', { placeholder: 'mis. Panen pertama ± 3,5 bulan setelah semai', maxLength: 60 }),
          t('place', 'Cocok untuk', { placeholder: 'mis. Balkon & teras', maxLength: 40 }),
          ta('contents', 'Isi paket', {
            placeholder: 'Satu baris satu barang, harga boleh ditulis setelah tanda |, mis.\nBenih cabai rawit hibrida (±100 biji) | Rp28.000\nPot 30 cm (3 buah) | Rp36.000',
            maxLength: 600,
          }),
          ta('stages', 'Jadwal tanam (minggu)', {
            placeholder: 'Satu baris satu tahap: nama tahap | jumlah minggu, mis.\nSemai | 4\nTumbuh daun | 6\nBerbunga & berbuah | 5\nPanen bertahap | 8',
            maxLength: 300,
            help: 'Ditampilkan sebagai grafik garis waktu. Kosongkan untuk menyembunyikan grafik.',
          }),
          t('price', 'Harga paket', { placeholder: 'mis. Rp105.000', maxLength: 20, help: PRICE_HELP }),
          t('compare_price', 'Harga normal (dicoret)', { placeholder: 'mis. Rp119.000', maxLength: 20, help: 'Bila lebih mahal dari harga paket, selisihnya tampil sebagai "Hemat". Kosongkan bila tidak ada.' }),
          t('button_label', 'Teks tombol', { placeholder: 'mis. Pesan Paket Cabai', maxLength: 30 }),
          url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp berisi nama paket.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Produk terlaris',
    description: 'Kartu produk dengan foto, label, rating, harga, dan tombol pesan lewat WhatsApp; bisa difilter per kategori.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Terlaris'),
      sectionTitle('mis. Produk yang paling sering dibeli bulan ini'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('button_label', 'Teks tombol katalog', { placeholder: 'mis. Minta katalog lengkap', maxLength: 30, help: 'Tombol di bawah daftar produk. Kosongkan untuk menyembunyikan.' }),
      url('button_url', 'Tautan tombol katalog', { help: 'Mis. tautan toko di marketplace. ' + WA_HELP }),
      listField(
        'items',
        'Daftar produk',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Benih Cabai Rawit Hibrida', maxLength: 60 }),
          t('category', 'Kategori', { placeholder: 'mis. Benih', maxLength: 30, help: 'Dipakai untuk tombol filter. Samakan penulisannya untuk produk sekategori.' }),
          img('image', 'Foto', 'Foto persegi 1:1, disarankan 640×640 px.'),
          t('variant', 'Isi / ukuran', { placeholder: 'mis. ±100 biji', maxLength: 30 }),
          t('price', 'Harga', { placeholder: 'mis. Rp28.000', maxLength: 20, help: PRICE_HELP }),
          t('compare_price', 'Harga coret (opsional)', { placeholder: 'mis. Rp32.000', maxLength: 20 }),
          t('rating', 'Rating', { placeholder: 'mis. 4,9', maxLength: 4, help: 'Angka 1–5. Kosongkan untuk menyembunyikan bintang.' }),
          t('sold', 'Keterangan terjual / ulasan', { placeholder: 'mis. 1,2 rb terjual', maxLength: 24 }),
          t('badge', 'Label', { placeholder: 'mis. Terlaris', maxLength: 20 }),
          url('url', 'Tautan (opsional)', { help: 'Mis. halaman produk di marketplace. Kosongkan untuk membuka WhatsApp berisi nama produk.' }),
        ],
        12,
      ),
    ],
  },
  {
    key: 'consult',
    label: 'Konsultasi penyuluh',
    description: 'Panel hijau tua: langkah konsultasi, daftar penyuluh, jam layanan, tombol WhatsApp, dan foto dengan contoh percakapan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Konsultasi Gratis'),
      sectionTitle('mis. Tanaman bermasalah? Tanya penyuluh lewat WhatsApp'),
      sectionHighlight('mis. Tanya penyuluh'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      img('image', 'Foto', 'Foto tegak 4:5, disarankan 1200×1500 px.'),
      t('chat_question', 'Contoh pertanyaan', { placeholder: 'mis. Daun cabai saya keriting, kenapa ya?', maxLength: 100, help: 'Gelembung chat di atas foto. Kosongkan pertanyaan & jawaban untuk menyembunyikan.' }),
      ta('chat_answer', 'Contoh jawaban penyuluh', { placeholder: 'mis. Bisa karena thrips. Boleh kirim foto daun bagian bawahnya?', maxLength: 180 }),
      listField(
        'steps',
        'Langkah konsultasi',
        'Langkah',
        [
          t('title', 'Judul', { placeholder: 'mis. Kirim foto tanaman', maxLength: 40 }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam 1 kalimat.', maxLength: 130 }),
        ],
        4,
      ),
      listField(
        'experts',
        'Penyuluh',
        'Penyuluh',
        [
          t('name', 'Nama', { placeholder: 'mis. Rina Lestari, S.P.', maxLength: 50 }),
          t('role', 'Keahlian', { placeholder: 'mis. Penyuluh hortikultura', maxLength: 60 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk memakai inisial.'),
        ],
        3,
      ),
      t('hours', 'Jam layanan', { placeholder: 'mis. Senin–Sabtu, 08.00–17.00 WIB', maxLength: 60 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Chat Penyuluh Sekarang', maxLength: 30 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      t('wa_message', 'Pesan awal WhatsApp konsultasi', { placeholder: 'mis. Halo, saya ingin konsultasi tanaman dengan penyuluh.', maxLength: 160, help: 'Kosongkan untuk memakai pesan awal di bagian Kontak.' }),
    ],
  },
  {
    key: 'tips',
    label: 'Panduan',
    description: 'Kartu tips/panduan urban farming dengan foto, label, lama baca, dan tautan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Panduan'),
      sectionTitle('mis. Belajar menanam dari balkon sampai kebun'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar panduan',
        'Panduan',
        [
          t('title', 'Judul', { placeholder: 'mis. Menanam cabai rawit di pot', maxLength: 70 }),
          t('category', 'Label', { placeholder: 'mis. Pemula', maxLength: 20 }),
          t('read_time', 'Lama baca', { placeholder: 'mis. 5 menit baca', maxLength: 20 }),
          ta('excerpt', 'Ringkasan', { placeholder: 'Jelaskan isi panduan dalam 1–2 kalimat.', maxLength: 180 }),
          img('image', 'Foto (opsional)', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
          url('url', 'Tautan (opsional)', { help: 'Mis. artikel blog atau video. Kosongkan untuk "Minta panduan lengkap" lewat WhatsApp.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Testimoni',
    description: 'Kartu ulasan pembeli dengan bintang, kutipan, produk yang dibeli, nama, dan foto (atau inisial).',
    toggleable: true,
    fields: [
      sectionLabel('mis. Cerita Pelanggan'),
      sectionTitle('mis. Kebun mereka tumbuh, cerita mereka juga'),
      listField(
        'items',
        'Testimoni',
        'Testimoni',
        [
          t('name', 'Nama', { placeholder: 'mis. Nadia Putri', maxLength: 60 }),
          t('role', 'Keterangan', { placeholder: 'mis. Penghobi kebun balkon, Surabaya', maxLength: 80 }),
          ta('quote', 'Testimoni', { placeholder: 'Tulis kesan pembeli...', maxLength: 320 }),
          t('product', 'Produk yang dibeli (opsional)', { placeholder: 'mis. Paket Cabai Rawit dalam Pot', maxLength: 60 }),
          t('rating', 'Bintang', { placeholder: 'mis. 5', maxLength: 3, help: 'Angka 1–5. Kosongkan untuk menyembunyikan bintang.' }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk memakai inisial.'),
        ],
        6,
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
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih bingung memilih?', maxLength: 60 }),
      ta('help_text', 'Kartu bantuan: teks', { placeholder: 'mis. Ceritakan tanaman dan lahan Anda, kami bantu pilihkan.', maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya lewat WhatsApp', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Bagaimana cara memesan?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kios & Gudang'),
      sectionTitle('mis. Mampir ke kios kami atau pesan dari rumah'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (0341) 555-0123', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@toko.id', maxLength: 120 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk semua tombol pesan dan konsultasi di halaman.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya ingin bertanya tentang produk TaniMakmur.', maxLength: 160 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Senin–Sabtu, 07.00–17.00 WIB', maxLength: 80 }),
      ta('shipping', 'Info pengiriman', { placeholder: 'mis. Dikirim lewat JNE, J&T, dan SiCepat ke seluruh Indonesia.', maxLength: 200 }),
      url('maps_url', 'Link Google Maps', {
        placeholder: 'https://maps.app.goo.gl/...',
        help: 'Tempel link lokasi dari Google Maps. Peta otomatis dibuat dari alamat bila dikosongkan.',
      }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Logo, deskripsi, kategori, menu, kontak singkat, dan media sosial di bidang hijau tua.',
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
