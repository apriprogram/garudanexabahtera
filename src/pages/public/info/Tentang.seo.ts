// /tentang (Lampiran A): AboutPage + Organization (otomatis dari pageHead) + BreadcrumbList. Hanya fakta COMPANY_FACTS.
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { TITLE_SUFFIX } from '../../../seo/defaults';
import { aboutPage, breadcrumb, ORGANIZATION_ID } from '../../../seo/jsonld';
import { pageHead, staticPage } from '../../../seo/page';
import { HUB_PATHS } from '../../../seo/paths';

/** Tanggal terakhir isi /tentang berubah (Tentang.tsx, COMPANY_FACTS). Ubah setiap kali isinya diubah. */
export const ABOUT_UPDATED = '2026-10-23';

export const ABOUT_DESCRIPTION = `${COMPANY_FACTS.legalName}: template website siap pakai serta jasa pembuatan website & aplikasi mobile custom di Indonesia. Kenali layanan dan cara kerja kami.`;

export default staticPage({
  path: HUB_PATHS.about,
  updated: ABOUT_UPDATED,
  head: (data) =>
    pageHead(data, {
      path: HUB_PATHS.about,
      title: `Tentang ${COMPANY_FACTS.legalName}${TITLE_SUFFIX}`,
      description: ABOUT_DESCRIPTION,
      ogImage: 'tentang',
      ogImageAlt: `Tentang ${COMPANY_FACTS.legalName}`,
      jsonLd: [
        aboutPage({ path: HUB_PATHS.about, name: `Tentang ${COMPANY_FACTS.name}`, description: ABOUT_DESCRIPTION, mainEntity: ORGANIZATION_ID, dateModified: ABOUT_UPDATED }),
        breadcrumb([
          { name: 'Beranda', path: '/' },
          { name: 'Tentang', path: HUB_PATHS.about },
        ]),
      ],
    }),
});
