// Payment terms editor (PaymentTerm[], spec §4.2): used for a project's terms (workspace Ringkasan) and the default
// terms (Pengaturan dokumen). Keys of existing terms never change because invoices refer to them (term_key).
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input, Select, cn } from '../../../../components/admin/ui';
import { PAYMENT_TRIGGER_LABEL, type PaymentTerm, type PaymentTrigger } from '../../../../features/project-docs/types';
import { formatPercent, rupiah } from './format';
import { nextTermKey, termsTotal, type Errors } from './validation';

const TRIGGERS = Object.keys(PAYMENT_TRIGGER_LABEL) as PaymentTrigger[];
/** Field captions on a phone (the column header row is shown from md). */
const MOBILE_CAPTION = 'mb-1 block text-[11px] font-medium text-adm-muted md:hidden';

export function TermsEditor({
  value,
  onChange,
  errors = {},
  field = 'payment_terms',
  disabled,
  contractValue,
}: {
  value: PaymentTerm[];
  onChange: (terms: PaymentTerm[]) => void;
  /** keys like `payment_terms.0.percent` and `payment_terms` (total) */
  errors?: Errors;
  field?: string;
  disabled?: boolean;
  /** shows the amount of every term */
  contractValue?: number;
}) {
  const total = termsTotal(value);
  const ok = Math.abs(total - 100) <= 0.01;
  const update = (i: number, patch: Partial<PaymentTerm>) => onChange(value.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = () =>
    onChange([...value, { key: nextTermKey(value), label: `Termin ${value.length + 1}`, percent: Math.max(0, Math.round((100 - total) * 100) / 100), trigger: 'manual', due_days: 7 }]);
  const err = (i: number, key: keyof PaymentTerm) => errors[`${field}.${i}.${key}`];

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1.6fr)_96px_minmax(0,1.3fr)_88px_36px] gap-2 px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle md:grid">
        <span>Nama termin</span>
        <span>Persen</span>
        <span>Ditagih</span>
        <span>Tempo (hari)</span>
        <span className="sr-only">Aksi</span>
      </div>
      <ul className="space-y-3 md:space-y-2">
        {value.map((t, i) => {
          const rowErrors = (['label', 'percent', 'due_days', 'key'] as const).map((k) => err(i, k)).filter(Boolean);
          return (
            <li key={t.key || i} className="rounded-xl bg-adm-ghost p-3 md:bg-transparent md:p-0">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1.6fr)_96px_minmax(0,1.3fr)_88px_36px] md:items-center">
                <Input
                  aria-label={`Nama termin ${i + 1}`}
                  value={t.label}
                  maxLength={100}
                  onChange={(e) => update(i, { label: e.target.value })}
                  invalid={!!err(i, 'label')}
                  disabled={disabled}
                  controlSize="sm"
                  wrapperClassName="col-span-2 md:col-span-1"
                  placeholder="mis. Uang muka (DP)"
                />
                <div className="min-w-0">
                  <span className={MOBILE_CAPTION}>Persen</span>
                  <Input
                    aria-label={`Persentase termin ${i + 1}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.01}
                    value={Number.isFinite(t.percent) ? String(t.percent) : ''}
                    onChange={(e) => update(i, { percent: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                    invalid={!!err(i, 'percent')}
                    disabled={disabled}
                    controlSize="sm"
                    rightSlot={<span className="pr-1 text-xs text-adm-subtle">%</span>}
                    className="tabular-nums"
                  />
                </div>
                <div className="min-w-0 md:order-4">
                  <span className={MOBILE_CAPTION}>Tempo (hari)</span>
                  <Input
                    aria-label={`Jatuh tempo termin ${i + 1} (hari)`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={365}
                    step={1}
                    value={Number.isFinite(t.due_days) ? String(t.due_days) : ''}
                    onChange={(e) => update(i, { due_days: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                    invalid={!!err(i, 'due_days')}
                    disabled={disabled}
                    controlSize="sm"
                    className="tabular-nums"
                  />
                </div>
                <Select
                  aria-label={`Kapan termin ${i + 1} ditagih`}
                  value={t.trigger}
                  onChange={(e) => update(i, { trigger: e.target.value as PaymentTrigger })}
                  disabled={disabled}
                  controlSize="sm"
                  wrapperClassName="col-span-2 md:order-3 md:col-span-1"
                >
                  {TRIGGERS.map((tr) => (
                    <option key={tr} value={tr}>
                      {PAYMENT_TRIGGER_LABEL[tr]}
                    </option>
                  ))}
                </Select>
                <div className="col-span-2 flex items-center justify-between gap-2 md:order-5 md:col-span-1 md:justify-end">
                  {contractValue != null && (
                    <span className="text-xs tabular-nums text-adm-muted md:hidden">{rupiah(Math.round(((contractValue || 0) * (t.percent || 0)) / 100))}</span>
                  )}
                  <IconButton icon={<Trash2 />} label={`Hapus termin ${i + 1}`} size="sm" variant="danger-ghost" onClick={() => remove(i)} disabled={disabled || value.length <= 1} />
                </div>
              </div>
              {contractValue != null && (
                <p className="mt-1 hidden px-1 text-xs tabular-nums text-adm-muted md:block">
                  {rupiah(Math.round(((contractValue || 0) * (t.percent || 0)) / 100))} dari nilai kontrak
                </p>
              )}
              {rowErrors.length > 0 && (
                <p className="mt-1.5 px-1 text-xs text-adm-danger-fg" role="alert">
                  {rowErrors.join(' ')}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" icon={<Plus />} onClick={add} disabled={disabled || value.length >= 12}>
          Tambah termin
        </Button>
        <p className={cn('text-[13px] font-semibold tabular-nums', ok ? 'text-adm-mint-fg' : 'text-adm-danger-fg')} aria-live="polite">
          Total {formatPercent(total)}
          {!ok && <span className="font-normal"> · harus 100%</span>}
        </p>
      </div>
      {errors[field] && (
        <p className="mt-1.5 text-xs text-adm-danger-fg" role="alert">
          {errors[field]}
        </p>
      )}
    </div>
  );
}
