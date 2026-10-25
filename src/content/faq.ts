// FAQ bersama website publik (docs/platform/SEO-PLAN.md §5.6 langkah 2): SATU jawaban per pertanyaan di semua tempat
// (beranda, /harga, halaman jasa, halaman template, llms-full.txt, JSON-LD FAQPage). Halaman memilih pertanyaan lewat id
// (HOME_FAQ_IDS, PRICING_FAQ_IDS, TEMPLATE_PAGE_FAQ_IDS, …) dan tidak menulis jawaban sendiri.
//
// Aturan isi:
// - Kalimat pertama langsung menjawab; 40–60 kata; angka dan syarat yang konkret.
// - Fakta dari COMPANY_FACTS (src/lib/companyFacts.ts). Field null tidak disebut (tanpa placeholder): selama waktu aktif
//   (atau biaya tahun ke-2) belum diisi, jawabannya memakai kalimat cadangan yang tetap benar.
// - Harga template hanya dari data (rentang dihitung dari get_templates), tidak ditulis di sini.
// - Domain TIDAK termasuk harga template (pemilik 2026-10-25): dipilih & dibayar saat memesan; harganya dari
//   src/lib/domainPricing.ts, biaya tahun ke-2 dari COMPANY_FACTS.templatePackage.renewalCost.
// - Jasa custom tanpa angka harga (design.md).
// - Jawaban yang juga tersimpan di DB (hero_settings.faq_data) diselaraskan migration
//   database/migrations/2026-10-23_009_seo_faq_contact.sql; tes faq.test.ts memastikan teksnya sama persis. Jawaban
//   "sudah-termasuk" berubah sejak 2026-10-25; versi lamanya di faq_data tidak tampil karena adminFaqs membuang
//   pertanyaan yang sudah dijawab di sini.
// Modul murni (tanpa React), aman diimpor dari *.seo.ts, prerender dan skrip Node.
import { COMPANY_FACTS, type CompanyFacts } from '../lib/companyFacts';
import { DOMAIN_PRICE_FROM, DOMAIN_TLDS, rupiahCompact } from '../lib/domainPricing';
import { formatPriceRange, isPrice, sentence } from '../seo/format';
import type { Template } from '../types/platform';

export interface FaqItem {
  question: string;
  answer: string;
}

/** Data yang dipakai jawaban (sama di server dan klien bila datanya sama). */
export interface FaqContext {
  /** Rentang harga template terbit, mis. "Rp990.000–Rp1.790.000"; null bila belum ada data. */
  priceRange: string | null;
  facts: CompanyFacts;
}

interface FaqEntry {
  question: string;
  /** Pertanyaan lain (mis. versi lama di faq_data admin) yang dijawab entri ini; versi admin itu tidak ditampilkan lagi. */
  aliases?: readonly string[];
  answer: (ctx: FaqContext) => string;
}

/** "3–5 hari kerja" → kalimat waktu aktif; null → kalimat cadangan tanpa angka. */
const activation = (facts: CompanyFacts): string =>
  facts.templatePackage.activationTime
    ? `Website dari template aktif dalam ${facts.templatePackage.activationTime} setelah pembayaran dikonfirmasi dan domain selesai diproses; setiap tahapnya bisa Anda pantau di Akun Saya.`
    : 'Website dari template aktif setelah pembayaran dikonfirmasi, pesanan kami setujui, dan domain selesai diproses; setiap tahapnya bisa Anda pantau di Akun Saya.';

/** "Hosting & jasa …" → "hosting & jasa …"; singkatan dan angka ("SSL", "Rp…") tetap. */
const lowerWord = (text: string): string => (/^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text);

/** Biaya per tahun mulai tahun ke-2 (hosting & jasa + domain, kalimat COMPANY_FACTS); null → kalimat cadangan tanpa angka. */
const renewal = (facts: CompanyFacts): string =>
  facts.templatePackage.renewalCost
    ? `Biaya mulai tahun ke-2: ${lowerWord(sentence(facts.templatePackage.renewalCost))}`
    : 'Mulai tahun ke-2, hosting dan domain diperpanjang per tahun, dan nominalnya kami informasikan sebelum jatuh tempo.';

