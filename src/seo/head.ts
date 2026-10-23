// Tag <head> per halaman host utama (docs/platform/SEO-PLAN.md §5.3 langkah 3).
// - renderHeadTags(head): HTML untuk prerender (server). Semua nilai di-escape; JSON-LD aman di dalam <script>.
// - applyHead(head): memperbarui dokumen saat navigasi di klien (SeoManager). Hanya menyentuh tag bertanda data-gn
//   (dan <title>), jadi tag lain di index.html tidak berubah. Tag yang sudah sama tidak disentuh (tidak ada kedipan DOM).
// Keduanya memakai daftar tag yang sama (headTags), sehingga HTML prerender dan hasil navigasi klien identik.
// Modul murni: tidak menyentuh window/document saat dimuat (aman untuk SSR dan skrip Node).
import { jsonLdGraph, serializeJsonLd } from './jsonld';
import { OG_HEIGHT, OG_WIDTH, isOgCardUrl } from './og';
import type { SeoHead } from './types';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape teks untuk isi elemen dan nilai atribut HTML. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** Atribut penanda tag yang dikelola head manager (nilainya = kunci tag). */
export const MANAGED_ATTR = 'data-gn';

/** Ikon & manifest host utama: hanya di halaman Garuda Nexa, tidak di shell netral index.html (domain pembeli). */
/** Ikon PNG 192 px (kelipatan 48, panduan favicon Google Search) di samping favicon.ico 48 px dan favicon.svg. */
export const ICON_192 = '/icon-192.png';
export const APPLE_TOUCH_ICON = '/apple-touch-icon.png';
export const WEB_MANIFEST = '/site.webmanifest';

export interface HeadTag {
  /** Nilai data-gn, unik per tag. */
  key: string;
  tag: 'meta' | 'link' | 'script';
  /** Atribut selain data-gn, berurutan. */
  attrs: [string, string][];
  /** Isi elemen (hanya <script>). */
  text?: string;
}

type LdNode = Record<string, unknown>;

/** Node JSON-LD datar: dokumen {"@graph": [...]} dibuka, "@context" per node dibuang (dipasang sekali di graph). */
function flattenJsonLd(items: readonly object[]): LdNode[] {
  return items.flatMap((item) => {
    const node = item as LdNode;
    if (Array.isArray(node['@graph'])) return flattenJsonLd(node['@graph'] as object[]);
    const rest = { ...node };
    delete rest['@context'];
    return [rest];
  });
}

/** Harga Offer dari node Product pertama (untuk product:price:* di pratinjau tautan). */
function productPrice(nodes: readonly LdNode[]): { amount: string; currency: string } | null {
  for (const node of nodes) {
    if (node['@type'] !== 'Product') continue;
    const offers = (Array.isArray(node.offers) ? node.offers[0] : node.offers) as LdNode | undefined;
    const amount = offers?.price;
    const currency = offers?.priceCurrency;
    if ((typeof amount === 'number' || typeof amount === 'string') && typeof currency === 'string') {
      return { amount: String(amount), currency };
    }
  }
  return null;
}

