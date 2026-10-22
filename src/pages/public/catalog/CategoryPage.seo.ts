// /template/kategori/{slug}: halaman kategori (STUB WP1, noindex sampai WP5 mengisi halamannya).
// Slug di luar CATEGORY_SLUGS → head null → kepala 404.
import { stubHead } from '../../../seo/defaults';
import { CATEGORY_PREFIX, isCategorySlug } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';
import { CATEGORY_STUBS } from './categoryStub';

const PATTERN = /^\/template\/kategori\/([^/]+)$/;

const seo: PageSeo = {
  match: (pathname) => pathname.startsWith(CATEGORY_PREFIX) && PATTERN.test(pathname),
  head: (pathname) => {
    const slug = pathname.match(PATTERN)?.[1] ?? '';
    if (!isCategorySlug(slug)) return null;
    const category = CATEGORY_STUBS[slug];
    return stubHead({
      title: category.title,
      description: `${category.heading} siap pakai dari Garuda Nexa, sudah termasuk domain, hosting, dan SSL tahun pertama.`,
    });
  },
};

export default seo;
