// sitemap.xml host utama (docs/platform/SEO-PLAN.md §5.4 langkah 1). Dipanggil prerender WP2 saat deploy:
//   buildSitemap(getIndexableRoutes(data), 'https://garudanexa.com')
// - Hanya URL 200, kanonis dan `index`: entri datang dari getIndexableRoutes (stub dan noindex sudah disaring); di sini
//   diperiksa ulang dan deploy GAGAL (throw) bila ada path aplikasi, query, duplikat, atau lastmod yang tidak valid.
// - lastmod jujur: updated_at template / tanggal `updated` halaman statis, bukan tanggal build.
// - Satu <image:image> per pratinjau template. Tanpa changefreq/priority (diabaikan Google).
// Modul ESM murni tanpa dependensi (bisa diimpor Node langsung).

export const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
export const IMAGE_NS = 'http://www.google.com/schemas/sitemap-image/1.1';

/** Path yang tidak boleh ada di sitemap (noindex atau tertutup robots.txt). */
const FORBIDDEN_PATH = /^\/(?:demo|pesan|akun|masuk|daftar|situs|admin|login|auth|api\.php|_pre|404)(?:\/|$)|^\/app\.html$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

/** "2026-10-23 02:37:00" / "2026-10-23T…Z" / "2026-10-23" → "2026-10-23" (tanggal saja; tanpa tebakan zona waktu). */
export function toLastmod(value) {
  const text = String(value ?? '').trim();
  if (DATE.test(text)) return text;
  if (DATETIME.test(text)) return text;
  const match = /^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}/.exec(text);
  return match ? match[1] : null;
}

function validDate(value) {
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

/**
 * Isi sitemap.xml dari entri SitemapEntry ({ path, lastmod, images? }). `origin` tanpa garis miring di akhir.
 * Melempar Error bila ada entri yang tidak layak (supaya deploy berhenti, bukan menerbitkan sitemap yang salah).
 */
export function buildSitemap(entries, origin = 'https://garudanexa.com') {
  const base = String(origin).replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(base)) throw new Error(`[sitemap] origin tidak valid: ${origin}`);
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('[sitemap] tidak ada rute yang bisa diindeks');
  const seen = new Set();
  const urls = entries.map((entry) => {
    const path = String(entry?.path ?? '');
    if (!path.startsWith('/') || /[?#\s]/.test(path) || (path !== '/' && path.endsWith('/')) || path.includes('//')) {
      throw new Error(`[sitemap] path tidak kanonis: "${path}"`);
    }
    if (FORBIDDEN_PATH.test(path)) throw new Error(`[sitemap] path noindex/tertutup tidak boleh masuk sitemap: ${path}`);
    if (seen.has(path)) throw new Error(`[sitemap] path ganda: ${path}`);
    seen.add(path);
    const lastmod = toLastmod(entry.lastmod);
    if (!lastmod || !validDate(lastmod)) throw new Error(`[sitemap] lastmod tidak valid untuk ${path}: "${entry.lastmod}"`);
    const images = [...new Set((Array.isArray(entry.images) ? entry.images : []).filter((src) => typeof src === 'string' && src.trim()))].map(
      (src) => {
        const value = src.trim();
        if (/^https?:\/\//i.test(value)) return value;
        if (value.startsWith('/')) return `${base}${value}`;
        throw new Error(`[sitemap] URL gambar tidak valid untuk ${path}: "${src}"`);
      },
    );
    const lines = [`  <url>`, `    <loc>${escapeXml(path === '/' ? `${base}/` : `${base}${path}`)}</loc>`, `    <lastmod>${escapeXml(lastmod)}</lastmod>`];
    for (const image of images) lines.push(`    <image:image>`, `      <image:loc>${escapeXml(image)}</image:loc>`, `    </image:image>`);
    lines.push(`  </url>`);
    return lines.join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NS}" xmlns:image="${IMAGE_NS}">`,
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** Baca kembali <loc> + <lastmod> dari sitemap (untuk IndexNow dan pengecekan). */
export function parseSitemap(xml) {
  const entries = [];
  for (const block of String(xml).match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1] ?? null;
    if (loc) entries.push({ loc: loc.replace(/&amp;/g, '&'), lastmod });
  }
  return entries;
}
