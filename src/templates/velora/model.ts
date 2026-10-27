// Turunan konten Velora (fungsi murni, diuji di __tests__/velora.test.tsx): warna dari SATU aksen (merah bawaan), menu,
// tujuan tautan, section yang tampil, filter model, tanggal (nama bulan dari CMS), formulir test drive (validasi + pesan
// WhatsApp/email), newsletter (mailto), media sosial, dan peta. Semua tahan konten mentah (null, angka, list rusak).
// Formulir hanya MENYUSUN pesan: tidak ada data yang dikirim ke server atau disimpan.
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
import { VELORA_ACCENT, veloraContent } from './defaultContent';

// ─── Warna ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Putih tulang (latar terang) & hampir hitam / grafit (latar gelap) */
const BONE: Rgb = [244, 244, 242];
const NIGHT: Rgb = [13, 14, 16];
const GRAPHITE: Rgb = [27, 29, 33];
/** Tinta gelap untuk teks di atas aksen terang */
const INK: Rgb = NIGHT;
const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
/** Campuran dibulatkan: kontras dihitung dari warna yang benar-benar ditulis sebagai hex. */
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => Math.round(c * amountOfA + b[i] * (1 - amountOfA))) as Rgb;

/**
 * Variabel warna lokal Velora (di samping --tpl-accent* milik Shell), semuanya dari SATU warna aksen:
 * --vl-red: aksen apa adanya (titik, garis, chip panah berikon); --vl-on-red: ikon/teks di atasnya (putih atau tinta);
 * --vl-fill: bidang tombol berteks (aksen digelapkan sampai teks putih ≥ 4,6:1; aksen terang → apa adanya + teks tinta)
 * dengan --vl-on-fill; --vl-ink: teks aksen di putih tulang & putih (≥ 4,6:1); --vl-bright: teks aksen di hampir hitam &
 * grafit (≥ 4,6:1).
 */
export function veloraVars(accentRaw: string): CSSProperties {
  const accent = parseHex(accentRaw) ?? (parseHex(VELORA_ACCENT) as Rgb);
  // Teks putih bila aksen cukup gelap (≥ 3:1 dengan putih; bidang tombol digelapkan sedikit sampai ≥ 4,6:1), aksen terang
  // (kuning, hijau muda, oranye muda) memakai teks tinta
  const darkAccent = accentIsDark(accentRaw);
  let fill = accent;
  if (darkAccent) for (let i = 0; i < 24 && contrast(fill, WHITE) < 4.6; i += 1) fill = mix(fill, BLACK, 0.92);
  let ink = accent;
  for (let i = 0; i < 30 && (contrast(ink, BONE) < 4.6 || contrast(ink, WHITE) < 4.6); i += 1) ink = mix(ink, BLACK, 0.9);
  let bright = accent;
  for (let i = 0; i < 30 && (contrast(bright, NIGHT) < 4.6 || contrast(bright, GRAPHITE) < 4.6); i += 1) bright = mix(bright, WHITE, 0.88);
  return {
    '--vl-red': toHex(accent),
    '--vl-on-red': toHex(darkAccent ? WHITE : INK),
    '--vl-fill': toHex(fill),
    '--vl-on-fill': toHex(darkAccent ? WHITE : INK),
    '--vl-fill-hover': toHex(darkAccent ? mix(fill, BLACK, 0.86) : mix(fill, BLACK, 0.9)),
    '--vl-ink': toHex(ink),
    '--vl-bright': toHex(bright),
  } as CSSProperties;
}

/** true bila teks/ikon di atas aksen berwarna putih (aksen ≥ 3:1 dengan putih); aksen terang memakai tinta. */
export function accentIsDark(accentRaw: string): boolean {
  const accent = parseHex(accentRaw) ?? (parseHex(VELORA_ACCENT) as Rgb);
  return contrast(accent, WHITE) >= 3;
}

// ─── Section & menu ───────────────────────────────────────────────────────────

/** Kunci section yang punya tempat di halaman (urutan halaman; = section skema tanpa `brand`). */
export const PAGE_SECTIONS = [
  'hero',
  'philosophy',
  'bento',
  'lineup',
  'how',
  'engineering',
  'stats',
  'testimonials',
  'newsroom',
  'cta',
  'contact',
  'footer',
] as const;
const KNOWN_SECTIONS = new Set<string>(PAGE_SECTIONS);

