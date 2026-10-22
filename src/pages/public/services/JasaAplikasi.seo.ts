// /jasa-pembuatan-aplikasi-mobile (STUB WP1, noindex sampai WP6 mengisi halamannya).
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.mobileService,
  head: () =>
    stubHead({
      title: `Jasa Pembuatan Aplikasi Android & iOS${TITLE_SUFFIX}`,
      description:
        'Jasa pembuatan aplikasi mobile Android & iOS sesuai alur bisnis Anda. Konsultasi gratis via WhatsApp, lalu penawaran sesuai kebutuhan.',
    }),
};

export default seo;
