// Menu admin "Generate" (permintaan pemilik 2026-11-01) untuk backend/server.js: invoice dan proposal buatan super
// admin, diketik manual atau didikte lewat suara, disimpan di admin_invoices + admin_invoice_items dan admin_proposals
// (database/migrations/2026-11-01_055_admin_generate.sql). Dokumennya dibuat di browser dari JSON di sini
// (src/pages/admin/generate/docModel.ts).
// backend/modules/admin_generate.php berisi aksi yang sama untuk backend PHP: nama aksi, validasi, hitungan total,
// bentuk JSON, kode HTTP dan `code` harus identik (__tests__/backend/admin-generate.test.ts menjalankan keduanya).
//
// server.js memanggil handleGenerateAction() di handler POST /api.php setelah cek akses (createAuthGate di security.js
// mengisi req.user): semua aksi gen_* ada di ADMIN_ACTIONS, dan handler memeriksa peran admin lagi. Semua aksi hanya
// POST. Daftar aksi, isi, dan jawaban AI: lihat komentar di admin_generate.php.
//
// Uang = rupiah bulat. Pembulatan setengah ke atas lewat Math.floor(x + 0.5) (sama dengan floor($x + 0.5) di PHP dan
// calcTotals di src/pages/admin/generate/types.ts). Panjang teks = code point ([...s].length = mb_strlen).
import { createLimiter } from '../security.js';
import {
  NEXA_DEFAULT_MODEL,
  NEXA_GEMINI_DEFAULT_MODEL,
  nexaClaudeReply,
  nexaConfigRows,
  nexaCustomReply,
  nexaGeminiModels,
  nexaGeminiReply,
  nexaResolveProvider,
} from './nexa.js';

const TIMEZONE_OFFSET_MS = 7 * 3600 * 1000; // Asia/Jakarta, UTC+7 tanpa musim panas
const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9 ().-]{6,39}$/;
const QTY_PATTERN = /^[0-9]{1,6}(\.[0-9]{1,2})?$/;
const RATE_PATTERN = /^[0-9]{1,3}(\.[0-9]{1,2})?$/;
const MONEY_PATTERN = /^[0-9]{1,15}(\.[0-9]+)?$/;
export const INVOICE_STATUSES = ['draft', 'terkirim', 'lunas'];
export const PROPOSAL_STATUSES = ['draft', 'terkirim', 'disetujui', 'ditolak'];
const DISCOUNT_TYPES = ['amount', 'percent'];
// Sama dengan GEN_LIMITS di admin_generate.php dan types.ts
export const GEN_LIMITS = Object.freeze({
  name: 150, company: 150, email: 150, phone: 40, address: 1000,
  description: 500, unit: 30, items: 100,
  notes: 5000, payment_info: 2000,
  title: 200, summary: 10000, scope_item: 500, scope: 50,
  phase: 200, duration: 100, phase_description: 1000, timeline: 30, terms: 10000,
  transcript: 4000,
});
const QTY_MAX = 100000;
const PRICE_MAX = 100000000000;
const TOTAL_MAX = 1000000000000000;
const LIST_LIMIT = 300;
const AI_PER_HOUR = 60;
const AI_MAX_TOKENS = 2048;
const NOT_MIGRATED = 'Tabel Generate belum ada: jalankan migrasi database/migrations/2026-11-01_055_admin_generate.sql.';
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.';

// Sama persis dengan GEN_AI_INSTRUCTIONS / GEN_AI_SCHEMA_* di admin_generate.php
export const GEN_AI_INSTRUCTIONS = `Kamu membantu admin PT Garuda Nexa Bahtera mengisi form dokumen dari transkrip suara berbahasa Indonesia. Transkrip hasil pengenalan suara bisa tanpa tanda baca, salah ketik, atau berisi angka yang diucapkan dengan kata.

Tugasmu: ambil data yang benar-benar disebut di transkrip lalu rapikan. Balas HANYA dengan satu objek JSON yang valid, tanpa teks lain dan tanpa blok kode.

Aturan:
- Jangan mengarang. Kunci yang tidak disebut di transkrip tidak usah ditulis.
- Nama orang, perusahaan, dan alamat ditulis rapi dengan huruf kapital di awal kata (PT, CV, Tbk tetap kapital).
- Uang dan harga ditulis sebagai bilangan bulat rupiah tanpa titik: "1,5 juta" = 1500000, "satu juta lima ratus ribu" = 1500000, "750 ribu" = 750000, "2 M" atau "2 miliar" = 2000000000.
- Tanggal ditulis YYYY-MM-DD. Tanggal relatif ("besok", "minggu depan", "30 hari lagi", "akhir bulan") dihitung dari HARI INI. Bulan tanpa tahun = tahun HARI INI, kecuali tanggalnya sudah lewat untuk jatuh tempo atau masa berlaku (pakai tahun berikutnya).
- Email yang diucapkan ("budi at gmail titik com", "budi et gmail dot com") ditulis budi@gmail.com, huruf kecil tanpa spasi.
- Nomor telepon hanya angka (boleh diawali +), contoh 081234567890.
- qty adalah jumlah (bilangan, boleh desimal), price adalah harga satuan. Bila yang disebut harga total untuk beberapa unit, bagi dengan qty. Bila qty tidak disebut, qty = 1.
- Kalimat deskripsi dirapikan menjadi bahasa Indonesia baku yang ringkas.`;

