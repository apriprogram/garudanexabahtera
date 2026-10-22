// Artikel panduan (/panduan/{slug}, docs/platform/SEO-PLAN.md §5.8): satu file Markdown per artikel di folder ini,
// nama file = slug (mis. biaya-website-company-profile.md). Isinya ikut di-bundle (import.meta.glob ?raw), tidak
// disajikan dari web, lalu di-prerender. Dimuat WP1; isi dan halaman artikel milik WP8.
//
// Frontmatter (subset YAML sederhana, tanpa dependensi):
//   ---
//   title: Berapa Biaya Membuat Website Company Profile di 2026?
//   description: Ringkasan satu-dua kalimat untuk meta description.
//   slug: biaya-website-company-profile
//   author: Tim Garuda Nexa
//   datePublished: 2026-11-02
//   dateModified: 2026-11-02
//   sources:
//     - https://contoh.go.id/data-harga
//   related: [template-vs-jasa-website-custom, website-klinik-kecantikan]
//   ---
// Nilai boleh diapit tanda kutip. Daftar: baris "- item" di bawah kuncinya, atau [a, b] dalam satu baris; [] = kosong.
// Baris kosong dan baris komentar (#) diabaikan.

export interface ArticleMeta {
  title: string;
  description: string;
  slug: string;
  author: string;
  /** YYYY-MM-DD */
  datePublished: string;
  /** YYYY-MM-DD, tidak sebelum datePublished */
  dateModified: string;
  /** URL sumber eksternal */
  sources: string[];
  /** Slug artikel terkait */
  related: string[];
}

export interface Article extends ArticleMeta {
  /** Isi Markdown setelah frontmatter */
  body: string;
}

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

/** Terbaru dulu (datePublished, lalu dateModified), seri → slug A-Z. Tolak slug ganda. */
export function sortArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  for (const article of articles) {
    if (seen.has(article.slug)) throw new Error(`Slug artikel "${article.slug}" dipakai lebih dari satu file.`);
    seen.add(article.slug);
  }
  return [...articles].sort(
    (a, b) =>
      b.datePublished.localeCompare(a.datePublished) || b.dateModified.localeCompare(a.dateModified) || a.slug.localeCompare(b.slug),
  );
}

const files = import.meta.glob<string>('./*.md', { query: '?raw', import: 'default', eager: true });

const ARTICLES: readonly Article[] = sortArticles(
  Object.entries(files).map(([file, raw]) => parseArticle(raw, file.replace(/^.*\//, '').replace(/\.md$/, ''))),
);

/** Semua artikel, terbaru dulu. Kosong selama belum ada file .md. */
export function listArticles(): Article[] {
  return [...ARTICLES];
}

/** Artikel dengan slug ini, atau undefined. */
export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
