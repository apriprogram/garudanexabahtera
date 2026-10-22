// Dashboard proyek (/admin/proyek): stats, stage pipeline (clickable filter), projects table/cards, documents
// waiting for the client, due invoices and recent activity (docs/platform/PROJECT-DOCS-SPEC.md §2, §7).
// One pd_dashboard call; the stage filter and search run on the loaded projects.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Building2, FileWarning, FolderKanban, Hourglass, Plus, RotateCw, Wallet } from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  IconButton,
  LoadingState,
  MobileCard,
  MobileList,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  SearchInput,
  StatTile,
  Table,
  TableContainer,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  cn,
} from '../../../components/admin/ui';
import { pdDashboard } from '../../../features/project-docs/api';
import { STAGES } from '../../../features/project-docs/engine';
import type { DashboardResponse, ProjectSummary, Stage } from '../../../features/project-docs/types';
import { lowerFirst, rupiah, rupiahRingkas, STAGE_LABEL, tanggal } from './shared/format';
import { usePdQuery } from './shared/hooks';
import { ActivityList, DocChip, MissingDocs, PaymentBadge, ProgressCell, StageBadge } from './shared/ui';

const isStage = (v: string | null): v is Stage => !!v && STAGES.some((s) => s.key === v);

function matches(p: ProjectSummary, term: string) {
  if (!term) return true;
  return [p.name, p.code, p.client_name, p.service_label].some((v) => (v ?? '').toLowerCase().includes(term));
}

