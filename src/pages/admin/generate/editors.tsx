// Form invoice dan proposal menu Generate: data dokumen, klien, item biaya (total langsung dihitung), dan isian khusus
// tiap jenis. Isi suara (VoicePanel) digabung ke form lewat mergeVoiceInto*; galat per kolom dari server
// (gen_*_save → errors) tampil di bawah kolomnya.
import { useMemo, type ReactNode } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button, Field, IconButton, Input, Panel, Select, Switch, Textarea, cn } from '../../../components/admin/ui';
import { VoicePanel, type VoiceSource } from './VoicePanel';
import {
  GEN_LIMITS,
  INVOICE_STATUS_LABEL,
  PROPOSAL_STATUS_LABEL,
  calcTotals,
  draftItems,
  emptyItem,
  emptyStep,
  mergeVoiceIntoInvoice,
  mergeVoiceIntoProposal,
  parseAmount,
  rupiah,
  type DiscountType,
  type InvoiceForm,
  type InvoiceStatus,
  type ItemDraft,
  type ProposalForm,
  type ProposalStatus,
  type Totals,
} from './types';

export type FieldErrors = Record<string, string>;
type Update<F> = (fn: (form: F) => F) => void;

interface EditorProps<F> {
  form: F;
  update: Update<F>;
  errors: FieldErrors;
  /** Nomor yang akan diberikan (form baru) atau nomor tersimpan (ubah) */
  numberHint: string;
  today: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onVoice: (source: VoiceSource, note: string) => void;
}

function Section({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Panel padding="md" className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-adm-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-adm-muted">{description}</p>}
      </div>
      {children}
    </Panel>
  );
}

type ClientKeys = 'client_name' | 'client_company' | 'client_email' | 'client_phone' | 'client_address';

function ClientSection<F extends Record<ClientKeys, string>>({ form, update, errors }: { form: F; update: Update<F>; errors: FieldErrors }) {
  const set = (key: ClientKeys) => (e: { target: { value: string } }) => update((f) => ({ ...f, [key]: e.target.value }));
  return (
    <Section title="Data klien">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama klien" htmlFor="gen-client-name" required error={errors.client_name}>
          <Input id="gen-client-name" value={form.client_name} onChange={set('client_name')} maxLength={GEN_LIMITS.name} invalid={!!errors.client_name} autoComplete="off" />
        </Field>
        <Field label="Perusahaan / instansi" htmlFor="gen-client-company" optional error={errors.client_company}>
          <Input id="gen-client-company" value={form.client_company} onChange={set('client_company')} maxLength={GEN_LIMITS.company} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="gen-client-email" optional error={errors.client_email}>
          <Input id="gen-client-email" type="email" value={form.client_email} onChange={set('client_email')} maxLength={GEN_LIMITS.email} invalid={!!errors.client_email} autoComplete="off" />
        </Field>
        <Field label="Telepon / WhatsApp" htmlFor="gen-client-phone" optional error={errors.client_phone}>
          <Input id="gen-client-phone" inputMode="tel" value={form.client_phone} onChange={set('client_phone')} maxLength={GEN_LIMITS.phone} invalid={!!errors.client_phone} autoComplete="off" />
        </Field>
        <Field label="Alamat" htmlFor="gen-client-address" optional error={errors.client_address} className="sm:col-span-2">
          <Textarea id="gen-client-address" rows={2} value={form.client_address} onChange={set('client_address')} maxLength={GEN_LIMITS.address} />
        </Field>
      </div>
    </Section>
  );
}

/** Indeks baris form untuk galat server "items.N.*" (server hanya menerima baris yang terisi). */
const filledRows = (items: ItemDraft[]) => items.flatMap((it, i) => (it.description.trim() !== '' || parseAmount(it.price) > 0 ? [i] : []));

