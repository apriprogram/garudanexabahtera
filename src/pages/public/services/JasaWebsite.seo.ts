// /jasa-pembuatan-website (STUB WP1, noindex sampai WP6 mengisi halamannya).
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.webService,
  head: () =>
    stubHead({
      title: `Jasa Pembuatan Website Company Profile${TITLE_SUFFIX}`,
      description:
        'Jasa pembuatan website custom untuk perusahaan, sekolah, instansi & UMKM. Konsultasi gratis, lalu penawaran sesuai kebutuhan Anda.',
    }),
};

export default seo;
