// /kontak (Lampiran A): ContactPage + Organization.contactPoint (otomatis dari pageHead) + BreadcrumbList.
// Deskripsi memakai nomor & email dari COMPANY_FACTS (sama dengan bawaan setting Footer).
import { COMPANY_FACTS } from '../../../lib/companyFacts';
import { displayPhone } from '../../../hooks/useSiteSettings';
import { breadcrumb, contactPage, ORGANIZATION_ID } from '../../../seo/jsonld';
import { pageHead, staticPage } from '../../../seo/page';
import { HUB_PATHS } from '../../../seo/paths';

/** Tanggal terakhir isi /kontak berubah (Kontak.tsx, kontak di COMPANY_FACTS). */
export const CONTACT_UPDATED = '2026-10-23';

export const CONTACT_DESCRIPTION = `Hubungi ${COMPANY_FACTS.name} lewat WhatsApp ${displayPhone(COMPANY_FACTS.whatsapp)} atau ${COMPANY_FACTS.email} untuk tanya template, konsultasi website & aplikasi custom gratis.`;

export default staticPage({
  path: HUB_PATHS.contact,
  updated: CONTACT_UPDATED,
  head: (data) =>
    pageHead(data, {
      path: HUB_PATHS.contact,
      // Lampiran A menyebut "& Alamat"; alamat belum ada (null), jadi judul tidak menjanjikannya
      title: `Kontak ${COMPANY_FACTS.name}: WhatsApp & Email`,
      description: CONTACT_DESCRIPTION,
      ogImage: 'kontak',
      ogImageAlt: `Kontak ${COMPANY_FACTS.name}`,
      jsonLd: [
        contactPage({ path: HUB_PATHS.contact, name: `Hubungi ${COMPANY_FACTS.name}`, description: CONTACT_DESCRIPTION, mainEntity: ORGANIZATION_ID, dateModified: CONTACT_UPDATED }),
        breadcrumb([
          { name: 'Beranda', path: '/' },
          { name: 'Kontak', path: HUB_PATHS.contact },
        ]),
      ],
    }),
});
