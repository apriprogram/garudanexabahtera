// Turunan konten Altura (fungsi murni, diuji di __tests__/altura.test.tsx): warna tema (pita gelap zaitun dari warna tema,
// versi terang untuk teks di latar gelap), menu, section yang tampil, tujuan tautan "#…", tanggal en-US, filter
// portofolio, ikon spesifikasi, angka dengan superskrip "+", tautan video, dan formulir enquiry (teks dari CMS, validasi
// → pesan WhatsApp / email). Semua tahan konten mentah (null, angka, list rusak). Formulir hanya MENYUSUN pesan: tidak
// ada data yang dikirim ke server atau disimpan.
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';
import { SOCIAL_FIELDS } from '../shared/social';
import {
  contrast,
  field,
  getSection,
  hasImage,
  isEnabled,
  list,
  mailHref,
  mapsInfo,
  parseHex,
  resolveAction,
  safeUrl,
  sectionFromAnchor,
  text,
  whatsappHref,
  type LinkAction,
} from '../shared/utils';
import { ALTURA_ACCENT, ALTURA_ENQUIRY_TEXT } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Tinta gelap --tpl-on-accent untuk warna tema terang (= INK di shared/utils accentVars) */
const ON_LIGHT: Rgb = [18, 22, 32];
/** Dasar pita gelap: dicampur 7% warna tema → limau bawaan menghasilkan zaitun #1E2219 */
const NIGHT: Rgb = [16, 19, 20];
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan ke bilangan bulat: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Altura (di samping --tpl-accent* milik Shell), semuanya dari SATU warna tema:
 * --al-deep: zaitun gelap (tema 7% + hampir hitam) untuk kartu gelap, pita angka & proyek, footer; putih ≥ 14:1;
 * --al-deep-2: sedikit lebih terang dari --al-deep (permukaan di dalam pita gelap);
 * --al-bright: warna tema dicerahkan sampai ≥ 6:1 terhadap --al-deep (superskrip "+", titik, label di latar gelap);
 * --al-ink: warna tema digelapkan sampai ≥ 4,8:1 di putih DAN di krem (teks aksen kecil di latar terang);
 * --al-soft: bidang lembut 14% warna tema.
 */
export function alturaVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(ALTURA_ACCENT) as Rgb);
  let deep = mix(accent, NIGHT, 0.07);
  for (let i = 0; i < 12 && contrast(deep, WHITE) < 14; i += 1) deep = mix(deep, NIGHT, 0.8);
  let bright = accent;
  for (let i = 0; i < 20 && contrast(bright, deep) < 6; i += 1) bright = mix(bright, WHITE, 0.8);
  const cream: Rgb = [242, 239, 231];
  let ink = accent;
  for (let i = 0; i < 30 && (contrast(ink, WHITE) < 4.8 || contrast(ink, cream) < 4.8); i += 1) ink = mix(ink, BLACK, 0.88);
  return {
    '--al-deep': toHex(deep),
    '--al-deep-2': toHex(mix(deep, WHITE, 0.94)),
    '--al-bright': toHex(bright),
    '--al-ink': toHex(ink),
    '--al-soft': toHex(mix(accent, WHITE, 0.14)),
  } as CSSProperties;
}

/** true bila teks di atas bidang warna tema berwarna putih (aturan sama dengan --tpl-on-accent di accentVars). */
export function accentIsDark(accentRaw: string): boolean {
  const accent = parseHex(accentRaw) ?? (parseHex(ALTURA_ACCENT) as Rgb);
  return contrast(accent, WHITE) >= contrast(accent, ON_LIGHT);
}

// ─── Section yang tampil ──────────────────────────────────────────────────────

/**
 * Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand` dan `enquiry`, yang berisi
 * teks formulir di dalam section Kontak).
 */
