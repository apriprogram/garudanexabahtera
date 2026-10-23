// Teks pendek per template untuk kartu, alt gambar dan H1 (docs/platform/SEO-PLAN.md §5.5, Lampiran A): `page` di
// src/content/templates/{slug}.ts, dengan cadangan dari kolom DB untuk template yang belum punya file salinan.
// Ikut bundel utama (kartu template di beranda), jadi hanya membaca file {slug}.ts yang kecil; isi panjang halaman ada
// di {slug}.content.ts (src/pages/public/template/templateContent.ts).
import type { Template } from '../types/platform';
import { collapseSpace } from '../seo/format';
import { templateNiche } from '../seo/templateSeo';
import { categoryOf } from './categories';
import type { TemplatePageCopy } from './templates/page.types';

type CopyModule = { page?: TemplatePageCopy };

const modules = import.meta.glob<CopyModule>(['./templates/*.ts', '!./templates/*.*.ts'], { eager: true });

/** `page` per slug dari src/content/templates/{slug}.ts. */
export const TEMPLATE_PAGES: Readonly<Record<string, TemplatePageCopy>> = Object.fromEntries(
  Object.entries(modules)
    .map(([file, mod]) => [file.replace(/^.*\/([^/]+)\.ts$/, '$1'), mod?.page] as const)
    .filter((entry): entry is readonly [string, TemplatePageCopy] => Boolean(entry[1]) && typeof entry[1] === 'object'),
);

/** Ganti token {nama} dengan nama template dari DB. */
export const fillName = (text: string, template: Pick<Template, 'name'>): string => collapseSpace(text.replace(/\{nama\}/g, template.name));

/** Niche dalam kalimat: salinan WP5, lalu niche halaman kategori, lalu kategori DB (huruf kecil), lalu "siap pakai". */
export function templateNicheText(template: Pick<Template, 'slug' | 'category'>): string {
  const copy = TEMPLATE_PAGES[template.slug]?.niche;
  if (copy) return copy;
  const meta = categoryOf(template.category);
  if (meta) return meta.niche;
  const category = collapseSpace(template.category || '');
  return category ? category.toLowerCase() : 'siap pakai';
}

/** H1 halaman template (Lampiran A): salinan WP5, selain itu "{Nama}: Template Website {Niche}" dari data DB. */
export function templateH1(template: Template): string {
  const copy = TEMPLATE_PAGES[template.slug]?.h1;
  return copy ? fillName(copy, template) : collapseSpace(`${template.name}: Template Website ${templateNiche(template)}`);
}

/** Alt gambar pratinjau utama (beranda template di desktop & HP), mis. untuk kartu katalog. */
export const templatePreviewAlt = (template: Pick<Template, 'slug' | 'name' | 'category'>): string =>
  `Tampilan beranda template website ${templateNicheText(template)} ${template.name}`;
