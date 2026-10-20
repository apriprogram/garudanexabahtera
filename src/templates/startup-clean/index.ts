import type { TemplateDefinition } from '../types';
import { companyProfileSections } from '../shared/schema';
import StartupClean from './StartupClean';
import { startupCleanContent } from './defaultContent';

export const startupClean: TemplateDefinition = {
  code: 'startup-clean',
  name: 'Startup Clean',
  sections: companyProfileSections({ servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' }),
  defaultContent: startupCleanContent,
  Component: StartupClean,
};