function ItemsEditor<F extends { items: ItemDraft[] }>({ form, update, errors, title }: { form: F; update: Update<F>; errors: FieldErrors; title: string }) {
  const rows = filledRows(form.items);
  const rowError = (i: number, field: string) => {
    const k = rows.indexOf(i);
    return k >= 0 ? errors[`items.${k}.${field}`] : undefined;
  };
  const setItem = (i: number, key: keyof ItemDraft, value: string) =>
    update((f) => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, [key]: value } : it)) }));
  const remove = (i: number) => update((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, j) => j !== i) : [emptyItem()] }));
  return (
    <Section title={title}>
      {errors.items && <p className="text-[13px] font-medium text-adm-danger-fg">{errors.items}</p>}
      <div className="space-y-3">
        {form.items.map((it, i) => {
          const qty = it.qty.trim() === '' ? 1 : parseAmount(it.qty);
          const subtotal = Math.floor(qty * Math.floor(parseAmount(it.price) + 0.5) + 0.5);
          const errs = ['description', 'qty', 'unit', 'price'].map((f) => rowError(i, f)).filter(Boolean);
          return (
            <div key={i} className="rounded-2xl bg-adm-ghost p-3 ring-1 ring-inset ring-adm-line">
              <div className="grid grid-cols-6 gap-2 lg:grid-cols-[minmax(0,1fr)_80px_96px_150px_auto]">
                <Input
                  aria-label={`Deskripsi item ${i + 1}`}
                  placeholder="Deskripsi item"
                  value={it.description}
                  onChange={(e) => setItem(i, 'description', e.target.value)}
                  maxLength={GEN_LIMITS.description}
                  invalid={!!rowError(i, 'description')}
                  wrapperClassName="col-span-6 lg:col-span-1"
                />
                <Input
                  aria-label={`Qty item ${i + 1}`}
                  placeholder="Qty"
                  inputMode="decimal"
                  value={it.qty}
                  onChange={(e) => setItem(i, 'qty', e.target.value)}
                  invalid={!!rowError(i, 'qty')}
                  wrapperClassName="col-span-2 lg:col-span-1"
                />
                <Input
                  aria-label={`Satuan item ${i + 1}`}
                  placeholder="Satuan"
                  value={it.unit}
                  onChange={(e) => setItem(i, 'unit', e.target.value)}
                  maxLength={GEN_LIMITS.unit}
                  wrapperClassName="col-span-4 lg:col-span-1"
                />
                <Input
                  aria-label={`Harga satuan item ${i + 1}`}
                  placeholder="Harga satuan"
                  inputMode="numeric"
                  value={it.price}
                  onChange={(e) => setItem(i, 'price', e.target.value)}
                  invalid={!!rowError(i, 'price')}
                  wrapperClassName="col-span-5 lg:col-span-1"
                />
                <IconButton
                  icon={<Trash2 />}
                  label={`Hapus item ${i + 1}`}
                  variant="ghost"
                  onClick={() => remove(i)}
                  className="col-span-1 justify-self-end"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-adm-danger-fg">{errs[0] ?? ''}</span>
                <span className="text-adm-muted">
                  Subtotal <span className="font-semibold tabular-nums text-adm-fg">{rupiah(subtotal)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={<Plus />}
        disabled={form.items.length >= GEN_LIMITS.items}
        onClick={() => update((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
      >
        Tambah item
      </Button>
    </Section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', strong ? 'border-t border-adm-line pt-3 text-base font-semibold text-adm-fg' : 'text-sm text-adm-muted')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function TotalsCard({
  totals,
  discountLabel,
  taxLabel,
  saving,
  onSave,
  onCancel,
  saveLabel,
  children,
}: {
  totals: Totals;
  discountLabel?: string;
  taxLabel?: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  children?: ReactNode;
}) {
  return (
    <Panel padding="md" className="space-y-3 lg:sticky lg:top-4">
      <h2 className="text-[15px] font-semibold text-adm-fg">Ringkasan</h2>
      <Row label="Subtotal" value={rupiah(totals.subtotal)} />
      {discountLabel && totals.discount_amount > 0 && <Row label={discountLabel} value={`-${rupiah(totals.discount_amount)}`} />}
      {taxLabel && <Row label={taxLabel} value={rupiah(totals.tax_amount)} />}
      <Row label="Total" value={rupiah(totals.total)} strong />
      {children}
      <div className="flex flex-col gap-2 pt-2">
        <Button type="button" icon={<Save />} loading={saving} onClick={onSave} fullWidth>
          {saveLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} fullWidth>
          Batal
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-adm-subtle">Setelah disimpan, dokumen langsung jadi dan bisa dicetak atau diunduh PDF.</p>
    </Panel>
  );
}

const persenText = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

// ════════════════════════════════════════════════════════════════════════════
// Invoice
// ════════════════════════════════════════════════════════════════════════════

export function InvoiceEditor({
  form,
  update,
  errors,
  numberHint,
  today,
  saving,
  onSave,
  onCancel,
  onVoice,
  paymentPlaceholder,
}: EditorProps<InvoiceForm> & { paymentPlaceholder?: string }) {
  const totals = useMemo(
    () => calcTotals(draftItems(form.items), form.discount_type, parseAmount(form.discount_value), form.tax_enabled, parseAmount(form.tax_rate)),
    [form.items, form.discount_type, form.discount_value, form.tax_enabled, form.tax_rate],
  );
  const set = (key: 'date' | 'due_date' | 'notes' | 'payment_info' | 'discount_value' | 'tax_rate') => (e: { target: { value: string } }) =>
    update((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <VoicePanel
        kind="invoice"
        docDate={form.date || today}
        today={today}
        onApply={(data, source, note) => {
          update((f) => mergeVoiceIntoInvoice(f, data));
          onVoice(source, note);
        }}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Section title="Data invoice">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nomor invoice" hint="Diberikan otomatis saat disimpan.">
                <Input value={numberHint} readOnly mono aria-label="Nomor invoice" />
              </Field>
              <Field label="Status" htmlFor="gen-inv-status" error={errors.status}>
                <Select id="gen-inv-status" value={form.status} onChange={(e) => update((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}>
                  {Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal invoice" htmlFor="gen-inv-date" required error={errors.date}>
                <Input id="gen-inv-date" type="date" value={form.date} onChange={set('date')} invalid={!!errors.date} />
              </Field>
              <Field label="Jatuh tempo" htmlFor="gen-inv-due" optional error={errors.due_date}>
                <Input id="gen-inv-due" type="date" value={form.due_date} min={form.date || undefined} onChange={set('due_date')} invalid={!!errors.due_date} />
              </Field>
            </div>
          </Section>

          <ClientSection form={form} update={update} errors={errors} />
          <ItemsEditor form={form} update={update} errors={errors} title="Item tagihan" />

          <Section title="Diskon & pajak">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Diskon" htmlFor="gen-inv-discount" optional error={errors.discount_value}>
                <div className="flex gap-2">
                  <Select
                    aria-label="Jenis diskon"
                    value={form.discount_type}
                    onChange={(e) => update((f) => ({ ...f, discount_type: e.target.value as DiscountType }))}
                    wrapperClassName="w-28 shrink-0"
                  >
                    <option value="amount">Rp</option>
                    <option value="percent">%</option>
                  </Select>
                  <Input
                    id="gen-inv-discount"
                    inputMode="decimal"
                    placeholder="0"
                    value={form.discount_value}
                    onChange={set('discount_value')}
                    invalid={!!errors.discount_value}
                    wrapperClassName="flex-1"
                  />
                </div>
              </Field>
              <div className="space-y-3">
                <Switch checked={form.tax_enabled} onChange={(on) => update((f) => ({ ...f, tax_enabled: on }))} label="Kenakan PPN" />
                {form.tax_enabled && (
                  <Field label="Tarif PPN (%)" htmlFor="gen-inv-tax" error={errors.tax_rate}>
                    <Input id="gen-inv-tax" inputMode="decimal" value={form.tax_rate} onChange={set('tax_rate')} invalid={!!errors.tax_rate} />
                  </Field>
                )}
              </div>
            </div>
          </Section>

          <Section title="Pembayaran & catatan">
            <Field label="Info pembayaran / rekening" htmlFor="gen-inv-payment" optional error={errors.payment_info} hint="Kosong = rekening dari Pengaturan dokumen (menu Proyek Custom).">
              <Textarea
                id="gen-inv-payment"
                rows={3}
                value={form.payment_info}
                onChange={set('payment_info')}
                maxLength={GEN_LIMITS.payment_info}
                placeholder={paymentPlaceholder || 'Mis. Transfer ke BCA 1234567890 a.n. PT Garuda Nexa Bahtera'}
              />
            </Field>
            <Field label="Catatan" htmlFor="gen-inv-notes" optional error={errors.notes}>
              <Textarea id="gen-inv-notes" rows={3} value={form.notes} onChange={set('notes')} maxLength={GEN_LIMITS.notes} />
            </Field>
          </Section>
        </div>

        <div className="min-w-0">
          <TotalsCard
            totals={totals}
            discountLabel={form.discount_type === 'percent' ? `Diskon (${persenText(parseAmount(form.discount_value))}%)` : 'Diskon'}
            taxLabel={form.tax_enabled ? `PPN ${persenText(parseAmount(form.tax_rate))}%` : undefined}
            saving={saving}
            onSave={onSave}
            onCancel={onCancel}
            saveLabel={form.id ? 'Simpan perubahan' : 'Simpan & buat invoice'}
          />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Proposal
// ════════════════════════════════════════════════════════════════════════════

export function ProposalEditor({ form, update, errors, numberHint, today, saving, onSave, onCancel, onVoice }: EditorProps<ProposalForm>) {
  const totals = useMemo(
    () => calcTotals(draftItems(form.items), 'amount', 0, form.tax_enabled, parseAmount(form.tax_rate)),
    [form.items, form.tax_enabled, form.tax_rate],
  );
  const set = (key: 'date' | 'valid_until' | 'title' | 'summary' | 'terms' | 'tax_rate') => (e: { target: { value: string } }) =>
    update((f) => ({ ...f, [key]: e.target.value }));
  const setScope = (i: number, value: string) => update((f) => ({ ...f, scope: f.scope.map((s, j) => (j === i ? value : s)) }));
  const setStep = (i: number, key: 'phase' | 'duration' | 'description', value: string) =>
    update((f) => ({ ...f, timeline: f.timeline.map((t, j) => (j === i ? { ...t, [key]: value } : t)) }));

  return (
    <div className="space-y-5">
      <VoicePanel
        kind="proposal"
        docDate={form.date || today}
        today={today}
        onApply={(data, source, note) => {
          update((f) => mergeVoiceIntoProposal(f, data));
          onVoice(source, note);
        }}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <Section title="Data proposal">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nomor proposal" hint="Diberikan otomatis saat disimpan.">
                <Input value={numberHint} readOnly mono aria-label="Nomor proposal" />
              </Field>
              <Field label="Status" htmlFor="gen-prp-status" error={errors.status}>
                <Select id="gen-prp-status" value={form.status} onChange={(e) => update((f) => ({ ...f, status: e.target.value as ProposalStatus }))}>
                  {Object.entries(PROPOSAL_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tanggal proposal" htmlFor="gen-prp-date" required error={errors.date}>
                <Input id="gen-prp-date" type="date" value={form.date} onChange={set('date')} invalid={!!errors.date} />
              </Field>
              <Field label="Berlaku sampai" htmlFor="gen-prp-valid" optional error={errors.valid_until}>
                <Input id="gen-prp-valid" type="date" value={form.valid_until} min={form.date || undefined} onChange={set('valid_until')} invalid={!!errors.valid_until} />
              </Field>
            </div>
          </Section>

          <ClientSection form={form} update={update} errors={errors} />

          <Section title="Proyek">
            <Field label="Judul proyek" htmlFor="gen-prp-title" required error={errors.title}>
              <Input id="gen-prp-title" value={form.title} onChange={set('title')} maxLength={GEN_LIMITS.title} invalid={!!errors.title} />
            </Field>
            <Field label="Latar belakang / ringkasan" htmlFor="gen-prp-summary" optional error={errors.summary}>
              <Textarea id="gen-prp-summary" rows={4} value={form.summary} onChange={set('summary')} maxLength={GEN_LIMITS.summary} />
            </Field>
          </Section>

          <Section title="Ruang lingkup & fitur" description="Satu fitur atau pekerjaan per baris.">
            {errors.scope && <p className="text-[13px] font-medium text-adm-danger-fg">{errors.scope}</p>}
            <div className="space-y-2">
              {form.scope.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-adm-subtle">{i + 1}.</span>
                  <Input
                    aria-label={`Ruang lingkup ${i + 1}`}
                    value={line}
                    onChange={(e) => setScope(i, e.target.value)}
                    maxLength={GEN_LIMITS.scope_item}
                    wrapperClassName="flex-1"
                  />
                  <IconButton
                    icon={<Trash2 />}
                    label={`Hapus ruang lingkup ${i + 1}`}
                    variant="ghost"
                    onClick={() => update((f) => ({ ...f, scope: f.scope.length > 1 ? f.scope.filter((_, j) => j !== i) : [''] }))}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus />}
              disabled={form.scope.length >= GEN_LIMITS.scope}
              onClick={() => update((f) => ({ ...f, scope: [...f.scope, ''] }))}
            >
              Tambah butir
            </Button>
          </Section>

          <Section title="Tahapan & jadwal">
            {errors.timeline && <p className="text-[13px] font-medium text-adm-danger-fg">{errors.timeline}</p>}
            <div className="space-y-3">
              {form.timeline.map((t, i) => (
                <div key={i} className="rounded-2xl bg-adm-ghost p-3 ring-1 ring-inset ring-adm-line">
                  <div className="grid grid-cols-6 gap-2 lg:grid-cols-[minmax(0,1fr)_140px_minmax(0,1.4fr)_auto]">
                    <Input
                      aria-label={`Nama tahap ${i + 1}`}
                      placeholder="Nama tahap"
                      value={t.phase}
                      onChange={(e) => setStep(i, 'phase', e.target.value)}
                      maxLength={GEN_LIMITS.phase}
                      invalid={!!errors[`timeline.${i}.phase`]}
                      wrapperClassName="col-span-4 lg:col-span-1"
                    />
                    <Input
                      aria-label={`Durasi tahap ${i + 1}`}
                      placeholder="Durasi"
                      value={t.duration}
                      onChange={(e) => setStep(i, 'duration', e.target.value)}
                      maxLength={GEN_LIMITS.duration}
                      wrapperClassName="col-span-2 lg:col-span-1"
                    />
                    <Input
                      aria-label={`Keterangan tahap ${i + 1}`}
                      placeholder="Keterangan (opsional)"
                      value={t.description}
                      onChange={(e) => setStep(i, 'description', e.target.value)}
                      maxLength={GEN_LIMITS.phase_description}
                      wrapperClassName="col-span-5 lg:col-span-1"
                    />
                    <IconButton
                      icon={<Trash2 />}
                      label={`Hapus tahap ${i + 1}`}
                      variant="ghost"
                      onClick={() => update((f) => ({ ...f, timeline: f.timeline.length > 1 ? f.timeline.filter((_, j) => j !== i) : [emptyStep()] }))}
                      className="col-span-1 justify-self-end"
                    />
                  </div>
                  {errors[`timeline.${i}.phase`] && <p className="mt-2 text-xs text-adm-danger-fg">{errors[`timeline.${i}.phase`]}</p>}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus />}
              disabled={form.timeline.length >= GEN_LIMITS.timeline}
              onClick={() => update((f) => ({ ...f, timeline: [...f.timeline, emptyStep()] }))}
            >
              Tambah tahap
            </Button>
          </Section>

          <ItemsEditor form={form} update={update} errors={errors} title="Rincian biaya" />

          <Section title="Pajak, syarat & ketentuan">
            <Switch checked={form.tax_enabled} onChange={(on) => update((f) => ({ ...f, tax_enabled: on }))} label="Kenakan PPN" />
            {form.tax_enabled && (
              <Field label="Tarif PPN (%)" htmlFor="gen-prp-tax" error={errors.tax_rate} className="sm:max-w-xs">
                <Input id="gen-prp-tax" inputMode="decimal" value={form.tax_rate} onChange={set('tax_rate')} invalid={!!errors.tax_rate} />
              </Field>
            )}
            <Field label="Syarat & ketentuan" htmlFor="gen-prp-terms" optional error={errors.terms} hint="Satu ketentuan per baris; di dokumen menjadi daftar bernomor.">
              <Textarea id="gen-prp-terms" rows={5} value={form.terms} onChange={set('terms')} maxLength={GEN_LIMITS.terms} />
            </Field>
          </Section>
        </div>

        <div className="min-w-0">
          <TotalsCard
            totals={totals}
            taxLabel={form.tax_enabled ? `PPN ${persenText(parseAmount(form.tax_rate))}%` : undefined}
            saving={saving}
            onSave={onSave}
            onCancel={onCancel}
            saveLabel={form.id ? 'Simpan perubahan' : 'Simpan & buat proposal'}
          />
        </div>
      </div>
    </div>
  );
}