/** Harga domain .com per tahun (ekstensi paling umum) untuk contoh di jawaban domain. */
const COM_PRICE = DOMAIN_TLDS.find((t) => t.tld === 'com')?.price ?? DOMAIN_PRICE_FROM;

export const FAQ_ENTRIES = {
  'harga-template': {
    question: 'Berapa harga template website di Garuda Nexa?',
    answer: ({ priceRange, facts }) =>
      `${
        priceRange
          ? `Harga template website Garuda Nexa saat ini ${priceRange}, tergantung template yang Anda pilih.`
          : 'Harga setiap template tertera di halaman template dan di halaman Harga.'
      } Harga itu dibayar di awal dan sudah termasuk setup, hosting, dan SSL tahun pertama, sedangkan domain dipilih saat memesan dengan harga sesuai ekstensinya. ${renewal(facts)} Pembayaran online lewat ${facts.templatePackage.paymentProvider}.`,
  },
  'sudah-termasuk': {
    question: 'Apa saja yang sudah termasuk dalam harga template?',
    aliases: ['Apakah sudah termasuk hosting dan domain?'],
    answer: ({ facts }) =>
      `Untuk template, harga sudah termasuk template dan setup awal, hosting, serta sertifikat SSL (HTTPS) untuk tahun pertama. Domain tidak termasuk: Anda memilihnya saat memesan dan harganya ditambahkan ke total pesanan. ${renewal(facts)} Untuk website atau aplikasi custom, domain dan hosting dibahas saat konsultasi.`,
  },
  'waktu-aktif': {
    question: 'Berapa lama proses pembuatan satu website?',
    answer: ({ facts }) =>
      `${activation(facts)} Lama proses domain bergantung pada registrar dan jenis domainnya; misalnya .co.id memerlukan dokumen tambahan. Untuk website atau aplikasi mobile custom, jadwal pengerjaan disepakati bersama dan dituliskan di penawaran.`,
  },
  'cara-pesan': {
    question: 'Bagaimana cara memesan template website?',
    answer: () =>
      'Pilih template, klik Pesan, lalu masuk atau daftar akun. Isi data pemesan, pilih nama domain dan cek ketersediaannya, kemudian lanjutkan ke pembayaran. Status pesanan bisa Anda pantau kapan saja di halaman Akun Saya, mulai dari menunggu pembayaran sampai website aktif.',
  },
  pembayaran: {
    question: 'Metode pembayaran apa saja yang bisa dipakai?',
    answer: ({ facts }) =>
      `Pembayaran template diproses dengan aman oleh ${facts.templatePackage.paymentProvider}. Anda bisa memilih metode pembayaran yang tersedia di ${facts.templatePackage.paymentProvider}, yang tampil di halaman pembayaran. Setelah pembayaran berhasil, status pesanan berubah otomatis dan tim kami mulai memeriksa pesanan Anda.`,
  },
  domain: {
    question: 'Bagaimana dengan domain website saya?',
    answer: () =>
      `Domain dipilih saat memesan: ketik nama yang Anda inginkan, pilih ekstensinya, lalu cek ketersediaannya langsung di formulir. Harganya sesuai ekstensi, mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun (.com ${rupiahCompact(COM_PRICE)}/tahun), dan ditambahkan ke total pesanan. Setelah pembayaran dikonfirmasi, kami mendaftarkan domain itu; bila ternyata tidak bisa didaftarkan, pesanan ditolak dan dana dikembalikan penuh.`,
  },
  'edit-sendiri': {
    question: 'Apakah website yang dibuat bisa saya edit sendiri?',
    answer: () =>
      'Bisa. Setelah website aktif, buka Akun Saya lalu kelola situs Anda. Lewat CMS Anda dapat mengubah teks, gambar, layanan, galeri, testimoni, dan kontak dengan pratinjau langsung, tanpa perlu keahlian coding. Bagian yang bisa diubah mengikuti template yang Anda pilih.',
  },
  keamanan: {
    question: 'Bagaimana dengan sistem keamanannya?',
    answer: () =>
      'Website dari template sudah memakai sertifikat SSL (HTTPS) yang termasuk dalam harga tahun pertama, jadi alamatnya diawali https:// dan data yang dikirim pengunjung terenkripsi. Untuk website atau aplikasi mobile custom, kebutuhan keamanan seperti SSL, hosting, dan perlindungan data dibahas saat konsultasi dan dituliskan di penawaran.',
  },
  kepemilikan: {
    question: 'Siapa pemilik konten yang saya buat?',
    answer: () =>
      'Isi yang Anda masukkan, seperti teks, gambar, logo, dan data, tetap milik Anda. Untuk template, desain dan kodenya tetap milik Garuda Nexa dan Anda mendapat hak pakai untuk satu situs pada domain pesanan selama layanan aktif. Untuk proyek custom, kepemilikan kode sumber diatur di penawaran tertulis.',
  },
  'template-vs-custom': {
    question: 'Apa bedanya template dengan jasa custom?',
    answer: () =>
      'Template memakai desain siap pakai, sehingga website lebih cepat online dan harganya tertera jelas. Jasa custom dirancang dari nol untuk kebutuhan Anda, baik website maupun aplikasi Android/iOS; kebutuhan dan biayanya dibahas lewat konsultasi gratis, lalu kami kirimkan penawaran sebelum pengerjaan dimulai.',
  },
  'pengembalian-dana': {
    question: 'Bagaimana jika pesanan yang sudah dibayar ditolak?',
    answer: ({ facts }) =>
      `${facts.refundGuarantee} Pesanan yang belum dibayar bisa Anda batalkan sendiri tanpa biaya. Pesanan yang sudah disetujui tidak dapat dibatalkan, karena domain, hosting, dan SSL mulai didaftarkan untuk situs Anda.`,
  },
  'biaya-custom': {
    question: 'Berapa biaya jasa pembuatan website atau aplikasi custom?',
    answer: () =>
      'Biaya website dan aplikasi custom kami sampaikan lewat penawaran tertulis setelah konsultasi gratis, karena bergantung pada cakupannya: jumlah halaman atau fitur, integrasi dengan sistem lain, desain, dan kebutuhan server. Penawaran memuat biaya, jadwal, dan tahapan pembayaran, dan pengerjaan baru dimulai setelah Anda menyetujuinya.',
  },
  'lama-custom': {
    question: 'Berapa lama pengerjaan website atau aplikasi custom?',
    answer: () =>
      'Jadwal pengerjaan custom disepakati bersama dan dituliskan di penawaran, sesuai cakupan proyeknya. Selama pengerjaan Anda mendapat kabar progres berkala dan ikut menguji hasilnya sebelum rilis. Bila Anda perlu website yang cepat online dengan harga pasti, template siap pakai bisa menjadi pilihan.',
  },
  'persiapan-custom': {
    question: 'Apa yang perlu saya siapkan sebelum konsultasi?',
    answer: () =>
      'Cukup gambaran kebutuhan Anda: tujuan website atau aplikasi, fitur yang diinginkan, contoh referensi bila ada, serta catatan anggaran atau tenggat. Semuanya bisa Anda tulis di formulir Pesan Custom atau lewat WhatsApp. Materi seperti logo, teks, dan foto bisa menyusul saat pengerjaan.',
  },
  'revisi-custom': {
    question: 'Berapa kali revisi yang saya dapat untuk proyek custom?',
    answer: () =>
      'Jumlah dan cakupan revisi dituliskan di penawaran tertulis, bersama lingkup pekerjaan, biaya, jadwal, dan tahapan pembayaran. Dengan begitu Anda tahu sejak awal apa yang bisa diubah dan kapan. Pengerjaan baru dimulai setelah Anda menyetujui penawaran tersebut.',
  },
  'kode-sumber': {
    question: 'Siapa pemilik kode sumber proyek custom?',
    answer: () =>
      'Kepemilikan kode sumber proyek custom dituangkan dalam penawaran tertulis yang Anda setujui sebelum pengerjaan dimulai, bersama lingkup pekerjaan, biaya, jadwal, dan revisi. Isi dan data yang Anda masukkan ke website atau aplikasi tetap milik Anda.',
  },
  'setelah-rilis': {
    question: 'Apakah ada pendampingan setelah website atau aplikasi rilis?',
    answer: () =>
      'Ya. Setelah rilis kami tetap mendampingi Anda memakai website atau aplikasi yang kami buat. Bila Anda membutuhkan pemeliharaan rutin, misalnya pembaruan berkala dan penanganan kendala, cakupan dan biayanya bisa dimasukkan ke penawaran atau perjanjian proyek sejak awal.',
  },
  'toko-online': {
    question: 'Bisakah dibuatkan toko online atau sistem informasi?',
    answer: () =>
      'Bisa. Website custom bisa berupa company profile, toko online, sistem informasi, atau aplikasi web sesuai alur kerja Anda. Fitur seperti katalog produk, formulir, panel admin, dan laporan dibahas saat konsultasi, lalu cakupannya dicantumkan di penawaran sebelum pengerjaan dimulai.',
  },
  'android-ios': {
    question: 'Bisakah satu aplikasi dibuat untuk Android dan iOS sekaligus?',
    answer: () =>
      'Bisa. Aplikasi kami bangun untuk Android dan iOS sekaligus dari satu basis kode, sehingga fitur di kedua platform sama dan pembaruannya bisa dirilis bersamaan. Bila Anda hanya membutuhkan salah satu platform, hal itu bisa diatur di penawaran.',
  },
  'rilis-store': {
    question: 'Apakah aplikasi dirilis ke Play Store dan App Store?',
    answer: () =>
      'Ya. Kami membantu proses rilis aplikasi ke Google Play Store dan Apple App Store, termasuk menyiapkan berkas aplikasi untuk ditinjau toko. Kepemilikan akun toko aplikasi dan kode sumber dituliskan di penawaran yang Anda setujui sebelum pengerjaan dimulai.',
  },
  'server-aplikasi': {
    question: 'Apakah aplikasi sudah termasuk server dan panel admin?',
    answer: () =>
      'Bila aplikasi membutuhkan server, database, atau panel admin, kebutuhan itu ikut dirancang dan dicantumkan di penawaran beserta biayanya. Banyak aplikasi bisnis, seperti kasir dan absensi, memakai panel web untuk pengelola dan aplikasi mobile untuk pengguna di lapangan.',
  },
} satisfies Record<string, FaqEntry>;

