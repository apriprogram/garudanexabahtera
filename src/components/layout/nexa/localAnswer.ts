import { FAQ_ENTRIES, faqItem, type FaqId } from '../../../content/faq';
import { DOMAIN_PRICE_FROM, DOMAIN_TLDS, HOSTING_RENEWAL_DEFAULT, RENEWAL_YEAR_OPTIONS, rupiahCompact } from '../../../lib/domainPricing';
import { FIRST_ORDER_DISCOUNT_PERCENT } from '../../../lib/firstOrderDiscount';
import { HUB_PATHS, LEGAL_PATHS } from '../../../seo/paths';
import { PROJECT_QUESTION, type NexaCards } from './replyModel';

/**
 * Jawaban bawaan Nexa tanpa AI: dipakai bila aksi nexa_chat tidak bisa menjawab (ANTHROPIC_API_KEY belum dipasang,
 * Claude gagal, batas pertanyaan tercapai, atau jaringan putus). Pertanyaan dicocokkan dengan maksud (INTENTS, urut
 * dari yang paling khusus: "harga aplikasi custom" sebelum "harga template"), lalu dengan kata penting di tanya jawab
 * situs (FAQ_ENTRIES). Jawaban hanya berisi fakta yang juga tertulis di situs, dan selalu menautkan halaman yang tepat
 * atau WhatsApp.
 *
 * Domain TIDAK termasuk harga template (pemilik 2026-10-25, docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md): "apakah sudah
 * termasuk domain?", harga domain, dan biaya perpanjangan dijawab dari src/lib/domainPricing.ts (angka tidak ditulis
 * tangan). Biaya hosting & jasa per tahun = setting admin (useHostingRenewalPrice), bawaan HOSTING_RENEWAL_DEFAULT.
 */

/** Harga per tahun satu ekstensi dari tabel bawaan ("Rp250.000"). */
const tldPrice = (tld: string): string => rupiahCompact(DOMAIN_TLDS.find((t) => t.tld === tld)?.price ?? DOMAIN_PRICE_FROM);

/** ".com dan .id Rp250.000" (harga sama) atau ".com Rp250.000, .id Rp…". */
const POPULAR_DOMAINS = tldPrice('com') === tldPrice('id') ? `.com dan .id ${tldPrice('com')}` : `.com ${tldPrice('com')}, .id ${tldPrice('id')}`;

/** Isi harga template (= TEMPLATE_PRICE_INCLUDES_DEFAULT, tanpa domain). */
export const TEMPLATE_INCLUDES_TEXT = 'setup awal, hosting, dan SSL tahun pertama';

/** "Domain dipilih saat memesan, mulai Rp50.000/tahun (.com dan .id Rp250.000)." */
export const DOMAIN_PRICE_TEXT = `Domain dipilih saat memesan, mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun (${POPULAR_DOMAINS}).`;

/** Biaya per tahun mulai tahun ke-2: hosting & jasa (setting admin) + domain sesuai ekstensi. */
export const renewalText = (hostingRenewal: number = HOSTING_RENEWAL_DEFAULT): string =>
  `Mulai tahun ke-2, biaya per tahun adalah hosting & jasa ${rupiahCompact(hostingRenewal)} ditambah domain sesuai ekstensinya.`;

/** Jawaban "template apa saja?" (juga topik cepat "Pilih template" di NexaChat). */
export const TEMPLATES_INTRO =
  `Kami punya template siap pakai untuk company profile, klinik & salon, klub olahraga, studio yoga, sampai fintech. Harganya sudah termasuk ${TEMPLATE_INCLUDES_TEXT}, plus diskon ${FIRST_ORDER_DISCOUNT_PERCENT}% otomatis untuk pembelian template pertama. ${DOMAIN_PRICE_TEXT}`;

/** "1, 2, atau 3 tahun" (= RENEWAL_YEAR_OPTIONS). */
const YEARS_TEXT = `${RENEWAL_YEAR_OPTIONS.slice(0, -1).join(', ')}, atau ${RENEWAL_YEAR_OPTIONS[RENEWAL_YEAR_OPTIONS.length - 1]} tahun`;

/** Ekspresi maskot Nexa (public/assets/nexa/nexa-{mood}-*.webp; netral = nexa-*.webp), semua tanpa mulut. */
export type NexaMood = 'netral' | 'kedip' | 'ceria' | 'kilau' | 'pikir' | 'maaf';

