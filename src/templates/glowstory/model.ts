// Turunan konten GlowStory (fungsi murni, diuji di __tests__/glowstory.test.tsx): warna teks aksen di latar krem,
// menu, pencarian halaman, harga rupiah, saring produk per kategori, kuis jenis kulit (pertanyaan, skor, rutinitas),
// hitungan langganan isi ulang, keranjang + pesan WhatsApp. Semua tahan konten mentah (null, angka, list rusak).
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
  isEnabled,
  list,
  parseHex,
  resolveAction,
  safeUrl,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { GLOWSTORY_ACCENT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Krem halaman & cokelat tua pita gelap (styles.ts) */
export const CREAM: Rgb = [246, 241, 234];
export const DARK: Rgb = [43, 33, 28];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;

/**
 * Variabel warna lokal GlowStory (di samping --tpl-accent* milik Shell):
 * --gs-accent-text: aksen untuk TEKS di krem/pasir (kata miring, harga diskon), digelapkan sampai ≥ 4,6:1 terhadap krem;
 * --gs-accent-light: aksen untuk teks di pita cokelat tua (≥ 4,6:1 terhadap #2B211C);
 * --gs-accent-soft: bidang lembut warna aksen (chip, latar ikon);
 * --gs-accent-hover: aksen sedikit lebih gelap untuk hover tombol.
 */
export function glowVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(GLOWSTORY_ACCENT) as Rgb);
  let ink = accent;
  for (let i = 0; i < 20 && contrast(ink, CREAM) < 4.6; i += 1) ink = mix(ink, BLACK, 0.88);
  let light = accent;
  for (let i = 0; i < 20 && contrast(light, DARK) < 4.6; i += 1) light = mix(light, WHITE, 0.82);
  return {
    '--gs-accent-text': toHex(ink),
    '--gs-accent-light': toHex(light),
    '--gs-accent-soft': toHex(mix(accent, CREAM, 0.14)),
    '--gs-accent-hover': toHex(mix(accent, BLACK, 0.86)),
  } as CSSProperties;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface GlowNavItem {
  key: string;
  label: string;
}

/** Urutan menu = urutan halaman (Beranda lewat logo). */
const NAV: { key: string; label: string; listKey?: string }[] = [
  { key: 'categories', label: 'Kategori', listKey: 'items' },
  { key: 'products', label: 'Terlaris', listKey: 'items' },
  { key: 'quiz', label: 'Kuis Kulit', listKey: 'questions' },
  { key: 'refill', label: 'Langganan', listKey: 'products' },
  { key: 'testimonials', label: 'Ulasan', listKey: 'items' },
  { key: 'faq', label: 'FAQ', listKey: 'items' },
];

/** Label menu dari label section bila singkat (≤ 14 huruf, ≤ 2 kata); selain itu label bawaan. */
const shortLabel = (section: SectionContent, fallback: string) => {
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

export function navItems(content: SiteContent): GlowNavItem[] {
  return NAV.filter(({ key, listKey }) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return false;
    if (key === 'quiz') return quizQuestions(section).length > 0 && quizTypes(section).length > 0;
    return listKey ? list(section, listKey).length > 0 : true;
  }).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Pencarian halaman ────────────────────────────────────────────────────────

export interface SearchEntry {
  /** Teks yang tampil (nama produk, kategori, pertanyaan, judul section) */
  label: string;
  /** Keterangan (mis. "Terlaris · Kembang Lab") */
  group: string;
  /** Kunci section tujuan */
  target: string;
  /** Kata tambahan yang ikut dicari tapi tidak tampil (merek, kategori) */
  extra?: string;
}

/** Huruf kecil tanpa diakritik, spasi dirapatkan. */
export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Isi yang bisa dicari dari tombol cari: judul section (menu), produk, kategori, tipe kulit, produk langganan, FAQ. */
export function searchEntries(content: SiteContent, nav: GlowNavItem[]): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const groupOf = (key: string, fallback: string) => nav.find((item) => item.key === key)?.label ?? fallback;
  for (const item of nav) {
    const title = text(getSection(content, item.key), 'title');
    entries.push({ label: title || item.label, group: item.label, target: item.key });
  }
  const products = getSection(content, 'products');
  if (isEnabled(products)) {
    for (const item of list(products, 'items', 12)) {
      const name = field(item, 'name');
      const brand = field(item, 'brand');
      if (name) entries.push({ label: name, group: [groupOf('products', 'Terlaris'), brand].filter(Boolean).join(' · '), target: 'products', extra: field(item, 'category') });
    }
  }
  const add = (key: string, listKey: string, labelKey: string, fallbackGroup: string) => {
    const section = getSection(content, key);
    if (!isEnabled(section)) return;
    for (const item of list(section, listKey)) {
      const label = field(item, labelKey);
      if (label) entries.push({ label, group: groupOf(key, fallbackGroup), target: key });
    }
  };
  add('categories', 'items', 'name', 'Kategori');
  add('quiz', 'types', 'name', 'Kuis Kulit');
  add('refill', 'products', 'name', 'Langganan');
  add('faq', 'items', 'question', 'FAQ');
  return entries;
}

