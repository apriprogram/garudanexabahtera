// pd_* document actions (see ../project_docs.js): create, read, save + revisions, restore, submit/issue (snapshot
// freeze), withdraw, change management, signing, completion, delete, and the customer's projects, documents and
// approve/reject (+ sign) decision. Status flow and rules: spec §1.1–§1.2. Port of documents.php.
import {
  PD_COMPLETABLE_TYPES,
  PD_DOC_TYPES,
  PD_DOC_TYPE_KEYS,
  PD_PARTY_LABEL,
  dbOne,
  dbRun,
  pdBad,
  pdCheckDocTypeAccess,
  pdClientIp,
  pdConflict,
  pdDate,
  pdDocLabel,
  pdDocLink,
  pdEnum,
  pdFail,
  pdIdValue,
  pdInsert,
  pdIntOrNull,
  pdLog,
  pdNewDocNumber,
  pdNotFound,
  pdNotify,
  pdRequireAdmin,
  pdRequireCustomer,
  pdRequireId,
  pdRequireStaff,
  pdRupiah,
  pdTanggalPanjang,
  pdText,
  pdToday,
  pdTx,
  pdUserAgent,
  pdValidContent,
} from './core.js';
import { pdSignatureInput, pdWithStoredFile } from './files.js';
import { mbSubstr, own, pdJson } from './php.js';
import {
  pdBundle,
  pdBundleInvoice,
  pdBundlesSynced,
  pdCustomerOwnsProject,
  pdDocRow,
  pdDocumentDetail,
  pdFreeze,
  pdProjectDetail,
  pdProjectSummary,
  pdSignatureRows,
} from './records.js';

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

export async function pdAddRevision(ctx, docId, version, contentJson, note, user) {
  await dbRun(ctx, 'INSERT INTO pd_document_revisions (document_id, version, content, change_note, changed_by) VALUES (?, ?, ?, ?, ?)',
    [docId, version, contentJson, note === null ? null : mbSubstr(note, 0, 500), user ? Number(user.id) : null]);
}

// The document row locked for this transaction, or 404
async function pdDocForUpdate(ctx, id) {
  const d = await pdDocRow(ctx, id, true);
  if (!d) throw pdNotFound('Dokumen');
  return d;
}

const pdState = (status, version) => ({ status, version });

