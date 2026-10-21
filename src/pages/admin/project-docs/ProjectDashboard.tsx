// Dashboard proyek (/admin/proyek): stats, stage pipeline, projects, approvals, due invoices, activity
// (docs/platform/PROJECT-DOCS-SPEC.md §7). FOUNDATION STUB: the Admin UI owner replaces this page; keep the default export.
import { FolderKanban } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../../../components/admin/ui';

export default function ProjectDashboard() {
  return (
    <div className="pb-10">
      <PageHeader title="Dashboard proyek" description="Pantau tahapan, dokumen, persetujuan, dan pembayaran semua proyek custom kamu." />
      <Panel>
        <EmptyState icon={FolderKanban} title="Segera hadir" description="Dashboard proyek sedang disiapkan." />
      </Panel>
    </div>
  );
}
