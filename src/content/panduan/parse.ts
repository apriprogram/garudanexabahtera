// Pengurai artikel panduan (/panduan/{slug}, docs/platform/SEO-PLAN.md §5.8): frontmatter sederhana tanpa dependensi,
// validasi, dan penolong Markdown (judul H2 untuk daftar isi, hitung kata, tautan). Modul murni (tanpa React, tanpa
// import.meta.glob) untuk bodies.ts (chunk halaman artikel), halaman artikel dan tes. JANGAN diimpor dari bundel utama
// (index.ts, *.seo.ts, beranda): pakai core.ts.
//
// Frontmatter (subset YAML sederhana):
//   ---
//   title: Berapa Biaya Membuat Website Company Profile di 2026?
//   description: Ringkasan satu-dua kalimat untuk meta description.
//   slug: biaya-website-company-profile
//   author: Tim Garuda Nexa
//   datePublished: 2026-11-02
//   dateModified: 2026-11-02
//   reviewed: 2026-11-02
//   cta: template
//   sources:
//     - https://contoh.go.id/data-harga
//   related: [template-vs-jasa-website-custom, website-klinik-kecantikan]
//   ---
// `author` = nama di src/content/authors.ts. `cta` (opsional): template (bawaan) | website | mobile.
// `reviewed` (opsional): tanggal artikel selesai disunting dan dicek faktanya oleh manusia (SEO-PLAN §5.8). Tanpa
// `reviewed` artikel adalah draf: tampil di server dev dan tes, tetapi tidak terbit di build production (halaman,
// daftar /panduan, beranda, sitemap, llms.txt, tautan dari halaman lain).
// Nilai boleh diapit tanda kutip. Daftar: baris "- item" di bawah kuncinya, atau [a, b] dalam satu baris; [] = kosong.
// Baris kosong dan baris komentar (#) diabaikan.
import { ARTICLE_CTAS, type Article, type ArticleCta, type ArticleMeta } from './core';

export * from './core';

export type FrontmatterValue = string | string[];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STRING_KEYS = ['title', 'description', 'slug', 'author', 'datePublished', 'dateModified'] as const;
const LIST_KEYS = ['sources', 'related'] as const;

const unquote = (value: string): string => {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
};

const inlineList = (value: string): string[] =>
  value
    .slice(1, -1)
    .split(',')
    .map(unquote)
    .filter(Boolean);

/**
 * Pisahkan frontmatter dan isi. Tanpa blok `---` di baris pertama → data kosong dan seluruh teks menjadi isi.
 * Melempar Error untuk baris yang tidak dikenali, supaya salah ketik tidak diam-diam hilang.
 */
export function parseFrontmatter(raw: string): { data: Record<string, FrontmatterValue>; body: string } {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { data: {}, body: text };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (end < 0) throw new Error('Frontmatter tidak ditutup dengan baris "---".');

  const data: Record<string, FrontmatterValue> = {};
  let listKey: string | null = null;
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:(?:\s+(.*))?\s*$/);
    if (!pair) throw new Error(`Baris frontmatter tidak dikenali: "${line.trim()}"`);
    const [, key, rawValue = ''] = pair;
    if (key in data) throw new Error(`Kunci frontmatter "${key}" ditulis dua kali.`);
    const value = rawValue.trim();
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = value.startsWith('[') && value.endsWith(']') ? inlineList(value) : unquote(value);
      listKey = null;
    }
  }
  return { data, body: lines.slice(end + 1).join('\n').replace(/^\n+/, '') };
}

const isValidDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isCta = (value: string): value is ArticleCta => (ARTICLE_CTAS as readonly string[]).includes(value);

