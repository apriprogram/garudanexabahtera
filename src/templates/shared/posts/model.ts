// Turunan tulisan situs (fungsi murni, tanpa React): tanggal Indonesia, paragraf isi, item list dari tulisan untuk
// section beranda template sekolah, tautan tambahan, dan tulisan terkait. Data dari API publik (src/types/sitePosts.ts).
import type { ListItem, SiteContent } from '../../types';
import { postPath } from '../../siteRoutes';
import { isPlainObject, safeUrl } from '../utils';
import type { SitePostsByKind } from '../siteData';
import type { SitePostKind, SitePostSummary } from '../../../types/sitePosts';

export const POST_KIND_LABEL: Record<SitePostKind, string> = { berita: 'Berita', pengumuman: 'Pengumuman' };

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface PostDate {
  /** "2026-10-12" untuk atribut dateTime */
  iso: string;
  day: string;
  /** "Okt" */
  monthShort: string;
  year: string;
  /** "12 Oktober 2026" */
  label: string;
  /** "Senin, 12 Oktober 2026" */
  long: string;
}

/** published_at "YYYY-MM-DD" (tanggal kalender yang valid) → bagian tanggal Indonesia; selain itu null. */
export function postDate(raw: string | null | undefined): PostDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((raw || '').trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const label = `${d} ${MONTHS[m - 1]} ${y}`;
  return {
    iso: match[0],
    day: String(d),
    monthShort: MONTHS[m - 1].slice(0, 3),
    year: String(y),
    label,
    long: `${DAYS[date.getUTCDay()]}, ${label}`,
  };
}

/** Isi tulisan (teks biasa) → paragraf, dipisah baris kosong. Baris baru tunggal tetap di dalam paragraf. */
export const postParagraphs = (body: string | null | undefined): string[] =>
  (body || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Teks alternatif foto tulisan: teks foto dari pembeli, kalau kosong judulnya. */
export const postImageAlt = (post: Pick<SitePostSummary, 'image_alt' | 'title'>): string => (post.image_alt || '').trim() || post.title;

/** Label pengumuman yang ditonjolkan merah lembut ("Penting", "Wajib", "Segera", "Mendesak"). */
export const isUrgentBadge = (badge: string | null | undefined): boolean => /penting|wajib|segera|mendesak|urgent/i.test(badge || '');

// ─── Item list untuk section beranda ─────────────────────────────────────────

/**
 * Kunci tambahan item yang berasal dari tulisan: path tulisan relatif akar situs ("/berita/juara"). Item dari konten CMS
 * tidak pernah punya kunci ini, jadi kartu bisa membedakan: ada → tautan ke halaman tulisan, tidak ada → perilaku lama.
 */
export const POST_PATH_KEY = 'post_path';

/** Section beranda → jenis tulisan yang mengisinya (kunci section template sekolah). */
export const POST_SECTIONS: Record<string, SitePostKind> = { news: 'berita', announcements: 'pengumuman' };

/**
 * Tulisan → item list berbentuk item CMS template sekolah: berita (category, date, title, excerpt, image) dan
 * pengumuman (date, title, text, badge). `url` kosong: tautannya lewat POST_PATH_KEY.
 */
export function postItem(post: SitePostSummary): ListItem {
  return {
    title: post.title,
    date: post.published_at ?? '',
    category: post.category,
    badge: post.badge,
    excerpt: post.excerpt,
    text: post.excerpt,
    image: post.image ?? '',
    image_alt: post.image_alt,
    url: '',
    [POST_PATH_KEY]: postPath(post.kind, post.slug),
  };
}

/** Tulisan yang dipakai: array tidak kosong; null/[] → null (pakai daftar dari konten CMS). */
export const usablePosts = (posts: SitePostSummary[] | null | undefined): SitePostSummary[] | null =>
  Array.isArray(posts) && posts.length > 0 ? posts : null;

/**
 * Konten dengan `items` section berita/pengumuman diganti tulisan terbit (bila ada tulisan jenis itu). Section lain,
 * judul section, dan `enabled` tetap dari konten. Tanpa tulisan → konten yang sama persis (objek yang sama).
 */
export function withPostItems(content: SiteContent, posts: SitePostsByKind, sections: Record<string, SitePostKind> = POST_SECTIONS): SiteContent {
  const base: Record<string, unknown> = isPlainObject(content) ? content : {};
  let result: SiteContent | null = null;
  for (const [key, kind] of Object.entries(sections)) {
    const list = usablePosts(posts?.[kind]);
    if (!list) continue;
    result ??= { ...(base as SiteContent) };
    const section = isPlainObject(base[key]) ? (base[key] as SiteContent[string]) : {};
    result[key] = { ...section, items: list.map(postItem) };
  }
  return result ?? content;
}

// ─── Halaman tulisan ─────────────────────────────────────────────────────────

export type PostLinkTarget = { kind: 'site'; path: string } | { kind: 'section'; anchor: string } | { kind: 'external'; href: string; label: string };

/**
 * Tautan tambahan tulisan (link_url): "/path" → halaman situs, "#anchor" → section beranda, http(s)/mailto/tel → keluar
 * (label = nama host, mis. "drive.google.com"). Tidak sah → null.
 */
export function postLinkTarget(raw: string | null | undefined): PostLinkTarget | null {
  const value = (raw || '').trim();
  if (!value) return null;
  if (/^#[\w-]+$/.test(value)) return { kind: 'section', anchor: value.slice(1) };
  if (value.startsWith('/') && !value.startsWith('//')) return { kind: 'site', path: value };
  const href = safeUrl(value);
  if (!href || !/^(https?:|mailto:|tel:)/i.test(href)) return null;
  let label = href.replace(/^(mailto:|tel:)/i, '');
  if (/^https?:/i.test(href)) {
    try {
      label = new URL(href).hostname.replace(/^www\./, '');
    } catch {
      label = href;
    }
  }
  return { kind: 'external', href, label };
}

/** Tulisan lain jenis yang sama (terbaru dulu, urutan API), tanpa tulisan yang sedang dibaca. */
export function relatedPosts(posts: SitePostSummary[] | null | undefined, slug: string, max = 3): SitePostSummary[] {
  return (posts ?? []).filter((p) => p.slug !== slug).slice(0, max);
}
