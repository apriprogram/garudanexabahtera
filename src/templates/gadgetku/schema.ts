// Skema CMS GadgetKu.id. Urutan section = urutan halaman: hero kartu gelap → cari per tipe HP → kategori → produk
// terbaru → bundling hemat → custom casing → strip layanan → ulasan → tanya jawab → kontak → footer. Kunci company
// profile (brand, hero, testimonials, contact, footer) sama artinya dengan template lain; section toko memakai kunci
// Inggris pendek (`finder`, `categories`, `products`, `bundles`, `custom`, `perks`, `faq`). Template baru belum punya
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
const sectionTitle = (placeholder: string, maxLength = 100) => t('title', 'Judul', { placeholder, maxLength });
const sectionSubtitle = (placeholder: string) => ta('subtitle', 'Deskripsi singkat', { placeholder, maxLength: 260 });
const price = (key: string, label: string, help?: string) => t(key, label, { placeholder: 'mis. Rp59.000', maxLength: 20, help });
const WA_HELP = 'Kosongkan untuk membuka WhatsApp (nomor di bagian Kontak).';

export const gadgetkuSections: TemplateSection[] = [
  {
    key: 'brand',
    label: 'Identitas & warna',
    description: 'Nama toko, logo, warna aksen, dan pengumuman di bilah hitam paling atas.',
    fields: [
      t('company_name', 'Nama toko', { placeholder: 'mis. GadgetKu.id', maxLength: 60 }),
      t('tagline', 'Tagline', {
        placeholder: 'mis. Toko aksesoris HP: casing & tempered glass',
        maxLength: 100,
        help: 'Tampil di footer dan menjadi bagian judul situs di tab browser dan hasil Google. Sebutkan jenis toko, mis. "Toko aksesoris HP".',
      }),
      img('logo', 'Logo', 'PNG/SVG berlatar transparan, maks. 2 MB. Kosongkan untuk memakai simbol HP & kilat bawaan template dan nama toko.'),
      {
        type: 'color',
        key: 'accent_color',
        label: 'Warna aksen',
        help: 'Dipakai untuk tombol utama, label, dan kata sorotan. Di latar gelap warna otomatis dicerahkan, di latar putih digelapkan agar tetap terbaca.',
      },
      t('announcement', 'Pengumuman di bilah atas', {
        placeholder: 'mis. Gratis ongkir min. belanja Rp150.000 · Bisa COD',
        maxLength: 110,
        help: 'Bilah hitam tipis di atas menu. Kosongkan untuk menyembunyikan.',
      }),
    ],
  },
  {
    key: 'hero',
    label: 'Hero (kartu gelap)',
    description: 'Kartu gelap membulat berisi foto, judul dengan kata sorotan, dua tombol, kartu putih custom casing, kartu rating, dan daftar merek HP.',
    toggleable: true,
    fields: [
      t('eyebrow', 'Label kecil di atas judul', { placeholder: 'mis. Casing, tempered glass, charger & lainnya', maxLength: 60, help: 'Kosongkan untuk menyembunyikan.' }),
      t('title', 'Judul utama', {
        placeholder: 'mis. Aksesoris HP yang pas untuk tipe HP-mu',
        maxLength: 70,
        help: 'Judul utama (H1) halaman: sebutkan apa yang dijual. Paling bagus 2–3 baris (± 25–40 karakter).',
      }),
      t('highlight', 'Kata yang disorot', {
        placeholder: 'mis. pas untuk tipe HP-mu',
        maxLength: 40,
        help: 'Bagian judul yang diberi warna aksen. Tulis persis seperti di judul, atau kosongkan.',
      }),
      ta('subtitle', 'Deskripsi', {
        placeholder: 'Jelaskan singkat apa yang dijual dan kenapa beda.',
        maxLength: 240,
        help: 'Juga dipakai sebagai deskripsi situs di hasil Google: sebutkan jenis toko dan kotanya, ± 150 karakter.',
      }),
      t('primary_label', 'Teks tombol utama', { placeholder: 'mis. Cari Aksesoris HP-mu', maxLength: 30 }),
      url('primary_url', 'Tautan tombol utama', { help: 'Kosongkan untuk menuju pencarian per tipe HP.' }),
      t('secondary_label', 'Teks tombol kedua', { placeholder: 'mis. Lihat Produk Terbaru', maxLength: 30 }),
      url('secondary_url', 'Tautan tombol kedua', { help: 'Kosongkan untuk menuju produk terbaru.' }),
      t('header_label', 'Teks tombol di menu atas', { placeholder: 'mis. Chat Admin', maxLength: 22, help: 'Tombol hitam di kanan menu. Kosongkan untuk menyembunyikan.' }),
      url('header_url', 'Tautan tombol di menu atas', { help: WA_HELP }),
      img('image', 'Foto latar kartu', 'Foto mendatar berlatar gelap (produk di sisi kanan), disarankan 1920×1200 px. Lapisan gelap ditambahkan otomatis di sisi kiri.'),
      t('card_title', 'Kartu putih: judul', { placeholder: 'mis. Casing custom fotomu', maxLength: 32, help: 'Kartu kecil dengan contoh casing. Kosongkan judul & teks untuk menyembunyikan.' }),
      t('card_text', 'Kartu putih: teks', { placeholder: 'mis. Mulai Rp89.000, jadi dalam 2 hari kerja', maxLength: 60 }),
      url('card_url', 'Kartu putih: tautan', { help: 'Kosongkan untuk menuju bagian Custom Casing.' }),
      t('stat_value', 'Kartu rating: angka', { placeholder: 'mis. 4,9/5', maxLength: 12, help: 'Kosongkan angka & keterangan untuk menyembunyikan.' }),
      t('stat_label', 'Kartu rating: keterangan', { placeholder: 'mis. dari 12.400+ ulasan pembeli', maxLength: 40 }),
      t('brands_label', 'Label daftar merek', {
        placeholder: 'mis. Tersedia untuk',
        maxLength: 24,
        help: 'Merek diambil otomatis dari daftar tipe HP di bagian Cari per Tipe HP. Kosongkan untuk menyembunyikan baris merek.',
      }),
    ],
  },
  {
    key: 'finder',
    label: 'Cari per tipe HP',
    description:
      'Pengunjung memilih merek lalu tipe HP, dan produk yang cocok tampil langsung (dari kolom "Cocok untuk" tiap produk). Tanpa daftar tipe HP, bagian ini disembunyikan.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Cari per Tipe HP'),
      sectionTitle('mis. Cari aksesoris untuk HP-mu'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('empty_text', 'Teks bantuan di bawah hasil', { placeholder: 'mis. HP-mu belum ada di daftar? Tanya admin.', maxLength: 160 }),
      listField(
        'models',
        'Daftar tipe HP',
        'Tipe HP',
        [
          t('brand', 'Merek', { placeholder: 'mis. Samsung', maxLength: 24, help: 'Tulis merek yang sama persis untuk semua tipe dari merek itu.' }),
          t('model', 'Tipe', { placeholder: 'mis. Galaxy A55', maxLength: 40 }),
          t('port', 'Port pengisian', { placeholder: 'mis. USB-C', maxLength: 16, help: 'USB-C, Lightning, atau Micro USB. Dipakai untuk mencocokkan kabel.' }),
        ],
        40,
      ),
    ],
  },
  {
    key: 'categories',
    label: 'Kategori',
    description: 'Kartu foto besar berlabel. Klik kartu → daftar produk tersaring ke kategori itu (atau tautan sendiri).',
    toggleable: true,
    fields: [
      sectionLabel('mis. Kategori'),
      sectionTitle('mis. Semua yang HP-mu butuhkan, di satu toko'),
      listField(
        'items',
        'Daftar kategori',
        'Kategori',
        [
          t('title', 'Nama kategori', { placeholder: 'mis. Casing', maxLength: 30, help: 'Samakan dengan kolom Kategori di produk agar penyaring bekerja.' }),
          t('text', 'Keterangan', { placeholder: 'mis. Silikon, bening, magnetik', maxLength: 40 }),
          img('image', 'Foto', 'Foto mendatar 4:3, disarankan 1200×900 px.'),
          url('url', 'Tautan (opsional)', { help: 'Kosongkan untuk menampilkan produk kategori ini di bagian Produk.' }),
        ],
        6,
      ),
    ],
  },
  {
    key: 'products',
    label: 'Produk terbaru',
    description: 'Baris produk yang bisa digeser, dengan penyaring kategori, harga coret, label, rating, dan tombol pesan lewat WhatsApp.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Produk Terbaru'),
      sectionTitle('mis. Baru masuk minggu ini'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      listField(
        'items',
        'Daftar produk',
        'Produk',
        [
          t('name', 'Nama produk', { placeholder: 'mis. Casing Silikon Soft-Touch', maxLength: 60 }),
          t('category', 'Kategori', { placeholder: 'mis. Casing', maxLength: 30, help: 'Dipakai untuk penyaring kategori.' }),
          price('price', 'Harga'),
          price('old_price', 'Harga coret (opsional)', 'Harga sebelum diskon. Label persen diskon dibuat otomatis.'),
          t('badge', 'Label (opsional)', { placeholder: 'mis. Baru', maxLength: 16, help: 'Mengganti label persen diskon otomatis.' }),
          img('image', 'Foto produk', 'Foto persegi 1:1, disarankan 1200×1200 px. Kosongkan untuk memakai ilustrasi bawaan sesuai kategori.'),
          ta('compatible', 'Cocok untuk', {
            placeholder: 'mis. iPhone 15, Galaxy A55, USB-C, atau Semua HP',
            maxLength: 400,
            help: 'Pisahkan dengan koma. Isi tipe HP (sama seperti daftar tipe HP), merek (mis. Samsung), port (USB-C/Lightning), atau "Semua HP". Kosong = semua HP.',
          }),
          t('rating', 'Rating (opsional)', { placeholder: 'mis. 4,9', maxLength: 4 }),
          t('sold', 'Terjual (opsional)', { placeholder: 'mis. 2,1 rb terjual', maxLength: 24 }),
          url('url', 'Tautan pesan (opsional)', { help: 'Mis. halaman produk di marketplace. Kosongkan untuk membuka WhatsApp dengan nama produk.' }),
        ],
        16,
      ),
    ],
  },
  {
    key: 'bundles',
    label: 'Bundling hemat',
    description: 'Kartu paket berisi daftar barang, harga paket, harga normal, dan label "Hemat" yang dihitung otomatis. Paket berlabel pertama tampil gelap.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Bundling Hemat'),
      sectionTitle('mis. Beli sepaket, lebih hemat'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('note', 'Catatan kecil', { placeholder: 'mis. Admin mengonfirmasi stok sebelum pembayaran.', maxLength: 180 }),
      listField(
        'items',
        'Daftar paket',
        'Paket',
        [
          t('name', 'Nama paket', { placeholder: 'mis. Paket Ngecas Kilat', maxLength: 40 }),
          ta('items', 'Isi paket', {
            placeholder: 'Satu baris satu barang, mis.\nCharger 20W USB-C PD\nKabel USB-C 1 m',
            maxLength: 300,
            help: 'Ikon barang dipilih otomatis (casing, tempered glass, charger, kabel, earphone, power bank).',
          }),
          price('price', 'Harga paket', 'Mis. Rp149.000'),
          price('old_price', 'Harga normal (opsional)', 'Jumlah harga satuan. Label "Hemat Rp…" dihitung otomatis.'),
          t('badge', 'Label sorotan', { placeholder: 'mis. Paling laris', maxLength: 24, help: 'Paket pertama yang berlabel tampil gelap dan menonjol.' }),
          ta('description', 'Keterangan', { placeholder: 'Untuk siapa paket ini.', maxLength: 140 }),
          t('button_label', 'Teks tombol', { placeholder: 'mis. Ambil Paket Ngecas Kilat', maxLength: 32 }),
          url('button_url', 'Tautan tombol', { help: 'Kosongkan untuk membuka WhatsApp dengan nama dan harga paket.' }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'custom',
    label: 'Custom casing',
    description:
      'Coba casing dengan foto sendiri: pengunjung memilih foto dari perangkatnya, menggeser dan memperbesarnya di mockup casing, lalu memesan lewat WhatsApp. Foto pengunjung tidak diunggah ke mana pun.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Custom Casing'),
      sectionTitle('mis. Casing custom dari fotomu sendiri'),
      t('highlight', 'Kata yang disorot', { placeholder: 'mis. fotomu sendiri', maxLength: 40, help: 'Bagian judul yang diberi warna aksen. Tulis persis seperti di judul.' }),
      sectionSubtitle('Ceritakan layanan custom casing Anda.'),
      img('image', 'Foto contoh di casing', 'Foto tegak 3:4 yang tampil sebelum pengunjung memilih fotonya sendiri, disarankan 1200×1600 px.'),
      t('price_label', 'Harga', { placeholder: 'mis. Mulai Rp89.000', maxLength: 30 }),
      t('price_note', 'Keterangan harga', { placeholder: 'mis. Jadi dalam 2 hari kerja', maxLength: 60 }),
      t('case_colors', 'Pilihan warna casing', {
        placeholder: 'mis. Bening, Hitam, Putih',
        maxLength: 120,
        help: 'Pisahkan dengan koma, maks. 6 warna. Warna yang dikenali dari namanya (bening, hitam, putih, navy, merah, pink, hijau, mint, biru, ungu, abu, cokelat, krem, dll.) tampil sesuai warnanya. Warna terpilih ikut dikirim di pesan WhatsApp. Kosongkan untuk menyembunyikan pilihan warna.',
      }),
      t('button_label', 'Teks tombol pesan', { placeholder: 'mis. Pesan Casing Custom', maxLength: 30 }),
      url('button_url', 'Tautan tombol pesan', { help: 'Kosongkan untuk membuka WhatsApp dengan tipe HP dan warna casing yang dipilih.' }),
      listField(
        'steps',
        'Langkah',
        'Langkah',
        [
          t('title', 'Judul', { placeholder: 'mis. Pilih foto', maxLength: 30 }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam satu kalimat.', maxLength: 120 }),
        ],
        3,
      ),
    ],
  },
  {
    key: 'perks',
    label: 'Strip layanan',
    description: 'Panel hitam berisi hingga 4 keunggulan toko (garansi, kirim cepat, COD, tukar barang) dengan ikon otomatis.',
    toggleable: true,
    fields: [
      sectionTitle('mis. Belanja tenang di GadgetKu.id', 60),
      ta('subtitle', 'Deskripsi singkat', { placeholder: 'Kalimat pengantar singkat.', maxLength: 160 }),
      t('button_label', 'Teks tombol', { placeholder: 'mis. Chat Admin', maxLength: 24 }),
      url('button_url', 'Tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Keunggulan',
        'Keunggulan',
        [
          t('title', 'Judul', { placeholder: 'mis. Garansi 1 tahun', maxLength: 30, help: 'Ikon dipilih otomatis dari judul (garansi, kirim, COD, tukar, original, admin, dll.).' }),
          ta('text', 'Keterangan', { placeholder: 'Jelaskan dalam satu kalimat.', maxLength: 100 }),
        ],
        4,
      ),
    ],
  },
  {
    key: 'testimonials',
    label: 'Ulasan pembeli',
    description: 'Ringkasan rating toko dan kartu ulasan dengan bintang, produk yang dibeli, nama, dan foto (atau inisial).',
    toggleable: true,
    fields: [
      sectionLabel('mis. Ulasan Pembeli'),
      sectionTitle('mis. Kata mereka yang sudah belanja'),
      t('rating_value', 'Rating toko', { placeholder: 'mis. 4,9', maxLength: 6, help: 'Kosongkan rating & keterangan untuk menyembunyikan ringkasan.' }),
      t('rating_label', 'Keterangan rating', { placeholder: 'mis. Rata-rata dari 12.400+ ulasan', maxLength: 80 }),
      listField(
        'items',
        'Ulasan',
        'Ulasan',
        [
          t('name', 'Nama', { placeholder: 'mis. Dimas Pratama', maxLength: 50 }),
          t('role', 'Keterangan', { placeholder: 'mis. Mahasiswa, Depok', maxLength: 60 }),
          t('product', 'Produk yang dibeli', { placeholder: 'mis. Paket Ngecas Kilat', maxLength: 50 }),
          t('rating', 'Bintang (1–5)', { placeholder: '5', maxLength: 1 }),
          ta('quote', 'Ulasan', { placeholder: 'Tulis ulasan pembeli...', maxLength: 300 }),
          img('photo', 'Foto (opsional)', 'Foto persegi wajah, disarankan 480×480 px. Kosongkan untuk memakai inisial.'),
        ],
        6,
      ),
    ],
  },
  {
    key: 'faq',
    label: 'Tanya jawab (FAQ)',
    description: 'Pertanyaan yang bisa dibuka-tutup, dengan kartu bantuan WhatsApp di sampingnya.',
    toggleable: true,
    fields: [
      sectionLabel('mis. FAQ'),
      sectionTitle('mis. Pertanyaan yang sering ditanyakan'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      t('help_title', 'Kartu bantuan: judul', { placeholder: 'mis. Masih bingung pilih yang cocok?', maxLength: 60 }),
      ta('help_text', 'Kartu bantuan: teks', { placeholder: 'mis. Kirim tipe HP-mu ke admin.', maxLength: 160 }),
      t('button_label', 'Kartu bantuan: teks tombol', { placeholder: 'mis. Tanya Admin', maxLength: 30 }),
      url('button_url', 'Kartu bantuan: tautan tombol', { help: WA_HELP }),
      listField(
        'items',
        'Pertanyaan',
        'Pertanyaan',
        [
          t('question', 'Pertanyaan', { placeholder: 'mis. Bisa bayar di tempat (COD)?', maxLength: 120 }),
          ta('answer', 'Jawaban', { placeholder: 'Jawab singkat dan jelas.', maxLength: 500 }),
        ],
        8,
      ),
    ],
  },
  {
    key: 'contact',
    label: 'Kontak & toko',
    description: 'Alamat toko, jam buka, tombol WhatsApp, telepon, email, dan tautan toko di marketplace.',
    toggleable: true,
    fields: [
      sectionLabel('mis. Toko Kami'),
      sectionTitle('mis. Mampir ke toko atau chat admin'),
      sectionSubtitle('Kalimat pengantar singkat.'),
      ta('address', 'Alamat toko', { placeholder: 'Jl. Contoh No. 1, Kota, Provinsi', maxLength: 250 }),
      t('hours', 'Jam buka', { placeholder: 'mis. Setiap hari, 10.00–21.00 WIB', maxLength: 80 }),
      { type: 'phone', key: 'phone', label: 'Telepon', placeholder: 'mis. (021) 555-0123', maxLength: 30 },
      { type: 'email', key: 'email', label: 'Email', placeholder: 'halo@toko.id', maxLength: 120 },
      { type: 'phone', key: 'whatsapp', label: 'WhatsApp', placeholder: 'mis. 081234567890', maxLength: 20, help: 'Dipakai untuk semua tombol pesan dan chat di halaman.' },
      t('whatsapp_message', 'Pesan awal WhatsApp', { placeholder: 'mis. Halo, saya mau tanya aksesoris untuk HP saya.', maxLength: 160 }),
      url('maps_url', 'Link Google Maps', { placeholder: 'https://maps.app.goo.gl/...', help: 'Tombol "Buka peta". Kosongkan untuk membuat tautan dari alamat.' }),
      url('shopee_url', 'Toko di Shopee', { placeholder: 'https://shopee.co.id/...' }),
      url('tokopedia_url', 'Toko di Tokopedia', { placeholder: 'https://www.tokopedia.com/...' }),
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Panel hitam: logo, deskripsi, menu belanja & bantuan, kontak singkat, metode bayar, dan media sosial.',
    toggleable: true,
    fields: [
      ta('description', 'Deskripsi singkat', { placeholder: 'Satu-dua kalimat tentang toko Anda.', maxLength: 200 }),
      t('payments', 'Metode pembayaran', { placeholder: 'mis. COD · Transfer bank · QRIS · E-wallet', maxLength: 90, help: 'Pisahkan dengan titik tengah (·) atau koma.' }),
      t('copyright', 'Teks hak cipta', { placeholder: '© 2026 Nama Toko. Semua hak dilindungi.', maxLength: 120, help: 'Kosongkan untuk membuat otomatis dari nama toko.' }),
      url('instagram', 'Instagram', { placeholder: 'https://instagram.com/...' }),
      url('facebook', 'Facebook', { placeholder: 'https://facebook.com/...' }),
      url('linkedin', 'LinkedIn', { placeholder: 'https://linkedin.com/company/...' }),
      url('youtube', 'YouTube', { placeholder: 'https://youtube.com/@...' }),
      url('tiktok', 'TikTok', { placeholder: 'https://tiktok.com/@...' }),
    ],
  },
];
