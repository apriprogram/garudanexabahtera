// Editor dokumen (/admin/proyek/:id/dokumen/:docId): sections editor, live A4 preview, approval, signing, export
// (docs/platform/PROJECT-DOCS-SPEC.md §7). FOUNDATION STUB: the Admin UI owner replaces this page; keep the default export.
import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../../../components/admin/ui';

export default function DocumentEditor() {
  const { id, docId } = useParams();
  return (
    <div className="pb-10">
      <PageHeader
        back={{ to: `/admin/proyek/${id ?? ''}`, label: 'Workspace proyek' }}
        title="Editor dokumen"
        description={`Susun, pratinjau, dan ajukan dokumen #${docId ?? ''} untuk disetujui klien.`}
      />
      <Panel>
        <EmptyState icon={FileText} title="Segera hadir" description="Editor dokumen sedang disiapkan." />
      </Panel>
    </div>
  );
}
