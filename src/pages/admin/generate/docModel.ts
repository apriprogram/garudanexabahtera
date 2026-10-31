// Invoice dan proposal menu Generate sebagai DocModel mesin dokumen proyek (src/features/project-docs/engine), jadi
// pratinjau A4, cetak, dan PDF memakai kop PT Garuda Nexa Bahtera (pd_settings.company), tipografi, dan
// "Halaman x dari y" yang sama dengan dokumen proyek dan nota pembeli. Murni: tanpa DOM dan tanpa I/O.
import { formatRupiahDoc, tanggalPanjang, terbilang, type Block, type DocModel, type SignatureSlot, type TextRun } from '../../../features/project-docs/engine';
import type { CompanySettings } from '../../../features/project-docs/types';
import { INVOICE_STATUS_LABEL, PROPOSAL_STATUS_LABEL, type Invoice, type LineItem, type Proposal } from './types';

type KeyValueRow = Extract<Block, { type: 'keyValue' }>['rows'][number];

/** Kop bawaan bila Pengaturan dokumen belum diisi (= pd_default_settings di backend). */
export const DEFAULT_COMPANY: CompanySettings = {
  name: 'PT Garuda Nexa Bahtera',
  address: '',
  city: '',
  phone: '',
  email: '',
  website: 'https://garudanexa.com',
  npwp: '',
  signatory_name: '',
  signatory_title: 'Direktur',
  bank_accounts: [],
};

const plain = (text: string): TextRun[] => [{ text }];
const row = (label: string, value: string | TextRun[], strong = false): KeyValueRow => ({
  label,
  value: typeof value === 'string' ? plain(value) : value,
  ...(strong ? { strong } : {}),
});
const tanggal = (iso: string) => tanggalPanjang(iso) || '-';
/** Persen dengan koma desimal: 11 → "11", 12,5 → "12,5". */
const persen = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const qtyText = (n: number) => String(n).replace('.', ',');

/** Kop: setting perusahaan di atas bawaan, nama kosong → PT Garuda Nexa Bahtera. */
export function companyOf(company: Partial<CompanySettings> | null | undefined): CompanySettings {
  const merged = { ...DEFAULT_COMPANY, ...(company ?? {}) };
  return { ...merged, name: merged.name.trim() || DEFAULT_COMPANY.name };
}

/** Teks rekening dari Pengaturan dokumen: "BCA 123 a.n. PT Garuda Nexa Bahtera" per baris. */
export function bankText(company: CompanySettings): string {
  return (company.bank_accounts ?? [])
    .filter((b) => b.bank.trim() && b.number.trim())
    .map((b) => `${b.bank.trim()} ${b.number.trim()}${b.holder.trim() ? ` a.n. ${b.holder.trim()}` : ''}`)
    .join('\n');
}

/** Data klien satu isian per baris: nama (tebal), perusahaan, alamat, email, telepon. */
function clientRuns(c: { client_name: string; client_company: string; client_address: string; client_email: string; client_phone: string }): TextRun[] {
  const rest = [c.client_company, c.client_address, c.client_email, c.client_phone].map((v) => v.trim()).filter(Boolean);
  return [{ text: c.client_name.trim() || '-', bold: true }, ...(rest.length ? [{ text: `\n${rest.join('\n')}` }] : [])];
}

/** Paragraf dari teks beberapa baris (baris kosong = paragraf baru, baris biasa = baris baru). */
const paragraphs = (text: string): Block[] =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: 'paragraph', runs: plain(p), align: 'justify' }) satisfies Block);

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

/** Tabel item: No, Deskripsi, Qty, Harga satuan, Jumlah. */
function itemsTable(items: LineItem[]): Block {
  return {
    type: 'table',
    columns: ['No', 'Deskripsi', 'Qty', 'Harga satuan', 'Jumlah'],
    rows: items.map((it, i) => [
      plain(String(i + 1)),
      plain(it.description),
      plain(`${qtyText(it.qty)}${it.unit ? ` ${it.unit}` : ''}`),
      plain(formatRupiahDoc(it.price)),
      plain(formatRupiahDoc(it.subtotal)),
    ]),
    align: ['center', 'left', 'center', 'right', 'right'],
    widths: [4, 26, 8, 12, 12],
  };
}

function signature(company: CompanySettings, date: string): SignatureSlot {
  return {
    party: 'pihak_pertama',
    label: 'Hormat kami,',
    organization: company.name,
    signer_name: company.signatory_name,
    signer_title: company.signatory_title,
    signed_at: null,
    image_ref: null,
    caption: [company.city.trim(), tanggalPanjang(date)].filter(Boolean).join(', '),
  };
}

/** Nama file unduhan: "Invoice-INV-202611-001.pdf" / "Proposal-PRP-202611-001.pdf". */
export const pdfFileName = (kind: 'invoice' | 'proposal', number: string) =>
  `${kind === 'invoice' ? 'Invoice' : 'Proposal'}-${number.replace(/[^\w.-]+/g, '-')}.pdf`;

