// Block directives: a body line `{{#name}}` becomes blocks generated from MergeData at render time, so tables that
// mirror project data (milestones, payment terms, invoice items, bank accounts) never go stale while a document is a
// draft and are frozen with the snapshot afterwards. The admin edits the data at its source (Jadwal tab, termin,
// invoice form, settings), not cell by cell.
//
//   {{#jadwal}}           milestones: No · Tahapan · Mulai · Selesai · Durasi · Bobot · Status
//   {{#jadwal_ringkas}}   milestones: No · Tahapan · Periode · Durasi (proposal, SOW)
//   {{#termin}}           payment terms with amounts from the contract value
//   {{#rekening}}         company bank accounts (settings)
//   {{#rincian_invoice}}  invoice items
//   {{#total_invoice}}    subtotal, discount, DPP, PPN, PPh 23, amount due (paid / remaining when paid partly)
//   {{#nominal}}          framed amount (Kuitansi: payment amount; Invoice: amount due)
//   {{#ringkasan_uji}}    UAT result counts from the table of section `skenario`
//   {{#tanda_tangan}}     position of the signature row
//   {{#halaman_baru}}     page break (at the start of a body: before the section title)
import type { DocContent, DocType, MergeData, PaymentTrigger } from '../types';
import { MILESTONE_STATUS_LABEL } from '../types';
import { formatRupiahDoc, jumlahHari, persen, roundRupiah, tanggalPendek } from './format';
import { runsText, toRuns } from './markup';
import { MISSING_FIELD } from './merge';
import type { Block, KeyValueRow, TableCell, TextRun } from './model';

export interface DirectiveContext {
  type: DocType;
  data: MergeData;
  content: DocContent;
  /** unresolved merge fields / data, reported in DocModel.missing */
  missing: string[];
}

