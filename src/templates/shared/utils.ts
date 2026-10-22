// Helper murni untuk renderer template situs pembeli. Semua fungsi tahan terhadap konten aneh
// (null, angka, string di tempat list, URL berbahaya) karena konten berasal dari pengguna.
import type { CSSProperties } from 'react';
import type { ListItem, SectionContent, SiteContent } from '../types';

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Ambil satu section; bukan objek → objek kosong. */
export function getSection(content: SiteContent | null | undefined, key: string): SectionContent {
  const value = isPlainObject(content) ? (content as Record<string, unknown>)[key] : undefined;
  return isPlainObject(value) ? (value as SectionContent) : {};
}

/** Section tampil kecuali `enabled` bernilai false ("false", 0, "0" juga dianggap false). */
export function isEnabled(section: SectionContent | null | undefined): boolean {
  const value = (section as Record<string, unknown> | null | undefined)?.enabled;
  return !(value === false || value === 'false' || value === 0 || value === '0');
}

/** Nilai teks yang sudah di-trim; selain string/angka → "". */
export function text(section: SectionContent | null | undefined, key: string): string {
  const value = (section as Record<string, unknown> | null | undefined)?.[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/** Ubah satu item list mentah jadi Record<string, string> (nilai non-teks dibuang). */
export function toListItem(raw: unknown): ListItem | null {
  if (!isPlainObject(raw)) return null;
  const item: ListItem = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') item[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) item[key] = String(value);
  }
  return item;
}

/** Item list yang valid dan tidak kosong semua; string/null di tempat list → []. */
export function list(section: SectionContent | null | undefined, key: string, max = 24): ListItem[] {
  const value = (section as Record<string, unknown> | null | undefined)?.[key];
  if (!Array.isArray(value)) return [];
  const items: ListItem[] = [];
  for (const raw of value) {
    const item = toListItem(raw);
    if (item && Object.values(item).some((v) => v.trim() !== '')) items.push(item);
    if (items.length >= max) break;
  }
  return items;
}

/** Nilai field di satu item list (trim). */
export const field = (item: ListItem | null | undefined, key: string): string =>
  typeof item?.[key] === 'string' ? item[key].trim() : '';

/** Paragraf dari textarea (dipisah baris kosong). */
export const paragraphs = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Pecah judul jadi [sebelum, sorotan, sesudah] bila `highlight` ada di dalam judul. */
export function splitHighlight(title: string, highlight: string): [string, string, string] | null {
  if (!title || !highlight) return null;
  const index = title.toLowerCase().indexOf(highlight.toLowerCase());
  if (index < 0) return null;
  return [title.slice(0, index), title.slice(index, index + highlight.length), title.slice(index + highlight.length)];
}

/** Inisial maksimal 2 huruf untuk monogram/avatar. */
export function initials(name: string, fallback = 'A'): string {
  const words = name
    .replace(/^(pt|cv|ud|pd|tbk)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] || '').slice(0, 2);
  return (letters || fallback).toUpperCase();
}

// ─── URL ──────────────────────────────────────────────────────────────────────

/**
 * Tautan aman: http(s), mailto:, tel:, path relatif "/...". Domain tanpa skema (mis. "instagram.com/x") diberi https://.
 * Skema lain (javascript:, data:, dll.) → null.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value.replace(/\s/g, '%20');
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null; // skema lain ditolak
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(value)) return `https://${value}`;
  return null;
}

/** Sumber gambar aman: http(s), data:image, blob:, atau path aset ("assets/..." → "/assets/..."). */
export function safeImage(raw: string | null | undefined): string {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/i.test(value)) return value;
  if (/^blob:/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^[\w-]+(\/[\w.@%-]+)+\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(value)) return `/${value}`;
  return '';
}

/** Ada gambar yang bisa ditampilkan? (dipakai template untuk menyembunyikan slot foto yang kosong) */
export const hasImage = (raw: string | null | undefined): boolean => safeImage(raw) !== '';

/** Nomor WhatsApp → https://wa.me/62xxx (0xxx dan 8xxx diubah ke 62xxx). Tidak valid → "". */
export function whatsappHref(raw: string, message?: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  if (digits.length < 9 || digits.length > 15) return '';
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Nomor telepon → tel:+62... */
export function telHref(raw: string): string {
  const value = (raw || '').trim();
  let digits = value.replace(/\D/g, '');
  if (digits.length < 5) return '';
  if (value.startsWith('+')) return `tel:+${digits}`;
  if (digits.startsWith('0') && digits.length >= 9) digits = `62${digits.slice(1)}`;
  return digits.startsWith('62') ? `tel:+${digits}` : `tel:${digits}`;
}

export const mailHref = (raw: string): string => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((raw || '').trim()) ? `mailto:${raw.trim()}` : '');

