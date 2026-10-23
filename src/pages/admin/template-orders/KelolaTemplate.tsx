// Kelola Template (/admin/pesanan-template/kelola-template): CRUD katalog template (admin_get_templates,
// admin_save_template, admin_delete_template). SPEC §3, §6, §9.
import { useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutTemplate,
  ListChecks,
  Plus,
  RotateCw,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  IconButton,
  Input,
  LoadingState,
  MobileCard,
  MobileList,
  ModalBody,
  ModalFooter,
  Notice,
  PageHeader,
  Panel,
  SearchInput,
  SectionLabel,
  Select,
  Switch,
  Table,
  TableContainer,
  TableSkeleton,
  Tabs,
  TBody,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
  cn,
} from '../../../components/admin/ui';
import { ApiError, apiPost, errorMessage, readImageAsDataUrl } from '../../../lib/api';
import { getRole } from '../../../lib/auth';
import { TEMPLATE_OPTIONS } from '../../../templates';
import { formatRupiah, type Template, type TemplateStatus } from '../../../types/platform';
import { useApiQuery, useToast } from './shared/hooks';
import { Toast } from './shared/OrderUi';
import { SLUG_PATTERN, formatRupiahInput, parseRupiahInput, slugify } from './shared/orderUtils';

type TemplatesResponse = { templates: Template[] };
type StatusFilter = 'all' | TemplateStatus;

const DEFAULT_CATEGORY = 'Company Profile';
const MAX_FEATURES = 30;
const MAX_GALLERY = 12;
const MAX_IMAGE_MB = 2;
const DEMO_URL_PATTERN = /^(https?:\/\/\S+|\/(?!\/)\S*)$/i;
const KNOWN_CODES = new Set(TEMPLATE_OPTIONS.map((o) => o.code));

type ListItem = { key: string; value: string };

type FormState = {
  id: number | null;
  name: string;
  slug: string;
  /** Slug diketik manual (tidak lagi mengikuti nama) */
  slugTouched: boolean;
  category: string;
  short_description: string;
  description: string;
  features: ListItem[];
  price: number | null;
  preview_image: string;
  gallery: ListItem[];
  template_code: string;
  demo_url: string;
  status: TemplateStatus;
  sort_order: string;
};

type FormErrors = Partial<Record<keyof FormState | 'features_item' | string, string>>;

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const toItems = (values: string[]) => values.map((value) => ({ key: newKey(), value }));

const demoHref = (t: Pick<Template, 'demo_url' | 'slug'>) => t.demo_url || `/demo/${t.slug}`;

function emptyForm(nextOrder: number): FormState {
  return {
    id: null,
    name: '',
    slug: '',
    slugTouched: false,
    category: DEFAULT_CATEGORY,
    short_description: '',
    description: '',
    features: toItems(['']),
    price: null,
    preview_image: '',
    gallery: [],
    template_code: TEMPLATE_OPTIONS[0]?.code ?? '',
    demo_url: '',
    status: 'draft',
    sort_order: String(nextOrder),
  };
}

function formFromTemplate(t: Template): FormState {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    slugTouched: true,
    category: t.category || DEFAULT_CATEGORY,
    short_description: t.short_description ?? '',
    description: t.description ?? '',
    features: toItems(t.features.length ? t.features : ['']),
    price: Number(t.price) || 0,
    preview_image: t.preview_image ?? '',
    gallery: toItems(t.gallery ?? []),
    template_code: t.template_code,
    demo_url: t.demo_url ?? '',
    status: t.status,
    sort_order: String(t.sort_order ?? 0),
  };
}

