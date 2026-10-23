// Drawer tambah/edit proyek klien (dipindah dari Dashboard): add_project / update_project.
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, Reorder, motion } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  Camera,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Download,
  FileBox,
  FileText,
  Globe,
  GripVertical,
  Lock,
  Mail,
  Paperclip,
  Phone,
  Play,
  Trash,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  Button,
  Drawer,
  FLOAT_PANEL,
  Field,
  IconBox,
  IconButton,
  Input,
  MENU_ITEM,
  ModalBody,
  ModalFooter,
  Notice,
  Select,
  Switch,
  Textarea,
  cn,
  controlClass,
} from '../../../components/admin/ui';
import { projectIssues } from '../../../components/sections/projects/presentable';
import { ApiError, apiPost, errorMessage, readImageAsDataUrl } from '../../../lib/api';
import { getRole } from '../../../lib/auth';
import { downloadProjectFile, parseProjectFiles, toDateInput, type Project, type ProjectFile, type ProjectStatus, type UserLite } from './projectShared';
import { Avatar, SectionTitle } from './ProjectUi';

// Input tanggal: ikon kalender bawaan dibuat transparan menutupi seluruh field.
const DATE_INPUT =
  'appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0';

const MAX_FILE_MB = 10;
const MAX_IMAGE_MB = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s().-]{8,20}$/;

const STATUS_OPTIONS: { id: ProjectStatus; label: string; icon: typeof Play; iconColor: string }[] = [
  { id: 'active', label: 'Aktif / berjalan', icon: Play, iconColor: 'text-cobalt' },
  { id: 'pending', label: 'Menunggu tinjauan', icon: Clock, iconColor: 'text-warning' },
  { id: 'completed', label: 'Selesai', icon: CheckCircle, iconColor: 'text-adm-mint-fg' },
  { id: 'canceled', label: 'Dibatalkan', icon: XCircle, iconColor: 'text-danger' },
];

type FormData = {
  name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_type: string;
  status: string;
  /** null = belum ditentukan (kolom kosong) */
  price: number | null;
  start_date: string;
  end_date: string;
  image: string;
  project_files: string;
  description: string;
  assigned_user: string;
  show_on_website: boolean;
};
type FormErrors = Partial<Record<keyof FormData | 'files', string>>;

const today = () => new Date().toISOString().split('T')[0];

function formFrom(project: Project | null): FormData {
  if (!project) {
    return {
      name: '',
      client_name: '',
      client_email: '',
      client_phone: '',
      service_type: 'website',
      status: 'active',
      price: null,
      start_date: today(),
      end_date: '',
      image: '',
      project_files: '[]',
      description: '',
      assigned_user: '',
      show_on_website: false,
    };
  }
  return {
    name: project.name,
    client_name: project.client_name,
    client_email: project.client_email || '',
    client_phone: project.client_phone || '',
    service_type: project.service_type || 'website',
    status: project.status || 'pending',
    price: project.price == null || !Number.isFinite(Number(project.price)) ? null : Math.round(Number(project.price)),
    start_date: toDateInput(project.start_date),
    end_date: toDateInput(project.end_date),
    image: project.image || '',
    project_files: project.project_files || '[]',
    description: project.description || '',
    assigned_user: project.assigned_user || '',
    show_on_website: Number(project.show_on_website) === 1,
  };
}

function validate(f: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!f.client_name.trim()) errors.client_name = 'Nama klien wajib diisi.';
  if (f.client_email.trim() && !EMAIL_RE.test(f.client_email.trim())) errors.client_email = 'Format email tidak valid, mis. klien@contoh.com';
  if (f.client_phone.trim() && !PHONE_RE.test(f.client_phone.trim())) errors.client_phone = 'Nomor HP tidak valid. Gunakan 8–15 digit, mis. 081234567890.';
  if (!f.name.trim()) errors.name = 'Nama proyek wajib diisi.';
  if (f.start_date && f.end_date && f.end_date < f.start_date) errors.end_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  return errors;
}

