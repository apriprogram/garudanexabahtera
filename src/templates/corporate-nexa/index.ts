import type { TemplateDefinition } from '../types';
import { companyProfileSections } from '../shared/schema';
import CorporateNexa from './CorporateNexa';
import { corporateNexaContent } from './defaultContent';

export const corporateNexa: TemplateDefinition = {
  code: 'corporate-nexa',
  name: 'Corporate Nexa',
  sections: companyProfileSections({ servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' }),
  defaultContent: corporateNexaContent,
  Component: CorporateNexa,
};
