// Pengaturan dokumen (/admin/proyek/pengaturan, admin only): company identity & signatory, bank accounts, numbering
// prefix, tax, default payment terms, SLA defaults (docs/platform/PROJECT-DOCS-SPEC.md §3, §7). Every document's kop
// (Garuda Nexa wings logo + company identity) reads these values; a Developer sees them read-only.
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileCog, Hash, Landmark, PenLine, Percent, Plus, RotateCcw, Save, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  IconButton,
  Input,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  PanelHeader,
  Switch,
  Textarea,
  cn,
} from '../../../components/admin/ui';
import { LogoMark } from '../../../components/ui/LogoMark';
import { pdSettingsGet, pdSettingsSave } from '../../../features/project-docs/api';
import { romawi } from '../../../features/project-docs/engine';
import type { PdSettings, SettingsGetResponse } from '../../../features/project-docs/types';
import { errorMessage } from '../../../lib/api';
import { useToast } from '../template-orders/shared/hooks';
import { Toast } from '../template-orders/shared/OrderUi';
import { formatPercent, todayIso } from './shared/format';
import { fieldErrorsOf, usePdQuery, useUnsavedGuard, useViewer } from './shared/hooks';
import { TermsEditor } from './shared/TermsEditor';
import { bankAccountUsed, isEmail, isNpwp, validateBankAccounts, validateSlaPriorities, validateTerms, type Errors } from './shared/validation';

const toSettings = (r: SettingsGetResponse): PdSettings => ({
  company: r.company,
  numbering: r.numbering,
  tax: r.tax,
  payment_terms: r.payment_terms,
  sla_defaults: r.sla_defaults,
});

function validateSettings(s: PdSettings): Errors {
  const errors: Errors = {};
  const c = s.company;
  if (!c.name.trim()) errors['company.name'] = 'Nama perusahaan wajib diisi.';
  if (c.email.trim() && !isEmail(c.email)) errors['company.email'] = 'Format email tidak valid.';
  if (c.website.trim() && !/^https?:\/\/\S+$/i.test(c.website.trim())) errors['company.website'] = 'Website harus diawali http:// atau https://.';
  if (c.npwp.trim() && !isNpwp(c.npwp)) errors['company.npwp'] = 'NPWP hanya angka, titik, dan tanda hubung.';
  if (!/^[A-Za-z0-9-]{1,10}$/.test(s.numbering.prefix.trim())) errors['numbering.prefix'] = 'Prefix 1–10 karakter: huruf, angka, dan tanda hubung.';
  const t = s.tax;
  const range = (key: keyof typeof t, v: number, min: number, max: number, label: string) => {
    if (!Number.isFinite(v) || v < min || v > max) errors[`tax.${key}`] = `${label} harus angka ${min} sampai ${max}.`;
  };
  range('ppn_rate', t.ppn_rate, 0, 100, 'Tarif PPN');
  range('dpp_numerator', t.dpp_numerator, 0.01, 1000, 'Pembilang DPP');
  range('dpp_denominator', t.dpp_denominator, 0.01, 1000, 'Penyebut DPP');
  range('pph23_rate', t.pph23_rate, 0, 100, 'Tarif PPh 23');
  return { ...errors, ...validateBankAccounts(c.bank_accounts), ...validateTerms(s.payment_terms), ...validateSlaPriorities(s.sla_defaults.priorities) };
}

const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));

/** Pratinjau kop surat: logo sayap Garuda Nexa (biru brand) + nama + baris alamat/kontak, seperti di dokumen. */
function KopPreview({ s }: { s: PdSettings }) {
  const c = s.company;
  const contact = [c.address && `${c.address}${c.city ? `, ${c.city}` : ''}`, c.phone, c.email, c.website].filter(Boolean).join(' · ');
  return (
    <div className="overflow-hidden rounded-2xl bg-canvas p-4 ring-1 ring-inset ring-adm-line sm:p-5" aria-label="Pratinjau kop dokumen">
      <div className="flex items-center gap-3 border-b-2 border-primary pb-3">
        <LogoMark className="h-9 w-auto shrink-0 text-primary sm:h-10" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-fg sm:text-base">{c.name || 'Nama perusahaan'}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted sm:text-xs">{contact || 'Alamat · telepon · email · website'}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Kop di setiap halaman dokumen</p>
    </div>
  );
}