export interface NexaAction {
  label: string;
  /** Halaman di situs ini (react-router) */
  to?: string;
  /** Tautan luar (WhatsApp), dibuka di tab baru */
  href?: string;
}

export interface NexaAnswer {
  text: string;
  action?: NexaAction;
  /** Ekspresi maskot di samping jawaban (kosong = dipilih dari isi jawaban, lihat replyMood di NexaChat) */
  mood?: NexaMood;
  /** Kartu bergambar di bawah jawaban: semua template / proyek teratas */
  cards?: NexaCards;
}

/** Huruf kecil tanpa tanda baca/diakritik, spasi tunggal. */
export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const CATALOG: NexaAction = { label: 'Lihat katalog template', to: HUB_PATHS.catalog };
const PRICING: NexaAction = { label: 'Lihat halaman harga', to: HUB_PATHS.pricing };
const CUSTOM: NexaAction = { label: 'Isi form pesan custom', to: HUB_PATHS.customOrder };
const MOBILE: NexaAction = { label: 'Jasa aplikasi mobile', to: HUB_PATHS.mobileService };
const WEB: NexaAction = { label: 'Jasa pembuatan website', to: HUB_PATHS.webService };

/** Halaman yang paling cocok untuk setiap jawaban tanya jawab. */
const FAQ_ACTION: Record<FaqId, NexaAction> = {
  'harga-template': PRICING,
  'sudah-termasuk': PRICING,
  'waktu-aktif': { label: 'Mulai pilih template', to: HUB_PATHS.catalog },
  'cara-pesan': { label: 'Mulai pilih template', to: HUB_PATHS.catalog },
  pembayaran: { label: 'Mulai pilih template', to: HUB_PATHS.catalog },
  domain: PRICING,
  'edit-sendiri': CATALOG,
  keamanan: PRICING,
  kepemilikan: { label: 'Syarat & ketentuan', to: LEGAL_PATHS.terms },
  'template-vs-custom': CUSTOM,
  'pengembalian-dana': { label: 'Kebijakan pengembalian dana', to: LEGAL_PATHS.refund },
  'biaya-custom': CUSTOM,
  'lama-custom': CUSTOM,
  'persiapan-custom': CUSTOM,
  'revisi-custom': CUSTOM,
  'kode-sumber': CUSTOM,
  'setelah-rilis': CUSTOM,
  'toko-online': WEB,
  'android-ios': MOBILE,
  'rilis-store': MOBILE,
  'server-aplikasi': MOBILE,
};

const faqAnswer = (id: FaqId): NexaAnswer => ({ text: faqItem(id).answer, action: FAQ_ACTION[id] });

/** "Sudah termasuk domain?" / "berapa harga domain?": belum, domain dipilih & dibayar saat memesan. */
const domainAnswer = (hostingRenewal: number): NexaAnswer => ({
  text: `Domain belum termasuk harga template. Anda memilih nama domain saat memesan, ketersediaannya dicek langsung, dan harganya ditambahkan ke total pesanan: mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun (${POPULAR_DOMAINS}/tahun). Harga template sudah termasuk ${TEMPLATE_INCLUDES_TEXT}. ${renewalText(hostingRenewal)}`,
  action: PRICING,
});

/** Perpanjangan tahun ke-2 dan seterusnya: rincian biaya + cara memperpanjang dari akun. */
const renewalAnswer = (hostingRenewal: number): NexaAnswer => ({
  text: `Mulai tahun ke-2, biaya per tahun adalah hosting & jasa ${rupiahCompact(hostingRenewal)} ditambah perpanjangan domain sesuai ekstensinya (mis. .com ${tldPrice('com')}, .web.id ${tldPrice('web.id')}). Perpanjangan bisa ${YEARS_TEXT} sekaligus dari halaman pesanan di Akun Saya dan dibayar lewat Midtrans. Pengingat tampil di akun mulai 30 hari sebelum masa aktif berakhir.`,
  action: PRICING,
});