export type FaqId = keyof typeof FAQ_ENTRIES;

/** FAQ marketplace yang selalu tampil di beranda (#faq), sebelum FAQ tambahan dari admin. */
export const HOME_FAQ_IDS: readonly FaqId[] = [
  'sudah-termasuk',
  'harga-template',
  'waktu-aktif',
  'cara-pesan',
  'pembayaran',
  'domain',
  'edit-sendiri',
  'keamanan',
  'kepemilikan',
  'template-vs-custom',
];

/** /harga. */
export const PRICING_FAQ_IDS: readonly FaqId[] = [
  'harga-template',
  'sudah-termasuk',
  'waktu-aktif',
  'pembayaran',
  'pengembalian-dana',
  'biaya-custom',
  'template-vs-custom',
];

/** Halaman template /template/{slug} (WP5): tambahkan FAQ khusus template sesudah daftar ini. */
export const TEMPLATE_PAGE_FAQ_IDS: readonly FaqId[] = ['sudah-termasuk', 'waktu-aktif', 'edit-sendiri', 'domain', 'pengembalian-dana'];

/** Katalog /template (WP5). */
export const CATALOG_FAQ_IDS: readonly FaqId[] = ['sudah-termasuk', 'harga-template', 'waktu-aktif', 'edit-sendiri', 'template-vs-custom'];

