// Form klien (tambah/edit) di drawer: identitas untuk dokumen (nama, PIC, alamat, NPWP) dan tautan ke akun
// pelanggan (role customer) yang dipakai klien untuk menyetujui dan menandatangani dokumen (spec §0, §5).
import { useState, type FormEvent } from 'react';
import { Link2, Search, Unlink, UserRound } from 'lucide-react';
import { Button, Drawer, Field, Input, ModalBody, ModalFooter, Notice, SearchInput, Segmented, Spinner, Textarea, cn } from '../../../../components/admin/ui';
import { pdClientSave, pdCustomersList } from '../../../../features/project-docs/api';
import { CLIENT_TYPE_LABEL, type ClientListItem, type ClientType, type CustomerOption } from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { useDebounced } from '../../template-orders/shared/hooks';
import { fieldErrorsOf, usePdQuery } from '../shared/hooks';
import { validateClient, type ClientForm, type Errors } from '../shared/validation';

const EMPTY: ClientForm = { type: 'perusahaan', name: '', pic_name: '', pic_title: '', email: '', phone: '', address: '', city: '', npwp: '', notes: '' };

const toForm = (c: ClientListItem | null): ClientForm =>
  c
    ? {
        type: c.type,
        name: c.name,
        pic_name: c.pic_name ?? '',
        pic_title: c.pic_title ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        npwp: c.npwp ?? '',
        notes: c.notes ?? '',
      }
    : EMPTY;

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Pemilih akun pelanggan: cari berdasarkan nama/email, pilih satu, atau lepas tautan. */
function CustomerPicker({ linked, onChange }: { linked: { id: number; label: string } | null; onChange: (next: { id: number; label: string } | null) => void }) {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [picking, setPicking] = useState(false);
  const query = usePdQuery<{ customers: CustomerOption[] }>(picking ? `customers:${q}` : null, () => pdCustomersList({ q: q || undefined }));

  if (linked && !picking) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-adm-ghost px-3 py-2.5">
        <UserRound className="h-[18px] w-[18px] shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-adm-fg">{linked.label}</span>
        <Button size="sm" variant="ghost" onClick={() => setPicking(true)}>
          Ganti
        </Button>
        <Button size="sm" variant="ghost" icon={<Unlink />} onClick={() => onChange(null)}>
          Lepas
        </Button>
      </div>
    );
  }
  if (!picking) {
    return (
      <Button variant="secondary" size="sm" icon={<Link2 />} onClick={() => setPicking(true)}>
        Tautkan akun pelanggan
      </Button>
    );
  }
  const customers = query.data?.customers ?? [];
  return (
    <div className="rounded-xl ring-1 ring-inset ring-adm-line">
      <div className="p-2">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Cari nama atau email pelanggan..."
          controlSize="sm"
          aria-label="Cari akun pelanggan"
          autoFocus
        />
      </div>
      <div className="max-h-56 overflow-y-auto border-t border-adm-line p-1.5" role="listbox" aria-label="Akun pelanggan">
        {query.initialLoading || (query.loading && !customers.length) ? (
          <p className="flex items-center gap-2 px-3 py-3 text-[13px] text-adm-muted">
            <Spinner size="sm" /> Memuat akun...
          </p>
        ) : query.error ? (
          <p className="px-3 py-3 text-[13px] text-adm-danger-fg">{query.error}</p>
        ) : !customers.length ? (
          <p className="px-3 py-3 text-[13px] text-adm-muted">{q ? 'Akun pelanggan tidak ditemukan.' : 'Belum ada akun pelanggan.'}</p>
        ) : (
          customers.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={linked?.id === c.id}
              onClick={() => {
                onChange({ id: c.id, label: `${c.name} · ${c.email}` });
                setPicking(false);
              }}
              className={cn(
                'flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-adm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
                linked?.id === c.id && 'bg-adm-cobalt-soft',
              )}
            >
              <span className="text-sm font-medium text-adm-fg">{c.name}</span>
              <span className="text-xs text-adm-muted">{c.email}</span>
            </button>
          ))
        )}
      </div>
      <div className="flex justify-end border-t border-adm-line p-1.5">
        <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}

