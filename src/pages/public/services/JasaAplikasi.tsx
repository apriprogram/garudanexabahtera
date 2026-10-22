// /jasa-pembuatan-aplikasi-mobile. STUB WP1 (head noindex di JasaAplikasi.seo.ts); isinya dibuat WP6.
import PageStub from '../../../components/layout/PageStub';
import { COMPANY_FACTS } from '../../../lib/companyFacts';

export default function JasaAplikasi() {
  return (
    <PageStub
      badge="Jasa"
      title="Jasa pembuatan aplikasi Android & iOS custom"
      documentTitle="Jasa pembuatan aplikasi mobile"
      crumb="Jasa pembuatan aplikasi mobile"
      intro={`Kami membuat aplikasi Android dan iOS sesuai alur bisnis Anda. ${COMPANY_FACTS.customPricing}`}
      whatsappMessage="Halo Admin, saya ingin konsultasi pembuatan aplikasi mobile Android/iOS."
    />
  );
}