export const GEN_AI_SCHEMA_INVOICE = `Jenis dokumen: INVOICE. Kunci JSON yang boleh dipakai:
{"client_name": string, "client_company": string, "client_email": string, "client_phone": string, "client_address": string,
 "date": "YYYY-MM-DD" (tanggal invoice), "due_date": "YYYY-MM-DD" (jatuh tempo),
 "items": [{"description": string, "qty": number, "unit": string (paket, bulan, unit, …), "price": integer}],
 "discount_type": "amount" | "percent", "discount_value": number (rupiah bila amount, persen bila percent),
 "tax_enabled": boolean (PPN dipakai), "tax_rate": number (persen PPN),
 "notes": string (catatan), "payment_info": string (rekening / cara bayar), "status": "draft" | "terkirim" | "lunas"}`;

export const GEN_AI_SCHEMA_PROPOSAL = `Jenis dokumen: PROPOSAL PENAWARAN PROYEK. Kunci JSON yang boleh dipakai:
{"client_name": string, "client_company": string, "client_email": string, "client_phone": string, "client_address": string,
 "date": "YYYY-MM-DD" (tanggal proposal), "valid_until": "YYYY-MM-DD" (masa berlaku penawaran),
 "title": string (judul proyek), "summary": string (latar belakang / ringkasan, 1–3 paragraf rapi),
 "scope": [string] (ruang lingkup / fitur, satu fitur per butir),
 "timeline": [{"phase": string, "duration": string (mis. "2 minggu"), "description": string}],
 "items": [{"description": string, "qty": number, "unit": string, "price": integer}] (rincian biaya),
 "tax_enabled": boolean, "tax_rate": number, "terms": string (syarat & ketentuan, satu ketentuan per baris)}`;

const aiLimiter = createLimiter(3600 * 1000, AI_PER_HOUR);
const envValue = (key, fallback = '') => (process.env[key] === undefined || process.env[key] === '' ? fallback : process.env[key]);

/** Galat yang pesannya aman ditampilkan (peran ApiError di api.php). `errors` = pesan per kolom. */
export class GenError extends Error {
  constructor(message, status = 400, code = null, errors = null, headers = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.headers = headers;
  }
}

const HANDLERS = {
  gen_invoices_list: invoicesList,
  gen_invoice_get: invoiceGet,
  gen_invoice_save: invoiceSave,
  gen_invoice_delete: invoiceDelete,
  gen_proposals_list: proposalsList,
  gen_proposal_get: proposalGet,
  gen_proposal_save: proposalSave,
  gen_proposal_delete: proposalDelete,
  gen_voice_parse: voiceParse,
};
export const GENERATE_ACTIONS = Object.keys(HANDLERS);

export async function handleGenerateAction(action, params, req, res, pool) {
  const name = typeof action === 'string' ? action.trim() : '';
  if (!Object.hasOwn(HANDLERS, name)) return false;
  try {
    if (req.method !== 'POST') throw new GenError('Gunakan metode POST untuk aksi ini.', 405, 'METHOD_NOT_ALLOWED');
    const user = requireAdmin(req.user || null);
    const input = isPlainObject(params) ? params : {};
    let data;
    try {
      data = await HANDLERS[name]({ pool, input, user });
    } catch (err) {
      if (err && (err.errno === 1146 || err.code === 'ER_NO_SUCH_TABLE')) throw new GenError(NOT_MIGRATED, 503, 'GEN_NOT_MIGRATED');
      throw err;
    }
    res.json({ success: true, ...data });
  } catch (err) {
    sendError(res, err, name);
  }
  return true;
}

function sendError(res, err, action) {
  if (res.headersSent) return;
  if (err instanceof GenError) {
    if (err.headers) res.set(err.headers);
    if (res.locals) res.locals.safeError = true;
    const body = { error: err.message };
    if (err.code) body.code = err.code;
    if (err.errors && Object.keys(err.errors).length) body.errors = err.errors;
    res.status(err.status).json(body);
    return;
  }
  console.error(`[api] ${action}:`, err);
  res.status(500).json({ error: GENERIC_ERROR });
}

// ════════════════════════════════════════════════════════════════════════════
// Invoice
// ════════════════════════════════════════════════════════════════════════════

async function invoicesList({ pool, input }) {
  const [where, params] = searchClause(input, ['invoice_number', 'client_name', 'client_company', 'client_email']);
  const rows = await dbAll(pool, `SELECT * FROM admin_invoices ${where} ORDER BY invoice_date DESC, id DESC LIMIT ${LIST_LIMIT}`, params);
  return { invoices: rows.map(invoiceSummary), next_number: await nextNumber(pool, 'invoice', today()) };
}

async function invoiceGet({ pool, input }) {
  return { invoice: await loadInvoice(pool, inInt(input, 'id')) };
}

