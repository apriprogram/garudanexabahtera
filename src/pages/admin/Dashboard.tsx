// Dashboard admin (SPEC §9): statistik asli (pengunjung, order template, project custom, pengguna, pendapatan),
// daftar yang perlu tindakan, Project Clients terbaru + Order Template Terbaru.
// Pengelolaan proyek lengkap ada di /admin/project-clients (tombol "Tambah proyek" membuka form di sana).
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  DollarSign,
  ExternalLink,
  Eye,
  Globe,
  Hourglass,
  Monitor,
  Plus,
  RotateCcw,
  ShoppingBag,
  Smartphone,
  Users,
} from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  DeltaPill,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MobileCard,
  MobileList,
  Modal,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Skeleton,
  StatTile,
  Table,
  TableContainer,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  ThinProgress,
  Tr,
  cn,
  FOCUS_INSET,
} from '../../components/admin/ui';
import { apiGet, errorMessage } from '../../lib/api';
import { getRole } from '../../lib/auth';
import { formatRupiah, formatTanggal, type DashboardSummary } from '../../types/platform';
import { useApiQuery, useToast } from './template-orders/shared/hooks';
import { OrderStatusBadge, Toast } from './template-orders/shared/OrderUi';
import { ProjectStatusBadge, ProjectThumb, SourceBadge } from './project-clients/ProjectUi';
import { formatProjectPrice, normalizeProject, type RawProject } from './project-clients/projectShared';

interface VisitorBreakdownItem {
  label: string;
  value: number;
}

/** Respons action get_visitor_details. */
interface VisitorDetails {
  total: number;
  today: number;
  daily: { date: string; count: number }[];
  devices: VisitorBreakdownItem[];
  browsers: VisitorBreakdownItem[];
  os: VisitorBreakdownItem[];
  countries: VisitorBreakdownItem[];
}

interface UserRow {
  id: number;
  name: string;
  role?: string;
}

const RECENT_PROJECTS = 6;

const percentOf = (items: VisitorBreakdownItem[], value: number) => {
  const total = items.reduce((acc, curr) => acc + curr.value, 0);
  return total > 0 ? Math.round((value / total) * 100) : 0;
};

/** Ringkasan teks kecil di bawah angka statistik. */
const Caption = ({ children }: { children: React.ReactNode }) => <span className="flex flex-wrap items-center gap-x-2 gap-y-1">{children}</span>;