export const PAGE_SECTIONS = [
  'hero',
  'about',
  'pillars',
  'amenities',
  'stats',
  'difference',
  'developments',
  'portfolio',
  'leadership',
  'awards',
  'testimonials',
  'insights',
  'cta',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/**
 * Item `items` yang benar-benar dirender per section (maks. sama dengan skema, syarat sama dengan komponen). Satu sumber
 * untuk komponen, menu, dan tujuan tautan, agar section kosong tidak meninggalkan tautan mati.
 */
const ITEMS: Record<string, [max: number, keep: (item: ListItem) => boolean]> = {
  pillars: [3, (i) => !!(field(i, 'title') || field(i, 'text'))],
  amenities: [8, (i) => !!field(i, 'text')],
  stats: [4, (i) => !!(field(i, 'value') || field(i, 'label'))],
  difference: [6, (i) => !!field(i, 'title')],
  developments: [6, (i) => !!field(i, 'name') && hasImage(field(i, 'image'))],
  portfolio: [12, (i) => !!field(i, 'name')],
  leadership: [4, (i) => !!field(i, 'name')],
  awards: [12, (i) => !!field(i, 'title')],
  testimonials: [6, (i) => !!field(i, 'quote')],
  insights: [6, (i) => !!field(i, 'title')],
};

/** Item yang dirender untuk section `key` (lihat ITEMS); section tanpa daftar item → []. */
export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, 'items', rule[0]).filter(rule[1]) : [];
}

/** Section tampil dan berisi? Kunci yang tidak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'about') return !!(text(s, 'title') || text(s, 'body'));
  if (key === 'cta') return !!(text(s, 'title') || text(s, 'subtitle'));
  return true;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface AlturaNavItem {
  key: string;
  label: string;
}

/** Urutan menu atas: yang paling dicari pembeli, investor, dan mitra perusahaan properti. `label` = nama cadangan. */
const NAV: { key: string; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'developments', label: 'Developments' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'insights', label: 'Insights' },
  { key: 'contact', label: 'Contact' },
];

/**
 * Nama di menu: field "Nama di menu" (menu_label) dari CMS; kosong → label kecil section bila singkat (≤ 14 huruf,
 * ≤ 2 kata); selain itu nama cadangan.
 */
const shortLabel = (section: SectionContent, fallback: string) => {
  const own = text(section, 'menu_label');
  if (own) return own;
  const eyebrow = text(section, 'eyebrow');
  return eyebrow && eyebrow.length <= 14 && eyebrow.split(/\s+/).length <= 2 ? eyebrow : fallback;
};

/** Menu hanya untuk section yang benar-benar tampil (tanpa tautan mati). */
export function navItems(content: SiteContent): AlturaNavItem[] {
  return NAV.filter(({ key }) => sectionShown(content, key)).map(({ key, label }) => ({ key, label: shortLabel(getSection(content, key), label) }));
}

// ─── Tujuan tautan "#…" ───────────────────────────────────────────────────────

/** Anchor yang wajar diketik pembeli (Inggris & Indonesia) → kunci section. Anchor bersama (#kontak, #tentang,
 *  #testimoni, #galeri, #keunggulan, #berita) sudah diterjemahkan sectionFromAnchor. */
const ANCHOR_ALIASES: Record<string, string> = {
  'who-we-are': 'about',
  company: 'about',
  story: 'about',
  profil: 'about',
  services: 'pillars',
  layanan: 'pillars',
  'what-we-do': 'pillars',
  values: 'pillars',
  amenities: 'amenities',
  fasilitas: 'amenities',
  numbers: 'stats',
  statistik: 'stats',
  why: 'difference',
  'why-us': 'difference',
  advantages: 'difference',
  projects: 'developments',
  proyek: 'developments',
  development: 'developments',
  properties: 'portfolio',
  listings: 'portfolio',
  portofolio: 'portfolio',
  gallery: 'portfolio',
  team: 'leadership',
  management: 'leadership',
  pimpinan: 'leadership',
  tim: 'leadership',
  recognition: 'awards',
  penghargaan: 'awards',
  reviews: 'testimonials',
  news: 'insights',
  blog: 'insights',
  wawasan: 'insights',
  enquiry: 'contact',
  inquiry: 'contact',
  offices: 'contact',
  'get-in-touch': 'contact',
  ajakan: 'cta',
};