async function invoiceSave({ pool, input, user }) {
  const id = inInt(input, 'id');
  if (id > 0 && !(await dbOne(pool, 'SELECT id FROM admin_invoices WHERE id = ? LIMIT 1', [id]))) throw notFound('invoice');
  const [data, errors] = validateInvoice(input);
  if (Object.keys(errors).length) throw new GenError(Object.values(errors)[0], 400, 'VALIDATION', errors);
  const values = [
    data.date, nullDate(data.due_date), data.client_name, data.client_company, data.client_email, data.client_phone,
    data.client_address, data.discount_type, Number(data.discount_value), data.tax_enabled ? 1 : 0, Number(data.tax_rate),
    data.subtotal, data.discount_amount, data.tax_amount, data.total, data.notes, data.payment_info, data.status,
  ];
  const columns = `invoice_date = ?, due_date = ?, client_name = ?, client_company = ?, client_email = ?, client_phone = ?,
                   client_address = ?, discount_type = ?, discount_value = ?, tax_enabled = ?, tax_rate = ?, subtotal = ?,
                   discount_amount = ?, tax_amount = ?, total = ?, notes = ?, payment_info = ?, status = ?`;
  let invoiceId = id;
  for (let attempt = 0; ; attempt++) {
    try {
      await withTransaction(pool, async (db) => {
        if (id > 0) {
          await dbRun(db, `UPDATE admin_invoices SET ${columns} WHERE id = ?`, [...values, id]);
          await dbRun(db, 'DELETE FROM admin_invoice_items WHERE invoice_id = ?', [id]);
        } else {
          const number = await nextNumber(db, 'invoice', data.date);
          const result = await dbRun(db, `INSERT INTO admin_invoices SET invoice_number = ?, created_by = ?, ${columns}`,
            [number, Number(user?.id) || null, ...values]);
          invoiceId = Number(result.insertId);
        }
        for (const [i, item] of data.items.entries()) {
          await dbRun(db, `INSERT INTO admin_invoice_items (invoice_id, sort_order, description, qty, unit, price, subtotal)
                           VALUES (?, ?, ?, ?, ?, ?, ?)`, [invoiceId, i, item.description, Number(item.qty), item.unit, item.price, item.subtotal]);
        }
      });
      break;
    } catch (err) {
      // Nomor yang sama diambil permintaan lain pada saat bersamaan: ambil nomor berikutnya
      if (!(err instanceof GenError) || err.status !== 409 || id > 0 || attempt >= 2) throw err;
    }
  }
  return { invoice: await loadInvoice(pool, invoiceId) };
}

async function invoiceDelete({ pool, input }) {
  const id = inInt(input, 'id');
  if (id <= 0 || !(await dbOne(pool, 'SELECT id FROM admin_invoices WHERE id = ? LIMIT 1', [id]))) throw notFound('invoice');
  await dbRun(pool, 'DELETE FROM admin_invoice_items WHERE invoice_id = ?', [id]);
  await dbRun(pool, 'DELETE FROM admin_invoices WHERE id = ?', [id]);
  return {};
}

async function loadInvoice(pool, id) {
  const row = id > 0 ? await dbOne(pool, 'SELECT * FROM admin_invoices WHERE id = ? LIMIT 1', [id]) : null;
  if (!row) throw notFound('invoice');
  const items = await dbAll(pool, `SELECT description, qty, unit, price, subtotal FROM admin_invoice_items
                                   WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC`, [id]);
  return invoiceOut(row, items);
}

const invoiceSummary = (row) => ({
  id: Number(row.id),
  number: String(row.invoice_number),
  date: dateOut(row.invoice_date),
  due_date: dateOut(row.due_date),
  client_name: String(row.client_name),
  client_company: String(row.client_company),
  total: Number(row.total),
  status: String(row.status),
  updated_at: String(row.updated_at),
});

const invoiceOut = (row, items) => ({
  ...invoiceSummary(row),
  client_email: String(row.client_email),
  client_phone: String(row.client_phone),
  client_address: String(row.client_address),
  items: items.map(itemOut),
  discount_type: DISCOUNT_TYPES.includes(row.discount_type) ? row.discount_type : 'amount',
  discount_value: numOut(row.discount_value),
  tax_enabled: Number(row.tax_enabled) === 1,
  tax_rate: numOut(row.tax_rate),
  subtotal: Number(row.subtotal),
  discount_amount: Number(row.discount_amount),
  tax_amount: Number(row.tax_amount),
  notes: String(row.notes ?? ''),
  payment_info: String(row.payment_info ?? ''),
  created_at: String(row.created_at),
});

// ════════════════════════════════════════════════════════════════════════════
// Proposal
// ════════════════════════════════════════════════════════════════════════════

async function proposalsList({ pool, input }) {
  const [where, params] = searchClause(input, ['proposal_number', 'client_name', 'client_company', 'client_email', 'title']);
  const rows = await dbAll(pool, `SELECT id, proposal_number, proposal_date, valid_until, client_name, client_company, title, total,
                                         status, updated_at
                                  FROM admin_proposals ${where} ORDER BY proposal_date DESC, id DESC LIMIT ${LIST_LIMIT}`, params);
  return { proposals: rows.map(proposalSummary), next_number: await nextNumber(pool, 'proposal', today()) };
}

async function proposalGet({ pool, input }) {
  return { proposal: await loadProposal(pool, inInt(input, 'id')) };
}

async function proposalSave({ pool, input, user }) {
  const id = inInt(input, 'id');
  if (id > 0 && !(await dbOne(pool, 'SELECT id FROM admin_proposals WHERE id = ? LIMIT 1', [id]))) throw notFound('proposal');
  const [data, errors] = validateProposal(input);
  if (Object.keys(errors).length) throw new GenError(Object.values(errors)[0], 400, 'VALIDATION', errors);
  const values = [
    data.date, nullDate(data.valid_until), data.client_name, data.client_company, data.client_email, data.client_phone,
    data.client_address, data.title, data.summary, JSON.stringify(data.scope), JSON.stringify(data.timeline), JSON.stringify(data.items),
    data.tax_enabled ? 1 : 0, Number(data.tax_rate), data.subtotal, data.tax_amount, data.total, data.terms, data.status,
  ];
  const columns = `proposal_date = ?, valid_until = ?, client_name = ?, client_company = ?, client_email = ?, client_phone = ?,
                   client_address = ?, title = ?, summary = ?, scope = ?, timeline = ?, items = ?, tax_enabled = ?, tax_rate = ?,
                   subtotal = ?, tax_amount = ?, total = ?, terms = ?, status = ?`;
  if (id > 0) {
    await dbRun(pool, `UPDATE admin_proposals SET ${columns} WHERE id = ?`, [...values, id]);
    return { proposal: await loadProposal(pool, id) };
  }
  let insertId = 0;
  for (let attempt = 0; ; attempt++) {
    try {
      const number = await nextNumber(pool, 'proposal', data.date);
      const result = await dbRun(pool, `INSERT INTO admin_proposals SET proposal_number = ?, created_by = ?, ${columns}`,
        [number, Number(user?.id) || null, ...values]);
      insertId = Number(result.insertId);
      break;
    } catch (err) {
      if (!(err instanceof GenError) || err.status !== 409 || attempt >= 2) throw err;
    }
  }
  return { proposal: await loadProposal(pool, insertId) };
}

