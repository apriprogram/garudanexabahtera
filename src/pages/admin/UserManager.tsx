import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Edit2, Trash2, Mail, Shield, ShieldCheck, ShoppingBag, Camera, Upload, Phone, Users, type LucideIcon } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  LoadingState,
  MobileCard,
  MobileList,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  Panel,
  PanelFooter,
  Pagination,
  PasswordInput,
  SearchInput,
  Segmented,
  Select,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '../../components/admin/ui';
import { apiPost, errorMessage } from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';
import { useToast } from './template-orders/shared/hooks';
import { Toast } from './template-orders/shared/OrderUi';

/** Peran `users.role` (SPEC §2): admin & user = staf panel admin, customer = pembeli template. */
type Role = 'admin' | 'user' | 'customer';
type RoleFilter = 'all' | 'staff' | 'customer';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: 'active' | 'inactive';
  password?: string;
  avatar?: string;
}

const API_URL = '/api.php';

const ROLES: Role[] = ['admin', 'user', 'customer'];
const STAFF_ROLES: Role[] = ['admin', 'user'];

const ROLE_META: Record<Role, { label: string; icon: LucideIcon; hint: string }> = {
  admin: { label: 'Admin', icon: ShieldCheck, hint: 'Akses penuh panel admin, termasuk kelola pengguna.' },
  user: { label: 'Staf', icon: Shield, hint: 'Masuk panel admin tanpa menu khusus admin seperti kelola pengguna.' },
  customer: { label: 'Pembeli', icon: ShoppingBag, hint: 'Pembeli template: hanya halaman Akun Saya (/akun), tidak bisa membuka panel admin.' },
};

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'staff', label: 'Staf' },
  { value: 'customer', label: 'Pembeli' },
];

const isRole = (value: unknown): value is Role => typeof value === 'string' && (ROLES as string[]).includes(value);

/** Filter "Staf" mencakup admin + staf; "Pembeli" hanya customer. */
const matchesRoleFilter = (role: Role, filter: RoleFilter) =>
  filter === 'all' || (filter === 'customer' ? role === 'customer' : STAFF_ROLES.includes(role));

/** Subjek notifikasi: `Pengguna "Budi"`, atau "Pengguna" saja bila namanya kosong. */
const userLabel = (name: string | undefined) => (name?.trim() ? `Pengguna "${name.trim()}"` : 'Pengguna');

