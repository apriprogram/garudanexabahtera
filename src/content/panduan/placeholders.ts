// Token data di isi artikel panduan. Harga, nama dan jumlah template Garuda Nexa TIDAK ditulis di Markdown
// (rencana §5.8, aturan "harga dari data"): artikel menulis token, lalu halaman menggantinya dengan data template saat
// render (data preload saat prerender & hidrasi, lalu data API terbaru).
//
// Bentuk: {{nama}}, {{nama:argumen}}, atau dengan teks cadangan bila datanya tidak ada: {{nama|teks cadangan}}.
//   {{harga_template_rentang}}  "Rp990.000–Rp1.790.000" (satu harga bila semuanya sama)
//   {{harga_template_min}}      "Rp990.000"
//   {{jumlah_template}}         "5"
//   {{tanggal_harga}}           "23 Oktober 2026" (tanggal data harga)
//   {{template:aura-studio}}    nama template ("Aura Studio"); cadangan bawaan: slug dijadikan judul
//   {{harga:aura-studio}}       harga template itu ("Rp1.390.000")
// Modul murni (tanpa React).
import { formatDateId, formatPriceFull, formatPriceRange, isPrice } from '../../seo/format';
import type { Template } from '../../types/platform';

export interface PlaceholderContext {
  /** Template terbit (urutan API). */
  templates: readonly Template[];
  /** YYYY-MM-DD tanggal data harga. */
  priceDate: string;
}

export const PLACEHOLDER_NAMES = ['harga_template_rentang', 'harga_template_min', 'jumlah_template', 'tanggal_harga', 'template', 'harga'] as const;
type PlaceholderName = (typeof PLACEHOLDER_NAMES)[number];

/** Token yang butuh argumen slug. */
const WITH_ARGUMENT: ReadonlySet<PlaceholderName> = new Set(['template', 'harga']);

const TOKEN = /\{\{\s*([a-z_]+)(?::([a-z0-9-]+))?\s*(?:\|([^}]*))?\}\}/g;

export interface PlaceholderToken {
  raw: string;
  name: string;
  argument?: string;
  fallback?: string;
}

/** Semua token di teks (untuk validasi). */
export function placeholderTokens(text: string): PlaceholderToken[] {
  return [...text.matchAll(TOKEN)].map((m) => ({ raw: m[0], name: m[1], argument: m[2], fallback: m[3]?.trim() }));
}

/** Masalah token (nama tidak dikenal, argumen kurang/lebih, kurung kurawal yang tidak lengkap), atau [] bila sah. */
export function placeholderProblems(text: string): string[] {
  const problems: string[] = [];
  for (const token of placeholderTokens(text)) {
    const name = token.name as PlaceholderName;
    if (!(PLACEHOLDER_NAMES as readonly string[]).includes(name)) problems.push(`token tidak dikenal: ${token.raw}`);
    else if (WITH_ARGUMENT.has(name) !== Boolean(token.argument)) problems.push(`argumen token salah: ${token.raw}`);
  }
  const leftover = text.replace(TOKEN, '');
  if (/\{\{|\}\}/.test(leftover)) problems.push('ada "{{" atau "}}" yang bukan token yang sah');
  return problems;
}

/** "aura-studio" → "Aura Studio" (cadangan nama bila template tidak ada di data). */
const titleFromSlug = (slug: string): string => slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const DEFAULT_FALLBACK = 'sesuai harga di halaman Harga';

function resolveToken(token: PlaceholderToken, ctx: PlaceholderContext): string {
  const prices = ctx.templates.map((t) => t.price).filter(isPrice);
  const template = token.argument ? ctx.templates.find((t) => t.slug === token.argument) : undefined;
  switch (token.name as PlaceholderName) {
    case 'harga_template_rentang':
      return formatPriceRange(prices) ?? token.fallback ?? DEFAULT_FALLBACK;
    case 'harga_template_min':
      return prices.length ? formatPriceFull(Math.min(...prices)) : (token.fallback ?? DEFAULT_FALLBACK);
    case 'jumlah_template':
      return ctx.templates.length ? String(ctx.templates.length) : (token.fallback ?? 'beberapa');
    case 'tanggal_harga':
      return formatDateId(ctx.priceDate);
    case 'template':
      return template?.name?.trim() || token.fallback || titleFromSlug(token.argument ?? '');
    case 'harga':
      return template && isPrice(template.price) ? formatPriceFull(template.price) : (token.fallback ?? DEFAULT_FALLBACK);
    default:
      // Token tidak dikenal: tidak pernah tampil mentah (tes artikel menolaknya lebih dulu)
      return token.fallback ?? '';
  }
}

/** Ganti semua token di teks dengan data. */
export function resolvePlaceholders(text: string, ctx: PlaceholderContext): string {
  return text.replace(TOKEN, (raw, name: string, argument?: string, fallback?: string) =>
    resolveToken({ raw, name, argument, fallback: fallback?.trim() }, ctx),
  );
}