/**
 * Google Maps: URL embed dipakai langsung; kode `<iframe src="...">` diambil src-nya; link biasa (maps.app.goo.gl, dsb.)
 * tidak bisa di-embed, jadi peta dibuat dari alamat dan link asli dipakai untuk tombol "Buka di Google Maps".
 */
export function mapsInfo(rawUrl: string, address: string): { embed: string | null; link: string | null } {
  let raw = (rawUrl || '').trim();
  const iframeSrc = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(raw);
  if (iframeSrc) raw = iframeSrc[1].replace(/&amp;/g, '&');
  const url = safeUrl(raw);
  const isGoogle = !!url && /^https:\/\/(www\.|maps\.)?google\.[a-z.]+\/maps/i.test(url);
  const isEmbed = isGoogle && (/\/maps\/embed/i.test(url!) || /[?&]output=embed/i.test(url!));
  const fromAddress = address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed` : null;
  const addressLink = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  if (isEmbed) return { embed: url, link: addressLink };
  return { embed: fromAddress, link: url && /^https?:/i.test(url) ? url : addressLink };
}

// ─── Warna aksen ──────────────────────────────────────────────────────────────

type Rgb = [number, number, number];

export function parseHex(raw: string | null | undefined): Rgb | null {
  let value = (raw || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(value)) value = value.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as Rgb;
}

const toHex = (rgb: Rgb) => `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amountOfA: number): Rgb => a.map((c, i) => c * amountOfA + b[i] * (1 - amountOfA)) as Rgb;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const INK: Rgb = [18, 22, 32]; // neutral-900

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: Rgb, b: Rgb) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/**
 * Variabel CSS warna aksen untuk root template. Warna tidak valid → `fallback`.
 * --tpl-accent (tombol/latar), --tpl-on-accent (teks di atas aksen), --tpl-accent-ink (teks aksen di latar putih,
 * digelapkan otomatis sampai kontras ≥ 4.5), --tpl-accent-hover, dan tint lembut 50/100/200.
 */
export function accentVars(color: string, fallback: string): CSSProperties {
  const accent = parseHex(color) ?? parseHex(fallback) ?? ([33, 31, 254] as Rgb);
  let ink = accent;
  for (let i = 0; i < 12 && contrast(ink, WHITE) < 4.5; i += 1) ink = mix(ink, BLACK, 0.88);
  const on = contrast(accent, WHITE) >= contrast(accent, INK) ? WHITE : INK;
  const hover = luminance(accent) < 0.04 ? mix(accent, WHITE, 0.82) : mix(accent, BLACK, 0.86);
  return {
    '--tpl-accent': toHex(accent),
    '--tpl-on-accent': toHex(on),
    '--tpl-accent-ink': toHex(ink),
    '--tpl-accent-hover': toHex(hover),
    '--tpl-accent-50': toHex(mix(accent, WHITE, 0.07)),
    '--tpl-accent-100': toHex(mix(accent, WHITE, 0.14)),
    '--tpl-accent-200': toHex(mix(accent, WHITE, 0.3)),
    '--tpl-accent-300': toHex(mix(accent, WHITE, 0.5)),
  } as CSSProperties;
}

// ─── Navigasi antar section ───────────────────────────────────────────────────

/** Anchor berbahasa Indonesia per section (dipakai di id & tautan "#kontak"). */
export const SECTION_ANCHOR: Record<string, string> = {
  hero: 'beranda',
  clients: 'klien',
  about: 'tentang',
  services: 'layanan',
  advantages: 'keunggulan',
  gallery: 'galeri',
  testimonials: 'testimoni',
  cta: 'ajakan',
  contact: 'kontak',
  footer: 'footer',
};

const ANCHOR_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_ANCHOR).map(([key, anchor]) => [anchor, key]),
);

/** "#kontak" / "kontak" / "contact" → "contact". */
export const sectionFromAnchor = (value: string): string => {
  const clean = value.replace(/^#/, '').trim().toLowerCase();
  return ANCHOR_TO_SECTION[clean] ?? clean;
};

export type LinkAction = { kind: 'section'; target: string } | { kind: 'external'; href: string };

/** Isi field URL dari CMS → aksi. Kosong / tidak valid → `fallback`. "#kontak" → gulir ke section. */
export function resolveAction(raw: string, fallback: LinkAction | null): LinkAction | null {
  const value = (raw || '').trim();
  if (!value) return fallback;
  if (value.startsWith('#')) return { kind: 'section', target: sectionFromAnchor(value) };
  const href = safeUrl(value);
  return href ? { kind: 'external', href } : fallback;
}

export const isExternalHref = (href: string) => /^https?:\/\//i.test(href);
