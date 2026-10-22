// STUB fondasi (2026-10-22): skema CMS Finova sementara = skema Company Profile bersama, agar CMS, demo, dan uji
// registry langsung jalan. Engineer Finova MENGGANTI file ini dengan skema sendiri (`brand.highlight_color`,
// section `product`, `faq`, tautan footer & unduh aplikasi, dst.) sesuai docs/platform/TEMPLATE-BRIEFS-2026-10.md §3.4.
import { companyProfileSections } from '../shared/schema';
import type { TemplateSection } from '../types';

export const finovaSections: TemplateSection[] = companyProfileSections(
  { servicesLabel: 'Fitur', serviceItemLabel: 'Fitur' },
  { clients: { label: 'Mitra & afiliasi', titlePlaceholder: 'mis. Bekerja sama dengan mitra pembayaran tepercaya' }, brandMark: true },
);
