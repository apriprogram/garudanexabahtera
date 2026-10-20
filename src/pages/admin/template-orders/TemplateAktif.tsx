// Template Aktif (/admin/pesanan-template/template-aktif): situs pembeli yang sudah aktif (admin_get_active_sites)
// + nonaktifkan sementara / aktifkan kembali (admin_set_site_status). SPEC §6, §9.
import { useState } from 'react';
import { BadgeCheck, ExternalLink, Globe, PauseCircle, PlayCircle, RotateCw } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
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
  SearchInput,
  Table,
  TableContainer,
  TableSkeleton,
  Tabs,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  cn,
} from '../../../components/admin/ui';
import { apiPost, errorMessage } from '../../../lib/api';
import { formatTanggal, type Site, type SiteStatus } from '../../../types/platform';
import { useApiQuery, useToast } from './shared/hooks';
import { SiteStatusBadge, Toast } from './shared/OrderUi';
import { siteHref } from './shared/orderUtils';

type SitesResponse = { sites: Site[] };
type StatusFilter = 'all' | SiteStatus;

export default function TemplateAktif() {
  const list = useApiQuery<SitesResponse>('admin_get_active_sites');
  const { toast, show, dismiss } = useToast();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<Site | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const sites = list.data?.sites ?? [];
  const counts = {
    all: sites.length,
    active: sites.filter((s) => s.status === 'active').length,
    suspended: sites.filter((s) => s.status === 'suspended').length,
  };
  const term = search.trim().toLowerCase();
  const visible = sites.filter(
    (s) =>
      (filter === 'all' || s.status === filter) &&
      (!term ||
        [s.domain, s.owner_name, s.owner_email, s.template_name, s.order_number].some((v) => String(v ?? '').toLowerCase().includes(term))),
  );

  const setStatus = async (site: Site, status: SiteStatus) => {
    setBusyId(site.id);
    try {
      const res = await apiPost<{ site: Site }>('admin_set_site_status', { id: site.id, status });
      list.mutate((d) => ({ sites: d.sites.map((s) => (s.id === site.id ? { ...s, ...res.site, content: null } : s)) }));
      setSuspendTarget(null);
      show('success', status === 'suspended' ? `Situs ${site.domain} berhasil dinonaktifkan.` : `Situs ${site.domain} berhasil diaktifkan kembali.`);
    } catch (err) {
      show('error', `Gagal mengubah status situs: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusyId(null);
    }
  };

  const domainLink = (site: Site) => (
    <a
      href={siteHref(site.domain)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="relative inline-flex max-w-full items-center gap-1.5 font-mono text-[13px] font-semibold text-adm-link hover:underline"
    >
      <span className="truncate">{site.domain}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">(buka di tab baru)</span>
    </a>
  );

  const actions = (site: Site) => (
    <>
      <Button size="sm" variant="secondary" icon={<Globe />} href={`/situs/${site.id}`} target="_blank" rel="noopener noreferrer">
        Lihat situs
      </Button>
      {site.status === 'active' ? (
        <Button size="sm" variant="danger-soft" icon={<PauseCircle />} disabled={busyId != null} onClick={() => setSuspendTarget(site)}>
          Nonaktifkan
        </Button>
      ) : (
        <Button size="sm" variant="success" icon={<PlayCircle />} loading={busyId === site.id} disabled={busyId != null} onClick={() => setStatus(site, 'active')}>
          Aktifkan
        </Button>
      )}
    </>
  );

  return (
    <div className="pb-10">
      <PageHeader
        title="Template Aktif"
        description="Situs pembeli yang sudah aktif. Kamu bisa menonaktifkan sementara atau mengaktifkan kembali."
        actions={
          <Button variant="secondary" icon={<RotateCw />} loading={list.loading && !list.initialLoading} onClick={list.reload}>
            Muat ulang
          </Button>
        }
      />

      <Panel padding="none" className="overflow-hidden">
        <FilterBar
          left={
            <Tabs
              size="sm"
              ariaLabel="Filter status situs"
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: 'Semua', count: list.data ? counts.all : undefined },
                { value: 'active', label: 'Aktif', count: list.data ? counts.active : undefined },
                { value: 'suspended', label: 'Dinonaktifkan', count: list.data ? counts.suspended : undefined },
              ]}
            />
          }
          right={
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Cari domain, pemilik, template..."
              controlSize="sm"
              wrapperClassName="w-full lg:w-72"
              aria-label="Cari situs"
            />
          }
        />

        {list.error && list.data && (
          <div className="px-4 pt-4 sm:px-5">
            <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={list.reload}>Coba lagi</Button>}>
              Gagal memuat situs: {list.error}
            </Notice>
          </div>
        )}

        {list.initialLoading ? (
          <>
            <LoadingState label="Memuat situs..." className="md:hidden" />
            <TableContainer className="hidden md:block">
              <Table>
                <TBody>
                  <TableSkeleton rows={4} cols={6} />
                </TBody>
              </Table>
            </TableContainer>
          </>
        ) : list.error && !list.data ? (
          <ErrorState title="Gagal memuat situs" error={list.error} onRetry={list.reload} />
        ) : visible.length === 0 ? (
          sites.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck />}
              title="Belum ada template aktif."
              description="Situs muncul di sini setelah kamu mengisi domain final di Input Domain."
              action={
                <Button size="sm" variant="secondary" to="/admin/pesanan-template/input-domain">
                  Buka Input Domain
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Globe />}
              title="Situs tidak ditemukan."
              description="Coba ubah kata kunci atau filter status."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                >
                  Hapus filter
                </Button>
              }
            />
          )
        ) : (
          <div className={cn('transition-opacity', list.loading && 'opacity-60')}>
            <MobileList className="md:hidden">
              {visible.map((site) => (
                <MobileCard
                  key={site.id}
                  title={domainLink(site)}
                  subtitle={`${site.owner_name || '-'} · ${site.template_name}`}
                  trailing={<SiteStatusBadge status={site.status} size="sm" />}
                  meta={[
                    { label: 'Email pemilik', value: site.owner_email || '-' },
                    { label: 'Tanggal aktif', value: formatTanggal(site.activated_at) },
                    { label: 'No. order', value: <span className="font-mono tabular-nums">{site.order_number}</span> },
                  ]}
                  actions={actions(site)}
                />
              ))}
            </MobileList>

            <TableContainer className="hidden md:block">
              <Table minWidth={940}>
                <THead>
                  <tr>
                    <Th>Domain</Th>
                    <Th>Pemilik</Th>
                    <Th>Template</Th>
                    <Th>Tanggal aktif</Th>
                    <Th>Status</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((site) => (
                    <Tr key={site.id}>
                      <Td>
                        <div className="max-w-[260px]">{domainLink(site)}</div>
                        <p className="mt-0.5 font-mono text-xs tabular-nums text-adm-muted">{site.order_number}</p>
                      </Td>
                      <Td>
                        <p className="max-w-[200px] truncate font-medium text-adm-fg">{site.owner_name || '-'}</p>
                        <p className="max-w-[200px] truncate text-xs text-adm-muted">{site.owner_email || '-'}</p>
                      </Td>
                      <Td>
                        <p className="max-w-[180px] truncate text-adm-fg">{site.template_name}</p>
                        <p className="max-w-[180px] truncate font-mono text-xs text-adm-muted">{site.template_code}</p>
                      </Td>
                      <Td muted nowrap className="text-[13px]">
                        {formatTanggal(site.activated_at)}
                      </Td>
                      <Td>
                        <SiteStatusBadge status={site.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <IconButton icon={<Globe />} label={`Lihat situs ${site.domain}`} size="sm" href={`/situs/${site.id}`} target="_blank" rel="noopener noreferrer" />
                          {site.status === 'active' ? (
                            <Button size="sm" variant="danger-soft" icon={<PauseCircle />} disabled={busyId != null} onClick={() => setSuspendTarget(site)}>
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="success"
                              icon={<PlayCircle />}
                              loading={busyId === site.id}
                              disabled={busyId != null}
                              onClick={() => setStatus(site, 'active')}
                            >
                              Aktifkan
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => (busyId != null ? undefined : setSuspendTarget(null))}
        onConfirm={() => suspendTarget && setStatus(suspendTarget, 'suspended')}
        loading={busyId != null}
        tone="danger"
        icon={<PauseCircle />}
        title="Nonaktifkan situs?"
        description={
          <>
            Situs <span className="font-mono font-semibold text-adm-fg">{suspendTarget?.domain}</span> tidak bisa dibuka pengunjung dan pemilik tidak bisa
            mengubah kontennya sampai kamu mengaktifkannya kembali. Konten yang tersimpan tidak dihapus.
          </>
        }
        confirmText="Ya, nonaktifkan"
      />

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}
