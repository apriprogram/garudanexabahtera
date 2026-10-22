// STUB fondasi (2026-10-22): skema CMS Aura Studio sementara = skema Company Profile bersama, agar CMS, demo, dan uji
// registry langsung jalan. Engineer Aura Studio MENGGANTI file ini dengan skema sendiri (section `featured`, `team`,
// field kategori/harga/jumlah di layanan, dst.) sesuai docs/platform/TEMPLATE-BRIEFS-2026-10.md §2.4.
import { companyProfileSections } from '../shared/schema';
import type { TemplateSection } from '../types';

export const auraStudioSections: TemplateSection[] = companyProfileSections(
  { servicesLabel: 'Perawatan', serviceItemLabel: 'Perawatan' },
  { clients: { label: 'Produk & mitra', titlePlaceholder: 'mis. Memakai produk perawatan pilihan' }, brandMark: true },
);
