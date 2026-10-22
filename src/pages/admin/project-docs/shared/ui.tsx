// Small display components shared by the admin project-docs pages (status pills, stage stepper, progress,
// activity feed, money field). Admin tokens only (adm-*, cobalt/mint/warning/danger), design.md "Panel admin".
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  FilePen,
  FilePlus2,
  History,
  PenLine,
  Receipt,
  Save,
  Send,
  Settings2,
  Trash2,
  Undo2,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Field, IconBox, Input, ThinProgress, cn, type IconBoxTone } from '../../../../components/admin/ui';
import { STAGES } from '../../../../features/project-docs/engine';
import type { Activity, ActivityAction, DocStatus, DocType, PaymentStatus, Stage } from '../../../../features/project-docs/types';
import { docShort, docStatusInfo, paymentLabel, paymentTone, relatif, rupiah, stageIndex, STAGE_LABEL, waktu } from './format';

/** Status pill of a document ("Perlu revisi" for a rejected draft, "Terbit" for an issued invoice). */
export function DocStatusBadge({
  doc,
  size,
  className,
}: {
  doc: { status: DocStatus; doc_type: DocType; revision_requested?: boolean };
  size?: 'sm' | 'md';
  className?: string;
}) {
  const info = docStatusInfo(doc);
  return (
    <Badge tone={info.tone} size={size} className={className}>
      {info.label}
    </Badge>
  );
}

/** Stage pill with the stage number: `selesai` mint, `pelunasan` (money outstanding) warning, the rest cobalt. */
export function StageBadge({ stage, size, className }: { stage: Stage; size?: 'sm' | 'md'; className?: string }) {
  const tone = stage === 'selesai' ? 'mint' : stage === 'pelunasan' ? 'warning' : 'cobalt';
  return (
    <Badge tone={tone} size={size} variant="soft" dot={false} className={className}>
      <span className="font-mono text-[10px] opacity-70">{String(stageIndex(stage) + 1).padStart(2, '0')}</span>
      {STAGE_LABEL[stage] ?? stage}
    </Badge>
  );
}

export function PaymentBadge({ status, overdue, size }: { status: PaymentStatus; overdue?: boolean; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={paymentTone(status, overdue)} size={size}>
      {paymentLabel(status, overdue)}
    </Badge>
  );
}

/** Short document code chip (BRD, PKS + SOW, …). */
export function DocChip({ type, className }: { type: DocType; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center rounded-lg bg-adm-ghost px-2 font-mono text-[11px] font-semibold text-adm-muted', className)}>
      {docShort(type)}
    </span>
  );
}

/** Missing documents as chips (max `max`, then "+n"). */
export function MissingDocs({ types, max = 3, empty = 'Lengkap' }: { types: DocType[]; max?: number; empty?: ReactNode }) {
  if (!types.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-adm-mint-fg">
        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {empty}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {types.slice(0, max).map((t) => (
        <span key={t} className="inline-flex h-5 items-center rounded-md bg-adm-warning-soft px-1.5 text-[11px] font-semibold text-adm-warning-fg">
          {docShort(t)}
        </span>
      ))}
      {types.length > max && <span className="text-[11px] font-medium text-adm-muted">+{types.length - max}</span>}
    </span>
  );
}

/** Progress bar + percentage. */
export function ProgressCell({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className={cn('flex min-w-[96px] items-center gap-2', className)}>
      <ThinProgress value={pct} tone={pct >= 100 ? 'mint' : 'cobalt'} className="h-1.5" label={`Progres ${pct}%`} />
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-adm-fg">{pct}%</span>
    </div>
  );
}

/**
 * The 9 stages of spec §2 as a stepper: done (mint check), current (cobalt), upcoming (neutral). Scrolls sideways
 * inside its own row on a phone.
 */