// Kata kunci sebagai potongan kata (tanpa \b di akhir), jadi "harganya", "diedit", "dibatalkan" ikut cocok
const CUSTOM_WORDS = /\b(custom|khusus|dari nol|aplikasi|apk|mobile|android|ios)/;
const PRICE_WORDS = /(harga|biaya|tarif|\bprice|\bcost|how much|mahal|murah|budget|bujet)/;
const DURATION_WORDS = /\b(lama|berapa hari|berapa minggu|durasi|kapan selesai|kapan jadi|kapan aktif|estimasi waktu|how long)/;
// Tahun ke-2 dan seterusnya (teks sudah dinormalisasi: "tahun ke-2" → "tahun ke 2")
const RENEWAL_WORDS = /(perpanjang|tahun ke ?2\b|tahun ke ?dua|tahun kedua|tahun depan|tahun berikut|\brenew|masa aktif|kedaluwarsa|kadaluarsa|kadaluwarsa|\bexpired?\b|biaya tahunan)/;
// "Sudah termasuk domain?", "dapat domain gratis?", "berapa harga domain?"
const DOMAIN_INCLUDED_WORDS = /(termasuk|include|gratis|\bfree\b|harga|biaya|tarif|\bprice|\bcost|how much|mahal|murah|berapa)/;

interface Intent {
  /** Semua pola harus cocok dengan teks yang sudah dinormalisasi */
  when: RegExp[];
  answer: (whatsappHref: string, hostingRenewal: number) => NexaAnswer;
}

const faqIntent = (id: FaqId, ...when: RegExp[]): Intent => ({ when, answer: () => faqAnswer(id) });

/** Urutan = prioritas: maksud yang lebih khusus lebih dulu. */
const INTENTS: Intent[] = [
  faqIntent('biaya-custom', CUSTOM_WORDS, PRICE_WORDS),
  faqIntent('lama-custom', CUSTOM_WORDS, DURATION_WORDS),
  // Perpanjangan & domain sebelum "waktu aktif" dan "harga template": "berapa biaya perpanjangan domain?" bukan harga template
  { when: [RENEWAL_WORDS], answer: (_, hostingRenewal) => renewalAnswer(hostingRenewal) },
  { when: [/\bdomain/, DOMAIN_INCLUDED_WORDS], answer: (_, hostingRenewal) => domainAnswer(hostingRenewal) },
  faqIntent('waktu-aktif', DURATION_WORDS),
  faqIntent('revisi-custom', /revisi/),
  faqIntent('kode-sumber', /(kode sumber|source code|\bsource\b)/),
  faqIntent('pengembalian-dana', /(refund|uang kembali|pengembalian|dikembalikan|ditolak|batal)/),
  {
    when: [/(diskon|promo|potongan|voucher|kupon)/],
    answer: () => ({
      text: `Akun baru otomatis mendapat diskon ${FIRST_ORDER_DISCOUNT_PERCENT}% untuk pembelian template pertama, tanpa kode. Harga setelah diskon sudah tertera di setiap kartu template.`,
      action: CATALOG,
      mood: 'kilau',
    }),
  },
  faqIntent('pembayaran', /(bayar|midtrans|transfer|qris|cicil|metode pembayaran)/),
  faqIntent('harga-template', PRICE_WORDS),
  // Hasil kerja kami ("proyek apa saja yang sudah kalian kerjakan?"): setelah diskon/bayar/harga, yang selalu menang,
  // sebelum jenis layanan. Teks tetap masuk akal tanpa kartu (section Projects bisa disembunyikan admin).
  {
    when: [PROJECT_QUESTION],
    answer: () => ({
      text: 'Kami sudah mengerjakan website dan aplikasi custom, dari company profile sampai toko online dan sistem informasi. Mau dibuatkan yang serupa? Ceritakan kebutuhan Anda lewat form pesan custom.',
      action: CUSTOM,
      mood: 'kilau',
      cards: 'projects',
    }),
  },
  faqIntent('rilis-store', /(play ?store|app ?store|rilis)/),
  faqIntent('server-aplikasi', /(server|panel admin|backend)/, /\b(aplikasi|apk|mobile)/),
  faqIntent('android-ios', /\b(aplikasi|apk|mobile|android|ios|iphone)/),
  faqIntent('toko-online', /(toko online|olshop|e ?commerce|sistem informasi|\btoko\b)/),
  faqIntent('persiapan-custom', /(siapkan|persiapan|persiapkan)/),
  faqIntent('setelah-rilis', /(pendampingan|maintenance|perawatan|setelah rilis|after sales)/),
  faqIntent('template-vs-custom', /(beda|perbedaan|bandingkan|vs)/, /(template|custom)/),
  {
    when: [/\b(custom|khusus|dari nol|sesuai kebutuhan)/],
    answer: () => ({
      text: 'Untuk website atau aplikasi mobile custom, ceritakan kebutuhan Anda lewat form pesan custom. Tim kami menghubungi Anda untuk konsultasi gratis, lalu mengirim penawaran berisi cakupan dan jadwal.',
      action: CUSTOM,
    }),
  },
  faqIntent('domain', /\bdomain/),
  faqIntent('sudah-termasuk', /(hosting|\bssl|https|termasuk|include)/),
  faqIntent('keamanan', /(aman|keamanan|security|hack|retas)/),
  faqIntent('edit-sendiri', /(edit|ubah|ganti|kelola|\bcms|update)/),
  faqIntent('kepemilikan', /(pemilik|kepemilikan|milik siapa|hak cipta)/),
  faqIntent('cara-pesan', /(pesan|beli|order|checkout|\bcara\b)/),
  {
    when: [/\b(kontak|hubungi|whatsapp|wa|telepon|telpon|nomor|email|admin|cs|alamat|kantor)\b/],
    answer: (whatsappHref) => ({
      text: 'Tim kami siap membantu lewat WhatsApp atau email info@garudanexa.com. Klik tombol di bawah untuk langsung chat.',
      action: { label: 'Chat WhatsApp', href: whatsappHref },
    }),
  },
  {
    when: [/(template|tema|katalog|desain|contoh|demo|company profile|klinik|salon|sekolah|olahraga|fintech|yoga|pilates)/],
    answer: () => ({
      text: TEMPLATES_INTRO,
      action: CATALOG,
      cards: 'templates',
    }),
  },
];