/** Daftar tag head (selain <title>) untuk SeoHead ini, berurutan. */
export function headTags(head: SeoHead): HeadTag[] {
  const meta = (key: string, attr: 'name' | 'property', content: string): HeadTag => ({
    key,
    tag: 'meta',
    attrs: [
      [attr, key],
      ['content', content],
    ],
  });
  const nodes = flattenJsonLd(head.jsonLd);
  const price = head.ogType === 'product' ? productPrice(nodes) : null;
  const tags: HeadTag[] = [meta('description', 'name', head.description), meta('robots', 'name', head.robots)];
  if (head.canonical) {
    tags.push({
      key: 'canonical',
      tag: 'link',
      attrs: [
        ['rel', 'canonical'],
        ['href', head.canonical],
      ],
    });
  }
  tags.push(
    meta('og:site_name', 'property', 'Garuda Nexa'),
    meta('og:locale', 'property', 'id_ID'),
    meta('og:type', 'property', head.ogType),
  );
  if (head.canonical) tags.push(meta('og:url', 'property', head.canonical));
  tags.push(
    meta('og:title', 'property', head.title),
    meta('og:description', 'property', head.description),
    meta('og:image', 'property', head.ogImage),
  );
  if (isOgCardUrl(head.ogImage)) {
    tags.push(
      meta('og:image:type', 'property', 'image/jpeg'),
      meta('og:image:width', 'property', String(OG_WIDTH)),
      meta('og:image:height', 'property', String(OG_HEIGHT)),
    );
  }
  tags.push(meta('og:image:alt', 'property', head.ogImageAlt));
  if (price) {
    tags.push(meta('product:price:amount', 'property', price.amount), meta('product:price:currency', 'property', price.currency));
  }
  tags.push(meta('twitter:card', 'name', 'summary_large_image'));
  if (head.preloadImage) {
    tags.push({
      key: 'preload-image',
      tag: 'link',
      attrs: [
        ['rel', 'preload'],
        ['as', 'image'],
        ['href', head.preloadImage],
        ['fetchpriority', 'high'],
      ],
    });
  }
  tags.push(
    {
      key: 'icon-192',
      tag: 'link',
      attrs: [
        ['rel', 'icon'],
        ['type', 'image/png'],
        ['sizes', '192x192'],
        ['href', ICON_192],
      ],
    },
    {
      key: 'apple-touch-icon',
      tag: 'link',
      attrs: [
        ['rel', 'apple-touch-icon'],
        ['href', APPLE_TOUCH_ICON],
      ],
    },
    {
      key: 'manifest',
      tag: 'link',
      attrs: [
        ['rel', 'manifest'],
        ['href', WEB_MANIFEST],
      ],
    },
  );
  if (nodes.length) {
    tags.push({ key: 'jsonld', tag: 'script', attrs: [['type', 'application/ld+json']], text: serializeJsonLd(jsonLdGraph(nodes)) });
  }
  return tags;
}

const renderTag = ({ key, tag, attrs, text }: HeadTag): string => {
  const attributes = [...attrs, [MANAGED_ATTR, key]].map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join('');
  return tag === 'script' ? `<script${attributes}>${text ?? ''}</script>` : `<${tag}${attributes}>`;
};

/** HTML tag head untuk prerender (server): <title> lalu tag bertanda data-gn, satu per baris. Semua nilai di-escape. */
export function renderHeadTags(head: SeoHead): string {
  return [`<title>${escapeHtml(head.title)}</title>`, ...headTags(head).map(renderTag)].join('\n');
}

/** Selector tag sejenis yang belum bertanda data-gn (mis. dari index.html lama), untuk diambil alih alih-alih digandakan. */
function unmanagedSelector({ tag, attrs }: HeadTag): string | null {
  const [name, value] = attrs[0] ?? [];
  if (!name || !value) return null;
  return `${tag}[${name}="${value.replace(/"/g, '\\"')}"]:not([${MANAGED_ATTR}])`;
}

/** Terapkan head ke dokumen saat navigasi di klien. Hanya mengubah yang berbeda; tag data-gn yang tidak dipakai dihapus. */
export function applyHead(head: SeoHead, doc: Document = document): void {
  if (doc.title !== head.title) doc.title = head.title;
  const root = doc.head;
  const tags = headTags(head);
  const wanted = new Set(tags.map((t) => t.key));

  root.querySelectorAll(`[${MANAGED_ATTR}]`).forEach((el) => {
    if (!wanted.has(el.getAttribute(MANAGED_ATTR) ?? '')) el.remove();
  });

  for (const desc of tags) {
    let el = root.querySelector(`[${MANAGED_ATTR}="${desc.key}"]`);
    if (el && el.tagName.toLowerCase() !== desc.tag) {
      el.remove();
      el = null;
    }
    if (!el) {
      const selector = unmanagedSelector(desc);
      el = selector ? root.querySelector(selector) : null;
      if (el) el.setAttribute(MANAGED_ATTR, desc.key);
    }
    if (!el) {
      el = doc.createElement(desc.tag);
      el.setAttribute(MANAGED_ATTR, desc.key);
      root.appendChild(el);
    }
    const keep = new Set([MANAGED_ATTR, ...desc.attrs.map(([name]) => name)]);
    for (const name of el.getAttributeNames()) if (!keep.has(name)) el.removeAttribute(name);
    for (const [name, value] of desc.attrs) if (el.getAttribute(name) !== value) el.setAttribute(name, value);
    if (desc.tag === 'script' && el.textContent !== (desc.text ?? '')) el.textContent = desc.text ?? '';
  }
}