/** Hasil pencarian: semua kata kueri harus ada di label/keterangan/kata tambahan. Kueri kosong → []. */
export function searchFilter(entries: SearchEntry[], query: string, max = 8): SearchEntry[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  return entries
    .filter((entry) => {
      const haystack = normalize(`${entry.label} ${entry.group} ${entry.extra ?? ''}`);
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, max);
}

// ─── Harga ────────────────────────────────────────────────────────────────────

/** "Rp119.000" / "Rp 1.290.000,-" / "119000" → 119000; tanpa angka → null. Desimal ",00" diabaikan. */
export function parseRupiah(raw: string | null | undefined): number | null {
  const value = (raw || '').replace(/,\d{1,2}(?!\d)/g, '').replace(/\D/g, '');
  if (!value) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

/** 119000 → "Rp119.000" (titik ribuan, dibulatkan). */
export const formatRupiah = (n: number): string => `Rp${String(Math.round(Math.max(0, n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Rating "4,9" / "4.9" / 5 → angka 0–5 (tidak valid → null). */
export function parseRating(raw: string | null | undefined): number | null {
  const n = Number((raw || '').trim().replace(',', '.'));
  return Number.isFinite(n) && (raw || '').trim() !== '' ? Math.min(5, Math.max(0, n)) : null;
}

/** Angka rating untuk dibaca: 4.9 → "4,9", 5 → "5". */
export const formatRating = (value: number): string => String(Math.round(value * 10) / 10).replace('.', ',');

// ─── Produk & kategori ───────────────────────────────────────────────────────

/** Kategori unik dari produk, urut kemunculan (tanpa beda huruf besar/kecil & spasi). */
export function productCategories(items: ListItem[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const category = field(item, 'category');
    const key = normalize(category);
    if (key && !seen.has(key)) seen.set(key, category);
  }
  return Array.from(seen.values());
}

/** Produk dalam kategori (kosong = semua). */
export const filterProducts = (items: ListItem[], category: string): ListItem[] =>
  category ? items.filter((item) => normalize(field(item, 'category')) === normalize(category)) : items;

/** Nama kategori produk yang cocok dengan nama kartu kategori; tidak ada → "". */
export const matchCategory = (name: string, categories: string[]): string => categories.find((c) => normalize(c) === normalize(name)) ?? '';

// ─── Kuis jenis kulit ─────────────────────────────────────────────────────────

export interface QuizAnswer {
  label: string;
  /** Indeks tipe kulit yang mendapat poin (jawaban ke-n → tipe ke-n) */
  type: number;
}

export interface QuizQuestion {
  question: string;
  answers: QuizAnswer[];
}

export interface RoutineStep {
  step: string;
  product: string;
  price: string;
}

export interface SkinType {
  name: string;
  summary: string;
  tip: string;
  morning: RoutineStep[];
  night: RoutineStep[];
}

/** Pertanyaan berisi teks dengan ≥ 2 jawaban (jawaban kosong dilewati tapi nomor poinnya tetap). Maks. 4. */
export function quizQuestions(quiz: SectionContent): QuizQuestion[] {
  return list(quiz, 'questions', 4)
    .map((item) => ({
      question: field(item, 'question'),
      answers: [1, 2, 3, 4].map((n) => ({ label: field(item, `answer_${n}`), type: n - 1 })).filter((a) => a.label),
    }))
    .filter((q) => q.question && q.answers.length >= 2);
}

/** "Langkah | Produk | Harga" per baris; "Langkah: Produk" juga diterima; baris tanpa pemisah = nama produk. Maks. 8. */
export function parseRoutine(raw: string): RoutineStep[] {
  return (raw || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
    .map((line): RoutineStep => {
      if (line.includes('|')) {
        const [step = '', product = '', price = ''] = line.split('|').map((part) => part.trim());
        return product ? { step, product, price } : { step: '', product: step, price };
      }
      const colon = line.indexOf(':');
      if (colon > 0 && colon < line.length - 1) return { step: line.slice(0, colon).trim(), product: line.slice(colon + 1).trim(), price: '' };
      return { step: '', product: line, price: '' };
    })
    .slice(0, 8);
}

/** Tipe kulit bernama. Maks. 4. */
export function quizTypes(quiz: SectionContent): SkinType[] {
  return list(quiz, 'types', 4)
    .filter((item) => field(item, 'name'))
    .map((item) => ({
      name: field(item, 'name'),
      summary: field(item, 'summary'),
      tip: field(item, 'tip'),
      morning: parseRoutine(field(item, 'morning')),
      night: parseRoutine(field(item, 'night')),
    }));
}

/**
 * Hasil kuis: tipe dengan poin terbanyak. `answers[i]` = indeks tipe jawaban pertanyaan ke-i (−1/undefined = belum
 * dijawab). Seri → tipe yang lebih dulu dipilih; tanpa poin sah → tipe pertama.
 */
export function quizResult(answers: (number | undefined)[], typeCount: number): number {
  if (typeCount <= 0) return -1;
  const score = new Array<number>(typeCount).fill(0);
  const firstSeen = new Array<number>(typeCount).fill(Infinity);
  answers.forEach((type, i) => {
    if (type === undefined || type < 0 || type >= typeCount) return;
    score[type] += 1;
    firstSeen[type] = Math.min(firstSeen[type], i);
  });
  let best = 0;
  for (let t = 1; t < typeCount; t += 1) {
    if (score[t] > score[best] || (score[t] === score[best] && firstSeen[t] < firstSeen[best])) best = t;
  }
  return best;
}

// ─── Langganan isi ulang ─────────────────────────────────────────────────────

export interface RefillQuote {
  normal: number;
  perDelivery: number;
  saving: number;
  deliveriesPerYear: number;
  savingPerYear: number;
}

/**
 * Harga langganan: potongan `discount`% dari harga normal, dibulatkan ke Rp100 terdekat; kiriman setahun = 52 minggu
 * dibagi jarak kirim (dibulatkan ke bawah). Harga/jarak tidak valid → null.
 */
export function refillQuote(priceRaw: string, weeksRaw: string, discountRaw: string): RefillQuote | null {
  const normal = parseRupiah(priceRaw);
  const weeks = Number((weeksRaw || '').replace(/[^\d]/g, ''));
  const discount = Math.min(90, Math.max(0, Number((discountRaw || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0));
  if (!normal || !weeks) return null;
  const perDelivery = Math.round((normal * (100 - discount)) / 100 / 100) * 100;
  const saving = normal - perDelivery;
  const deliveriesPerYear = Math.floor(52 / weeks);
  return { normal, perDelivery, saving, deliveriesPerYear, savingPerYear: saving * deliveriesPerYear };
}

/** Potongan terbesar dari pilihan jadwal (untuk label "hemat hingga …"). */
export const maxDiscount = (intervals: ListItem[]): number =>
  intervals.reduce((max, item) => Math.max(max, Number(field(item, 'discount').replace(/[^\d]/g, '')) || 0), 0);

// ─── Keranjang ────────────────────────────────────────────────────────────────

export interface CartLine {
  name: string;
  /** Harga satuan (rupiah) */
  price: number;
  qty: number;
}

/** Tambah barang (nama sama → jumlah bertambah). Harga tidak valid → keranjang tidak berubah. Maks. 99 per barang. */
export function cartAdd(lines: CartLine[], name: string, priceRaw: string, qty = 1): CartLine[] {
  const price = parseRupiah(priceRaw);
  const clean = name.trim();
  if (!clean || price === null) return lines;
  const index = lines.findIndex((line) => normalize(line.name) === normalize(clean));
  if (index < 0) return [...lines, { name: clean, price, qty: Math.min(99, qty) }];
  return lines.map((line, i) => (i === index ? { ...line, qty: Math.min(99, line.qty + qty) } : line));
}

/** Ubah jumlah; ≤ 0 → barang dihapus. */
export const cartSetQty = (lines: CartLine[], name: string, qty: number): CartLine[] =>
  qty <= 0 ? lines.filter((line) => line.name !== name) : lines.map((line) => (line.name === name ? { ...line, qty: Math.min(99, qty) } : line));

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, line) => sum + line.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, line) => sum + line.price * line.qty, 0);

/** Pesan WhatsApp berisi daftar pesanan + subtotal. */
export function cartMessage(companyName: string, lines: CartLine[]): string {
  const rows = lines.map((line, i) => `${i + 1}. ${line.name} × ${line.qty} — ${formatRupiah(line.price * line.qty)}`);
  return [`Halo ${companyName}, saya ingin memesan:`, ...rows, `Subtotal: ${formatRupiah(cartTotal(lines))}`, 'Mohon info ongkir dan cara pembayarannya. Terima kasih.'].join('\n');
}

// ─── Tautan ───────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readGlowStory(content: SiteContent) {
  const brand = getSection(content, 'brand');
  const hero = getSection(content, 'hero');
  const perks = getSection(content, 'perks');
  const categories = getSection(content, 'categories');
  const products = getSection(content, 'products');
  const quiz = getSection(content, 'quiz');
  const refill = getSection(content, 'refill');
  const testimonials = getSection(content, 'testimonials');
  const brands = getSection(content, 'brands');
  const faq = getSection(content, 'faq');
  const cta = getSection(content, 'cta');
  const contact = getSection(content, 'contact');
  const footer = getSection(content, 'footer');

  const companyName = text(brand, 'company_name') || 'Nama Toko';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;
  const contactAction: LinkAction | null = isEnabled(contact) ? { kind: 'section', target: 'contact' } : null;
  /** Tujuan "tanya": WhatsApp bila ada nomor, kalau tidak section Kontak, kalau tidak null (tombol disembunyikan). */
  const askAction: LinkAction | null = waAction ?? contactAction;
  const productItems = isEnabled(products) ? list(products, 'items', 12).filter((item) => field(item, 'name')) : [];
  const productsAction: LinkAction | null = productItems.length > 0 ? { kind: 'section', target: 'products' } : null;
  const quizOn = isEnabled(quiz) && quizQuestions(quiz).length > 0 && quizTypes(quiz).length > 0;
  const nav = navItems(content);

  /** WhatsApp dengan pesan bebas; tanpa nomor → aksi "tanya" biasa. */
  const waWith = (message: string): LinkAction | null => {
    const link = message ? whatsappHref(whatsapp, message) : '';
    return link ? { kind: 'external', href: link } : askAction;
  };

  return {
    brand,
    hero,
    perks,
    categories,
    products,
    productItems,
    quiz,
    quizOn,
    refill,
    testimonials,
    brands,
    faq,
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: glowVars(text(brand, 'accent_color')),
    whatsapp,
    waAction,
    askAction,
    waWith,
    productsAction,
    primaryAction: resolveAction(text(hero, 'primary_url'), productsAction ?? askAction),
    secondaryAction: resolveAction(text(hero, 'secondary_url'), quizOn ? { kind: 'section', target: 'quiz' } : null),
    nav,
    search: searchEntries(content, nav),
    socials: socialLinks(footer),
    year: new Date().getFullYear(),
  };
}

export type GlowModel = ReturnType<typeof readGlowStory>;
