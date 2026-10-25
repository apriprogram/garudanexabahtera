// Teks paket untuk halaman katalog, kategori dan template (docs/platform/SEO-PLAN.md §5.5, CONTENT-16). Daftar
// "Sudah termasuk" dari setting harga (getTemplatePricing, bawaan = COMPANY_FACTS); harga, rentang dan tanggal harga
// memakai helper bersama src/content/pricing.ts & usePriceDate (WP6), supaya sama dengan /harga dan beranda.
import { usePriceDate } from '../../../hooks/usePublishedTemplates';
import { formatDateId } from '../../../seo/format';

/** ["A", "B", "C"] → "A, B, dan C". */
export function joinList(items: readonly string[]): string {
  const list = items.map((item) => item.trim()).filter(Boolean);
  if (list.length <= 1) return list[0] ?? '';
  if (list.length === 2) return `${list[0]} dan ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, dan ${list[list.length - 1]}`;
}

/** Huruf pertama kecil, kecuali singkatan (SSL, CMS, ...). */
const lowerFirst = (text: string) => (/^[A-Z]{2,}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));

/**
 * "Harga template sudah termasuk template website + setup awal, hosting tahun pertama, …." (kosong bila daftar kosong).
 * Domain tidak termasuk sejak 2026-10-25; kalimat domainnya: TEMPLATE_PRICE_SUMMARY / domainPriceFrom (content/pricing.ts).
 */
export function includesSentence(includes: readonly string[], subject = 'Harga template'): string {
  const list = joinList(includes.map(lowerFirst));
  return list ? `${subject} sudah termasuk ${list}.` : '';
}

/** "23 Oktober 2026": tanggal data harga (waktu prerender saat hidrasi, hari ini untuk render biasa), zona WIB. */
export const usePriceDateLabel = (): string => formatDateId(usePriceDate());