/** Peran di tabel & kartu HP: ikon + label (Admin / Staf / Pembeli). */
const RoleLabel: React.FC<{ role: string }> = ({ role }) => {
  if (!isRole(role)) return <span className="text-[13px] text-adm-subtle">{role || '—'}</span>;
  const { label, icon: Icon } = ROLE_META[role];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-adm-muted">
      <Icon className={`h-4 w-4 ${role === 'admin' ? 'text-cobalt' : 'text-adm-subtle'}`} strokeWidth={1.75} aria-hidden />
      {label}
    </span>
  );
};

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  // setState di sini hanya terjadi setelah respons API
  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}?action=get_users`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError("Gagal terhubung ke API. Pastikan server API berjalan (lihat 'cara menjalankan aplikasi').");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    loadUsers();
  };

  useEffect(() => {
    // loading=true dan error=null sudah menjadi state awal; loadUsers baru memanggil setState setelah await,
    // tetapi aturan ini tidak membedakan fungsi async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showPassword, setShowPassword] = useState(false);

  // Akun yang sedang login (peran dari token). Halaman ini khusus admin (lihat Layout), tetapi UI tetap
  // mengikuti aturan server: non-admin hanya bisa mengubah profil sendiri tanpa mengubah peran/status,
  // dan tidak bisa menambah/menghapus akun.
  const [viewer] = useState(getCurrentUser);
  const viewerIsAdmin = viewer?.role === 'admin';
  const isSelf = (user: User) => viewer != null && Number(user.id) === Number(viewer.id);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user' as Role,
    status: 'active' as 'active' | 'inactive',
    password: '',
    avatar: ''
  });

  // Peran & status dikunci untuk non-admin (server memaksa nilai lamanya) dan untuk akun sendiri
  // (mencegah admin mengunci dirinya keluar dari panel).
  const editingSelf = editingUser != null && isSelf(editingUser);
  const accessLocked = !viewerIsAdmin || editingSelf;
  const accessLockedHint = viewerIsAdmin
    ? 'Peran dan status akun yang sedang kamu pakai tidak bisa diubah di sini.'
    : 'Hanya admin yang bisa mengubah peran dan status akun.';

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: isRole(user.role) ? user.role : 'user',
        status: user.status,
        password: '', // Keep blank for edit unless changing
        avatar: user.avatar || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        status: 'active',
        password: '',
        avatar: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // Simpan & hapus lewat apiPost: respons gagal ({error}, HTTP bukan 2xx, koneksi putus) dilempar sebagai ApiError
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingUser ? 'update_user' : 'add_user';
    const payload = editingUser ? { ...formData, id: editingUser.id } : { ...formData };

    try {
      await apiPost(action, payload);
      show('success', editingUser ? `${userLabel(formData.name)} berhasil diperbarui.` : `${userLabel(formData.name)} berhasil ditambahkan.`);
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      show('error', 'Gagal menyimpan pengguna.', errorMessage(error, 'Terjadi kesalahan. Coba lagi.'));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400; // Profile photos don't need to be huge
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, avatar: compressedDataUrl });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Dipanggil tombol "Ya, hapus" di dialog konfirmasi; dialog tetap terbuka bila gagal
  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await apiPost('delete_user', { id: userToDelete.id });
      show('success', `${userLabel(userToDelete.name)} berhasil dihapus.`);
      fetchUsers();
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      show('error', 'Gagal menghapus pengguna.', errorMessage(error, 'Terjadi kesalahan. Coba lagi.'));
    } finally {
      setDeleting(false);
    }
  };

  const roleCounts: Record<RoleFilter, number> = {
    all: users.length,
    staff: users.filter((u) => matchesRoleFilter(u.role, 'staff')).length,
    customer: users.filter((u) => matchesRoleFilter(u.role, 'customer')).length,
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter(
    (u) =>
      matchesRoleFilter(u.role, roleFilter) &&
      (!query || (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)),
  );

  const emptyTitle = query ? 'Pengguna tidak ditemukan.' : roleFilter === 'customer' ? 'Belum ada pembeli.' : roleFilter === 'staff' ? 'Belum ada staf.' : 'Belum ada pengguna.';
  const emptyDescription = query
    ? 'Coba kata kunci lain atau pilih filter peran lain.'
    : roleFilter === 'customer'
      ? 'Akun pembeli muncul di sini setelah pembeli mendaftar di website.'
      : undefined;

  const avatar = (user: User, size = 'h-9 w-9') => (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-adm-cobalt-soft text-[13px] font-semibold text-adm-cobalt-fg ${size}`}>
      {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0)}
    </span>
  );

  const rowActions = (user: User) => (
    <>
      <IconButton icon={<Edit2 />} label={`Edit ${user.name}`} size="sm" onClick={() => handleOpenModal(user)} />
      {/* Tambah/hapus akun khusus admin; server juga menolak menghapus akun yang sedang dipakai */}
      {viewerIsAdmin &&
        (isSelf(user) ? (
          <span title="Akun yang sedang dipakai tidak bisa dihapus" className="inline-flex">
            <IconButton icon={<Trash2 />} label="Akun yang sedang dipakai tidak bisa dihapus" size="sm" variant="danger-ghost" disabled />
          </span>
        ) : (
          <IconButton icon={<Trash2 />} label={`Hapus ${user.name}`} size="sm" variant="danger-ghost" onClick={() => confirmDelete(user)} />
        ))}
    </>
  );

  return (
    <div className="pb-10">
      <PageHeader
        title="Pengguna"
        description="Kelola akun staf panel admin dan pembeli template di sini."
        actions={
          viewerIsAdmin ? (
            <Button icon={<UserPlus />} onClick={() => handleOpenModal()}>
              Tambah pengguna
            </Button>
          ) : undefined
        }
      />

      <Panel padding="none" className="overflow-hidden">
        <FilterBar
          left={
            <Segmented
              size="sm"
              ariaLabel="Filter peran"
              value={roleFilter}
              onChange={setRoleFilter}
              items={ROLE_FILTERS.map((f) => ({ ...f, count: loading ? undefined : roleCounts[f.value] }))}
            />
          }
          right={
            <SearchInput
              placeholder="Cari nama atau email..."
              aria-label="Cari pengguna"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              controlSize="sm"
              wrapperClassName="w-full sm:w-80"
            />
          }
        />

        {loading ? (
          <LoadingState label="Memuat pengguna..." />
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon={<Users />} title={emptyTitle} description={emptyDescription} size="sm" />
        ) : (
          <>
            {/* HP: kartu bertumpuk */}
            <MobileList className="md:hidden">
              {filteredUsers.map((user) => (
                <MobileCard
                  key={user.id}
                  leading={avatar(user)}
                  title={user.name}
                  subtitle={user.email}
                  trailing={<Badge status={user.status} />}
                  meta={[
                    { label: 'Peran', value: <RoleLabel role={user.role} /> },
                    { label: 'Nomor HP', value: user.phone || '—' },
                  ]}
                  actions={rowActions(user)}
                />
              ))}
            </MobileList>

            {/* Desktop: tabel */}
            <TableContainer className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <Th>Pengguna</Th>
                    <Th>Peran</Th>
                    <Th>Status</Th>
                    <Th>Kontak</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {filteredUsers.map((user) => (
                    <Tr key={user.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          {avatar(user)}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-adm-fg">{user.name}</p>
                            <p className="truncate text-xs text-adm-muted">{user.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <RoleLabel role={user.role} />
                      </Td>
                      <Td>
                        <Badge status={user.status} />
                      </Td>
                      <Td muted>
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                            {user.email}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                            {user.phone}
                          </span>
                        </div>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">{rowActions(user)}</div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </>
        )}

        <PanelFooter>
          <Pagination page={1} totalPages={1} summary={`${filteredUsers.length} hasil`} />
        </PanelFooter>
      </Panel>

      {/* Modal tambah/edit */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit pengguna' : 'Tambah pengguna'}
        description={editingUser ? 'Perbarui data dan hak akses pengguna ini.' : 'Buat akun baru untuk staf atau pembeli.'}
        icon={<UserPlus />}
        size="md"
        customBody
      >
        <form onSubmit={handleUserSubmit} className="flex min-h-0 flex-1 flex-col">
          <ModalBody className="space-y-5">
            {/* Foto profil */}
            <div className="flex flex-col items-center gap-2">
              <div className="group relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-adm-line-strong bg-adm-ghost transition-colors group-hover:border-cobalt">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-adm-subtle" strokeWidth={1.75} />
                  )}
                </div>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-obsidian/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-5 w-5 text-white" strokeWidth={1.75} />
                  <span className="sr-only">Unggah foto profil</span>
                  <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
              <span className="text-xs font-medium text-adm-muted">Foto profil</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nama lengkap">
                <Input type="text" autoComplete="name" placeholder="Masukkan nama lengkap" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="nama@contoh.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Field>
              <Field label="Nomor HP">
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0812..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </Field>
              <Field label="Peran" hint={accessLocked ? accessLockedHint : ROLE_META[formData.role].hint}>
                <Select
                  aria-label="Peran"
                  value={formData.role}
                  disabled={accessLocked}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_META[role].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status akun">
                <Select
                  aria-label="Status akun"
                  value={formData.status}
                  disabled={accessLocked}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </Select>
              </Field>
              <Field label="Kata sandi" optional={editingUser ? '(opsional)' : undefined}>
                <PasswordInput
                  show={showPassword}
                  onShowChange={setShowPassword}
                  autoComplete="new-password"
                  placeholder="Masukkan kata sandi"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </Field>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="secondary" onClick={handleCloseModal}>
              Batal
            </Button>
            <Button type="submit">{editingUser ? 'Simpan' : 'Tambah pengguna'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Konfirmasi hapus */}
      <ConfirmDialog
        open={isDeleteModalOpen}
        onClose={() => (deleting ? undefined : setIsDeleteModalOpen(false))}
        onConfirm={handleExecuteDelete}
        loading={deleting}
        tone="danger"
        title="Hapus pengguna?"
        description={
          <>
            Akun <span className="font-semibold text-adm-fg">"{userToDelete?.name}"</span> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmText="Ya, hapus"
        cancelText="Batal"
      />

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
};

export default UserManager;