/** /jasa-pembuatan-website. */
export const WEB_SERVICE_FAQ_IDS: readonly FaqId[] = ['biaya-custom', 'lama-custom', 'persiapan-custom', 'revisi-custom', 'toko-online', 'setelah-rilis', 'kode-sumber'];

/** /jasa-pembuatan-aplikasi-mobile. */
export const MOBILE_SERVICE_FAQ_IDS: readonly FaqId[] = ['android-ios', 'biaya-custom', 'lama-custom', 'rilis-store', 'server-aplikasi', 'kode-sumber', 'setelah-rilis'];

/** Konteks jawaban dari daftar template (hanya yang terbit dan berharga). */
export function faqContext(templates: readonly Pick<Template, 'price' | 'status'>[] = [], facts: CompanyFacts = COMPANY_FACTS): FaqContext {
  const prices = templates.filter((t) => t && t.status !== 'draft' && isPrice(t.price)).map((t) => t.price);
  return { priceRange: formatPriceRange(prices), facts };
}

/** Tanya jawab untuk id ini, dengan teks yang sama di setiap halaman. */
export function faqItem(id: FaqId, ctx: FaqContext = faqContext()): FaqItem {
  const entry: FaqEntry = FAQ_ENTRIES[id];
  return { question: entry.question, answer: entry.answer(ctx) };
}