/** Payment moment as written in documents (PAYMENT_TRIGGER_LABEL is the shorter UI wording). */
const TRIGGER_TEXT: Record<PaymentTrigger, string> = {
  kontrak: 'Setelah Perjanjian ditandatangani',
  pengerjaan: 'Pada tahap pengerjaan',
  uji: 'Pada tahap pengujian (UAT)',
  serah_terima: 'Setelah Berita Acara Serah Terima ditandatangani',
  manual: 'Sesuai kesepakatan para pihak',
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const cell = (text: string, bold = false): TableCell => (text === '' ? [] : [{ text, ...(bold ? { bold: true } : {}) }]);
const value = (text: string, style: Partial<TextRun> = {}): TextRun[] => [{ text, ...style }];
/** qty with a decimal comma: 1 → "1", 1.5 → "1,5" */
const qty = (n: number) => persen(n);

function gap(ctx: DirectiveContext, path: string): Block[] {
  if (!ctx.missing.includes(path)) ctx.missing.push(path);
  return [{ type: 'paragraph', runs: [{ text: MISSING_FIELD }] }];
}

function jadwal(ctx: DirectiveContext, ringkas: boolean): Block[] {
  const milestones = Array.isArray(ctx.data.milestones) ? ctx.data.milestones : [];
  if (!milestones.length) return gap(ctx, 'milestones');
  const totalWeight = milestones.reduce((sum, m) => sum + Math.max(0, num(m.weight)), 0);
  const rows = milestones.map((m, i): TableCell[] => {
    const days = jumlahHari(m.start_date, m.due_date);
    const tahapan: TableCell = [{ text: m.title || MISSING_FIELD, bold: !ringkas }];
    if (!ringkas && m.description) tahapan.push({ text: `\n${m.description}` });
    const durasi = cell(days ? `${days} hari` : '-');
    if (ringkas) {
      const start = tanggalPendek(m.start_date);
      const due = tanggalPendek(m.due_date);
      const periode = start && due ? `${start} – ${due}` : due ? `s.d. ${due}` : start ? `mulai ${start}` : '-';
      return [cell(String(i + 1)), tahapan, cell(periode), durasi];
    }
    return [
      cell(String(i + 1)),
      tahapan,
      cell(tanggalPendek(m.start_date) || '-'),
      cell(tanggalPendek(m.due_date) || '-'),
      durasi,
      cell(totalWeight > 0 ? `${persen((Math.max(0, num(m.weight)) / totalWeight) * 100)}%` : '-'),
      cell(MILESTONE_STATUS_LABEL[m.status] ?? '-'),
    ];
  });
  if (ringkas) {
    return [{ type: 'table', columns: ['No', 'Tahapan', 'Periode', 'Durasi'], rows, align: ['center', 'left', 'left', 'right'], widths: [4, 30, 22, 9] }];
  }
  return [
    {
      type: 'table',
      columns: ['No', 'Tahapan', 'Mulai', 'Selesai', 'Durasi', 'Bobot', 'Status'],
      rows,
      align: ['center', 'left', 'left', 'left', 'right', 'right', 'left'],
      widths: [4, 30, 11, 11, 8, 8, 11],
    },
  ];
}

/** Amount of each term from the contract value; the last term takes the rounding rest when the terms sum to 100 %. */
export function termAmounts(total: number, percents: number[]): number[] {
  const amounts = percents.map((p) => roundRupiah((total * p) / 100));
  const sum = percents.reduce((a, b) => a + b, 0);
  if (amounts.length && Math.abs(sum - 100) <= 0.01) {
    amounts[amounts.length - 1] = total - amounts.slice(0, -1).reduce((a, b) => a + b, 0);
  }
  return amounts;
}

function termin(ctx: DirectiveContext): Block[] {
  const terms = Array.isArray(ctx.data.project?.payment_terms) ? ctx.data.project.payment_terms : [];
  if (!terms.length) return gap(ctx, 'project.payment_terms');
  const total = num(ctx.data.project.value);
  const amounts = termAmounts(total, terms.map((t) => num(t.percent)));
  const rows = terms.map((t, i): TableCell[] => [
    cell(String(i + 1)),
    cell(t.label || MISSING_FIELD),
    cell(`${persen(num(t.percent))}%`),
    cell(formatRupiahDoc(amounts[i])),
    cell(TRIGGER_TEXT[t.trigger] ?? TRIGGER_TEXT.manual),
    cell(`${num(t.due_days)} hari setelah invoice`),
  ]);
  const percentSum = terms.reduce((sum, t) => sum + num(t.percent), 0);
  rows.push([[], cell('Total', true), cell(`${persen(percentSum)}%`, true), cell(formatRupiahDoc(amounts.reduce((a, b) => a + b, 0)), true), [], []]);
  return [
    {
      type: 'table',
      columns: ['No', 'Termin', 'Persentase', 'Nilai', 'Waktu penagihan', 'Jatuh tempo'],
      rows,
      align: ['center', 'left', 'right', 'right', 'left', 'left'],
      widths: [4, 16, 10, 14, 24, 14],
      total: true,
    },
  ];
}

function rekening(ctx: DirectiveContext): Block[] {
  const company = ctx.data.company;
  const accounts = (Array.isArray(company?.bank_accounts) ? company.bank_accounts : []).filter((a) => a && (a.bank?.trim() || a.number?.trim()));
  if (!accounts.length) return gap(ctx, 'company.bank_accounts');
  return [
    {
      type: 'table',
      columns: ['Bank', 'Nomor rekening', 'Atas nama'],
      rows: accounts.map((a) => [cell(a.bank || '-', true), cell(a.number || '-'), cell(a.holder || company.name || '-')]),
      widths: [12, 14, 22],
    },
  ];
}

function rincianInvoice(ctx: DirectiveContext): Block[] {
  const items = ctx.data.invoice?.items;
  if (!Array.isArray(items) || !items.length) return gap(ctx, 'invoice.items');
  return [
    {
      type: 'table',
      columns: ['No', 'Deskripsi', 'Qty', 'Harga satuan', 'Jumlah'],
      rows: items.map((item, i) => [
        cell(String(i + 1)),
        cell(item.description || MISSING_FIELD),
        cell(qty(num(item.qty))),
        cell(formatRupiahDoc(num(item.unit_price))),
        cell(formatRupiahDoc(roundRupiah(num(item.qty) * num(item.unit_price)))),
      ]),
      align: ['center', 'left', 'right', 'right', 'right'],
      widths: [4, 34, 6, 14, 14],
    },
  ];
}

function totalInvoice(ctx: DirectiveContext): Block[] {
  const inv = ctx.data.invoice;
  if (!inv) return gap(ctx, 'invoice.total');
  const rp = (n: number) => value(formatRupiahDoc(num(n)));
  const rows: KeyValueRow[] = [{ label: 'Subtotal', value: rp(inv.subtotal) }];
  if (num(inv.discount) > 0) rows.push({ label: 'Diskon', value: rp(-num(inv.discount)) });
  const ppnOn = num(inv.ppn_rate) > 0;
  if (ppnOn) {
    if (num(inv.dpp) !== num(inv.base)) rows.push({ label: 'DPP nilai lain', value: rp(inv.dpp) });
    rows.push({ label: `PPN ${persen(num(inv.ppn_rate))}%`, value: rp(inv.ppn_amount) });
  }
  if (num(inv.pph23_amount) > 0) {
    rows.push({ label: 'Total', value: rp(inv.total) });
    rows.push({ label: `Dipotong PPh Pasal 23 (${persen(num(inv.pph23_rate))}%)`, value: rp(-num(inv.pph23_amount)) });
  }
  rows.push({ label: 'Jumlah yang harus dibayar', value: value(formatRupiahDoc(num(inv.amount_due)), { bold: true }), strong: true });
  if (num(inv.amount_paid) > 0) {
    rows.push({ label: 'Telah dibayar', value: rp(-num(inv.amount_paid)) });
    rows.push({
      label: 'Sisa tagihan',
      value: value(formatRupiahDoc(Math.max(0, num(inv.amount_due) - num(inv.amount_paid))), { bold: true }),
      strong: true,
    });
  }
  return [{ type: 'keyValue', rows, variant: 'totals' }];
}

function nominal(ctx: DirectiveContext): Block[] {
  const amount = ctx.type === 'receipt' ? ctx.data.payment?.amount : ctx.data.invoice?.amount_due;
  if (amount === undefined || amount === null) return gap(ctx, ctx.type === 'receipt' ? 'payment.amount' : 'invoice.amount_due');
  return [{ type: 'paragraph', runs: [{ text: `${formatRupiahDoc(num(amount))},-`, bold: true }], boxed: true, size: 'large', align: 'left' }];
}

function ringkasanUji(ctx: DirectiveContext): Block[] {
  const table = ctx.content.sections?.find((s) => s.id === 'skenario' && !s.hidden)?.table;
  const col = table ? table.columns.findIndex((c) => /lulus/i.test(c)) : -1;
  if (!table || col < 0) return gap(ctx, 'skenario');
  const rows = table.rows.filter((row) => row.some((c) => String(c ?? '').trim() !== ''));
  let lulus = 0;
  let gagal = 0;
  for (const row of rows) {
    const result = runsText(toRuns(String(row[col] ?? ''))).trim().toLowerCase();
    if (result.startsWith('lulus')) lulus += 1;
    else if (result.startsWith('gagal')) gagal += 1;
  }
  const belum = rows.length - lulus - gagal;
  const out: KeyValueRow[] = [
    { label: 'Jumlah skenario', value: value(String(rows.length)) },
    { label: 'Lulus', value: value(String(lulus)) },
    { label: 'Gagal', value: value(String(gagal)) },
  ];
  if (belum > 0) out.push({ label: 'Belum diuji', value: value(String(belum)) });
  out.push({ label: 'Tingkat kelulusan', value: value(rows.length ? `${persen((lulus / rows.length) * 100)}%` : '0%'), strong: true });
  return [{ type: 'keyValue', rows: out }];
}

const DIRECTIVES: Record<string, (ctx: DirectiveContext) => Block[]> = {
  jadwal: (ctx) => jadwal(ctx, false),
  jadwal_ringkas: (ctx) => jadwal(ctx, true),
  termin,
  rekening,
  rincian_invoice: rincianInvoice,
  total_invoice: totalInvoice,
  nominal,
  ringkasan_uji: ringkasanUji,
  tanda_tangan: () => [{ type: 'signatures' }],
  halaman_baru: () => [{ type: 'pageBreak' }],
};

/** Blocks of directive `name`; an unknown directive renders "[…]" and is reported as `#name`. */
export function directiveBlocks(name: string, ctx: DirectiveContext): Block[] {
  const make = Object.hasOwn(DIRECTIVES, name) ? DIRECTIVES[name] : null;
  return make ? make(ctx) : gap(ctx, `#${name}`);
}
