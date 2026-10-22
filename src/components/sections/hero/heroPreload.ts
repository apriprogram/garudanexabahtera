// Gambar terbesar di atas lipatan beranda (kandidat LCP), untuk <link rel="preload" as="image"> di head beranda
// (src/seo/pages/home.seo.ts). Dihitung dari data yang sama dengan yang dirender Hero (setting + get_templates), jadi
// URL-nya persis sama dengan <img> di HTML prerender. docs/platform/SEO-PLAN.md §5.7 (WP7).
import type { SiteSettings } from '../../../hooks/useSiteSettings';
import { parseHeroBackground } from './heroBgConfig';
import { firstShowcaseImage } from './showcase';

/**
 * - latar Gambar: gambar pertama slider latar (memenuhi seluruh hero, HeroMedia memuatnya eager + fetchpriority high);
 * - latar Video dengan poster: posternya (tampil sampai video berjalan);
 * - selain itu (kanvas bawaan, video tanpa poster): slide pertama tayangan template di kanan hero (HeroShowcase).
 */
export function heroPreloadImage(settings: Record<string, unknown>, templates: unknown): string | undefined {
  // Respons get_settings berisi string (sama dengan yang dibaca useSiteSettings); nilai lain ditolak parseHeroBackground
  const background = parseHeroBackground(settings as SiteSettings);
  if (background.mode === 'image') return background.images[0];
  if (background.mode === 'video' && background.poster) return background.poster;
  return firstShowcaseImage(templates);
}