/** Next unpaid invoice of a project: due date + remaining, red when overdue. */
function NextDueCell({ project }: { project: ProjectSummary }) {
  const due = project.next_due;
  if (!due) return <span className="text-xs text-adm-subtle">Tidak ada tagihan</span>;
  return (
    <div className="flex flex-col">
      <span className={cn('text-[13px] font-semibold tabular-nums', due.overdue ? 'text-adm-danger-fg' : 'text-adm-fg')}>{rupiah(due.remaining)}</span>
      <span className={cn('text-xs', due.overdue ? 'text-adm-danger-fg' : 'text-adm-muted')}>
        {due.overdue ? 'Lewat ' : 'Jatuh tempo '}
        {tanggal(due.due_date)}
      </span>
    </div>
  );
}

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stageParam = searchParams.get('tahap');
  const stage: Stage | null = isStage(stageParam) ? stageParam : null;
  const [search, setSearch] = useState('');
  const query = usePdQuery<DashboardResponse>('pd_dashboard', pdDashboard);
  const data = query.data;

  const setStage = (next: Stage | null) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('tahap', next);
    else params.delete('tahap');
    setSearchParams(params, { replace: true });
  };

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () => (data?.projects ?? []).filter((p) => (!stage || p.stage === stage) && matches(p, term)),
    [data?.projects, stage, term],
  );
  const open = (p: ProjectSummary) => navigate(`/admin/proyek/${p.id}`);
  const stats = data?.stats;

  return (
    <div className="pb-10">
      <PageHeader
        title="Dashboard proyek"
        description="Pantau tahapan, dokumen, persetujuan, dan pembayaran semua proyek custom kamu."
        actions={
          <>
            <Button variant="secondary" icon={<RotateCw />} loading={query.loading && !query.initialLoading} onClick={query.reload}>
              Muat ulang
            </Button>
            <Button variant="secondary" icon={<Building2 />} to="/admin/klien">
              Klien
            </Button>
            <Button icon={<Plus />} to="/admin/project-clients?new=1">
              Tambah proyek
            </Button>
          </>
        }
      />

      {query.error && !data ? (
        <Panel>
          <ErrorState title="Gagal memuat dashboard proyek" error={query.error} onRetry={query.reload} />
        </Panel>
      ) : (
        <>
          {query.error && data && (
            <Notice tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={query.reload}>Coba lagi</Button>}>
              Gagal memuat ulang: {query.error}
            </Notice>
          )}

          {/* Statistik */}
          <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatTile title="Proyek aktif" value={stats?.projects_active} icon={FolderKanban} tone="cobalt" loading={query.initialLoading} compact caption="Belum masuk tahap selesai" />
            <StatTile
              title="Dokumen kurang"
              value={stats?.docs_missing}
              icon={FileWarning}
              tone="warning"
              loading={query.initialLoading}
              compact
              info="Dokumen wajib yang tahapnya sudah tercapai tetapi belum ada atau masih draft."
              caption="Wajib di tahap berjalan"
            />
            <StatTile
              title="Menunggu klien"
              value={stats?.approvals_pending}
              icon={Hourglass}
              tone="warning"
              loading={query.initialLoading}
              compact
              caption="Dokumen menunggu persetujuan"
            />
            <StatTile
              title="Belum dibayar"
              value={stats ? rupiahRingkas(stats.invoices_unpaid_amount) : undefined}
              icon={Wallet}
              tone="cobalt"
              loading={query.initialLoading}
              compact
              caption={stats ? `${stats.invoices_unpaid_count} invoice terbit · ${rupiah(stats.invoices_unpaid_amount)}` : undefined}
            />
            <StatTile
              title="Jatuh tempo"
              value={stats ? rupiahRingkas(stats.invoices_overdue_amount) : undefined}
              icon={AlertTriangle}
              tone="danger"
              loading={query.initialLoading}
              compact
              className="col-span-2 xl:col-span-1"
              caption={stats ? `${stats.invoices_overdue_count} invoice lewat jatuh tempo · ${rupiah(stats.invoices_overdue_amount)}` : undefined}
            />
          </section>

          {/* Pipeline tahapan */}
          <Panel className="mt-4 sm:mt-5">
            <PanelHeader
              title="Tahapan proyek"
              subtitle="Klik tahap untuk menyaring daftar proyek."
              action={
                stage && (
                  <Button size="sm" variant="ghost" onClick={() => setStage(null)}>
                    Semua tahap
                  </Button>
                )
              }
            />
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:grid xl:grid-cols-9 xl:overflow-visible">
              {STAGES.map((s, i) => {
                const count = data?.stages?.[s.key] ?? 0;
                const active = stage === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStage(active ? null : s.key)}
                    className={cn(
                      'relative flex min-w-[112px] shrink-0 flex-col items-start rounded-2xl px-3 py-3 text-left ring-1 ring-inset transition-colors xl:min-w-0',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
                      active ? 'bg-adm-cobalt-soft ring-cobalt/40' : 'bg-adm-surface ring-adm-line hover:bg-adm-hover hover:ring-adm-line-strong',
                    )}
                  >
                    <span className={cn('font-mono text-[11px] font-semibold', active ? 'text-adm-cobalt-fg' : 'text-adm-subtle')}>{String(i + 1).padStart(2, '0')}</span>
                    {query.initialLoading ? (
                      <span className="mt-1 h-7 w-8 animate-pulse rounded-lg bg-adm-ghost" />
                    ) : (
                      <span className={cn('mt-1 text-[22px] font-semibold leading-none tabular-nums', count ? 'text-adm-fg' : 'text-adm-subtle')}>{count}</span>
                    )}
                    <span className={cn('mt-1.5 text-xs leading-tight', active ? 'font-semibold text-adm-cobalt-fg' : 'text-adm-muted')}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* Daftar proyek */}
          <Panel padding="none" className="mt-4 overflow-hidden sm:mt-5">
            <FilterBar
              left={
                <div className="flex min-h-9 items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-adm-fg sm:text-[15px]">Proyek</h2>
                  {stage && <StageBadge stage={stage} size="sm" />}
                  {data && <span className="text-xs tabular-nums text-adm-muted">{visible.length} proyek</span>}
                </div>
              }
              right={
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                  placeholder="Cari proyek, kode, atau klien..."
                  controlSize="sm"
                  wrapperClassName="w-full lg:w-72"
                  aria-label="Cari proyek"
                />
              }
            />

            {query.initialLoading ? (
              <>
                <LoadingState label="Memuat proyek..." className="md:hidden" />
                <TableContainer className="hidden md:block">
                  <Table>
                    <TBody>
                      <TableSkeleton rows={5} cols={6} />
                    </TBody>
                  </Table>
                </TableContainer>
              </>
            ) : !data?.projects.length ? (
              <EmptyState
                icon={<FolderKanban />}
                title="Belum ada proyek custom."
                description="Proyek dari Project Clients otomatis muncul di sini lengkap dengan dokumennya."
                action={
                  <Button size="sm" icon={<Plus />} to="/admin/project-clients?new=1">
                    Tambah proyek
                  </Button>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<FolderKanban />}
                title="Proyek tidak ditemukan."
                description={stage ? `Tidak ada proyek di tahap ${lowerFirst(STAGE_LABEL[stage])} yang cocok.` : 'Coba kata kunci lain.'}
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setStage(null);
                    }}
                  >
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <div className={cn('transition-opacity', query.loading && 'opacity-60')}>
                <MobileList className="md:hidden">
                  {visible.map((p) => (
                    <MobileCard
                      key={p.id}
                      onClick={() => open(p)}
                      title={p.name}
                      subtitle={[p.code, p.client_name].filter(Boolean).join(' · ') || p.service_label}
                      trailing={<StageBadge stage={p.stage} size="sm" />}
                      meta={[
                        { label: 'Progres', value: <ProgressCell value={p.progress} /> },
                        { label: 'Tagihan', value: <NextDueCell project={p} /> },
                      ]}
                    >
                      <div className="mt-2.5 flex items-center gap-2 text-xs text-adm-muted">
                        <span>Dokumen</span>
                        <MissingDocs types={p.missing_docs} />
                      </div>
                    </MobileCard>
                  ))}
                </MobileList>

                <TableContainer className="hidden md:block">
                  <Table minWidth={860}>
                    <THead>
                      <tr>
                        <Th>Proyek</Th>
                        <Th>Tahap</Th>
                        <Th>Progres</Th>
                        <Th>Dokumen kurang</Th>
                        <Th>Tagihan berikutnya</Th>
                        <Th align="right" className="relative">
                          <span className="sr-only">Aksi</span>
                        </Th>
                      </tr>
                    </THead>
                    <TBody>
                      {visible.map((p) => (
                        <Tr key={p.id} onClick={() => open(p)}>
                          <Td>
                            <div className="min-w-0">
                              <p className="max-w-[300px] truncate font-semibold text-adm-fg">{p.name}</p>
                              <p className="mt-0.5 flex max-w-[300px] items-center gap-1.5 text-xs text-adm-muted">
                                {p.code ? <span className="shrink-0 font-mono">{p.code}</span> : <span className="shrink-0 text-adm-subtle">Belum ada kode</span>}
                                <span aria-hidden>·</span>
                                <span className="truncate">{p.client_name || p.service_label}</span>
                              </p>
                            </div>
                          </Td>
                          <Td>
                            <StageBadge stage={p.stage} />
                          </Td>
                          <Td>
                            <ProgressCell value={p.progress} className="w-32" />
                          </Td>
                          <Td>
                            <MissingDocs types={p.missing_docs} />
                          </Td>
                          <Td>
                            <NextDueCell project={p} />
                          </Td>
                          <Td align="right">
                            <IconButton icon={<ArrowRight />} label={`Buka workspace ${p.name}`} size="sm" to={`/admin/proyek/${p.id}`} />
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </Panel>

          <div className="mt-4 grid gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-3">
            {/* Menunggu persetujuan */}
            <Panel>
              <PanelHeader title="Menunggu persetujuan" subtitle="Dokumen yang sedang ditinjau klien." icon={Hourglass} iconTone="warning" />
              {query.initialLoading ? (
                <LoadingState className="py-6" />
              ) : !data?.pending_approvals.length ? (
                <EmptyState size="sm" title="Tidak ada dokumen yang menunggu." description="Dokumen yang kamu ajukan ke klien muncul di sini." />
              ) : (
                <ul className="-mx-2 space-y-1">
                  {data.pending_approvals.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/proyek/${d.project_id}/dokumen/${d.id}`)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-adm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                      >
                        <DocChip type={d.doc_type} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-adm-fg sm:text-sm">{d.project_name}</span>
                          <span className="block truncate font-mono text-[11px] text-adm-muted">{d.number}</span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-adm-muted">
                          <span className="block">Diajukan</span>
                          <span className="block tabular-nums">{tanggal(d.submitted_at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Invoice jatuh tempo */}
            <Panel>
              <PanelHeader title="Invoice jatuh tempo" subtitle="Lewat jatuh tempo atau jatuh tempo dalam 3 hari." icon={Wallet} iconTone="danger" />
              {query.initialLoading ? (
                <LoadingState className="py-6" />
              ) : !data?.due_invoices.length ? (
                <EmptyState size="sm" title="Tidak ada invoice jatuh tempo." description="Semua tagihan aman untuk saat ini." />
              ) : (
                <ul className="-mx-2 space-y-1">
                  {data.due_invoices.map((inv) => (
                    <li key={inv.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/proyek/${inv.project_id}/dokumen/${inv.document_id}`)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-adm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-adm-fg sm:text-sm">{inv.project_name}</span>
                          <span className="block truncate font-mono text-[11px] text-adm-muted">{inv.number}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[13px] font-semibold tabular-nums text-adm-fg">{rupiah(inv.remaining)}</span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-[11px] tabular-nums text-adm-muted">{tanggal(inv.due_date)}</span>
                            <PaymentBadge status={inv.payment_status} overdue={inv.overdue} size="sm" />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Aktivitas terbaru */}
            <Panel>
              <PanelHeader title="Aktivitas terbaru" subtitle="20 perubahan terakhir di semua proyek." />
              {query.initialLoading ? (
                <LoadingState className="py-6" />
              ) : !data?.activity.length ? (
                <EmptyState size="sm" title="Belum ada aktivitas." />
              ) : (
                <ActivityList items={data.activity} showProject className="-mx-2" />
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
