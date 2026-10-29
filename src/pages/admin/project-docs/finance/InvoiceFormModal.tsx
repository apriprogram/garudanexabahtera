// Buat / ubah invoice (pd_invoice_create, pd_invoice_update; admin): from a payment term or manual (DP, termin,
// pelunasan, maintenance, lainnya), items, discount, PPN and PPh 23 toggles, dates and notes. Totals are live through
// the engine's calcInvoice (the server recomputes them; spec §4.2).
import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, Field, IconButton, Input, Modal, ModalBody, ModalFooter, Notice, Select, Switch, Textarea, cn } from '../../../../components/admin/ui';
import { pdInvoiceCreate, pdInvoiceUpdate } from '../../../../features/project-docs/api';
import { calcInvoice } from '../../../../features/project-docs/engine';
import {
  INVOICE_KIND_LABEL,
  MAINTENANCE_PERIOD_LABEL,
  type DocContent,
  type InvoiceDetail,
  type InvoiceItem,
  type InvoiceKind,
  type MaintenancePeriod,
  type PaymentTerm,
  type TaxSettings,
} from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { addDays, formatPercent, rupiah, todayIso } from '../shared/format';
import { errorDetail, fieldErrorsOf, type Notify } from '../shared/hooks';
import { validateInvoice, type Errors } from '../shared/validation';

/** Project data the invoice form needs (ProjectDetail in the workspace, MergeData.project in the editor). */
export interface InvoiceProject {
  id: number;
  name: string;
  service_label: string;
  value: number;
  payment_terms: PaymentTerm[];
  maintenance_fee: number | null;
  maintenance_period: MaintenancePeriod | '' | null;
}

export type InvoiceFormMode =
  /** term null = manual invoice */
  | { kind: 'create'; term: PaymentTerm | null }
  | { kind: 'edit'; invoice: InvoiceDetail };

/** Settings `pd_tax` when it is not loaded (same as the seeded defaults). */
const DEFAULT_TAX: TaxSettings = { ppn_enabled: false, ppn_rate: 12, dpp_numerator: 11, dpp_denominator: 12, pph23_rate: 2 };
const KINDS = Object.keys(INVOICE_KIND_LABEL) as InvoiceKind[];

interface Form {
  kind: InvoiceKind;
  items: InvoiceItem[];
  discount: number;
  ppn_enabled: boolean;
  pph23_enabled: boolean;
  issue_date: string;
  due_date: string;
  notes: string;
}

function initialForm(mode: InvoiceFormMode, project: InvoiceProject, tax: TaxSettings): Form {
  if (mode.kind === 'edit') {
    const inv = mode.invoice;
    return {
      kind: inv.kind,
      items: inv.items.map((i) => ({ ...i })),
      discount: inv.discount,
      ppn_enabled: inv.ppn_enabled,
      pph23_enabled: inv.pph23_enabled,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      notes: inv.notes ?? '',
    };
  }
  const issue = todayIso();
  const term = mode.term;
  if (term) {
    return {
      kind: term.key === 'dp' || term.key === 'pelunasan' ? term.key : 'termin',
      items: [
        {
          description: `Pembayaran ${term.label} (${formatPercent(term.percent)}) – ${project.service_label} ${project.name}`,
          qty: 1,
          unit_price: Math.round(((project.value || 0) * term.percent) / 100),
        },
      ],
      discount: 0,
      ppn_enabled: tax.ppn_enabled,
      pph23_enabled: false,
      issue_date: issue,
      due_date: addDays(issue, term.due_days),
      notes: '',
    };
  }
  return { kind: 'lainnya', items: [{ description: '', qty: 1, unit_price: 0 }], discount: 0, ppn_enabled: tax.ppn_enabled, pph23_enabled: false, issue_date: issue, due_date: addDays(issue, 7), notes: '' };
}

const numberOf = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));

