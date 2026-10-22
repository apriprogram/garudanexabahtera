// Detail proyek (/akun/proyek/:id): stage stepper and progress, "Perlu persetujuan Anda", the sent documents (never
// drafts), invoices with status / due date / amount and PDF download, receipts, a short summary and the client-visible
// history (pd_my_project; docs/platform/PROJECT-DOCS-SPEC.md §7 Customer).
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  FolderKanban,
  History,
  Info,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Route,
  Signature,
  WalletCards,
} from 'lucide-react';
import { pdMyProject } from '../../../features/project-docs/api';
import {
  INVOICE_KIND_LABEL,
  MAINTENANCE_PERIOD_LABEL,
  MILESTONE_STATUS_LABEL,
  type Activity,
  type DocSummary,
  type InvoiceSummary,
  type Milestone,
  type MilestoneStatus,
  type ProjectDetail,
} from '../../../features/project-docs/types';
import { ApiError, errorMessage } from '../../../lib/api';
import { formatRupiah, formatTanggal } from '../../../types/platform';
import { Notice } from '../components/Notice';
import { useDocumentTitle } from '../components/payment';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { exportMyDocument } from './components/documents';
import { ProgressBar, SectionCard, StageStepper, TonePill } from './components/ProjectParts';
import {
  ACTIVITY_LABEL,
  SERVICE_ICON,
  docShortLabel,
  docStatusView,
  invoiceStatusView,
  isCancelled,
  isContractDoc,
  needsClientSignature,
  routeId,
  stageLabel,
  type ProjectFlash,
  type ProjectNavState,
  type Tone,
} from './components/projectCopy';
import { useScrollReset } from './components/useScrollReset';

type LoadState = { status: 'loading' } | { status: 'not_found' } | { status: 'error'; message: string } | { status: 'ready'; project: ProjectDetail };

const MILESTONE_TONE: Record<MilestoneStatus, Tone> = { belum_mulai: 'neutral', berjalan: 'brand', selesai: 'success', tertunda: 'warning' };
const ACTIVITY_PREVIEW = 6;

