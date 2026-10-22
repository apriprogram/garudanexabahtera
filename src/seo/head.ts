// Tag <head> per halaman host utama (docs/platform/SEO-PLAN.md §5.3).
// STUB dari WP1: renderHeadTags baru menulis title, description, robots dan canonical; applyHead belum melakukan
// apa pun. WP3 melengkapinya (og:*, twitter:*, JSON-LD, preload gambar, tag bertanda data-gn di klien).
import type { SeoHead } from './types';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape teks untuk isi elemen dan nilai atribut HTML. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** HTML tag head untuk prerender (server). Semua nilai di-escape. */
export function renderHeadTags(head: SeoHead): string {
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}">`,
    `<meta name="robots" content="${escapeHtml(head.robots)}">`,
  ];
  if (head.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(head.canonical)}">`);
  return tags.join('\n');
}

/** Terapkan head ke dokumen saat navigasi di klien. STUB: belum mengubah apa pun (WP3). */
export function applyHead(head: SeoHead): void {
  void head;
}
