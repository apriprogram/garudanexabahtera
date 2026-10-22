// MergeData plus derived, ready-to-print fields (formatted dates, rupiah, labels, sentences). Templates use them as
// ordinary merge fields, e.g. `{{project.start_date_long}}` or `{{invoice.amount_due_rupiah}}`; they are computed at
// render time from the (live or frozen) MergeData, so they can never disagree with the raw values.
//
// Derived fields (in addition to every MergeData field):
//   company.website_short
//   client.type_label
//   project.service_name ("Website Toko Batik"), start_date_long, end_date_long, duration_text ("41 (empat puluh satu)
//     hari kalender"),
//     maintenance_fee_rupiah, maintenance_fee_terbilang, maintenance_period_label, maintenance_period_unit,
//     maintenance_start_long, maintenance_end_long, payment_terms_text
//   milestones.N.start_date_long, due_date_long, status_label
//   document.valid_until_long (+30 hari), warranty_until_long (+90 hari), year
//   invoice.kind_label, term_label, term_percent, term_description, issue_date_long, due_date_long, *_rupiah of every
//     amount, amount_due_terbilang, remaining_rupiah, payment_status_label, pph23_note
//   payment.amount_rupiah, paid_at_long, method_label
// Text that is empty counts as missing (see merge.ts), so a derived field is '' whenever its source is unknown.
import {
  CLIENT_TYPE_LABEL,
  INVOICE_KIND_LABEL,
  MAINTENANCE_PERIOD_LABEL,
  MILESTONE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  SERVICE_LABEL,
  type MergeData,
  type PaymentTerm,
} from '../types';
import { angkaTerbilang, formatRupiahDoc, hari, jumlahHari, persen, tambahHari, tanggalPanjang, terbilang } from './format';

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const obj = (v: unknown): Record<string, unknown> => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const rupiahOrEmpty = (v: unknown) => (num(v) > 0 ? formatRupiahDoc(num(v)) : '');

/** "41 (empat puluh satu) hari kalender"; '' for 0 or less. */
function hariKalender(days: number): string {
  return days > 0 ? `${days} (${angkaTerbilang(days)}) hari kalender` : '';
}

/** "Uang muka (DP) 50%, Termin 2 30%, dan Pelunasan 20%". */
export function termsText(terms: PaymentTerm[]): string {
  const parts = terms.map((t) => `${t.label} ${persen(num(t.percent))}%`);
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')}${parts.length > 2 ? ',' : ''} dan ${parts[parts.length - 1]}`;
}

/**
 * Service + project name without repeating the service: ("Website", "Toko Batik") → "Website Toko Batik", but
 * ("Website", "Website Company Profile") → "Website Company Profile", ("Aplikasi Mobile", "Aplikasi Kasir") →
 * "Aplikasi Kasir".
 */
export function serviceName(label: string, name: string): string {
  const first = (s: string) => s.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  if (!name.trim()) return '';
  if (!label.trim() || first(name) === first(label) || name.toLowerCase().includes(label.toLowerCase())) return name.trim();
  return `${label.trim()} ${name.trim()}`;
}

function projectView(data: MergeData): Record<string, unknown> {
  const p = obj(data.project);
  const value = num(p.value);
  const terms = Array.isArray(p.payment_terms) ? (p.payment_terms as PaymentTerm[]) : [];
  const period = str(p.maintenance_period) as keyof typeof MAINTENANCE_PERIOD_LABEL | '';
  const days = num(p.duration_days) || jumlahHari(str(p.start_date), str(p.end_date));
  const label = str(p.service_label) || SERVICE_LABEL[p.service_type as keyof typeof SERVICE_LABEL] || '';
  return {
    ...p,
    service_label: label,
    service_name: serviceName(label, str(p.name)),
    value_rupiah: str(p.value_rupiah) || formatRupiahDoc(value),
    value_terbilang: str(p.value_terbilang) || terbilang(value),
    start_date_long: tanggalPanjang(str(p.start_date)),
    end_date_long: tanggalPanjang(str(p.end_date)),
    duration_text: hariKalender(days),
    maintenance_fee_rupiah: rupiahOrEmpty(p.maintenance_fee),
    maintenance_fee_terbilang: num(p.maintenance_fee) > 0 ? terbilang(num(p.maintenance_fee)) : '',
    maintenance_period_label: period ? MAINTENANCE_PERIOD_LABEL[period] ?? '' : '',
    maintenance_period_unit: period === 'bulanan' ? 'bulan' : period === 'tahunan' ? 'tahun' : '',
    maintenance_start_long: tanggalPanjang(str(p.maintenance_start)),
    maintenance_end_long: tanggalPanjang(str(p.maintenance_end)),
    payment_terms_text: termsText(terms),
  };
}

