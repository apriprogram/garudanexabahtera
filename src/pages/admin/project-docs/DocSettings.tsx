// Pengaturan dokumen (/admin/proyek/pengaturan, admin only): company identity & signatory, bank accounts, numbering,
// tax, default payment terms, SLA defaults (docs/platform/PROJECT-DOCS-SPEC.md §7).
// FOUNDATION STUB: the Admin UI owner replaces this page; keep the default export.
import { FileCog } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../../../components/admin/ui';

export default function DocSettings() {
  return (
    <div className="pb-10">
      <PageHeader title="Pengaturan dokumen" description="Atur identitas perusahaan, penomoran, pajak, dan termin bawaan untuk semua dokumen proyek." />
      <Panel>
        <EmptyState icon={FileCog} title="Segera hadir" description="Pengaturan dokumen sedang disiapkan." />
      </Panel>
    </div>
  );
}
