// Tab Jadwal: milestones CRUD + progress (spec §2 progress = Σ weight × progress / Σ weight). Staff may save
// milestones; deleting is admin only. The Jadwal document and the SOW read these rows through {{#jadwal}}.
import { useState } from 'react';
import { ArrowDown, ArrowUp, CalendarRange, Edit2, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  MobileCard,
  MobileList,
  Panel,
  PanelHeader,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '../../../../components/admin/ui';
import { pdMilestoneDelete, pdMilestoneSave } from '../../../../features/project-docs/api';
import { MILESTONE_STATUS_LABEL, type Milestone, type ServiceType } from '../../../../features/project-docs/types';
import { errorMessage } from '../../../../lib/api';
import { addDays, dayCount, milestoneTone, tanggal } from '../shared/format';
import { ProgressCell } from '../shared/ui';
import type { WorkspaceContext } from './context';
import { MilestoneModal } from './MilestoneModal';

/** Tahapan standar per layanan: [judul, bobot]. */
const STANDARD: Record<ServiceType, [string, number][]> = {
  website: [
    ['Analisis kebutuhan & perencanaan', 1],
    ['Desain UI/UX', 2],
    ['Pengembangan website & CMS', 4],
    ['Pengujian (UAT) & perbaikan', 2],
    ['Serah terima & pelatihan', 1],
  ],
  mobile_app: [
    ['Analisis kebutuhan & perencanaan', 1],
    ['Desain UI/UX aplikasi', 2],
    ['Pengembangan aplikasi & backend', 5],
    ['Pengujian (UAT) & perbaikan', 2],
    ['Publikasi store & serah terima', 1],
  ],
  ui_ux: [
    ['Riset & analisis pengguna', 2],
    ['Arsitektur informasi & wireframe', 2],
    ['Desain high-fidelity', 3],
    ['Prototipe & uji kegunaan', 2],
    ['Serah terima desain', 1],
  ],
  other: [
    ['Analisis kebutuhan & perencanaan', 1],
    ['Desain sistem & UI/UX', 2],
    ['Pengembangan aplikasi', 5],
    ['Pengujian (UAT) & perbaikan', 2],
    ['Implementasi & serah terima', 1],
  ],
};

const periode = (m: Milestone) => (m.start_date || m.due_date ? `${tanggal(m.start_date)} – ${tanggal(m.due_date)}` : '-');
const durasi = (m: Milestone) => {
  const days = dayCount(m.start_date, m.due_date);
  return days ? `${days} hari` : '-';
};

export function ScheduleTab({ ctx }: { ctx: WorkspaceContext }) {
  const { project, isAdmin, reload, notify } = ctx;
  const milestones = project.milestones;
  const [modal, setModal] = useState<{ open: boolean; milestone: Milestone | null }>({ open: false, milestone: null });
  const [toDelete, setToDelete] = useState<Milestone | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const totalWeight = milestones.reduce((s, m) => s + m.weight, 0);

  /** Saves a milestone with changed fields (all fields are required by pd_milestone_save). */
  const saveMilestone = (m: Milestone, patch: Partial<Milestone>) => {
    const next = { ...m, ...patch };
    return pdMilestoneSave({
      project_id: project.id,
      id: m.id,
      title: next.title,
      description: next.description,
      start_date: next.start_date,
      due_date: next.due_date,
      weight: next.weight,
      progress: next.progress,
      status: next.status,
      sort_order: next.sort_order,
    });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= milestones.length) return;
    const order = milestones.map((m) => m.id);
    [order[index], order[target]] = [order[target], order[index]];
    setBusy(`move-${milestones[index].id}`);
    try {
      // Urutan dinormalkan 1..n; hanya baris yang berubah yang disimpan
      for (const [i, id] of order.entries()) {
        const m = milestones.find((x) => x.id === id);
        if (m && m.sort_order !== i + 1) await saveMilestone(m, { sort_order: i + 1 });
      }
      notify('success', `Urutan tahapan "${milestones[index].title}" berhasil diubah.`);
      reload();
    } catch (err) {
      notify('error', `Gagal mengubah urutan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusy(null);
    }
  };

  const addStandard = async () => {
    const plan = STANDARD[project.service_type] ?? STANDARD.other;
    const weightSum = plan.reduce((s, [, w]) => s + w, 0);
    const days = dayCount(project.start_date, project.end_date);
    setBusy('standard');
    try {
      let used = 0;
      for (const [i, [title, weight]] of plan.entries()) {
        // Tanggal dibagi sesuai bobot bila proyek punya tanggal mulai & selesai
        const span = days ? Math.max(1, i === plan.length - 1 ? days - used : Math.round((days * weight) / weightSum)) : 0;
        const first = Math.min(used, days - 1);
        const last = Math.max(first, Math.min(days, used + span) - 1);
        const start = days && project.start_date ? addDays(project.start_date, first) : null;
        const due = days && project.start_date ? addDays(project.start_date, last) : null;
        used += span;
        await pdMilestoneSave({ project_id: project.id, title, weight, progress: 0, status: 'belum_mulai', start_date: start, due_date: due, sort_order: i + 1 });
      }
      notify('success', 'Tahapan standar berhasil ditambahkan.');
      reload();
    } catch (err) {
      notify('error', `Gagal menambah tahapan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
      reload();
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setBusy('delete');
    try {
      await pdMilestoneDelete({ id: toDelete.id });
      notify('success', `Tahapan "${toDelete.title}" berhasil dihapus.`);
      setToDelete(null);
      reload();
    } catch (err) {
      notify('error', `Gagal menghapus tahapan: ${errorMessage(err, 'kesalahan tidak diketahui')}`);
    } finally {
      setBusy(null);
    }
  };

  const actions = (m: Milestone, i: number) => (
    <>
      <IconButton icon={<ArrowUp />} label="Naikkan" size="sm" onClick={() => move(i, -1)} disabled={i === 0 || !!busy} loading={busy === `move-${m.id}`} />
      <IconButton icon={<ArrowDown />} label="Turunkan" size="sm" onClick={() => move(i, 1)} disabled={i === milestones.length - 1 || !!busy} />
      <IconButton icon={<Edit2 />} label={`Edit ${m.title}`} size="sm" onClick={() => setModal({ open: true, milestone: m })} />
      {isAdmin && <IconButton icon={<Trash2 />} label={`Hapus ${m.title}`} size="sm" variant="danger-ghost" onClick={() => setToDelete(m)} />}
    </>
  );

  return (
    <>
      <Panel padding="none" className="overflow-hidden">
        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <PanelHeader
            icon={CalendarRange}
            title="Jadwal & milestone"
            subtitle={milestones.length ? `${milestones.length} tahapan · total bobot ${totalWeight}` : 'Susun tahapan pengerjaan beserta tanggal dan bobotnya.'}
            action={
              <Button size="sm" icon={<Plus />} onClick={() => setModal({ open: true, milestone: null })} disabled={!!busy}>
                Tambah tahapan
              </Button>
            }
          />
          {milestones.length > 0 && (
            <div className="mb-4 rounded-2xl bg-adm-ghost px-4 py-3">
              <p className="mb-1.5 text-[13px] text-adm-muted">Progres keseluruhan (berbobot)</p>
              <ProgressCell value={project.progress} />
            </div>
          )}
        </div>

        {milestones.length === 0 ? (
          <EmptyState
            icon={<CalendarRange />}
            title="Belum ada tahapan."
            description="Tambahkan tahapan sendiri atau mulai dari tahapan standar sesuai jenis layanan."
            action={
              <Button size="sm" icon={<Plus />} onClick={() => setModal({ open: true, milestone: null })}>
                Tambah tahapan
              </Button>
            }
            secondaryAction={
              <Button size="sm" variant="secondary" icon={<Sparkles />} loading={busy === 'standard'} onClick={addStandard}>
                Pakai tahapan standar
              </Button>
            }
          />
        ) : (
          <>
            <MobileList className="border-t border-adm-line md:hidden">
              {milestones.map((m, i) => (
                <MobileCard
                  key={m.id}
                  title={`${i + 1}. ${m.title}`}
                  subtitle={periode(m)}
                  trailing={
                    <Badge tone={milestoneTone(m.status)} size="sm">
                      {MILESTONE_STATUS_LABEL[m.status]}
                    </Badge>
                  }
                  meta={[
                    { label: 'Durasi', value: durasi(m) },
                    { label: 'Bobot', value: m.weight },
                  ]}
                  actions={actions(m, i)}
                >
                  <ProgressCell value={m.progress} className="mt-2.5" />
                </MobileCard>
              ))}
            </MobileList>
            <TableContainer className="hidden border-t border-adm-line md:block">
              <Table minWidth={900}>
                <THead>
                  <tr>
                    <Th width={48}>No</Th>
                    <Th>Tahapan</Th>
                    <Th>Periode</Th>
                    <Th align="right">Durasi</Th>
                    <Th align="right">Bobot</Th>
                    <Th>Progres</Th>
                    <Th>Status</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {milestones.map((m, i) => (
                    <Tr key={m.id}>
                      <Td mono muted>
                        {i + 1}
                      </Td>
                      <Td>
                        <p className="max-w-[280px] font-semibold text-adm-fg">{m.title}</p>
                        {m.description && <p className="mt-0.5 line-clamp-2 max-w-[280px] text-xs text-adm-muted">{m.description}</p>}
                      </Td>
                      <Td muted nowrap>
                        {periode(m)}
                      </Td>
                      <Td align="right" muted nowrap>
                        {durasi(m)}
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {m.weight}
                      </Td>
                      <Td>
                        <ProgressCell value={m.progress} className="w-32" />
                      </Td>
                      <Td>
                        <Badge tone={milestoneTone(m.status)} size="sm">
                          {MILESTONE_STATUS_LABEL[m.status]}
                        </Badge>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-0.5">{actions(m, i)}</div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Panel>

      <MilestoneModal
        open={modal.open}
        projectId={project.id}
        milestone={modal.milestone}
        onClose={() => setModal((s) => ({ ...s, open: false }))}
        onSaved={(title, isEdit) => {
          setModal((s) => ({ ...s, open: false }));
          notify('success', isEdit ? `Tahapan "${title}" berhasil diperbarui.` : `Tahapan "${title}" berhasil ditambahkan.`);
          reload();
        }}
        notify={notify}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => (busy === 'delete' ? undefined : setToDelete(null))}
        onConfirm={handleDelete}
        loading={busy === 'delete'}
        tone="danger"
        title="Hapus tahapan?"
        description={
          <>
            Tahapan <span className="font-semibold text-adm-fg">"{toDelete?.title}"</span> akan dihapus dari jadwal. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmText="Ya, hapus"
      />
    </>
  );
}
