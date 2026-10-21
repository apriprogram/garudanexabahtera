// Tab Ringkasan: project setup for the documents (client record, contract value, scope, payment terms, MoU and
// maintenance flags, manual stage) via pd_project_save (admin), plus project and client facts (spec §5, §7).
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, FileText, Mail, Phone, RotateCcw, Save, ShieldCheck, UserRound, Users } from 'lucide-react';
import { Button, Field, InfoRow, Input, Notice, Panel, PanelHeader, Select, Switch, Textarea, cn } from '../../../../components/admin/ui';
import { pdClientsList, pdProjectSave } from '../../../../features/project-docs/api';
import { STAGES } from '../../../../features/project-docs/engine';
import {
  CLIENT_TYPE_LABEL,
  MAINTENANCE_PERIOD_LABEL,
  type ClientsListResponse,
  type MaintenancePeriod,
  type PaymentTerm,
  type ProjectDetail,
  type Stage,
} from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { tanggal } from '../shared/format';
import { fieldErrorsOf, usePdQuery } from '../shared/hooks';
import { TermsEditor } from '../shared/TermsEditor';
import { MoneyField } from '../shared/ui';
import { isDate, isMoney, validateTerms, type Errors } from '../shared/validation';
import type { WorkspaceContext } from './context';

interface SetupForm {
  client_id: number | null;
  price: number;
  scope_summary: string;
  use_mou: boolean;
  has_maintenance: boolean;
  maintenance_fee: number;
  maintenance_period: MaintenancePeriod | '';
  maintenance_start: string;
  maintenance_end: string;
  payment_terms: PaymentTerm[];
  stage_override: Stage | '';
}

function toForm(p: ProjectDetail, defaultTerms: PaymentTerm[] | undefined): SetupForm {
  return {
    client_id: p.client_id,
    price: Number(p.value) || 0,
    scope_summary: p.scope_summary ?? '',
    use_mou: p.use_mou,
    has_maintenance: p.has_maintenance,
    maintenance_fee: p.maintenance_fee ?? 0,
    maintenance_period: p.maintenance_period ?? '',
    maintenance_start: p.maintenance_start ?? '',
    maintenance_end: p.maintenance_end ?? '',
    // Proyek tanpa termin memakai termin bawaan dari Pengaturan dokumen
    payment_terms: p.payment_terms.length ? p.payment_terms : (defaultTerms ?? []),
    stage_override: p.stage_override ?? '',
  };
}

function validate(f: SetupForm): Errors {
  const errors: Errors = { ...validateTerms(f.payment_terms) };
  if (!isMoney(f.price)) errors.price = 'Nilai kontrak 0 sampai Rp1 triliun.';
  if (f.scope_summary.length > 10000) errors.scope_summary = 'Ringkasan maks. 10.000 karakter.';
  if (f.has_maintenance) {
    if (!isMoney(f.maintenance_fee)) errors.maintenance_fee = 'Biaya maintenance tidak valid.';
    if (f.maintenance_start && !isDate(f.maintenance_start)) errors.maintenance_start = 'Tanggal tidak valid.';
    if (f.maintenance_end && !isDate(f.maintenance_end)) errors.maintenance_end = 'Tanggal tidak valid.';
    if (isDate(f.maintenance_start) && isDate(f.maintenance_end) && f.maintenance_end < f.maintenance_start)
      errors.maintenance_end = 'Akhir maintenance tidak boleh sebelum tanggal mulai.';
  }
  return errors;
}