export function ClientFormDrawer({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = klien baru */
  client: ClientListItem | null;
  onClose: () => void;
  onSaved: (name: string, isEdit: boolean) => void;
}) {
  const [form, setForm] = useState<ClientForm>(() => toForm(client));
  const [linked, setLinked] = useState<{ id: number; label: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Isi ulang form setiap kali drawer dibuka untuk klien lain
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const openKey = open ? `${client?.id ?? 'baru'}` : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      setForm(toForm(client));
      setLinked(client?.user_id ? { id: client.user_id, label: client.user_email || `Akun #${client.user_id}` } : null);
      setErrors({});
      setServerError(null);
    }
  }

  const set = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const person = form.type === 'perorangan';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateClient(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError(null);
    try {
      await pdClientSave({
        ...(client ? { id: client.id } : {}),
        type: form.type,
        name: form.name.trim(),
        pic_name: person ? null : orNull(form.pic_name),
        pic_title: person ? null : orNull(form.pic_title),
        email: orNull(form.email),
        phone: orNull(form.phone),
        address: orNull(form.address),
        city: orNull(form.city),
        npwp: orNull(form.npwp),
        notes: orNull(form.notes),
        user_id: linked?.id ?? null,
      });
      onSaved(form.name.trim(), !!client);
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setServerError(`Gagal menyimpan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={client ? 'Edit klien' : 'Tambah klien'}
      description="Data ini dipakai di kop identitas para pihak pada semua dokumen proyek."
      customBody
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
        <ModalBody className="space-y-4">
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          <Field label="Jenis klien">
            <Segmented<ClientType>
              ariaLabel="Jenis klien"
              value={form.type}
              onChange={(v) => set('type', v)}
              items={(Object.keys(CLIENT_TYPE_LABEL) as ClientType[]).map((t) => ({ value: t, label: CLIENT_TYPE_LABEL[t] }))}
            />
          </Field>
          <Field label={person ? 'Nama lengkap' : 'Nama perusahaan'} htmlFor="client-name" required error={errors.name}>
            <Input
              id="client-name"
              value={form.name}
              maxLength={255}
              onChange={(e) => set('name', e.target.value)}
              invalid={!!errors.name}
              placeholder={person ? 'mis. Budi Santoso' : 'mis. PT Maju Bersama'}
            />
          </Field>
          {!person && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama PIC" htmlFor="client-pic" optional error={errors.pic_name} hint="Wakil klien yang menandatangani.">
                <Input id="client-pic" value={form.pic_name} maxLength={255} onChange={(e) => set('pic_name', e.target.value)} placeholder="mis. Siti Rahma" />
              </Field>
              <Field label="Jabatan PIC" htmlFor="client-pic-title" optional error={errors.pic_title}>
                <Input id="client-pic-title" value={form.pic_title} maxLength={255} onChange={(e) => set('pic_title', e.target.value)} placeholder="mis. Direktur" />
              </Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="client-email" optional error={errors.email}>
              <Input id="client-email" type="email" value={form.email} maxLength={255} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} placeholder="mis. halo@perusahaan.co.id" />
            </Field>
            <Field label="Nomor HP" htmlFor="client-phone" optional error={errors.phone}>
              <Input id="client-phone" type="tel" value={form.phone} maxLength={50} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} placeholder="mis. 081234567890" />
            </Field>
          </div>
          <Field label="Alamat" htmlFor="client-address" optional error={errors.address}>
            <Textarea id="client-address" rows={2} value={form.address} maxLength={2000} onChange={(e) => set('address', e.target.value)} className="min-h-[72px]" placeholder="Masukkan alamat lengkap" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kota" htmlFor="client-city" optional error={errors.city}>
              <Input id="client-city" value={form.city} maxLength={120} onChange={(e) => set('city', e.target.value)} placeholder="mis. Bandung" />
            </Field>
            <Field label="NPWP" htmlFor="client-npwp" optional error={errors.npwp}>
              <Input id="client-npwp" value={form.npwp} maxLength={32} onChange={(e) => set('npwp', e.target.value)} invalid={!!errors.npwp} mono placeholder="mis. 01.234.567.8-901.000" />
            </Field>
          </div>
          <Field label="Akun login klien" optional="(untuk persetujuan dokumen)" error={errors.user_id} hint="Klien masuk dengan akun ini untuk meninjau, menyetujui, dan menandatangani dokumen.">
            <CustomerPicker linked={linked} onChange={setLinked} />
          </Field>
          <Field label="Catatan" htmlFor="client-notes" optional error={errors.notes}>
            <Textarea id="client-notes" rows={3} value={form.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} placeholder="Tulis catatan internal..." />
          </Field>
          <p className="flex items-center gap-1.5 text-xs text-adm-subtle">
            <Search className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Belum punya akun? Minta klien mendaftar di halaman Masuk, lalu tautkan di sini.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {client ? 'Simpan perubahan' : 'Tambah klien'}
          </Button>
        </ModalFooter>
      </form>
    </Drawer>
  );
}
