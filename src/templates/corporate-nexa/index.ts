import type { TemplateDefinition } from '../types';
import { companyProfileSections } from '../shared/schema';
import CorporateNexa from './CorporateNexa';
import { corporateNexaContent } from './defaultContent';

export const corporateNexa: TemplateDefinition = {
  code: 'corporate-nexa',
  name: 'Corporate Nexa',
  // Field/section desain premium (strip logo klien, gambar kedua Tentang, foto latar CTA) opsional & bertanda
  // `introduced`: situs pembeli lama tidak mendapat isi demo (lihat shared/compat.ts).
  sections: companyProfileSections(
    { servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' },
    {
      clients: { titlePlaceholder: 'mis. Dipercaya perusahaan konstruksi, properti, dan industri' },
      aboutSecondImage: true,
      ctaImage: true,
      brandMark: true,
    },
  ),
  defaultContent: corporateNexaContent,
  Component: CorporateNexa,
};