export function ProjectFormDrawer({
  open,
  project,
  usersList,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  /** null = proyek baru */
  project: Project | null;
  usersList: UserLite[];
  onClose: () => void;
  onSaved: (isEdit: boolean, name: string) => void;
  onError: (message: string) => void;
}) {
  const [formData, setFormData] = useState<FormData>(() => formFrom(project));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  // Nilai kontrak (price) hanya diisi/diubah admin; backend menolak price dari non-admin (403, docs/platform/SPEC.md §2)
  const [canEditPrice] = useState(() => getRole() === 'admin');

  // Isi ulang form setiap kali drawer dibuka (proyek baru atau proyek lain)
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevProject, setPrevProject] = useState(project);
  if (open !== prevOpen || (open && project !== prevProject)) {
    setPrevOpen(open);
    setPrevProject(project);
    if (open) {
      setFormData(formFrom(project));
      setErrors({});
      setSaveError('');
      setIsUserDropdownOpen(false);
      setIsStatusDropdownOpen(false);
    }
  }

  const isEdit = !!project;

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const currentProjectFiles = useMemo(
    () =>
      parseProjectFiles(formData.project_files).map((file, i) => ({
        ...file,
        id: file.id || `legacy-${file.name}-${file.size || i}`,
      })),
    [formData.project_files],
  );

  const staffUsers = useMemo(() => usersList.filter((u) => u.role !== 'customer'), [usersList]);
  // Syarat tampil di #projects beranda (sama dengan section Projects): gambar, deskripsi >= 40 karakter, bukan teks uji
  const homepageIssues = projectIssues(formData);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      update('image', await readImageAsDataUrl(file, MAX_IMAGE_MB));
    } catch (err) {
      setErrors((x) => ({ ...x, image: errorMessage(err) }));
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const tooBig = files.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    setErrors((x) => ({ ...x, files: tooBig.length ? `${tooBig.map((f) => f.name).join(', ')} melebihi ${MAX_FILE_MB} MB.` : undefined }));
    files
      .filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newFile: ProjectFile = {
            id: Math.random().toString(36).substring(2, 11) + Date.now(),
            name: file.name,
            type: file.type,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            data: event.target?.result as string,
          };
          setFormData((prev) => ({ ...prev, project_files: JSON.stringify([...parseProjectFiles(prev.project_files), newFile]) }));
        };
        reader.readAsDataURL(file);
      });
  };

  const removeFile = (index: number) => {
    const next = parseProjectFiles(formData.project_files).filter((_, i) => i !== index);
    setFormData((f) => ({ ...f, project_files: JSON.stringify(next) }));
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadFile = async (file: ProjectFile & { id: string }) => {
    setDownloadingId(file.id);
    try {
      await downloadProjectFile(file);
    } catch (err) {
      setErrors((x) => ({ ...x, files: `Gagal mengunduh ${file.name}: ${errorMessage(err)}` }));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const found = validate(formData);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`project-${first}`)?.focus();
      return;
    }
    setIsSaving(true);
    const action = isEdit ? 'update_project' : 'add_project';
    const { price, ...rest } = formData;
    // Anggaran kosong = belum ditentukan (NULL). Saat edit proyek yang anggarannya memang belum ditentukan,
    // `price` tidak dikirim sama sekali agar update_project (hanya mengubah field yang dikirim) tetap NULL.
    // Non-admin tidak pernah mengirim `price` (nilai kontrak hanya untuk admin).
    const sendPrice = canEditPrice && !(isEdit && price == null && project?.price == null);
    const payload = {
      ...rest,
      ...(sendPrice ? { price } : {}),
      show_on_website: formData.show_on_website ? 1 : 0,
      ...(project ? { id: project.id } : {}),
    };
    try {
      await apiPost(action, payload);
      onSaved(isEdit, formData.name.trim());
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 0
          ? "Tidak bisa terhubung ke server API. Pastikan server API berjalan (lihat 'cara menjalankan aplikasi')."
          : `Gagal menyimpan: ${errorMessage(err, 'kesalahan tidak diketahui')}`;
      setSaveError(message);
      onError(err instanceof ApiError && err.status === 0 ? 'Tidak bisa terhubung ke server.' : 'Gagal menyimpan proyek.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = STATUS_OPTIONS.find((o) => o.id === formData.status) ?? STATUS_OPTIONS[1];
  const StatusIcon = currentStatus.icon;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit proyek' : 'Buat proyek baru'}
      description="Kelola informasi proyek dan detail klien."
      width="sm:max-w-xl md:max-w-2xl"
      customBody
    >
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="custom-scrollbar space-y-7 sm:space-y-8">
          {project?.source === 'website' && (
            <Notice tone="cobalt" icon={<Globe />} title="Pesanan dari website">
              Proyek ini dikirim calon klien lewat form pesanan custom. Ubah statusnya ke Aktif setelah penawaran disepakati.
            </Notice>
          )}

          {/* Media */}
          <section>
            <SectionTitle icon={Camera}>Media & pratinjau</SectionTitle>
            <div className="group relative mx-auto w-full max-w-sm">
              {/* Rasio 4:3 = rasio kartu proyek di beranda (gambar dipotong dari atas, object-top) */}
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-adm-line-strong bg-adm-ghost transition-colors group-hover:border-cobalt/60">
                {formData.image ? (
                  <img src={formData.image} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-4 text-adm-subtle">
                    <Upload className="h-7 w-7" strokeWidth={1.75} />
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-adm-fg">Taruh gambar proyek di sini</p>
                      <p className="mt-0.5 text-xs text-adm-muted">Disarankan 1600×1200 px, maks. {MAX_IMAGE_MB} MB</p>
                    </div>
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-obsidian/60 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <span className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-obsidian">{formData.image ? 'Ganti gambar' : 'Pilih gambar'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} aria-label="Unggah gambar proyek" />
              </label>
            </div>
            {errors.image && (
              <p className="mt-2 text-center text-xs text-adm-danger-fg" role="alert">
                {errors.image}
              </p>
            )}
            {formData.image && (
              <div className="mt-2 flex justify-center">
                <Button variant="ghost" size="sm" icon={<Trash />} onClick={() => update('image', '')}>
                  Hapus gambar
                </Button>
              </div>
            )}
          </section>

          {/* Info klien */}
          <section>
            <SectionTitle icon={Users}>Informasi klien</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nama klien" required htmlFor="project-client_name" error={errors.client_name}>
                <Input
                  id="project-client_name"
                  type="text"
                  value={formData.client_name}
                  invalid={!!errors.client_name}
                  onChange={(e) => update('client_name', e.target.value)}
                  placeholder="Nama klien atau perusahaan"
                />
              </Field>
              <Field label="WhatsApp / nomor HP" htmlFor="project-client_phone" error={errors.client_phone}>
                <Input
                  id="project-client_phone"
                  type="text"
                  inputMode="tel"
                  leftIcon={<Phone />}
                  value={formData.client_phone}
                  invalid={!!errors.client_phone}
                  onChange={(e) => update('client_phone', e.target.value)}
                  placeholder="+62..."
                />
              </Field>
              <Field label="Email klien" htmlFor="project-client_email" error={errors.client_email} className="md:col-span-2">
                <Input
                  id="project-client_email"
                  type="email"
                  autoCapitalize="none"
                  leftIcon={<Mail />}
                  value={formData.client_email}
                  invalid={!!errors.client_email}
                  onChange={(e) => update('client_email', e.target.value)}
                  placeholder="mis. klien@contoh.com"
                />
              </Field>
            </div>
          </section>

          {/* Spesifikasi */}
          <section>
            <SectionTitle icon={Briefcase}>Spesifikasi proyek</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nama proyek" required htmlFor="project-name" error={errors.name}>
                <Input
                  id="project-name"
                  type="text"
                  value={formData.name}
                  invalid={!!errors.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="mis. Aplikasi e-commerce"
                />
              </Field>
              <Field label="Kategori layanan" htmlFor="project-service_type">
                <Select id="project-service_type" value={formData.service_type} onChange={(e) => update('service_type', e.target.value)}>
                  <option value="website">Pengembangan website</option>
                  <option value="mobile_app">Aplikasi mobile</option>
                  <option value="ui_ux">Desain UI/UX</option>
                  <option value="other">Layanan lainnya</option>
                </Select>
              </Field>
              <Field label="Status proyek">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isStatusDropdownOpen}
                    className={cn(controlClass('md'), 'flex cursor-pointer items-center justify-between gap-2 text-left')}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <StatusIcon className={cn('h-4 w-4 shrink-0', currentStatus.iconColor)} strokeWidth={1.75} />
                      <span className="truncate font-medium text-adm-fg">{currentStatus.label}</span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-adm-subtle transition-transform', isStatusDropdownOpen && 'rotate-180')} strokeWidth={1.75} />
                  </button>

                  <AnimatePresence>
                    {isStatusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          role="listbox"
                          className={cn('absolute left-0 right-0 top-full z-50 mt-1.5 flex flex-col gap-0.5', FLOAT_PANEL)}
                        >
                          {STATUS_OPTIONS.map((opt) => {
                            const IconComponent = opt.icon;
                            const selected = formData.status === opt.id;
                            return (
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                key={opt.id}
                                onClick={() => {
                                  update('status', opt.id);
                                  setIsStatusDropdownOpen(false);
                                }}
                                className={cn(MENU_ITEM, 'justify-between', selected && 'bg-adm-hover')}
                              >
                                <span className="flex min-w-0 items-center gap-3">
                                  <IconComponent className={cn('h-4 w-4 shrink-0', opt.iconColor)} strokeWidth={1.75} />
                                  <span className={cn('truncate text-sm font-medium', selected ? 'text-adm-fg' : 'text-adm-muted')}>{opt.label}</span>
                                </span>
                                {selected && <CheckCircle className="h-4 w-4 shrink-0 text-cobalt" strokeWidth={1.75} />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </Field>
              <Field label="Penanggung jawab (PM)">
                <div className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-haspopup="listbox"
                    aria-expanded={isUserDropdownOpen}
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsUserDropdownOpen(!isUserDropdownOpen);
                      }
                    }}
                    className={cn(controlClass('md'), 'flex h-auto min-h-11 cursor-pointer items-center justify-between gap-2 py-1.5')}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {formData.assigned_user ? (
                        formData.assigned_user.split(', ').map((userName, i) => {
                          const user = usersList.find((u) => u.name === userName);
                          return (
                            <div key={i} className="flex min-w-0 items-center gap-1.5 rounded-full bg-adm-cobalt-soft py-0.5 pl-1 pr-1.5 ring-1 ring-inset ring-cobalt/20">
                              <Avatar src={user?.avatar} initial={userName.charAt(0).toUpperCase()} className="h-5 w-5 text-[11px]" />
                              <span className="truncate text-xs font-medium text-adm-cobalt-fg">{userName}</span>
                              <button
                                type="button"
                                aria-label={`Hapus ${userName}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = formData.assigned_user ? formData.assigned_user.split(', ').filter((x) => x) : [];
                                  update('assigned_user', current.filter((u) => u !== userName).join(', '));
                                }}
                                className="relative shrink-0 rounded-full p-0.5 text-adm-cobalt-fg/60 transition-colors hover:bg-adm-danger-soft hover:text-adm-danger-fg max-sm:after:absolute max-sm:after:-inset-2"
                              >
                                <X className="h-3 w-3" strokeWidth={2} />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-adm-subtle">-- Pilih pengguna --</span>
                      )}
                    </div>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-adm-subtle transition-transform', isUserDropdownOpen && 'rotate-180')} strokeWidth={1.75} />
                  </div>

                  <AnimatePresence>
                    {isUserDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          role="listbox"
                          aria-multiselectable="true"
                          className={cn('custom-scrollbar absolute left-0 right-0 top-full z-50 mt-1.5 flex max-h-60 flex-col gap-0.5 overflow-y-auto', FLOAT_PANEL)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              update('assigned_user', '');
                              setIsUserDropdownOpen(false);
                            }}
                            className={cn(MENU_ITEM, 'text-adm-muted hover:text-adm-fg')}
                          >
                            -- Kosongkan --
                          </button>
                          {staffUsers.length === 0 && <p className="px-3 py-2 text-[13px] text-adm-muted">Belum ada pengguna staf.</p>}
                          {staffUsers.map((u) => {
                            const isSelected = formData.assigned_user?.split(', ').includes(u.name);
                            return (
                              <button
                                type="button"
                                role="option"
                                aria-selected={!!isSelected}
                                key={u.id}
                                onClick={() => {
                                  const current = formData.assigned_user ? formData.assigned_user.split(', ').filter((x) => x) : [];
                                  const next = isSelected ? current.filter((x) => x !== u.name) : [...current, u.name];
                                  update('assigned_user', next.join(', '));
                                }}
                                className={cn(MENU_ITEM, 'justify-between py-1.5', isSelected && 'bg-adm-cobalt-soft hover:bg-adm-cobalt-soft')}
                              >
                                <span className="flex min-w-0 items-center gap-3">
                                  <Avatar src={u.avatar} alt={u.name} initial={u.name ? u.name.charAt(0).toUpperCase() : '?'} />
                                  <span className={cn('truncate text-sm font-medium', isSelected ? 'text-adm-cobalt-fg' : 'text-adm-fg')}>{u.name}</span>
                                </span>
                                {isSelected && <CheckCircle className="h-4 w-4 shrink-0 text-cobalt" strokeWidth={1.75} />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </Field>
            </div>
          </section>

          {/* Keuangan & jadwal */}
          <section>
            <SectionTitle icon={DollarSign}>Keuangan & jadwal</SectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {canEditPrice ? (
                <Field label="Anggaran (IDR)" htmlFor="project-price" error={errors.price} hint="Kosongkan bila penawaran belum disepakati." className="md:col-span-2">
                  <Input
                    id="project-price"
                    type="text"
                    inputMode="numeric"
                    leftIcon="Rp"
                    mono
                    className="font-semibold"
                    value={formData.price == null ? '' : formData.price.toLocaleString('id-ID')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\./g, '').trim();
                      if (val === '') update('price', null);
                      else if (/^\d+$/.test(val) && val.length <= 13) update('price', Number(val));
                    }}
                    placeholder="Belum ditentukan"
                  />
                </Field>
              ) : (
                <Field
                  label="Anggaran (IDR)"
                  htmlFor="project-price"
                  hint={<span id="project-price-note">Nilai kontrak hanya dapat diisi dan diubah oleh admin.</span>}
                  className="md:col-span-2"
                >
                  <Input
                    id="project-price"
                    type="text"
                    readOnly
                    aria-describedby="project-price-note"
                    leftIcon="Rp"
                    rightIcon={<Lock />}
                    mono
                    className="cursor-default bg-adm-ghost font-semibold text-adm-muted"
                    value={formData.price == null ? '' : formData.price.toLocaleString('id-ID')}
                    placeholder="Belum ditentukan"
                  />
                </Field>
              )}
              <Field label="Tanggal mulai" htmlFor="project-start_date" error={errors.start_date}>
                <Input
                  id="project-start_date"
                  type="date"
                  leftIcon={<Calendar />}
                  rightIcon={<ChevronDown />}
                  value={formData.start_date}
                  onChange={(e) => {
                    update('start_date', e.target.value);
                    if (errors.end_date) setErrors((x) => ({ ...x, end_date: undefined }));
                  }}
                  className={DATE_INPUT}
                />
              </Field>
              <Field label="Perkiraan tanggal selesai" htmlFor="project-end_date" error={errors.end_date}>
                <Input
                  id="project-end_date"
                  type="date"
                  leftIcon={<CheckCircle />}
                  rightIcon={<ChevronDown />}
                  value={formData.end_date}
                  invalid={!!errors.end_date}
                  min={formData.start_date || undefined}
                  onChange={(e) => update('end_date', e.target.value)}
                  className={DATE_INPUT}
                />
              </Field>
            </div>
          </section>

          {/* Website */}
          <section>
            <SectionTitle icon={Globe}>Tampil di website</SectionTitle>
            <div className="rounded-2xl bg-adm-ghost px-4 py-3.5">
              <Switch
                id="project-show_on_website"
                checked={formData.show_on_website}
                onChange={(on) => update('show_on_website', on)}
                label="Tampilkan di website"
                description="Proyek tampil di bagian Projects di beranda (nama, layanan, gambar, dan deskripsi; tanpa harga dan kontak klien). Syaratnya ada gambar dan deskripsi minimal 40 karakter; beranda baru menampilkan proyek bila minimal 2 proyek memenuhinya."
              />
            </div>
            {formData.show_on_website && homepageIssues.length > 0 && (
              <Notice tone="warning" title="Belum tampil di beranda" className="mt-3">
                Proyek ini belum memenuhi syarat: {homepageIssues.join(', ')}.
              </Notice>
            )}
          </section>

          {/* Materi proyek */}
          <section>
            <SectionTitle icon={Paperclip}>Materi proyek</SectionTitle>

            <Reorder.Group
              axis="y"
              values={currentProjectFiles}
              onReorder={(newFiles) => setFormData((f) => ({ ...f, project_files: JSON.stringify(newFiles) }))}
              className="space-y-2.5"
            >
              {currentProjectFiles.map((file, index) => (
                <Reorder.Item
                  key={file.id}
                  value={file}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 12px 32px -8px rgba(24, 29, 37, 0.12), 0 2px 6px rgba(24, 29, 37, 0.04)',
                  }}
                  className="group relative z-0 flex cursor-grab items-center justify-between gap-3 rounded-xl bg-adm-surface p-3 ring-1 ring-inset ring-adm-line transition-colors hover:ring-adm-line-strong active:cursor-grabbing"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <GripVertical className="h-4 w-4 shrink-0 text-adm-subtle transition-colors group-hover:text-adm-muted" strokeWidth={1.75} />
                    <IconBox icon={<FileText />} tone="cobalt" size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-adm-fg">{file.name}</p>
                      <p className="text-[11px] uppercase text-adm-subtle">{file.size}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                    <IconButton icon={<Download />} label="Unduh file" size="sm" loading={downloadingId === file.id} onClick={() => downloadFile(file)} />
                    <IconButton icon={<Trash />} label="Hapus file" size="sm" variant="danger-ghost" onClick={() => removeFile(index)} />
                  </div>
                </Reorder.Item>
              ))}

              <label className="group flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-adm-line-strong p-4 transition-colors focus-within:border-cobalt hover:border-cobalt/50 hover:bg-adm-hover">
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.rar,.zip" className="sr-only" onChange={handleFileUpload} />
                <FileBox className="h-5 w-5 shrink-0 text-adm-subtle transition-colors group-hover:text-cobalt" strokeWidth={1.75} />
                <div className="min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-adm-fg">Unggah materi</p>
                  <p className="text-xs text-adm-muted">PDF, gambar, atau arsip, maks. {MAX_FILE_MB} MB per file</p>
                </div>
              </label>
            </Reorder.Group>
            {errors.files && (
              <p className="mt-2 text-xs text-adm-danger-fg" role="alert">
                {errors.files}
              </p>
            )}
          </section>

          {/* Deskripsi */}
          <section>
            <SectionTitle>Deskripsi & catatan</SectionTitle>
            <Textarea
              rows={8}
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              className="custom-scrollbar min-h-[250px] resize-none"
              placeholder="Tulis ruang lingkup proyek, kebutuhan teknis, atau catatan tambahan dari klien..."
              aria-label="Deskripsi & catatan"
            />
          </section>
        </ModalBody>

        {saveError && (
          <div className="shrink-0 px-5 pt-3 sm:px-6">
            <Notice tone="danger">{saveError}</Notice>
          </div>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="submit" loading={isSaving}>
            {isSaving ? 'Menyimpan...' : isEdit ? 'Simpan perubahan' : 'Buat proyek'}
          </Button>
        </ModalFooter>
      </form>
    </Drawer>
  );
}

export default ProjectFormDrawer;
