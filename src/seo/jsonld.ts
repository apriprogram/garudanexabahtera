// Builder JSON-LD schema.org host utama (docs/platform/SEO-PLAN.md §2, §5.3 langkah 6).
//
// Aturan:
// - Node saling merujuk lewat @id (organisasi, situs, halaman). Head memuat semua node dalam satu
//   <script type="application/ld+json"> berbentuk {"@context": "https://schema.org", "@graph": [...]} (head.ts).
// - Semua fakta perusahaan dari COMPANY_FACTS; field null tidak ditulis. sameAs hanya untuk profil nyata.
// - TANPA aggregateRating, review, LocalBusiness atau harga jasa custom (keputusan default 1, 3, 6).
// - Isi markup harus sama dengan yang terlihat di halaman (faqPage: teks pertanyaan & jawaban persis).
// Modul murni (tanpa React, tanpa DOM): dipakai *.seo.ts, prerender, dan skrip Node.
import { COMPANY_FACTS, type CompanyFacts } from '../lib/companyFacts';
import type { Template } from '../types/platform';
import { collapseSpace, isPrice } from './format';
import { SITE_ORIGIN, absoluteUrl } from './paths';

export type JsonLdNode = Record<string, unknown>;

export const SCHEMA_CONTEXT = 'https://schema.org';
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const LOGO_ID = `${SITE_ORIGIN}/#logo`;
/** PNG 512×512 (public/brand/logo-512.png, dibuat scripts/seo/og-images.mjs); Google minta logo ≥112 px. */
export const LOGO_URL = absoluteUrl('/brand/logo-512.png');
export const LOGO_SIZE = 512;

/** Rujukan ke node lain di graph. */
export const ref = (id: string): { '@id': string } => ({ '@id': id });

/** URL halaman (absolut, kanonis) dari path situs. */
const pageUrl = (path: string): string => absoluteUrl(path);

/** Telepon/WhatsApp E.164 dari angka berkode negara: "6285188009152" → "+6285188009152". */
const e164 = (digits: string): string => `+${digits.replace(/\D/g, '')}`;

/** Kunci setting profil sosial (Pengaturan website → Footer). "#" atau kosong = belum ada. */
export const SOCIAL_SETTING_KEYS = ['footer_instagram', 'footer_facebook', 'footer_linkedin', 'footer_tiktok', 'footer_youtube', 'footer_twitter'] as const;

/**
 * Profil dengan nama yang dipakai pihak lain (keputusan default 4): garudanexa.id dan akun @garudanexa tidak masuk sameAs
 * sampai pemilik memutuskan hubungannya.
 */
const UNRELATED_PROFILE = /(^|\.)garudanexa\.id$|^(www\.)?(instagram|tiktok|x|twitter|facebook|youtube)\.com\/@?garudanexa\/?$/i;

/** URL profil sosial resmi dari settings + COMPANY_FACTS.sameAs: hanya http(s) yang valid, tanpa duplikat. */
export function socialProfiles(settings: Record<string, unknown> = {}, facts: CompanyFacts = COMPANY_FACTS): string[] {
  const raw = [...SOCIAL_SETTING_KEYS.map((key) => settings[key]), ...facts.sameAs];
  const urls: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    const hostAndPath = `${url.hostname}${url.pathname}`.replace(/\/+$/, '');
    if (UNRELATED_PROFILE.test(url.hostname) || UNRELATED_PROFILE.test(hostAndPath)) continue;
    if (url.hostname.replace(/^www\./, '') === new URL(SITE_ORIGIN).hostname) continue;
    const href = url.href;
    if (!urls.includes(href)) urls.push(href);
  }
  return urls;
}