export default function DocSettings() {
  const navigate = useNavigate();
  const { isAdmin } = useViewer();
  const query = usePdQuery<SettingsGetResponse>('pd_settings', pdSettingsGet);
  const loaded = query.data ? toSettings(query.data) : null;
  const [draft, setDraft] = useState<PdSettings | null>(null);
  const [baseline, setBaseline] = useState<PdSettings | null>(null);
  // Data baru dari server (muat pertama / muat ulang) menjadi draft & baseline
  if (loaded && JSON.stringify(loaded) !== JSON.stringify(baseline)) {
    setBaseline(loaded);
    setDraft(loaded);
  }
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // Baris rekening / prioritas SLA yang akan dihapus: tetap ditanya dulu walau baru tersimpan saat Simpan perubahan
  const [toRemove, setToRemove] = useState<{ list: 'bank' | 'priority'; index: number } | null>(null);
  const { toast, show, dismiss } = useToast();

  const dirty = !!draft && !!baseline && JSON.stringify(draft) !== JSON.stringify(baseline);
  const guard = useUnsavedGuard(isAdmin && dirty, navigate);
  const readOnly = !isAdmin;

  const patch = <K extends keyof PdSettings>(key: K, value: Partial<PdSettings[K]>) =>
    setDraft((d) => (d ? { ...d, [key]: Array.isArray(value) ? value : { ...(d[key] as object), ...value } } : d));
  const clearError = (key: string) => errors[key] && setErrors((e) => ({ ...e, [key]: '' }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || readOnly) return;
    const found = validateSettings(draft);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      show('error', 'Periksa lagi isian yang ditandai merah.');
      return;
    }
    setSaving(true);
    try {
      const clean: PdSettings = {
        ...draft,
        numbering: { prefix: draft.numbering.prefix.trim().toUpperCase() },
        // Baris yang belum diisi bank/nomornya tidak ikut disimpan (atas nama sudah terisi otomatis)
        company: { ...draft.company, bank_accounts: draft.company.bank_accounts.filter(bankAccountUsed) },
      };
      await pdSettingsSave(clean);
      show('success', 'Pengaturan dokumen berhasil disimpan.');
      query.reload();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      show('error', `Gagal menyimpan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setSaving(false);
    }
  };

  if (query.initialLoading || (!draft && !query.error)) {
    return (
      <div className="pb-10">
        <PageHeader title="Pengaturan dokumen" description="Atur identitas perusahaan, penomoran, pajak, dan termin bawaan untuk semua dokumen proyek." />
        <Panel>
          <LoadingState label="Memuat pengaturan..." />
        </Panel>
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="pb-10">
        <PageHeader title="Pengaturan dokumen" description="Atur identitas perusahaan, penomoran, pajak, dan termin bawaan untuk semua dokumen proyek." />
        <Panel>
          <ErrorState title="Gagal memuat pengaturan" error={query.error} onRetry={query.reload} />
        </Panel>
      </div>
    );
  }

  const c = draft.company;
  const t = draft.tax;
  const now = todayIso();
  const removeRow = () => {
    if (!toRemove) return;
    const { list, index } = toRemove;
    if (list === 'bank') patch('company', { bank_accounts: c.bank_accounts.filter((_, j) => j !== index) });
    else patch('sla_defaults', { priorities: draft.sla_defaults.priorities.filter((_, j) => j !== index) });
    setToRemove(null);
  };
  // Judul dialog hapus menyebut barisnya: "BCA 1234567890" / "P1", atau nomor baris bila masih kosong
  const removeName =
    toRemove?.list === 'bank'
      ? [c.bank_accounts[toRemove.index]?.bank, c.bank_accounts[toRemove.index]?.number].map((v) => v?.trim()).filter(Boolean).join(' ')
      : (draft.sla_defaults.priorities[toRemove?.index ?? -1]?.level.trim() ?? '');
  const removeLabel = toRemove?.list === 'bank' ? 'rekening' : 'prioritas';
  const sampleNumber = `007/PKS/${draft.numbering.prefix.trim().toUpperCase() || 'GNB'}/${romawi(Number(now.slice(5, 7)))}/${now.slice(0, 4)}`;
  // Tarif efektif PPN = tarif × DPP nilai lain (12% × 11/12 = 11%)
  const ratio = (t.ppn_rate * t.dpp_numerator) / t.dpp_denominator;
  const effective = Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : 0;
  const companyField = (key: keyof Omit<typeof c, 'bank_accounts'>, label: string, extra: { placeholder?: string; optional?: boolean; required?: boolean; hint?: string; type?: string; max?: number } = {}) => (
    <Field label={label} htmlFor={`company-${key}`} error={errors[`company.${key}`]} optional={extra.optional} required={extra.required} hint={extra.hint}>
      <Input
        id={`company-${key}`}
        type={extra.type ?? 'text'}
        value={c[key]}
        maxLength={extra.max ?? 255}
        onChange={(e) => {
          patch('company', { [key]: e.target.value });
          clearError(`company.${key}`);
        }}
        invalid={!!errors[`company.${key}`]}
        disabled={readOnly}
        placeholder={extra.placeholder}
      />
    </Field>
  );

  return (
    <div className="pb-28">
      <PageHeader title="Pengaturan dokumen" description="Atur identitas perusahaan, penomoran, pajak, dan termin bawaan untuk semua dokumen proyek." />

      {readOnly && (
        <Notice tone="mist" className="mb-4" icon={<ShieldCheck />}>
          Kamu bisa melihat pengaturan ini. Hanya administrator yang bisa mengubahnya.
        </Notice>
      )}
      {query.error && (
        <Notice tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={query.reload}>Coba lagi</Button>}>
          Gagal memuat ulang: {query.error}
        </Notice>
      )}

      <form onSubmit={submit} noValidate className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          {/* Identitas perusahaan */}
          <Panel>
            <PanelHeader icon={Building2} title="Identitas perusahaan" subtitle="Tampil di kop setiap dokumen dan sebagai PIHAK PERTAMA di kontrak." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{companyField('name', 'Nama perusahaan', { required: true, placeholder: 'mis. PT Garuda Nexa Bahtera' })}</div>
              <Field label="Alamat" htmlFor="company-address" optional error={errors['company.address']} className="sm:col-span-2">
                <Textarea
                  id="company-address"
                  rows={2}
                  value={c.address}
                  maxLength={500}
                  className="min-h-[72px]"
                  onChange={(e) => patch('company', { address: e.target.value })}
                  disabled={readOnly}
                  placeholder="Masukkan alamat kantor"
                />
              </Field>
              {companyField('city', 'Kota', { optional: true, max: 120, placeholder: 'mis. Bandung', hint: 'Dipakai di "bertempat di …" dan pengadilan domisili.' })}
              {companyField('phone', 'Telepon', { optional: true, max: 50, type: 'tel', placeholder: 'mis. 022 1234567' })}
              {companyField('email', 'Email', { optional: true, type: 'email', placeholder: 'mis. halo@garudanexa.com' })}
              {companyField('website', 'Website', { optional: true, type: 'url', placeholder: 'https://garudanexa.com' })}
              {companyField('npwp', 'NPWP', { optional: true, max: 32, placeholder: 'mis. 01.234.567.8-901.000' })}
            </div>
          </Panel>

          {/* Penanda tangan */}
          <Panel>
            <PanelHeader icon={PenLine} title="Penanda tangan perusahaan" subtitle="Mewakili PIHAK PERTAMA di MoU, PKS, UAT, BAST, SLA, dan kuitansi." />
            <div className="grid gap-4 sm:grid-cols-2">
              {companyField('signatory_name', 'Nama penanda tangan', { optional: true, placeholder: 'mis. Andi Wijaya' })}
              {companyField('signatory_title', 'Jabatan', { optional: true, placeholder: 'mis. Direktur' })}
            </div>
          </Panel>

          {/* Rekening bank */}
          <Panel>
            <PanelHeader
              icon={Landmark}
              title="Rekening pembayaran"
              subtitle="Dicantumkan di setiap invoice. Maksimal 5 rekening."
              action={
                !readOnly && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus />}
                    disabled={c.bank_accounts.length >= 5}
                    onClick={() => patch('company', { bank_accounts: [...c.bank_accounts, { bank: '', number: '', holder: c.name }] })}
                  >
                    Tambah rekening
                  </Button>
                )
              }
            />
            {c.bank_accounts.length === 0 ? (
              <p className="rounded-xl bg-adm-ghost px-4 py-3 text-[13px] text-adm-muted">Belum ada rekening. Invoice akan menampilkan […] sampai rekening diisi.</p>
            ) : (
              <ul className="space-y-3">
                {c.bank_accounts.map((a, i) => {
                  const set = (k: 'bank' | 'number' | 'holder', v: string) => {
                    patch('company', { bank_accounts: c.bank_accounts.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
                    clearError(`company.bank_accounts.${i}.${k}`);
                  };
                  const bankErr = errors[`company.bank_accounts.${i}.bank`];
                  const err = errors[`company.bank_accounts.${i}.number`];
                  return (
                    <li key={i} className="grid gap-2 rounded-xl bg-adm-ghost p-3 sm:grid-cols-[1fr_1fr_1.3fr_36px] sm:items-start sm:bg-transparent sm:p-0">
                      <div>
                        <Input
                          aria-label={`Nama bank ${i + 1}`}
                          value={a.bank}
                          maxLength={100}
                          onChange={(e) => set('bank', e.target.value)}
                          invalid={!!bankErr}
                          disabled={readOnly}
                          controlSize="sm"
                          placeholder="mis. BCA"
                        />
                        {bankErr && <p className="mt-1 text-xs text-adm-danger-fg">{bankErr}</p>}
                      </div>
                      <div>
                        <Input
                          aria-label={`Nomor rekening ${i + 1}`}
                          value={a.number}
                          maxLength={50}
                          inputMode="numeric"
                          onChange={(e) => set('number', e.target.value)}
                          invalid={!!err}
                          disabled={readOnly}
                          controlSize="sm"
                          mono
                          placeholder="Nomor rekening"
                        />
                        {err && <p className="mt-1 text-xs text-adm-danger-fg">{err}</p>}
                      </div>
                      <Input aria-label={`Atas nama ${i + 1}`} value={a.holder} maxLength={255} onChange={(e) => set('holder', e.target.value)} disabled={readOnly} controlSize="sm" placeholder="Atas nama" />
                      {!readOnly && (
                        <IconButton
                          icon={<Trash2 />}
                          label={`Hapus rekening ${i + 1}`}
                          size="sm"
                          variant="danger-ghost"
                          className="justify-self-end"
                          onClick={() => setToRemove({ list: 'bank', index: i })}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Termin bawaan */}
          <Panel>
            <PanelHeader icon={WalletCards} title="Termin pembayaran bawaan" subtitle="Dipakai proyek baru; tiap proyek bisa mengubah terminnya sendiri. Total harus 100%." />
            <TermsEditor
              value={draft.payment_terms}
              onChange={(terms) => {
                patch('payment_terms', terms);
                setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('payment_terms'))));
              }}
              errors={errors}
              disabled={readOnly}
            />
          </Panel>

          {/* SLA bawaan */}
          <Panel>
            <PanelHeader icon={ShieldCheck} title="SLA bawaan" subtitle="Isi awal dokumen SLA saat proyek punya layanan maintenance." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jam layanan" htmlFor="sla-hours" optional>
                <Input
                  id="sla-hours"
                  value={draft.sla_defaults.support_hours}
                  maxLength={255}
                  onChange={(e) => patch('sla_defaults', { support_hours: e.target.value })}
                  disabled={readOnly}
                  placeholder="mis. Senin–Jumat 09.00–17.00 WIB"
                />
              </Field>
              <Field label="Target uptime" htmlFor="sla-uptime" optional>
                <Input id="sla-uptime" value={draft.sla_defaults.uptime} maxLength={50} onChange={(e) => patch('sla_defaults', { uptime: e.target.value })} disabled={readOnly} placeholder="mis. 99,5%" />
              </Field>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-adm-fg">Prioritas penanganan</p>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus />}
                    disabled={draft.sla_defaults.priorities.length >= 10}
                    onClick={() =>
                      patch('sla_defaults', {
                        priorities: [...draft.sla_defaults.priorities, { level: `P${draft.sla_defaults.priorities.length + 1}`, response: '', resolution: '' }],
                      })
                    }
                  >
                    Tambah prioritas
                  </Button>
                )}
              </div>
              <div className="hidden grid-cols-[1.2fr_1fr_1fr_36px] gap-2 px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle sm:grid">
                <span>Level</span>
                <span>Respons</span>
                <span>Penyelesaian</span>
                <span className="sr-only">Aksi</span>
              </div>
              <ul className="space-y-2">
                {draft.sla_defaults.priorities.map((p, i) => {
                  const set = (k: 'level' | 'response' | 'resolution', v: string) =>
                    patch('sla_defaults', { priorities: draft.sla_defaults.priorities.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
                  const err = errors[`sla_defaults.priorities.${i}.level`];
                  return (
                    <li key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-adm-ghost p-3 sm:grid-cols-[1.2fr_1fr_1fr_36px] sm:items-start sm:bg-transparent sm:p-0">
                      <div className="col-span-2 sm:col-span-1">
                        <Input aria-label={`Level prioritas ${i + 1}`} value={p.level} maxLength={100} onChange={(e) => set('level', e.target.value)} invalid={!!err} disabled={readOnly} controlSize="sm" />
                        {err && <p className="mt-1 text-xs text-adm-danger-fg">{err}</p>}
                      </div>
                      <Input aria-label={`Waktu respons ${i + 1}`} value={p.response} maxLength={100} onChange={(e) => set('response', e.target.value)} disabled={readOnly} controlSize="sm" placeholder="mis. 2 jam" />
                      <Input aria-label={`Waktu penyelesaian ${i + 1}`} value={p.resolution} maxLength={100} onChange={(e) => set('resolution', e.target.value)} disabled={readOnly} controlSize="sm" placeholder="mis. 1 hari kerja" />
                      {!readOnly && (
                        <IconButton
                          icon={<Trash2 />}
                          label={`Hapus prioritas ${i + 1}`}
                          size="sm"
                          variant="danger-ghost"
                          className="col-span-2 justify-self-end sm:col-span-1"
                          onClick={() => setToRemove({ list: 'priority', index: i })}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
              {errors['sla_defaults.priorities'] && <p className="mt-1.5 text-xs text-adm-danger-fg">{errors['sla_defaults.priorities']}</p>}
            </div>
          </Panel>
        </div>

        {/* Kolom kanan: kop, penomoran, pajak */}
        <div className="min-w-0 space-y-4 sm:space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Panel>
            <PanelHeader icon={FileCog} title="Kop dokumen" subtitle="Logo Garuda Nexa dan identitas perusahaan." />
            <KopPreview s={draft} />
          </Panel>

          <Panel>
            <PanelHeader icon={Hash} title="Penomoran dokumen" subtitle="Nomor dibuat otomatis saat dokumen dibuat." />
            <Field label="Prefix" htmlFor="numbering-prefix" required error={errors['numbering.prefix']} hint="Huruf, angka, atau tanda hubung (maks. 10).">
              <Input
                id="numbering-prefix"
                value={draft.numbering.prefix}
                maxLength={10}
                onChange={(e) => {
                  patch('numbering', { prefix: e.target.value });
                  clearError('numbering.prefix');
                }}
                invalid={!!errors['numbering.prefix']}
                disabled={readOnly}
                mono
                className="uppercase"
              />
            </Field>
            <div className="mt-3 rounded-xl bg-adm-ghost px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-subtle">Contoh nomor PKS</p>
              <p className="mt-1 break-all font-mono text-sm font-semibold text-adm-fg">{sampleNumber}</p>
              <p className="mt-1 text-xs text-adm-muted">Urutan · kode dokumen · prefix · bulan (romawi) · tahun. Urutan mulai lagi dari 001 setiap tahun.</p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader icon={Percent} title="Pajak" subtitle="Bawaan untuk invoice baru; bisa diubah per invoice." />
            <Switch
              checked={t.ppn_enabled}
              onChange={(on) => patch('tax', { ppn_enabled: on })}
              disabled={readOnly}
              label="Kenakan PPN"
              description="Aktifkan bila perusahaan sudah PKP."
            />
            <div className={cn('mt-4 grid grid-cols-3 gap-2', !t.ppn_enabled && 'opacity-60')}>
              <Field label="Tarif PPN" htmlFor="tax-ppn" error={errors['tax.ppn_rate']}>
                <Input id="tax-ppn" type="number" min={0} max={100} step={0.01} value={Number.isFinite(t.ppn_rate) ? String(t.ppn_rate) : ''} onChange={(e) => patch('tax', { ppn_rate: num(e.target.value) })} invalid={!!errors['tax.ppn_rate']} disabled={readOnly} controlSize="sm" className="tabular-nums" />
              </Field>
              <Field label="DPP ×" htmlFor="tax-num" error={errors['tax.dpp_numerator']}>
                <Input id="tax-num" type="number" min={0.01} step={0.01} value={Number.isFinite(t.dpp_numerator) ? String(t.dpp_numerator) : ''} onChange={(e) => patch('tax', { dpp_numerator: num(e.target.value) })} invalid={!!errors['tax.dpp_numerator']} disabled={readOnly} controlSize="sm" className="tabular-nums" />
              </Field>
              <Field label="÷" htmlFor="tax-den" error={errors['tax.dpp_denominator']}>
                <Input id="tax-den" type="number" min={0.01} step={0.01} value={Number.isFinite(t.dpp_denominator) ? String(t.dpp_denominator) : ''} onChange={(e) => patch('tax', { dpp_denominator: num(e.target.value) })} invalid={!!errors['tax.dpp_denominator']} disabled={readOnly} controlSize="sm" className="tabular-nums" />
              </Field>
            </div>
            <p className="mt-2 text-xs text-adm-muted">
              PPN {formatPercent(t.ppn_rate)} × DPP {t.dpp_numerator}/{t.dpp_denominator} = tarif efektif <span className="font-semibold text-adm-fg">{formatPercent(effective)}</span>
            </p>
            <Field label="Tarif PPh 23" htmlFor="tax-pph23" error={errors['tax.pph23_rate']} hint="Dipotong klien; diaktifkan per invoice dan hanya informatif." className="mt-4">
              <Input
                id="tax-pph23"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={Number.isFinite(t.pph23_rate) ? String(t.pph23_rate) : ''}
                onChange={(e) => patch('tax', { pph23_rate: num(e.target.value) })}
                invalid={!!errors['tax.pph23_rate']}
                disabled={readOnly}
                rightSlot={<span className="pr-1 text-xs text-adm-subtle">%</span>}
                className="tabular-nums"
              />
            </Field>
          </Panel>
        </div>

        {/* Bilah simpan */}
        {!readOnly && (
          <div className="sticky bottom-3 z-10 xl:col-span-2">
            <div className="flex flex-col gap-3 rounded-2xl bg-adm-surface px-4 py-3 shadow-float ring-1 ring-inset ring-adm-line sm:flex-row sm:items-center sm:justify-between">
              <p className={cn('text-[13px]', dirty ? 'font-medium text-adm-fg' : 'text-adm-muted')} aria-live="polite">
                {dirty ? 'Ada perubahan yang belum disimpan.' : 'Semua perubahan sudah tersimpan.'}
              </p>
              <div className="flex gap-2 max-sm:[&>*]:flex-1">
                <Button variant="secondary" icon={<RotateCcw />} disabled={!dirty || saving} onClick={() => setConfirmReset(true)}>
                  Reset
                </Button>
                <Button type="submit" icon={<Save />} loading={saving} disabled={!dirty}>
                  Simpan perubahan
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setDraft(baseline);
          setErrors({});
          setConfirmReset(false);
        }}
        title="Buang perubahan?"
        description="Isian kembali ke pengaturan yang terakhir disimpan."
        confirmText="Ya, reset"
      />
      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={removeRow}
        tone="danger"
        title={removeName ? `Hapus ${removeLabel} "${removeName}"?` : `Hapus ${removeLabel} ${(toRemove?.index ?? 0) + 1}?`}
        description={
          toRemove?.list === 'bank'
            ? 'Rekening ini tidak tercantum lagi di invoice setelah pengaturan disimpan.'
            : 'Prioritas ini hilang dari SLA bawaan setelah pengaturan disimpan.'
        }
        confirmText="Ya, hapus"
      />
      <ConfirmDialog
        open={!!guard.pending}
        onClose={guard.cancel}
        onConfirm={guard.proceed}
        tone="danger"
        title="Tinggalkan halaman?"
        description="Perubahan pengaturan yang belum disimpan akan hilang."
        confirmText="Ya, tinggalkan"
        cancelText="Tetap di sini"
      />
      <Toast toast={toast} onClose={dismiss} />
    </div>
  );
}
