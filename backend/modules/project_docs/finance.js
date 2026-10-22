// pd_* invoice and payment actions (see ../project_docs.js). The server recomputes every invoice total from the items
// (spec §4.2, never the client's totals); a payment creates its Kuitansi (status selesai) in the same transaction.
// Port of finance.php.
import {
  PD_INVOICE_KIND_LABEL,
  PD_MONEY_MAX,
  PD_PAYMENT_METHODS,
  dbOne,
  dbRun,
  pdBad,
  pdBool,
  pdConflict,
  pdDate,
  pdDocLink,
  pdEnum,
  pdFail,
  pdInsert,
  pdLog,
  pdMoney,
  pdNewDocNumber,
  pdNotFound,
  pdNotify,
  pdNum,
  pdNumberValue,
  pdRequireAdmin,
  pdRequireId,
  pdRound,
  pdRupiah,
  pdSettings,
  pdText,
  pdTx,
  pdValidContent,
} from './core.js';
import { pdAddRevision } from './documents.js';
import { pdDeleteStored, pdProofInput, pdWithStoredFile } from './files.js';
import { asciiLower, isPhpArray, isPhpList, mbSubstr, own, pdJson, phpTrim, phpString, phpValues } from './php.js';
import { pdBundle, pdDocRow, pdFreeze, pdPaymentStatus, pdProjectTerms } from './records.js';

// ════════════════════════════════════════════════════════════════════════════
// Invoice math and input
// ════════════════════════════════════════════════════════════════════════════

/**
 * InvoiceTotals; identical to calcInvoice() in src/features/project-docs/engine/invoice.ts and pd_calc_invoice() in
 * finance.php (whole rupiah, rounding at every step). `tax` = the pd_tax settings.
 */
export function pdCalcInvoice(items, discountIn, ppnEnabled, pph23Enabled, tax) {
  let subtotal = 0;
  for (const item of items) subtotal += pdRound(item.qty * item.unit_price);
  const discount = Math.max(0, pdRound(discountIn));
  const base = Math.max(0, subtotal - discount);
  const denominator = pdNum(tax.dpp_denominator);
  const dpp = ppnEnabled && denominator > 0 ? pdRound((base * tax.dpp_numerator) / denominator) : base;
  const ppnRate = ppnEnabled ? tax.ppn_rate : 0;
  const ppnAmount = ppnEnabled ? pdRound((dpp * ppnRate) / 100) : 0;
  const total = base + ppnAmount;
  const pph23Rate = pph23Enabled ? tax.pph23_rate : 0;
  const pph23Amount = pph23Enabled ? pdRound((base * pph23Rate) / 100) : 0;
  return {
    subtotal, discount, base, dpp, ppn_rate: pdNum(ppnRate), ppn_amount: ppnAmount, total,
    pph23_rate: pdNum(pph23Rate), pph23_amount: pph23Amount, amount_due: total - pph23Amount,
  };
}

