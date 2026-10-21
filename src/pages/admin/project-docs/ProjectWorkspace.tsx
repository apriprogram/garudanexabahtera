// Workspace proyek (/admin/proyek/:id): Ringkasan, Dokumen, Jadwal, Invoice & pembayaran, Aktivitas
// (docs/platform/PROJECT-DOCS-SPEC.md §7). FOUNDATION STUB: the Admin UI owner replaces this page; keep the default export.
import { useParams } from 'react-router-dom';
import { BriefcaseBusiness } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../../../components/admin/ui';

export default function ProjectWorkspace() {
  const { id } = useParams();
  return (
    <div className="pb-10">
      <PageHeader
        back={{ to: '/admin/proyek', label: 'Dashboard proyek' }}
        title="Workspace proyek"
        description={`Semua dokumen, jadwal, dan pembayaran proyek #${id ?? ''} di satu tempat.`}
      />
      <Panel>
        <EmptyState icon={BriefcaseBusiness} title="Segera hadir" description="Workspace proyek sedang disiapkan." />
      </Panel>
    </div>
  );
}
