import type { TemplateDefinition } from '../types';
import { companyProfileSections } from '../shared/schema';
import StartupClean from './StartupClean';
import { startupCleanContent } from './defaultContent';

export const startupClean: TemplateDefinition = {
  code: 'startup-clean',
  name: 'Startup Clean',
  // Desain premium 2026-10 (docs/platform/TEMPLATE-DESIGN.md §2.1): strip logo klien + simbol bawaan di header
  sections: companyProfileSections(
    { servicesLabel: 'Layanan', serviceItemLabel: 'Layanan' },
    { clients: { titlePlaceholder: 'mis. Dipakai 12.000+ UMKM di seluruh Indonesia' }, brandMark: true },
  ),
  defaultContent: startupCleanContent,
  Component: StartupClean,
};
