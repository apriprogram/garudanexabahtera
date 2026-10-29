// Klien (/admin/klien): clients CRUD, link to a customer account, project count (docs/platform/PROJECT-DOCS-SPEC.md §7).
// Everyone on the staff reads the list; adding, editing and deleting is admin only (backend enforces the same).
import { useState } from 'react';
import { Building2, Edit2, Mail, Phone, Plus, RotateCw, Trash2, UserRound } from 'lucide-react';
import {
  Badge,
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
  TBody,
  Td,
  Th,
  THead,
  Tr,
  cn,
} from '../../../components/admin/ui';
import { pdClientDelete, pdClientsList } from '../../../features/project-docs/api';
import { CLIENT_TYPE_LABEL, type ClientListItem, type ClientsListResponse } from '../../../features/project-docs/types';
import { errorMessage } from '../../../lib/api';
import { useDebounced, useToast } from '../template-orders/shared/hooks';
import { Toast } from '../template-orders/shared/OrderUi';
import { ClientFormDrawer } from './clients/ClientFormDrawer';
import { usePdQuery, useViewer } from './shared/hooks';

/** Akun login klien: email akun yang ditautkan, atau keterangan belum ditautkan. */
function LoginCell({ client }: { client: ClientListItem }) {
  return client.user_id ? (
    <Badge tone="mint" size="sm" className="max-w-[220px]">
      <span className="truncate">{client.user_email || `Akun #${client.user_id}`}</span>
    </Badge>
  ) : (
    <span className="text-xs text-adm-subtle">Belum ditautkan</span>
  );
}

function ContactCell({ client }: { client: ClientListItem }) {
  if (!client.email && !client.phone) return <span className="text-adm-subtle">-</span>;
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-[13px]">
      {client.email && (
        <span className="flex min-w-0 items-center gap-1.5 text-adm-fg">
          <Mail className="h-3.5 w-3.5 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
          <span className="truncate">{client.email}</span>
        </span>
      )}
      {client.phone && (
        <span className="flex items-center gap-1.5 text-adm-muted">
          <Phone className="h-3.5 w-3.5 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
          {client.phone}
        </span>
      )}
    </div>
  );
}