// Validated fields of pd_invoice_create / pd_invoice_update plus the recomputed totals and the document title
async function pdInvoiceInput(ctx, input, terms, errors) {
  let term = null;
  const termKey = own(input, 'term_key');
  if (termKey !== null && termKey !== '') {
    for (const t of terms) {
      if (t.key === termKey) term = t;
    }
    if (term === null) errors.term_key = 'Termin pembayaran tidak ada di proyek ini.';
  }
  let kind = pdEnum(input, 'kind', 'Jenis invoice', Object.keys(PD_INVOICE_KIND_LABEL), term === null && !Object.hasOwn(errors, 'term_key'), errors);
  if (kind === null && term !== null) kind = term.key === 'dp' || term.key === 'pelunasan' ? term.key : 'termin';

  const items = [];
  const rawItems = own(input, 'items');
  const itemList = phpValues(rawItems);
  if (!isPhpList(rawItems) || itemList.length < 1 || itemList.length > 50) {
    errors.items = 'Isi 1 sampai 50 baris tagihan.';
  } else {
    for (const [i, value] of itemList.entries()) {
      const raw = isPhpArray(value) ? value : {};
      const itemErrors = {};
      const description = pdText(raw, 'description', 'Uraian', 500, true, itemErrors);
      const qty = pdNumberValue(own(raw, 'qty'));
      if (qty === null || qty <= 0 || qty > 1000000) itemErrors.qty = 'Jumlah harus lebih dari 0 (maks. 1.000.000).';
      const price = pdMoney(raw, 'unit_price', 'Harga satuan', true, itemErrors);
      for (const [field, message] of Object.entries(itemErrors)) errors[`items.${i}.${field}`] = `Baris ${i + 1}: ${message}`;
      items.push({ description: phpString(description), qty: pdNum(qty), unit_price: pdNum(price) });
    }
  }
  const discount = pdMoney(input, 'discount', 'Diskon', false, errors) ?? 0;
  const ppnEnabled = pdBool(own(input, 'ppn_enabled') ?? false);
  const pph23Enabled = pdBool(own(input, 'pph23_enabled') ?? false);
  const issue = pdDate(input, 'issue_date', 'Tanggal invoice', true, errors);
  const due = pdDate(input, 'due_date', 'Jatuh tempo', true, errors);
  if (issue !== null && due !== null && due < issue) errors.due_date = 'Jatuh tempo tidak boleh sebelum tanggal invoice.';
  const notes = pdText(input, 'notes', 'Catatan', 2000, false, errors);
  const content = pdValidContent(own(input, 'content'), 'content', errors);

  let totals = null;
  if (!Object.keys(errors).length) {
    totals = pdCalcInvoice(items, discount, ppnEnabled, pph23Enabled, (await pdSettings(ctx)).tax);
    if (totals.total > PD_MONEY_MAX) errors.items = 'Total invoice melebihi batas Rp1.000.000.000.000.';
    else if (totals.amount_due <= 0) errors.items = 'Jumlah yang harus dibayar harus lebih dari 0.';
  }
  let title = phpTrim(phpString(content?.title ?? ''));
  if (title === '') title = `Invoice ${term ? term.label : (PD_INVOICE_KIND_LABEL[kind] ?? '')}`;
  return {
    term_key: term ? term.key : null, kind, items, issue_date: issue, due_date: due,
    notes, content, totals, title: mbSubstr(title, 0, 255),
  };
}

// pd_invoices column values in the order of INVOICE_COLUMNS
const INVOICE_COLUMNS = ['term_key', 'kind', 'issue_date', 'due_date', 'items', 'subtotal', 'discount', 'dpp', 'ppn_rate', 'ppn_amount', 'pph23_rate', 'pph23_amount', 'total', 'amount_due', 'notes'];
function pdInvoiceValues(v) {
  const t = v.totals;
  return [
    v.term_key, v.kind, v.issue_date, v.due_date, pdJson(v.items), t.subtotal, t.discount, t.dpp,
    t.ppn_rate, t.ppn_amount, t.pph23_rate, t.pph23_amount, t.total, t.amount_due, v.notes,
  ];
}

// A term can be billed once (cancelled invoices do not count)
async function pdCheckTermUnbilled(ctx, projectId, termKey, exceptInvoiceId = 0) {
  if (termKey === null) return;
  if (await dbOne(ctx, "SELECT id FROM pd_invoices WHERE project_id = ? AND term_key = ? AND payment_status <> 'dibatalkan' AND id <> ? LIMIT 1",
    [projectId, termKey, exceptInvoiceId])) {
    throw pdConflict('Termin ini sudah punya invoice. Batalkan invoice lama dulu bila perlu ditagih ulang.', 'DUPLICATE');
  }
}