/** Organization (@id #organization): ada di setiap halaman yang diindeks. */
export function organization(settings: Record<string, unknown> = {}, facts: CompanyFacts = COMPANY_FACTS): JsonLdNode {
  const telephone = e164(facts.whatsapp);
  const node: JsonLdNode = {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: facts.name,
    legalName: facts.legalName,
    url: `${facts.url}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': LOGO_ID,
      url: LOGO_URL,
      contentUrl: LOGO_URL,
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      caption: facts.name,
    },
    image: ref(LOGO_ID),
    email: facts.email,
    telephone,
    areaServed: { '@type': 'Country', name: 'Indonesia' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone,
        email: facts.email,
        areaServed: facts.areaServed.countryCode,
        availableLanguage: [...facts.languages],
      },
    ],
  };
  const sameAs = socialProfiles(settings, facts);
  if (sameAs.length) node.sameAs = sameAs;
  if (facts.address) {
    node.address = {
      '@type': 'PostalAddress',
      streetAddress: facts.address.streetAddress,
      addressLocality: facts.address.locality,
      addressRegion: facts.address.region,
      postalCode: facts.address.postalCode,
      addressCountry: facts.address.country,
    };
  }
  if (facts.nib) node.identifier = { '@type': 'PropertyValue', propertyID: 'NIB', value: facts.nib };
  return node;
}

/** WebSite (@id #website): nama situs untuk Google, tanpa SearchAction (kotak pencarian sitelinks sudah dihentikan). */
export function website(facts: CompanyFacts = COMPANY_FACTS): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: facts.name,
    alternateName: [facts.legalName, new URL(facts.url).hostname],
    url: `${facts.url}/`,
    inLanguage: 'id-ID',
    publisher: ref(ORGANIZATION_ID),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

/** BreadcrumbList; urutan = urutan remah roti yang terlihat (Beranda dulu). @id = {url halaman terakhir}#breadcrumb. */
export function breadcrumb(items: readonly Crumb[]): JsonLdNode {
  const last = items[items.length - 1];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl(last?.path ?? '/')}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  };
}

export interface ProductOptions {
  /** Path halaman template, mis. /template/aura-studio. */
  path: string;
  /** URL gambar absolut (raster), yang pertama gambar utama. */
  images: readonly string[];
  description: string;
}

/**
 * Product + Offer (IDR) untuk halaman template (cuplikan produk & listing penjual Google). Harga dari DB.
 * Tanpa hasMerchantReturnPolicy: kebijakan pengembalian dana hanya untuk pesanan yang ditolak, bukan retur barang.
 */
export function product(template: Template, { path, images, description }: ProductOptions, facts: CompanyFacts = COMPANY_FACTS): JsonLdNode {
  const url = pageUrl(path);
  const node: JsonLdNode = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: template.name,
    description: collapseSpace(description),
    sku: template.slug,
    url,
    image: [...images],
    brand: { '@type': 'Brand', name: facts.name },
  };
  if (template.category) node.category = template.category;
  if (isPrice(template.price)) {
    node.offers = {
      '@type': 'Offer',
      url,
      price: template.price,
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: ref(ORGANIZATION_ID),
    };
  }
  return node;
}

export interface ServiceOptions {
  path: string;
  name: string;
  description: string;
  /** Jenis layanan, mis. "Pembuatan website". */
  serviceType: string;
}

/** Service untuk halaman jasa custom: penyedia = organisasi, area Indonesia, TANPA harga. */
export function service({ path, name, description, serviceType }: ServiceOptions): JsonLdNode {
  const url = pageUrl(path);
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name,
    description: collapseSpace(description),
    serviceType,
    url,
    provider: ref(ORGANIZATION_ID),
    areaServed: { '@type': 'Country', name: 'Indonesia' },
    availableLanguage: [...COMPANY_FACTS.languages],
  };
}

/** ItemList (mis. daftar template di katalog). @id = {url}#itemlist. */
export function itemList({ path, name, items }: { path: string; name: string; items: readonly Crumb[] }): JsonLdNode {
  const url = pageUrl(path);
  return {
    '@type': 'ItemList',
    '@id': `${url}#itemlist`,
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: pageUrl(item.path),
    })),
  };
}

export type WebPageType = 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage';

export interface WebPageOptions {
  type?: WebPageType;
  path: string;
  name: string;
  description: string;
  /** @id node utama halaman, mis. itemList(...)['@id']. */
  mainEntity?: string;
  /** YYYY-MM-DD */
  dateModified?: string;
}

/** WebPage / CollectionPage / AboutPage / ContactPage, bagian dari #website, dengan breadcrumb {url}#breadcrumb bila ada. */
export function webPage({ type = 'WebPage', path, name, description, mainEntity, dateModified }: WebPageOptions): JsonLdNode {
  const url = pageUrl(path);
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description: collapseSpace(description),
    inLanguage: 'id-ID',
    isPartOf: ref(WEBSITE_ID),
    ...(mainEntity ? { mainEntity: ref(mainEntity) } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
}

/** CollectionPage untuk katalog dan kategori (rencana §2). */
export const collectionPage = (options: Omit<WebPageOptions, 'type'>): JsonLdNode => webPage({ ...options, type: 'CollectionPage' });
export const aboutPage = (options: Omit<WebPageOptions, 'type'>): JsonLdNode => webPage({ ...options, type: 'AboutPage' });
export const contactPage = (options: Omit<WebPageOptions, 'type'>): JsonLdNode => webPage({ ...options, type: 'ContactPage' });

export interface ArticleAuthor {
  /** Person bila ada orang nyata; Organization ("Tim Garuda Nexa") sampai ada (keputusan default 5). */
  type: 'Person' | 'Organization';
  name: string;
  url?: string;
}

export interface ArticleOptions {
  path: string;
  headline: string;
  description: string;
  /** YYYY-MM-DD, sama dengan tanggal yang terlihat. */
  datePublished: string;
  dateModified: string;
  author: ArticleAuthor;
  /** URL gambar absolut. */
  image: string;
}

/** Article untuk /panduan/{slug}; penerbit = organisasi. */
export function article({ path, headline, description, datePublished, dateModified, author, image }: ArticleOptions): JsonLdNode {
  const url = pageUrl(path);
  const authorNode =
    author.type === 'Organization' && author.name === COMPANY_FACTS.name
      ? ref(ORGANIZATION_ID)
      : { '@type': author.type, name: author.name, ...(author.url ? { url: author.url } : {}) };
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline,
    description: collapseSpace(description),
    url,
    mainEntityOfPage: url,
    image: [image],
    datePublished,
    dateModified,
    inLanguage: 'id-ID',
    author: authorNode,
    publisher: ref(ORGANIZATION_ID),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQPage (opsional; Google tidak lagi menampilkan rich result FAQ, tetapi membantu mesin jawaban AI).
 * Teks harus sama persis dengan FAQ yang terlihat di halaman.
 */
export function faqPage({ path, items }: { path: string; items: readonly FaqItem[] }): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl(path)}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Satu dokumen JSON-LD untuk semua node halaman. */
export const jsonLdGraph = (nodes: readonly object[]): { '@context': string; '@graph': object[] } => ({
  '@context': SCHEMA_CONTEXT,
  '@graph': [...nodes],
});

/**
 * JSON untuk isi <script type="application/ld+json">: "<", ">", "&" dan pemisah baris U+2028/2029 di-escape sehingga
 * isi data tidak bisa menutup tag script. Hasilnya tetap JSON yang sah.
 */
export const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
