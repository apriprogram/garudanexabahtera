// Klien (/admin/klien): clients CRUD, link to a customer account, project count
// (docs/platform/PROJECT-DOCS-SPEC.md §7). FOUNDATION STUB: the Admin UI owner replaces this page; keep the default export.
import { Building2 } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../../../components/admin/ui';

export default function ClientManager() {
  return (
    <div className="pb-10">
      <PageHeader title="Klien" description="Kelola data klien proyek dan akun yang mereka pakai untuk menyetujui dokumen." />
      <Panel>
        <EmptyState icon={Building2} title="Segera hadir" description="Halaman klien sedang disiapkan." />
      </Panel>
    </div>
  );
}