/** Judul kartu statistik yang boleh turun ke baris kedua di HP sempit (StatTile memotongnya dengan elipsis). */
const TileTitle = ({ children }: { children: React.ReactNode }) => <span className="whitespace-normal leading-snug">{children}</span>;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = getRole() === 'admin';
  const { toast, show, dismiss } = useToast();

  const summary = useApiQuery<DashboardSummary>('admin_dashboard_summary');
  const projectsQ = useApiQuery<RawProject[]>('get_projects');
  const usersQ = useApiQuery<UserRow[]>('get_users');
  const visitorsQ = useApiQuery<{ total_visits?: number }>('get_visitor_stats');
  const detailsQ = useApiQuery<VisitorDetails>('get_visitor_details');

  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const s = summary.data;
  const projects = Array.isArray(projectsQ.data) ? projectsQ.data.map(normalizeProject) : [];
  const users = Array.isArray(usersQ.data) ? usersQ.data : [];
  const customers = users.filter((u) => u.role === 'customer').length;
  const staff = users.length - customers;
  const visitorTotal = Number(visitorsQ.data?.total_visits ?? detailsQ.data?.total ?? 0);
  const needApproval = s?.template_orders.by_status.menunggu_approval ?? 0;
  const needDomain = s?.template_orders.by_status.proses_domain ?? 0;
  const newFromWebsite = s?.custom_projects.from_website_pending ?? 0;
  const revenueTotal = s ? Number(s.revenue.template_paid || 0) + Number(s.revenue.custom_total || 0) : 0;
  const recentOrders = s?.recent_template_orders ?? [];
  const recentProjects = projects.slice(0, RECENT_PROJECTS);

  const reloadAll = () => {
    summary.reload();
    projectsQ.reload();
    usersQ.reload();
    visitorsQ.reload();
    detailsQ.reload();
  };
  const anyLoading = summary.loading || projectsQ.loading || usersQ.loading || visitorsQ.loading;

  const openVisitorDetails = () => {
    detailsQ.reload();
    setIsVisitorModalOpen(true);
  };

  const handleResetVisitors = async () => {
    setResetting(true);
    try {
      await apiGet('reset_visitor_stats');
      visitorsQ.mutate(() => ({ total_visits: 0 }));
      detailsQ.reload();
      setIsResetModalOpen(false);
      show('success', 'Statistik pengunjung berhasil direset.');
    } catch (err) {
      show('error', `Gagal mereset statistik pengunjung: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setResetting(false);
    }
  };

  // Panah pintasan hanya mulai sm: di HP (grid 2 kolom) judul kartu jadi terpotong. Di HP navigasi tetap lewat
  // kartu "Perlu tindakan", tombol "Lihat semua" di bawah, dan sidebar.
  const goLink = (to: string, label: string) => (
    <IconButton icon={<ArrowUpRight />} label={label} size="xs" variant="soft" to={to} className="max-sm:hidden" />
  );

  return (
    <div className="admin-dashboard-container pb-10">
      <PageHeader
        title="Dashboard"
        description="Selamat datang kembali! Ini ringkasan pesanan template, proyek custom, dan pengunjung website kamu."
        actions={
          <>
            <Button variant="secondary" icon={<ExternalLink />} href="/" target="_blank" rel="noopener noreferrer">
              Lihat website
            </Button>
            <Button icon={<Plus />} onClick={() => navigate('/admin/project-clients?new=1')}>
              Tambah proyek
            </Button>
          </>
        }
      />

      <div className="space-y-4 sm:space-y-6">
        {summary.error && (
          <Notice
            tone="danger"
            action={
              <Button size="sm" variant="secondary" loading={anyLoading} onClick={reloadAll}>
                Coba lagi
              </Button>
            }
          >
            Gagal memuat ringkasan pesanan: {summary.error}
          </Notice>
        )}

        {/* Statistik: HP 2 kolom (pendapatan selebar baris), lg 3 kolom, 2xl 5 kolom */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
          <StatTile
            title={<TileTitle>Total pengunjung</TileTitle>}
            info="Kunjungan unik per sesi browser sejak reset terakhir."
            value={visitorTotal.toLocaleString('id-ID')}
            icon={Eye}
            tone="cobalt"
            compact
            loading={visitorsQ.initialLoading}
            caption={
              <span className="flex items-center justify-between gap-2">
                {detailsQ.data ? (
                  <DeltaPill tone="cobalt">+{Number(detailsQ.data.today || 0).toLocaleString('id-ID')} hari ini</DeltaPill>
                ) : (
                  <span className="text-adm-subtle">{detailsQ.error ? 'Rincian tidak tersedia' : 'Memuat...'}</span>
                )}
                <span className="flex items-center gap-1">
                  <IconButton icon={<Eye />} label="Lihat detail pengunjung" size="xs" variant="soft" onClick={openVisitorDetails} />
                  {/* reset_visitor_stats hanya untuk admin (ADMIN_ACTIONS di kedua backend) */}
                  {isAdmin && (
                    <IconButton icon={<RotateCcw />} label="Reset pengunjung" size="xs" variant="danger-ghost" onClick={() => setIsResetModalOpen(true)} />
                  )}
                </span>
              </span>
            }
          />

          <StatTile
            title={<TileTitle>Order Template</TileTitle>}
            info="Semua pesanan template, termasuk yang belum dibayar, ditolak, atau dibatalkan."
            value={s ? s.template_orders.total.toLocaleString('id-ID') : '—'}
            icon={ShoppingBag}
            tone="mint"
            compact
            loading={summary.initialLoading}
            action={goLink('/admin/pesanan-template', 'Buka Order Masuk')}
            caption={
              s && (
                <Caption>
                  <DeltaPill tone="mint">+{s.template_orders.this_month.toLocaleString('id-ID')} bulan ini</DeltaPill>
                  {needApproval > 0 ? <span>{needApproval} perlu approval</span> : <span>Tidak ada yang perlu approval</span>}
                </Caption>
              )
            }
          />

          <StatTile
            title={<TileTitle>Project Custom</TileTitle>}
            info="Semua proyek custom website & aplikasi mobile, termasuk pesanan dari form website."
            value={s ? s.custom_projects.total.toLocaleString('id-ID') : '—'}
            icon={BriefcaseBusiness}
            tone="warning"
            compact
            loading={summary.initialLoading}
            action={goLink('/admin/project-clients', 'Buka Project Clients')}
            caption={
              s && (
                <Caption>
                  <DeltaPill tone="warning">+{s.custom_projects.this_month.toLocaleString('id-ID')} bulan ini</DeltaPill>
                  {newFromWebsite > 0 && <span>{newFromWebsite} baru dari website</span>}
                </Caption>
              )
            }
          />

          <StatTile
            title={<TileTitle>Total pengguna</TileTitle>}
            info="Akun admin, staf, dan pembeli template."
            value={isAdmin ? users.length.toLocaleString('id-ID') : '—'}
            icon={Users}
            tone="default"
            compact
            loading={usersQ.initialLoading}
            action={isAdmin ? goLink('/admin/users', 'Buka Pengguna') : undefined}
            caption={
              isAdmin ? (
                usersQ.data && (
                  <Caption>
                    <span>
                      <span className="font-semibold tabular-nums text-adm-fg">{customers}</span> pembeli
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      <span className="font-semibold tabular-nums text-adm-fg">{staff}</span> admin & staf
                    </span>
                  </Caption>
                )
              ) : (
                'Hanya admin yang bisa melihat jumlah pengguna.'
              )
            }
          />

          <StatTile
            className="col-span-2 2xl:col-span-1"
            title="Total pendapatan"
            info="Template: pesanan yang sudah dibayar. Custom: anggaran proyek yang tidak dibatalkan."
            value={
              // Nominal panjang: ukuran lebih kecil agar tidak terpotong
              <span title={formatRupiah(revenueTotal)} className="text-[20px] sm:text-[26px] 2xl:text-[22px]">
                {s ? formatRupiah(revenueTotal) : '—'}
              </span>
            }
            icon={DollarSign}
            tone="cobalt"
            compact
            loading={summary.initialLoading}
            caption={
              s && (
                <Caption>
                  <span>
                    Template <span className="font-semibold tabular-nums text-adm-fg">{formatRupiah(s.revenue.template_paid)}</span>
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    Custom <span className="font-semibold tabular-nums text-adm-fg">{formatRupiah(s.revenue.custom_total)}</span>
                  </span>
                </Caption>
              )
            }
          />
        </div>

        {/* Perlu tindakan */}
        {(needApproval > 0 || needDomain > 0 || newFromWebsite > 0) && (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {needApproval > 0 && (
              <Notice
                tone="cobalt"
                icon={<Hourglass />}
                title={`${needApproval} order template menunggu approval`}
                action={
                  <Button size="sm" variant="secondary" to="/admin/pesanan-template?status=menunggu_approval">
                    Tinjau
                  </Button>
                }
              >
                Pembayaran sudah diterima.
              </Notice>
            )}
            {needDomain > 0 && (
              <Notice
                tone="warning"
                icon={<Globe />}
                title={`${needDomain} order menunggu domain`}
                action={
                  <Button size="sm" variant="secondary" to="/admin/pesanan-template/input-domain">
                    Isi domain
                  </Button>
                }
              >
                Isi domain final agar CMS terbuka.
              </Notice>
            )}
            {newFromWebsite > 0 && (
              <Notice
                tone="mint"
                icon={<BriefcaseBusiness />}
                title={`${newFromWebsite} pesanan custom baru dari website`}
                action={
                  <Button size="sm" variant="secondary" to="/admin/project-clients?filter=website">
                    Lihat
                  </Button>
                }
              >
                Hubungi calon klien untuk penawaran.
              </Notice>
            )}
          </div>
        )}

        {/* Baris bawah: Project Clients ringkas + Order Template Terbaru */}
        <div className="grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <Panel padding="none" className="overflow-hidden">
            <div className="border-b border-adm-line px-4 py-3.5 sm:px-5">
              <PanelHeader
                title="Project Clients"
                subtitle="Proyek custom terbaru"
                icon={<BriefcaseBusiness />}
                iconTone="cobalt"
                className="mb-0"
                action={
                  <Button size="sm" variant="secondary" iconRight={<ArrowRight />} to="/admin/project-clients">
                    Lihat semua
                  </Button>
                }
              />
            </div>

            {projectsQ.initialLoading ? (
              <>
                <LoadingState label="Memuat proyek..." className="md:hidden" />
                <TableContainer className="hidden md:block">
                  <Table minWidth={520}>
                    <TBody>
                      <TableSkeleton rows={4} cols={3} />
                    </TBody>
                  </Table>
                </TableContainer>
              </>
            ) : projectsQ.error && !projectsQ.data ? (
              <ErrorState size="sm" title="Gagal memuat proyek" error={projectsQ.error} onRetry={projectsQ.reload} />
            ) : recentProjects.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<BriefcaseBusiness />}
                title="Belum ada proyek. Tambah proyek pertamamu."
                action={
                  <Button size="sm" icon={<Plus />} onClick={() => navigate('/admin/project-clients?new=1')}>
                    Tambah proyek
                  </Button>
                }
              />
            ) : (
              <>
                <MobileList className="md:hidden">
                  {recentProjects.map((project) => (
                    <MobileCard
                      key={project.id}
                      leading={<ProjectThumb project={project} />}
                      title={project.name}
                      subtitle={project.client_name}
                      trailing={<ProjectStatusBadge status={project.status} size="sm" />}
                      meta={[
                        { label: 'Anggaran', value: <span className="tabular-nums">{formatProjectPrice(project) ?? 'Belum ditentukan'}</span> },
                        { label: 'Sumber', value: project.source === 'website' ? 'Website' : 'Admin' },
                      ]}
                    />
                  ))}
                </MobileList>
                <TableContainer className="hidden md:block">
                  <Table minWidth={520} dense>
                    <THead>
                      <tr>
                        <Th>Proyek</Th>
                        <Th>Status</Th>
                        <Th align="right">Anggaran</Th>
                      </tr>
                    </THead>
                    <TBody>
                      {recentProjects.map((project) => (
                        <Tr key={project.id}>
                          <Td>
                            <div className="flex items-center gap-3">
                              <ProjectThumb project={project} className="h-9 w-9" />
                              <div className="min-w-0">
                                <p className="max-w-[280px] truncate font-semibold text-adm-fg">{project.name}</p>
                                <p className="flex min-w-0 items-center gap-2 text-xs text-adm-muted">
                                  <span className="max-w-[180px] truncate">{project.client_name}</span>
                                  <SourceBadge source={project.source} />
                                </p>
                              </div>
                            </div>
                          </Td>
                          <Td>
                            <ProjectStatusBadge status={project.status} />
                          </Td>
                          <Td align="right" nowrap className="font-semibold tabular-nums">
                            {formatProjectPrice(project) ?? <span className="font-normal text-adm-subtle">Belum ditentukan</span>}
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Panel>

          <Panel padding="none" className="overflow-hidden">
            <div className="border-b border-adm-line px-4 py-3.5 sm:px-5">
              <PanelHeader
                title="Order Template Terbaru"
                subtitle="5 pesanan template terakhir"
                icon={<ShoppingBag />}
                iconTone="mint"
                className="mb-0"
                action={
                  <Button size="sm" variant="secondary" iconRight={<ArrowRight />} to="/admin/pesanan-template">
                    Lihat semua
                  </Button>
                }
              />
            </div>

            {summary.initialLoading ? (
              <ul className="divide-y divide-adm-line" aria-busy>
                {[0, 1, 2].map((i) => (
                  <li key={i} className="space-y-2 px-4 py-3.5 sm:px-5">
                    <Skeleton className="h-4 w-40" rounded="rounded-md" />
                    <Skeleton className="h-3.5 w-56" rounded="rounded-md" />
                  </li>
                ))}
              </ul>
            ) : summary.error && !s ? (
              <ErrorState size="sm" title="Gagal memuat order" error={summary.error} onRetry={summary.reload} />
            ) : recentOrders.length === 0 ? (
              <EmptyState size="sm" icon={<ShoppingBag />} title="Belum ada order template." description="Pesanan dari website akan muncul di sini." />
            ) : (
              <ul className="divide-y divide-adm-line">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/admin/pesanan-template?order=${order.id}`}
                      className={cn('block px-4 py-3.5 transition-colors hover:bg-adm-hover sm:px-5', FOCUS_INSET)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[13px] font-semibold tabular-nums text-adm-fg">{order.order_number}</p>
                          <p className="mt-0.5 truncate text-xs text-adm-muted">
                            {order.customer_name} · {order.template_name}
                          </p>
                        </div>
                        <OrderStatusBadge status={order.status} label={order.status_label} size="sm" />
                      </div>
                      <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-adm-subtle">
                        <span className="font-semibold tabular-nums text-adm-fg">{formatRupiah(order.price)}</span>
                        <span>{formatTanggal(order.created_at, true)}</span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Reset pengunjung (admin saja) */}
      <ConfirmDialog
        open={isAdmin && isResetModalOpen}
        onClose={() => (resetting ? undefined : setIsResetModalOpen(false))}
        onConfirm={handleResetVisitors}
        loading={resetting}
        tone="danger"
        title="Reset pengunjung?"
        description="Total pengunjung akan dikembalikan ke 0. Tindakan ini tidak bisa dibatalkan."
        confirmText="Ya, reset"
        cancelText="Batal"
      />

      {/* Analitik pengunjung */}
      <Modal
        open={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
        title="Analitik pengunjung"
        description="Rincian lalu lintas pengunjung website kamu."
        icon={<Eye />}
        size="xl"
        bodyClassName="custom-scrollbar"
        footer={
          <Button variant="secondary" onClick={() => setIsVisitorModalOpen(false)}>
            Tutup
          </Button>
        }
      >
        <VisitorAnalytics details={detailsQ.data} error={detailsQ.error} loading={detailsQ.loading} onRetry={detailsQ.reload} />
      </Modal>

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
};

function BreakdownPanel({
  title,
  icon,
  iconTone,
  items,
  limit = 4,
  tones,
  showCount,
  renderLabel,
}: {
  title: string;
  icon: React.ReactNode;
  iconTone: 'cobalt' | 'mint' | 'default' | 'warning';
  items: VisitorBreakdownItem[];
  limit?: number;
  tones: ('cobalt' | 'mint' | 'warning' | 'mist')[];
  showCount?: boolean;
  renderLabel?: (item: VisitorBreakdownItem) => React.ReactNode;
}) {
  return (
    <Panel>
      <PanelHeader title={title} icon={icon} iconTone={iconTone} />
      {items.length === 0 ? (
        <p className="text-[13px] text-adm-muted">Belum ada data.</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, limit).map((item, i) => {
            const percentage = percentOf(items, item.value);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 text-adm-muted">{renderLabel ? renderLabel(item) : <span className="truncate">{item.label || 'Tidak diketahui'}</span>}</span>
                  <span className="shrink-0 font-medium tabular-nums text-adm-fg">
                    {percentage}%{showCount ? ` (${item.value})` : ''}
                  </span>
                </div>
                <ThinProgress value={percentage} label={String(item.label || 'Tidak diketahui')} tone={tones[i] ?? 'mist'} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function VisitorAnalytics({ details, error, loading, onRetry }: { details: VisitorDetails | null; error: string | null; loading: boolean; onRetry: () => void }) {
  if (!details) {
    return error ? <ErrorState title="Gagal memuat data analitik" error={error} onRetry={onRetry} /> : <LoadingState label="Memuat data analitik..." className="py-20" />;
  }
  const daily = details.daily ?? [];
  return (
    <div className={cn('space-y-4 transition-opacity sm:space-y-6', loading && 'opacity-60')}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile title="Total kunjungan" value={Number(details.total || 0).toLocaleString('id-ID')} />
        <StatTile title="Kunjungan hari ini" value={Number(details.today || 0).toLocaleString('id-ID')} />
        <StatTile title="Rata-rata 30 hari" value={daily.length > 0 ? Math.round(daily.reduce((acc, curr) => acc + curr.count, 0) / daily.length) : 0} />
        <StatTile title="Hari tertinggi" value={daily.length > 0 ? Math.max(...daily.map((d) => d.count)) : 0} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <BreakdownPanel
          title="Perangkat"
          icon={<Monitor />}
          iconTone="cobalt"
          items={details.devices ?? []}
          limit={10}
          showCount
          tones={['cobalt', 'mint']}
          renderLabel={(item) => (
            <>
              {item.label === 'Mobile' ? (
                <Smartphone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              ) : (
                <Monitor className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              )}
              <span className="truncate">{item.label}</span>
            </>
          )}
        />
        <BreakdownPanel title="Browser" icon={<Globe />} iconTone="mint" items={details.browsers ?? []} tones={['mint', 'cobalt', 'warning']} />
        <BreakdownPanel title="Sistem operasi" icon={<Monitor />} iconTone="default" items={details.os ?? []} tones={['cobalt', 'mint', 'warning']} />
        <BreakdownPanel title="Lokasi" icon={<Globe />} iconTone="warning" items={details.countries ?? []} tones={['warning', 'cobalt', 'mint']} />
      </div>
    </div>
  );
}

export default Dashboard;
