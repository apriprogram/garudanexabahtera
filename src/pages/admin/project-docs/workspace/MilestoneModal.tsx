// Tambah / edit satu tahapan jadwal (pd_milestone_save, staff). Status "Selesai" mengisi progres 100%.
import { useState, type FormEvent } from 'react';
import { CalendarRange } from 'lucide-react';
import { Button, Field, Input, Modal, ModalBody, ModalFooter, Notice, Select, Textarea } from '../../../../components/admin/ui';
import { pdMilestoneSave } from '../../../../features/project-docs/api';
import { MILESTONE_STATUS_LABEL, type Milestone, type MilestoneStatus } from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { errorDetail, fieldErrorsOf, type Notify } from '../shared/hooks';
import { validateMilestone, type Errors } from '../shared/validation';

interface Form {
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  weight: number;
  progress: number;
  status: MilestoneStatus;
}

const toForm = (m: Milestone | null): Form =>
  m
    ? { title: m.title, description: m.description ?? '', start_date: m.start_date ?? '', due_date: m.due_date ?? '', weight: m.weight, progress: m.progress, status: m.status }
    : { title: '', description: '', start_date: '', due_date: '', weight: 1, progress: 0, status: 'belum_mulai' };

const intOf = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));

export function MilestoneModal({
  open,
  projectId,
  milestone,
  onClose,
  onSaved,
  notify,
}: {
  open: boolean;
  projectId: number;
  /** null = tahapan baru */
  milestone: Milestone | null;
  onClose: () => void;
  onSaved: (title: string, isEdit: boolean) => void;
  /** toast workspace (galat simpan) */
  notify: Notify;
}) {
  const [form, setForm] = useState<Form>(() => toForm(milestone));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const openKey = open ? String(milestone?.id ?? 'baru') : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (open) {
      setForm(toForm(milestone));
      setErrors({});
      setServerError(null);
    }
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'status' && value === 'selesai' ? { progress: 100 } : {}) }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateMilestone(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setServerError(null);
    try {
      await pdMilestoneSave({
        project_id: projectId,
        ...(milestone ? { id: milestone.id, sort_order: milestone.sort_order } : {}),
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        weight: form.weight,
        progress: form.progress,
        status: form.status,
      });
      onSaved(form.title.trim(), !!milestone);
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      setServerError(`Gagal menyimpan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      notify('error', 'Gagal menyimpan tahapan.', errorDetail(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={saving ? () => undefined : onClose} title={milestone ? 'Edit tahapan' : 'Tambah tahapan'} icon={<CalendarRange />} size="md" customBody>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          {serverError && <Notice tone="danger">{serverError}</Notice>}
          <Field label="Nama tahapan" htmlFor="ms-title" required error={errors.title}>
            <Input id="ms-title" value={form.title} maxLength={255} onChange={(e) => set('title', e.target.value)} invalid={!!errors.title} placeholder="mis. Desain UI/UX" />
          </Field>
          <Field label="Deskripsi" htmlFor="ms-desc" optional error={errors.description}>
            <Textarea id="ms-desc" rows={3} value={form.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} placeholder="Tulis keluaran tahapan ini..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal mulai" htmlFor="ms-start" optional error={errors.start_date}>
              <Input id="ms-start" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} invalid={!!errors.start_date} />
            </Field>
            <Field label="Tanggal selesai" htmlFor="ms-due" optional error={errors.due_date}>
              <Input id="ms-due" type="date" value={form.due_date} min={form.start_date || undefined} onChange={(e) => set('due_date', e.target.value)} invalid={!!errors.due_date} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status" htmlFor="ms-status">
              <Select id="ms-status" value={form.status} onChange={(e) => set('status', e.target.value as MilestoneStatus)}>
                {(Object.keys(MILESTONE_STATUS_LABEL) as MilestoneStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {MILESTONE_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Progres (%)" htmlFor="ms-progress" error={errors.progress}>
              <Input
                id="ms-progress"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={5}
                value={Number.isFinite(form.progress) ? String(form.progress) : ''}
                onChange={(e) => set('progress', intOf(e.target.value))}
                invalid={!!errors.progress}
                className="tabular-nums"
              />
            </Field>
            <Field label="Bobot" htmlFor="ms-weight" error={errors.weight} hint="Pengaruh ke progres total.">
              <Input
                id="ms-weight"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                value={Number.isFinite(form.weight) ? String(form.weight) : ''}
                onChange={(e) => set('weight', intOf(e.target.value))}
                invalid={!!errors.weight}
                className="tabular-nums"
              />
            </Field>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Number.isFinite(form.progress) ? form.progress : 0}
            onChange={(e) => set('progress', Number(e.target.value))}
            aria-label="Geser progres"
            className="w-full accent-cobalt"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            {milestone ? 'Simpan perubahan' : 'Tambah tahapan'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