/** Pesan yang hanya berisi salam (tanpa pertanyaan): dijawab sapaan. */
const GREETING_ONLY = /^((halo|hallo|hai|hi|hello|hey|selamat|pagi|siang|sore|malam|assalamualaikum|permisi|kak|min|admin|gan|sis|bang)\s*)+$/;

// Kata yang terlalu umum untuk menentukan jawaban (hampir semua pertanyaan memakainya)
const STOPWORDS = new Set([
  'apa', 'apakah', 'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'saya', 'aku', 'kami', 'anda', 'bisa', 'ada', 'ini', 'itu',
  'dengan', 'atau', 'juga', 'kah', 'nya', 'bagaimana', 'gimana', 'berapa', 'kalau', 'kalo', 'mau', 'ingin', 'tolong',
  'garuda', 'nexa', 'sudah', 'belum', 'akan', 'the', 'is', 'a', 'to', 'of', 'how', 'what', 'saja', 'dong', 'ya', 'min',
  'template', 'website', 'web', 'situs', 'aplikasi', 'app', 'jasa', 'pembuatan', 'buat', 'dibuat', 'satu', 'jika',
]);

const tokens = (value: string): string[] => normalizeText(value).split(' ').filter((word) => word.length > 2 && !STOPWORDS.has(word));

/** Tanya jawab situs dengan kata penting yang paling banyak sama (minimal 2), atau null. */
function bestFaq(question: string): FaqId | null {
  const asked = new Set(tokens(question));
  if (asked.size < 2) return null;
  let best: FaqId | null = null;
  let bestScore = 1;
  for (const id of Object.keys(FAQ_ENTRIES) as FaqId[]) {
    const entry = FAQ_ENTRIES[id];
    const words = new Set(tokens([entry.question, ...(('aliases' in entry && entry.aliases) || [])].join(' ')));
    let score = 0;
    for (const word of asked) if (words.has(word)) score += 1;
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Jawaban bawaan untuk satu pertanyaan bebas. `hostingRenewal` = biaya hosting & jasa per tahun mulai tahun ke-2
 * (setting admin lewat useHostingRenewalPrice; bawaan HOSTING_RENEWAL_DEFAULT).
 */
export function answerLocally(question: string, whatsappHref: string, hostingRenewal: number = HOSTING_RENEWAL_DEFAULT): NexaAnswer {
  const text = normalizeText(question);
  if (GREETING_ONLY.test(text)) {
    return {
      text: 'Halo! Saya Nexa. Silakan tanya apa saja seputar template website, harga, cara pembelian, atau jasa website dan aplikasi custom.',
      mood: 'kedip',
    };
  }
  const intent = INTENTS.find((candidate) => candidate.when.every((pattern) => pattern.test(text)));
  if (intent) return intent.answer(whatsappHref, hostingRenewal);
  const faqId = bestFaq(question);
  if (faqId) return faqAnswer(faqId);
  return {
    text: 'Maaf, untuk pertanyaan ini Nexa belum punya jawabannya. Tim kami siap membantu lewat WhatsApp.',
    action: { label: 'Chat WhatsApp', href: whatsappHref },
    mood: 'maaf',
  };
}
