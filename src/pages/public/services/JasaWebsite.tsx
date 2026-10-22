// /jasa-pembuatan-website. STUB WP1 (head noindex di JasaWebsite.seo.ts); isinya dibuat WP6.
import PageStub from '../../../components/layout/PageStub';
import { COMPANY_FACTS } from '../../../lib/companyFacts';

export default function JasaWebsite() {
  return (
    <PageStub
      badge="Jasa"
      title="Jasa pembuatan website custom untuk bisnis & instansi"
      documentTitle="Jasa pembuatan website"
      crumb="Jasa pembuatan website"
      intro={`Kami membuat website custom sesuai kebutuhan bisnis atau instansi Anda. ${COMPANY_FACTS.customPricing}`}
      whatsappMessage="Halo Admin, saya ingin konsultasi pembuatan website custom."
    />
  );
}