export function buildInvoiceDoc(inv: Invoice, companyIn?: Partial<CompanySettings> | null): DocModel {
  const company = companyOf(companyIn);
  const totals: KeyValueRow[] = [row('Subtotal', formatRupiahDoc(inv.subtotal))];
  if (inv.discount_amount > 0) {
    totals.push(row(inv.discount_type === 'percent' ? `Diskon (${persen(inv.discount_value)}%)` : 'Diskon', `-${formatRupiahDoc(inv.discount_amount)}`));
  }
  if (inv.tax_enabled) totals.push(row(`PPN ${persen(inv.tax_rate)}%`, formatRupiahDoc(inv.tax_amount)));
  totals.push(row('Total', [{ text: formatRupiahDoc(inv.total), bold: true }], true));

  const blocks: Block[] = [
    { type: 'heading', level: 1, text: 'INVOICE', align: 'center' },
    { type: 'spacer', size: 6 },
    {
      type: 'keyValue',
      rows: [
        row('No. invoice', inv.number),
        row('Tanggal', tanggal(inv.date)),
        ...(inv.due_date ? [row('Jatuh tempo', tanggal(inv.due_date))] : []),
        row('Status', [{ text: INVOICE_STATUS_LABEL[inv.status] ?? inv.status, bold: true }]),
      ],
    },
    { type: 'heading', level: 2, text: 'Ditagihkan kepada' },
    { type: 'paragraph', runs: clientRuns(inv) },
    { type: 'heading', level: 2, text: 'Rincian tagihan' },
    itemsTable(inv.items),
    { type: 'keyValue', rows: totals, variant: 'totals' },
    { type: 'paragraph', runs: [{ text: 'Terbilang: ' }, { text: terbilang(inv.total), italic: true }] },
  ];
  const payment = inv.payment_info.trim() || bankText(company);
  if (payment) blocks.push({ type: 'heading', level: 2, text: 'Informasi pembayaran' }, { type: 'paragraph', runs: plain(payment) });
  if (inv.notes.trim()) blocks.push({ type: 'heading', level: 2, text: 'Catatan' }, ...paragraphs(inv.notes));

  return {
    meta: { number: inv.number, title: 'INVOICE', type: 'invoice', date: inv.date },
    kop: { company },
    blocks,
    signatures: [signature(company, inv.date)],
    footer: { text: inv.number },
    missing: [],
  };
}

export function buildProposalDoc(p: Proposal, companyIn?: Partial<CompanySettings> | null): DocModel {
  const company = companyOf(companyIn);
  let section = 0;
  const heading = (text: string): Block => ({ type: 'heading', level: 2, text: `${++section}. ${text}` });

  const blocks: Block[] = [
    { type: 'heading', level: 1, text: 'PROPOSAL PENAWARAN', align: 'center' },
    { type: 'paragraph', runs: [{ text: p.title, bold: true }], align: 'center', size: 'large' },
    { type: 'spacer', size: 6 },
    {
      type: 'keyValue',
      rows: [
        row('No. proposal', p.number),
        row('Tanggal', tanggal(p.date)),
        ...(p.valid_until ? [row('Berlaku sampai', tanggal(p.valid_until))] : []),
      ],
    },
    { type: 'heading', level: 2, text: 'Ditujukan kepada' },
    { type: 'paragraph', runs: clientRuns(p) },
  ];
  if (p.summary.trim()) blocks.push(heading('Latar Belakang'), ...paragraphs(p.summary));
  if (p.scope.length) {
    blocks.push(heading('Ruang Lingkup Pekerjaan'), { type: 'list', ordered: true, items: p.scope.map((s) => plain(s)) });
  }
  if (p.timeline.length) {
    blocks.push(heading('Tahapan & Jadwal'), {
      type: 'table',
      columns: ['No', 'Tahap', 'Durasi', 'Keterangan'],
      rows: p.timeline.map((t, i) => [plain(String(i + 1)), plain(t.phase), plain(t.duration || '-'), plain(t.description || '-')]),
      align: ['center', 'left', 'center', 'left'],
      widths: [4, 18, 10, 30],
    });
  }
  const totals: KeyValueRow[] = [row('Subtotal', formatRupiahDoc(p.subtotal))];
  if (p.tax_enabled) totals.push(row(`PPN ${persen(p.tax_rate)}%`, formatRupiahDoc(p.tax_amount)));
  totals.push(row('Total investasi', [{ text: formatRupiahDoc(p.total), bold: true }], true));
  blocks.push(
    heading('Rincian Biaya'),
    itemsTable(p.items),
    { type: 'keyValue', rows: totals, variant: 'totals' },
    { type: 'paragraph', runs: [{ text: 'Terbilang: ' }, { text: terbilang(p.total), italic: true }] },
  );
  const terms = lines(p.terms);
  if (terms.length) blocks.push(heading('Syarat & Ketentuan'), { type: 'list', ordered: true, items: terms.map((t) => plain(t)) });
  blocks.push(
    { type: 'spacer', size: 8 },
    {
      type: 'paragraph',
      runs: plain(
        `Demikian proposal penawaran ini kami sampaikan${p.valid_until ? `. Penawaran berlaku sampai ${tanggal(p.valid_until)}` : ''}. ` +
          `Atas perhatian dan kepercayaan ${p.client_company.trim() || p.client_name.trim() || 'Bapak/Ibu'}, kami ucapkan terima kasih.`,
      ),
      align: 'justify',
    },
  );

  return {
    meta: { number: p.number, title: 'PROPOSAL PENAWARAN', type: 'proposal', date: p.date },
    kop: { company },
    blocks,
    signatures: [signature(company, p.date)],
    footer: { text: p.number },
    missing: [],
  };
}

export const statusLabel = (kind: 'invoice' | 'proposal', status: string) =>
  (kind === 'invoice' ? (INVOICE_STATUS_LABEL as Record<string, string>) : (PROPOSAL_STATUS_LABEL as Record<string, string>))[status] ?? status;