export function StageStepper({ stage, className }: { stage: Stage; className?: string }) {
  const current = stageIndex(stage);
  const listRef = useRef<HTMLOListElement>(null);
  // Baris yang menggulir ke samping: tahap berjalan selalu terlihat (di tengah bila bisa)
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const item = list.querySelector<HTMLElement>('[aria-current="step"]');
    // Proyek selesai tidak punya tahap berjalan: tampilkan ujung kanan
    list.scrollLeft = item ? Math.max(0, item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2) : list.scrollWidth;
  }, [stage]);
  return (
    <ol ref={listRef} className={cn('no-scrollbar relative flex items-start overflow-x-auto pb-1', className)} aria-label="Tahapan proyek">
      {STAGES.map((s, i) => {
        const done = i < current || stage === 'selesai';
        const active = i === current && stage !== 'selesai';
        return (
          <li key={s.key} className="flex min-w-[92px] flex-1 flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || active ? 'bg-cobalt' : 'bg-adm-line')} aria-hidden />
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                  done ? 'bg-adm-mint-soft text-adm-mint-fg' : active ? 'bg-cobalt text-white ring-4 ring-cobalt/15' : 'bg-adm-ghost text-adm-subtle',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden /> : i + 1}
              </span>
              <span className={cn('h-0.5 flex-1', i === STAGES.length - 1 ? 'bg-transparent' : done ? 'bg-cobalt' : 'bg-adm-line')} aria-hidden />
            </div>
            <span className={cn('mt-2 px-1 text-[11px] leading-tight sm:text-xs', active ? 'font-semibold text-adm-fg' : done ? 'text-adm-muted' : 'text-adm-subtle')}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const ACTIVITY: Record<ActivityAction, { icon: LucideIcon; tone: IconBoxTone; label: string }> = {
  project_saved: { icon: Settings2, tone: 'ghost', label: 'Data proyek diperbarui' },
  milestone_saved: { icon: CalendarClock, tone: 'ghost', label: 'Jadwal diperbarui' },
  milestone_deleted: { icon: CalendarClock, tone: 'ghost', label: 'Tahapan dihapus' },
  doc_created: { icon: FilePlus2, tone: 'ghost', label: 'Dokumen dibuat' },
  doc_saved: { icon: Save, tone: 'ghost', label: 'Dokumen disimpan' },
  doc_restored: { icon: History, tone: 'ghost', label: 'Versi lama dipulihkan' },
  doc_submitted: { icon: Send, tone: 'cobalt', label: 'Diajukan ke klien' },
  doc_issued: { icon: Send, tone: 'cobalt', label: 'Invoice diterbitkan' },
  doc_withdrawn: { icon: Undo2, tone: 'ghost', label: 'Pengajuan ditarik' },
  doc_change: { icon: FilePen, tone: 'warning', label: 'Perubahan diajukan' },
  doc_approved: { icon: CheckCircle2, tone: 'mint', label: 'Disetujui klien' },
  doc_rejected: { icon: XCircle, tone: 'danger', label: 'Klien meminta revisi' },
  doc_signed: { icon: PenLine, tone: 'cobalt', label: 'Ditandatangani' },
  doc_completed: { icon: BadgeCheck, tone: 'mint', label: 'Dokumen selesai' },
  doc_deleted: { icon: Trash2, tone: 'ghost', label: 'Dokumen dihapus' },
  invoice_created: { icon: Receipt, tone: 'ghost', label: 'Invoice dibuat' },
  invoice_updated: { icon: Receipt, tone: 'ghost', label: 'Invoice diperbarui' },
  invoice_cancelled: { icon: Ban, tone: 'danger', label: 'Invoice dibatalkan' },
  payment_recorded: { icon: Wallet, tone: 'mint', label: 'Pembayaran dicatat' },
  payment_deleted: { icon: Undo2, tone: 'danger', label: 'Pembayaran dihapus' },
};

/** Activity feed (newest first); `showProject` adds the project name (dashboard). */
export function ActivityList({ items, showProject, className }: { items: Activity[]; showProject?: boolean; className?: string }) {
  return (
    <ol className={cn('space-y-1', className)}>
      {items.map((a) => {
        const meta = ACTIVITY[a.action] ?? ACTIVITY.doc_saved;
        const link = a.document_id ? `/admin/proyek/${a.project_id}/dokumen/${a.document_id}` : `/admin/proyek/${a.project_id}`;
        return (
          <li key={a.id}>
            <Link to={link} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-adm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
              <IconBox icon={meta.icon} tone={meta.tone} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-adm-fg sm:text-sm">{a.detail || meta.label}</p>
                <p className="mt-0.5 truncate text-xs text-adm-muted">
                  {[a.user_name || 'Sistem', showProject ? a.project_code || a.project_name : null].filter(Boolean).join(' · ')}
                  {' · '}
                  <time dateTime={a.created_at.replace(' ', 'T')} title={waktu(a.created_at)}>
                    {relatif(a.created_at)}
                  </time>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Rupiah input: whole rupiah, the formatted amount as hint. */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  required,
  optional,
  id,
  className,
}: {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  id: string;
  className?: string;
}) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint ?? (Number.isFinite(value) ? rupiah(value) : undefined)} required={required} optional={optional} className={className}>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(e) => onChange(e.target.value.trim() === '' ? Number.NaN : Number(e.target.value))}
        invalid={!!error}
        disabled={disabled}
        className="tabular-nums"
      />
    </Field>
  );
}
