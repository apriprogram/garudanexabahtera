// pd_* actions of the staff workspace (see ../project_docs.js): dashboard, clients, customer accounts, projects,
// milestones and the document settings. Port of workspace.php. Every handler: (ctx, input, user) → response data
// (without `success`).
import {
  PD_CLIENT_TYPES,
  PD_MAINTENANCE_PERIODS,
  PD_MILESTONE_STATUSES,
  PD_SETTING_KEYS,
  PD_STAGES,
  dbAll,
  dbOne,
  dbRun,
  pdAddDays,
  pdBad,
  pdBool,
  pdConflict,
  pdDate,
  pdEnum,
  pdFail,
  pdIdValue,
  pdInsert,
  pdIntIn,
  pdLike,
  pdLog,
  pdMoney,
  pdNewProjectCode,
  pdNotFound,
  pdRequireAdmin,
  pdRequireId,
  pdRequireStaff,
  pdSettings,
  pdText,
  pdToday,
  pdTx,
  pdValidSetting,
  pdValidTerms,
} from './core.js';
import { asciiLower, own, pdJson, phpIsEmail } from './php.js';
import {
  pdActivity,
  pdBundlesSynced,
  pdClientOut,
  pdDocSummary,
  pdInvoiceSummary,
  pdInvoiceUnpaid,
  pdProjectDetail,
  pdProjectSummary,
} from './records.js';

const byTuple = (pick) => (x, y) => {
  const [a, b] = [pick(x), pick(y)];
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};

// ════════════════════════════════════════════════════════════════════════════
// Dashboard
// ════════════════════════════════════════════════════════════════════════════