function invoiceView(data: MergeData, project: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data.invoice) return undefined;
  const inv = obj(data.invoice);
  const term = (project.payment_terms as PaymentTerm[]).find((t) => t.key === inv.term_key);
  const kindLabel = INVOICE_KIND_LABEL[inv.kind as keyof typeof INVOICE_KIND_LABEL] ?? '';
  const amountDue = num(inv.amount_due);
  const pph23 = num(inv.pph23_amount);
  let description = kindLabel;
  if (term) description = `${term.label} sebesar ${persen(num(term.percent))}% dari nilai kontrak ${str(project.value_rupiah)}`;
  else if (inv.kind === 'maintenance') description = `Biaya pemeliharaan dan dukungan ${str(project.service_label)}`.trim();
  const clientName = str(obj(data.client).name) || 'klien';
  return {
    ...inv,
    kind_label: kindLabel,
    term_label: term?.label ?? kindLabel,
    term_percent: term ? persen(num(term.percent)) : '',
    term_description: description,
    issue_date_long: tanggalPanjang(str(inv.issue_date)),
    due_date_long: tanggalPanjang(str(inv.due_date)),
    subtotal_rupiah: formatRupiahDoc(num(inv.subtotal)),
    discount_rupiah: formatRupiahDoc(num(inv.discount)),
    dpp_rupiah: formatRupiahDoc(num(inv.dpp)),
    ppn_amount_rupiah: formatRupiahDoc(num(inv.ppn_amount)),
    total_rupiah: formatRupiahDoc(num(inv.total)),
    pph23_amount_rupiah: formatRupiahDoc(pph23),
    amount_due_rupiah: formatRupiahDoc(amountDue),
    amount_due_terbilang: terbilang(amountDue),
    amount_paid_rupiah: formatRupiahDoc(num(inv.amount_paid)),
    remaining_rupiah: formatRupiahDoc(Math.max(0, amountDue - num(inv.amount_paid))),
    payment_status_label: PAYMENT_STATUS_LABEL[inv.payment_status as keyof typeof PAYMENT_STATUS_LABEL] ?? '',
    pph23_note:
      pph23 > 0
        ? `PPh Pasal 23 sebesar ${formatRupiahDoc(pph23)} (${persen(num(inv.pph23_rate))}%) dipotong oleh ${clientName}; mohon bukti potong PPh Pasal 23 dikirimkan kepada kami.`
        : '',
  };
}

/** MergeData + derived fields (a new plain object; cheap enough to build per render). */
export function mergeView(data: MergeData): Record<string, unknown> {
  const company = obj(data.company);
  const client = obj(data.client);
  const document = obj(data.document);
  const project = projectView(data);
  const date = str(document.date);
  const payment = data.payment ? obj(data.payment) : undefined;
  return {
    ...data,
    company: { ...company, website_short: str(company.website).replace(/^https?:\/\//i, '').replace(/\/+$/, '') },
    client: { ...client, type_label: CLIENT_TYPE_LABEL[client.type as keyof typeof CLIENT_TYPE_LABEL] ?? '' },
    project,
    milestones: (Array.isArray(data.milestones) ? data.milestones : []).map((m) => ({
      ...m,
      start_date_long: tanggalPanjang(str(m.start_date)),
      due_date_long: tanggalPanjang(str(m.due_date)),
      status_label: MILESTONE_STATUS_LABEL[m.status] ?? '',
    })),
    document: {
      ...document,
      date_long: str(document.date_long) || tanggalPanjang(date),
      day: str(document.day) || hari(date),
      valid_until_long: tanggalPanjang(tambahHari(date, 30)),
      warranty_until_long: tanggalPanjang(tambahHari(date, 90)),
      year: date.slice(0, 4),
    },
    invoice: invoiceView(data, project),
    payment: payment && {
      ...payment,
      amount_rupiah: formatRupiahDoc(num(payment.amount)),
      amount_terbilang: str(payment.amount_terbilang) || terbilang(num(payment.amount)),
      paid_at_long: tanggalPanjang(str(payment.paid_at)),
      method_label: PAYMENT_METHOD_LABEL[payment.method as keyof typeof PAYMENT_METHOD_LABEL] ?? '',
    },
  };
}
