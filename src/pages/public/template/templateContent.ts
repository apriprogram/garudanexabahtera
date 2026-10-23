// Isi panjang halaman /template/{slug} (src/content/templates/{slug}.content.ts, docs/platform/SEO-PLAN.md §5.5) untuk
// chunk halaman detail template. Dimuat eager di sini, bukan di bundel utama: isinya ikut HTML prerender dan tersedia
// saat hidrasi tanpa request tambahan. Template baru tanpa file isi → null (halaman memakai deskripsi DB).
import { fillName, templateNicheText } from '../../../content/templateCopy';
import type { TemplatePageContent } from '../../../content/templates/page.types';
import type { Template } from '../../../types/platform';

type ContentModule = { content?: TemplatePageContent };

const modules = import.meta.glob<ContentModule>('../../../content/templates/*.content.ts', { eager: true });

const CONTENT: Readonly<Record<string, TemplatePageContent>> = Object.fromEntries(
  Object.entries(modules)
    .map(([file, mod]) => [file.replace(/^.*\/([^/]+)\.content\.ts$/, '$1'), mod?.content] as const)
    .filter((entry): entry is readonly [string, TemplatePageContent] => Boolean(entry[1]) && typeof entry[1] === 'object'),
);

/** Isi halaman untuk slug ini, atau null bila belum ditulis. */
export const templateContent = (slug: string): TemplatePageContent | null => CONTENT[slug] ?? null;

/** Slug yang punya file isi (untuk tes). */
export const TEMPLATE_CONTENT_SLUGS: readonly string[] = Object.keys(CONTENT).sort();

const fileName = (src: string) => src.split(/[?#]/, 1)[0].replace(/^.*\//, '');

/**
 * Alt deskriptif setiap gambar galeri: dari salinan per nama file, selain itu "Tampilan template website {niche}
 * {Nama}" (gambar pertama = beranda) dengan nomor gambar.
 */
export function galleryAlts(template: Template, images: readonly string[], content: TemplatePageContent | null): string[] {
  const niche = templateNicheText(template);
  return images.map((src, i) => {
    const copy = content?.imageAlts[fileName(src)];
    if (copy) return fillName(copy, template);
    if (i === 0) return `Tampilan beranda template website ${niche} ${template.name}`;
    return `Tampilan template website ${niche} ${template.name}, gambar ${i + 1} dari ${images.length}`;
  });
}