/** Anchor yang wajar diketik pembeli → kunci section (anchor bersama #kontak, #testimoni, #ajakan sudah dikenal). */
const ANCHOR_ALIASES: Record<string, string> = {
  company: 'philosophy',
  about: 'philosophy',
  tentang: 'philosophy',
  filosofi: 'philosophy',
  models: 'lineup',
  model: 'lineup',
  ownership: 'how',
  steps: 'how',
  technology: 'engineering',
  teknologi: 'engineering',
  numbers: 'stats',
  angka: 'stats',
  news: 'newsroom',
  berita: 'newsroom',
  'test-drive': 'cta',
  testdrive: 'cta',
  booking: 'cta',
  dealers: 'contact',
  dealer: 'contact',
  studios: 'contact',
};

/** Target tautan section ("#lineup", "kontak", "models") → kunci section di halaman, atau null bila tidak dikenal. */
export function sectionTarget(target: string): string | null {
  const clean = sectionFromAnchor(target);
  const key = ANCHOR_ALIASES[clean] ?? clean;
  return KNOWN_SECTIONS.has(key) ? key : null;
}

/**
 * Item `items`/`rows`/… yang benar-benar dirender per section (maks. = skema, syarat = komponen). Satu sumber untuk
 * komponen, menu, dan tujuan tautan, agar section kosong tidak meninggalkan tautan mati.
 */
const ITEMS: Record<string, [key: string, max: number, keep: (item: ListItem) => boolean]> = {
  lineup: ['items', 8, (i) => !!field(i, 'name')],
  engineering: ['items', 6, (i) => !!field(i, 'title')],
  stats: ['items', 4, (i) => !!(field(i, 'value') || field(i, 'label'))],
  testimonials: ['items', 10, (i) => !!field(i, 'quote')],
  newsroom: ['items', 6, (i) => !!field(i, 'title')],
};

export function sectionItems(key: string, section: SectionContent): ListItem[] {
  const rule = ITEMS[key];
  return rule ? list(section, rule[0], rule[1]).filter(rule[2]) : [];
}

export const bentoCards = (bento: SectionContent): ListItem[] => list(bento, 'items', 3).filter((i) => hasImage(field(i, 'image')));
export const bentoRows = (bento: SectionContent): ListItem[] => list(bento, 'rows', 4).filter((i) => !!field(i, 'title'));
export const howSteps = (how: SectionContent): ListItem[] => list(how, 'steps', 4).filter((i) => !!field(i, 'title'));
export const philosophyPoints = (s: SectionContent): ListItem[] => list(s, 'points', 4).filter((i) => !!field(i, 'title'));
export const contactOffices = (s: SectionContent): ListItem[] => list(s, 'offices', 8).filter((i) => !!field(i, 'city'));

/** Section tampil dan berisi? Kunci tak dikenal (mis. salah ketik di field URL) → false. */
export function sectionShown(content: SiteContent, key: string): boolean {
  if (!KNOWN_SECTIONS.has(key)) return false;
  const s = getSection(content, key);
  if (!isEnabled(s)) return false;
  if (key in ITEMS) return sectionItems(key, s).length > 0;
  if (key === 'bento') return bentoCards(s).length + bentoRows(s).length > 0;
  if (key === 'philosophy') return !!(text(s, 'title') || text(s, 'subtitle') || philosophyPoints(s).length);
  if (key === 'how') return !!(text(s, 'title') || howSteps(s).length);
  return true;
}

export interface NavItem {
  key: string;
  label: string;
}

/** Section di menu. `pill` = juga tampil di pil putih layar lebar (maks. 5). Nama menu SELALU dari CMS (lihat menuLabel). */
const NAV: { key: string; pill: boolean }[] = [
  { key: 'lineup', pill: true },
  { key: 'how', pill: true },
  { key: 'engineering', pill: true },
  { key: 'philosophy', pill: true },
  { key: 'newsroom', pill: true },
  { key: 'testimonials', pill: false },
  { key: 'cta', pill: false },
  { key: 'contact', pill: false },
];