/** Target tautan section ("projects", "#kontak", "contact") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

// ─── Tanggal (en-US) ──────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Tanggal ISO "YYYY-MM-DD" yang valid → { iso, label: "Oct 8, 2026" }; selain itu null. */
export function parseIsoDate(raw: string | null | undefined): { iso: string; label: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { iso: match[0], label: `${MONTHS[m - 1]} ${d}, ${y}` };
}

// ─── Portofolio ───────────────────────────────────────────────────────────────

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();

/** Kategori untuk tombol filter: urut kemunculan, tanpa duplikat (tanpa beda huruf besar / tanda hubung). */
export function portfolioCategories(items: ListItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const category = field(item, 'category');
    const key = normalize(category);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(category);
  }
  return result;
}

/** Properti untuk filter aktif (null / kategori tak dikenal → semua). */
export function filterPortfolio(items: ListItem[], category: string | null): ListItem[] {
  if (!category) return items;
  const wanted = normalize(category);
  const matches = items.filter((item) => normalize(field(item, 'category')) === wanted);
  return matches.length > 0 ? matches : items;
}

export type SpecIcon = 'area' | 'bed' | 'bath' | 'floors' | 'parking' | 'units' | 'other';

/** Ikon spesifikasi dari teksnya ("420 m²" → luas, "5 beds" → kamar, "14 floors" → lantai, …). */
export function specIcon(value: string): SpecIcon {
  const v = (value || '').toLowerCase();
  if (/m²|m2|sq\s?ft|sqft|sqm|hectare|acre|\bha\b|luas/.test(v)) return 'area';
  if (/bath|wc|toilet|kamar mandi/.test(v)) return 'bath';
  if (/bed|bedroom|kamar tidur|\bkt\b/.test(v)) return 'bed';
  if (/floor|storey|story|level|lantai/.test(v)) return 'floors';
  if (/parking|car|garage|parkir|garasi/.test(v)) return 'parking';
  if (/unit|residence|home|apartment|key|room/.test(v)) return 'units';
  return 'other';
}

// ─── Angka ────────────────────────────────────────────────────────────────────

/** "48+" → { main: "48", sup: "+" }; tanpa "+" di akhir → sup kosong. */
export function splitStat(raw: string): { main: string; sup: string } {
  const value = (raw || '').trim();
  const match = /^(.*\S)\s*\+$/.exec(value);
  return match ? { main: match[1], sup: '+' } : { main: value, sup: '' };
}

// ─── Formulir enquiry ─────────────────────────────────────────────────────────

export interface EnquiryForm {
  name: string;
  email: string;
  /** Opsional, dengan kode negara */
  phone: string;
  /** Keperluan (pilihan dari CMS) */
  interest: string;
  /** Kantor tujuan (opsional, dari daftar kantor) */
  office: string;
  message: string;
}

export type EnquiryErrors = Partial<Record<keyof EnquiryForm, string>>;

export const EMPTY_ENQUIRY: EnquiryForm = { name: '', email: '', phone: '', interest: '', office: '', message: '' };

/** Semua teks formulir enquiry (section `enquiry` di CMS). */
export type EnquiryText = { -readonly [K in keyof typeof ALTURA_ENQUIRY_TEXT]: string };

/** Teks yang wajib ada agar formulir tetap bisa dipakai & terbaca (label isian, pilihan kosong, tombol, pesan galat). */
const REQUIRED_TEXT: (keyof EnquiryText)[] = [
  'label_name',
  'label_email',
  'label_phone',
  'label_interest',
  'label_office',
  'label_message',
  'prompt_interest',
  'prompt_office',
  'submit_label',
  'ready_title',
  'whatsapp_label',
  'email_label',
  'edit_label',
  'error_name',
  'error_email',
  'error_phone',
  'error_interest',
  'error_message',
];

