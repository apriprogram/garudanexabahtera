// Kepala halaman situs pembeli (docs/platform/SITE-POSTS-SEO-SPEC.md §5). Aturannya SAMA PERSIS dengan backend/site.php
// (dibuktikan tes paritas). Menggantikan applySiteHead (siteHead.ts).
//
// - buildSiteHead: fungsi murni (tanpa DOM). Hasilnya dibandingkan dengan site_build_head di PHP untuk masukan yang
//   sama (__tests__/seo/site-seo.test.ts), supaya Google tidak melihat dua versi head: dari server dan setelah React.
// - applySiteSeoHead: menerapkannya ke DOM. Tag bertanda data-site-seo (dari site.php, atau dibuat di sini di host
//   utama/pengembangan) diubah di tempat, tidak pernah digandakan.
// - Nilai bawaan (konten null / field kosong) = registri TEMPLATES, sama dengan backend/modules/site_defaults.json
//   (dijaga __tests__/backend/site-defaults.test.ts).
import { getTemplate, parseSiteContent, resolveContent } from './index';
import type { SiteContent, TemplateDefinition } from './types';
import { sitePath, type SiteRoute } from './siteRoutes';
import { getSection, isPlainObject, parseHex, text } from './shared/utils';
import { firstThatFits, toIsoDate } from '../seo/format';
import { SITE_SCHEMA_TYPES, type SitePostKind, type SitePostPublic, type SiteSeoPublic } from '../types/sitePosts';

export interface SiteHeadInput {
  /** Domain tersimpan (template_sites.domain); null = host utama (pratinjau /situs/:id): tanpa canonical, robots noindex */
  domain: string | null;
  templateCode: string;
  /** Konten tersimpan apa adanya (null = bawaan template) */
  content: SiteContent | null;
  /** null = belum dimuat / tidak ada baris site_seo (semua bawaan) */
  seo: SiteSeoPublic | null;
  route: SiteRoute;
  /** Rute tulisan: tulisannya (null = tidak ditemukan) */
  post?: SitePostPublic | null;
  /** Rute daftar: jumlah tulisan terbit jenis itu */
  listCount?: number;
}

export interface SiteHead {
  title: string;
  description: string;
  /** 'index,follow' | 'noindex,follow' */
  robots: string;
  /** https://{domain}{path}; null di host utama */
  canonical: string | null;
  siteName: string;
  ogType: 'website' | 'article';
  /** URL absolut (atau path bila domain null); null = tanpa gambar */
  ogImage: string | null;
  twitterCard: 'summary' | 'summary_large_image';
  /** Path/URL logo untuk <link rel="icon">; null = biarkan */
  icon: string | null;
  /** Objek JSON-LD (@context + @graph) */
  jsonLd: Record<string, unknown>;
}

/** Bawaan satu template untuk kepala halaman: satu entri backend/modules/site_defaults.json. */
export interface SiteDefaults {
  company_name: string;
  tagline: string;
  /** hero.subtitle → footer.description → brand.tagline dari konten bawaan */
  description: string;
  logo: string;
  /** Template berfitur berita & pengumuman (TemplateDefinition.features.posts) */
  posts: boolean;
}

export const SITE_TITLE_MAX = 60;
export const SITE_DESCRIPTION_MAX = 155;
/** Batas headline Article/NewsArticle (Google) */
export const SITE_HEADLINE_MAX = 110;

export const SITE_KIND_LABEL: Record<SitePostKind, string> = { berita: 'Berita', pengumuman: 'Pengumuman' };
const LIST_DESCRIPTION: Record<SitePostKind, (siteName: string) => string> = {
  berita: (siteName) => `Berita terbaru dari ${siteName}.`,
  pengumuman: (siteName) => `Pengumuman resmi dari ${siteName}.`,
};
const NOT_FOUND_TITLE = 'Halaman tidak ditemukan';
const INDEX = 'index,follow';
const NOINDEX = 'noindex,follow';
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
const RASTER = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;

// ── Teks (sama dengan site_collapse / site_clip di site.php) ──

/**
 * Spasi apa pun (baris baru, tab, NBSP dari tempelan Word, …) → satu spasi, tanpa spasi di tepi. `\s` JavaScript;
 * site.php (SITE_WHITESPACE) menulis himpunan yang sama satu per satu, karena `\s` PHP berbeda (U+0085, U+180E, U+FEFF).
 */
export const siteCollapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** Teks dari data (konten, SEO, tulisan): string → spasi dirapatkan; selain string → ''. */
const clean = (value: unknown): string => (typeof value === 'string' ? siteCollapse(value) : '');

