// /tentang. STUB WP1 (head noindex di Tentang.seo.ts); isinya dibuat WP6 dari COMPANY_FACTS.
import PageStub from '../../../components/layout/PageStub';
import { COMPANY_FACTS } from '../../../lib/companyFacts';

export default function Tentang() {
  return (
    <PageStub
      badge="Perusahaan"
      title={`Tentang ${COMPANY_FACTS.name}`}
      crumb="Tentang"
      intro={`${COMPANY_FACTS.name} (${COMPANY_FACTS.legalName}) menyediakan template website siap pakai serta jasa pembuatan website dan aplikasi mobile Android & iOS custom, untuk pelanggan di seluruh Indonesia secara online.`}
      whatsappMessage="Halo Admin, saya ingin mengenal Garuda Nexa lebih jauh."
    />
  );
}
