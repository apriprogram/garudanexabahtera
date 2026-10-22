// Proyek saya (/akun/proyek): the custom projects of the client records linked to this account (pd_my_projects),
// as cards with code, service, stage, progress, the "Perlu tindakan" count (documents waiting for the client's
// approval) and the next invoice due (docs/platform/PROJECT-DOCS-SPEC.md §7 Customer).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleAlert, FolderKanban, LayoutTemplate, MessageCircle, RefreshCw } from 'lucide-react';
import { pdMyProjects } from '../../../features/project-docs/api';
import type { ProjectSummary } from '../../../features/project-docs/types';
import { ApiError, errorMessage } from '../../../lib/api';
import { formatRupiah, formatTanggal } from '../../../types/platform';
import { Notice } from '../components/Notice';
import { useDocumentTitle } from '../components/payment';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { ProgressBar, TonePill } from './components/ProjectParts';
import { SERVICE_ICON, stageLabel } from './components/projectCopy';
import { useScrollReset } from './components/useScrollReset';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; projects: ProjectSummary[] };

const fetchProjects = () => pdMyProjects().then((res) => (Array.isArray(res.projects) ? res.projects : []));

const loadErrorMessage = (err: unknown) =>
  err instanceof ApiError && err.code === 'NETWORK' ? err.message : errorMessage(err, 'Daftar proyek belum bisa dimuat. Silakan coba lagi.');

export default function MyProjects() {
  useDocumentTitle('Proyek saya');
  useScrollReset();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProjects()
      .then((projects) => alive && setState({ status: 'ready', projects }))
      .catch((err: unknown) => alive && setState({ status: 'error', message: loadErrorMessage(err) }));
    return () => {
      alive = false;
    };
  }, []);

  /** Reload; once the list is shown a failure only shows a notice. */
  const refresh = async () => {
    const wasReady = state.status === 'ready';
    setRefreshing(true);
    setRefreshError(null);
    if (!wasReady) setState({ status: 'loading' });
    try {
      setState({ status: 'ready', projects: await fetchProjects() });
    } catch (err) {
      if (wasReady) setRefreshError(errorMessage(err, 'Gagal memuat ulang proyek.'));
      else setState({ status: 'error', message: loadErrorMessage(err) });
    } finally {
      setRefreshing(false);
    }
  };

  const projects = state.status === 'ready' ? state.projects : [];
  const pending = projects.reduce((sum, p) => sum + (p.pending_approvals || 0), 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl">Proyek saya</h1>
          <p className="mt-1.5 text-[14px] text-muted sm:text-base">Pantau dokumen, persetujuan, dan tagihan proyek website atau aplikasi Anda.</p>
        </div>
        {state.status === 'ready' && projects.length > 0 && (
          <button type="button" onClick={refresh} disabled={refreshing} className="btn btn-outline btn-sm shrink-0 self-start sm:self-auto">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Muat ulang
          </button>
        )}
      </header>

      {refreshError && (
        <Notice tone="danger" className="mt-5" onClose={() => setRefreshError(null)}>
          {refreshError}
        </Notice>
      )}

      {pending > 0 && (
        <Notice tone="warning" className="mt-5" title={`${pending} dokumen menunggu persetujuan Anda`}>
          Buka proyeknya untuk meninjau, menyetujui, atau meminta revisi.
        </Notice>
      )}

      <div className="mt-6 sm:mt-8" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="card-site space-y-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-9 w-32" />
              </div>
            ))}
          </div>
        )}

        {state.status === 'error' && <ErrorState title="Proyek belum bisa dimuat" message={state.message} onRetry={refresh} retrying={refreshing} />}

        {state.status === 'ready' && projects.length === 0 && (
          <EmptyState
            icon={<FolderKanban className="h-7 w-7" aria-hidden />}
            title="Belum ada proyek"
            description="Proyek website atau aplikasi custom Anda tampil di sini setelah tim kami menyiapkannya, lengkap dengan dokumen dan tagihannya."
            action={
              <>
                {/* Label glosarium "Pesan Custom" (versi panjang hanya di hero & /pesan-custom), tanpa panah (design.md) */}
                <Link to="/pesan-custom" className="btn btn-primary">
                  Pesan Custom
                </Link>
                <Link to="/#kontak" className="btn btn-outline">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Konsultasi Gratis
                </Link>
              </>
            }
          />
        )}

        {projects.length > 0 && (
          <ul className="grid gap-4 lg:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id} className="flex">
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const Icon = SERVICE_ICON[project.service_type] ?? LayoutTemplate;
  const path = `/akun/proyek/${project.id}`;
  const due = project.next_due;
  const action = project.pending_approvals || 0;

  return (
    <article className="card-site flex w-full flex-col p-5 sm:p-6" aria-labelledby={`project-${project.id}`}>
      <div className="flex gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-subtle">
            {project.code && <span className="font-mono tabular-nums">{project.code}</span>}
            {project.code && <span aria-hidden> · </span>}
            {project.service_label}
          </p>
          <h2 id={`project-${project.id}`} className="mt-0.5 text-base font-semibold leading-snug text-fg sm:text-lg">
            <Link to={path} className="hover:text-primary">
              {project.name}
            </Link>
          </h2>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TonePill view={{ label: stageLabel(project.stage), tone: project.stage === 'selesai' ? 'success' : 'brand' }} />
        {action > 0 && <TonePill view={{ label: `Perlu tindakan · ${action}`, tone: 'warning' }} />}
      </div>

      <ProgressBar value={project.progress} className="mt-4" />

      {due && (
        <p className={`mt-4 flex items-start gap-2 text-[13px] ${due.overdue ? 'text-danger-700' : 'text-muted'}`}>
          <CircleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${due.overdue ? '' : 'text-subtle'}`} aria-hidden />
          <span>
            {due.overdue ? 'Tagihan lewat jatuh tempo' : 'Tagihan berikutnya'}:{' '}
            <span className="font-semibold tabular-nums text-fg">{formatRupiah(due.remaining)}</span>, jatuh tempo {formatTanggal(due.due_date)}
          </span>
        </p>
      )}

      <div className="mt-auto pt-4">
        <div className="flex justify-end border-t border-line pt-4">
          <Link to={path} className={`btn btn-sm ${action > 0 ? 'btn-primary' : 'btn-outline'}`} aria-label={`${action > 0 ? 'Tinjau dokumen' : 'Lihat proyek'} ${project.name}`}>
            {action > 0 ? 'Tinjau dokumen' : 'Lihat proyek'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