function pdInvoiceRow(ctx, id, forUpdate = false) {
  return dbOne(ctx, `SELECT i.*, d.number, d.status AS doc_status, d.version AS doc_version FROM pd_invoices i
                     JOIN pd_documents d ON d.id = i.document_id WHERE i.id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
}

// ════════════════════════════════════════════════════════════════════════════
// Invoice actions
// ════════════════════════════════════════════════════════════════════════════

export async function pdActInvoiceCreate(ctx, input, user) {
  pdRequireAdmin(user);
  const projectId = pdRequireId(input, 'project_id', 'ID proyek');
  const b = await pdBundle(ctx, projectId);
  if (!b) throw pdNotFound('Proyek');
  const errors = {};
  const v = await pdInvoiceInput(ctx, input, await pdProjectTerms(ctx, b.p), errors);
  pdFail(errors);
  const contentJson = pdJson(v.content);

  return pdTx(ctx, async () => {
    if (!(await dbOne(ctx, 'SELECT id FROM project_client WHERE id = ? FOR UPDATE', [projectId]))) throw pdNotFound('Proyek');
    await pdCheckTermUnbilled(ctx, projectId, v.term_key);
    const number = await pdNewDocNumber(ctx, 'invoice');
    const docId = await pdInsert(ctx, `INSERT INTO pd_documents (project_id, doc_type, number, title, status, version, content, doc_date, created_by, updated_by)
                                       VALUES (?, 'invoice', ?, ?, 'draft', 1, ?, ?, ?, ?)`,
    [projectId, number, v.title, contentJson, v.issue_date, Number(user.id), Number(user.id)]);
    const id = await pdInsert(ctx, `INSERT INTO pd_invoices (project_id, document_id, ${INVOICE_COLUMNS.join(', ')})
                                    VALUES (?, ?, ${INVOICE_COLUMNS.map(() => '?').join(', ')})`, [projectId, docId, ...pdInvoiceValues(v)]);
    await pdAddRevision(ctx, docId, 1, contentJson, 'Invoice dibuat', user);
    await pdLog(ctx, projectId, docId, user, 'invoice_created', `Invoice ${number} dibuat (${pdRupiah(v.totals.amount_due)})`);
    return { id, document_id: docId, number };
  });
}

// Draft invoices only; the document gets a new version
export async function pdActInvoiceUpdate(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID invoice');
  const current = await pdInvoiceRow(ctx, id);
  if (!current) throw pdNotFound('Invoice');
  const b = await pdBundle(ctx, Number(current.project_id));
  if (!b) throw pdNotFound('Proyek');
  const errors = {};
  const v = await pdInvoiceInput(ctx, input, await pdProjectTerms(ctx, b.p), errors);
  pdFail(errors);
  const contentJson = pdJson(v.content);

  const version = await pdTx(ctx, async () => {
    const invoice = await pdInvoiceRow(ctx, id, true);
    if (!invoice) throw pdNotFound('Invoice');
    if (invoice.payment_status === 'dibatalkan') throw pdConflict('Invoice yang dibatalkan tidak bisa diubah.', 'STATE');
    if (invoice.doc_status !== 'draft') throw pdConflict('Invoice yang sudah terbit terkunci. Gunakan "Ajukan perubahan".', 'LOCKED');
    const projectId = Number(invoice.project_id);
    const docId = Number(invoice.document_id);
    await pdCheckTermUnbilled(ctx, projectId, v.term_key, id);
    await dbRun(ctx, `UPDATE pd_invoices SET ${INVOICE_COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...pdInvoiceValues(v), id]);
    const next = Number(invoice.doc_version) + 1;
    await dbRun(ctx, 'UPDATE pd_documents SET content = ?, title = ?, doc_date = ?, version = ?, updated_by = ? WHERE id = ?',
      [contentJson, v.title, v.issue_date, next, Number(user.id), docId]);
    await pdAddRevision(ctx, docId, next, contentJson, 'Invoice diperbarui', user);
    await pdLog(ctx, projectId, docId, user, 'invoice_updated', `Invoice ${invoice.number} diperbarui (${pdRupiah(v.totals.amount_due)})`);
    return next;
  });
  return { version };
}