/**
 * Nama di menu = label kecil section (CMS), kalau kosong judulnya (dipotong rapi bila panjang). Tanpa label & judul →
 * section tidak masuk menu (tidak ada teks bawaan yang tidak bisa diubah pembeli).
 */
export function menuLabel(section: SectionContent): string {
  const raw = text(section, 'eyebrow') || text(section, 'title');
  if (raw.length <= 28) return raw;
  const cut = raw.slice(0, 27);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 12)).trimEnd()}…`;
}

/** Item menu untuk section yang tampil: `pill` (layar lebar, maks. 5) dan `all` (panel menu, urutan halaman). */
export function navItems(content: SiteContent): { pill: NavItem[]; all: NavItem[] } {
  const shown = NAV.filter(({ key }) => sectionShown(content, key))
    .map((item) => ({ ...item, label: menuLabel(getSection(content, item.key)) }))
    .filter((item) => item.label);
  const order = (key: string) => PAGE_SECTIONS.indexOf(key as (typeof PAGE_SECTIONS)[number]);
  return {
    pill: shown.filter((item) => item.pill).map(({ key, label }) => ({ key, label })),
    all: [...shown].sort((a, b) => order(a.key) - order(b.key)).map(({ key, label }) => ({ key, label })),
  };
}

/** Lebar minimum logo di header (simbol + nama, boleh terpotong sampai sini) selama pil menu tampil di tengah. */
export const LOGO_MIN = 200;

/**
 * Pil menu layar lebar muat di header? Pil ada di TENGAH, jadi kiri & kanan butuh ruang yang sama: aksi kanan (lebar
 * alaminya) dan logo (lebar alami, maks. LOGO_MIN), masing-masing + jarak grid. Tidak muat → header hanya memakai tombol
 * menu bulat (label menu CMS yang panjang, mis. bahasa Indonesia, tidak lagi menabrak pil "Find a dealer"). Ukuran 0
 * (belum diukur / tersembunyi) → dianggap muat.
 */
export function pillNavFits({ row, nav, logo, actions, gap = 12 }: { row: number; nav: number; logo: number; actions: number; gap?: number }): boolean {
  if (!row || !nav) return true;
  return nav + 2 * (Math.max(actions, Math.min(logo, LOGO_MIN)) + gap) <= row;
}

/** Kartu model → formulir test drive: nama model yang dipilih (+ penghitung agar klik ulang model yang sama tetap terbaca). */
export interface DrivePick {
  name: string;
  n: number;
}

// ─── Model & filter ───────────────────────────────────────────────────────────

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Kategori satu model ("SUV, Electric" → ["SUV", "Electric"]), tanpa kosong. */
export const modelCategories = (item: ListItem): string[] =>
  field(item, 'category')
    .split(/[,/|]/)
    .map((c) => c.trim())
    .filter(Boolean);

/** Tombol filter: kategori unik urut kemunculan (tanpa beda huruf besar/aksen), maks. 6. */
export function lineupFilters(items: ListItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    for (const category of modelCategories(item)) {
      const key = normalize(category);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(category);
    }
  }
  return result.slice(0, 6);
}

/** Model untuk filter aktif (null → semua; kategori yang tidak dimiliki model mana pun → semua). */
export function filterModels(items: ListItem[], category: string | null): ListItem[] {
  if (!category) return items;
  const wanted = normalize(category);
  const matches = items.filter((item) => modelCategories(item).some((c) => normalize(c) === wanted));
  return matches.length > 0 ? matches : items;
}

// ─── Tanggal ──────────────────────────────────────────────────────────────────

/** "Jan, Feb, …" dari CMS → 12 nama bulan; kosong atau jumlahnya bukan 12 → `fallback`. */
export function monthNames(raw: unknown, fallback?: string[]): string[] {
  const names = (typeof raw === 'string' ? raw : '')
    .split(/[,;]/)
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length === 12 ? names : (fallback ?? DEFAULT_MONTHS);
}

/** Nama bulan bawaan (demo, Inggris) dari defaultContent: brand.month_names. */
const DEFAULT_MONTHS = monthNames(veloraContent.brand.month_names, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

export interface EnDate {
  iso: string;
  /** "14 Oct 2026" (nama bulan dari CMS, mis. "14 Okt 2026") */
  label: string;
}

/** Tanggal ISO "YYYY-MM-DD" (tanggal kalender valid) → { iso, label } dengan nama bulan `months`; selain itu null. */
export function parseIsoDate(raw: string | null | undefined, months: string[] = DEFAULT_MONTHS): EnDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { iso: match[0], label: `${d} ${months[m - 1] ?? DEFAULT_MONTHS[m - 1]} ${y}` };
}

/** Hari ini "YYYY-MM-DD" (waktu lokal pengunjung). */
export const todayIso = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// ─── Formulir test drive ──────────────────────────────────────────────────────

export interface DriveForm {
  name: string;
  email: string;
  phone: string;
  model: string;
  studio: string;
  date: string;
  note: string;
}

export type DriveErrors = Partial<Record<keyof DriveForm, string>>;

export const EMPTY_DRIVE: DriveForm = { name: '', email: '', phone: '', model: '', studio: '', date: '', note: '' };

export const validEmail = (raw: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((raw || '').trim());

/** Nomor telepon internasional: hanya angka & tanda baca umum, 7–15 digit (boleh diawali +). */
export function validPhone(raw: string): boolean {
  const value = (raw || '').trim();
  if (/[^\d\s()+.-]/.test(value) || value.indexOf('+') > 0) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Semua teks formulir test drive dari CMS (section `cta`): label isian, pilihan awal, penanda opsional, pesan galat,
 * teks setelah diisi, dan kalimat pesan. Isian yang DIKOSONGKAN pembeli memakai teks demo (Inggris) dari defaultContent
 * agar formulir tetap terbaca; catatan, teks "Prefer to talk?", penanda opsional, dan penutup pesan boleh kosong (hilang).
 */
export function driveCopy(cta: SectionContent) {
  const or = (key: string) => text(cta, key) || String(veloraContent.cta[key] ?? '');
  return {
    title: text(cta, 'form_title'),
    button: or('form_button'),
    labels: {
      name: or('label_name'),
      email: or('label_email'),
      phone: or('label_phone'),
      model: or('label_model'),
      studio: or('label_studio'),
      date: or('label_date'),
      note: or('label_note'),
    } satisfies Record<keyof DriveForm, string>,
    modelPrompt: or('model_prompt'),
    studioPrompt: or('studio_prompt'),
    optional: text(cta, 'optional_label'),
    note: text(cta, 'form_note'),
    errors: {
      name: or('error_name'),
      email: or('error_email'),
      phone: or('error_phone'),
      model: or('error_model'),
      date: or('error_date'),
    },
    readyTitle: or('ready_title'),
    readyText: text(cta, 'ready_text'),
    sendWhatsapp: or('send_whatsapp'),
    sendEmail: or('send_email'),
    edit: or('edit_label'),
    intro: or('message_intro'),
    closing: text(cta, 'message_closing'),
    subject: or('email_subject'),
    talk: text(cta, 'talk_label'),
    fallbackText: text(cta, 'fallback_text'),
    fallbackButton: or('fallback_button'),
  };
}

export type DriveCopy = ReturnType<typeof driveCopy>;

/** Teks bawaan (demo) formulir: dipakai fungsi murni & uji bila salinan CMS tidak diberikan. */
const DEFAULT_DRIVE_COPY = driveCopy(veloraContent.cta);

/** Pesan galat per isian (kosong = valid). `models` = pilihan model (wajib dipilih bila ada). Teks galat dari CMS. */
export function validateDrive(form: DriveForm, options: { models: string[]; today?: string; messages?: DriveCopy['errors'] }): DriveErrors {
  const errors: DriveErrors = {};
  const today = options.today ?? todayIso();
  const say = options.messages ?? DEFAULT_DRIVE_COPY.errors;
  if (form.name.trim().length < 2) errors.name = say.name;
  if (!validEmail(form.email)) errors.email = say.email;
  if (form.phone.trim() && !validPhone(form.phone)) errors.phone = say.phone;
  if (options.models.length > 0 && !options.models.includes(form.model)) errors.model = say.model;
  if (form.date.trim()) {
    const date = parseIsoDate(form.date);
    if (!date || date.iso < today) errors.date = say.date;
  }
  return errors;
}

/** "{company}" / "{email}" di salinan CMS → nilainya. */
export const fillTokens = (template: string, values: { company?: string; email?: string }): string =>
  template.replace(/\{company\}/gi, values.company ?? '').replace(/\{email\}/gi, values.email ?? '');

/**
 * Isi pesan permintaan test drive: kalimat pembuka (CMS), satu baris per isian dengan label isian formulir (isian opsional
 * yang kosong tidak ikut; tanggal dengan nama bulan CMS), lalu kalimat penutup (CMS, boleh kosong).
 */
export function driveMessage(company: string, form: DriveForm, copy: DriveCopy = DEFAULT_DRIVE_COPY, months: string[] = DEFAULT_MONTHS): string {
  const date = parseIsoDate(form.date, months);
  const { labels } = copy;
  const rows = [
    `${labels.name}: ${form.name.trim()}`,
    `${labels.email}: ${form.email.trim()}`,
    form.phone.trim() && `${labels.phone}: ${form.phone.trim()}`,
    form.model && `${labels.model}: ${form.model}`,
    form.studio && `${labels.studio}: ${form.studio}`,
    date && `${labels.date}: ${date.label}`,
    form.note.trim() && `${labels.note}: ${form.note.trim().replace(/\s+/g, ' ')}`,
  ].filter(Boolean);
  return [fillTokens(copy.intro, { company }).trim(), ...rows, copy.closing.trim()].filter(Boolean).join('\n');
}

/** mailto: dengan subjek & isi; email tidak valid → "". */
export function mailtoHref(to: string, subject: string, body: string): string {
  const base = mailHref(to);
  return base ? `${base}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : '';
}

