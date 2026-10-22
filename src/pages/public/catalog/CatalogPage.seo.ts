// /template: katalog template (STUB WP1, noindex sampai WP5 mengisi halamannya).
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.catalog,
  head: () =>
    stubHead({
      title: `Template Website Siap Pakai + Domain & Hosting${TITLE_SUFFIX}`,
      description:
        'Katalog template website siap pakai dari Garuda Nexa: harga jelas, lihat demo, bayar online, dan kelola isi website lewat CMS.',
    }),
};

export default seo;
