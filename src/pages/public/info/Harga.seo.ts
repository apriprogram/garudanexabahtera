// /harga (Lampiran A): menargetkan "harga template website". Angka harga template dan tahun hanya dari data (template,
// waktu build), tidak ditulis di sini; harga domain termurah dari src/lib/domainPricing.ts (domain tidak termasuk harga
// template sejak 2026-10-25). JSON-LD: WebPage + ItemList template + BreadcrumbList + FAQPage (teks = FAQ terlihat).
import { faqContext, faqItems, PRICING_FAQ_IDS } from '../../../content/faq';
import { minTemplatePrice, wibDate } from '../../../content/pricing';
import { DOMAIN_PRICE_FROM, rupiahCompact } from '../../../lib/domainPricing';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { formatPriceShort, latestDate } from '../../../seo/format';
import { breadcrumb, faqPage, itemList, webPage } from '../../../seo/jsonld';
import { pageHead, staticPage } from '../../../seo/page';
import { HUB_PATHS, templatePath } from '../../../seo/paths';
import { publishedTemplates } from '../../../seo/templateSeo';
import type { SeoData } from '../../../seo/types';

/** Tanggal terakhir teks halaman /harga berubah (Harga.tsx, pricing.ts, FAQ-nya). Harga template ikut lastmod data. */
export const PRICING_UPDATED = '2026-10-25';

/** Tahun di judul: tahun data harga (WIB), supaya judul tidak basi saat tahun berganti. */
const priceYear = (data: SeoData): string => (wibDate(data.builtAt) ?? PRICING_UPDATED).slice(0, 4);

export function pricingTitle(data: SeoData): string {
  return `Harga Template Website & Jasa Website ${priceYear(data)}${TITLE_SUFFIX}`;
}

/** Meta description ≤155 karakter: harga termurah dari data, isi harga tanpa domain, domain & perpanjangan tercantum. */
export function pricingDescription(data: SeoData): string {
  const min = minTemplatePrice(publishedTemplates(data));
  const domain = `domain mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun`;
  return min
    ? `Harga template website Garuda Nexa mulai ${formatPriceShort(min)}, termasuk hosting & SSL tahun pertama; ${domain}. Lengkap dengan biaya perpanjangan.`
    : `Harga template website Garuda Nexa, termasuk hosting & SSL tahun pertama; ${domain}. Lengkap dengan biaya perpanjangan per tahun.`;
}

export default staticPage({
  path: HUB_PATHS.pricing,
  updated: PRICING_UPDATED,
  // Harga ikut berubah saat template diperbarui
  lastmod: (data) => latestDate([PRICING_UPDATED, ...publishedTemplates(data).map((t) => t.updated_at)]) ?? PRICING_UPDATED,
  head: (data) => {
    const templates = publishedTemplates(data);
    const description = pricingDescription(data);
    return pageHead(data, {
      path: HUB_PATHS.pricing,
      title: pricingTitle(data),
      description,
      ogImage: 'harga',
      ogImageAlt: 'Harga template website dan jasa pembuatan website Garuda Nexa',
      jsonLd: [
        webPage({ path: HUB_PATHS.pricing, name: 'Harga template website & jasa pembuatan website', description, dateModified: PRICING_UPDATED }),
        ...(templates.length
          ? [itemList({ path: HUB_PATHS.pricing, name: 'Harga template website', items: templates.map((t) => ({ name: t.name, path: templatePath(t.slug) })) })]
          : []),
        breadcrumb([
          { name: 'Beranda', path: '/' },
          { name: 'Harga', path: HUB_PATHS.pricing },
        ]),
        faqPage({ path: HUB_PATHS.pricing, items: faqItems(PRICING_FAQ_IDS, faqContext(templates)) }),
      ],
    });
  },
});
