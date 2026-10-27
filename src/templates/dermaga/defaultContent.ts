// Konten demo Dermaga: PT Lintas Dermaga Nusantara, perusahaan general trading & freight forwarding FIKTIF di kawasan
// Tanjung Perak, Surabaya (nama perusahaan, klien, orang di testimoni, angka, alamat jalan, dan email adalah contoh).
// Semua salinan berbahasa Indonesia, tanpa klaim izin, legalitas, atau sertifikat: proses kerja yang diceritakan, bukan
// kredensial. Formulir permintaan penawaran hanya menyusun pesan WhatsApp; data tidak disimpan di website. Tidak ada
// pelacakan kiriman real-time; tarif & jadwal kapal adalah teks biasa. Angka 38 negara di hero = jumlah negara di pasar
// (9 + 6 + 7 + 11 + 5); ubah keduanya bersamaan.
import type { SiteContent } from '../types';
import { dermagaPhoto } from './photos';

/** Warna tema bawaan: teal dalam (putih di atasnya 7,7:1). */
export const DERMAGA_ACCENT = '#0F5C63';

const COMPANY = 'PT Lintas Dermaga Nusantara';

export const dermagaContent: SiteContent = {
  brand: {
    company_name: COMPANY,
    tagline: 'Jasa Ekspor Impor Surabaya',
    logo: '',
    accent_color: DERMAGA_ACCENT,
  },
  hero: {
    enabled: true,
    eyebrow: 'Ekspor · impor · freight forwarding — Surabaya',
    title: 'Ekspor dan impor yang tertata, dari gudang sampai pelabuhan tujuan',
    highlight: 'tertata',
    subtitle:
      'Kami mengurus ekspor dan impor barang umum dari Surabaya: konsolidasi LCL, kontainer FCL, dokumen pengapalan, hingga serah terima di negara tujuan.',
    primary_label: 'Minta Penawaran',
    primary_url: '',
    secondary_label: 'Lihat layanan',
    secondary_url: '',
    header_label: 'Minta Penawaran',
    header_url: '',
    image: dermagaPhoto('hero'),
    ports: [
      { code: 'SUB', name: 'Tanjung Perak, Surabaya' },
      { code: 'SIN', name: 'Transit Singapura' },
      { code: 'RTM', name: 'Rotterdam, Belanda' },
    ],
    stats: [
      { value: '1.200+', label: 'Pengiriman per tahun' },
      { value: '38', label: 'Negara tujuan' },
      { value: '6', label: 'Pelabuhan muat' },
      { value: '16 thn', label: 'Pengalaman tim' },
    ],
  },
  clients: {
    enabled: true,
    title: 'Dipercaya eksportir dan importir dari berbagai sektor',
    items: [
      { name: 'Rimbajati Furnitur', sector: 'Furnitur · Jepara', logo: '' },
      { name: 'Arsakopi', sector: 'Kopi sangrai · Malang', logo: '' },
      { name: 'Tenunara Tekstil', sector: 'Tekstil · Pekalongan', logo: '' },
      { name: 'Selasar Keramik', sector: 'Keramik · Purwakarta', logo: '' },
      { name: 'Kalaut Seafood', sector: 'Hasil laut · Sidoarjo', logo: '' },
      { name: 'Ruji Komponen', sector: 'Suku cadang · Pasuruan', logo: '' },
    ],
  },
  about: {
    enabled: true,
    eyebrow: 'Tentang kami',
    title: 'Satu tim untuk dokumen, gudang, dan kapal',
    body:
      `${COMPANY} berdiri di Surabaya pada 2010 sebagai perusahaan general trading dan freight forwarding. Kami membantu produsen, eksportir, dan importir memindahkan barang antarnegara tanpa harus mengurus setiap pihak sendiri.\n\n` +
      'Tim kami menyiapkan penawaran, memesan ruang kapal, menyusun dokumen bersama tim Anda, lalu mengabarkan setiap tahap sampai barang diterima. Satu kontak, satu jadwal, dan rincian biaya yang jelas sejak awal.',
    image: dermagaPhoto('tentang'),
    facts: [
      { label: 'Berdiri', value: '2010, Surabaya' },
      { label: 'Kantor', value: 'Surabaya · Jakarta' },
      { label: 'Gudang konsolidasi', value: '2.400 m²' },
      { label: 'Tim operasional', value: '46 orang' },
      { label: 'Jenis muatan', value: 'FCL · LCL' },
      { label: 'Bahasa layanan', value: 'Indonesia · Inggris · Mandarin' },
    ],
    link_label: 'Lihat cara kerja kami',
    link_url: '',
  },
  services: {
    enabled: true,
    eyebrow: 'Layanan',
    title: 'Pakai satu layanan, atau serahkan seluruh perjalanannya',
    subtitle: 'Dari mencari pemasok sampai barang tiba di gudang pembeli. Pilih yang Anda butuhkan, kami atur sisanya.',
    items: [
      {
        title: 'Freight forwarding laut',
        description:
          'Pengiriman FCL 20 dan 40 kaki maupun LCL ke pelabuhan utama Asia, Timur Tengah, Eropa, dan Amerika. Kami bandingkan jadwal dan tarif beberapa pelayaran untuk Anda.',
        tags: 'FCL · LCL · Port to port',
        image: dermagaPhoto('fcl'),
      },
      {
        title: 'Konsolidasi LCL',
        description:
          'Barang beberapa pengirim digabung dalam satu kontainer di gudang kami di Surabaya, jadi Anda cukup membayar ruang yang benar-benar dipakai.',
        tags: 'Gudang 2.400 m² · Stuffing',
        image: dermagaPhoto('konsolidasi'),
      },
      {
        title: 'Dokumen ekspor & impor',
        description:
          'Invoice, packing list, PEB atau PIB, surat keterangan asal, dan bill of lading disusun bersama tim Anda dan diperiksa ulang sebelum kapal berangkat.',
        tags: 'PEB · PIB · COO · B/L',
        image: dermagaPhoto('dokumen'),
      },
      {
        title: 'General trading & sourcing',
        description:
          'Mencari pemasok, mengambil sampel, dan membeli barang atas nama Anda, baik untuk dijual ke luar negeri maupun didatangkan ke Indonesia.',
        tags: 'Sampel · Negosiasi · Pembelian',
        image: dermagaPhoto('sourcing'),
      },
      {
        title: 'Pemeriksaan & pengemasan',
        description:
          'Barang dihitung, difoto, dan dikemas ulang bila perlu sebelum dimuat. Foto muat dan catatan jumlah dikirim lewat WhatsApp atau email.',
        tags: 'Foto muat · Label · Palet',
        image: dermagaPhoto('inspeksi'),
      },
      {
        title: 'Trucking & door to door',
        description:
          'Penjemputan dari pabrik atau gudang Anda di Jawa Timur dan pengantaran sampai alamat pembeli bila Incoterm yang dipilih DAP atau DDP.',
        tags: 'Jawa Timur · DAP · DDP',
        image: dermagaPhoto('trucking'),
      },
    ],
  },
  markets: {
    enabled: true,
    eyebrow: 'Pasar',
    title: 'Rute rutin ke 38 negara di lima kawasan',
    subtitle:
      'Muat dari Tanjung Perak, Tanjung Emas, atau Tanjung Priok, dengan transit di Singapura atau Port Klang untuk tujuan jauh.',
    image: dermagaPhoto('kapal'),
    terms_label: 'Incoterm yang kami tangani',
    terms: 'EXW · FOB · CFR · CIF · DAP · DDP',
    regions: [
      { name: 'Asia Tenggara', ports: 'Singapura · Port Klang · Bangkok · Ho Chi Minh', count: '9 negara' },
      { name: 'Asia Timur', ports: 'Shanghai · Ningbo · Busan · Yokohama', count: '6 negara' },
      { name: 'Timur Tengah', ports: 'Jebel Ali · Dammam · Jeddah', count: '7 negara' },
      { name: 'Eropa', ports: 'Rotterdam · Hamburg · Antwerpen · Felixstowe', count: '11 negara' },
      { name: 'Amerika & Oseania', ports: 'Los Angeles · New York · Sydney · Melbourne', count: '5 negara' },
    ],
  },
  process: {
    enabled: true,
    eyebrow: 'Proses',
    title: 'Lima langkah dari pertanyaan pertama sampai barang diterima',
    subtitle:
      'Setiap langkah punya penanggung jawab dan dokumen yang jelas, jadi Anda tahu apa yang sedang dikerjakan dan apa berikutnya.',
    steps: [
      {
        title: 'Konsultasi & penawaran',
        text: 'Ceritakan barang, volume, dan negara tujuan. Kami hitung opsi FCL atau LCL beserta Incoterm yang paling masuk akal untuk Anda.',
        output: 'Penawaran tertulis',
      },
      {
        title: 'Booking & jadwal muat',
        text: 'Setelah penawaran disetujui, kami pesan ruang kapal dan menyepakati tanggal muat dengan pabrik atau gudang Anda.',
        output: 'Konfirmasi booking',
      },
      {
        title: 'Dokumen & pemeriksaan',
        text: 'Invoice, packing list, dan dokumen ekspor disiapkan bersama tim Anda. Barang dihitung dan difoto sebelum masuk kontainer.',
        output: 'Invoice · Packing list',
      },
      {
        title: 'Stuffing & pengapalan',
        text: 'Kontainer dimuat, disegel, lalu diantar ke terminal. Setelah kapal berangkat, salinan bill of lading kami kirimkan.',
        output: 'Bill of lading',
      },
      {
        title: 'Kabar status & serah terima',
        text: 'Kami kabari setiap pergantian tahap lewat WhatsApp dan email sampai barang diterima pembeli atau masuk gudang Anda.',
        output: 'Laporan serah terima',
      },
    ],
  },
  gallery: {
    enabled: true,
    eyebrow: 'Galeri',
    title: 'Di gudang, di terminal, dan di tepi dermaga',
    subtitle: 'Sebagian pekerjaan harian tim kami, dari menata palet sampai melepas kapal.',
    items: [
      { image: dermagaPhoto('galeri-terminal'), caption: 'Lapangan penumpukan peti kemas di terminal tepi laut' },
      { image: dermagaPhoto('galeri-forklift'), caption: 'Forklift memindahkan palet di gudang konsolidasi' },
      { image: dermagaPhoto('galeri-bolder'), caption: 'Tali tambat kapal terikat di bolder dermaga' },
      { image: dermagaPhoto('galeri-kontainer'), caption: 'Kontainer kosong menunggu giliran dimuat' },
      { image: dermagaPhoto('galeri-tim'), caption: 'Tim operasional menyusun jadwal muat pekan ini' },
    ],
  },
  testimonials: {
    enabled: true,
    eyebrow: 'Testimoni',
    title: 'Kata pengirim yang barangnya sudah kami berangkatkan',
    items: [
      {
        name: 'Hendra Wiratama',
        role: 'Manajer ekspor, produsen furnitur, Jepara',
        route: 'Semarang → Rotterdam · FCL 40 kaki',
        quote:
          'Dulu kami mengurus pelayaran, dokumen, dan truk dengan tiga pihak berbeda. Sekarang cukup satu grup WhatsApp, dan foto muat selalu kami terima sebelum kontainer disegel.',
        photo: dermagaPhoto('portrait-1'),
      },
      {
        name: 'Sari Puspitasari',
        role: 'Pemilik usaha kopi sangrai, Malang',
        route: 'Surabaya → Busan · LCL 6 CBM',
        quote:
          'Volume kami belum cukup untuk satu kontainer. Lewat konsolidasi LCL, kopi kami tetap bisa berangkat rutin dengan biaya yang masuk akal untuk usaha kecil.',
        photo: dermagaPhoto('portrait-2'),
      },
      {
        name: 'Yohanes Halim',
        role: 'Kepala pengadaan, distributor suku cadang, Pasuruan',
        route: 'Ningbo → Surabaya · FCL 20 kaki',
        quote:
          'Yang paling membantu adalah daftar dokumen yang jelas sejak awal. Biaya yang ditagihkan sama dengan rincian di penawaran, jadi anggaran kami tidak meleset.',
        photo: dermagaPhoto('portrait-3'),
      },
    ],
  },
  faq: {
    enabled: true,
    eyebrow: 'FAQ',
    title: 'Pertanyaan yang sering kami terima',
    subtitle: 'Belum terjawab? Tanyakan langsung ke tim operasional kami.',
    link_label: 'Tanya lewat WhatsApp',
    link_url: '',
    items: [
      {
        question: 'Berapa volume minimum untuk dikirim?',
        answer:
          'Untuk LCL tidak ada minimum; biaya dihitung per meter kubik atau per ton, mana yang lebih besar. Mulai sekitar 15 CBM, kontainer FCL 20 kaki biasanya lebih hemat. Kami bantu hitung keduanya sebelum Anda memutuskan.',
      },
      {
        question: 'Incoterm apa yang sebaiknya saya pakai?',
        answer:
          'Tergantung siapa yang menanggung ongkos dan risiko di setiap titik. Banyak eksportir baru memulai dengan FOB, sementara pembeli yang ingin menerima barang di gudangnya memilih CIF atau DAP. Kami jelaskan bedanya saat konsultasi.',
      },
      {
        question: 'Apakah dokumen ekspor bisa disiapkan oleh tim Anda?',
        answer:
          'Bisa. Kami menyusun invoice, packing list, dan draf dokumen pengapalan bersama tim Anda, lalu memeriksanya sebelum diajukan. Data dan izin usaha tetap atas nama perusahaan Anda sebagai pengirim.',
      },
      {
        question: 'Apakah bisa membantu impor barang ke Indonesia?',
        answer:
          'Bisa, mulai dari mencari pemasok, pengiriman dari pelabuhan asal, sampai barang diantar ke gudang Anda. Ketentuan impor tiap jenis barang berbeda, jadi kebutuhan dokumennya kami periksa sejak awal.',
      },
      {
        question: 'Bagaimana saya tahu posisi kiriman?',
        answer:
          'Kami mengirim kabar setiap pergantian tahap lewat WhatsApp dan email, lengkap dengan foto muat dan salinan bill of lading. Perkiraan jadwal kapal kami teruskan dari pelayaran.',
      },
      {
        question: 'Berapa lama penawaran harga berlaku?',
        answer: 'Tarif laut mengikuti pelayaran dan bisa berubah dari bulan ke bulan, jadi masa berlakunya selalu tertulis di setiap penawaran.',
      },
    ],
  },
  cta: {
    enabled: true,
    eyebrow: 'Siap berangkat?',
    title: 'Kirim detail barang Anda, kami susun penawarannya',
    subtitle:
      'Isi formulir singkat atau langsung chat tim kami. Penawaran tertulis mencakup rute, perkiraan jadwal kapal, dan rincian biaya.',
    button_label: 'Minta Penawaran',
    button_url: '',
    // Bukan "Chat WhatsApp": nama itu milik tombol WhatsApp melayang Shell (nama tautan harus unik)
    secondary_label: 'Konsultasi via WhatsApp',
    secondary_url: '',
  },
  contact: {
    enabled: true,
    eyebrow: 'Kontak',
    title: 'Ceritakan kiriman Anda',
    subtitle:
      'Kantor kami di kawasan Tanjung Perak, Surabaya. Datang langsung pada jam kerja, atau isi formulir permintaan penawaran.',
    address: 'Jl. Dermaga Contoh No. 17, Kawasan Tanjung Perak, Surabaya, Jawa Timur',
    maps_query: 'Pelabuhan Tanjung Perak, Surabaya',
    maps_url: '',
    phone: '081234567890',
    email: 'penawaran@lintasdermaga.test',
    whatsapp: '081234567890',
    whatsapp_message: `Halo ${COMPANY}, saya ingin bertanya tentang pengiriman barang.`,
    hours: 'Senin–Jumat 08.00–17.00, Sabtu 08.00–12.00 WIB',
    form_title: 'Formulir permintaan penawaran',
    form_text: 'Isi data kiriman Anda. Formulir ini menyusun pesan WhatsApp untuk tim kami; data tidak disimpan di website.',
    form_button: 'Susun pesan WhatsApp',
    form_services: [{ label: 'Ekspor' }, { label: 'Impor' }, { label: 'Trading / sourcing' }, { label: 'Dokumen saja' }],
  },
  footer: {
    enabled: true,
    description:
      'Perusahaan general trading dan freight forwarding di Surabaya. Kami mengurus ekspor dan impor barang umum, dari gudang sampai pelabuhan tujuan.',
    wordmark: '',
    copyright: '',
    instagram: 'https://instagram.com/lintasdermaga.contoh',
    facebook: '',
    linkedin: 'https://linkedin.com/company/lintas-dermaga-contoh',
    youtube: 'https://youtube.com/@lintasdermaga.contoh',
    tiktok: '',
  },
};