export function OverviewTab({ ctx }: { ctx: WorkspaceContext }) {
  const { project, settings, isAdmin, reload, notify } = ctx;
  const clientsQuery = usePdQuery<ClientsListResponse>('clients:', () => pdClientsList());
  const initial = toForm(project, settings?.payment_terms);
  const initialJson = JSON.stringify(initial);
  const [form, setForm] = useState<SetupForm>(initial);
  const [baseline, setBaseline] = useState(initialJson);
  // Proyek dimuat ulang (setelah simpan atau dari tab lain) → form mengikuti data terbaru
  if (initialJson !== baseline) {
    setBaseline(initialJson);
    setForm(initial);
  }
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== baseline;
  const readOnly = !isAdmin;

  const set = <K extends keyof SetupForm>(key: K, value: SetupForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const found = validate(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      notify('error', 'Periksa lagi isian yang ditandai merah.');
      return;
    }
    setSaving(true);
    try {
      const m = form.has_maintenance;
      await pdProjectSave({
        id: project.id,
        client_id: form.client_id,
        scope_summary: form.scope_summary.trim() || null,
        use_mou: form.use_mou,
        has_maintenance: m,
        maintenance_fee: m ? form.maintenance_fee : null,
        maintenance_period: m && form.maintenance_period ? form.maintenance_period : null,
        maintenance_start: m && form.maintenance_start ? form.maintenance_start : null,
        maintenance_end: m && form.maintenance_end ? form.maintenance_end : null,
        payment_terms: form.payment_terms.map((t) => ({ ...t, label: t.label.trim() })),
        price: form.price,
        stage_override: form.stage_override || null,
      });
      notify('success', project.code ? 'Data proyek berhasil disimpan.' : 'Data proyek berhasil disimpan dan kode proyek dibuat.');
      reload();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      notify('error', `Gagal menyimpan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setSaving(false);
    }
  };

  const clients = clientsQuery.data?.clients ?? [];
  const client = project.client;

  return (
    <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={submit} noValidate className="min-w-0 space-y-4 sm:space-y-5">
        {readOnly && (
          <Notice tone="mist" icon={<ShieldCheck />}>
            Data proyek dan termin hanya bisa diubah administrator. Kamu tetap bisa mengelola jadwal dan dokumen BRD, Jadwal, serta UAT.
          </Notice>
        )}
        {!project.code && isAdmin && (
          <Notice tone="cobalt" title="Lengkapi data proyek dulu">
            Pilih klien, nilai kontrak, dan termin, lalu simpan. Kode proyek dibuat otomatis dan dipakai di semua dokumen.
          </Notice>
        )}

        <Panel>
          <PanelHeader icon={Users} title="Klien & kontrak" subtitle="Terisi otomatis ke identitas para pihak, nilai kontrak, dan terbilang di dokumen." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Klien"
              htmlFor="setup-client"
              error={errors.client_id}
              hint={
                <>
                  Belum ada di daftar? <Link to="/admin/klien" className="font-medium text-adm-link hover:underline">
                    Tambah di halaman Klien
                  </Link>.
                </>
              }
              className="sm:col-span-2"
            >
              <Select
                id="setup-client"
                value={form.client_id ?? ''}
                onChange={(e) => set('client_id', e.target.value ? Number(e.target.value) : null)}
                disabled={readOnly || clientsQuery.initialLoading}
                invalid={!!errors.client_id}
              >
                <option value="">{clientsQuery.initialLoading ? 'Memuat klien...' : 'Pilih klien'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({CLIENT_TYPE_LABEL[c.type]}){c.user_id ? '' : ' · belum punya akun login'}
                  </option>
                ))}
              </Select>
            </Field>
            {!form.client_id && project.client_name && (
              <p className="-mt-2 rounded-xl bg-adm-ghost px-3 py-2 text-xs text-adm-muted sm:col-span-2">
                Data lama dari Project Clients: <span className="font-medium text-adm-fg">{project.client_name}</span>
                {project.client_email ? ` · ${project.client_email}` : ''}
                {project.client_phone ? ` · ${project.client_phone}` : ''}
              </p>
            )}
            <MoneyField id="setup-price" label="Nilai kontrak" value={form.price} onChange={(v) => set('price', v)} error={errors.price} disabled={readOnly} />
            <Field label="Tahap" htmlFor="setup-stage" hint="Otomatis dari status dokumen. Pilih manual hanya bila perlu.">
              <Select id="setup-stage" value={form.stage_override} onChange={(e) => set('stage_override', e.target.value as Stage | '')} disabled={readOnly}>
                <option value="">Otomatis (disarankan)</option>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Ringkasan ruang lingkup"
              htmlFor="setup-scope"
              optional
              error={errors.scope_summary}
              hint="Dipakai di BRD, proposal, PKS, dan SOW sebagai {{project.scope_summary}}."
              className="sm:col-span-2"
            >
              <Textarea
                id="setup-scope"
                rows={5}
                value={form.scope_summary}
                maxLength={10000}
                onChange={(e) => set('scope_summary', e.target.value)}
                disabled={readOnly}
                placeholder="Tulis ruang lingkup pekerjaan, mis. website company profile 8 halaman dengan CMS dan blog..."
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader icon={FileText} title="Dokumen opsional" subtitle="Menentukan dokumen mana yang wajib di checklist proyek ini." />
          <div className="space-y-4">
            <Switch
              checked={form.use_mou}
              onChange={(v) => set('use_mou', v)}
              disabled={readOnly}
              label="Pakai MoU (nota kesepahaman)"
              description="MoU jadi dokumen wajib di tahap penawaran sebelum PKS."
            />
            <Switch
              checked={form.has_maintenance}
              onChange={(v) => set('has_maintenance', v)}
              disabled={readOnly}
              label="Ada layanan maintenance"
              description="SLA jadi dokumen wajib dan proyek masuk tahap pemeliharaan setelah lunas."
            />
            {form.has_maintenance && (
              <div className="grid gap-4 rounded-2xl bg-adm-ghost p-4 sm:grid-cols-2">
                <MoneyField id="setup-fee" label="Biaya maintenance" value={form.maintenance_fee} onChange={(v) => set('maintenance_fee', v)} error={errors.maintenance_fee} disabled={readOnly} />
                <Field label="Periode" htmlFor="setup-period" error={errors.maintenance_period}>
                  <Select id="setup-period" value={form.maintenance_period} onChange={(e) => set('maintenance_period', e.target.value as MaintenancePeriod | '')} disabled={readOnly}>
                    <option value="">Pilih periode</option>
                    {(Object.keys(MAINTENANCE_PERIOD_LABEL) as MaintenancePeriod[]).map((p) => (
                      <option key={p} value={p}>
                        {MAINTENANCE_PERIOD_LABEL[p]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Mulai" htmlFor="setup-mstart" error={errors.maintenance_start}>
                  <Input id="setup-mstart" type="date" value={form.maintenance_start} onChange={(e) => set('maintenance_start', e.target.value)} invalid={!!errors.maintenance_start} disabled={readOnly} />
                </Field>
                <Field label="Berakhir" htmlFor="setup-mend" error={errors.maintenance_end}>
                  <Input id="setup-mend" type="date" value={form.maintenance_end} min={form.maintenance_start || undefined} onChange={(e) => set('maintenance_end', e.target.value)} invalid={!!errors.maintenance_end} disabled={readOnly} />
                </Field>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Termin pembayaran"
            subtitle="Dasar tabel termin di proposal & PKS dan invoice per termin. Total harus 100%."
            action={
              !readOnly &&
              !!settings?.payment_terms?.length && (
                <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => set('payment_terms', settings.payment_terms)}>
                  Pakai termin bawaan
                </Button>
              )
            }
          />
          {project.invoices.some((i) => i.term_key && i.payment_status !== 'dibatalkan') && (
            <p className="mb-3 rounded-xl bg-adm-warning-soft px-3 py-2 text-xs text-adm-warning-fg">
              Sebagian termin sudah punya invoice. Jangan hapus termin yang sudah ditagih agar invoice tetap terhubung.
            </p>
          )}
          <TermsEditor
            value={form.payment_terms}
            onChange={(terms) => {
              set('payment_terms', terms);
              setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('payment_terms'))));
            }}
            errors={errors}
            disabled={readOnly}
            contractValue={Number.isFinite(form.price) ? form.price : 0}
          />
        </Panel>

        {!readOnly && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {dirty && <p className="text-[13px] text-adm-muted sm:mr-auto">Ada perubahan yang belum disimpan.</p>}
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => setForm(JSON.parse(baseline) as SetupForm)}>
              Batal
            </Button>
            <Button type="submit" icon={<Save />} loading={saving} disabled={!dirty && !!project.code}>
              Simpan perubahan
            </Button>
          </div>
        )}
      </form>

      <div className="min-w-0 space-y-4 sm:space-y-5">
        <Panel>
          <PanelHeader title="Info proyek" />
          <div className="divide-y divide-adm-line">
            <InfoRow icon={FileText} label="Kode">
              <span className="font-mono">{project.code || '-'}</span>
            </InfoRow>
            <InfoRow icon={Building2} label="Layanan">
              {project.service_label}
            </InfoRow>
            <InfoRow icon={CalendarDays} label="Jadwal">
              {project.start_date || project.end_date ? `${tanggal(project.start_date)} – ${tanggal(project.end_date)}` : '-'}
            </InfoRow>
            <InfoRow icon={UserRound} label="Penanggung jawab">
              {project.assigned_user || '-'}
            </InfoRow>
          </div>
          {project.description && <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-adm-muted">{project.description}</p>}
        </Panel>

        <Panel>
          <PanelHeader title="Klien" action={<Button size="sm" variant="ghost" to="/admin/klien">Kelola</Button>} />
          {client ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-adm-fg">{client.name}</p>
                <p className="text-xs text-adm-muted">
                  {CLIENT_TYPE_LABEL[client.type]}
                  {client.pic_name ? ` · PIC ${client.pic_name}${client.pic_title ? ` (${client.pic_title})` : ''}` : ''}
                </p>
              </div>
              <div className="divide-y divide-adm-line">
                <InfoRow icon={Mail} label="Email">
                  {client.email || '-'}
                </InfoRow>
                <InfoRow icon={Phone} label="Nomor HP">
                  {client.phone || '-'}
                </InfoRow>
              </div>
              <p className={cn('rounded-xl px-3 py-2 text-xs', client.user_id ? 'bg-adm-mint-soft text-adm-mint-fg' : 'bg-adm-warning-soft text-adm-warning-fg')}>
                {client.user_id
                  ? 'Akun login tertaut: klien bisa menyetujui dan menandatangani dokumen.'
                  : 'Belum ada akun login. Tautkan akun pelanggan di halaman Klien agar klien bisa menyetujui dokumen.'}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-adm-muted">Belum ada data klien untuk proyek ini. Pilih klien di formulir lalu simpan.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
