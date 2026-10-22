// pd_* actions for every logged-in role (see ../project_docs.js): in-app notifications (with the lazily created
// due-soon / overdue invoice notices) and pd_file, the download of private signature images and payment proofs.
// Port of notifications.php.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  dbAll,
  dbOne,
  dbRun,
  pdAddDays,
  pdBad,
  pdBool,
  pdDocLink,
  pdNotFound,
  pdNotify,
  pdNum,
  pdRequireId,
  pdRequireUser,
  pdRupiah,
  pdTanggalPanjang,
  pdToday,
  pdTx,
} from './core.js';
import { PD_FILE_TYPES, pdStoredPath } from './files.js';
import { own } from './php.js';
import { pdCustomerOwnsProject } from './records.js';

// Notices for issued, unpaid invoices due within 3 days (invoice_due) or already overdue (invoice_overdue): one per
// invoice per day for the client account and one for the admins; dedupe_key keeps them unique under parallel calls.
async function pdDueNotices(ctx, today) {
  const rows = await dbAll(ctx, `SELECT i.id, i.project_id, i.document_id, i.due_date, i.amount_due, i.amount_paid, d.number, p.name AS project_name,
                                        c.user_id AS client_user_id
                                 FROM pd_invoices i JOIN pd_documents d ON d.id = i.document_id JOIN project_client p ON p.id = i.project_id
                                 LEFT JOIN pd_clients c ON c.id = p.client_id
                                 WHERE d.status <> 'draft' AND i.payment_status IN ('belum_dibayar', 'sebagian') AND i.due_date <= ?`,
  [pdAddDays(today, 3)]);
  for (const r of rows) {
    const overdue = r.due_date < today;
    const type = overdue ? 'invoice_overdue' : 'invoice_due';
    const projectId = Number(r.project_id);
    const notice = {
      type, project_id: projectId,
      title: overdue ? 'Invoice lewat jatuh tempo' : 'Invoice segera jatuh tempo',
      body: `Invoice ${r.number} (${r.project_name}) sisa ${pdRupiah(Math.max(0, pdNum(r.amount_due) - pdNum(r.amount_paid)))}`
        + `, jatuh tempo ${pdTanggalPanjang(r.due_date)}.`,
    };
    const key = `${type}:${r.id}:${today}`;
    await pdNotify(ctx, { ...notice, role: 'admin', link: pdDocLink('admin', projectId, Number(r.document_id)), dedupe_key: `${key}:admin` });
    if (r.client_user_id !== null) {
      const clientUser = Number(r.client_user_id);
      await pdNotify(ctx, {
        ...notice, user_id: clientUser, link: pdDocLink('customer', projectId, Number(r.document_id)), dedupe_key: `${key}:u${clientUser}`,
      });
    }
  }
}

// Notifications addressed to the user or broadcast to the user's role
const pdNotificationScope = (user) => ['(n.user_id = ? OR (n.user_id IS NULL AND n.role = ?))', [Number(user.id), user.role]];

// Read state: personal ones in pd_notifications.read_at, role broadcasts per user in pd_notification_reads
const READ_AT = '(CASE WHEN n.user_id IS NULL THEN r.read_at ELSE n.read_at END)';

export async function pdActNotificationsList(ctx, input, user) {
  pdRequireUser(user);
  await pdDueNotices(ctx, pdToday());
  const [scope, scopeParams] = pdNotificationScope(user);
  const from = `FROM pd_notifications n LEFT JOIN pd_notification_reads r ON r.notification_id = n.id AND r.user_id = ? WHERE ${scope}`;
  const params = [Number(user.id), ...scopeParams];
  const unreadOnly = pdBool(own(input, 'unread_only') ?? false);
  const rows = await dbAll(ctx, `SELECT n.id, n.type, n.title, n.body, n.link, n.project_id, n.created_at, ${READ_AT} AS read_at
                                 ${from}${unreadOnly ? ` AND ${READ_AT} IS NULL` : ''} ORDER BY n.id DESC LIMIT 50`, params);
  const unread = Number((await dbOne(ctx, `SELECT COUNT(*) AS n ${from} AND ${READ_AT} IS NULL`, params)).n);
  const notifications = rows.map((n) => ({
    id: Number(n.id), type: n.type, title: n.title, body: n.body, link: n.link,
    project_id: n.project_id === null ? null : Number(n.project_id), read: n.read_at !== null, created_at: n.created_at,
  }));
  return { notifications, unread };
}

// Marks one notification (id) or every unread one (all: true) as read
export async function pdActNotificationsRead(ctx, input, user) {
  pdRequireUser(user);
  const uid = Number(user.id);
  const [scope, params] = pdNotificationScope(user);
  let where = scope;
  if (!pdBool(own(input, 'all') ?? false)) {
    const id = pdRequireId(input, 'id', 'ID notifikasi');
    where = `${scope} AND n.id = ?`;
    params.push(id);
    if (!(await dbOne(ctx, `SELECT n.id FROM pd_notifications n WHERE ${where}`, params))) throw pdNotFound('Notifikasi');
  }
  await pdTx(ctx, async () => {
    await dbRun(ctx, `UPDATE pd_notifications n SET n.read_at = NOW() WHERE ${where} AND n.user_id IS NOT NULL AND n.read_at IS NULL`, params);
    await dbRun(ctx, `INSERT IGNORE INTO pd_notification_reads (notification_id, user_id, read_at)
                      SELECT n.id, ?, NOW() FROM pd_notifications n WHERE ${where} AND n.user_id IS NULL`, [uid, ...params]);
  });
  return {};
}

// Private file by reference `sig:<id>` / `proof:<id>` (a `pdfile:` prefix is accepted). Staff may read any file,
// a customer only the files of an own project. Streams the file and returns null (no JSON body).
export async function pdActFile(ctx, input, user) {
  pdRequireUser(user);
  let ref = typeof own(input, 'ref') === 'string' ? input.ref : '';
  if (ref.startsWith('pdfile:')) ref = ref.slice('pdfile:'.length);
  const m = /^(sig|proof):([1-9][0-9]{0,9})\n?$/.exec(ref);
  if (!m) throw pdBad('ref', 'Referensi file tidak valid.');
  const isSignature = m[1] === 'sig';
  const id = Number(m[2]);
  const row = isSignature
    ? await dbOne(ctx, 'SELECT s.image_file AS file, d.project_id FROM pd_signatures s JOIN pd_documents d ON d.id = s.document_id WHERE s.id = ?', [id])
    : await dbOne(ctx, 'SELECT pay.proof_file AS file, i.project_id FROM pd_payments pay JOIN pd_invoices i ON i.id = pay.invoice_id WHERE pay.id = ?', [id]);
  const allowed = row !== null && (user.role !== 'customer' || (await pdCustomerOwnsProject(ctx, user, Number(row.project_id))));
  const path = allowed ? await pdStoredPath(row.file) : null;
  if (path === null) throw pdNotFound('File');

  const ext = extname(path).slice(1).toLowerCase();
  const { size } = await stat(path);
  ctx.res.status(200).set({
    'Content-Type': PD_FILE_TYPES[ext],
    'Content-Length': String(size),
    'Content-Disposition': `attachment; filename="${isSignature ? 'tanda-tangan-' : 'bukti-pembayaran-'}${id}.${ext}"`,
    'Cache-Control': 'private, no-store',
    // Opened directly, the file must not run script on this origin
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  await pipeline(createReadStream(path), ctx.res);
  return null;
}
