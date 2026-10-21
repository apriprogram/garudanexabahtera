// Project Clients (/admin/project-clients): pengelolaan proyek custom (dipindah dari Dashboard) + toggle
// "Tampilkan di website" (show_on_website) dan badge "Dari website" (source = website). SPEC §6, §9.
// Query: ?new=1 membuka form proyek baru (dipakai tombol "Tambah proyek" di Dashboard), ?filter=website = pesanan baru dari website.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, Clock, Edit2, Eye, FolderKanban, Globe, Inbox, Plus, RotateCw, Trash2 } from 'lucide-react';
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
  Switch,
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
import { useApiQuery, useToast } from '../template-orders/shared/hooks';
import { Toast } from '../template-orders/shared/OrderUi';
import { ProjectFormDrawer } from './ProjectFormDrawer';
import { ProjectViewDrawer } from './ProjectViewDrawer';
import { Avatar, DeadlineBadge, ProjectStatusBadge, ProjectThumb, SourceBadge } from './ProjectUi';
import {
  formatProjectPrice,
  isNewWebsiteSubmission,
  normalizeProject,
  projectTimeline,
  serviceLabel,
  type Project,
  type RawProject,
  type UserLite,
} from './projectShared';

type Filter = 'all' | 'website' | 'active' | 'pending' | 'completed' | 'canceled';
const FILTERS: Filter[] = ['all', 'website', 'active', 'pending', 'completed', 'canceled'];
const FILTER_LABEL: Record<Filter, string> = {
  all: 'Semua',
  website: 'Baru dari website',
  active: 'Aktif',
  pending: 'Menunggu',
  completed: 'Selesai',
  canceled: 'Dibatalkan',
};

const matchesFilter = (p: Project, filter: Filter) => {
  if (filter === 'all') return true;
  if (filter === 'website') return isNewWebsiteSubmission(p);
  if (filter === 'canceled') return p.status === 'canceled' || p.status === 'cancel';
  return p.status === filter;
};

