// Menu admin Generate: bentuk data invoice & proposal (= JSON backend/modules/admin_generate.php/.js), isi form kosong,
// dan hitungan total untuk pratinjau langsung. Server selalu menghitung ulang total dengan rumus yang sama
// (gen_calc_totals): setengah dibulatkan ke atas lewat Math.floor(x + 0.5).

export type DocKind = 'invoice' | 'proposal';
export type InvoiceStatus = 'draft' | 'terkirim' | 'lunas';
export type ProposalStatus = 'draft' | 'terkirim' | 'disetujui' | 'ditolak';
export type DiscountType = 'amount' | 'percent';

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = { draft: 'Draf', terkirim: 'Terkirim', lunas: 'Lunas' };
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: 'Draf',
  terkirim: 'Terkirim',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

/** = GEN_LIMITS di admin_generate.php (maxLength isian form). */
export const GEN_LIMITS = {
  name: 150,
  company: 150,
  email: 150,
  phone: 40,
  address: 1000,
  description: 500,
  unit: 30,
  items: 100,
  notes: 5000,
  payment_info: 2000,
  title: 200,
  summary: 10000,
  scope_item: 500,
  scope: 50,
  phase: 200,
  duration: 100,
  phase_description: 1000,
  timeline: 30,
  terms: 10000,
  transcript: 4000,
} as const;

