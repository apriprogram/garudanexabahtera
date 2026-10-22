// /harga. STUB WP1 (head noindex di Harga.seo.ts); isinya dibuat WP6. Tanpa angka: harga hanya dari data template.
import PageStub from '../../../components/layout/PageStub';
import { COMPANY_FACTS } from '../../../lib/companyFacts';

export default function Harga() {
  return (
    <PageStub
      badge="Harga"
      title="Harga template website & jasa pembuatan website"
      documentTitle="Harga"
      crumb="Harga"
      intro={`Harga setiap template tertera di kartu template di beranda dan sudah termasuk domain, hosting, serta SSL tahun pertama. ${COMPANY_FACTS.customPricing}`}
      whatsappMessage="Halo Admin, saya ingin bertanya tentang harga di Garuda Nexa."
    />
  );
}
