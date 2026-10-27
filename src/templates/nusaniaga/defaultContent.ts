// Isi demo NusaNiaga: PT Arunika Niaga Internasional, importir & distributor bahan baku industri, mesin, dan suku cadang
// di Cikarang (FIKTIF). Klien, angka, negara asal, dan testimoni adalah contoh; nama orang di testimoni tidak berhubungan
// dengan orang di foto. Tidak ada klaim izin, sertifikat, atau legalitas: proses diceritakan apa adanya. Angka yang
// muncul di beberapa tempat dijaga sama: 18 negara (judul Jangkauan & angka), 140+ pabrik (judul Klien & angka),
// gudang 6.500 m² (poin Layanan & angka).
import type { SiteContent } from '../types';
import { nusaniagaPhoto } from './photos';

export const NUSANIAGA_ACCENT = '#A61E3A';

export const nusaniagaContent: SiteContent = {
  brand: {
    enabled: true,
    company_name: 'PT Arunika Niaga Internasional',
    tagline: 'Importir Bahan Baku & Mesin',
    logo: '',
    accent_color: NUSANIAGA_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Importir & distributor · Cikarang',
    title: 'Bahan baku dan mesin impor, sampai di lini produksi Anda',
    highlight: 'lini produksi',
    subtitle:
      'Kami mencari pemasok di luar negeri, mengurus impor, menyimpan stok di gudang Cikarang, lalu mengantar bahan baku dan mesin ke pabrik Anda.',
    origin_label: 'Negara asal',
    primary_label: 'Minta Penawaran',
    primary_url: '',
    secondary_label: 'Lihat produk',
    secondary_url: '',
    header_label: 'Minta Penawaran',
    header_url: '',
    image: nusaniagaPhoto('hero'),
  },
  clients: {
    enabled: true,
    title: 'Memasok bahan baku dan mesin untuk 140+ pabrik di Jawa dan Sumatra',
    industries_label: 'Industri yang kami layani',
    industries: [
      { name: 'Kemasan plastik' },
      { name: 'Otomotif & komponen' },
      { name: 'Tekstil & garmen' },
      { name: 'Makanan & minuman' },
      { name: 'Elektronik' },
      { name: 'Logam & fabrikasi' },
      { name: 'Furnitur' },
      { name: 'Percetakan' },
    ],
    items: [
      { name: 'Kertapura Kemasan', logo: '' },
      { name: 'Wastranadi Tekstil', logo: '' },
      { name: 'Ranumi Pangan', logo: '' },
      { name: 'Lumenta Elektronik', logo: '' },
      { name: 'Sentaka Komponen', logo: '' },
      { name: 'Plastinara', logo: '' },
    ],
  },
  services: {
    enabled: true,
    eyebrow: 'Layanan',
    title: 'Dari mencari pemasok sampai barang masuk gudang pabrik Anda',
    subtitle:
      'Pilih satu layanan atau serahkan seluruh rantai impornya. Satu tim memegang pesanan Anda dari permintaan pertama sampai serah terima.',
    items: [
      {
        title: 'Sourcing pemasok luar negeri',
        description: 'Kami membandingkan beberapa pemasok, meminta sampel dan data teknis, lalu memeriksa pabriknya bila perlu sebelum Anda memesan.',
        points: 'Perbandingan 2–3 pemasok\nSampel dan data teknis\nKunjungan pabrik bila perlu',
        image: '',
      },
      {
        title: 'Impor & dokumen',
        description: 'Pemesanan, pengapalan, asuransi, dan dokumen impor disiapkan bersama tim Anda dan mitra kepabeanan kami.',
        points: 'Pemesanan & pengapalan\nDokumen disiapkan bersama\nKabar status setiap tahap',
        image: '',
      },
      {
        title: 'Gudang & stok penyangga',
        description: 'Bahan baku rutin disimpan di gudang kami di Cikarang dan dikirim bertahap mengikuti jadwal produksi Anda.',
        points: 'Gudang 6.500 m²\nPengiriman bertahap\nLaporan stok mingguan',
        image: '',
      },
      {
        title: 'Distribusi ke pabrik',
        description: 'Truk mitra mengantar ke kawasan industri Jabodetabek, Karawang, dan Purwakarta; kota lain lewat ekspedisi yang kami atur.',
        points: 'Truk bak dan wingbox\nJadwal antar dikonfirmasi\nSurat jalan & foto serah terima',
        image: '',
      },
      {
        title: 'Instalasi & commissioning mesin',
        description: 'Teknisi kami mendampingi pemasangan, uji jalan, dan pelatihan operator bersama teknisi pabrikan.',
        points: 'Pemasangan & uji jalan\nPelatihan operator\nBerita acara serah terima',
        image: '',
      },
      {
        title: 'Suku cadang & perawatan',
        description: 'Suku cadang cepat pakai untuk mesin yang kami pasok disimpan di Cikarang, lengkap dengan jadwal perawatan berkala.',
        points: 'Stok suku cadang\nKunjungan perawatan\nKonsultasi teknis lewat WhatsApp',
        image: '',
      },
    ],
  },
  products: {
    enabled: true,
    eyebrow: 'Produk',
    title: 'Bahan baku, mesin, dan suku cadang yang kami pasok',
    subtitle:
      'Contoh produk yang rutin kami datangkan. Spesifikasi, grade, dan jumlahnya disesuaikan dengan kebutuhan pabrik Anda.',
    note: 'Data teknis dan harga terbaru kami kirim lewat WhatsApp atau email setelah Anda mengisi formulir penawaran.',
    button_label: 'Minta data teknis',
    items: [
      {
        name: 'Resin plastik PP & HDPE',
        kind: 'Bahan baku',
        origin: 'Korea Selatan · Thailand',
        spec: 'Sak 25 kg · mulai 1 palet',
        description: 'Untuk pabrik kemasan, injeksi, dan blow molding. Grade dipilih sesuai data teknis mesin dan produk Anda.',
        image: nusaniagaPhoto('resin'),
      },
      {
        name: 'Baja lembaran & coil',
        kind: 'Bahan baku',
        origin: 'Jepang · Korea Selatan',
        spec: 'Coil 3–10 ton · bisa dipotong',
        description: 'Cold rolled dan galvanis untuk fabrikasi, panel, dan komponen otomotif; bisa dipotong sesuai ukuran sebelum dikirim.',
        image: nusaniagaPhoto('baja'),
      },
      {
        name: 'Benang & kain teknis',
        kind: 'Bahan baku',
        origin: 'Tiongkok · Turki',
        spec: 'Rol dan cone · mulai 500 kg',
        description: 'Benang poliester dan nilon serta kain teknis untuk seragam kerja, jok, dan filter industri.',
        image: nusaniagaPhoto('benang'),
      },
      {
        name: 'Mesin injeksi plastik',
        kind: 'Mesin',
        origin: 'Taiwan · Tiongkok',
        spec: '90–450 ton · dengan instalasi',
        description: 'Mesin baru dengan pendampingan pemasangan, uji jalan, dan pelatihan operator di pabrik Anda.',
        image: nusaniagaPhoto('mesin-injeksi'),
      },
      {
        name: 'Mesin CNC & perkakas',
        kind: 'Mesin',
        origin: 'Jerman · Taiwan',
        spec: 'Bubut, frais, machining center',
        description: 'Untuk bengkel presisi dan pabrik komponen. Kami bantu memilih spesifikasi sesuai benda kerja Anda.',
        image: nusaniagaPhoto('cnc'),
      },
      {
        name: 'Bearing & komponen transmisi',
        kind: 'Suku cadang',
        origin: 'Jepang · Jerman · Italia',
        spec: 'Satuan dan set · stok Cikarang',
        description: 'Bearing, rantai, dan gearbox untuk perawatan rutin lini produksi, dikirim dari stok gudang kami.',
        image: nusaniagaPhoto('bearing'),
      },
    ],
  },
  process: {
    enabled: true,
    eyebrow: 'Proses impor',
    title: 'Lima langkah dari permintaan sampai barang tiba di pabrik',
    subtitle:
      'Setiap langkah punya penanggung jawab dan dokumen yang jelas. Buka langkahnya untuk melihat apa yang Anda terima.',
    image: nusaniagaPhoto('gudang'),
    note: 'Barang dari stok gudang Cikarang tidak melewati langkah 3 dan 4, jadi bisa diantar lebih cepat.',
    steps: [
      {
        title: 'Permintaan & spesifikasi',
        duration: 'Minggu 1',
        text: 'Ceritakan produk, spesifikasi, volume, dan jadwal yang Anda butuhkan. Kami cocokkan dengan pemasok yang sesuai dan meminta sampel atau data teknis bila perlu.',
        output: 'Daftar pemasok & sampel',
      },
      {
        title: 'Penawaran landed cost',
        duration: 'Minggu 1–2',
        text: 'Penawaran tertulis merinci harga barang, ongkos kirim, perkiraan bea masuk dan pajak impor, biaya gudang, serta pengantaran ke pabrik Anda.',
        output: 'Penawaran tertulis',
      },
      {
        title: 'PO & produksi pemasok',
        duration: 'Minggu 2–6',
        text: 'Setelah menerima PO Anda, kami memesan ke pemasok, memantau jadwal produksinya, dan memeriksa barang atau foto muat sebelum dikapalkan.',
        output: 'Konfirmasi pesanan & foto muat',
      },
      {
        title: 'Pengapalan & kepabeanan',
        duration: 'Minggu 4–14',
        text: 'Barang dikapalkan dan dokumen impornya disiapkan bersama mitra kepabeanan. Anda menerima kabar setiap kali tahapnya berganti.',
        output: 'Salinan dokumen pengapalan',
      },
      {
        title: 'Gudang & pengantaran',
        duration: 'Sesuai jadwal Anda',
        text: 'Barang diperiksa di gudang Cikarang, lalu diantar sekaligus atau bertahap ke pabrik Anda lengkap dengan surat jalan.',
        output: 'Surat jalan & foto serah terima',
      },
    ],
  },
  coverage: {
    enabled: true,
    eyebrow: 'Jangkauan',
    title: 'Dari 18 negara asal ke kawasan industri di Jawa dan Sumatra',
    subtitle:
      'Kami bekerja dengan pemasok tetap di Asia dan Eropa, lalu mengantar dari gudang Cikarang ke pabrik pelanggan di berbagai kota.',
    image: nusaniagaPhoto('pelabuhan'),
    origins_label: 'Negara asal utama',
    origins: [
      { code: 'DE', country: 'Jerman', products: 'Mesin CNC, bearing, komponen hidrolik' },
      { code: 'JP', country: 'Jepang', products: 'Baja lembaran, bearing, komponen presisi' },
      { code: 'KR', country: 'Korea Selatan', products: 'Resin PP & HDPE, baja coil' },
      { code: 'CN', country: 'Tiongkok', products: 'Mesin injeksi, benang, perkakas' },
      { code: 'TW', country: 'Taiwan', products: 'Mesin injeksi, mesin CNC' },
      { code: 'TH', country: 'Thailand', products: 'Resin plastik, bahan kemasan' },
      { code: 'TR', country: 'Turki', products: 'Benang & kain teknis' },
      { code: 'IT', country: 'Italia', products: 'Mesin pengemas, gearbox' },
    ],
    areas_label: 'Area pengantaran',
    areas: 'Jabodetabek · Karawang · Purwakarta · Bandung · Serang & Cilegon · Semarang · Surabaya · Medan',
  },
  advantages: {
    enabled: true,
    eyebrow: 'Keunggulan',
    title: 'Satu mitra impor, satu jadwal, satu rincian biaya',
    subtitle: 'Pabrik pelanggan kami tidak perlu lagi mengurus pemasok, pelayaran, dan gudang secara terpisah.',
    image: nusaniagaPhoto('teknisi'),
    items: [
      {
        title: 'Satu penanggung jawab per pesanan',
        description:
          'Satu account manager memegang pesanan Anda dari permintaan pertama sampai barang diterima, jadi Anda tidak perlu menghubungi banyak pihak.',
      },
      {
        title: 'Rincian landed cost di depan',
        description:
          'Harga barang, ongkos kirim, perkiraan bea masuk, dan biaya gudang tertulis di penawaran, sehingga mudah dibandingkan dengan impor sendiri.',
      },
      {
        title: 'Stok penyangga di Cikarang',
        description: 'Untuk bahan baku rutin kami menyimpan stok penyangga, sehingga produksi Anda tidak bergantung pada satu jadwal kapal.',
      },
      {
        title: 'Teknisi untuk setiap mesin',
        description:
          'Mesin yang kami pasok didampingi pemasangan, uji jalan, dan pelatihan operator, dengan suku cadang cepat pakai di gudang kami.',
      },
    ],
    stats: [
      { value: '18', unit: 'negara', label: 'Negara asal pemasok' },
      { value: '2.400+', unit: 'SKU', label: 'Bahan baku, mesin, dan suku cadang' },
      { value: '140+', unit: 'pabrik', label: 'Pelanggan aktif di Jawa dan Sumatra' },
      { value: '6.500', unit: 'm²', label: 'Luas gudang di Cikarang' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Kata bagian pengadaan yang sudah bekerja sama dengan kami',
    subtitle:
      'Pabrik kemasan plastik, komponen logam, dan kemasan makanan di Karawang, Bekasi, dan Tangerang yang rutin memesan bahan baku dan mesin lewat kami.',
    items: [
      {
        name: 'Andreas Wijaya',
        role: 'Manajer pengadaan, pabrik kemasan plastik, Karawang',
        purchase: 'Resin PP · asal Korea Selatan',
        quote:
          'Dulu kami mengimpor resin sendiri dan beberapa kali kehabisan stok saat kapal terlambat. Sekarang ada stok penyangga di Cikarang, jadi jadwal produksi kami jauh lebih tenang.',
        photo: nusaniagaPhoto('portrait-1'),
      },
      {
        name: 'Nur Aini Rahmawati',
        role: 'Kepala produksi, pabrik komponen logam, Bekasi',
        purchase: 'Baja lembaran · asal Jepang',
        quote:
          'Penawarannya rinci sampai biaya gudang, jadi mudah kami bandingkan dengan impor sendiri. Coil juga dipotong sesuai ukuran sebelum dikirim ke pabrik.',
        photo: nusaniagaPhoto('portrait-2'),
      },
      {
        name: 'Yudha Pratama',
        role: 'Direktur, usaha kemasan makanan, Tangerang',
        purchase: 'Mesin injeksi 180 ton · asal Taiwan',
        quote:
          'Mesin datang bersama teknisi untuk pemasangan dan pelatihan operator. Saat butuh suku cadang, barangnya ada di gudang Cikarang, tidak perlu menunggu kapal berikutnya.',
        photo: nusaniagaPhoto('portrait-3'),
      },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: 'FAQ',
    title: 'Pertanyaan yang sering diajukan bagian pengadaan',
    subtitle: 'Belum terjawab? Tanyakan langsung ke tim penjualan kami.',
    link_label: 'Tanya lewat WhatsApp',
    link_url: '',
    items: [
      {
        question: 'Berapa minimum pemesanan?',
        answer:
          'Untuk bahan baku dari stok gudang, mulai satu palet atau satu coil. Untuk impor langsung, minimumnya mengikuti pabrik asal, biasanya satu kontainer 20 kaki, tetapi pesanan Anda bisa digabung dengan pesanan pelanggan lain.',
      },
      {
        question: 'Apakah harga sudah termasuk bea masuk dan pajak impor?',
        answer:
          'Penawaran kami merinci harga barang, ongkos kirim, perkiraan bea masuk dan pajak impor, serta biaya gudang dan pengantaran. Nilai akhir bea dan pajak mengikuti penetapan saat barang masuk.',
      },
      {
        question: 'Berapa lama barang impor sampai di pabrik?',
        answer:
          'Tergantung negara asal dan jadwal produksi pemasok. Dari Asia umumnya 4–8 minggu sejak PO, dari Eropa 8–12 minggu. Barang yang tersedia di gudang Cikarang bisa diantar lebih cepat.',
      },
      {
        question: 'Bisakah saya meminta sampel atau melihat mesinnya lebih dulu?',
        answer:
          'Bisa. Kami mengirimkan sampel atau data teknis lebih dulu. Untuk mesin, kami bisa mengatur kunjungan ke pabrik pemasok atau ke pelanggan yang sudah memakainya.',
      },
      {
        question: 'Bagaimana dengan instalasi dan suku cadang mesin?',
        answer:
          'Teknisi kami mendampingi pemasangan, uji jalan, dan pelatihan operator bersama teknisi pabrikan. Suku cadang cepat pakai untuk mesin yang kami pasok disimpan di gudang Cikarang.',
      },
      {
        question: 'Apakah barang bisa dikirim ke luar Jawa?',
        answer:
          'Bisa. Kawasan industri di Jabodetabek, Karawang, dan Purwakarta kami antar dengan truk mitra; kota lain di Sumatra dan Kalimantan lewat ekspedisi laut atau darat yang kami atur.',
      },
    ],
  },
  cta: {
    enabled: true,
    eyebrow: 'Mulai impor',
    title: 'Kirim spesifikasi Anda, kami susun penawaran landed cost-nya',
    subtitle:
      'Isi formulir singkat atau chat tim kami. Penawaran tertulis memuat pilihan pemasok, perkiraan jadwal, dan rincian biaya sampai pabrik Anda.',
    button_label: 'Isi Formulir Penawaran',
    button_url: '',
    secondary_label: 'Chat lewat WhatsApp',
    secondary_url: '',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Ceritakan kebutuhan pabrik Anda',
    subtitle:
      'Kantor dan gudang kami ada di kawasan industri Cikarang. Kunjungi kami pada jam kerja, atau kirim permintaan penawaran lewat formulir.',
    address: 'Jl. Niaga Contoh Blok C-12, Kawasan Industri Cikarang, Kabupaten Bekasi, Jawa Barat',
    maps_query: 'Cikarang, Kabupaten Bekasi, Jawa Barat',
    maps_url: '',
    phone: '081234567890',
    email: 'penawaran@arunikaniaga.test',
    whatsapp: '081234567890',
    whatsapp_message: 'Halo PT Arunika Niaga Internasional, saya ingin bertanya tentang bahan baku dan mesin impor.',
    hours: 'Senin–Jumat 08.00–17.00, Sabtu 08.00–12.00 WIB',
    form_title: 'Formulir permintaan penawaran',
    form_text: 'Isi kebutuhan Anda. Formulir ini menyusun pesan WhatsApp untuk tim kami; data tidak disimpan di website.',
    form_button: 'Susun pesan WhatsApp',
    form_needs: [{ label: 'Bahan baku' }, { label: 'Mesin' }, { label: 'Suku cadang' }, { label: 'Sourcing pemasok' }],
  },
  footer: {
    enabled: true,
    description:
      'Importir dan distributor bahan baku industri, mesin, dan suku cadang di Cikarang. Kami mengurus sourcing, impor, gudang, dan pengantaran ke pabrik.',
    copyright: '',
    instagram: 'https://instagram.com/arunikaniaga.contoh',
    facebook: '',
    linkedin: 'https://linkedin.com/company/arunika-niaga-contoh',
    youtube: 'https://youtube.com/@arunikaniaga.contoh',
    tiktok: '',
  },
};