export default function MyProjectDetail() {
  const params = useParams();
  const id = routeId(params.id);
  const location = useLocation();
  const navigate = useNavigate();
  useScrollReset();
  const [state, setState] = useState<LoadState>(id ? { status: 'loading' } : { status: 'not_found' });
  const [refreshing, setRefreshing] = useState(false);
  const [flash, setFlash] = useState<ProjectFlash | null>(() => (location.state as ProjectNavState | null)?.flash ?? null);

  useDocumentTitle(state.status === 'ready' ? state.project.name : 'Detail proyek');

  // A flash from the previous page is shown once (not again after a reload)
  useEffect(() => {
    if ((location.state as ProjectNavState | null)?.flash) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  const fetchProject = useCallback(() => (id ? pdMyProject({ id }).then((res) => res.project) : Promise.reject(new ApiError('Proyek tidak ditemukan.', 404))), [id]);

  const toState = (err: unknown): LoadState =>
    err instanceof ApiError && err.status === 404
      ? { status: 'not_found' }
      : { status: 'error', message: errorMessage(err, 'Detail proyek belum bisa dimuat. Silakan coba lagi.') };

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchProject()
      .then((project) => alive && setState({ status: 'ready', project }))
      .catch((err: unknown) => alive && setState(toState(err)));
    return () => {
      alive = false;
    };
  }, [id, fetchProject]);

  const reload = async () => {
    const wasReady = state.status === 'ready';
    setRefreshing(true);
    if (!wasReady) setState({ status: 'loading' });
    try {
      setState({ status: 'ready', project: await fetchProject() });
    } catch (err) {
      if (wasReady) setFlash({ tone: 'danger', text: errorMessage(err, 'Gagal memuat ulang proyek.') });
      else setState(toState(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-4 sm:px-8 sm:pb-20 sm:pt-8">
      <Link to="/akun/proyek" className="btn btn-ghost btn-sm -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Proyek saya
      </Link>

      <div className="mt-3" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <DetailSkeleton />}
        {state.status === 'error' && <ErrorState title="Proyek belum bisa dimuat" message={state.message} onRetry={reload} retrying={refreshing} />}
        {state.status === 'not_found' && (
          <EmptyState
            icon={<FolderKanban className="h-7 w-7" aria-hidden />}
            title="Proyek tidak ditemukan"
            description="Proyek ini tidak ada di akun Anda. Periksa kembali tautannya atau buka daftar proyek Anda."
            action={
              <Link to="/akun/proyek" className="btn btn-primary">
                Kembali ke proyek saya
              </Link>
            }
          />
        )}
        {state.status === 'ready' && (
          <ProjectView project={state.project} flash={flash} onFlash={setFlash} refreshing={refreshing} onReload={reload} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Tampilan proyek ─────────────────────────── */

function ProjectView({
  project,
  flash,
  onFlash,
  refreshing,
  onReload,
}: {
  project: ProjectDetail;
  flash: ProjectFlash | null;
  onFlash: (flash: ProjectFlash | null) => void;
  refreshing: boolean;
  onReload: () => void;
}) {
  const Icon = SERVICE_ICON[project.service_type] ?? FolderKanban;
  // The backend never sends drafts to a client; filter anyway so a draft can never show up here
  const sent = project.documents.filter((d) => d.status !== 'draft');
  const pending = sent.filter((d) => d.status === 'menunggu_persetujuan');
  const contracts = sent.filter(isContractDoc);
  const receipts = sent.filter((d) => d.doc_type === 'receipt');
  const invoices = project.invoices.filter((i) => i.doc_status !== 'draft');

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            <Icon className="h-4 w-4 text-subtle" aria-hidden />
            {project.code && <span className="font-mono tabular-nums text-fg">{project.code}</span>}
            {project.code && <span aria-hidden>·</span>}
            {project.service_label}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg sm:text-4xl">{project.name}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <TonePill view={{ label: stageLabel(project.stage), tone: project.stage === 'selesai' ? 'success' : 'brand' }} />
            {pending.length > 0 && <TonePill view={{ label: `Perlu tindakan · ${pending.length}`, tone: 'warning' }} />}
          </div>
        </div>
        <button type="button" onClick={onReload} disabled={refreshing} className="btn btn-outline btn-sm self-start sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Muat ulang
        </button>
      </header>

      {flash && (
        <Notice tone={flash.tone} title={flash.title} className="mt-5" onClose={() => onFlash(null)}>
          {flash.text}
        </Notice>
      )}

      {pending.length > 0 && <PendingCard docs={pending} projectId={project.id} />}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0 space-y-5">
          <SectionCard title="Tahapan proyek" icon={<Route className="h-[18px] w-[18px]" aria-hidden />}>
            <StageStepper stage={project.stage} hasMaintenance={project.has_maintenance} />
            <ProgressBar value={project.progress} className="mt-5" />
            {project.milestones.length > 0 && <Milestones milestones={project.milestones} />}
          </SectionCard>
          <DocumentsCard docs={contracts} projectId={project.id} />
        </div>
        <div className="min-w-0 space-y-5">
          <InvoicesCard invoices={invoices} projectId={project.id} onFlash={onFlash} />
          {receipts.length > 0 && <ReceiptsCard receipts={receipts} projectId={project.id} onFlash={onFlash} />}
          <SummaryCard project={project} />
          <ActivityCard activity={project.activity} />
        </div>
      </div>
    </>
  );
}

const docPath = (projectId: number, docId: number) => `/akun/proyek/${projectId}/dokumen/${docId}`;

function PendingCard({ docs, projectId }: { docs: DocSummary[]; projectId: number }) {
  return (
    <section aria-labelledby="pending-title" className="mt-5 rounded-[24px] bg-warning-50 p-5 ring-1 ring-inset ring-warning/25 sm:p-6">
      <h2 id="pending-title" className="flex items-center gap-2 text-[15px] font-semibold text-fg sm:text-base">
        <FileCheck2 className="h-[18px] w-[18px] text-warning-700" aria-hidden />
        Perlu persetujuan Anda
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-warning-700">{docs.length}</span>
      </h2>
      <p className="mt-1 text-[13px] text-muted">Tinjau isinya, lalu setujui atau minta revisi. Dokumen kontrak sekaligus Anda tandatangani secara elektronik.</p>
      <ul className="mt-4 space-y-2">
        {docs.map((doc) => {
          const sign = needsClientSignature(doc.doc_type);
          return (
            <li key={doc.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{doc.title}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {docShortLabel(doc.doc_type)} · <span className="tabular-nums">{doc.number}</span>
                  {doc.submitted_at && <> · dikirim {formatTanggal(doc.submitted_at)}</>}
                </p>
              </div>
              <Link to={docPath(projectId, doc.id)} className="btn btn-primary btn-sm shrink-0 self-start sm:self-auto">
                {sign ? <Signature className="h-4 w-4" aria-hidden /> : <FileCheck2 className="h-4 w-4" aria-hidden />}
                {sign ? 'Tinjau & tandatangani' : 'Tinjau & setujui'}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Milestones({ milestones }: { milestones: Milestone[] }) {
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <CalendarRange className="h-4 w-4 text-subtle" aria-hidden />
        Jadwal pengerjaan
      </h3>
      <ol className="mt-3 divide-y divide-line">
        {sorted.map((m, i) => (
          <li key={m.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs tabular-nums text-subtle">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <p className="min-w-0 text-sm font-medium text-fg">{m.title}</p>
                <TonePill view={{ label: MILESTONE_STATUS_LABEL[m.status] ?? m.status, tone: MILESTONE_TONE[m.status] ?? 'neutral' }} />
              </div>
              <p className="mt-1 text-xs text-subtle">
                {m.start_date || m.due_date ? (
                  <>
                    {m.start_date ? formatTanggal(m.start_date) : '…'} – {m.due_date ? formatTanggal(m.due_date) : '…'}
                  </>
                ) : (
                  'Tanggal menyusul'
                )}
                <span aria-hidden> · </span>
                <span className="tabular-nums">{Math.round(m.progress)}%</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DocumentsCard({ docs, projectId }: { docs: DocSummary[]; projectId: number }) {
  return (
    <SectionCard id="dokumen" title="Dokumen proyek" icon={<FileText className="h-[18px] w-[18px]" aria-hidden />} count={docs.length}>
      {docs.length === 0 ? (
        <p className="rounded-xl bg-alt px-4 py-5 text-center text-sm text-muted">
          Belum ada dokumen. Dokumen tampil di sini setelah tim kami mengirimkannya untuk Anda tinjau.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary" aria-hidden>
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    <Link to={docPath(projectId, doc.id)} className="hover:text-primary">
                      {doc.title}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-subtle">
                    {docShortLabel(doc.doc_type)} · <span className="tabular-nums">{doc.number}</span> · {formatTanggal(doc.doc_date)}
                    {doc.version > 1 && <> · versi {doc.version}</>}
                  </p>
                  <TonePill view={docStatusView(doc)} className="mt-2" />
                </div>
              </div>
              <Link to={docPath(projectId, doc.id)} className="btn btn-outline btn-sm shrink-0 self-start sm:self-auto" aria-label={`Buka ${doc.title}`}>
                Buka
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/** "PDF" button that loads a document of the project and downloads it (invoices, receipts). */
function PdfButton({ docId, label, onFlash }: { docId: number; label: string; onFlash: (flash: ProjectFlash | null) => void }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await exportMyDocument(docId, 'pdf');
    } catch (err) {
      onFlash({ tone: 'danger', text: `Gagal mengunduh PDF: ${errorMessage(err, 'kesalahan tidak diketahui')}` });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={download} disabled={busy} aria-label={`Unduh PDF ${label}`}>
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      PDF
    </button>
  );
}

function InvoicesCard({ invoices, projectId, onFlash }: { invoices: InvoiceSummary[]; projectId: number; onFlash: (flash: ProjectFlash | null) => void }) {
  const open = invoices.some((i) => i.payment_status === 'belum_dibayar' || i.payment_status === 'sebagian');
  return (
    <SectionCard id="tagihan" title="Tagihan" icon={<WalletCards className="h-[18px] w-[18px]" aria-hidden />} count={invoices.length}>
      {invoices.length === 0 ? (
        <p className="rounded-xl bg-alt px-4 py-5 text-center text-sm text-muted">Belum ada tagihan untuk proyek ini.</p>
      ) : (
        <ul className="divide-y divide-line">
          {invoices.map((inv) => (
            <InvoiceRow key={inv.id} invoice={inv} projectId={projectId} onFlash={onFlash} />
          ))}
        </ul>
      )}
      {open && (
        <p className="mt-4 flex gap-2 rounded-xl bg-alt px-3.5 py-3 text-xs leading-relaxed text-muted">
          <Info className="mt-px h-4 w-4 shrink-0 text-primary" aria-hidden />
          Bayar melalui transfer ke rekening yang tercantum di invoice. Kuitansi terbit otomatis setelah pembayaran kami terima.
        </p>
      )}
    </SectionCard>
  );
}

function InvoiceRow({ invoice: inv, projectId, onFlash }: { invoice: InvoiceSummary; projectId: number; onFlash: (flash: ProjectFlash | null) => void }) {
  const partly = inv.payment_status === 'sebagian';
  const settled = inv.payment_status === 'lunas' || inv.payment_status === 'dibatalkan';
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tabular-nums text-fg">{inv.number}</p>
          <p className="mt-0.5 text-xs text-subtle">{INVOICE_KIND_LABEL[inv.kind] ?? inv.kind}</p>
        </div>
        <TonePill view={invoiceStatusView(inv)} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <div>
          <dt className="text-xs text-subtle">{partly ? 'Sisa tagihan' : 'Jumlah'}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-fg">{formatRupiah(partly ? inv.remaining : inv.amount_due)}</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">Jatuh tempo</dt>
          <dd className={`mt-0.5 font-medium tabular-nums ${inv.overdue ? 'text-danger-700' : 'text-fg'}`}>{settled ? '-' : formatTanggal(inv.due_date)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <PdfButton docId={inv.document_id} label={`invoice ${inv.number}`} onFlash={onFlash} />
        <Link to={docPath(projectId, inv.document_id)} className="btn btn-ghost btn-sm" aria-label={`Lihat invoice ${inv.number}`}>
          Lihat
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

function ReceiptsCard({ receipts, projectId, onFlash }: { receipts: DocSummary[]; projectId: number; onFlash: (flash: ProjectFlash | null) => void }) {
  return (
    <SectionCard id="kuitansi" title="Kuitansi" icon={<ReceiptText className="h-[18px] w-[18px]" aria-hidden />} count={receipts.length}>
      <ul className="divide-y divide-line">
        {receipts.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold tabular-nums ${isCancelled(doc) ? 'text-subtle line-through' : 'text-fg'}`}>{doc.number}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {formatTanggal(doc.doc_date)}
                {isCancelled(doc) && <> · Dibatalkan</>}
              </p>
            </div>
            <div className="flex gap-2">
              <PdfButton docId={doc.id} label={`kuitansi ${doc.number}`} onFlash={onFlash} />
              <Link to={docPath(projectId, doc.id)} className="btn btn-ghost btn-sm" aria-label={`Lihat kuitansi ${doc.number}`}>
                Lihat
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}

function SummaryCard({ project }: { project: ProjectDetail }) {
  const client = project.client?.name || project.client_name;
  return (
    <SectionCard title="Ringkasan" icon={<Info className="h-[18px] w-[18px]" aria-hidden />}>
      <dl className="divide-y divide-line">
        {client && <Row label="Klien">{client}</Row>}
        <Row label="Layanan">{project.service_label}</Row>
        {project.value > 0 && (
          <Row label="Nilai kontrak">
            <span className="tabular-nums">{formatRupiah(project.value)}</span>
          </Row>
        )}
        {(project.start_date || project.end_date) && (
          <Row label="Jadwal">
            {formatTanggal(project.start_date)} – {formatTanggal(project.end_date)}
          </Row>
        )}
        {project.has_maintenance && (
          <Row label="Pemeliharaan">
            {project.maintenance_period ? MAINTENANCE_PERIOD_LABEL[project.maintenance_period] : 'Ya'}
            {project.maintenance_end && <span className="block text-xs font-normal text-subtle">s.d. {formatTanggal(project.maintenance_end)}</span>}
          </Row>
        )}
      </dl>
      {project.scope_summary && <p className="mt-3 whitespace-pre-line rounded-xl bg-alt px-4 py-3 text-[13px] leading-relaxed text-muted">{project.scope_summary}</p>}
      <p className="mt-4 text-xs text-subtle">
        Ada pertanyaan tentang proyek ini?{' '}
        <Link to="/#kontak" className="link-site">
          Hubungi kami
        </Link>
      </p>
    </SectionCard>
  );
}

function ActivityCard({ activity }: { activity: Activity[] }) {
  const [all, setAll] = useState(false);
  if (activity.length === 0) return null;
  const shown = all ? activity : activity.slice(0, ACTIVITY_PREVIEW);
  return (
    <SectionCard title="Riwayat" icon={<History className="h-[18px] w-[18px]" aria-hidden />}>
      <ul className="divide-y divide-line">
        {shown.map((a) => (
          <li key={a.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-fg">{ACTIVITY_LABEL[a.action] ?? 'Pembaruan proyek'}</p>
              <time className="shrink-0 text-xs tabular-nums text-subtle">{formatTanggal(a.created_at)}</time>
            </div>
            {a.detail && <p className="mt-0.5 break-words text-[13px] text-muted">{a.detail}</p>}
          </li>
        ))}
      </ul>
      {activity.length > ACTIVITY_PREVIEW && (
        <button type="button" className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          <ChevronDown className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} aria-hidden />
          {all ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${activity.length})`}
        </button>
      )}
    </SectionCard>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-2/3 sm:h-10" />
      <Skeleton className="mt-3 h-6 w-32" />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="card-site space-y-4 p-6">
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="card-site space-y-3 p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
