// STUB fondasi (2026-10-22): skema CMS Arena Club sementara = skema Company Profile bersama, agar CMS, demo, dan uji
// registry langsung jalan. Engineer Arena Club MENGGANTI file ini dengan skema sendiri (section tambahan `pricing`,
// `team`, `events`, field baru hero/about/services) sesuai docs/platform/TEMPLATE-BRIEFS-2026-10.md §1.4.
import { companyProfileSections } from '../shared/schema';
import type { TemplateSection } from '../types';

export const arenaClubSections: TemplateSection[] = companyProfileSections(
  { servicesLabel: 'Program', serviceItemLabel: 'Program' },
  { clients: { label: 'Mitra & sponsor', titlePlaceholder: 'mis. Didukung mitra dan sponsor klub' }, brandMark: true },
);
