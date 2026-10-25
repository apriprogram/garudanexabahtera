// Pencarian domain di form /pesan/:slug (ACCOUNT-DOMAIN-RENEWAL-SPEC.md §1–§2, permintaan pemilik 2026-10-25): isian
// nama tanpa ekstensi + dropdown ekstensi (daftar & harga dari get_domain_prices, DewaBiz bila dikonfigurasi) + "Cek"
// (Enter juga mengecek). Hasilnya daftar nama yang sama di ekstensi lain: status (tersedia / sudah dipakai / belum pasti)
// dan harga per tahun, dipilih seperti radio; yang sudah dipakai tidak bisa dipilih. Logika cek & kirim ada di OrderForm.
import { useId, type KeyboardEvent } from 'react';
import { CircleAlert, LoaderCircle, Search } from 'lucide-react';
import { rupiahCompact, type DomainTld } from '../../../lib/domainPricing';
import type { DomainCheck } from '../../../types/platform';
import { Field } from '../../account/components/Field';
import { fieldProps } from '../../account/components/fieldProps';
import { TldSelect } from './TldSelect';

/** id isian nama domain (label, pesan error, fokus ke field error); nama field sama dengan payload customer_create_order. */
export const DOMAIN_FIELD_ID = 'domain_primary';
export const DOMAIN_FIELD_LABEL = 'Nama domain';
export const DOMAIN_TLD_FIELD_ID = 'domain_tld';

interface DomainSearchProps {
  /** Nama domain tanpa ekstensi */
  name: string;
  /** Ekstensi terpilih di dropdown (tanpa titik), mis. "com" */
  tld: string;
  /** Ekstensi yang dijual + harga per tahun */
  tlds: readonly DomainTld[];
  error?: string;
  /** Hasil cek terakhir (nama yang sama di beberapa ekstensi); null = belum dicek atau isian sudah berubah */
  checks: DomainCheck[] | null;
  /** Domain yang dipilih dari hasil cek */
  selected: DomainCheck | null;
  /** Nama domain yang sedang dicek; null = tidak sedang mengecek */
  checking: string | null;
  /** Gagal mengecek (batas cek, jaringan) */
  checkError: string | null;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onTldChange: (tld: string) => void;
  onBlur: () => void;
  onCheck: () => void;
  onSelect: (check: DomainCheck) => void;
}

const STATUS: Record<DomainCheck['status'], { label: string; className: string }> = {
  available: { label: 'Tersedia', className: 'bg-success-50 text-success-700 ring-success/25' },
  unknown: { label: 'Belum pasti', className: 'bg-warning-50 text-warning-700 ring-warning/25' },
  taken: { label: 'Sudah dipakai', className: 'bg-danger-50 text-danger-700 ring-danger/20' },
};

export function DomainSearch({
  name,
  tld,
  tlds,
  error,
  checks,
  selected,
  checking,
  checkError,
  disabled,
  onNameChange,
  onTldChange,
  onBlur,
  onCheck,
  onSelect,
}: DomainSearchProps) {
  const groupName = useId();
  const requirement = selected ? tlds.find((t) => t.tld === selected.tld)?.requirement : null;
  const selectedTld = tlds.some((t) => t.tld === tld) ? tld : tlds[0]?.tld ?? 'com';

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter = cek domain, bukan kirim form (abaikan Enter saat menyusun teks IME)
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (!checking) onCheck();
  };

  return (
    <div>
      <Field id={DOMAIN_FIELD_ID} label={DOMAIN_FIELD_LABEL} error={error}>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input
            {...fieldProps(DOMAIN_FIELD_ID, error, false, true)}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            type="text"
            inputMode="url"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="namabisnis"
            className="input-site min-w-0 basis-full sm:basis-auto sm:flex-1"
          />
          <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
            <span id={`${DOMAIN_TLD_FIELD_ID}-label`} className="sr-only">
              Ekstensi domain
            </span>
            {/* Ekstensi saja (permintaan pemilik 2026-10-25); harga tampil di daftar hasil cek */}
            <TldSelect
              id={DOMAIN_TLD_FIELD_ID}
              labelId={`${DOMAIN_TLD_FIELD_ID}-label`}
              value={selectedTld}
              tlds={tlds}
              disabled={disabled}
              onChange={onTldChange}
            />
          </div>
          <button
            type="button"
            onClick={onCheck}
            disabled={disabled || checking !== null}
            className="btn btn-primary shrink-0 max-sm:h-11 max-sm:after:inset-y-0"
          >
            {checking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            Cek <span className="sr-only">ketersediaan domain</span>
          </button>
        </div>
      </Field>

      {/* Selalu ada di DOM agar perubahan isinya dibacakan pembaca layar */}
      <div aria-live="polite">
        {checking ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            <span className="min-w-0 break-words">Mengecek {checking}...</span>
          </p>
        ) : checkError ? (
          <p className="mt-3 flex gap-2 rounded-xl bg-danger-50 px-3.5 py-3 text-[13px] text-danger-700 ring-1 ring-inset ring-danger/20">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 break-words">{checkError}</span>
          </p>
        ) : checks && checks.length > 0 ? (
          <p className="sr-only">
            {checks.filter((c) => c.status !== 'taken').length} dari {checks.length} domain bisa dipilih.
          </p>
        ) : null}
      </div>

      {!checking && checks && checks.length > 0 && (
        <fieldset className="mt-3">
          <legend className="sr-only">Pilih domain</legend>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-inset ring-line">
            {checks.map((check) => {
              const taken = check.status === 'taken';
              const isSelected = selected?.domain === check.domain;
              const status = STATUS[check.status];
              return (
                <li key={check.domain}>
                  <label
                    className={`flex min-h-14 items-center gap-3 px-3.5 py-2.5 transition-colors sm:px-4 ${
                      taken
                        ? 'cursor-not-allowed bg-alt/50'
                        : isSelected
                          ? 'cursor-pointer bg-brand-50'
                          : 'cursor-pointer hover:bg-alt'
                    }`}
                  >
                    <input
                      type="radio"
                      name={groupName}
                      value={check.domain}
                      checked={isSelected}
                      disabled={taken || disabled}
                      onChange={() => onSelect(check)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    {/* Spasi antarbagian: nama aksesibel radio "toko.com Tersedia Rp250.000 per tahun" */}
                    <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className={`min-w-0 break-all text-sm font-semibold ${taken ? 'text-subtle line-through' : 'text-fg'}`}>
                        {check.domain}
                      </span>{' '}
                      <span
                        className={`inline-flex h-5 w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium ring-1 ring-inset ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </span>{' '}
                    <span className={`shrink-0 text-right text-sm tabular-nums ${taken ? 'text-subtle' : 'font-semibold text-fg'}`}>
                      {rupiahCompact(check.price)}{' '}
                      <span className="block text-[11px] font-normal text-subtle">per tahun</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {requirement && selected && (
            <p className="mt-2 text-xs text-muted">
              {selected.domain}: {requirement}.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