/** Teks newsletter dari CMS (section `footer`); isian kosong → teks demo agar formulir tetap terbaca. */
export function newsletterCopy(footer: SectionContent) {
  const or = (key: string) => text(footer, key) || String(veloraContent.footer[key] ?? '');
  return {
    title: text(footer, 'newsletter_title'),
    intro: text(footer, 'newsletter_text'),
    button: or('newsletter_button'),
    label: or('newsletter_label'),
    note: text(footer, 'newsletter_note'),
    error: or('newsletter_error'),
    readyTitle: or('newsletter_ready_title'),
    readyText: text(footer, 'newsletter_ready_text'),
    open: or('newsletter_open'),
    change: or('newsletter_change'),
    subject: or('newsletter_subject'),
    message: or('newsletter_message'),
  };
}

export type NewsletterCopy = ReturnType<typeof newsletterCopy>;

/** Permintaan berlangganan newsletter (mailto ke alamat penerima); email pengunjung atau penerima tidak valid → "". */
export function newsletterHref(to: string, company: string, visitor: string, copy: NewsletterCopy = newsletterCopy(veloraContent.footer)): string {
  if (!validEmail(visitor)) return '';
  const email = visitor.trim();
  return mailtoHref(to, `${copy.subject} – ${company}`, fillTokens(copy.message, { company, email }));
}