export default function ProjectClients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter') as Filter | null;
  const filter: Filter = filterParam && FILTERS.includes(filterParam) ? filterParam : 'all';
  const createOpen = searchParams.get('new') === '1';

  const projectsQuery = useApiQuery<RawProject[]>('get_projects');
  const usersQuery = useApiQuery<UserLite[]>('get_users');
  const { toast, show, dismiss } = useToast();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewing, setViewing] = useState<Project | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const projects = useMemo(() => (Array.isArray(projectsQuery.data) ? projectsQuery.data.map(normalizeProject) : []), [projectsQuery.data]);
  const usersList = useMemo(() => (Array.isArray(usersQuery.data) ? usersQuery.data : []), [usersQuery.data]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const counts = Object.fromEntries(FILTERS.map((f) => [f, projects.filter((p) => matchesFilter(p, f)).length])) as Record<Filter, number>;
  const term = search.trim().toLowerCase();
  const visible = projects.filter(
    (p) => matchesFilter(p, filter) && (!term || [p.name, p.client_name, p.client_email, p.client_phone].some((v) => v.toLowerCase().includes(term))),
  );

  // Drawer form: ?new=1 = proyek baru, editOpen = edit proyek
  const formOpen = createOpen || editOpen;
  // Proyek di form tetap sama selama animasi tutup (judul tidak berganti)
  const currentFormProject = editOpen ? editing : createOpen ? null : undefined;
  const [formProject, setFormProject] = useState<Project | null>(currentFormProject ?? null);
  if (currentFormProject !== undefined && currentFormProject !== formProject) setFormProject(currentFormProject);

  const openCreate = () => {
    setEditOpen(false);
    setParam('new', '1');
  };
  const openEdit = (project: Project) => {
    setViewOpen(false);
    if (createOpen) setParam('new', null);
    setEditing(project);
    setEditOpen(true);
  };
  const closeForm = () => {
    setEditOpen(false);
    if (createOpen) setParam('new', null);
  };
  const openView = (project: Project) => {
    setViewing(project);
    setViewOpen(true);
  };

  const handleSaved = (isEdit: boolean, name: string) => {
    closeForm();
    projectsQuery.reload();
    show('success', isEdit ? `Proyek "${name}" berhasil diperbarui.` : `Proyek "${name}" berhasil ditambahkan.`);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiPost('delete_project', { id: toDelete.id });
      show('success', `Proyek "${toDelete.name}" berhasil dihapus.`);
      setToDelete(null);
      if (viewing?.id === toDelete.id) setViewOpen(false);
      projectsQuery.reload();
    } catch (err) {
      show('error', `Gagal menghapus proyek: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setDeleting(false);
    }
  };

  const toggleWebsite = async (project: Project, next: boolean) => {
    const value = next ? 1 : 0;
    const setFlag = (flag: number) =>
      projectsQuery.mutate((rows) => rows.map((r) => (Number(r.id) === project.id ? { ...r, show_on_website: flag } : r)));
    setTogglingId(project.id);
    setFlag(value);
    try {
      await apiPost('update_project', { id: project.id, show_on_website: value });
      show('success', next ? `"${project.name}" sekarang tampil di website.` : `"${project.name}" disembunyikan dari website.`);
      if (viewing?.id === project.id) setViewing({ ...project, show_on_website: value });
    } catch (err) {
      setFlag(project.show_on_website);
      show('error', `Gagal memperbarui proyek: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setTogglingId(null);
    }
  };

  const websiteSwitch = (project: Project, withLabel = false) => {
    const id = `web-${project.id}`;
    return withLabel ? (
      <Switch
        id={id}
        size="sm"
        checked={project.show_on_website === 1}
        disabled={togglingId === project.id}
        onChange={(on) => toggleWebsite(project, on)}
        label="Tampilkan di website"
        className="mt-3 rounded-xl bg-adm-ghost px-3 py-2.5"
      />
    ) : (
      <span className="relative inline-flex items-center">
        <Switch id={id} size="sm" checked={project.show_on_website === 1} disabled={togglingId === project.id} onChange={(on) => toggleWebsite(project, on)} />
        <label htmlFor={id} className="sr-only">
          Tampilkan {project.name} di website
        </label>
      </span>
    );
  };

  const projectActions = (project: Project) => (
    <>
      {/* Workspace dokumen proyek: BRD, penawaran, kontrak, jadwal, UAT, BAST, invoice (PROJECT-DOCS-SPEC §7) */}
      <IconButton icon={<FolderKanban />} label="Buka workspace" size="sm" to={`/admin/proyek/${project.id}`} />
      <IconButton icon={<Eye />} label="Lihat detail" size="sm" onClick={() => openView(project)} />
      <IconButton icon={<Edit2 />} label="Edit proyek" size="sm" onClick={() => openEdit(project)} />
      <IconButton icon={<Trash2 />} label="Hapus proyek" size="sm" variant="danger-ghost" onClick={() => setToDelete(project)} />
    </>
  );

  const priceCell = (project: Project) => {
    const price = formatProjectPrice(project);
    return price ?? <span className="font-normal text-adm-subtle">Belum ditentukan</span>;
  };

  return (
    <div className="pb-10">
      <PageHeader
        title="Project Clients"
        description="Kelola proyek custom website dan aplikasi mobile, termasuk pesanan baru dari website."
        actions={
          <>
            <Button variant="secondary" icon={<RotateCw />} loading={projectsQuery.loading && !projectsQuery.initialLoading} onClick={projectsQuery.reload}>
              Muat ulang
            </Button>
            <Button icon={<Plus />} onClick={openCreate}>
              Tambah proyek
            </Button>
          </>
        }
      />

      {counts.website > 0 && filter !== 'website' && (
        <Notice
          tone="cobalt"
          icon={<Globe />}
          className="mb-4"
          title={`${counts.website} pesanan custom baru dari website`}
          action={
            <Button size="sm" variant="secondary" onClick={() => setParam('filter', 'website')}>
              Tampilkan
            </Button>
          }
        >
          Tinjau kebutuhannya, hubungi calon klien, lalu ubah statusnya setelah penawaran disepakati.
        </Notice>
      )}

      <Panel padding="none" className="overflow-hidden">
        <FilterBar
          left={
            <Tabs
              size="sm"
              ariaLabel="Filter proyek"
              value={filter}
              onChange={(v) => setParam('filter', v === 'all' ? null : v)}
              items={FILTERS.map((f) => ({
                value: f,
                label: FILTER_LABEL[f],
                icon: f === 'website' ? <Globe /> : undefined,
                count: projectsQuery.data ? counts[f] : undefined,
              }))}
            />
          }
          right={
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Cari proyek atau klien..."
              controlSize="sm"
              wrapperClassName="w-full lg:w-64"
              aria-label="Cari proyek"
            />
          }
        />

        {projectsQuery.error && projectsQuery.data && (
          <div className="px-4 pt-4 sm:px-5">
            <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={projectsQuery.reload}>Coba lagi</Button>}>
              Gagal memuat proyek: {projectsQuery.error}
            </Notice>
          </div>
        )}

        {projectsQuery.initialLoading ? (
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
        ) : projectsQuery.error && !projectsQuery.data ? (
          <ErrorState title="Gagal memuat proyek" error={projectsQuery.error} onRetry={projectsQuery.reload} />
        ) : visible.length === 0 ? (
          projects.length === 0 ? (
            <EmptyState
              icon={<Briefcase />}
              title="Belum ada proyek. Tambah proyek pertamamu."
              action={
                <Button size="sm" icon={<Plus />} onClick={openCreate}>
                  Tambah proyek
                </Button>
              }
            />
          ) : filter === 'website' && !term ? (
            <EmptyState icon={<Inbox />} title="Belum ada pesanan custom baru dari website." description="Pesanan dari halaman Pesan Custom akan muncul di sini." />
          ) : (
            <EmptyState
              icon={<Briefcase />}
              title="Proyek tidak ditemukan."
              description="Coba ubah kata kunci atau filter."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setParam('filter', null);
                  }}
                >
                  Hapus filter
                </Button>
              }
            />
          )
        ) : (
          <div className={cn('transition-opacity', projectsQuery.loading && 'opacity-60')}>
            {/* HP: kartu bertumpuk */}
            <MobileList className="md:hidden">
              {visible.map((project) => {
                const timeline = projectTimeline(project);
                return (
                  <MobileCard
                    key={project.id}
                    leading={<ProjectThumb project={project} />}
                    title={project.name}
                    subtitle={project.client_name}
                    trailing={<ProjectStatusBadge status={project.status} size="sm" />}
                    meta={[
                      { label: 'Layanan', value: serviceLabel(project.service_type) },
                      { label: 'Anggaran', value: <span className="tabular-nums">{priceCell(project)}</span> },
                      { label: 'Jadwal', value: timeline.durationLabel },
                      { label: 'Penanggung jawab', value: project.assigned_user || '-' },
                    ]}
                    actions={projectActions(project)}
                  >
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <SourceBadge source={project.source} />
                      <DeadlineBadge project={project} />
                    </div>
                    {websiteSwitch(project, true)}
                  </MobileCard>
                );
              })}
            </MobileList>

            {/* Desktop: tabel */}
            <TableContainer className="hidden md:block">
              <Table minWidth={900}>
                <THead>
                  <tr>
                    <Th>Proyek</Th>
                    <Th>Layanan</Th>
                    <Th>Status</Th>
                    <Th className="hidden xl:table-cell">Jadwal</Th>
                    <Th className="hidden xl:table-cell">Penanggung jawab</Th>
                    <Th align="center">Di website</Th>
                    <Th align="right">Anggaran</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((project) => {
                    const timeline = projectTimeline(project);
                    const owners = project.assigned_user ? project.assigned_user.split(', ') : [];
                    return (
                      <Tr key={project.id}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <ProjectThumb project={project} />
                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate font-semibold text-adm-fg">{project.name}</p>
                              <p className="max-w-[260px] truncate text-xs text-adm-muted">{project.client_name}</p>
                              <SourceBadge source={project.source} className="mt-1" />
                            </div>
                          </div>
                        </Td>
                        <Td muted nowrap>
                          {serviceLabel(project.service_type)}
                        </Td>
                        <Td>
                          <ProjectStatusBadge status={project.status} />
                        </Td>
                        <Td className="hidden xl:table-cell">
                          <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-adm-muted">
                              <Clock className="h-3.5 w-3.5 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                              {timeline.durationLabel}
                            </span>
                            <div className="mt-1.5">
                              <DeadlineBadge project={project} />
                            </div>
                          </div>
                        </Td>
                        <Td className="hidden xl:table-cell">
                          {owners.length ? (
                            <div className="flex items-center">
                              <div className="flex -space-x-2">
                                {owners.map((userName, i) => {
                                  const user = usersList.find((u) => u.name === userName);
                                  return (
                                    <span key={i} title={userName} className="inline-flex rounded-full ring-2 ring-adm-surface">
                                      <Avatar src={user?.avatar} initial={userName.charAt(0).toUpperCase()} className="h-7 w-7 text-[11px]" />
                                    </span>
                                  );
                                })}
                              </div>
                              <div className="ml-3 min-w-0">
                                <p className="truncate text-[13px] font-medium leading-none text-adm-fg">{owners[0]}</p>
                                {owners.length > 1 && <p className="mt-1 text-xs text-adm-muted">+{owners.length - 1} lainnya</p>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-adm-subtle">-</span>
                          )}
                        </Td>
                        <Td align="center">{websiteSwitch(project)}</Td>
                        <Td align="right" nowrap className="font-semibold tabular-nums">
                          {priceCell(project)}
                        </Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1">{projectActions(project)}</div>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </Panel>

      <ProjectFormDrawer
        open={formOpen}
        project={formProject}
        usersList={usersList}
        onClose={closeForm}
        onSaved={handleSaved}
        onError={(message) => show('error', message)}
      />

      <ProjectViewDrawer open={viewOpen} project={viewing} usersList={usersList} onClose={() => setViewOpen(false)} onEdit={openEdit} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => (deleting ? undefined : setToDelete(null))}
        onConfirm={handleDelete}
        loading={deleting}
        tone="danger"
        title="Hapus proyek?"
        description={
          <>
            Proyek <span className="font-semibold text-adm-fg">"{toDelete?.name}"</span> akan dihapus. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmText="Ya, hapus"
        cancelText="Batal"
      />

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}