// Counts, pipeline and panels over every project that is not cancelled
export async function pdActDashboard(ctx, input, user) {
  pdRequireStaff(user);
  const today = pdToday();
  const soon = pdAddDays(today, 3);
  const stats = {
    projects_active: 0, docs_missing: 0, approvals_pending: 0, invoices_unpaid_count: 0,
    invoices_unpaid_amount: 0, invoices_overdue_count: 0, invoices_overdue_amount: 0,
  };
  const stages = Object.fromEntries(PD_STAGES.map((stage) => [stage, 0]));
  const projects = [];
  const pending = [];
  const due = [];
  for (const b of (await pdBundlesSynced(ctx, "p.status IS NULL OR p.status <> 'canceled'", [], today)).values()) {
    const summary = pdProjectSummary(b, today);
    projects.push(summary);
    stages[summary.stage]++;
    if (summary.stage !== 'selesai') stats.projects_active++;
    stats.docs_missing += summary.missing_docs.length;
    for (const d of b.docs.values()) {
      if (d.status === 'menunggu_persetujuan') pending.push(pdDocSummary(d, b.p, b.signed.get(Number(d.id)) ?? []));
    }
    for (const i of b.invoices) {
      if (!pdInvoiceUnpaid(i)) continue;
      const invoice = pdInvoiceSummary(i, b.p, today);
      stats.invoices_unpaid_count++;
      stats.invoices_unpaid_amount += invoice.remaining;
      if (invoice.overdue) {
        stats.invoices_overdue_count++;
        stats.invoices_overdue_amount += invoice.remaining;
      }
      if (i.due_date <= soon) due.push(invoice);
    }
  }
  stats.approvals_pending = pending.length;
  pending.sort(byTuple((d) => [d.submitted_at ?? '', d.id]));
  due.sort(byTuple((i) => [i.due_date, i.id]));
  return {
    stats, stages, projects, pending_approvals: pending,
    due_invoices: due.slice(0, 20), activity: await pdActivity(ctx, '', [], 20),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Clients and customer accounts
// ════════════════════════════════════════════════════════════════════════════

export async function pdActClientsList(ctx, input, user) {
  pdRequireStaff(user);
  const errors = {};
  const q = pdText(input, 'q', 'Pencarian', 100, false, errors);
  pdFail(errors);
  let sql = `SELECT c.*, u.email AS user_email, (SELECT COUNT(*) FROM project_client p WHERE p.client_id = c.id) AS project_count
             FROM pd_clients c LEFT JOIN users u ON u.id = c.user_id`;
  let params = [];
  if (q !== null) {
    sql += ' WHERE c.name LIKE ? OR c.pic_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.city LIKE ?';
    params = Array(5).fill(pdLike(q));
  }
  const clients = (await dbAll(ctx, `${sql} ORDER BY c.name, c.id`, params)).map((c) => ({
    ...pdClientOut(c), project_count: Number(c.project_count), user_email: c.user_email,
  }));
  return { clients };
}

// Create (no id) or update a client; user_id links a customer account (absent = unchanged, null = unlink)
export async function pdActClientSave(ctx, input, user) {
  pdRequireAdmin(user);
  const errors = {};
  let id = null;
  if (own(input, 'id') !== null) {
    id = pdIdValue(input.id);
    if (id === null) errors.id = 'ID klien tidak valid.';
  }
  const type = pdEnum(input, 'type', 'Jenis klien', PD_CLIENT_TYPES, true, errors);
  const name = pdText(input, 'name', 'Nama klien', 255, true, errors);
  const picName = pdText(input, 'pic_name', 'Nama PIC', 255, false, errors);
  const picTitle = pdText(input, 'pic_title', 'Jabatan PIC', 255, false, errors);
  const email = pdText(input, 'email', 'Email', 255, false, errors);
  if (email !== null && !phpIsEmail(email)) errors.email = 'Format email tidak valid, contoh: nama@email.com';
  const phone = pdText(input, 'phone', 'Telepon', 50, false, errors);
  if (phone !== null && !/^\+?[0-9 ().-]{6,50}$/.test(phone)) errors.phone = 'Nomor telepon tidak valid, contoh: 081234567890.';
  const address = pdText(input, 'address', 'Alamat', 2000, false, errors);
  const city = pdText(input, 'city', 'Kota', 120, false, errors);
  const npwp = pdText(input, 'npwp', 'NPWP', 32, false, errors);
  if (npwp !== null && !/^[0-9 .-]+$/.test(npwp)) errors.npwp = 'NPWP hanya angka, titik, dan tanda hubung.';
  const notes = pdText(input, 'notes', 'Catatan', 2000, false, errors);
  const linkGiven = Object.hasOwn(input, 'user_id');
  let userId = null;
  if (linkGiven && input.user_id !== null && input.user_id !== '') {
    userId = pdIdValue(input.user_id);
    if (userId === null || !(await dbOne(ctx, "SELECT id FROM users WHERE id = ? AND role = 'customer' LIMIT 1", [userId]))) {
      errors.user_id = 'Akun klien harus akun pelanggan (role customer) yang terdaftar.';
    }
  }
  pdFail(errors);

  const values = [type, name, picName, picTitle, email === null ? null : asciiLower(email), phone, address, city, npwp, notes];
  if (id === null) {
    id = await pdInsert(ctx, `INSERT INTO pd_clients (type, name, pic_name, pic_title, email, phone, address, city, npwp, notes, user_id)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...values, userId]);
    return { id };
  }
  if (!(await dbOne(ctx, 'SELECT id FROM pd_clients WHERE id = ?', [id]))) throw pdNotFound('Klien');
  await dbRun(ctx, `UPDATE pd_clients SET type = ?, name = ?, pic_name = ?, pic_title = ?, email = ?, phone = ?, address = ?, city = ?,
                    npwp = ?, notes = ?${linkGiven ? ', user_id = ?' : ''} WHERE id = ?`,
  [...values, ...(linkGiven ? [userId] : []), id]);
  return { id };
}

export async function pdActClientDelete(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID klien');
  if (!(await dbOne(ctx, 'SELECT id FROM pd_clients WHERE id = ?', [id]))) throw pdNotFound('Klien');
  const used = Number((await dbOne(ctx, 'SELECT COUNT(*) AS n FROM project_client WHERE client_id = ?', [id])).n);
  if (used > 0) throw pdConflict(`Klien masih dipakai oleh ${used} proyek. Lepaskan dari proyek dulu.`, 'STATE');
  await dbRun(ctx, 'DELETE FROM pd_clients WHERE id = ?', [id]);
  return {};
}

// Active customer accounts that a client record can be linked to
export async function pdActCustomersList(ctx, input, user) {
  pdRequireAdmin(user);
  const errors = {};
  const q = pdText(input, 'q', 'Pencarian', 100, false, errors);
  pdFail(errors);
  let sql = "SELECT id, name, email FROM users WHERE role = 'customer' AND status = 'active'";
  let params = [];
  if (q !== null) {
    sql += ' AND (name LIKE ? OR email LIKE ?)';
    params = [pdLike(q), pdLike(q)];
  }
  const customers = (await dbAll(ctx, `${sql} ORDER BY name, id LIMIT 50`, params)).map((u) => ({ id: Number(u.id), name: u.name, email: u.email }));
  return { customers };
}

// ════════════════════════════════════════════════════════════════════════════
// Projects
// ════════════════════════════════════════════════════════════════════════════

export async function pdActProjectsList(ctx, input, user) {
  pdRequireStaff(user);
  const errors = {};
  const stage = pdEnum(input, 'stage', 'Tahap', PD_STAGES, false, errors);
  const q = pdText(input, 'q', 'Pencarian', 100, false, errors);
  pdFail(errors);
  let where = '';
  let params = [];
  if (q !== null) {
    where = 'p.name LIKE ? OR p.code LIKE ? OR p.client_name LIKE ? OR c.name LIKE ?';
    params = Array(4).fill(pdLike(q));
  }
  const today = pdToday();
  const projects = [];
  for (const b of (await pdBundlesSynced(ctx, where, params, today)).values()) {
    const summary = pdProjectSummary(b, today);
    if (stage === null || summary.stage === stage) projects.push(summary);
  }
  return { projects };
}

export async function pdActProjectGet(ctx, input, user) {
  pdRequireStaff(user);
  const id = pdRequireId(input, 'id', 'ID proyek');
  const today = pdToday();
  const b = (await pdBundlesSynced(ctx, 'p.id = ?', [id], today)).get(id);
  if (!b) throw pdNotFound('Proyek');
  return { project: await pdProjectDetail(ctx, b, today, false) };
}

// Workspace setup of an existing project_client row; assigns the project code (PRJ-YYYY-NNN) when it has none
export async function pdActProjectSave(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID proyek');
  const errors = {};
  let clientId = null;
  if (own(input, 'client_id') !== null && input.client_id !== '') {
    clientId = pdIdValue(input.client_id);
    if (clientId === null || !(await dbOne(ctx, 'SELECT id FROM pd_clients WHERE id = ?', [clientId]))) errors.client_id = 'Klien tidak ditemukan.';
  }
  const scope = pdText(input, 'scope_summary', 'Ringkasan ruang lingkup', 10000, false, errors);
  const useMou = pdBool(own(input, 'use_mou') ?? false);
  const hasMaintenance = pdBool(own(input, 'has_maintenance') ?? false);
  const fee = pdMoney(input, 'maintenance_fee', 'Biaya maintenance', false, errors);
  const period = pdEnum(input, 'maintenance_period', 'Periode maintenance', PD_MAINTENANCE_PERIODS, false, errors);
  const start = pdDate(input, 'maintenance_start', 'Mulai maintenance', false, errors);
  const end = pdDate(input, 'maintenance_end', 'Akhir maintenance', false, errors);
  if (start !== null && end !== null && end < start) errors.maintenance_end = 'Akhir maintenance tidak boleh sebelum tanggal mulai.';
  const terms = pdValidTerms(own(input, 'payment_terms'), 'payment_terms', errors);
  const sets = [];
  const params = [];
  if (Object.hasOwn(input, 'price')) {
    sets.push('price = ?');
    params.push(pdMoney(input, 'price', 'Nilai kontrak', false, errors));
  }
  if (Object.hasOwn(input, 'stage_override')) {
    sets.push('stage_override = ?');
    params.push(pdEnum(input, 'stage_override', 'Tahap manual', PD_STAGES, false, errors));
  }
  pdFail(errors);

  await pdTx(ctx, async () => {
    const project = await dbOne(ctx, 'SELECT id, code FROM project_client WHERE id = ? FOR UPDATE', [id]);
    if (!project) throw pdNotFound('Proyek');
    if (project.code === null || project.code === '') {
      sets.push('code = ?');
      params.push(await pdNewProjectCode(ctx));
    }
    await dbRun(ctx, `UPDATE project_client SET client_id = ?, scope_summary = ?, use_mou = ?, has_maintenance = ?, maintenance_fee = ?,
                      maintenance_period = ?, maintenance_start = ?, maintenance_end = ?, payment_terms = ?${sets.length ? `, ${sets.join(', ')}` : ''} WHERE id = ?`,
    [clientId, scope, useMou ? 1 : 0, hasMaintenance ? 1 : 0, fee, period, start, end, pdJson(terms), ...params, id]);
    await pdLog(ctx, id, null, user, 'project_saved', 'Data proyek dan pengaturan dokumen diperbarui');
  });
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// Milestones
// ════════════════════════════════════════════════════════════════════════════

export async function pdActMilestoneSave(ctx, input, user) {
  pdRequireStaff(user);
  const errors = {};
  const projectId = pdIdValue(own(input, 'project_id'));
  if (projectId === null) errors.project_id = 'ID proyek tidak valid.';
  let id = null;
  if (own(input, 'id') !== null) {
    id = pdIdValue(input.id);
    if (id === null) errors.id = 'ID milestone tidak valid.';
  }
  const title = pdText(input, 'title', 'Nama tahapan', 255, true, errors);
  const description = pdText(input, 'description', 'Deskripsi', 2000, false, errors);
  const start = pdDate(input, 'start_date', 'Tanggal mulai', false, errors);
  const due = pdDate(input, 'due_date', 'Tanggal selesai', false, errors);
  if (start !== null && due !== null && due < start) errors.due_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  const weight = pdIntIn(input, 'weight', 'Bobot', 0, 1000, true, errors);
  const progress = pdIntIn(input, 'progress', 'Progres', 0, 100, true, errors);
  const status = pdEnum(input, 'status', 'Status', PD_MILESTONE_STATUSES, true, errors);
  const sortGiven = own(input, 'sort_order') !== null;
  let sort = pdIntIn(input, 'sort_order', 'Urutan', -1000000, 1000000, false, errors);
  pdFail(errors);

  return pdTx(ctx, async () => {
    if (!(await dbOne(ctx, 'SELECT id FROM project_client WHERE id = ? FOR UPDATE', [projectId]))) throw pdNotFound('Proyek');
    const values = [title, description, start, due, weight, progress, status];
    if (id === null) {
      if (!sortGiven) sort = Number((await dbOne(ctx, 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM pd_milestones WHERE project_id = ?', [projectId])).n);
      id = await pdInsert(ctx, `INSERT INTO pd_milestones (project_id, title, description, start_date, due_date, weight, progress, status, sort_order, completed_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${status === 'selesai' ? 'NOW()' : 'NULL'})`, [projectId, ...values, sort]);
    } else {
      if (!(await dbOne(ctx, 'SELECT id FROM pd_milestones WHERE id = ? AND project_id = ?', [id, projectId]))) throw pdNotFound('Milestone');
      await dbRun(ctx, `UPDATE pd_milestones SET title = ?, description = ?, start_date = ?, due_date = ?, weight = ?, progress = ?, status = ?,
                        completed_at = ${status === 'selesai' ? 'COALESCE(completed_at, NOW())' : 'NULL'}${sortGiven ? ', sort_order = ?' : ''} WHERE id = ?`,
      [...values, ...(sortGiven ? [sort] : []), id]);
    }
    await pdLog(ctx, projectId, null, user, 'milestone_saved', `Milestone "${title}" disimpan (${progress}%)`);
    return { id };
  });
}

export async function pdActMilestoneDelete(ctx, input, user) {
  pdRequireAdmin(user);
  const id = pdRequireId(input, 'id', 'ID milestone');
  const milestone = await dbOne(ctx, 'SELECT id, project_id, title FROM pd_milestones WHERE id = ?', [id]);
  if (!milestone) throw pdNotFound('Milestone');
  await pdTx(ctx, async () => {
    await dbRun(ctx, 'DELETE FROM pd_milestones WHERE id = ?', [id]);
    await pdLog(ctx, Number(milestone.project_id), null, user, 'milestone_deleted', `Milestone "${milestone.title}" dihapus`);
  });
  return {};
}

// ════════════════════════════════════════════════════════════════════════════
// Settings
// ════════════════════════════════════════════════════════════════════════════

export async function pdActSettingsGet(ctx, input, user) {
  pdRequireStaff(user);
  return pdSettings(ctx, true);
}

// Saves the settings objects that were sent; each one is validated as a whole
export async function pdActSettingsSave(ctx, input, user) {
  pdRequireAdmin(user);
  const errors = {};
  const values = [];
  for (const [name, key] of Object.entries(PD_SETTING_KEYS)) {
    if (!Object.hasOwn(input, name)) continue;
    const value = pdValidSetting(name, input[name], errors);
    if (value !== null) values.push([key, value]);
  }
  pdFail(errors);
  if (!values.length) throw pdBad('settings', 'Tidak ada pengaturan yang dikirim.');
  await pdTx(ctx, async () => {
    for (const [key, value] of values) {
      await dbRun(ctx, `INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`, [key, pdJson(value)]);
    }
  });
  await pdSettings(ctx, true);
  return {};
}