// No payments only; the document keeps its status and gets the reason as review note
export async function pdActInvoiceCancel(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID invoice');
  const errors = {};
  const reason = pdText(input, 'reason', 'Alasan pembatalan', 500, true, errors);
  pdFail(errors);

  await pdTx(ctx, async () => {
    const invoice = await pdInvoiceRow(ctx, id, true);
    if (!invoice) throw pdNotFound('Invoice');
    if (invoice.payment_status === 'dibatalkan') throw pdConflict('Invoice sudah dibatalkan.', 'STATE');
    if (pdNum(invoice.amount_paid) > 0 || (await dbOne(ctx, 'SELECT id FROM pd_payments WHERE invoice_id = ? LIMIT 1', [id]))) {
      throw pdConflict('Invoice yang sudah ada pembayarannya tidak bisa dibatalkan. Hapus pembayarannya dulu.', 'LOCKED');
    }
    await dbRun(ctx, "UPDATE pd_invoices SET payment_status = 'dibatalkan' WHERE id = ?", [id]);
    await dbRun(ctx, 'UPDATE pd_documents SET review_note = ?, updated_by = ? WHERE id = ?', [`Dibatalkan: ${reason}`, Number(user.id), Number(invoice.document_id)]);
    await pdLog(ctx, Number(invoice.project_id), Number(invoice.document_id), user, 'invoice_cancelled', `Invoice ${invoice.number} dibatalkan: ${reason}`);
  });
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// Payments
// ════════════════════════════════════════════════════════════════════════════

// Kuitansi content when the request brings none: the same sections as the engine's template
// (src/features/project-docs/engine/templates/receipt.ts), resolved from the receipt's MergeData at render time
function pdDefaultReceiptContent() {
  return {
    title: 'Kuitansi',
    sections: [
      {
        id: 'penerimaan', title: '', table: {
          columns: ['', ''], rows: [
            ['Telah terima dari', '**{{client.name}}**'],
            ['Uang sejumlah', '*{{payment.amount_terbilang}}*'],
            ['Untuk pembayaran', '{{invoice.term_description}} atas invoice nomor {{payment.invoice_number}} untuk pekerjaan '
              + '{{project.service_label}} {{project.name}} ({{project.code}})'],
            ['Tanggal pembayaran', '{{payment.paid_at_long}}'],
            ['Metode pembayaran', '{{payment.method_label}}'],
            ['Referensi', '{{payment.reference|-}}'],
          ],
        },
      },
      { id: 'nominal', title: '', body: '{{#nominal}}' },
      {
        id: 'catatan', title: '', body: 'Kuitansi ini merupakan bukti pembayaran yang sah dan diterbitkan secara elektronik '
          + 'oleh {{company.name}} melalui platform dokumen proyek.',
      },
    ],
  };
}

// Payment + Kuitansi (selesai, frozen snapshot) + invoice amounts in one transaction; notifies the client
export async function pdActPaymentRecord(ctx, input, user) {
  pdRequireAdmin(user);
  const invoiceId = pdRequireId(input, 'invoice_id', 'ID invoice');
  const errors = {};
  const amountIn = pdMoney(input, 'amount', 'Jumlah pembayaran', true, errors);
  if (amountIn !== null && pdRound(amountIn) <= 0) errors.amount = 'Jumlah pembayaran harus lebih dari 0.';
  const paidAt = pdDate(input, 'paid_at', 'Tanggal pembayaran', true, errors);
  const method = pdEnum(input, 'method', 'Metode pembayaran', PD_PAYMENT_METHODS, true, errors);
  const reference = pdText(input, 'reference', 'Referensi', 120, false, errors);
  const note = pdText(input, 'note', 'Catatan', 2000, false, errors);
  const proof = own(input, 'proof') !== null && input.proof !== '' ? pdProofInput(input.proof, errors) : null;
  const content = own(input, 'receipt_content') !== null
    ? pdValidContent(input.receipt_content, 'receipt_content', errors)
    : pdDefaultReceiptContent();
  pdFail(errors);
  const amount = pdRound(amountIn);
  const contentJson = pdJson(content);

  return pdWithStoredFile(proof, (proofFile) => pdTx(ctx, async () => {
    const invoice = await pdInvoiceRow(ctx, invoiceId, true);
    if (!invoice) throw pdNotFound('Invoice');
    if (invoice.payment_status === 'dibatalkan') throw pdConflict('Invoice sudah dibatalkan.', 'STATE');
    if (invoice.doc_status === 'draft') throw pdConflict('Terbitkan invoice dulu sebelum mencatat pembayaran.', 'STATE');
    if (invoice.payment_status === 'lunas') throw pdConflict('Invoice sudah lunas.', 'STATE');
    const due = pdNum(invoice.amount_due);
    const remaining = due - pdNum(invoice.amount_paid);
    if (amount > remaining) throw pdBad('amount', `Jumlah pembayaran melebihi sisa tagihan (${pdRupiah(remaining)}).`);
    const projectId = Number(invoice.project_id);

    const number = await pdNewDocNumber(ctx, 'receipt');
    let title = phpTrim(phpString(content.title ?? ''));
    // The bare template title "Kuitansi" becomes a findable one
    title = mbSubstr(title === '' || asciiLower(title) === 'kuitansi' ? `Kuitansi pembayaran ${invoice.number}` : title, 0, 255);
    const receiptId = await pdInsert(ctx, `INSERT INTO pd_documents (project_id, doc_type, number, title, status, version, content, doc_date,
                                                  completed_at, created_by, updated_by)
                                           VALUES (?, 'receipt', ?, ?, 'selesai', 1, ?, ?, NOW(), ?, ?)`,
    [projectId, number, title, contentJson, paidAt, Number(user.id), Number(user.id)]);
    const paymentId = await pdInsert(ctx, `INSERT INTO pd_payments (invoice_id, amount, paid_at, method, reference, proof_file, note, receipt_document_id, recorded_by)
                                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceId, amount, paidAt, method, reference, proofFile, note, receiptId, Number(user.id)]);
    const paid = pdNum(invoice.amount_paid) + amount;
    const status = pdPaymentStatus(paid, due);
    await dbRun(ctx, 'UPDATE pd_invoices SET amount_paid = ?, payment_status = ? WHERE id = ?', [paid, status, invoiceId]);
    if (status === 'lunas') {
      await dbRun(ctx, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW() WHERE id = ? AND status = 'disetujui'", [Number(invoice.document_id)]);
    }

    // The receipt is born selesai, so its snapshot is frozen right away (after the invoice amounts changed)
    const receipt = await pdDocRow(ctx, receiptId);
    const [snapshot, hash] = await pdFreeze(ctx, await pdBundle(ctx, projectId), receipt, 'selesai');
    await dbRun(ctx, 'UPDATE pd_documents SET snapshot = ?, content_hash = ? WHERE id = ?', [snapshot, hash, receiptId]);
    await pdAddRevision(ctx, receiptId, 1, contentJson, 'Kuitansi dibuat otomatis', user);
    await pdLog(ctx, projectId, Number(invoice.document_id), user, 'payment_recorded',
      `Pembayaran ${pdRupiah(amount)} untuk invoice ${invoice.number} dicatat (kuitansi ${number})`);

    const client = await dbOne(ctx, 'SELECT c.user_id FROM project_client p JOIN pd_clients c ON c.id = p.client_id WHERE p.id = ?', [projectId]);
    if (client && client.user_id !== null) {
      await pdNotify(ctx, {
        user_id: Number(client.user_id), type: 'payment_received', project_id: projectId,
        title: 'Pembayaran diterima',
        body: `Pembayaran ${pdRupiah(amount)} untuk invoice ${invoice.number} sudah kami terima. Kuitansi ${number} tersedia.`,
        link: pdDocLink('customer', projectId, receiptId),
      });
    }
    return { id: paymentId, receipt_document_id: receiptId, receipt_number: number, payment_status: status };
  }));
}

// Reverses the amounts; the receipt stays in history with review note "Dibatalkan"
export async function pdActPaymentDelete(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID pembayaran');

  const proofFile = await pdTx(ctx, async () => {
    const payment = await dbOne(ctx, 'SELECT * FROM pd_payments WHERE id = ? FOR UPDATE', [id]);
    if (!payment) throw pdNotFound('Pembayaran');
    const invoice = await pdInvoiceRow(ctx, Number(payment.invoice_id), true);
    if (!invoice) throw pdNotFound('Invoice');
    const paid = Math.max(0, pdNum(invoice.amount_paid) - pdNum(payment.amount));
    const status = pdPaymentStatus(paid, pdNum(invoice.amount_due));
    await dbRun(ctx, 'UPDATE pd_invoices SET amount_paid = ?, payment_status = ? WHERE id = ?', [paid, status, Number(invoice.id)]);
    if (status !== 'lunas') {
      await dbRun(ctx, "UPDATE pd_documents SET status = 'disetujui', completed_at = NULL WHERE id = ? AND status = 'selesai'", [Number(invoice.document_id)]);
    }
    if (payment.receipt_document_id !== null) {
      await dbRun(ctx, "UPDATE pd_documents SET review_note = 'Dibatalkan', updated_by = ? WHERE id = ?", [Number(user.id), Number(payment.receipt_document_id)]);
    }
    await dbRun(ctx, 'DELETE FROM pd_payments WHERE id = ?', [id]);
    await pdLog(ctx, Number(invoice.project_id), Number(invoice.document_id), user, 'payment_deleted',
      `Pembayaran ${pdRupiah(payment.amount)} untuk invoice ${invoice.number} dihapus`);
    return payment.proof_file;
  });
  await pdDeleteStored(proofFile);
  return {};
}