/**
 * Potong di batas kata menjadi ≤ max karakter (titik kode), diakhiri "…". Teks yang muat dikembalikan utuh
 * (spasinya dirapatkan).
 */
export function siteClip(value: string, max: number): string {
  const textValue = siteCollapse(value);
  const chars = Array.from(textValue);
  if (chars.length <= max) return textValue;
  let cut = chars.slice(0, max - 1).join('');
  // Kata terakhir terpotong → mundur ke spasi sebelumnya
  const space = chars[max - 1] === ' ' ? -1 : cut.lastIndexOf(' ');
  if (space > 0) cut = cut.slice(0, space);
  return `${cut.replace(/[ .,;:!?…\-–—]+$/u, '')}…`;
}

/** Path atau URL gambar yang boleh dipakai di head: https?://… atau /path (bukan //host). Selain itu ''. */
function headImage(raw: unknown): string {
  const value = clean(raw);
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') && !value.startsWith('//') ? value : '';
}

const absolute = (origin: string, src: string) => (/^https?:\/\//i.test(src) ? src : `${origin}${src}`);

/** "2026-10-23" → "2026-10-23T00:00:00+07:00" (tanggal tampil = WIB); tidak valid → null. */
const publishedIso = (value: unknown): string | null => {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? toIsoDate(value) : null;
  return date ? `${date}T00:00:00+07:00` : null;
};

// ── Nilai dasar ──

const defaultsCache = new Map<string, SiteDefaults>();

/** Bawaan template dari registri (resolveContent(def, null)); sama persis dengan entri site_defaults.json. */
export function siteDefaultsOf(def: TemplateDefinition): SiteDefaults {
  const cached = defaultsCache.get(def.code);
  if (cached) return cached;
  const content = resolveContent(def, null);
  const brand = getSection(content, 'brand');
  const defaults: SiteDefaults = {
    company_name: text(brand, 'company_name'),
    tagline: text(brand, 'tagline'),
    description: text(getSection(content, 'hero'), 'subtitle') || text(getSection(content, 'footer'), 'description') || text(brand, 'tagline'),
    logo: text(brand, 'logo'),
    posts: def.features?.posts === true,
  };
  defaultsCache.set(def.code, defaults);
  return defaults;
}

const EMPTY_DEFAULTS: SiteDefaults = { company_name: '', tagline: '', description: '', logo: '', posts: false };

/** Teks konten tersimpan (string saja, spasi dirapatkan); bukan string / tidak ada → ''. */
function contentText(content: Record<string, unknown> | null, section: string, key: string): string {
  const value = content && isPlainObject(content[section]) ? (content[section] as Record<string, unknown>)[key] : undefined;
  return clean(value);
}

interface SiteBase {
  domain: string | null;
  origin: string;
  siteName: string;
  tagline: string;
  homeDescription: string;
  logo: string;
  posts: boolean;
  indexable: boolean;
}

function siteBase(input: SiteHeadInput): SiteBase {
  const def = getTemplate(input.templateCode);
  const defaults = def ? siteDefaultsOf(def) : EMPTY_DEFAULTS;
  const content = parseSiteContent(input.content);
  const domainValue = typeof input.domain === 'string' ? input.domain.trim().toLowerCase() : '';
  const domain = DOMAIN_PATTERN.test(domainValue) ? domainValue : null;
  const siteName = contentText(content, 'brand', 'company_name') || siteCollapse(defaults.company_name);
  // Tanpa baris site_seo (seo null) = index_mode auto: index hanya bila nama sekolah/usaha sudah diganti pembeli
  const indexable = input.seo
    ? input.seo.indexable === true
    : content !== null && contentText(content, 'brand', 'company_name') !== '' &&
      contentText(content, 'brand', 'company_name') !== siteCollapse(defaults.company_name);
  return {
    domain,
    origin: domain ? `https://${domain}` : '',
    siteName,
    tagline: contentText(content, 'brand', 'tagline') || siteCollapse(defaults.tagline),
    homeDescription:
      contentText(content, 'hero', 'subtitle') ||
      contentText(content, 'footer', 'description') ||
      contentText(content, 'brand', 'tagline') ||
      siteCollapse(defaults.description),
    logo: headImage(contentText(content, 'brand', 'logo')) || headImage(defaults.logo),
    posts: defaults.posts,
    indexable,
  };
}

/** Jenis organisasi JSON-LD: pilihan pembeli → School (template berfitur tulisan) → Organization. */
function organizationType(seo: SiteSeoPublic | null, posts: boolean): string {
  const chosen = seo && (SITE_SCHEMA_TYPES as readonly string[]).includes(seo.schema_type) ? seo.schema_type : '';
  // LocalBusiness wajib beralamat (Google); situs pembeli tidak menulis alamat di JSON-LD
  if (chosen === 'LocalBusiness') return 'Organization';
  return chosen || (posts ? 'School' : 'Organization');
}

// ── Head ──

export function buildSiteHead(input: SiteHeadInput): SiteHead {
  const base = siteBase(input);
  const { origin, siteName } = base;
  const route = input.route;
  const seo = input.seo;
  const kind = route.kind === 'list' || route.kind === 'post' ? route.postKind : null;
  // Tulisan lain (mis. masih tulisan sebelumnya saat pindah rute) = belum dimuat
  let post: SitePostPublic | null | undefined;
  if (route.kind === 'post') {
    const raw = input.post;
    post = raw && raw.kind === route.postKind && raw.slug === route.slug ? raw : raw === null ? null : undefined;
  }
  const missing = route.kind === 'notfound' || (route.kind === 'post' && post === null);
  const loading = route.kind === 'post' && post === undefined;

  let title: string;
  let description: string;
  if (missing) {
    title = firstThatFits([`${NOT_FOUND_TITLE} · ${siteName}`, NOT_FOUND_TITLE], SITE_TITLE_MAX);
    description = `Halaman yang Anda cari tidak ada di ${siteName}.`;
  } else if (route.kind === 'post' && post) {
    const postTitle = clean(post.title);
    title = clean(post.seo_title) || firstThatFits([`${postTitle} · ${siteName}`, postTitle], SITE_TITLE_MAX);
    description = clean(post.seo_description) || clean(post.excerpt) || clean(post.body);
  } else if (kind) {
    // Daftar, atau tulisan yang belum dimuat
    title = `${SITE_KIND_LABEL[kind]} · ${siteName}`;
    description = LIST_DESCRIPTION[kind](siteName);
  } else {
    const named = base.tagline ? `${siteName} — ${base.tagline}` : '';
    title = clean(seo?.title) || firstThatFits([named, siteName], SITE_TITLE_MAX);
    description = clean(seo?.description) || base.homeDescription;
  }
  description = siteClip(description, SITE_DESCRIPTION_MAX);

  const pageOk =
    route.kind === 'home' ||
    (route.kind === 'list' && base.posts && (input.listCount ?? 0) >= 1) ||
    (route.kind === 'post' && Boolean(post) && !post?.noindex);
  const robots = base.domain && base.indexable && pageOk ? INDEX : NOINDEX;
  const canonical = base.domain && !missing && !loading ? `${origin}${sitePath(route)}` : null;

  // og:image: gambar SEO situs → foto tulisan → logo. SVG dilewati (tidak dibaca WhatsApp/Facebook/X).
  const postImage = post ? headImage(post.image) : '';
  const imageSrc = [headImage(seo?.og_image), postImage, base.logo].find((src) => src !== '' && RASTER.test(src)) ?? '';
  const ogImage = imageSrc ? absolute(origin, imageSrc) : null;

  const organizationId = `${origin}/#organization`;
  const organization: Record<string, unknown> = {
    '@type': organizationType(seo, base.posts),
    '@id': organizationId,
    name: siteName,
    url: `${origin}/`,
  };
  if (base.logo) organization.logo = absolute(origin, base.logo);
  const graph: Record<string, unknown>[] = [
    organization,
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: `${origin}/`,
      name: siteName,
      inLanguage: 'id-ID',
      publisher: { '@id': organizationId },
    },
  ];
  if (route.kind === 'post' && post) {
    const url = `${origin}${sitePath(route)}`;
    const postTitle = clean(post.title);
    const article: Record<string, unknown> = {
      '@type': route.postKind === 'berita' ? 'NewsArticle' : 'Article',
      '@id': `${url}#article`,
      headline: siteClip(postTitle, SITE_HEADLINE_MAX),
      description,
      url,
      mainEntityOfPage: url,
      inLanguage: 'id-ID',
      author: { '@id': organizationId },
      publisher: { '@id': organizationId },
    };
    const images = postImage ? [absolute(origin, postImage)] : ogImage ? [ogImage] : [];
    if (images.length) article.image = images;
    const published = publishedIso(post.published_at);
    if (published) article.datePublished = published;
    // updated_at → tanggalnya saja, tanpa menebak zona waktu server (aturan lastmod scripts/seo/sitemap.mjs)
    const modified = toIsoDate(post.updated_at);
    if (modified) article.dateModified = modified;
    graph.push(article, {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: SITE_KIND_LABEL[route.postKind], item: `${origin}/${route.postKind}` },
        { '@type': 'ListItem', position: 3, name: postTitle, item: url },
      ],
    });
  }

  return {
    title,
    description,
    robots,
    canonical,
    siteName,
    ogType: route.kind === 'post' && post ? 'article' : 'website',
    ogImage,
    twitterCard: ogImage ? 'summary_large_image' : 'summary',
    icon: base.logo || null,
    jsonLd: { '@context': 'https://schema.org', '@graph': graph },
  };
}

