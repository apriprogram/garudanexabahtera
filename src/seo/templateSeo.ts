// Judul, deskripsi, gambar dan kategori halaman template /template/{slug} (docs/platform/SEO-PLAN.md §5.3, Lampiran A).
//
// Sumber teks, berurutan:
// 1. `export const seo: TemplateSeoCopy` di src/content/templates/{slug}.ts (milik WP5) bila ada. Simpan file itu
//    kecil (hanya teks SEO): semua file src/content/templates/{slug}.ts dimuat eager di bundel utama lewat glob di bawah.
//    Isi panjang halaman taruh di file lain dengan titik di namanya (mis. {slug}.content.ts), yang tidak ikut glob ini.
// 2. Pola cadangan Lampiran A.1/A.2 dari kolom DB (nama, kategori, short_description, harga).
// Harga SELALU dari data (DB/API): teks salinan memakai token {harga} / {harga_singkat}, tidak menulis angka sendiri.
import type { Template } from '../types/platform';
import { collapseSpace, firstThatFits, formatPriceFull, formatPriceShort, isPrice, sentence } from './format';
import { isCategorySlug, type CategorySlug } from './paths';
import type { SeoData } from './types';

/** Teks SEO opsional per template (src/content/templates/{slug}.ts → `export const seo`). */
export interface TemplateSeoCopy {
  /** <title> ≤ 60 karakter. Token: {nama}, {harga} ("Rp1.390.000"), {harga_singkat} ("Rp1,39 jt"), {kategori}. */
  title?: string;
  /** Meta description ≤ 155 karakter, token sama dengan title. */
  description?: string;
  /** Niche untuk judul cadangan dan alt gambar, mis. "Klinik & Salon". Bawaan: kategori DB. */
  niche?: string;
}

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

type CopyModule = { seo?: TemplateSeoCopy };

const copyModules = import.meta.glob<CopyModule>(['../content/templates/*.ts', '!../content/templates/*.*.ts'], { eager: true });

/** Salinan SEO per slug dari src/content/templates/{slug}.ts. */
export const TEMPLATE_COPY: Readonly<Record<string, TemplateSeoCopy>> = Object.fromEntries(
  Object.entries(copyModules)
    .map(([file, mod]) => [file.replace(/^.*\/([^/]+)\.ts$/, '$1'), mod?.seo] as const)
    .filter((entry): entry is readonly [string, TemplateSeoCopy] => Boolean(entry[1]) && typeof entry[1] === 'object'),
);

/** Template terbit untuk slug ini (dari get_template per slug, lalu daftar get_templates), atau null. */
export function findTemplate(data: Pick<SeoData, 'templates' | 'templateBySlug'>, slug: string): Template | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  const bySlug = data.templateBySlug?.[key];
  const found = bySlug && bySlug.slug === key ? bySlug : (data.templates ?? []).find((t) => t?.slug === key);
  return found && found.status !== 'draft' ? found : null;
}

/** Template terbit dengan slug yang sah, urut seperti di API. */
export function publishedTemplates(data: Pick<SeoData, 'templates'>): Template[] {
  return (data.templates ?? []).filter((t) => t && t.status !== 'draft' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug));
}

/** "Kecantikan & Klinik" → "kecantikan-klinik" bila slug itu halaman kategori yang dikenal (paths.ts), selain itu null. */
export function categorySlugOf(category: string | null | undefined): CategorySlug | null {
  const slug = String(category ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return isCategorySlug(slug) ? slug : null;
}

const fill = (text: string | undefined, template: Template): string | undefined => {
  if (!text) return undefined;
  const price = isPrice(template.price);
  if (!price && /\{harga(_singkat)?\}/.test(text)) return undefined;
  return collapseSpace(
    text
      .replace(/\{nama\}/g, template.name)
      .replace(/\{kategori\}/g, template.category)
      .replace(/\{harga_singkat\}/g, price ? formatPriceShort(template.price) : '')
      .replace(/\{harga\}/g, price ? formatPriceFull(template.price) : ''),
  );
};

/** Niche untuk judul: salinan WP5, lalu kategori DB, lalu "Siap Pakai". */
export const templateNiche = (template: Template): string =>
  collapseSpace(TEMPLATE_COPY[template.slug]?.niche || template.category || 'Siap Pakai');

/**
 * <title> halaman template (Lampiran A.2, tanpa akhiran "| Garuda Nexa"):
 * "{Nama}: Template Website {Niche} – Rp1,39 jt", dipendekkan bertahap sampai ≤ 60 karakter.
 */
export function templateTitle(template: Template): string {
  const copy = fill(TEMPLATE_COPY[template.slug]?.title, template);
  const { name } = template;
  const niche = templateNiche(template);
  const price = isPrice(template.price) ? ` – ${formatPriceShort(template.price)}` : '';
  return firstThatFits(
    [
      copy,
      `${name}: Template Website ${niche}${price}`,
      `${name}: Template ${niche}${price}`,
      price && `${name}: Template Website${price}`,
      `${name}: Template Website ${niche}`,
      `${name}: Template ${niche}`,
      `${name}: Template Website`,
      name.slice(0, TITLE_MAX),
    ],
    TITLE_MAX,
  );
}

/** true bila template punya demo yang bisa dibuka (/demo/{slug} atau demo_url). */
const hasDemo = (template: Template): boolean => Boolean(template.template_code || template.demo_url);

/**
 * Meta description halaman template (Lampiran A.1): "{Manfaat/niche}. Rp{harga} sudah termasuk domain, hosting & SSL
 * tahun pertama. Kelola isi lewat CMS. Lihat demo." ≤ 155 karakter; bagian yang tidak muat dibuang bertahap.
 */
export function templateDescription(template: Template): string {
  const copy = fill(TEMPLATE_COPY[template.slug]?.description, template);
  const niche = templateNiche(template).toLowerCase();
  const lead = template.short_description ? sentence(template.short_description) : '';
  const named = `${template.name}: template website ${niche} siap pakai.`;
  const generic = `Template website ${niche} siap pakai.`;
  const demo = hasDemo(template) ? ' Lihat demo.' : '';
  const includes = isPrice(template.price)
    ? `${formatPriceFull(template.price)} sudah termasuk domain, hosting & SSL tahun pertama.`
    : 'Sudah termasuk domain, hosting & SSL tahun pertama.';
  const full = ` ${includes} Kelola isi lewat CMS.${demo}`;
  const short = ` ${includes}${demo}`;
  const bare = ` ${includes}`;
  return firstThatFits(
    [copy, lead && lead + full, lead && lead + short, named + full, generic + full, named + short, generic + short, generic + bare],
    DESCRIPTION_MAX,
  );
}

const RASTER = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i;

/** Gambar raster template (pratinjau dulu, lalu galeri) sebagai path situs/URL; SVG dilewati (tidak didukung Google). */
export function templateRasterImages(template: Template): string[] {
  const list = [template.preview_image, ...(template.gallery ?? [])].filter(
    (src): src is string => typeof src === 'string' && src.trim() !== '' && RASTER.test(src.trim()),
  );
  return Array.from(new Set(list.map((src) => src.trim())));
}

/** Alt gambar OG / pratinjau template. */
export const templateImageAlt = (template: Template): string =>
  `Tampilan template website ${template.name}${template.category ? ` (${template.category})` : ''} dari Garuda Nexa`;