// After a signature: a `disetujui` document whose parties all signed the current version becomes `selesai`
async function pdCompleteIfSigned(ctx, d, status, user) {
  const { parties } = PD_DOC_TYPES[d.doc_type];
  if (status !== 'disetujui' || !parties.length) return status;
  const signed = (await pdSignatureRows(ctx, Number(d.id), Number(d.version))).map((s) => s.party);
  if (parties.some((party) => !signed.includes(party))) return status;
  await dbRun(ctx, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW() WHERE id = ?", [Number(d.id)]);
  await pdLog(ctx, Number(d.project_id), Number(d.id), user, 'doc_completed', `${pdDocLabel(d)} selesai: semua pihak sudah tanda tangan`);
  return 'selesai';
}

// Saves the signature PNG and its audit row for the current version (content hash of the frozen version)
async function pdInsertSignature(ctx, d, party, user, method, file, name, title) {
  await dbRun(ctx, `INSERT INTO pd_signatures (document_id, version, party, user_id, signer_name, signer_title, method, image_file, content_hash, ip, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    Number(d.id), Number(d.version), party, Number(user.id), name, title, method, file, d.content_hash ?? '',
    pdClientIp(ctx.req), pdUserAgent(ctx.req),
  ]);
  await pdLog(ctx, Number(d.project_id), Number(d.id), user, 'doc_signed', `${pdDocLabel(d)} ditandatangani ${PD_PARTY_LABEL[party]} (${name})`);
}

// ════════════════════════════════════════════════════════════════════════════
// Staff document actions
// ════════════════════════════════════════════════════════════════════════════

// New draft with the next number of its type; one document per type (invoices and receipts have their own actions)
export async function pdActDocumentCreate(ctx, input, user) {
  pdRequireStaff(user);
  const errors = {};
  const projectId = pdIdValue(own(input, 'project_id'));
  if (projectId === null) errors.project_id = 'ID proyek tidak valid.';
  const type = pdEnum(input, 'doc_type', 'Jenis dokumen', PD_DOC_TYPE_KEYS, true, errors);
  const title = pdText(input, 'title', 'Judul dokumen', 255, true, errors);
  const docDate = pdDate(input, 'doc_date', 'Tanggal dokumen', false, errors);
  const content = pdValidContent(own(input, 'content'), 'content', errors);
  pdFail(errors);
  if (type === 'invoice' || type === 'receipt') {
    throw pdBad('doc_type', 'Invoice dibuat lewat menu invoice; kuitansi terbit otomatis saat pembayaran dicatat.');
  }
  pdCheckDocTypeAccess(user, type);
  const contentJson = pdJson(content);

  return pdTx(ctx, async () => {
    if (!(await dbOne(ctx, 'SELECT id FROM project_client WHERE id = ? FOR UPDATE', [projectId]))) throw pdNotFound('Proyek');
    if (await dbOne(ctx, 'SELECT id FROM pd_documents WHERE project_id = ? AND doc_type = ? LIMIT 1', [projectId, type])) {
      throw pdConflict(`Dokumen ${PD_DOC_TYPES[type].short} untuk proyek ini sudah ada.`, 'DUPLICATE');
    }
    const number = await pdNewDocNumber(ctx, type);
    const id = await pdInsert(ctx, `INSERT INTO pd_documents (project_id, doc_type, number, title, status, version, content, doc_date, created_by, updated_by)
                                    VALUES (?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`,
    [projectId, type, number, title, contentJson, docDate ?? pdToday(), Number(user.id), Number(user.id)]);
    await pdAddRevision(ctx, id, 1, contentJson, 'Dokumen dibuat', user);
    await pdLog(ctx, projectId, id, user, 'doc_created', `${PD_DOC_TYPES[type].short} ${number} dibuat`);
    return { id, number };
  });
}

export async function pdActDocumentGet(ctx, input, user) {
  pdRequireStaff(user);
  const d = await pdDocRow(ctx, pdRequireId(input, 'id', 'ID dokumen'));
  if (!d) throw pdNotFound('Dokumen');
  return { document: await pdDocumentDetail(ctx, d, pdToday(), false) };
}

// New version of a draft (every save is a revision)
export async function pdActDocumentSave(ctx, input, user) {
  pdRequireStaff(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');
  const errors = {};
  const content = pdValidContent(own(input, 'content'), 'content', errors);
  // title / doc_date: omitted or null = unchanged
  const title = own(input, 'title') !== null ? pdText(input, 'title', 'Judul dokumen', 255, true, errors) : null;
  const docDate = pdDate(input, 'doc_date', 'Tanggal dokumen', false, errors);
  const note = pdText(input, 'change_note', 'Catatan perubahan', 500, false, errors);
  pdFail(errors);
  const contentJson = pdJson(content);

  const version = await pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    pdCheckDocTypeAccess(user, d.doc_type);
    if (d.status !== 'draft') throw pdConflict('Dokumen terkunci: hanya draft yang bisa diubah. Gunakan "Ajukan perubahan".', 'LOCKED');
    const next = Number(d.version) + 1;
    await dbRun(ctx, `UPDATE pd_documents SET content = ?, title = COALESCE(?, title), doc_date = COALESCE(?, doc_date), version = ?, updated_by = ?
                      WHERE id = ?`, [contentJson, title, docDate, next, Number(user.id), id]);
    await pdAddRevision(ctx, id, next, contentJson, note, user);
    await pdLog(ctx, Number(d.project_id), id, user, 'doc_saved', `${pdDocLabel(d)} disimpan (versi ${next})`);
    return next;
  });
  return { version };
}

// An older revision's content saved as a new version (draft only)
export async function pdActDocumentRestore(ctx, input, user) {
  pdRequireStaff(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');
  const from = pdRequireId(input, 'version', 'Versi');

  const version = await pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    pdCheckDocTypeAccess(user, d.doc_type);
    if (d.status !== 'draft') throw pdConflict('Dokumen terkunci: versi lama hanya bisa dipulihkan saat draft.', 'LOCKED');
    const revision = await dbOne(ctx, 'SELECT content FROM pd_document_revisions WHERE document_id = ? AND version = ?', [id, from]);
    if (!revision) throw pdNotFound('Versi');
    const next = Number(d.version) + 1;
    await dbRun(ctx, 'UPDATE pd_documents SET content = ?, version = ?, updated_by = ? WHERE id = ?', [revision.content, next, Number(user.id), id]);
    await pdAddRevision(ctx, id, next, revision.content, `Dipulihkan dari versi ${from}`, user);
    await pdLog(ctx, Number(d.project_id), id, user, 'doc_restored', `${pdDocLabel(d)} dipulihkan dari versi ${from} (versi ${next})`);
    return next;
  });
  return { version };
}

// draft → menunggu_persetujuan (client approval) or, for an invoice, → disetujui ("Terbit"); freezes the snapshot
export async function pdActDocumentSubmit(ctx, input, user) {
  pdRequireStaff(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');

  return pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    pdCheckDocTypeAccess(user, d.doc_type);
    if (d.doc_type === 'receipt') throw pdConflict('Kuitansi terbit otomatis dan tidak perlu diajukan.', 'STATE');
    if (d.status !== 'draft') throw pdConflict('Hanya draft yang bisa diajukan.', 'STATE');
    const isInvoice = d.doc_type === 'invoice';
    if (isInvoice) {
      const invoice = await dbOne(ctx, 'SELECT payment_status FROM pd_invoices WHERE document_id = ? FOR UPDATE', [id]);
      if (!invoice || invoice.payment_status === 'dibatalkan') throw pdConflict('Invoice yang dibatalkan tidak bisa diterbitkan.', 'STATE');
    }
    // Signed before a rejection/withdrawal: the resubmission is a new version, so those signatures stay in history
    // but no longer count (every signature belongs to exactly one frozen snapshot)
    if (await dbOne(ctx, 'SELECT id FROM pd_signatures WHERE document_id = ? AND version = ? LIMIT 1', [id, Number(d.version)])) {
      d.version = Number(d.version) + 1;
      await dbRun(ctx, 'UPDATE pd_documents SET version = ? WHERE id = ?', [d.version, id]);
      await pdAddRevision(ctx, id, d.version, d.content, 'Diajukan ulang: tanda tangan versi sebelumnya tidak berlaku lagi', user);
    }
    const status = isInvoice ? 'disetujui' : 'menunggu_persetujuan';
    const projectId = Number(d.project_id);
    const b = await pdBundle(ctx, projectId);
    const [snapshot, hash] = await pdFreeze(ctx, b, d, status);
    await dbRun(ctx, `UPDATE pd_documents SET status = ?, snapshot = ?, content_hash = ?, submitted_at = NOW(), approved_at = ${isInvoice ? 'NOW()' : 'NULL'},
                      revision_requested = 0, review_note = NULL, updated_by = ? WHERE id = ?`, [status, snapshot, hash, Number(user.id), id]);
    const label = pdDocLabel(d);
    await pdLog(ctx, projectId, id, user, isInvoice ? 'doc_issued' : 'doc_submitted',
      isInvoice ? `${label} diterbitkan` : `${label} diajukan untuk persetujuan klien`);
    const clientUser = pdIntOrNull(b.p.c_user_id);
    if (clientUser !== null) {
      let body;
      if (isInvoice) {
        const i = pdBundleInvoice(b, 'document_id', id);
        body = `Invoice ${d.number} sebesar ${pdRupiah(i ? i.amount_due : 0)}, jatuh tempo ${pdTanggalPanjang(i ? i.due_date : '')}.`;
      } else {
        body = `${PD_DOC_TYPES[d.doc_type].short} ${d.number} untuk proyek ${b.p.name} perlu Anda tinjau.`;
      }
      await pdNotify(ctx, {
        user_id: clientUser, type: isInvoice ? 'invoice_issued' : 'doc_review', project_id: projectId,
        title: isInvoice ? 'Invoice baru diterbitkan' : 'Dokumen menunggu persetujuan Anda',
        body, link: pdDocLink('customer', projectId, id),
      });
    }
    return pdState(status, Number(d.version));
  });
}

// menunggu_persetujuan → draft (the snapshot is dropped: drafts render live data)
export async function pdActDocumentWithdraw(ctx, input, user) {
  pdRequireStaff(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');

  return pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    pdCheckDocTypeAccess(user, d.doc_type);
    if (d.status !== 'menunggu_persetujuan') throw pdConflict('Hanya dokumen yang menunggu persetujuan yang bisa ditarik kembali.', 'STATE');
    await dbRun(ctx, "UPDATE pd_documents SET status = 'draft', snapshot = NULL, content_hash = NULL, updated_by = ? WHERE id = ?", [Number(user.id), id]);
    await pdLog(ctx, Number(d.project_id), id, user, 'doc_withdrawn', `${pdDocLabel(d)} ditarik kembali ke draft`);
    return pdState('draft', Number(d.version));
  });
}

// "Ajukan perubahan": a locked document reopens as a new draft version; older approvals/signatures stay in history
export async function pdActDocumentChange(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');
  const errors = {};
  const reason = pdText(input, 'reason', 'Alasan perubahan', 500, true, errors, 10);
  pdFail(errors);

  return pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    if (d.status === 'draft') throw pdConflict('Dokumen masih draft dan bisa langsung diubah.', 'STATE');
    if (d.doc_type === 'receipt') throw pdConflict('Kuitansi tidak bisa diubah. Hapus pembayarannya bila ada kesalahan.', 'LOCKED');
    if (d.doc_type === 'invoice') {
      const invoice = await dbOne(ctx, 'SELECT id, payment_status FROM pd_invoices WHERE document_id = ? FOR UPDATE', [id]);
      if (invoice && invoice.payment_status === 'dibatalkan') throw pdConflict('Invoice yang dibatalkan tidak bisa diubah.', 'STATE');
      if (invoice && (await dbOne(ctx, 'SELECT id FROM pd_payments WHERE invoice_id = ? LIMIT 1', [Number(invoice.id)]))) {
        throw pdConflict('Invoice yang sudah ada pembayarannya tidak bisa diubah. Batalkan lalu terbitkan invoice baru.', 'LOCKED');
      }
    }
    const version = Number(d.version) + 1;
    await dbRun(ctx, `UPDATE pd_documents SET status = 'draft', version = ?, snapshot = NULL, content_hash = NULL, approved_at = NULL,
                      completed_at = NULL, revision_requested = 0, review_note = NULL, updated_by = ? WHERE id = ?`, [version, Number(user.id), id]);
    await pdAddRevision(ctx, id, version, d.content, `Perubahan: ${reason}`, user);
    await pdLog(ctx, Number(d.project_id), id, user, 'doc_change', `Perubahan ${pdDocLabel(d)}: ${reason}`);
    return pdState('draft', version);
  });
}

// The admin signs as Pihak Pertama (company); completes the document when every party signed the current version
export async function pdActDocumentSign(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');
  const errors = {};
  const name = pdText(input, 'signer_name', 'Nama penanda tangan', 255, true, errors);
  const title = pdText(input, 'signer_title', 'Jabatan penanda tangan', 255, false, errors);
  const signature = pdSignatureInput(own(input, 'signature'), errors);
  pdFail(errors);

  return pdWithStoredFile([signature[1], 'png'], (file) => pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    if (!PD_DOC_TYPES[d.doc_type].parties.includes('pihak_pertama')) throw pdConflict('Dokumen ini tidak memerlukan tanda tangan.', 'STATE');
    if (d.status !== 'menunggu_persetujuan' && d.status !== 'disetujui') {
      throw pdConflict('Dokumen hanya bisa ditandatangani setelah diajukan atau disetujui klien.', 'STATE');
    }
    if (await dbOne(ctx, "SELECT id FROM pd_signatures WHERE document_id = ? AND version = ? AND party = 'pihak_pertama'", [id, Number(d.version)])) {
      throw pdConflict('Pihak Pertama sudah menandatangani versi ini.', 'DUPLICATE');
    }
    await pdInsertSignature(ctx, d, 'pihak_pertama', user, signature[0], file, name, title);
    return pdState(await pdCompleteIfSigned(ctx, d, d.status, user), Number(d.version));
  }));
}

// disetujui → selesai by hand (brd, proposal, timeline)
export async function pdActDocumentComplete(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');

  return pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    if (!PD_COMPLETABLE_TYPES.includes(d.doc_type)) throw pdConflict('Hanya BRD, Proposal, dan Jadwal yang ditandai selesai secara manual.', 'STATE');
    if (d.status !== 'disetujui') throw pdConflict('Dokumen harus disetujui klien sebelum ditandai selesai.', 'STATE');
    await dbRun(ctx, "UPDATE pd_documents SET status = 'selesai', completed_at = NOW(), updated_by = ? WHERE id = ?", [Number(user.id), id]);
    await pdLog(ctx, Number(d.project_id), id, user, 'doc_completed', `${pdDocLabel(d)} ditandai selesai`);
    return pdState('selesai', Number(d.version));
  });
}

// Only a draft that was never submitted (no approvals, signatures or payments can exist yet)
export async function pdActDocumentDelete(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');

  await pdTx(ctx, async () => {
    const d = await pdDocForUpdate(ctx, id);
    if (d.status !== 'draft' || d.submitted_at !== null) throw pdConflict('Hanya draft yang belum pernah diajukan yang bisa dihapus.', 'LOCKED');
    if (d.doc_type === 'invoice') await dbRun(ctx, 'DELETE FROM pd_invoices WHERE document_id = ?', [id]);
    await dbRun(ctx, 'DELETE FROM pd_document_revisions WHERE document_id = ?', [id]);
    await dbRun(ctx, 'DELETE FROM pd_documents WHERE id = ?', [id]);
    await pdLog(ctx, Number(d.project_id), null, user, 'doc_deleted', `${pdDocLabel(d)} dihapus`);
  });
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// Customer actions (projects of the client records linked to the account)
// ════════════════════════════════════════════════════════════════════════════

export async function pdActMyProjects(ctx, input, user) {
  pdRequireCustomer(user);
  const today = pdToday();
  const bundles = await pdBundlesSynced(ctx, 'c.user_id = ?', [Number(user.id)], today);
  return { projects: [...bundles.values()].map((b) => pdProjectSummary(b, today)) };
}

export async function pdActMyProject(ctx, input, user) {
  pdRequireCustomer(user);
  const id = pdRequireId(input, 'id', 'ID proyek');
  const today = pdToday();
  const b = (await pdBundlesSynced(ctx, 'p.id = ? AND c.user_id = ?', [id, Number(user.id)], today)).get(id);
  if (!b) throw pdNotFound('Proyek');
  return { project: await pdProjectDetail(ctx, b, today, true) };
}

// A sent document of an own project (drafts are never visible to the client)
async function pdCustomerDoc(ctx, user, id, forUpdate = false) {
  const d = await pdDocRow(ctx, id, forUpdate);
  if (!d || d.status === 'draft' || !(await pdCustomerOwnsProject(ctx, user, Number(d.project_id)))) throw pdNotFound('Dokumen');
  return d;
}

export async function pdActMyDocument(ctx, input, user) {
  pdRequireCustomer(user);
  const d = await pdCustomerDoc(ctx, user, pdRequireId(input, 'id', 'ID dokumen'));
  return { document: await pdDocumentDetail(ctx, d, pdToday(), true) };
}

// Approve (and sign as Pihak Kedua when the type needs both parties) or reject the current version
export async function pdActMyDocumentDecide(ctx, input, user) {
  pdRequireCustomer(user);
  const id = pdRequireId(input, 'id', 'ID dokumen');
  const errors = {};
  const decision = pdEnum(input, 'decision', 'Keputusan', ['approved', 'rejected'], true, errors);
  const note = pdText(input, 'note', 'Catatan revisi', 2000, decision === 'rejected', errors);
  pdFail(errors);
  const current = await pdCustomerDoc(ctx, user, id);
  let signature = null;
  let name = null;
  let title = null;
  if (decision === 'approved' && PD_DOC_TYPES[current.doc_type].parties.includes('pihak_kedua')) {
    name = pdText(input, 'signer_name', 'Nama penanda tangan', 255, true, errors);
    title = pdText(input, 'signer_title', 'Jabatan penanda tangan', 255, false, errors);
    signature = pdSignatureInput(own(input, 'signature'), errors);
    pdFail(errors);
  }

  return pdWithStoredFile(signature ? [signature[1], 'png'] : null, (file) => pdTx(ctx, async () => {
    const d = await pdCustomerDoc(ctx, user, id, true);
    if (d.status !== 'menunggu_persetujuan') throw pdConflict('Dokumen ini tidak sedang menunggu persetujuan Anda.', 'STATE');
    const projectId = Number(d.project_id);
    const version = Number(d.version);
    const label = pdDocLabel(d);
    await dbRun(ctx, 'INSERT INTO pd_approvals (document_id, version, user_id, decision, note, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, version, Number(user.id), decision, note, pdClientIp(ctx.req), pdUserAgent(ctx.req)]);
    const project = await dbOne(ctx, 'SELECT name FROM project_client WHERE id = ?', [projectId]);
    const adminLink = pdDocLink('admin', projectId, id);
    if (decision === 'rejected') {
      await dbRun(ctx, `UPDATE pd_documents SET status = 'draft', revision_requested = 1, review_note = ?, snapshot = NULL, content_hash = NULL
                        WHERE id = ?`, [note, id]);
      await pdLog(ctx, projectId, id, user, 'doc_rejected', `${label} ditolak klien: ${note}`);
      await pdNotify(ctx, {
        role: 'admin', type: 'doc_rejected', project_id: projectId, link: adminLink,
        title: 'Klien meminta revisi dokumen', body: `${label} (${project.name}): ${note}`,
      });
      return pdState('draft', version);
    }
    await dbRun(ctx, "UPDATE pd_documents SET status = 'disetujui', approved_at = NOW() WHERE id = ?", [id]);
    await pdLog(ctx, projectId, id, user, 'doc_approved', `${label} disetujui klien`);
    let status = 'disetujui';
    if (signature) {
      await pdInsertSignature(ctx, d, 'pihak_kedua', user, signature[0], file, name, title);
      status = await pdCompleteIfSigned(ctx, d, status, user);
    }
    let next = 'sudah disetujui.';
    if (status === 'selesai') next = 'kini selesai.';
    else if (signature) next = 'menunggu tanda tangan Pihak Pertama.';
    await pdNotify(ctx, {
      role: 'admin', type: 'doc_approved', project_id: projectId, link: adminLink,
      title: signature ? 'Dokumen disetujui dan ditandatangani klien' : 'Dokumen disetujui klien',
      body: `${label} (${project.name}) ${next}`,
    });
    return pdState(status, version);
  }));
}
