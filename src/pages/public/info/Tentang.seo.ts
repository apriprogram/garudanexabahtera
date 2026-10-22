// /tentang (STUB WP1, noindex sampai WP6 mengisi halamannya).
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { stubHead, TITLE_SUFFIX } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.about,
  head: () =>
    stubHead({
      title: `Tentang ${COMPANY_FACTS.legalName}${TITLE_SUFFIX}`,
      description: `${COMPANY_FACTS.legalName}: template website siap pakai serta jasa pembuatan website & aplikasi mobile custom di Indonesia.`,
    }),
};

export default seo;
