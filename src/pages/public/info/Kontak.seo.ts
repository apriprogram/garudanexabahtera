// /kontak (STUB WP1, noindex sampai WP6 mengisi halamannya).
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { stubHead } from '../../../seo/defaults';
import { HUB_PATHS } from '../../../seo/paths';
import type { PageSeo } from '../../../seo/types';

const seo: PageSeo = {
  match: (pathname) => pathname === HUB_PATHS.contact,
  head: () =>
    stubHead({
      title: `Kontak ${COMPANY_FACTS.name}: WhatsApp & Email`,
      description: `Hubungi ${COMPANY_FACTS.name} lewat WhatsApp atau ${COMPANY_FACTS.email} untuk tanya template, konsultasi website & aplikasi custom gratis.`,
    }),
};

export default seo;