export interface LineItem {
  description: string;
  qty: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface TimelineStep {
  phase: string;
  duration: string;
  description: string;
}

interface ClientFields {
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  client_address: string;
}

export interface InvoiceSummary {
  id: number;
  number: string;
  date: string;
  due_date: string;
  client_name: string;
  client_company: string;
  total: number;
  status: InvoiceStatus;
  updated_at: string;
}

export interface Invoice extends InvoiceSummary, ClientFields {
  items: LineItem[];
  discount_type: DiscountType;
  discount_value: number;
  tax_enabled: boolean;
  tax_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  notes: string;
  payment_info: string;
  created_at: string;
}

export interface ProposalSummary {
  id: number;
  number: string;
  date: string;
  valid_until: string;
  client_name: string;
  client_company: string;
  title: string;
  total: number;
  status: ProposalStatus;
  updated_at: string;
}

export interface Proposal extends ProposalSummary, ClientFields {
  summary: string;
  scope: string[];
  timeline: TimelineStep[];
  items: LineItem[];
  tax_enabled: boolean;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  terms: string;
  created_at: string;
}

/** Baris item di form: angka disimpan sebagai teks supaya admin bebas mengetik ("1,5", ""). */
export interface ItemDraft {
  description: string;
  qty: string;
  unit: string;
  price: string;
}

export interface InvoiceForm extends ClientFields {
  id: number | null;
  date: string;
  due_date: string;
  items: ItemDraft[];
  discount_type: DiscountType;
  discount_value: string;
  tax_enabled: boolean;
  tax_rate: string;
  notes: string;
  payment_info: string;
  status: InvoiceStatus;
}

export interface ProposalForm extends ClientFields {
  id: number | null;
  date: string;
  valid_until: string;
  title: string;
  summary: string;
  scope: string[];
  timeline: TimelineStep[];
  items: ItemDraft[];
  tax_enabled: boolean;
  tax_rate: string;
  terms: string;
  status: ProposalStatus;
}

/** Isian dari gen_voice_parse (AI) atau parser lokal: hanya kunci yang dikenali. */
export interface VoiceData {
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  date?: string;
  due_date?: string;
  valid_until?: string;
  items?: { description: string; qty: number; unit: string; price: number }[];
  discount_type?: DiscountType;
  discount_value?: number;
  tax_enabled?: boolean;
  tax_rate?: number;
  notes?: string;
  payment_info?: string;
  status?: InvoiceStatus;
  title?: string;
  summary?: string;
  scope?: string[];
  timeline?: TimelineStep[];
  terms?: string;
}

export const emptyItem = (): ItemDraft => ({ description: '', qty: '1', unit: '', price: '' });
export const emptyStep = (): TimelineStep => ({ phase: '', duration: '', description: '' });

/** Hari ini di Asia/Jakarta (UTC+7), 'YYYY-MM-DD'. */
export const todayJakarta = (now = Date.now()) => new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** 'YYYY-MM-DD' + n hari; '' bila tanggal tidak valid. */
export function addDays(iso: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export const DEFAULT_TERMS = [
  'Harga belum termasuk biaya domain dan hosting kecuali disebutkan dalam rincian biaya.',
  'Pembayaran 50% di muka sebagai tanda jadi, sisanya setelah pekerjaan selesai dan diserahterimakan.',
  'Revisi minor gratis selama masa pengerjaan; perubahan ruang lingkup dihitung terpisah.',
  'Jadwal pengerjaan dimulai setelah uang muka dan materi dari klien diterima.',
].join('\n');

/** Info pembayaran kosong: dokumen memakai rekening dari Pengaturan dokumen (bankText di docModel.ts). */
export function emptyInvoiceForm(today = todayJakarta()): InvoiceForm {
  return {
    id: null,
    date: today,
    due_date: addDays(today, 14),
    client_name: '',
    client_company: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    items: [emptyItem()],
    discount_type: 'amount',
    discount_value: '',
    tax_enabled: false,
    tax_rate: '11',
    notes: '',
    payment_info: '',
    status: 'draft',
  };
}

export function emptyProposalForm(today = todayJakarta()): ProposalForm {
  return {
    id: null,
    date: today,
    valid_until: addDays(today, 30),
    client_name: '',
    client_company: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    title: '',
    summary: '',
    scope: [''],
    timeline: [emptyStep()],
    items: [emptyItem()],
    tax_enabled: false,
    tax_rate: '11',
    terms: DEFAULT_TERMS,
    status: 'draft',
  };
}

const numText = (n: number) => (Number.isFinite(n) && n !== 0 ? String(n) : '');
const toDraft = (item: { description: string; qty: number; unit: string; price: number }): ItemDraft => ({
  description: item.description,
  qty: String(item.qty || 1),
  unit: item.unit,
  price: numText(item.price),
});

export function invoiceToForm(inv: Invoice): InvoiceForm {
  return {
    id: inv.id,
    date: inv.date,
    due_date: inv.due_date,
    client_name: inv.client_name,
    client_company: inv.client_company,
    client_email: inv.client_email,
    client_phone: inv.client_phone,
    client_address: inv.client_address,
    items: inv.items.length ? inv.items.map(toDraft) : [emptyItem()],
    discount_type: inv.discount_type,
    discount_value: numText(inv.discount_value),
    tax_enabled: inv.tax_enabled,
    tax_rate: String(inv.tax_rate),
    notes: inv.notes,
    payment_info: inv.payment_info,
    status: inv.status,
  };
}

export function proposalToForm(p: Proposal): ProposalForm {
  return {
    id: p.id,
    date: p.date,
    valid_until: p.valid_until,
    client_name: p.client_name,
    client_company: p.client_company,
    client_email: p.client_email,
    client_phone: p.client_phone,
    client_address: p.client_address,
    title: p.title,
    summary: p.summary,
    scope: p.scope.length ? [...p.scope] : [''],
    timeline: p.timeline.length ? p.timeline.map((t) => ({ ...t })) : [emptyStep()],
    items: p.items.length ? p.items.map(toDraft) : [emptyItem()],
    tax_enabled: p.tax_enabled,
    tax_rate: String(p.tax_rate),
    terms: p.terms,
    status: p.status,
  };
}

/** Teks angka di form → angka: "1.500.000" / "1500000" / "1,5" → number; kosong/tidak valid → 0. */
export function parseAmount(text: string): number {
  const t = text.trim().replace(/\s|rp/gi, '');
  if (t === '') return 0;
  // Titik sebagai pemisah ribuan (1.500.000), koma sebagai desimal (1,5)
  const normalized = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Baris item di form → LineItem (subtotal = floor(qty × harga + 0.5)); baris kosong dibuang. */
export function draftItems(items: ItemDraft[]): LineItem[] {
  return items
    .filter((it) => it.description.trim() !== '' || parseAmount(it.price) > 0)
    .map((it) => {
      const qty = it.qty.trim() === '' ? 1 : parseAmount(it.qty);
      const price = Math.floor(parseAmount(it.price) + 0.5);
      return { description: it.description.trim(), qty, unit: it.unit.trim(), price, subtotal: Math.floor(qty * price + 0.5) };
    });
}

export interface Totals {
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
}

/** = gen_calc_totals (admin_generate.php): diskon ≤ subtotal, PPN dari (subtotal − diskon), total. */
export function calcTotals(items: LineItem[], discountType: DiscountType, discountValue: number, taxEnabled: boolean, taxRate: number): Totals {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  let discount = discountType === 'percent' ? Math.floor((subtotal * discountValue) / 100 + 0.5) : Math.floor(discountValue + 0.5);
  discount = Math.max(0, Math.min(discount, subtotal));
  const base = subtotal - discount;
  const tax = taxEnabled ? Math.floor((base * taxRate) / 100 + 0.5) : 0;
  return { subtotal, discount_amount: discount, tax_amount: tax, total: base + tax };
}

/** "Rp1.500.000" untuk tampilan form/tabel (tanpa Intl, sama dengan formatRupiahDoc). */
export const rupiah = (n: number) => `${n < 0 ? '-' : ''}Rp${String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Isi form invoice → kiriman gen_invoice_save. */
export function invoicePayload(f: InvoiceForm): Record<string, unknown> {
  return {
    ...(f.id ? { id: f.id } : {}),
    date: f.date,
    due_date: f.due_date,
    client_name: f.client_name,
    client_company: f.client_company,
    client_email: f.client_email.trim(),
    client_phone: f.client_phone,
    client_address: f.client_address,
    items: draftItems(f.items).map(({ description, qty, unit, price }) => ({ description, qty, unit, price })),
    discount_type: f.discount_type,
    discount_value: f.discount_type === 'percent' ? Math.round(parseAmount(f.discount_value) * 100) / 100 : Math.floor(parseAmount(f.discount_value) + 0.5),
    tax_enabled: f.tax_enabled,
    tax_rate: Math.round(parseAmount(f.tax_rate) * 100) / 100,
    notes: f.notes,
    payment_info: f.payment_info,
    status: f.status,
  };
}

/** Isi form proposal → kiriman gen_proposal_save (butir & tahap kosong dibuang). */
export function proposalPayload(f: ProposalForm): Record<string, unknown> {
  return {
    ...(f.id ? { id: f.id } : {}),
    date: f.date,
    valid_until: f.valid_until,
    client_name: f.client_name,
    client_company: f.client_company,
    client_email: f.client_email.trim(),
    client_phone: f.client_phone,
    client_address: f.client_address,
    title: f.title,
    summary: f.summary,
    scope: f.scope.map((s) => s.trim()).filter(Boolean),
    timeline: f.timeline.filter((t) => t.phase.trim() || t.duration.trim() || t.description.trim()),
    items: draftItems(f.items).map(({ description, qty, unit, price }) => ({ description, qty, unit, price })),
    tax_enabled: f.tax_enabled,
    tax_rate: Math.round(parseAmount(f.tax_rate) * 100) / 100,
    terms: f.terms,
    status: f.status,
  };
}

/** Form → data dokumen untuk pratinjau sebelum disimpan (nomor sementara). */
export function invoiceFromForm(f: InvoiceForm, number: string): Invoice {
  const items = draftItems(f.items);
  const discountValue = parseAmount(f.discount_value);
  const taxRate = parseAmount(f.tax_rate);
  const totals = calcTotals(items, f.discount_type, discountValue, f.tax_enabled, taxRate);
  return {
    id: f.id ?? 0,
    number,
    date: f.date,
    due_date: f.due_date,
    client_name: f.client_name.trim(),
    client_company: f.client_company.trim(),
    client_email: f.client_email.trim(),
    client_phone: f.client_phone.trim(),
    client_address: f.client_address.trim(),
    items,
    discount_type: f.discount_type,
    discount_value: discountValue,
    tax_enabled: f.tax_enabled,
    tax_rate: taxRate,
    ...totals,
    notes: f.notes.trim(),
    payment_info: f.payment_info.trim(),
    status: f.status,
    created_at: '',
    updated_at: '',
  };
}

export function proposalFromForm(f: ProposalForm, number: string): Proposal {
  const items = draftItems(f.items);
  const taxRate = parseAmount(f.tax_rate);
  const { subtotal, tax_amount, total } = calcTotals(items, 'amount', 0, f.tax_enabled, taxRate);
  return {
    id: f.id ?? 0,
    number,
    date: f.date,
    valid_until: f.valid_until,
    client_name: f.client_name.trim(),
    client_company: f.client_company.trim(),
    client_email: f.client_email.trim(),
    client_phone: f.client_phone.trim(),
    client_address: f.client_address.trim(),
    title: f.title.trim(),
    summary: f.summary.trim(),
    scope: f.scope.map((s) => s.trim()).filter(Boolean),
    timeline: f.timeline.filter((t) => t.phase.trim()),
    items,
    tax_enabled: f.tax_enabled,
    tax_rate: taxRate,
    subtotal,
    tax_amount,
    total,
    terms: f.terms.trim(),
    status: f.status,
    created_at: '',
    updated_at: '',
  };
}

/**
 * Hasil suara (AI atau parser lokal) digabung ke form: isian yang disebut menimpa, item/butir/tahap ditambahkan
 * setelah baris yang sudah terisi (baris kosong diganti). Admin tetap memeriksa & mengedit sebelum simpan.
 */
export function mergeVoiceIntoInvoice(f: InvoiceForm, v: VoiceData): InvoiceForm {
  const next: InvoiceForm = { ...f, ...pickClient(v) };
  if (v.date) next.date = v.date;
  if (v.due_date) next.due_date = v.due_date;
  if (v.items?.length) next.items = [...f.items.filter(filledItem), ...v.items.map(toDraft)];
  if (v.discount_type) next.discount_type = v.discount_type;
  if (v.discount_value !== undefined) next.discount_value = numText(v.discount_value);
  if (v.tax_enabled !== undefined) next.tax_enabled = v.tax_enabled;
  if (v.tax_rate !== undefined) next.tax_rate = String(v.tax_rate);
  if (v.notes) next.notes = v.notes;
  if (v.payment_info) next.payment_info = v.payment_info;
  if (v.status) next.status = v.status;
  return next;
}

export function mergeVoiceIntoProposal(f: ProposalForm, v: VoiceData): ProposalForm {
  const next: ProposalForm = { ...f, ...pickClient(v) };
  if (v.date) next.date = v.date;
  if (v.valid_until) next.valid_until = v.valid_until;
  if (v.title) next.title = v.title;
  if (v.summary) next.summary = v.summary;
  if (v.scope?.length) next.scope = [...f.scope.filter((s) => s.trim()), ...v.scope];
  if (v.timeline?.length) next.timeline = [...f.timeline.filter((t) => t.phase.trim()), ...v.timeline];
  if (v.items?.length) next.items = [...f.items.filter(filledItem), ...v.items.map(toDraft)];
  if (v.tax_enabled !== undefined) next.tax_enabled = v.tax_enabled;
  if (v.tax_rate !== undefined) next.tax_rate = String(v.tax_rate);
  if (v.terms) next.terms = v.terms;
  return next;
}

const filledItem = (it: ItemDraft) => it.description.trim() !== '' || parseAmount(it.price) > 0;

function pickClient(v: VoiceData): Partial<ClientFields> {
  const out: Partial<ClientFields> = {};
  for (const key of ['client_name', 'client_company', 'client_email', 'client_phone', 'client_address'] as const) {
    if (v[key]) out[key] = v[key];
  }
  return out;
}