/** Frontmatter + isi menjadi Article yang tervalidasi. `fileSlug` = nama file tanpa .md (harus sama dengan slug). */
export function parseArticle(raw: string, fileSlug?: string): Article {
  const { data, body } = parseFrontmatter(raw);
  const where = fileSlug ? `${fileSlug}.md` : 'artikel';
  const meta: Partial<ArticleMeta> = {};
  for (const key of STRING_KEYS) {
    const value = data[key];
    if (typeof value !== 'string' || value.trim() === '') throw new Error(`${where}: frontmatter "${key}" wajib diisi (teks).`);
    meta[key] = value.trim();
  }
  for (const key of LIST_KEYS) {
    const value = data[key] ?? [];
    if (!Array.isArray(value)) throw new Error(`${where}: frontmatter "${key}" harus berupa daftar.`);
    meta[key] = value;
  }
  const cta = data.cta ?? 'template';
  if (typeof cta !== 'string' || !isCta(cta)) throw new Error(`${where}: cta "${String(cta)}" harus salah satu dari ${ARTICLE_CTAS.join(', ')}.`);
  meta.cta = cta;
  const reviewed = data.reviewed;
  if (reviewed !== undefined && (typeof reviewed !== 'string' || !isValidDate(reviewed.trim()))) {
    throw new Error(`${where}: reviewed "${String(reviewed)}" harus tanggal YYYY-MM-DD (hapus barisnya selama artikel masih draf).`);
  }
  meta.reviewed = typeof reviewed === 'string' ? reviewed.trim() : null;
  const article = { ...(meta as ArticleMeta), body };
  if (!SLUG_PATTERN.test(article.slug)) throw new Error(`${where}: slug "${article.slug}" hanya boleh huruf kecil, angka, dan tanda hubung.`);
  if (fileSlug !== undefined && fileSlug !== article.slug) throw new Error(`${where}: slug "${article.slug}" harus sama dengan nama file.`);
  for (const key of ['datePublished', 'dateModified'] as const) {
    if (!isValidDate(article[key])) throw new Error(`${where}: ${key} "${article[key]}" harus tanggal YYYY-MM-DD.`);
  }
  if (article.dateModified < article.datePublished) throw new Error(`${where}: dateModified tidak boleh sebelum datePublished.`);
  for (const source of article.sources) {
    if (!/^https?:\/\/\S+$/.test(source)) throw new Error(`${where}: sumber "${source}" harus URL http(s).`);
  }
  for (const slug of article.related) {
    if (!SLUG_PATTERN.test(slug)) throw new Error(`${where}: related "${slug}" bukan slug yang valid.`);
  }
  return article;
}

// ─── Penolong Markdown ───────────────────────────────────────────────────────

/** Baris isi di luar blok kode (``` … ```). */
function proseLines(markdown: string): string[] {
  let fenced = false;
  return markdown.split('\n').filter((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced;
  });
}

/**
 * id anchor dari teks judul: huruf kecil, tanpa diakritik, selain huruf/angka → "-". Dipakai daftar isi dan H2 hasil
 * render (keduanya harus sama).
 */
export function headingId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ArticleHeading {
  id: string;
  text: string;
}

/** Judul H2 (`## …`) untuk daftar isi, sesuai urutan. */
export function articleHeadings(markdown: string): ArticleHeading[] {
  return proseLines(markdown)
    .map((line) => line.match(/^##\s+(.+?)\s*#*\s*$/)?.[1])
    .filter((text): text is string => Boolean(text))
    .map((text) => ({ id: headingId(text), text }));
}

/** Judul H2 penutup yang memuat daftar sumber; teksnya tidak dihitung sebagai isi artikel. */
export const SOURCES_HEADING = 'Sumber';

/** Isi artikel sebelum bagian "## Sumber" (bagian lain tetap). */
export function proseBeforeSources(markdown: string): string {
  const lines = markdown.split('\n');
  const index = lines.findIndex((line) => new RegExp(`^##\\s+${SOURCES_HEADING}\\s*$`).test(line));
  return (index < 0 ? lines : lines.slice(0, index)).join('\n');
}

/** Teks yang dibaca: tanpa URL tautan, sintaks Markdown, baris pemisah tabel, dan token {{…}}. */
export function plainText(markdown: string): string {
  return proseLines(markdown)
    .filter((line) => !/^\s*\|?\s*:?-{3,}/.test(line))
    .join('\n')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, 'x')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`|[\]]/g, ' ');
}

/** Jumlah kata isi (angka dan kata bersambung tanda hubung dihitung satu). */
export function countWords(markdown: string): number {
  return plainText(markdown).match(/[\p{L}\p{N}]+(?:[-'’.,/][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Perkiraan menit baca (±200 kata per menit), minimal 1. */
export const readingMinutes = (words: number): number => Math.max(1, Math.round(words / 200));

export interface MarkdownLink {
  text: string;
  href: string;
}

/** Semua tautan `[teks](href)` di isi (tanpa gambar). */
export function markdownLinks(markdown: string): MarkdownLink[] {
  const text = proseLines(markdown).join('\n');
  return [...text.matchAll(/(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => ({ text: m[1], href: m[2] }));
}