/** Tautan video (YouTube, Vimeo, file video) → kartu sorotan hero menampilkan tombol putar; selain itu ikon panah. */
export function isVideoUrl(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url) return false;
  return (
    /^https?:\/\/(www\.|m\.)?youtube\.com\/(watch\?(.*&)?v=|embed\/|shorts\/|live\/)[\w-]{6,}/i.test(url) ||
    /^https?:\/\/youtu\.be\/[\w-]{6,}/i.test(url) ||
    /^https?:\/\/(www\.|player\.)?vimeo\.com\/(video\/)?\d{5,}/i.test(url) ||
    /^(https?:\/\/|\/)[^?#]+\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)
  );
}

// ─── Lain-lain ────────────────────────────────────────────────────────────────

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export const socialLinks = (footer: SectionContent): SocialLink[] =>
  SOCIAL_FIELDS.map(({ key, label }) => ({ key, label, href: safeUrl(text(footer, key)) ?? '' })).filter((s) => s.href);

// ─── Model ────────────────────────────────────────────────────────────────────

export function readVelora(content: SiteContent) {
  const section = (key: string) => getSection(content, key);
  const brand = section('brand');
  const hero = section('hero');
  const contact = section('contact');
  const footer = section('footer');
  const cta = section('cta');

  const companyName = text(brand, 'company_name') || 'Company name';
  const whatsapp = text(contact, 'whatsapp');
  const email = text(contact, 'email');
  const waLink = whatsappHref(whatsapp, text(contact, 'whatsapp_message'));
  const waAction: LinkAction | null = waLink ? { kind: 'external', href: waLink } : null;

  const shown = (key: string): boolean => sectionShown(content, key);
  const items = (key: string): ListItem[] => sectionItems(key, section(key));
  const sectionAction = (key: string): LinkAction | null => (shown(key) ? { kind: 'section', target: key } : null);
  /**
   * Isi field URL: "#lineup", "#kontak", "#cta" … hanya bila section itu tampil (alias diterjemahkan); anchor tak dikenal /
   * section tersembunyi / kosong → `fallback`.
   */
  const linkOr = (raw: string, fallback: LinkAction | null): LinkAction | null => {
    const action = resolveAction(raw, fallback);
    if (action?.kind !== 'section') return action;
    const target = sectionTarget(action.target);
    if (target === 'hero') return { kind: 'section', target };
    return target && shown(target) ? { kind: 'section', target } : fallback;
  };
  const contactAction = sectionAction('contact') ?? waAction;
  const driveAction = sectionAction('cta') ?? contactAction;
  const accent = text(brand, 'accent_color');

  return {
    brand,
    hero,
    philosophy: section('philosophy'),
    bento: section('bento'),
    lineup: section('lineup'),
    how: section('how'),
    engineering: section('engineering'),
    stats: section('stats'),
    testimonials: section('testimonials'),
    newsroom: section('newsroom'),
    cta,
    contact,
    footer,
    companyName,
    tagline: text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    colors: veloraVars(accent),
    /** data-tpl-tone untuk bidang berwarna aksen: "inverse" (cincin fokus putih) hanya bila teks di atasnya putih */
    accentTone: accentIsDark(accent) ? ('inverse' as const) : undefined,
    whatsapp,
    email,
    waAction,
    contactAction,
    driveAction,
    /** Penerima formulir test drive: isian di section test drive, kalau kosong Kontak */
    driveWhatsapp: text(cta, 'whatsapp') || whatsapp,
    driveEmail: text(cta, 'email') || email,
    /** Penerima newsletter: isian footer, kalau kosong email Kontak */
    newsletterEmail: text(footer, 'newsletter_email') || email,
    shown,
    items,
    sectionAction,
    linkOr,
    /** Tombol hero: tautan sendiri, kalau kosong ke jajaran model, lalu test drive / kontak */
    primaryAction: linkOr(text(hero, 'primary_url'), sectionAction('lineup') ?? driveAction),
    headerLabel: text(hero, 'header_label'),
    headerAction: linkOr(text(hero, 'header_url'), contactAction),
    reviewAction: linkOr(text(hero, 'review_url'), sectionAction('lineup')),
    /** Kartu sorotan hero: tombol putar hanya bila tautannya benar-benar video */
    reviewIsVideo: isVideoUrl(text(hero, 'review_url')),
    /** Teks formulir test drive & newsletter (CMS) */
    drive: driveCopy(cta),
    newsletter: newsletterCopy(footer),
    /** Teks tombol WhatsApp (kartu kantor pusat & kartu test drive) */
    whatsappLabel: text(contact, 'whatsapp_label') || String(veloraContent.contact.whatsapp_label),
    nav: navItems(content),
    /** Nama bulan untuk tanggal berita & pesan test drive (CMS brand.month_names, bawaan Inggris) */
    months: monthNames(text(brand, 'month_names')),
    socials: socialLinks(footer),
    map: mapsInfo(text(contact, 'maps_url'), text(contact, 'maps_query') || text(contact, 'address')),
    year: new Date().getFullYear(),
  };
}

export type VeloraModel = ReturnType<typeof readVelora>;
