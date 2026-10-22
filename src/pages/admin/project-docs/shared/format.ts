// Labels, tones and formatting of the admin project-docs pages (docs/platform/PROJECT-DOCS-SPEC.md §1, §2, §4).
// Money in the UI uses formatRupiah() (design.md); documents use the engine's formatRupiahDoc().
import type { Tone } from '../../../../components/admin/ui';
import { DOC_TYPES, STAGES } from '../../../../features/project-docs/engine';
import {
  DOC_STATUS_LABEL,
  INVOICE_ISSUED_LABEL,
  INVOICE_KIND_LABEL,
  PAYMENT_STATUS_LABEL,
  REVISION_REQUESTED_LABEL,
  type DocStatus,
  type DocType,
  type InvoiceSummary,
  type MilestoneStatus,
  type PaymentStatus,
  type PaymentTerm,
  type Stage,
} from '../../../../features/project-docs/types';
import { formatRupiah } from '../../../../types/platform';

export const rupiah = (value: number | null | undefined) => formatRupiah(value ?? 0);

const COMPACT = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
/** Short amount for stat tiles: 7500000 → "Rp 7,5 jt" (the full amount goes in the caption). */
export const rupiahRingkas = (value: number | null | undefined) => `Rp ${COMPACT.format(value ?? 0)}`;

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_RE = /[T ](\d{2}):(\d{2})/;

/** 'YYYY-MM-DD' (or a timestamp) → "21 Okt 2026"; '-' when empty. */
export function tanggal(iso: string | null | undefined): string {
  const m = iso ? DATE_RE.exec(iso) : null;
  if (!m) return '-';
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? ''} ${m[1]}`;
}

/** Database timestamp 'YYYY-MM-DD HH:MM:SS' → "21 Okt 2026, 14.05"; '-' when empty. */
export function waktu(ts: string | null | undefined): string {
  if (!ts) return '-';
  const time = TIME_RE.exec(ts);
  return time ? `${tanggal(ts)}, ${time[1]}.${time[2]}` : tanggal(ts);
}

/** Today in Asia/Jakarta as 'YYYY-MM-DD' (dates of documents, invoices and payments). */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 'YYYY-MM-DD' + n days → 'YYYY-MM-DD' ('' for an invalid date). */
export function addDays(iso: string, days: number): string {
  const m = DATE_RE.exec(iso);
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Math.trunc(days)));
  return d.toISOString().slice(0, 10);
}

/** Inclusive day count start → end (0 when a date is missing or end < start). */
export function dayCount(start: string | null | undefined, end: string | null | undefined): number {
  const a = start ? DATE_RE.exec(start) : null;
  const b = end ? DATE_RE.exec(end) : null;
  if (!a || !b) return 0;
  const diff = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3])) - Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  return diff < 0 ? 0 : Math.round(diff / 86_400_000) + 1;
}

/** "3 hari lalu" style relative time of a database timestamp (activity feeds). */
export function relatif(ts: string | null | undefined, now: number = Date.now()): string {
  if (!ts) return '-';
  const t = new Date(ts.replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return ts;
  const minutes = Math.round((now - t) / 60_000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return tanggal(ts);
}

// ── Stages ──

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<Stage, string>;
/** "Pengujian (UAT)" → "pengujian (UAT)" inside a sentence (acronyms keep their capitals). */
export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
export const stageIndex = (stage: Stage) => STAGES.findIndex((s) => s.key === stage);

// ── Documents ──

/** Status label + tone of a document; a rejected draft reads "Perlu revisi", an issued invoice "Terbit". */
export function docStatusInfo(doc: { status: DocStatus; doc_type: DocType; revision_requested?: boolean }): { label: string; tone: Tone } {
  if (doc.status === 'draft') return doc.revision_requested ? { label: REVISION_REQUESTED_LABEL, tone: 'danger' } : { label: DOC_STATUS_LABEL.draft, tone: 'mist' };
  if (doc.status === 'menunggu_persetujuan') return { label: DOC_STATUS_LABEL.menunggu_persetujuan, tone: 'warning' };
  if (doc.status === 'disetujui') return { label: doc.doc_type === 'invoice' ? INVOICE_ISSUED_LABEL : DOC_STATUS_LABEL.disetujui, tone: 'cobalt' };
  return { label: DOC_STATUS_LABEL.selesai, tone: 'mint' };
}

export const docShort = (type: DocType) => DOC_TYPES[type]?.short ?? type;

/** Required flag wording of the checklist (spec §1 "Required"). */
export function requiredLabel(type: DocType, required: boolean): string {
  if (type === 'receipt') return 'Otomatis';
  return required ? 'Wajib' : 'Opsional';
}

// ── Invoices & payments ──

export function paymentTone(status: PaymentStatus, overdue = false): Tone {
  if (status === 'lunas') return 'mint';
  if (status === 'dibatalkan') return 'mist';
  if (overdue) return 'danger';
  return status === 'sebagian' ? 'cobalt' : 'warning';
}

export const paymentLabel = (status: PaymentStatus, overdue = false) =>
  overdue && status !== 'lunas' && status !== 'dibatalkan' ? 'Jatuh tempo' : PAYMENT_STATUS_LABEL[status];

/** "Termin 2 (30%)" for term invoices, the kind label for manual ones. */
export function invoiceKindLabel(invoice: Pick<InvoiceSummary, 'kind' | 'term_key'>, terms: PaymentTerm[] = []): string {
  const term = invoice.term_key ? terms.find((t) => t.key === invoice.term_key) : undefined;
  return term ? `${term.label} (${formatPercent(term.percent)})` : INVOICE_KIND_LABEL[invoice.kind];
}

/** 12.5 → "12,5%" */
export const formatPercent = (n: number) => `${Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

export function milestoneTone(status: MilestoneStatus): Tone {
  return status === 'selesai' ? 'mint' : status === 'berjalan' ? 'cobalt' : status === 'tertunda' ? 'danger' : 'mist';
}