export const faqItems = (ids: readonly FaqId[], ctx: FaqContext = faqContext()): FaqItem[] => ids.map((id) => faqItem(id, ctx));

/** "Apakah  Sudah…?" → "apakah sudah…?" untuk membandingkan pertanyaan. */
export const normalizeQuestion = (question: string): string => question.trim().toLowerCase().replace(/\s+/g, ' ');

/** Semua pertanyaan (dan aliasnya) yang dijawab FAQ_ENTRIES: versi admin pertanyaan ini tidak ditampilkan. */
const PLATFORM_QUESTIONS: ReadonlySet<string> = new Set(
  Object.values(FAQ_ENTRIES as Record<string, FaqEntry>).flatMap((entry) => [entry.question, ...(entry.aliases ?? [])].map(normalizeQuestion)),
);

/** FAQ umum bawaan, dipakai bila admin belum pernah mengisi `faq_data`. */
export const DEFAULT_ADMIN_FAQS: readonly FaqItem[] = [
  {
    question: 'Bagaimana cara memesan website atau aplikasi mobile custom?',
    answer:
      'Isi formulir Pesan Custom atau hubungi kami lewat WhatsApp. Tim kami menghubungi Anda untuk konsultasi gratis, lalu mengirimkan penawaran tertulis berisi lingkup, biaya, dan jadwal yang sesuai dengan kebutuhan Anda. Pengerjaan baru dimulai setelah Anda menyetujuinya.',
  },
];

const isFaqItem = (value: unknown): value is FaqItem =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as FaqItem).question === 'string' &&
  typeof (value as FaqItem).answer === 'string' &&
  (value as FaqItem).question.trim() !== '' &&
  (value as FaqItem).answer.trim() !== '';

/**
 * FAQ tambahan dari admin (setting `faq_data`, JSON array {question, answer}). Kosong/tidak valid → bawaan; array kosong
 * dari admin dihormati. Pertanyaan yang sudah dijawab FAQ_ENTRIES (termasuk aliasnya) dan duplikat dibuang.
 */
export function adminFaqs(raw: unknown): FaqItem[] {
  let list: unknown = DEFAULT_ADMIN_FAQS;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      // setting rusak → bawaan
    }
  }
  const seen = new Set(PLATFORM_QUESTIONS);
  const out: FaqItem[] = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (!isFaqItem(item)) continue;
    const key = normalizeQuestion(item.question);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ question: item.question.trim(), answer: item.answer.trim() });
  }
  return out;
}

/** FAQ beranda: FAQ marketplace (HOME_FAQ_IDS) lalu FAQ tambahan admin. Sama untuk section #faq dan JSON-LD beranda. */
export function homeFaqs(settings: Record<string, unknown>, ctx: FaqContext = faqContext()): FaqItem[] {
  return [...faqItems(HOME_FAQ_IDS, ctx), ...adminFaqs(settings?.faq_data)];
}

/**
 * FAQ gabungan untuk llms-full.txt (Lampiran C): semua pertanyaan FAQ_ENTRIES (satu kali masing-masing) lalu FAQ
 * tambahan admin, dengan jawaban yang sama persis dengan yang tampil di situs.
 */
export function faqForLlms(data: { settings?: Record<string, unknown>; templates?: readonly Template[] }): FaqItem[] {
  const ctx = faqContext(data.templates ?? []);
  const ids = Object.keys(FAQ_ENTRIES) as FaqId[];
  return [...faqItems(ids, ctx), ...adminFaqs(data.settings?.faq_data)];
}
