// Workspace proyek (/admin/proyek/:id): header (code, name, client, value, stage stepper) and the tabs Ringkasan,
// Dokumen, Jadwal, Invoice & pembayaran, Aktivitas (docs/platform/PROJECT-DOCS-SPEC.md §7). The tab is kept in the
// URL (?tab=dokumen) so links from the dashboard and the editor land on the right one.
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Activity as ActivityIcon, CalendarRange, FileStack, FolderSearch, LayoutDashboard, RotateCw, Wallet } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, Notice, PageHeader, Panel, Tabs, cn, type TabItem } from '../../../components/admin/ui';
import { pdProjectGet, pdSettingsGet } from '../../../features/project-docs/api';
import type { ProjectGetResponse, SettingsGetResponse } from '../../../features/project-docs/types';
import { useToast } from '../template-orders/shared/hooks';
import { Toast } from '../template-orders/shared/OrderUi';
import { rupiah, STAGE_LABEL, tanggal } from './shared/format';
import { usePdQuery, useUnsavedGuard, useViewer } from './shared/hooks';
import { ActivityList, ProgressCell, StageStepper } from './shared/ui';
import { DocumentsTab } from './workspace/DocumentsTab';
import { FinanceTab } from './workspace/FinanceTab';
import { OverviewTab } from './workspace/OverviewTab';
import { ScheduleTab } from './workspace/ScheduleTab';
import type { WorkspaceContext } from './workspace/context';

type Tab = 'ringkasan' | 'dokumen' | 'jadwal' | 'invoice' | 'aktivitas';
const TABS: Tab[] = ['ringkasan', 'dokumen', 'jadwal', 'invoice', 'aktivitas'];
const isTab = (v: string | null): v is Tab => !!v && (TABS as string[]).includes(v);

const PROJECT_STATUS: Record<string, { label: string; tone: 'mint' | 'warning' | 'cobalt' | 'mist' }> = {
  active: { label: 'Aktif', tone: 'mint' },
  pending: { label: 'Menunggu', tone: 'warning' },
  completed: { label: 'Selesai', tone: 'cobalt' },
  canceled: { label: 'Dibatalkan', tone: 'mist' },
};