export function InvoiceFormModal({
  open,
  onClose,
  mode,
  project,
  tax,
  content,
  onSaved,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  mode: InvoiceFormMode;
  project: InvoiceProject;
  tax: TaxSettings | null;
  /** document content saved with the invoice (template for a new one, the editor's content when updating) */
  content: DocContent;
  onSaved: (result: { documentId: number; number: string | null }) => void;
  /** toast halaman (galat simpan) */
  notify: Notify;
}) {
  const taxes = tax ?? DEFAULT_TAX;
  const [form, setForm] = useState<Form>(() => initialForm(mode, project, taxes));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Baris tagihan yang akan dihapus (indeks): ditanya dulu walau baru tersimpan saat invoice disimpan
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const removingItem = itemToRemove === null ? null : form.items[itemToRemove];
  const modeKey = mode.kind === 'edit' ? `edit-${mode.invoice.id}` : `create-${mode.term?.key ?? 'manual'}`;
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const openKey = open ? modeKey : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      setForm(initialForm(mode, project, taxes));
      setErrors({});
      setServerError(null);
    }
  }

  const totals = useMemo(
    () =>
      calcInvoice(
        form.items.map((i) => ({ ...i, qty: Number.isFinite(i.qty) ? i.qty : 0, unit_price: Number.isFinite(i.unit_price) ? i.unit_price : 0 })),
        {
          discount: Number.isFinite(form.discount) ? form.discount : 0,
          ppn_enabled: form.ppn_enabled,
          ppn_rate: taxes.ppn_rate,
          dpp_numerator: taxes.dpp_numerator,
          dpp_denominator: taxes.dpp_denominator,
          pph23_enabled: form.pph23_enabled,
          pph23_rate: taxes.pph23_rate,
        },
      ),
    [form, taxes],
  );

  const term = mode.kind === 'create' ? mode.term : mode.invoice.term_key ? (project.payment_terms.find((t) => t.key === mode.invoice.term_key) ?? null) : null;
  const termBased = mode.kind === 'create' ? !!mode.term : !!mode.invoice.term_key;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };
  const setItem = (i: number, patch: Partial<InvoiceItem>) => {
    setForm((f) => ({ ...f, items: f.items.map((item, j) => (j === i ? { ...item, ...patch } : item)) }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`items.${i}.`) && k !== 'items')));
  };
  const setKind = (kind: InvoiceKind) => {
    setForm((f) => {
      const blank = f.items.length === 1 && !f.items[0].description.trim() && !f.items[0].unit_price;
      if (kind !== 'maintenance' || !blank) return { ...f, kind };
      const period = project.maintenance_period ? ` ${MAINTENANCE_PERIOD_LABEL[project.maintenance_period].toLowerCase()}` : '';
      return { ...f, kind, items: [{ description: `Biaya maintenance${period} – ${project.service_label} ${project.name}`, qty: 1, unit_price: project.maintenance_fee ?? 0 }] };
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateInvoice(form, totals.amount_due);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError(null);
    const body = {
      items: form.items.map((i) => ({ description: i.description.trim(), qty: i.qty, unit_price: Math.round(i.unit_price) })),
      discount: Math.round(form.discount),
      ppn_enabled: form.ppn_enabled,
      pph23_enabled: form.pph23_enabled,
      issue_date: form.issue_date,
      due_date: form.due_date,
      notes: form.notes.trim() || null,
      content,
    };
    try {
      if (mode.kind === 'edit') {
        await pdInvoiceUpdate({ id: mode.invoice.id, term_key: mode.invoice.term_key, ...(mode.invoice.term_key ? {} : { kind: form.kind }), ...body });
        onSaved({ documentId: mode.invoice.document_id, number: null });
      } else {
        const res = await pdInvoiceCreate({ project_id: project.id, ...(mode.term ? { term_key: mode.term.key } : { kind: form.kind }), ...body });
        onSaved({ documentId: res.document_id, number: res.number });
      }
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setServerError(`Gagal menyimpan invoice: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      notify('error', mode.kind === 'edit' ? 'Gagal menyimpan invoice.' : 'Gagal membuat invoice.', errorDetail(err));
    } finally {
      setSaving(false);
    }
  };

  const ppnInfo = `PPN ${formatPercent(taxes.ppn_rate)} × DPP ${taxes.dpp_numerator}/${taxes.dpp_denominator}`;
  const row = (label: string, value: number, opts: { strong?: boolean; minus?: boolean; muted?: boolean } = {}) => (
    <div className={cn('flex items-center justify-between gap-3 py-1 text-[13px]', opts.strong && 'border-t border-adm-line pt-2 text-sm font-semibold text-adm-fg', opts.muted && 'text-adm-muted')}>
      <span>{label}</span>
      <span className="tabular-nums">
        {opts.minus && value > 0 ? '− ' : ''}
        {rupiah(value)}
      </span>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={mode.kind === 'edit' ? 'Ubah rincian invoice' : term ? `Buat invoice ${term.label}` : 'Buat invoice manual'}
      description={term ? `${formatPercent(term.percent)} dari nilai kontrak ${rupiah(project.value)}.` : 'Tagihan di luar termin, mis. maintenance atau pekerjaan tambahan.'}
      icon={<Receipt />}
      size="lg"
      customBody
    >
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-5">
          {serverError && <Notice tone="danger">{serverError}</Notice>}

          <div className="grid gap-4 sm:grid-cols-3">
            {!termBased && (
              <Field label="Jenis tagihan" htmlFor="inv-kind">
                <Select id="inv-kind" value={form.kind} onChange={(e) => setKind(e.target.value as InvoiceKind)}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {INVOICE_KIND_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Tanggal invoice" htmlFor="inv-issue" required error={errors.issue_date}>
              <Input id="inv-issue" type="date" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} invalid={!!errors.issue_date} />
            </Field>
            <Field label="Jatuh tempo" htmlFor="inv-due" required error={errors.due_date}>
              <Input id="inv-due" type="date" value={form.due_date} min={form.issue_date || undefined} onChange={(e) => set('due_date', e.target.value)} invalid={!!errors.due_date} />
            </Field>
          </div>

          {/* Rincian tagihan */}
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-adm-fg">Rincian tagihan</legend>
            <div className="hidden grid-cols-[minmax(0,1fr)_72px_150px_130px_36px] gap-2 px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle md:grid">
              <span>Uraian</span>
              <span>Jumlah</span>
              <span>Harga satuan</span>
              <span className="text-right">Subtotal</span>
              <span className="sr-only">Aksi</span>
            </div>
            <ul className="space-y-3 md:space-y-2">
              {form.items.map((item, i) => {
                const lineErrors = (['description', 'qty', 'unit_price'] as const).map((k) => errors[`items.${i}.${k}`]).filter(Boolean);
                const line = Math.round((Number.isFinite(item.qty) ? item.qty : 0) * (Number.isFinite(item.unit_price) ? item.unit_price : 0));
                return (
                  <li key={i} className="rounded-xl bg-adm-ghost p-3 md:bg-transparent md:p-0">
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_72px_150px_130px_36px] md:items-center">
                      <Input
                        aria-label={`Uraian baris ${i + 1}`}
                        value={item.description}
                        maxLength={500}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                        invalid={!!errors[`items.${i}.description`]}
                        controlSize="sm"
                        wrapperClassName="col-span-2 md:col-span-1"
                        placeholder="mis. Pembuatan website company profile"
                      />
                      <Input
                        aria-label={`Jumlah baris ${i + 1}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={Number.isFinite(item.qty) ? String(item.qty) : ''}
                        onChange={(e) => setItem(i, { qty: numberOf(e.target.value) })}
                        invalid={!!errors[`items.${i}.qty`]}
                        controlSize="sm"
                        className="tabular-nums"
                      />
                      <Input
                        aria-label={`Harga satuan baris ${i + 1}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={Number.isFinite(item.unit_price) ? String(item.unit_price) : ''}
                        onChange={(e) => setItem(i, { unit_price: numberOf(e.target.value) })}
                        invalid={!!errors[`items.${i}.unit_price`]}
                        controlSize="sm"
                        className="tabular-nums"
                      />
                      <span className="text-[13px] font-semibold tabular-nums text-adm-fg md:text-right">{rupiah(line)}</span>
                      <IconButton
                        icon={<Trash2 />}
                        label={`Hapus baris ${i + 1}`}
                        size="sm"
                        variant="danger-ghost"
                        className="justify-self-end"
                        disabled={form.items.length <= 1}
                        onClick={() => setItemToRemove(i)}
                      />
                    </div>
                    {lineErrors.length > 0 && (
                      <p className="mt-1.5 px-1 text-xs text-adm-danger-fg" role="alert">
                        {lineErrors.join(' ')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {errors.items && (
              <p className="mt-1.5 text-xs text-adm-danger-fg" role="alert">
                {errors.items}
              </p>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus />}
              className="mt-3"
              disabled={form.items.length >= 50}
              onClick={() => set('items', [...form.items, { description: '', qty: 1, unit_price: 0 }])}
            >
              Tambah baris
            </Button>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <Field label="Diskon" htmlFor="inv-discount" optional error={errors.discount} hint={form.discount > 0 ? rupiah(form.discount) : undefined}>
                <Input
                  id="inv-discount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={Number.isFinite(form.discount) ? String(form.discount) : ''}
                  onChange={(e) => set('discount', numberOf(e.target.value))}
                  invalid={!!errors.discount}
                  className="tabular-nums"
                />
              </Field>
              <Switch checked={form.ppn_enabled} onChange={(v) => set('ppn_enabled', v)} label="Kenakan PPN" description={`${ppnInfo}. Aktifkan bila perusahaan PKP.`} />
              <Switch
                checked={form.pph23_enabled}
                onChange={(v) => set('pph23_enabled', v)}
                label={`PPh 23 (${formatPercent(taxes.pph23_rate)})`}
                description="Dipotong klien saat membayar; jumlah yang ditransfer berkurang."
              />
              <Field label="Catatan" htmlFor="inv-notes" optional error={errors.notes}>
                <Textarea id="inv-notes" rows={3} value={form.notes} maxLength={2000} onChange={(e) => set('notes', e.target.value)} placeholder="Tulis catatan untuk klien..." />
              </Field>
            </div>
            <div className="self-start rounded-2xl bg-adm-ghost p-4" aria-live="polite">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Ringkasan</p>
              {row('Subtotal', totals.subtotal)}
              {totals.discount > 0 && row('Diskon', totals.discount, { minus: true })}
              {form.ppn_enabled && row(`DPP (${taxes.dpp_numerator}/${taxes.dpp_denominator})`, totals.dpp, { muted: true })}
              {form.ppn_enabled && row(`PPN ${formatPercent(totals.ppn_rate)}`, totals.ppn_amount)}
              {row('Total', totals.total, { strong: true })}
              {form.pph23_enabled && row(`PPh 23 ${formatPercent(totals.pph23_rate)}`, totals.pph23_amount, { minus: true, muted: true })}
              <div className="mt-2 rounded-xl bg-adm-surface px-3 py-2.5 ring-1 ring-inset ring-adm-line">
                <p className="text-xs text-adm-muted">Jumlah yang harus dibayar</p>
                <p className="text-lg font-semibold tabular-nums text-adm-fg">{rupiah(totals.amount_due)}</p>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {mode.kind === 'edit' ? 'Simpan invoice' : 'Buat invoice'}
          </Button>
        </ModalFooter>
      </form>
      <ConfirmDialog
        open={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove !== null) set('items', form.items.filter((_, j) => j !== itemToRemove));
          setItemToRemove(null);
        }}
        tone="danger"
        title={removingItem?.description.trim() ? `Hapus baris "${removingItem.description.trim().slice(0, 60)}"?` : `Hapus baris ${(itemToRemove ?? 0) + 1}?`}
        description="Uraian, jumlah, dan harga baris ini hilang dari rincian tagihan."
        confirmText="Ya, hapus"
      />
    </Modal>
  );
}
