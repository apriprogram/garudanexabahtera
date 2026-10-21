// Proyek saya (/akun/proyek): project cards with stage, progress and "Perlu tindakan" count
// (docs/platform/PROJECT-DOCS-SPEC.md §7). FOUNDATION STUB: the Customer UI owner replaces this page; keep the default export.
import { FolderKanban } from 'lucide-react';
import { EmptyState } from '../components/States';

export default function MyProjects() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">Proyek saya</h1>
      <p className="mt-1.5 text-sm text-muted sm:text-base">Pantau dokumen, persetujuan, dan pembayaran proyek website atau aplikasi Anda.</p>
      <EmptyState
        className="mt-6"
        icon={<FolderKanban className="h-6 w-6" aria-hidden />}
        title="Segera hadir"
        description="Halaman proyek Anda sedang kami siapkan."
      />
    </div>
  );
}