async function proposalDelete({ pool, input }) {
  const id = inInt(input, 'id');
  if (id <= 0 || !(await dbOne(pool, 'SELECT id FROM admin_proposals WHERE id = ? LIMIT 1', [id]))) throw notFound('proposal');
  await dbRun(pool, 'DELETE FROM admin_proposals WHERE id = ?', [id]);
  return {};
}

async function loadProposal(pool, id) {
  const row = id > 0 ? await dbOne(pool, 'SELECT * FROM admin_proposals WHERE id = ? LIMIT 1', [id]) : null;
  if (!row) throw notFound('proposal');
  return proposalOut(row);
}

const proposalSummary = (row) => ({
  id: Number(row.id),
  number: String(row.proposal_number),
  date: dateOut(row.proposal_date),
  valid_until: dateOut(row.valid_until),
  client_name: String(row.client_name),
  client_company: String(row.client_company),
  title: String(row.title),
  total: Number(row.total),
  status: String(row.status),
  updated_at: String(row.updated_at),
});

export function proposalOut(row) {
  return {
    ...proposalSummary(row),
    client_email: String(row.client_email),
    client_phone: String(row.client_phone),
    client_address: String(row.client_address),
    summary: String(row.summary ?? ''),
    scope: jsonList(row.scope).filter((line) => typeof line === 'string'),
    timeline: jsonList(row.timeline)
      .filter(isArrayLike)
      .map((t) => ({ phase: strOf(t.phase), duration: strOf(t.duration), description: strOf(t.description) })),
    items: jsonList(row.items).filter(isArrayLike).map(itemOut),
    tax_enabled: Number(row.tax_enabled) === 1,
    tax_rate: numOut(row.tax_rate),
    subtotal: Number(row.subtotal),
    tax_amount: Number(row.tax_amount),
    terms: String(row.terms ?? ''),
    created_at: String(row.created_at),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Rapikan transkrip suara dengan Nexa AI
// ════════════════════════════════════════════════════════════════════════════

async function voiceParse({ pool, input, user }) {
  const kind = input.kind;
  if (kind !== 'invoice' && kind !== 'proposal') throw new GenError('Jenis dokumen tidak valid.', 400, 'VALIDATION', { kind: 'Jenis dokumen tidak valid.' });
  const transcript = typeof input.transcript === 'string' ? multiline(input.transcript) : '';
  if (transcript === '') throw new GenError('Transkrip suara masih kosong.', 400, 'VALIDATION', { transcript: 'Transkrip suara masih kosong.' });
  if (length(transcript) > GEN_LIMITS.transcript) {
    const message = `Transkrip maksimal ${GEN_LIMITS.transcript} karakter.`;
    throw new GenError(message, 400, 'VALIDATION', { transcript: message });
  }
  const active = nexaResolveProvider(await nexaConfigRows(pool), envValue('ANTHROPIC_API_KEY'), envValue('GEMINI_API_KEY'));
  if (active === null) throw new GenError('Nexa AI belum aktif: isi kunci AI di tab Tanya Nexa.', 503, 'GEN_AI_OFFLINE');

  const limitKey = `gen-ai|${Number(user?.id) || 0}`;
  const wait = aiLimiter.retryAfter(limitKey);
  if (wait) {
    throw new GenError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(wait / 60))} menit.`, 429, null, null,
      { 'Retry-After': String(wait) });
  }
  aiLimiter.hit(limitKey);

  const result = await aiReply(active, aiSystem(kind), aiUserMessage(transcript, today()));
  if (result.reply === undefined) {
    console.error(`[generate] ${result.error}`);
    throw new GenError('Nexa AI sedang tidak tersedia.', 503, 'GEN_AI_UNAVAILABLE');
  }
  const json = extractJson(result.reply);
  if (json === null) {
    console.error('[generate] AI reply is not a JSON object');
    throw new GenError('Jawaban Nexa AI tidak bisa dibaca.', 502, 'GEN_AI_BAD_OUTPUT');
  }
  return { data: cleanAi(kind, json), provider: active.provider };
}

export const aiSystem = (kind) => `${GEN_AI_INSTRUCTIONS}\n\n${kind === 'invoice' ? GEN_AI_SCHEMA_INVOICE : GEN_AI_SCHEMA_PROPOSAL}`;
export const aiUserMessage = (transcript, day) => `HARI INI: ${day}\n\nTRANSKRIP:\n${transcript}`;

/** Satu pertanyaan ke penyedia AI aktif (pemanggil HTTP yang sama dengan nexa_chat): { reply } atau { error }. */
export async function aiReply(active, system, message, fetchImpl = fetch) {
  if (active.provider === 'gemini') {
    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: AI_MAX_TOKENS, responseMimeType: 'application/json' },
    };
    return nexaGeminiReply(active.key, nexaGeminiModels(envValue('NEXA_GEMINI_MODEL', NEXA_GEMINI_DEFAULT_MODEL)), body, fetchImpl);
  }
  if (active.provider === 'custom') {
    const body = {
      model: active.model,
      max_tokens: AI_MAX_TOKENS,
      messages: [{ role: 'system', content: system }, { role: 'user', content: message }],
      stream: false,
    };
    return nexaCustomReply(active.url, active.key, body, fetchImpl);
  }
  const body = {
    model: envValue('NEXA_MODEL', NEXA_DEFAULT_MODEL),
    max_tokens: AI_MAX_TOKENS,
    system: [{ type: 'text', text: system }],
    messages: [{ role: 'user', content: message }],
    output_config: { effort: 'low' },
  };
  return nexaClaudeReply(active.key, body, fetchImpl);
}

/** Objek JSON pertama di jawaban AI (boleh dibungkus ```json … ``` atau diberi kalimat pembuka); null bila tidak ada. */
export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end < start) return null;
  let data;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  return isMapLike(data) ? data : null;
}

/** Isian dari AI yang aman dipakai form (= gen_clean_ai di admin_generate.php). */
export function cleanAi(kind, raw) {
  const out = {};
  const single = { client_name: 'name', client_company: 'company', client_address: 'address' };
  const multi = kind === 'invoice' ? { notes: 'notes', payment_info: 'payment_info' } : { title: 'title', summary: 'summary', terms: 'terms' };
  for (const [key, limit] of Object.entries(single)) {
    const value = cut(singleLine(aiStr(raw[key])), GEN_LIMITS[limit]);
    if (value !== '') out[key] = value;
  }
  for (const [key, limit] of Object.entries(multi)) {
    const value = cut(key === 'title' ? singleLine(aiStr(raw[key])) : multiline(aiStr(raw[key])), GEN_LIMITS[limit]);
    if (value !== '') out[key] = value;
  }
  const email = aiStr(raw.client_email).replace(/[ \t\r\n\v\f]+/g, '').toLowerCase();
  if (email !== '' && email.length <= GEN_LIMITS.email && EMAIL_PATTERN.test(email)) out.client_email = email;
  const phone = aiStr(raw.client_phone).replace(/[^0-9+]/g, '');
  if (phone !== '' && /^\+?[0-9]{6,20}$/.test(phone)) out.client_phone = phone;
  for (const key of ['date', kind === 'invoice' ? 'due_date' : 'valid_until']) {
    const date = aiStr(raw[key]);
    if (validDate(date)) out[key] = date;
  }
  const items = [];
  for (const item of phpList(raw.items) ?? []) {
    if (!isMapLike(item) || items.length >= GEN_LIMITS.items) continue;
    const description = cut(singleLine(aiStr(item.description)), GEN_LIMITS.description);
    if (description === '') continue;
    let qty = aiNumber(item.qty);
    qty = qty !== null && qty > 0 && qty <= QTY_MAX ? Math.floor(qty * 100 + 0.5) / 100 : 1;
    const price = aiNumber(item.price);
    items.push({
      description,
      qty: numOut(qty > 0 ? qty : 1),
      unit: cut(singleLine(aiStr(item.unit)), GEN_LIMITS.unit),
      price: price !== null && price >= 0 && price <= PRICE_MAX ? Math.floor(price + 0.5) : 0,
    });
  }
  if (items.length) out.items = items;
  if (typeof raw.tax_enabled === 'boolean') out.tax_enabled = raw.tax_enabled;
  const rate = aiNumber(raw.tax_rate);
  if (rate !== null && rate >= 0 && rate <= 100) out.tax_rate = numOut(Math.floor(rate * 100 + 0.5) / 100);
  if (kind === 'invoice') {
    if (DISCOUNT_TYPES.includes(raw.discount_type)) out.discount_type = raw.discount_type;
    const discount = aiNumber(raw.discount_value);
    const percent = (out.discount_type ?? 'amount') === 'percent';
    if (discount !== null && discount >= 0 && discount <= (percent ? 100 : TOTAL_MAX)) {
      out.discount_value = percent ? numOut(Math.floor(discount * 100 + 0.5) / 100) : Math.floor(discount + 0.5);
    }
    if (INVOICE_STATUSES.includes(raw.status)) out.status = raw.status;
  } else {
    const scope = [];
    for (const entry of phpList(raw.scope) ?? []) {
      const line = cut(singleLine(aiStr(entry)), GEN_LIMITS.scope_item);
      if (line !== '' && scope.length < GEN_LIMITS.scope) scope.push(line);
    }
    if (scope.length) out.scope = scope;
    const timeline = [];
    for (const step of phpList(raw.timeline) ?? []) {
      if (!isMapLike(step) || timeline.length >= GEN_LIMITS.timeline) continue;
      const phase = cut(singleLine(aiStr(step.phase)), GEN_LIMITS.phase);
      if (phase === '') continue;
      timeline.push({
        phase,
        duration: cut(singleLine(aiStr(step.duration)), GEN_LIMITS.duration),
        description: cut(multiline(aiStr(step.description)), GEN_LIMITS.phase_description),
      });
    }
    if (timeline.length) out.timeline = timeline;
  }
  return out;
}

// Teks dari AI: string apa adanya, bilangan bulat jadi teks (= is_int di PHP), selain itu ''
const aiStr = (value) => (typeof value === 'string' ? value : Number.isInteger(value) ? String(value) : '');

// Angka dari AI: bilangan JSON atau teks angka biasa ("1500000", "1.5"); selain itu null
function aiNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^[0-9]+(\.[0-9]+)?$/.test(value.trim())) return Number(value.trim());
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Validasi & hitungan (fungsi murni, = admin_generate.php)
// ════════════════════════════════════════════════════════════════════════════

export function validateInvoice(input) {
  const errors = {};
  const data = validateCommon(input, 'due_date', 'Jatuh tempo', errors);
  data.items = validateItems(input.items, true, errors);
  let type = input.discount_type ?? 'amount';
  if (!DISCOUNT_TYPES.includes(type)) {
    errors.discount_type = 'Jenis diskon tidak valid.';
    type = 'amount';
  }
  data.discount_type = type;
  data.discount_value = type === 'percent'
    ? rate(input, 'discount_value', 'Diskon (%)', errors)
    : money(input.discount_value, 'discount_value', 'Diskon', TOTAL_MAX, errors);
  data.tax_enabled = flag(input.tax_enabled);
  data.tax_rate = rate(input, 'tax_rate', 'PPN (%)', errors, 11);
  data.notes = textField(input, 'notes', 'Catatan', GEN_LIMITS.notes, true, false, errors);
  data.payment_info = textField(input, 'payment_info', 'Info pembayaran', GEN_LIMITS.payment_info, true, false, errors);
  data.status = status(input, INVOICE_STATUSES, errors);
  const totals = calcTotals(data.items, data.discount_type, data.discount_value, data.tax_enabled, data.tax_rate);
  if (totals.total > TOTAL_MAX || totals.subtotal > TOTAL_MAX) errors.items = errors.items ?? 'Total terlalu besar.';
  return [{ ...data, ...totals }, errors];
}

export function validateProposal(input) {
  const errors = {};
  const data = validateCommon(input, 'valid_until', 'Masa berlaku', errors);
  data.title = textField(input, 'title', 'Judul proyek', GEN_LIMITS.title, false, true, errors);
  data.summary = textField(input, 'summary', 'Latar belakang', GEN_LIMITS.summary, true, false, errors);
  data.scope = validateScope(input.scope, errors);
  data.timeline = validateTimeline(input.timeline, errors);
  data.items = validateItems(input.items, true, errors);
  data.tax_enabled = flag(input.tax_enabled);
  data.tax_rate = rate(input, 'tax_rate', 'PPN (%)', errors, 11);
  data.terms = textField(input, 'terms', 'Syarat & ketentuan', GEN_LIMITS.terms, true, false, errors);
  data.status = status(input, PROPOSAL_STATUSES, errors);
  const { discount_amount: _discount, ...totals } = calcTotals(data.items, 'amount', 0, data.tax_enabled, data.tax_rate);
  if (totals.total > TOTAL_MAX || totals.subtotal > TOTAL_MAX) errors.items = errors.items ?? 'Total terlalu besar.';
  return [{ ...data, ...totals }, errors];
}

/** = gen_calc_totals: subtotal, diskon (≤ subtotal), PPN dari (subtotal − diskon), total. */
export function calcTotals(items, discountType, discountValue, taxEnabled, taxRate) {
  let subtotal = 0;
  for (const item of items) subtotal += Number(item.subtotal);
  let discount = discountType === 'percent'
    ? Math.floor((subtotal * Number(discountValue)) / 100 + 0.5)
    : Math.floor(Number(discountValue) + 0.5);
  discount = Math.max(0, Math.min(discount, subtotal));
  const base = subtotal - discount;
  const tax = taxEnabled ? Math.floor((base * Number(taxRate)) / 100 + 0.5) : 0;
  return { subtotal, discount_amount: discount, tax_amount: tax, total: base + tax };
}

function validateCommon(input, dateKey, dateLabel, errors) {
  let date = input.date ?? null;
  if (typeof date !== 'string' || !validDate(date)) {
    errors.date = 'Tanggal wajib diisi (format YYYY-MM-DD).';
    date = '';
  }
  let second = input[dateKey] ?? null;
  if (second === null || second === '') {
    second = '';
  } else if (typeof second !== 'string' || !validDate(second)) {
    errors[dateKey] = `${dateLabel} tidak valid (format YYYY-MM-DD).`;
    second = '';
  } else if (date !== '' && second < date) {
    errors[dateKey] = `${dateLabel} tidak boleh sebelum tanggal dokumen.`;
  }
  const data = {
    date,
    [dateKey]: second,
    client_name: textField(input, 'client_name', 'Nama klien', GEN_LIMITS.name, false, true, errors),
    client_company: textField(input, 'client_company', 'Perusahaan', GEN_LIMITS.company, false, false, errors),
    client_email: textField(input, 'client_email', 'Email', GEN_LIMITS.email, false, false, errors),
    client_phone: textField(input, 'client_phone', 'Telepon', GEN_LIMITS.phone, false, false, errors),
    client_address: textField(input, 'client_address', 'Alamat', GEN_LIMITS.address, true, false, errors),
  };
  if (data.client_email !== '' && errors.client_email === undefined && !EMAIL_PATTERN.test(data.client_email)) {
    errors.client_email = 'Format email tidak valid.';
  }
  if (data.client_phone !== '' && errors.client_phone === undefined && !PHONE_PATTERN.test(data.client_phone)) {
    errors.client_phone = 'Nomor telepon hanya boleh angka, spasi, +, -, titik, dan tanda kurung.';
  }
  return data;
}

function validateItems(raw, required, errors) {
  const list = raw === undefined || raw === null ? [] : phpList(raw);
  if (list === null) {
    errors.items = 'Daftar item tidak valid.';
    return [];
  }
  const items = [];
  list.forEach((row, i) => {
    const key = `items.${i}`;
    if (!isMapLike(row)) {
      errors[`${key}.description`] = 'Item tidak valid.';
      return;
    }
    const descRaw = row.description ?? '';
    const priceRaw = row.price ?? null;
    const description = typeof descRaw === 'string' ? singleLine(descRaw) : '';
    if (description === '' && (priceRaw === null || priceRaw === '' || priceRaw === 0 || priceRaw === '0')) return;
    if (typeof descRaw !== 'string') errors[`${key}.description`] = 'Deskripsi item tidak valid.';
    else if (description === '') errors[`${key}.description`] = 'Deskripsi item wajib diisi.';
    else if (length(description) > GEN_LIMITS.description) errors[`${key}.description`] = `Deskripsi item maksimal ${GEN_LIMITS.description} karakter.`;
    const qtyRaw = row.qty ?? null;
    let qty = 1;
    if (qtyRaw !== null && qtyRaw !== '') {
      const text = typeof qtyRaw === 'number' ? numberText(qtyRaw) : typeof qtyRaw === 'string' ? qtyRaw.trim().replace(/,/g, '.') : '';
      if (!QTY_PATTERN.test(text) || Number(text) <= 0 || Number(text) > QTY_MAX) {
        errors[`${key}.qty`] = 'Qty harus lebih dari 0 (maksimal 2 angka desimal).';
      } else {
        qty = Number(text);
      }
    }
    const unitRaw = row.unit ?? '';
    const unit = typeof unitRaw === 'string' ? singleLine(unitRaw) : '';
    if (typeof unitRaw !== 'string' || length(unit) > GEN_LIMITS.unit) errors[`${key}.unit`] = `Satuan maksimal ${GEN_LIMITS.unit} karakter.`;
    const price = money(priceRaw, `${key}.price`, 'Harga', PRICE_MAX, errors);
    items.push({ description, qty: numOut(qty), unit, price, subtotal: Math.floor(qty * price + 0.5) });
  });
  if (items.length > GEN_LIMITS.items) errors.items = `Maksimal ${GEN_LIMITS.items} item.`;
  else if (required && !items.length && errors.items === undefined) errors.items = 'Tambahkan minimal satu item.';
  return items;
}

function validateScope(raw, errors) {
  if (raw === undefined || raw === null) return [];
  const list = phpList(raw);
  if (list === null) {
    errors.scope = 'Ruang lingkup tidak valid.';
    return [];
  }
  const scope = [];
  list.forEach((entry, i) => {
    if (typeof entry !== 'string') {
      errors[`scope.${i}`] = 'Butir ruang lingkup tidak valid.';
      return;
    }
    const line = singleLine(entry);
    if (line === '') return;
    if (length(line) > GEN_LIMITS.scope_item) errors[`scope.${i}`] = `Satu butir maksimal ${GEN_LIMITS.scope_item} karakter.`;
    scope.push(line);
  });
  if (scope.length > GEN_LIMITS.scope) errors.scope = `Maksimal ${GEN_LIMITS.scope} butir ruang lingkup.`;
  return scope;
}

function validateTimeline(raw, errors) {
  if (raw === undefined || raw === null) return [];
  const list = phpList(raw);
  if (list === null) {
    errors.timeline = 'Tahapan tidak valid.';
    return [];
  }
  const timeline = [];
  list.forEach((row, i) => {
    if (!isMapLike(row)) {
      errors[`timeline.${i}.phase`] = 'Tahapan tidak valid.';
      return;
    }
    const step = {};
    for (const [field, label] of [['phase', 'Nama tahap'], ['duration', 'Durasi'], ['description', 'Keterangan']]) {
      let value = row[field] ?? '';
      if (typeof value !== 'string') {
        errors[`timeline.${i}.${field}`] = `${label} tidak valid.`;
        value = '';
      }
      step[field] = field === 'description' ? multiline(value) : singleLine(value);
    }
    if (step.phase === '' && step.duration === '' && step.description === '') return;
    if (step.phase === '') errors[`timeline.${i}.phase`] = 'Nama tahap wajib diisi.';
    for (const [field, limit] of [['phase', 'phase'], ['duration', 'duration'], ['description', 'phase_description']]) {
      if (length(step[field]) > GEN_LIMITS[limit]) errors[`timeline.${i}.${field}`] = `Maksimal ${GEN_LIMITS[limit]} karakter.`;
    }
    timeline.push(step);
  });
  if (timeline.length > GEN_LIMITS.timeline) errors.timeline = `Maksimal ${GEN_LIMITS.timeline} tahapan.`;
  return timeline;
}

function textField(input, key, label, max, isMultiline, required, errors) {
  let raw = input[key] ?? null;
  if (raw === null) raw = '';
  if (typeof raw !== 'string') {
    errors[key] = `${label} tidak valid.`;
    return '';
  }
  const value = isMultiline ? multiline(raw) : singleLine(raw);
  if (required && value === '') errors[key] = `${label} wajib diisi.`;
  else if (length(value) > max) errors[key] = `${label} maksimal ${max} karakter.`;
  return value;
}

function money(raw, key, label, max, errors) {
  if (raw === null || raw === undefined || raw === '') return 0;
  const text = typeof raw === 'number' ? numberText(raw) : typeof raw === 'string' ? raw.trim() : '';
  if (!MONEY_PATTERN.test(text) || Number(text) > max) {
    errors[key] = `${label} harus angka 0 sampai ${String(max).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}.`;
    return 0;
  }
  return Math.floor(Number(text) + 0.5);
}

function rate(input, key, label, errors, fallback = 0) {
  const raw = input[key] ?? null;
  if (raw === null || raw === '') return fallback;
  const text = typeof raw === 'number' ? numberText(raw) : typeof raw === 'string' ? raw.trim().replace(/,/g, '.') : '';
  if (!RATE_PATTERN.test(text) || Number(text) > 100) {
    errors[key] = `${label} harus 0 sampai 100.`;
    return fallback;
  }
  return numOut(Number(text));
}

function status(input, allowed, errors) {
  const value = input.status ?? 'draft';
  if (value === null || value === '') return 'draft';
  if (!allowed.includes(value)) {
    errors.status = 'Status tidak valid.';
    return 'draft';
  }
  return value;
}

const flag = (value) => value === true || value === 1 || value === '1' || value === 'true';

// ════════════════════════════════════════════════════════════════════════════
// Nomor dokumen, tanggal, teks
// ════════════════════════════════════════════════════════════════════════════

async function nextNumber(db, kind, date) {
  const [table, column, prefix] = kind === 'invoice' ? ['admin_invoices', 'invoice_number', 'INV'] : ['admin_proposals', 'proposal_number', 'PRP'];
  const stem = numberStem(prefix, date);
  const rows = await dbAll(db, `SELECT ${column} FROM ${table} WHERE ${column} LIKE ?`, [`${stem}-%`]);
  return numberAfter(stem, rows.map((r) => r[column]));
}

export const numberStem = (prefix, date) => `${prefix}-${date.slice(0, 4)}${date.slice(5, 7)}`;

/** Nomor urut berikutnya setelah nomor terbesar yang sudah ada dengan awalan `stem` (= gen_number_after). */
export function numberAfter(stem, numbers) {
  let max = 0;
  const pattern = new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}-([0-9]{1,9})$`);
  for (const number of numbers) {
    const m = pattern.exec(String(number));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${stem}-${String(max + 1).padStart(3, '0')}`;
}

function searchClause(input, columns) {
  const q = typeof input.q === 'string' ? [...singleLine(input.q)].slice(0, 100).join('') : '';
  if (q === '') return ['', []];
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return [`WHERE (${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`, columns.map(() => like)];
}

const today = () => new Date(Date.now() + TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);

export function validDate(value) {
  const m = DATE_PATTERN.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day && year >= 2000 && year <= 2100;
}

const nullDate = (value) => (value === '' ? null : value);

function dateOut(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return text === '' || text.startsWith('0000') ? '' : text.slice(0, 10);
}

/** = gen_num_out: angka dari DECIMAL/teks → number (bulat tetap bulat). */
const numOut = (value) => Number(value);

/** = gen_number_text: bilangan sebagai teks desimal biasa (1.5 → "1.5", 2 → "2"). */
function numberText(value) {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return value.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
}

/** = gen_single_line: tab & baris baru jadi spasi, deretan spasi digabung, tepi di-trim. */
export const singleLine = (value) => value.replace(/[ \t\r\n\v\f]+/g, ' ').trim();

/** = gen_multiline: CRLF/CR jadi LF, spasi di akhir baris dibuang, baris kosong berderet digabung, tepi di-trim. */
export const multiline = (value) => value.replace(/\r\n|\r/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const length = (value) => [...value].length;

function cut(value, max) {
  const chars = [...value];
  return chars.length > max ? chars.slice(0, max).join('').trim() : value;
}

const strOf = (value) => (value === null || value === undefined ? '' : String(value));

const itemOut = (item) => ({
  description: strOf(item.description),
  qty: numOut(item.qty ?? 1),
  unit: strOf(item.unit),
  price: Math.trunc(Number(item.price ?? 0)) || 0,
  subtotal: Math.trunc(Number(item.subtotal ?? 0)) || 0,
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Daftar JSON seperti json_decode PHP: array, atau objek berkunci "0".."n-1" (objek kosong = daftar kosong); selain itu null
function phpList(value) {
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return null;
  const keys = Object.keys(value);
  return keys.every((key, i) => key === String(i)) ? keys.map((key) => value[key]) : null;
}

// Objek (array asosiatif PHP): objek biasa yang bukan daftar, atau [] / {} kosong
function isMapLike(value) {
  if (Array.isArray(value)) return value.length === 0;
  return isPlainObject(value) && (Object.keys(value).length === 0 || phpList(value) === null);
}

// is_array PHP: objek atau daftar
const isArrayLike = (value) => Array.isArray(value) || isPlainObject(value);

function jsonList(value) {
  let list = null;
  try {
    list = typeof value === 'string' ? JSON.parse(value) : null;
  } catch {
    list = null;
  }
  return Array.isArray(list) ? list : [];
}

const inInt = (input, key) => {
  const value = input[key];
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

function requireAdmin(user) {
  if (!user) throw new GenError('Sesi tidak valid atau sudah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
  if (user.role !== 'admin') throw new GenError('Akses ditolak: hanya admin.', 403, 'FORBIDDEN');
  return user;
}

const notFound = (kind) => new GenError(kind === 'invoice' ? 'Invoice tidak ditemukan.' : 'Proposal tidak ditemukan.', 404, 'GEN_NOT_FOUND');

// ── Database (setiap nilai di-bind; tanggal kembali sebagai teks seperti mysqli) ──

async function dbRun(db, sql, params = []) {
  try {
    const [result] = await db.query({ sql, values: params, dateStrings: true });
    return result;
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) throw new GenError('Data yang sama sudah ada (duplikat).', 409);
    throw err;
  }
}

const dbAll = (db, sql, params = []) => dbRun(db, sql, params);

async function dbOne(db, sql, params = []) {
  const rows = await dbRun(db, sql, params);
  return rows[0] || null;
}

async function withTransaction(pool, fn) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    try {
      await fn(db);
      await db.commit();
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } finally {
    db.release();
  }
}
