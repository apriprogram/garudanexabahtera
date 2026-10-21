// Client-side validation of the admin forms; mirrors the backend rules (spec §5 "Validation essentials",
// backend/modules/project_docs/core.php) so most mistakes are shown before a request. Error keys use the backend's
// field names (`payment_terms.0.percent`, `company.email`, `items.1.qty`), so server errors land on the same fields.
import type { BankAccount, InvoiceItem, PaymentTerm, SlaPriority } from '../../../../features/project-docs/types';

export type Errors = Record<string, string>;

export const MONEY_MAX = 1e12;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 ().-]{6,50}$/;
const NPWP_RE = /^[0-9 .-]+$/;
const TERM_KEY_RE = /^[A-Za-z0-9_-]{1,40}$/;

/** A real calendar date 'YYYY-MM-DD'. */
export function isDate(v: string | null | undefined): v is string {
  if (!v || !DATE_RE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const isEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isPhone = (v: string) => PHONE_RE.test(v.trim());
export const isNpwp = (v: string) => NPWP_RE.test(v.trim());
export const isMoney = (n: number) => Number.isFinite(n) && n >= 0 && n <= MONEY_MAX;

/** Sum of term percentages, rounded to 2 decimals. */
export const termsTotal = (terms: PaymentTerm[]) => Math.round(terms.reduce((sum, t) => sum + (Number(t.percent) || 0), 0) * 100) / 100;

/** Payment terms: 1–12 rows, unique keys, label, 0–100 %, 0–365 days, total 100 % (± 0.01). */
export function validateTerms(terms: PaymentTerm[], field = 'payment_terms'): Errors {
  const errors: Errors = {};
  if (terms.length < 1 || terms.length > 12) {
    errors[field] = 'Termin pembayaran wajib diisi (1–12 termin).';
    return errors;
  }
  const keys = new Set<string>();
  terms.forEach((t, i) => {
    const f = `${field}.${i}`;
    if (!TERM_KEY_RE.test(t.key)) errors[`${f}.key`] = 'Kode termin hanya huruf, angka, - dan _.';
    else if (keys.has(t.key.toLowerCase())) errors[`${f}.key`] = 'Kode termin tidak boleh sama.';
    keys.add(t.key.toLowerCase());
    if (!t.label.trim()) errors[`${f}.label`] = 'Nama termin wajib diisi.';
    else if (t.label.trim().length > 100) errors[`${f}.label`] = 'Nama termin maks. 100 karakter.';
    if (!Number.isFinite(t.percent) || t.percent < 0 || t.percent > 100) errors[`${f}.percent`] = 'Persentase 0 sampai 100.';
    if (!Number.isInteger(t.due_days) || t.due_days < 0 || t.due_days > 365) errors[`${f}.due_days`] = 'Jatuh tempo 0 sampai 365 hari.';
  });
  if (Object.keys(errors).length === 0 && Math.abs(termsTotal(terms) - 100) > 0.01) errors[field] = 'Total persentase termin harus 100%.';
  return errors;
}

/** New term key that is not used yet: termin1, termin2, … */
export function nextTermKey(terms: PaymentTerm[]): string {
  const used = new Set(terms.map((t) => t.key.toLowerCase()));
  for (let n = terms.length + 1; ; n += 1) {
    const key = `termin${n}`;
    if (!used.has(key)) return key;
  }
}

export interface ClientForm {
  type: 'perusahaan' | 'perorangan';
  name: string;
  pic_name: string;
  pic_title: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  npwp: string;
  notes: string;
}

export function validateClient(f: ClientForm): Errors {
  const errors: Errors = {};
  if (!f.name.trim()) errors.name = f.type === 'perorangan' ? 'Nama lengkap wajib diisi.' : 'Nama perusahaan wajib diisi.';
  else if (f.name.trim().length > 255) errors.name = 'Nama maks. 255 karakter.';
  if (f.email.trim() && !isEmail(f.email)) errors.email = 'Format email tidak valid, contoh: nama@email.com';
  if (f.phone.trim() && !isPhone(f.phone)) errors.phone = 'Nomor HP tidak valid, contoh: 081234567890.';
  if (f.npwp.trim() && !isNpwp(f.npwp)) errors.npwp = 'NPWP hanya angka, titik, dan tanda hubung.';
  if (f.npwp.trim().length > 32) errors.npwp = 'NPWP maks. 32 karakter.';
  if (f.city.trim().length > 120) errors.city = 'Kota maks. 120 karakter.';
  if (f.notes.length > 2000) errors.notes = 'Catatan maks. 2000 karakter.';
  if (f.address.length > 2000) errors.address = 'Alamat maks. 2000 karakter.';
  return errors;
}

export interface MilestoneForm {
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  weight: number;
  progress: number;
}

export function validateMilestone(f: MilestoneForm): Errors {
  const errors: Errors = {};
  if (!f.title.trim()) errors.title = 'Nama tahapan wajib diisi.';
  else if (f.title.trim().length > 255) errors.title = 'Nama tahapan maks. 255 karakter.';
  if (f.description.length > 2000) errors.description = 'Deskripsi maks. 2000 karakter.';
  if (f.start_date && !isDate(f.start_date)) errors.start_date = 'Tanggal tidak valid.';
  if (f.due_date && !isDate(f.due_date)) errors.due_date = 'Tanggal tidak valid.';
  if (isDate(f.start_date) && isDate(f.due_date) && f.due_date < f.start_date) errors.due_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  if (!Number.isInteger(f.weight) || f.weight < 0 || f.weight > 1000) errors.weight = 'Bobot 0 sampai 1000.';
  if (!Number.isInteger(f.progress) || f.progress < 0 || f.progress > 100) errors.progress = 'Progres 0 sampai 100.';
  return errors;
}

export interface InvoiceForm {
  items: InvoiceItem[];
  discount: number;
  issue_date: string;
  due_date: string;
  notes: string;
}

/** Invoice form; `amountDue` = calcInvoice().amount_due of the same values. */
export function validateInvoice(f: InvoiceForm, amountDue: number): Errors {
  const errors: Errors = {};
  if (f.items.length < 1 || f.items.length > 50) errors.items = 'Isi 1 sampai 50 baris tagihan.';
  f.items.forEach((item, i) => {
    if (!item.description.trim()) errors[`items.${i}.description`] = 'Uraian wajib diisi.';
    else if (item.description.length > 500) errors[`items.${i}.description`] = 'Uraian maks. 500 karakter.';
    if (!Number.isFinite(item.qty) || item.qty <= 0 || item.qty > 1_000_000) errors[`items.${i}.qty`] = 'Jumlah harus lebih dari 0.';
    if (!isMoney(item.unit_price)) errors[`items.${i}.unit_price`] = 'Harga 0 sampai Rp1 triliun.';
  });
  if (!isMoney(f.discount)) errors.discount = 'Diskon tidak valid.';
  if (!isDate(f.issue_date)) errors.issue_date = 'Tanggal invoice wajib diisi.';
  if (!isDate(f.due_date)) errors.due_date = 'Jatuh tempo wajib diisi.';
  else if (isDate(f.issue_date) && f.due_date < f.issue_date) errors.due_date = 'Jatuh tempo tidak boleh sebelum tanggal invoice.';
  if (f.notes.length > 2000) errors.notes = 'Catatan maks. 2000 karakter.';
  if (!errors.items && Object.keys(errors).every((k) => !k.startsWith('items.')) && amountDue <= 0) errors.items = 'Jumlah yang harus dibayar harus lebih dari 0.';
  return errors;
}

export interface PaymentForm {
  amount: number;
  paid_at: string;
  reference: string;
  note: string;
}

export function validatePayment(f: PaymentForm, remaining: number): Errors {
  const errors: Errors = {};
  if (!Number.isFinite(f.amount) || Math.round(f.amount) <= 0) errors.amount = 'Jumlah pembayaran harus lebih dari 0.';
  else if (Math.round(f.amount) > remaining) errors.amount = 'Jumlah pembayaran melebihi sisa tagihan.';
  if (!isDate(f.paid_at)) errors.paid_at = 'Tanggal pembayaran wajib diisi.';
  if (f.reference.length > 120) errors.reference = 'Referensi maks. 120 karakter.';
  if (f.note.length > 2000) errors.note = 'Catatan maks. 2000 karakter.';
  return errors;
}

export function validateBankAccounts(accounts: BankAccount[]): Errors {
  const errors: Errors = {};
  if (accounts.length > 5) errors['company.bank_accounts'] = 'Rekening bank maksimal 5.';
  accounts.forEach((a, i) => {
    if (a.number.trim() && !/^[0-9 .-]+$/.test(a.number.trim())) errors[`company.bank_accounts.${i}.number`] = 'Nomor rekening hanya angka.';
  });
  return errors;
}

export function validateSlaPriorities(priorities: SlaPriority[]): Errors {
  const errors: Errors = {};
  if (priorities.length > 10) errors['sla_defaults.priorities'] = 'Prioritas SLA maksimal 10.';
  priorities.forEach((p, i) => {
    if (!p.level.trim()) errors[`sla_defaults.priorities.${i}.level`] = 'Level prioritas wajib diisi.';
  });
  return errors;
}

/** Number from an <input type="number"> value ('' → NaN so empty required fields fail validation). */
export const toNumber = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));