// ── DOM ──

const MARK = 'data-site-seo';
/** Ikon shell (favicon Garuda Nexa) yang dilepas saat logo situs dipasang; dikembalikan removeSiteSeoHead. */
let detachedIcons: HTMLLinkElement[] = [];
let themeColorBefore: { el: HTMLMetaElement; content: string | null; created: boolean } | null = null;

/** Satu tag bertanda per kunci: ubah yang ada (sisanya dibuang), atau buat baru di <head>. */
function upsert(key: string, tag: 'meta' | 'link' | 'script', attrs: Record<string, string>, textContent?: string) {
  const found = Array.from(document.head.querySelectorAll<HTMLElement>(`[${MARK}="${key}"]`));
  let el = found.find((node) => node.tagName.toLowerCase() === tag) ?? null;
  for (const node of found) if (node !== el) node.remove();
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(MARK, key);
    document.head.appendChild(el);
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  if (textContent !== undefined && el.textContent !== textContent) el.textContent = textContent;
}

const drop = (key: string) => document.head.querySelectorAll(`[${MARK}="${key}"]`).forEach((node) => node.remove());

function applyThemeColor(input: SiteHeadInput) {
  const def = getTemplate(input.templateCode);
  const content = def ? resolveContent(def, parseSiteContent(input.content)) : {};
  const accent = text(getSection(content, 'brand'), 'accent_color');
  if (!parseHex(accent)) return;
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorBefore) {
    themeColorBefore = { el: el ?? document.createElement('meta'), content: el?.getAttribute('content') ?? null, created: !el };
  }
  if (!el) {
    el = themeColorBefore.el;
    el.setAttribute('name', 'theme-color');
    document.head.appendChild(el);
  }
  el.setAttribute('content', accent);
}

