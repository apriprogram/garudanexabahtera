// /demo/{slug}: pratinjau template dengan konten demo FIKTIF (docs/platform/SEO-PLAN.md §2): noindex,follow, tanpa
// canonical ke halaman lain, tanpa JSON-LD, tidak masuk sitemap. Kueri "contoh website {niche}" dipegang /template/{slug}.
import { TITLE_SUFFIX } from '../defaults';
import { templateCard } from '../og';
import { pageHead } from '../page';
import { demoPath } from '../paths';
import { findTemplate, templateImageAlt } from '../templateSeo';
import type { PageSeo } from '../types';

const PATTERN = /^\/demo\/([A-Za-z0-9-]+)$/;

const seo: PageSeo = {
  match: (pathname) => PATTERN.test(pathname),
  head: (pathname, data) => {
    const template = findTemplate(data, pathname.match(PATTERN)?.[1] ?? '');
    if (!template) return null;
    return pageHead(data, {
      path: demoPath(template.slug),
      robots: 'noindex,follow',
      title: `Demo ${template.name}${TITLE_SUFFIX}`,
      description: `Pratinjau template website ${template.name} dengan konten demo fiktif. Pesan templatenya di Garuda Nexa.`,
      ogImage: templateCard(template.slug),
      ogImageAlt: templateImageAlt(template),
    });
  },
};

export default seo;
