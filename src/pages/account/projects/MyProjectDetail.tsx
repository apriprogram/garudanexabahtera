// Detail proyek (/akun/proyek/:id): stage stepper, progress, approvals needed, documents, invoices, receipts
// (docs/platform/PROJECT-DOCS-SPEC.md §7). FOUNDATION STUB: the Customer UI owner replaces this page; keep the default export.
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness } from 'lucide-react';
import { EmptyState } from '../components/States';

export default function MyProjectDetail() {
  const { id } = useParams();
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <Link to="/akun/proyek" className="link-site inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Proyek saya
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">Detail proyek</h1>
      <EmptyState
        className="mt-6"
        icon={<BriefcaseBusiness className="h-6 w-6" aria-hidden />}
        title="Segera hadir"
        description={`Dokumen dan pembayaran proyek #${id ?? ''} akan tampil di sini.`}
      />
    </div>
  );
}