/** Terapkan ke DOM: ubah/buat tag bertanda data-site-seo, <title>, ikon. Aman dipanggil berulang. */
export function applySiteSeoHead(input: SiteHeadInput): void {
  if (typeof document === 'undefined') return;
  const head = buildSiteHead(input);
  if (document.title !== head.title) document.title = head.title;
  const meta = (key: string, attr: 'name' | 'property', content: string | null) =>
    content === null ? drop(key) : upsert(key, 'meta', { [attr]: key, content });
  meta('description', 'name', head.description);
  meta('robots', 'name', head.robots);
  if (head.canonical) upsert('canonical', 'link', { rel: 'canonical', href: head.canonical });
  else drop('canonical');
  meta('og:site_name', 'property', head.siteName);
  meta('og:locale', 'property', 'id_ID');
  meta('og:type', 'property', head.ogType);
  meta('og:url', 'property', head.canonical);
  meta('og:title', 'property', head.title);
  meta('og:description', 'property', head.description);
  meta('og:image', 'property', head.ogImage);
  meta('twitter:card', 'name', head.twitterCard);
  // textContent, bukan innerHTML: isi JSON-LD tidak pernah diurai sebagai HTML
  upsert('jsonld', 'script', { type: 'application/ld+json' }, JSON.stringify(head.jsonLd));
  if (head.icon) {
    for (const icon of Array.from(document.head.querySelectorAll<HTMLLinkElement>(`link[rel~="icon"]:not([${MARK}])`))) {
      detachedIcons.push(icon);
      icon.remove();
    }
    upsert('icon', 'link', { rel: 'icon', href: head.icon });
  }
  applyThemeColor(input);
}

/** Lepas semua tag situs pembeli dan kembalikan ikon & theme-color shell (mis. saat pratinjau /situs/:id ditutup). */
export function removeSiteSeoHead(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelectorAll(`[${MARK}]`).forEach((node) => node.remove());
  for (const icon of detachedIcons) document.head.appendChild(icon);
  detachedIcons = [];
  if (themeColorBefore) {
    const { el, content, created } = themeColorBefore;
    if (created) el.remove();
    else if (content !== null) el.setAttribute('content', content);
    themeColorBefore = null;
  }
}
