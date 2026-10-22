// /panduan (STUB WP1, noindex sampai WP8 mengisi halamannya).
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.guides,
  head: () =>
    stubHead({
      title: `Panduan Membuat Website untuk Bisnis${TITLE_SUFFIX}`,
      description: 'Panduan praktis membuat website untuk bisnis dari Garuda Nexa: biaya, domain & hosting, dan memilih template atau jasa custom.',
    }),
};

export default seo;
