// Judul tab, meta description, favicon, dan theme-color dari konten situs pembeli. Mengembalikan fungsi pemulih.
//
// DIGANTIKAN src/templates/siteSeo.ts (docs/platform/SITE-POSTS-SEO-SPEC.md §5): applySiteSeoHead menulis head lengkap
// (canonical, robots, OG, JSON-LD) dengan aturan yang sama dengan backend/site.php. File ini tinggal untuk pemanggil
// lama dan tes template (siteTitle, applySiteHead); jangan dipakai untuk kode baru.
import { getTemplate, parseSiteContent, resolveContent } from './index';
import { getSection, parseHex, safeImage, text } from './shared/utils';

/** Nama situs untuk judul halaman: "Nama — Tagline" atau "Nama". */
export function siteTitle(templateCode: string | null | undefined, rawContent: unknown): string {
  const def = getTemplate(templateCode);
  const content = def ? resolveContent(def, parseSiteContent(rawContent)) : {};
  const brand = getSection(content, 'brand');
  const name = text(brand, 'company_name');
  const tagline = text(brand, 'tagline');
  return name ? (tagline ? `${name} — ${tagline}` : name) : '';
}

function setMeta(name: string, value: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const created = !el;
  const previous = el?.getAttribute('content') ?? null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
  return () => {
    if (created) el?.remove();
    else if (previous !== null) el?.setAttribute('content', previous);
  };
}

/** @deprecated Pakai applySiteSeoHead (siteSeo.ts). */
export function applySiteHead(templateCode: string | null | undefined, rawContent: unknown): () => void {
  if (typeof document === 'undefined') return () => undefined;
  // Head dari site.php / applySiteSeoHead (tag bertanda data-site-seo) sudah lengkap: jangan ditimpa aturan lama
  // (judul tanpa SEO situs, deskripsi tanpa pemotongan 155), supaya Google tidak melihat dua versi.
  if (document.head.querySelector('[data-site-seo]')) return () => undefined;
  const def = getTemplate(templateCode);
  const content = def ? resolveContent(def, parseSiteContent(rawContent)) : {};
  const brand = getSection(content, 'brand');
  const cleanups: (() => void)[] = [];

  const previousTitle = document.title;
  document.title = siteTitle(templateCode, rawContent) || 'Situs';
  cleanups.push(() => {
    document.title = previousTitle;
  });

  const description =
    text(getSection(content, 'hero'), 'subtitle') || text(getSection(content, 'footer'), 'description') || text(brand, 'tagline');
  if (description) cleanups.push(setMeta('description', description.slice(0, 300)));

  const accent = text(brand, 'accent_color') || def?.defaultContent?.brand?.accent_color;
  if (typeof accent === 'string' && parseHex(accent)) cleanups.push(setMeta('theme-color', accent));

  const logo = safeImage(text(brand, 'logo'));
  if (logo) {
    const icons = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const previous = icons.map((icon) => icon.getAttribute('href'));
    if (icons.length === 0) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = logo;
      document.head.appendChild(link);
      cleanups.push(() => link.remove());
    } else {
      icons.forEach((icon) => icon.setAttribute('href', logo));
      cleanups.push(() => icons.forEach((icon, i) => previous[i] !== null && icon.setAttribute('href', previous[i]!)));
    }
  }

  return () => cleanups.reverse().forEach((fn) => fn());
}
