// Gambar Open Graph host utama (docs/platform/SEO-PLAN.md §5.3, keputusan default 7).
// Kartu 1200×630 JPG dibuat sekali oleh `node scripts/seo/og-images.mjs`, di-commit di public/og/, dan daftarnya ditulis
// skrip itu ke ogCards.generated.ts. Kartu yang belum dibuat (mis. template yang baru terbit) → default.jpg.
// Modul murni, aman diimpor dari *.seo.ts, prerender dan skrip Node.
import { COMPANY_FACTS } from '../lib/companyFacts';
import { OG_CARDS } from './ogCards.generated';
import { SITE_ORIGIN, absoluteUrl } from './paths';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_DIR = '/og/';

/** Kartu halaman hub (nama file tanpa .jpg). Kartu per template: `template-{slug}`, per kategori: `kategori-{slug}`. */
export const HUB_CARDS = ['default', 'catalog', 'jasa-website', 'jasa-aplikasi', 'harga', 'panduan', 'tentang', 'kontak'] as const;
export type HubCard = (typeof HUB_CARDS)[number];

export const templateCard = (slug: string) => `template-${slug}`;
export const categoryCard = (slug: string) => `kategori-${slug}`;

const GENERATED: ReadonlySet<string> = new Set(OG_CARDS);

/** true bila public/og/{name}.jpg sudah dibuat skrip (tercatat di ogCards.generated.ts). */
export const hasOgCard = (name: string): boolean => GENERATED.has(name);

/** URL absolut kartu OG; kartu yang belum ada → kartu default. */
export const ogCardUrl = (name: string): string => absoluteUrl(`${OG_DIR}${hasOgCard(name) ? name : 'default'}.jpg`);

/**
 * Nilai `ogImage` untuk head: nama kartu ("harga", "template-aura-studio"), path situs ("/assets/x.jpg") atau URL
 * absolut. Nama kartu yang tidak dikenal dan nilai kosong → kartu default.
 */
export function resolveOgImage(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return ogCardUrl('default');
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/')) return absoluteUrl(v);
  return ogCardUrl(v);
}

/** true bila URL gambar adalah kartu 1200×630 buatan skrip (dimensinya pasti, jadi boleh ditulis di og:image:width). */
export const isOgCardUrl = (url: string): boolean => url.startsWith(`${SITE_ORIGIN}${OG_DIR}`) && url.endsWith('.jpg');

export const DEFAULT_OG_ALT = `${COMPANY_FACTS.name}: template website siap pakai serta jasa pembuatan website dan aplikasi mobile`;