/**
 * Teks formulir dari CMS. Teks wajib yang dikosongkan → teks bawaan (Inggris); teks lain yang dikosongkan (penanda
 * opsional, contoh isian, catatan, keterangan, salam, penutup, subjek) → tidak ditampilkan.
 */
export function readEnquiryText(section: SectionContent): EnquiryText {
  const result = {} as EnquiryText;
  for (const key of Object.keys(ALTURA_ENQUIRY_TEXT) as (keyof EnquiryText)[]) {
    const value = text(section, key);
    result[key] = value || (REQUIRED_TEXT.includes(key) ? ALTURA_ENQUIRY_TEXT[key] : '');
  }
  return result;
}

/** Teks bawaan (untuk pemanggil tanpa konten CMS, mis. tes). */
export const DEFAULT_ENQUIRY_TEXT: EnquiryText = { ...ALTURA_ENQUIRY_TEXT };

export const validEmail = (raw: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((raw || '').trim());

/** Nomor telepon internasional: 7–15 digit setelah tanda baca dibuang, hanya angka, spasi, (), +, ., -. */
export function validPhone(raw: string): boolean {
  const value = (raw || '').trim();
  if (!value || /[^\d\s()+.-]/.test(value) || value.indexOf('+') > 0) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Pesan galat per isian (kosong = valid), teksnya dari CMS. `interests` = pilihan keperluan yang tersedia (wajib dipilih
 * bila ada). Kantor tujuan tidak pernah galat: nilai yang tidak ada di daftar kantor dibuang saat pesan disusun.
 */
export function validateEnquiry(form: EnquiryForm, options: { interests: string[] }, t: EnquiryText = DEFAULT_ENQUIRY_TEXT): EnquiryErrors {
  const errors: EnquiryErrors = {};
  if (form.name.trim().length < 2) errors.name = t.error_name;
  if (!validEmail(form.email)) errors.email = t.error_email;
  if (form.phone.trim() && !validPhone(form.phone)) errors.phone = t.error_phone;
  if (options.interests.length > 0 && !options.interests.includes(form.interest)) errors.interest = t.error_interest;
  if (form.message.trim().length < 10) errors.message = t.error_message;
  return errors;
}

/** Urutan isian untuk fokus ke galat pertama. */
export const ENQUIRY_ORDER: (keyof EnquiryForm)[] = ['name', 'email', 'phone', 'interest', 'office', 'message'];

/**
 * Isi pesan enquiry: salam pembuka, satu baris "Label: isi" per isian (label = label isian di formulir; isian opsional
 * yang kosong tidak ikut), lalu penutup. Salam/penutup kosong di CMS → baris itu tidak ada.
 */
export function enquiryMessage(t: EnquiryText, form: EnquiryForm): string {
  const row = (label: string, value: string) => (value ? `${label}: ${value}` : '');
  return [
    t.greeting,
    row(t.label_name, form.name.trim()),
    row(t.label_email, form.email.trim()),
    row(t.label_phone, form.phone.trim()),
    row(t.label_interest, form.interest),
    row(t.label_office, form.office),
    row(t.label_message, form.message.trim().replace(/\s+/g, ' ')),
    t.closing,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Subjek email enquiry: "<subjek CMS>: <keperluan> – <nama>" (bagian kosong dilewati). */
export const enquirySubject = (t: EnquiryText, form: EnquiryForm): string =>
  [[t.subject, form.interest].filter(Boolean).join(': '), form.name.trim()].filter(Boolean).join(' – ');

/** mailto: dengan subjek & isi; email perusahaan tidak valid → "". */
export function enquiryMailto(email: string, subject: string, body: string): string {
  const base = mailHref(email);
  return base ? `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : '';
}

// ─── Pil berfoto di hero ──────────────────────────────────────────────────────

/** Tautan yang benar-benar video (YouTube, Vimeo, Loom, Wistia, Dailymotion, TikTok, video Facebook, atau file video). */
export function isVideoUrl(href: string): boolean {
  const value = (href || '').trim().toLowerCase();
  const file = /\.(mp4|webm|mov|m4v)([?#]|$)/.test(value);
  if (value.startsWith('/') && !value.startsWith('//')) return file;
  if (!/^https?:\/\//.test(value)) return false;
  if (/^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtu\.be|youtube-nocookie\.com|vimeo\.com|loom\.com|wistia\.com|wistia\.net|dailymotion\.com|dai\.ly|tiktok\.com|fb\.watch)\//.test(value)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)*facebook\.com\/.*\/videos?\//.test(value)) return true;
  return file;
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

export interface Office {
  city: string;
  label: string;
  address: string;
  phone: string;
}

/** Kantor yang tampil (berkota atau beralamat). */
export const officesOf = (contact: SectionContent): Office[] =>
  list(contact, 'offices', 6)
    .map((item) => ({ city: field(item, 'city'), label: field(item, 'label'), address: field(item, 'address'), phone: field(item, 'phone') }))
    .filter((o) => o.city || o.address);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readAltura(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');

  const companyName = text(brand, 'company_name') || 'Company Name';
  const whatsapp = text(contact, 'whatsapp');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  /** Section tampil & berisi di halaman (sectionShown). */
  const shown = (key: string): boolean => sectionShown(content, key);
  /** Item yang dirender untuk section `key` (sectionItems). */
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  const contactAction = sectionAction('contact');
  /** Tujuan "hubungi": section Kontak, kalau tidak WhatsApp, kalau tidak null (tombol disembunyikan). */
  const startAction: LinkAction | null = contactAction ?? waAction;
  /**
   * Isi field URL: "#portfolio", "#kontak", "#projects" dsb. hanya bila section itu tampil (anchor dikenal diterjemahkan
   * ke kunci section); anchor tak dikenal / section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };

  const phone = text(contact, 'phone');
  const email = text(contact, 'email');
  const enquiry = section('enquiry');
  const watchAction = linkOr(text(hero, 'watch_url'), sectionAction('developments') ?? sectionAction('portfolio'));

  return {
    brand,
    hero,
    about: section('about'),
    pillars: section('pillars'),
    amenities: section('amenities'),
    stats: section('stats'),
    difference: section('difference'),
    developments: section('developments'),
    portfolio: section('portfolio'),
    leadership: section('leadership'),
    awards: section('awards'),
    testimonials: section('testimonials'),
    insights: section('insights'),
    cta: section('cta'),
    contact,
    enquiry,
    /** Teks formulir enquiry (cadangan Inggris untuk teks wajib yang dikosongkan) */
    enquiryText: readEnquiryText(enquiry),
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: alturaVars(text(brand, 'accent_color')),
    /** data-tpl-tone untuk bidang berwarna tema: "inverse" (cincin fokus putih) hanya bila teksnya putih */
    accentTone: accentIsDark(text(brand, 'accent_color')) ? ('inverse' as const) : undefined,
    phone,
    email,
    whatsapp,
    waAction,
    contactAction,
    startAction,
    shown,
    items,
    sectionAction,
    linkOr,
    /** Tombol di menu atas: tautan sendiri, kalau kosong ke Kontak (atau WhatsApp) */
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), startAction),
    /** Tombol hero: tautan sendiri, kalau kosong ke Pilar, Proyek, atau Kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), sectionAction('pillars') ?? sectionAction('developments') ?? startAction),
    /** Pil berfoto hero: tautan sendiri (mis. YouTube), kalau kosong ke Proyek atau Portofolio */
    watchAction,
    /** Ikon play hanya bila pil benar-benar membuka video; selain itu ikon panah (tidak menjanjikan film) */
    watchIsVideo: watchAction?.kind === 'external' && isVideoUrl(watchAction.href),
    nav: navItems(content),
    socials: socialLinks(footer),
    offices: officesOf(contact),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query')),
    year: new Date().getFullYear(),
  };
}

export type AlturaModel = ReturnType<typeof readAltura>;