export default function ProjectWorkspace() {
  const { id } = useParams();
  const projectId = Number(id);
  const valid = Number.isInteger(projectId) && projectId > 0;
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'ringkasan';
  const viewer = useViewer();
  const { toast, show, dismiss } = useToast();
  // Form Ringkasan yang belum disimpan: tetap terpasang saat pindah tab, dan meninggalkan halaman ditanya dulu
  const navigate = useNavigate();
  const [setupDirty, setSetupDirty] = useState(false);
  const guard = useUnsavedGuard(setupDirty, navigate);

  const query = usePdQuery<ProjectGetResponse>(valid ? `project:${projectId}` : null, () => pdProjectGet({ id: projectId }));
  // Pengaturan (termin bawaan, pajak, SLA) dibutuhkan untuk template dan invoice; gagal memuat tidak memblokir halaman
  const settingsQuery = usePdQuery<SettingsGetResponse>('pd_settings', pdSettingsGet);
  const project = query.data?.project ?? null;

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'ringkasan') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const back = { to: '/admin/proyek', label: 'Dashboard proyek' };

  if (!valid || query.notFound) {
    return (
      <div className="pb-10">
        <PageHeader back={back} title="Workspace proyek" />
        <Panel>
          <EmptyState
            icon={<FolderSearch />}
            title="Proyek tidak ditemukan."
            description="Proyek ini mungkin sudah dihapus dari Project Clients."
            action={
              <Button size="sm" variant="secondary" to="/admin/proyek">
                Kembali ke dashboard
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="pb-10">
        <PageHeader back={back} title="Workspace proyek" />
        <Panel>{query.error ? <ErrorState title="Gagal memuat proyek" error={query.error} onRetry={query.reload} /> : <LoadingState label="Memuat workspace proyek..." />}</Panel>
      </div>
    );
  }

  const ctx: WorkspaceContext = {
    project,
    settings: settingsQuery.data,
    isAdmin: viewer.isAdmin,
    canEditType: viewer.canEditType,
    reload: query.reload,
    notify: show,
    openTab: (t) => setTab(t),
    go: guard.request,
    setSetupDirty,
  };
  const missingCount = project.checklist.filter((c) => c.missing).length;
  const unpaid = project.invoices.filter((i) => i.payment_status !== 'lunas' && i.payment_status !== 'dibatalkan' && i.doc_status !== 'draft');
  const status = PROJECT_STATUS[project.status] ?? { label: project.status, tone: 'mist' as const };

  const tabs: TabItem<Tab>[] = [
    { value: 'ringkasan', label: 'Ringkasan', icon: <LayoutDashboard /> },
    { value: 'dokumen', label: 'Dokumen', icon: <FileStack />, count: missingCount || undefined },
    { value: 'jadwal', label: 'Jadwal', icon: <CalendarRange />, count: project.milestones.length || undefined },
    { value: 'invoice', label: 'Invoice & pembayaran', icon: <Wallet />, count: unpaid.length || undefined },
    { value: 'aktivitas', label: 'Aktivitas', icon: <ActivityIcon /> },
  ];

  return (
    <div className="pb-10">
      <PageHeader
        back={back}
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            {project.code ? <span className="font-mono">{project.code}</span> : <span>Belum ada kode proyek</span>}
            <span aria-hidden>·</span>
            {project.service_label}
          </span>
        }
        title={project.name}
        description={
          <>
            {project.client_name || 'Klien belum ditentukan'} · Nilai kontrak <span className="font-semibold tabular-nums text-adm-fg">{project.value ? rupiah(project.value) : 'belum ditentukan'}</span>
          </>
        }
        meta={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            {project.stage_override && (
              <Badge tone="warning" dot={false}>
                Tahap diatur manual
              </Badge>
            )}
            {(project.start_date || project.end_date) && (
              <span className="text-xs text-adm-muted">
                {tanggal(project.start_date)} – {tanggal(project.end_date)}
              </span>
            )}
          </>
        }
        actions={
          <Button variant="secondary" icon={<RotateCw />} loading={query.loading} onClick={query.reload}>
            Muat ulang
          </Button>
        }
      />

      {query.error && (
        <Notice tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={query.reload}>Coba lagi</Button>}>
          Gagal memuat ulang: {query.error}
        </Notice>
      )}

      {/* Tahapan + progres */}
      <Panel className="mb-4 sm:mb-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-adm-muted">Tahap saat ini</p>
            <p className="text-[15px] font-semibold text-adm-fg sm:text-base">{STAGE_LABEL[project.stage]}</p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <div>
              <dt className="text-adm-muted">Progres pengerjaan</dt>
              <dd className="mt-1 w-40">
                <ProgressCell value={project.progress} />
              </dd>
            </div>
            <div>
              <dt className="text-adm-muted">Dokumen kurang</dt>
              <dd className={cn('mt-0.5 font-semibold tabular-nums', missingCount ? 'text-adm-warning-fg' : 'text-adm-mint-fg')}>{missingCount}</dd>
            </div>
            <div>
              <dt className="text-adm-muted">Menunggu klien</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-adm-fg">{project.pending_approvals}</dd>
            </div>
            <div>
              <dt className="text-adm-muted">Sisa tagihan</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-adm-fg">{rupiah(unpaid.reduce((s, i) => s + i.remaining, 0))}</dd>
            </div>
          </dl>
        </div>
        <StageStepper stage={project.stage} />
      </Panel>

      <Tabs<Tab> items={tabs} value={tab} onChange={setTab} variant="underline" ariaLabel="Bagian workspace" className="mb-4 w-full sm:mb-5" />

      <div role="tabpanel" aria-label={tabs.find((t) => t.value === tab)?.label as string}>
        {/* Ringkasan selalu terpasang agar isian form yang belum disimpan tidak hilang saat pindah tab */}
        <div hidden={tab !== 'ringkasan'}>
          <OverviewTab ctx={ctx} />
        </div>
        {tab === 'dokumen' && <DocumentsTab ctx={ctx} />}
        {tab === 'jadwal' && <ScheduleTab ctx={ctx} />}
        {tab === 'invoice' && <FinanceTab ctx={ctx} />}
        {tab === 'aktivitas' && (
          <Panel>
            {project.activity.length ? (
              <ActivityList items={project.activity} className="-mx-2" />
            ) : (
              <EmptyState icon={<ActivityIcon />} title="Belum ada aktivitas." description="Setiap perubahan dokumen, jadwal, dan pembayaran tercatat di sini." />
            )}
          </Panel>
        )}
      </div>

      <ConfirmDialog
        open={!!guard.pending}
        onClose={guard.cancel}
        onConfirm={guard.proceed}
        tone="danger"
        title="Tinggalkan workspace?"
        description="Perubahan data proyek di tab Ringkasan yang belum disimpan akan hilang."
        confirmText="Ya, tinggalkan"
        cancelText="Tetap di sini"
      />
      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}