export default function ClientManager() {
  const { isAdmin } = useViewer();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 350);
  const query = usePdQuery<ClientsListResponse>(`clients:${q}`, () => pdClientsList(q ? { q } : {}));
  const clients = query.data?.clients ?? [];
  const { toast, show, dismiss } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientListItem | null>(null);
  const [toDelete, setToDelete] = useState<ClientListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (client: ClientListItem) => {
    setEditing(client);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await pdClientDelete({ id: toDelete.id });
      show('success', `Klien "${toDelete.name}" berhasil dihapus.`);
      setToDelete(null);
      query.reload();
    } catch (err) {
      show('error', `Gagal menghapus klien: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setDeleting(false);
    }
  };

  const actions = (client: ClientListItem) =>
    isAdmin && (
      <>
        <IconButton icon={<Edit2 />} label={`Edit ${client.name}`} size="sm" onClick={() => openEdit(client)} />
        <IconButton
          icon={<Trash2 />}
          label={`Hapus ${client.name}`}
          size="sm"
          variant="danger-ghost"
          onClick={() => setToDelete(client)}
          disabled={client.project_count > 0}
          title={client.project_count > 0 ? 'Masih dipakai proyek' : undefined}
        />
      </>
    );

  return (
    <div className="pb-10">
      <PageHeader
        title="Klien"
        description="Kelola data klien proyek dan akun yang mereka pakai untuk menyetujui dokumen."
        actions={
          <>
            <Button variant="secondary" icon={<RotateCw />} loading={query.loading && !query.initialLoading} onClick={query.reload}>
              Muat ulang
            </Button>
            {isAdmin && (
              <Button icon={<Plus />} onClick={openCreate}>
                Tambah klien
              </Button>
            )}
          </>
        }
      />

      {!isAdmin && (
        <Notice tone="mist" className="mb-4">
          Kamu bisa melihat data klien. Menambah, mengubah, dan menghapus klien hanya untuk administrator.
        </Notice>
      )}

      <Panel padding="none" className="overflow-hidden">
        <FilterBar
          left={
            <div className="flex min-h-9 items-center gap-2">
              <h2 className="text-[14px] font-semibold text-adm-fg sm:text-[15px]">Daftar klien</h2>
              {query.data && <span className="text-xs tabular-nums text-adm-muted">{clients.length} klien</span>}
            </div>
          }
          right={
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Cari klien, PIC, atau email..."
              controlSize="sm"
              wrapperClassName="w-full lg:w-72"
              aria-label="Cari klien"
            />
          }
        />

        {query.error && query.data && (
          <div className="px-4 pt-4 sm:px-5">
            <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={query.reload}>Coba lagi</Button>}>
              Gagal memuat klien: {query.error}
            </Notice>
          </div>
        )}

        {query.initialLoading ? (
          <>
            <LoadingState label="Memuat klien..." className="md:hidden" />
            <TableContainer className="hidden md:block">
              <Table>
                <TBody>
                  <TableSkeleton rows={5} cols={5} />
                </TBody>
              </Table>
            </TableContainer>
          </>
        ) : query.error && !query.data ? (
          <ErrorState title="Gagal memuat klien" error={query.error} onRetry={query.reload} />
        ) : clients.length === 0 ? (
          q ? (
            <EmptyState
              icon={<Building2 />}
              title="Klien tidak ditemukan."
              description="Coba kata kunci lain."
              action={
                <Button size="sm" variant="secondary" onClick={() => setSearch('')}>
                  Hapus pencarian
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Building2 />}
              title={isAdmin ? 'Belum ada klien. Tambah klien pertamamu.' : 'Belum ada klien.'}
              description="Data klien dipakai untuk identitas para pihak di BRD, PKS, BAST, dan invoice."
              action={
                isAdmin && (
                  <Button size="sm" icon={<Plus />} onClick={openCreate}>
                    Tambah klien
                  </Button>
                )
              }
            />
          )
        ) : (
          <div className={cn('transition-opacity', query.loading && 'opacity-60')}>
            <MobileList className="md:hidden">
              {clients.map((c) => (
                <MobileCard
                  key={c.id}
                  title={c.name}
                  subtitle={[CLIENT_TYPE_LABEL[c.type], c.city].filter(Boolean).join(' · ')}
                  trailing={<span className="text-xs tabular-nums text-adm-muted">{c.project_count} proyek</span>}
                  meta={[
                    { label: 'PIC', value: c.pic_name || '-' },
                    { label: 'Kontak', value: c.email || c.phone || '-' },
                  ]}
                  actions={actions(c) || undefined}
                >
                  <div className="mt-2.5">
                    <LoginCell client={c} />
                  </div>
                </MobileCard>
              ))}
            </MobileList>

            <TableContainer className="hidden md:block">
              <Table minWidth={880}>
                <THead>
                  <tr>
                    <Th>Klien</Th>
                    <Th>PIC</Th>
                    <Th>Kontak</Th>
                    <Th>Akun login</Th>
                    <Th align="right">Proyek</Th>
                    {isAdmin && <Th align="right">Aksi</Th>}
                  </tr>
                </THead>
                <TBody>
                  {clients.map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-adm-ghost text-adm-muted" aria-hidden>
                            {c.type === 'perorangan' ? <UserRound className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-semibold text-adm-fg">{c.name}</p>
                            <p className="text-xs text-adm-muted">{[CLIENT_TYPE_LABEL[c.type], c.city].filter(Boolean).join(' · ')}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {c.pic_name ? (
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-adm-fg">{c.pic_name}</p>
                            {c.pic_title && <p className="truncate text-xs text-adm-muted">{c.pic_title}</p>}
                          </div>
                        ) : (
                          <span className="text-adm-subtle">-</span>
                        )}
                      </Td>
                      <Td>
                        <ContactCell client={c} />
                      </Td>
                      <Td>
                        <LoginCell client={c} />
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {c.project_count}
                      </Td>
                      {isAdmin && (
                        <Td align="right">
                          <div className="flex justify-end gap-1">{actions(c)}</div>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </Panel>

      {isAdmin && (
        <ClientFormDrawer
          open={formOpen}
          client={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(name, isEdit) => {
            setFormOpen(false);
            query.reload();
            show('success', isEdit ? `Klien "${name}" berhasil diperbarui.` : `Klien "${name}" berhasil ditambahkan.`);
          }}
          notify={show}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => (deleting ? undefined : setToDelete(null))}
        onConfirm={handleDelete}
        loading={deleting}
        tone="danger"
        title="Hapus klien?"
        description={
          <>
            Klien <span className="font-semibold text-adm-fg">"{toDelete?.name}"</span> akan dihapus. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmText="Ya, hapus"
        cancelText="Batal"
      />

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}