/** Payload admin_save_template dari template tersimpan (dipakai untuk ubah status cepat). */
function payloadFromTemplate(t: Template, patch: Partial<Template> = {}) {
  const merged = { ...t, ...patch };
  return {
    id: merged.id,
    slug: merged.slug,
    name: merged.name,
    category: merged.category,
    short_description: merged.short_description ?? '',
    description: merged.description ?? '',
    features: merged.features ?? [],
    price: Number(merged.price) || 0,
    preview_image: merged.preview_image ?? '',
    gallery: merged.gallery ?? [],
    template_code: merged.template_code,
    demo_url: merged.demo_url ?? '',
    status: merged.status,
    sort_order: merged.sort_order ?? 0,
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Nama template wajib diisi.';
  else if (name.length < 3) errors.name = 'Nama template minimal 3 karakter.';
  else if (name.length > 150) errors.name = 'Nama template maksimal 150 karakter.';

  const slug = form.slug.trim();
  if (slug && (slug.length > 120 || !SLUG_PATTERN.test(slug))) {
    errors.slug = 'Slug hanya huruf kecil, angka, dan tanda hubung, mis. company-profile-modern.';
  }

  const category = form.category.trim();
  if (!category) errors.category = 'Kategori wajib diisi.';
  else if (category.length > 80) errors.category = 'Kategori maksimal 80 karakter.';

  if (form.short_description.trim().length > 255) errors.short_description = 'Deskripsi singkat maksimal 255 karakter.';
  if (form.description.trim().length > 20000) errors.description = 'Deskripsi maksimal 20.000 karakter.';

  const features = form.features.map((f) => f.value.trim()).filter(Boolean);
  if (features.length > MAX_FEATURES) errors.features = `Fitur maksimal ${MAX_FEATURES} item.`;
  else if (features.some((f) => f.length > 200)) errors.features = 'Setiap fitur maksimal 200 karakter.';

  if (form.price == null) errors.price = 'Harga wajib diisi.';
  else if (form.price > 999_999_999_999) errors.price = 'Harga terlalu besar.';
  // Sama dengan kedua backend: template terbit tanpa harga tidak bisa dibeli dan membatalkan deploy
  else if (form.status === 'published' && form.price <= 0) {
    errors.price = 'Template yang terbit harus punya harga di atas 0. Simpan sebagai draft bila harganya belum ada.';
  }

  if (!form.template_code) errors.template_code = 'Pilih kode template dari daftar.';

  const demo = form.demo_url.trim();
  if (demo && (demo.length > 500 || !DEMO_URL_PATTERN.test(demo))) errors.demo_url = 'URL demo harus diawali https:// atau /.';

  if (!/^-?\d{1,6}$/.test(form.sort_order.trim())) errors.sort_order = 'Urutan harus berupa angka bulat.';

  if (form.gallery.length > MAX_GALLERY) errors.gallery = `Galeri maksimal ${MAX_GALLERY} gambar.`;
  return errors;
}

export default function KelolaTemplate() {
  const list = useApiQuery<TemplatesResponse>('admin_get_templates');
  const { toast, show, dismiss } = useToast();
  const isAdmin = getRole() === 'admin';

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleteInUse, setDeleteInUse] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState<number | null>(null);

  const templates = useMemo(() => list.data?.templates ?? [], [list.data]);
  const categories = useMemo(() => {
    const set = new Set<string>([DEFAULT_CATEGORY]);
    templates.forEach((t) => t.category && set.add(t.category));
    return [...set].sort((a, b) => a.localeCompare(b, 'id'));
  }, [templates]);

  const counts = {
    all: templates.length,
    published: templates.filter((t) => t.status === 'published').length,
    draft: templates.filter((t) => t.status === 'draft').length,
  };
  const term = search.trim().toLowerCase();
  const visible = templates.filter(
    (t) =>
      (filter === 'all' || t.status === filter) &&
      (!term || [t.name, t.slug, t.category, t.template_code].some((v) => String(v ?? '').toLowerCase().includes(term))),
  );

  const openCreate = () => {
    const nextOrder = templates.reduce((max, t) => Math.max(max, Number(t.sort_order) || 0), 0) + 1;
    setForm(emptyForm(nextOrder));
    setFormKey((k) => k + 1);
    setDrawerOpen(true);
  };
  const openEdit = (t: Template) => {
    setForm(formFromTemplate(t));
    setFormKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const handleSaved = (saved: Template, isNew: boolean) => {
    setDrawerOpen(false);
    show('success', isNew ? `Template "${saved.name}" berhasil ditambahkan.` : `Template "${saved.name}" berhasil diperbarui.`);
    list.reload();
  };

  const setStatus = async (t: Template, status: TemplateStatus) => {
    setStatusBusy(t.id);
    try {
      await apiPost<{ template: Template }>('admin_save_template', payloadFromTemplate(t, { status }));
      list.mutate((d) => ({ templates: d.templates.map((x) => (x.id === t.id ? { ...x, status } : x)) }));
      show('success', status === 'published' ? `Template "${t.name}" berhasil diterbitkan.` : `Template "${t.name}" berhasil dijadikan draf.`);
      list.reload();
      return true;
    } catch (err) {
      show('error', `Gagal mengubah status: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      return false;
    } finally {
      setStatusBusy(null);
    }
  };

  const openDelete = (t: Template) => {
    setDeleteInUse(null);
    setDeleteTarget(t);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteInUse) {
      // Template dipakai pesanan: tawarkan ubah ke draf
      if (deleteTarget.status === 'draft') {
        setDeleteTarget(null);
        return;
      }
      setDeleting(true);
      const ok = await setStatus(deleteTarget, 'draft');
      setDeleting(false);
      if (ok) setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await apiPost('admin_delete_template', { id: deleteTarget.id });
      show('success', `Template "${deleteTarget.name}" berhasil dihapus.`);
      setDeleteTarget(null);
      list.reload();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TEMPLATE_IN_USE') {
        setDeleteInUse(err.message || 'Template sudah dipakai pesanan sehingga tidak bisa dihapus.');
      } else {
        show('error', `Gagal menghapus template: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const thumb = (t: Template, className?: string) => (
    <span className={cn('flex h-11 w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-adm-ghost ring-1 ring-inset ring-adm-line', className)}>
      {t.preview_image ? (
        <img src={t.preview_image} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <LayoutTemplate className="h-[18px] w-[18px] text-adm-subtle" strokeWidth={1.75} aria-hidden />
      )}
    </span>
  );

  const statusBadge = (t: Template, size?: 'sm' | 'md') => <Badge status={t.status} size={size} />;

  const rowActions = (t: Template) => (
    <>
      <IconButton icon={<ExternalLink />} label="Lihat demo" size="sm" href={demoHref(t)} target="_blank" rel="noopener noreferrer" />
      <IconButton icon={<Edit2 />} label="Edit template" size="sm" onClick={() => openEdit(t)} />
      <IconButton
        icon={t.status === 'published' ? <EyeOff /> : <Eye />}
        label={t.status === 'published' ? 'Jadikan draf' : 'Terbitkan'}
        size="sm"
        loading={statusBusy === t.id}
        disabled={statusBusy != null}
        onClick={() => setStatus(t, t.status === 'published' ? 'draft' : 'published')}
      />
      {isAdmin && <IconButton icon={<Trash2 />} label="Hapus template" size="sm" variant="danger-ghost" onClick={() => openDelete(t)} />}
    </>
  );

  return (
    <div className="pb-10">
      <PageHeader
        title="Kelola Template"
        description="Atur katalog template yang tampil di website: harga, gambar, dan status terbit."
        actions={
          <>
            <Button variant="secondary" icon={<RotateCw />} loading={list.loading && !list.initialLoading} onClick={list.reload}>
              Muat ulang
            </Button>
            <Button icon={<Plus />} onClick={openCreate}>
              Tambah template
            </Button>
          </>
        }
      />

      <Panel padding="none" className="overflow-hidden">
        <FilterBar
          left={
            <Tabs
              size="sm"
              ariaLabel="Filter status template"
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: 'Semua', count: list.data ? counts.all : undefined },
                { value: 'published', label: 'Terbit', count: list.data ? counts.published : undefined },
                { value: 'draft', label: 'Draf', count: list.data ? counts.draft : undefined },
              ]}
            />
          }
          right={
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Cari template..."
              controlSize="sm"
              wrapperClassName="w-full lg:w-64"
              aria-label="Cari template"
            />
          }
        />

        {list.error && list.data && (
          <div className="px-4 pt-4 sm:px-5">
            <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={list.reload}>Coba lagi</Button>}>
              Gagal memuat template: {list.error}
            </Notice>
          </div>
        )}

        {list.initialLoading ? (
          <>
            <LoadingState label="Memuat template..." className="md:hidden" />
            <TableContainer className="hidden md:block">
              <Table>
                <TBody>
                  <TableSkeleton rows={4} cols={6} />
                </TBody>
              </Table>
            </TableContainer>
          </>
        ) : list.error && !list.data ? (
          <ErrorState title="Gagal memuat template" error={list.error} onRetry={list.reload} />
        ) : visible.length === 0 ? (
          templates.length === 0 ? (
            <EmptyState
              icon={<LayoutTemplate />}
              title="Belum ada template."
              description="Tambah template pertamamu agar bisa dipesan pembeli di website."
              action={
                <Button size="sm" icon={<Plus />} onClick={openCreate}>
                  Tambah template
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<LayoutTemplate />}
              title="Template tidak ditemukan."
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
              {visible.map((t) => (
                <MobileCard
                  key={t.id}
                  leading={thumb(t, 'h-10 w-16')}
                  title={t.name}
                  subtitle={`${t.category} · ${t.template_code}`}
                  trailing={statusBadge(t, 'sm')}
                  meta={[
                    { label: 'Harga', value: <span className="tabular-nums">{formatRupiah(t.price)}</span> },
                    { label: 'Urutan', value: <span className="tabular-nums">{t.sort_order}</span> },
                  ]}
                  actions={rowActions(t)}
                >
                  {!KNOWN_CODES.has(t.template_code) && (
                    <Badge tone="danger" size="sm" className="mt-2.5">
                      Kode template tidak dikenal
                    </Badge>
                  )}
                </MobileCard>
              ))}
            </MobileList>

            <TableContainer className="hidden md:block">
              <Table minWidth={860}>
                <THead>
                  <tr>
                    <Th>Template</Th>
                    <Th>Kategori</Th>
                    <Th align="right">Harga</Th>
                    <Th>Status</Th>
                    <Th align="center">Urutan</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((t) => (
                    <Tr key={t.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          {thumb(t)}
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-semibold text-adm-fg">{t.name}</p>
                            <p className="max-w-[260px] truncate font-mono text-xs text-adm-muted">
                              /{t.slug} · {t.template_code}
                            </p>
                            {!KNOWN_CODES.has(t.template_code) && (
                              <Badge tone="danger" size="sm" className="mt-1">
                                Kode template tidak dikenal
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Chip icon={<Tag />}>{t.category}</Chip>
                      </Td>
                      <Td align="right" nowrap className="font-semibold tabular-nums">
                        {formatRupiah(t.price)}
                      </Td>
                      <Td>{statusBadge(t)}</Td>
                      <Td align="center" muted className="tabular-nums">
                        {t.sort_order}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">{rowActions(t)}</div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </Panel>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={form?.id ? 'Edit template' : 'Tambah template'}
        description="Data ini tampil di katalog website dan halaman detail template."
        width="sm:max-w-xl md:max-w-2xl"
        customBody
      >
        {form && (
          <TemplateForm
            key={formKey}
            initial={form}
            categories={categories}
            onCancel={() => setDrawerOpen(false)}
            onSaved={handleSaved}
            onError={(message) => show('error', message)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
        onConfirm={handleDelete}
        loading={deleting}
        tone={deleteInUse ? 'default' : 'danger'}
        icon={deleteInUse ? <EyeOff /> : undefined}
        title={deleteInUse ? 'Template sedang dipakai' : 'Hapus template?'}
        description={
          deleteInUse ? (
            deleteTarget?.status === 'draft' ? (
              <>
                Template <span className="font-semibold text-adm-fg">"{deleteTarget?.name}"</span> sudah dipakai pesanan sehingga tidak bisa dihapus. Statusnya
                sudah draf, jadi tidak tampil di website.
              </>
            ) : (
              <>
                Template <span className="font-semibold text-adm-fg">"{deleteTarget?.name}"</span> sudah dipakai pesanan sehingga tidak bisa dihapus. Jadikan
                draf agar tidak tampil di website tanpa mengganggu riwayat pesanan.
              </>
            )
          ) : (
            <>
              Template <span className="font-semibold text-adm-fg">"{deleteTarget?.name}"</span> beserta gambarnya akan dihapus. Tindakan ini tidak bisa
              dibatalkan.
            </>
          )
        }
        confirmText={deleteInUse ? (deleteTarget?.status === 'draft' ? 'Mengerti' : 'Jadikan draf') : 'Ya, hapus'}
        cancelText={deleteInUse && deleteTarget?.status === 'draft' ? 'Tutup' : 'Batal'}
      />

      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form tambah/edit template (isi drawer)                               */
/* ------------------------------------------------------------------ */

function TemplateForm({
  initial,
  categories,
  onCancel,
  onSaved,
  onError,
}: {
  initial: FormState;
  categories: string[];
  onCancel: () => void;
  onSaved: (template: Template, isNew: boolean) => void;
  onError: (message: string) => void;
}) {
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const focusKey = useRef<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const codeOptions = TEMPLATE_OPTIONS.some((o) => o.code === form.template_code) || !form.template_code
    ? TEMPLATE_OPTIONS
    : [...TEMPLATE_OPTIONS, { code: form.template_code, name: `${form.template_code} (tidak dikenal)` }];

  /* ---- Fitur ---- */
  const updateFeature = (key: string, value: string) => {
    setForm((f) => ({ ...f, features: f.features.map((x) => (x.key === key ? { ...x, value } : x)) }));
    if (errors.features) setErrors((e) => ({ ...e, features: undefined }));
  };
  const addFeature = (afterKey?: string) => {
    if (form.features.length >= MAX_FEATURES) {
      setErrors((e) => ({ ...e, features: `Fitur maksimal ${MAX_FEATURES} item.` }));
      return;
    }
    const item = { key: newKey(), value: '' };
    focusKey.current = item.key;
    setForm((f) => {
      const idx = afterKey ? f.features.findIndex((x) => x.key === afterKey) : -1;
      const features = [...f.features];
      features.splice(idx >= 0 ? idx + 1 : features.length, 0, item);
      return { ...f, features };
    });
  };
  const removeFeature = (key: string) => setForm((f) => ({ ...f, features: f.features.filter((x) => x.key !== key) }));
  const moveFeature = (index: number, dir: -1 | 1) =>
    setForm((f) => {
      const target = index + dir;
      if (target < 0 || target >= f.features.length) return f;
      const features = [...f.features];
      [features[index], features[target]] = [features[target], features[index]];
      return { ...f, features };
    });
  const onFeatureKey = (e: KeyboardEvent<HTMLInputElement>, key: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFeature(key);
    }
  };

  /* ---- Gambar ---- */
  const handlePreview = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      set('preview_image', await readImageAsDataUrl(file, MAX_IMAGE_MB));
    } catch (err) {
      setErrors((x) => ({ ...x, preview_image: `${file.name}: ${errorMessage(err)}` }));
    } finally {
      setUploading(false);
    }
  };

  const handleGallery = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const room = MAX_GALLERY - form.gallery.length;
    const problems: string[] = [];
    if (files.length > room) problems.push(`Galeri maksimal ${MAX_GALLERY} gambar; ${files.length - Math.max(room, 0)} gambar tidak ditambahkan.`);
    setUploading(true);
    const added: ListItem[] = [];
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        added.push({ key: newKey(), value: await readImageAsDataUrl(file, MAX_IMAGE_MB) });
      } catch (err) {
        problems.push(`${file.name}: ${errorMessage(err)}`);
      }
    }
    setUploading(false);
    setForm((f) => ({ ...f, gallery: [...f.gallery, ...added] }));
    setErrors((x) => ({ ...x, gallery: problems.length ? problems.join(' ') : undefined }));
  };

  /* ---- Simpan ---- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const found = validate(form);
    setErrors(found);
    const firstKey = Object.keys(found)[0];
    if (firstKey) {
      document.getElementById(fid(firstKey))?.focus();
      return;
    }
    setSaving(true);
    const isNew = form.id == null;
    try {
      const res = await apiPost<{ template: Template }>('admin_save_template', {
        ...(form.id != null ? { id: form.id } : {}),
        slug: form.slug.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        features: form.features.map((f) => f.value.trim()).filter(Boolean),
        price: form.price ?? 0,
        preview_image: form.preview_image,
        gallery: form.gallery.map((g) => g.value),
        template_code: form.template_code,
        demo_url: form.demo_url.trim(),
        status: form.status,
        sort_order: Number(form.sort_order.trim()) || 0,
      });
      onSaved(res.template, isNew);
    } catch (err) {
      const message = errorMessage(err, 'kesalahan tidak diketahui');
      const fieldErrors = err instanceof ApiError ? err.fieldErrors : undefined;
      if (fieldErrors) {
        setErrors((x) => ({ ...x, ...fieldErrors }));
        const key = Object.keys(fieldErrors)[0];
        if (key) document.getElementById(fid(key))?.focus();
      }
      setSaveError(`Gagal menyimpan: ${message}`);
      onError(`Gagal menyimpan template: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = slugify(form.name);
  const shownSlug = form.slugTouched ? form.slug : autoSlug;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="custom-scrollbar space-y-7 sm:space-y-8">
        {/* Informasi dasar */}
        <section className="space-y-4">
          <SectionLabel>Informasi dasar</SectionLabel>
          <Field label="Nama template" required htmlFor={fid('name')} error={errors.name}>
            <Input
              id={fid('name')}
              value={form.name}
              maxLength={150}
              invalid={!!errors.name}
              placeholder="mis. Company Profile Modern"
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: f.slugTouched ? f.slug : slugify(name) }));
                if (errors.name || errors.slug) setErrors((x) => ({ ...x, name: undefined, slug: undefined }));
              }}
            />
          </Field>
          <Field
            label="Slug"
            optional="(otomatis dari nama)"
            htmlFor={fid('slug')}
            error={errors.slug}
            hint={shownSlug ? <>Dipakai di URL: /template/{shownSlug}</> : 'Kosongkan untuk dibuat otomatis dari nama.'}
            labelAction={
              form.slugTouched && form.slug !== autoSlug && autoSlug ? (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setForm((f) => ({ ...f, slug: autoSlug, slugTouched: false }));
                    setErrors((x) => ({ ...x, slug: undefined }));
                  }}
                >
                  Buat dari nama
                </Button>
              ) : undefined
            }
          >
            <Input
              id={fid('slug')}
              value={form.slug}
              mono
              maxLength={120}
              autoCapitalize="none"
              spellCheck={false}
              invalid={!!errors.slug}
              placeholder="mis. company-profile-modern"
              onChange={(e) => {
                const slug = e.target.value.toLowerCase().replace(/\s+/g, '-');
                setForm((f) => ({ ...f, slug, slugTouched: true }));
                if (errors.slug) setErrors((x) => ({ ...x, slug: undefined }));
              }}
            />
          </Field>
          <Field label="Kategori" required htmlFor={fid('category')} error={errors.category} hint="Pilih kategori yang ada atau ketik kategori baru.">
            <Input
              id={fid('category')}
              list={fid('categories')}
              value={form.category}
              maxLength={80}
              invalid={!!errors.category}
              placeholder="mis. Company Profile"
              onChange={(e) => set('category', e.target.value)}
            />
            <datalist id={fid('categories')}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field
            label="Deskripsi singkat"
            optional
            htmlFor={fid('short_description')}
            error={errors.short_description}
            hint={`Tampil di kartu katalog. ${form.short_description.trim().length}/255`}
          >
            <Input
              id={fid('short_description')}
              value={form.short_description}
              maxLength={255}
              invalid={!!errors.short_description}
              placeholder="mis. Company profile elegan untuk perusahaan jasa."
              onChange={(e) => set('short_description', e.target.value)}
            />
          </Field>
          <Field label="Deskripsi" optional htmlFor={fid('description')} error={errors.description} hint="Tampil di halaman detail template.">
            <Textarea
              id={fid('description')}
              rows={6}
              value={form.description}
              invalid={!!errors.description}
              placeholder="Tulis penjelasan template, cocok untuk siapa, dan apa saja yang didapat pembeli..."
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </section>

        {/* Fitur */}
        <section>
          <SectionLabel
            action={
              <span className="text-xs tabular-nums text-adm-subtle">
                {form.features.filter((f) => f.value.trim()).length}/{MAX_FEATURES}
              </span>
            }
          >
            <span className="inline-flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-adm-subtle" strokeWidth={1.75} aria-hidden />
              Fitur
            </span>
          </SectionLabel>
          <ul className="space-y-2" id={fid('features')} tabIndex={-1}>
            {form.features.map((item, index) => (
              <li key={item.key} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-adm-subtle">{index + 1}.</span>
                <Input
                  ref={(el) => {
                    if (el && focusKey.current === item.key) {
                      focusKey.current = null;
                      el.focus();
                    }
                  }}
                  value={item.value}
                  maxLength={200}
                  aria-label={`Fitur ${index + 1}`}
                  placeholder="mis. Desain responsif untuk HP dan desktop"
                  wrapperClassName="flex-1"
                  controlSize="sm"
                  onChange={(e) => updateFeature(item.key, e.target.value)}
                  onKeyDown={(e) => onFeatureKey(e, item.key)}
                />
                <IconButton icon={<ArrowUp />} label="Naikkan" size="sm" disabled={index === 0} onClick={() => moveFeature(index, -1)} className="max-sm:hidden" />
                <IconButton
                  icon={<ArrowDown />}
                  label="Turunkan"
                  size="sm"
                  disabled={index === form.features.length - 1}
                  onClick={() => moveFeature(index, 1)}
                  className="max-sm:hidden"
                />
                <IconButton icon={<X />} label={`Hapus fitur ${index + 1}`} size="sm" variant="danger-ghost" onClick={() => removeFeature(item.key)} />
              </li>
            ))}
          </ul>
          {errors.features && (
            <p className="mt-2 text-xs text-adm-danger-fg" role="alert">
              {errors.features}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus />}
            className="mt-3"
            disabled={form.features.length >= MAX_FEATURES}
            onClick={() => addFeature()}
          >
            Tambah fitur
          </Button>
          <p className="mt-2 text-xs text-adm-muted">Tekan Enter di isian fitur untuk menambah baris baru. Baris kosong diabaikan.</p>
        </section>

        {/* Harga & tampilan */}
        <section className="space-y-4">
          <SectionLabel>Harga & pengaturan</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Harga" required htmlFor={fid('price')} error={errors.price} className="md:col-span-2">
              <Input
                id={fid('price')}
                inputMode="numeric"
                leftIcon="Rp"
                mono
                className="font-semibold"
                value={formatRupiahInput(form.price)}
                invalid={!!errors.price}
                placeholder="0"
                onChange={(e) => set('price', parseRupiahInput(e.target.value))}
              />
            </Field>
            <Field label="Kode template" required htmlFor={fid('template_code')} error={errors.template_code} hint="Menentukan tampilan dan isian CMS situs pembeli.">
              <Select
                id={fid('template_code')}
                value={form.template_code}
                invalid={!!errors.template_code}
                onChange={(e) => set('template_code', e.target.value)}
              >
                <option value="" disabled>
                  Pilih kode template
                </option>
                {codeOptions.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Urutan" htmlFor={fid('sort_order')} error={errors.sort_order} hint="Angka kecil tampil lebih dulu.">
              <Input
                id={fid('sort_order')}
                type="number"
                inputMode="numeric"
                step={1}
                value={form.sort_order}
                invalid={!!errors.sort_order}
                onChange={(e) => set('sort_order', e.target.value)}
              />
            </Field>
            <Field
              label="URL demo"
              optional
              htmlFor={fid('demo_url')}
              error={errors.demo_url}
              hint={`Kosongkan untuk memakai demo bawaan /demo/${shownSlug || 'slug'}.`}
              className="md:col-span-2"
            >
              <Input
                id={fid('demo_url')}
                value={form.demo_url}
                maxLength={500}
                autoCapitalize="none"
                spellCheck={false}
                inputMode="url"
                invalid={!!errors.demo_url}
                placeholder="mis. https://demo.garudanexa.com/corporate"
                onChange={(e) => set('demo_url', e.target.value)}
              />
            </Field>
          </div>
          <div className="rounded-2xl bg-adm-ghost px-4 py-3.5">
            <Switch
              id={fid('status')}
              checked={form.status === 'published'}
              onChange={(on) => set('status', on ? 'published' : 'draft')}
              label="Terbitkan"
              description="Template terbit tampil di website dan bisa dipesan. Draf hanya terlihat di panel admin."
            />
          </div>
        </section>

        {/* Gambar */}
        <section className="space-y-5">
          <SectionLabel>Gambar</SectionLabel>
          <Field label="Gambar preview" optional htmlFor={fid('preview_image')} error={errors.preview_image} hint={`Disarankan 1600×1000 px, maks. ${MAX_IMAGE_MB} MB.`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-adm-ghost ring-1 ring-inset ring-adm-line sm:w-56">
                {form.preview_image ? (
                  <img src={form.preview_image} alt="Pratinjau gambar template" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-7 w-7 text-adm-subtle" strokeWidth={1.75} aria-hidden />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className={cn('relative inline-flex cursor-pointer', uploading && 'pointer-events-none opacity-60')}>
                  <input
                    id={fid('preview_image')}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    className="peer sr-only"
                    onChange={handlePreview}
                    disabled={uploading}
                  />
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-adm-surface px-3.5 text-[13px] font-semibold text-adm-fg ring-1 ring-inset ring-adm-line transition-colors hover:bg-adm-hover peer-focus-visible:ring-2 peer-focus-visible:ring-cobalt max-sm:h-8 max-sm:text-xs">
                    <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {form.preview_image ? 'Ganti gambar' : 'Unggah gambar'}
                  </span>
                </label>
                {form.preview_image && (
                  <Button variant="danger-soft" size="sm" icon={<Trash2 />} onClick={() => set('preview_image', '')}>
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          </Field>

          <Field
            label="Galeri"
            optional
            htmlFor={fid('gallery')}
            error={errors.gallery}
            hint={`Tampil di halaman detail template. Maks. ${MAX_GALLERY} gambar, ${MAX_IMAGE_MB} MB per gambar.`}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {form.gallery.map((g, i) => (
                <div key={g.key} className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-adm-ghost ring-1 ring-inset ring-adm-line">
                  <img src={g.value} alt={`Galeri ${i + 1}`} className="h-full w-full object-cover" />
                  <IconButton
                    icon={<X />}
                    label={`Hapus gambar galeri ${i + 1}`}
                    size="xs"
                    variant="secondary"
                    round
                    className="absolute right-1.5 top-1.5"
                    onClick={() => setForm((f) => ({ ...f, gallery: f.gallery.filter((x) => x.key !== g.key) }))}
                  />
                </div>
              ))}
              {form.gallery.length < MAX_GALLERY && (
                <label
                  className={cn(
                    'relative flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-adm-line-strong text-adm-muted transition-colors hover:border-cobalt/50 hover:bg-adm-hover focus-within:border-cobalt',
                    uploading && 'pointer-events-none opacity-60',
                  )}
                >
                  <input
                    id={fid('gallery')}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    className="sr-only"
                    onChange={handleGallery}
                    disabled={uploading}
                  />
                  <ImagePlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  <span className="text-xs font-semibold">{uploading ? 'Memproses...' : 'Tambah gambar'}</span>
                </label>
              )}
            </div>
          </Field>
        </section>
      </ModalBody>

      {saveError && (
        <div className="shrink-0 px-5 pt-3 sm:px-6">
          <Notice tone="danger">{saveError}</Notice>
        </div>
      )}
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Batal
        </Button>
        <Button type="submit" loading={saving} disabled={uploading}>
          {saving ? 'Menyimpan...' : form.id ? 'Simpan perubahan' : 'Simpan template'}
        </Button>
      </ModalFooter>
    </form>
  );
}
