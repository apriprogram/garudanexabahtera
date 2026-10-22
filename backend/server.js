// Imported first: also loads .env for local runs before other modules read process.env
import {
  actionOf,
  createAuthActions,
  createAuthGate,
  corsOptions,
  securityHeaders,
  maskServerErrors,
  errorHandler,
} from './security.js';
import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import cors from 'cors';
// File I/O — used only for legacy compatibility, all uploads go to S3 now
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import OpenAI from 'openai';
import {
  uploadBase64ToS3,
  deleteFromS3,
  pathToKey,
  S3_PUBLIC_URL,
} from './s3-client.js';
// Template marketplace, customer accounts, Midtrans and custom orders (docs/platform/SPEC.md §6)
import { handlePlatformAction } from './modules/templates.js';
// Company products (list_products); the users column (product login accounts) is encrypted at rest
import { handleListProductAction } from './modules/list_products.js';
// Client project files (dokumen-client/dokumen): staff-only download, the folder itself is closed to the web
import { handleProjectFileAction } from './modules/project_files.js';
// Home page hero background: raw video upload (upload_hero_video), its limits (get_hero_media_limits) and the
// hero_bg_* / hero_images settings
import { handleHeroMediaAction, prepareHeroMediaSettings } from './modules/hero_media.js';
// Project documents & agreements, pd_* actions (docs/platform/PROJECT-DOCS-SPEC.md)
import { handleProjectDocsAction } from './modules/project_docs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
// PORT is for local runs and tests; Docker exposes 4000
const PORT = Number(process.env.PORT) || 4000;

// ── AI Setup ── (OpenAI-compatible API; Ollama on the docker host by default)
const AI_MODEL = process.env.AI_MODEL || 'qwen2.5:3b';
const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY || 'ollama', // Not needed for Ollama
  baseURL: process.env.AI_BASE_URL || 'http://172.24.0.1:11434/v1',
});

// ── MySQL Connection Pool ──
// MYSQL_PASS has no fallback on purpose: it must come from the environment (.env via docker-compose)
if (process.env.MYSQL_PASS === undefined) {
  console.error('MYSQL_PASS is not set — set MYSQL_ROOT_PASSWORD in .env (see .env.example)');
  process.exit(1);
}
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB || 'db_garudanexabahtera',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Middleware ──
// Behind nginx: req.ip comes from X-Forwarded-For set by the proxy (TRUST_PROXY = number of proxy hops)
app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY || 1);
app.disable('x-powered-by');
app.use(cors(corsOptions()));
app.use(securityHeaders);
// verify keeps the raw bytes: platform actions decode them the way PHP reads php://input (modules/templates.js)
app.use(express.json({ limit: process.env.API_BODY_LIMIT || '64mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(maskServerErrors);
// Login/register, then token + role check for every non-public action (see security.js)
app.use('/api.php', createAuthActions(pool));
app.use(['/api.php', '/api'], createAuthGate(pool));

// ── Helpers ──
const ASSETS_DIR = '/var/www/html/assets';

function saveBase64Image(base64Data, section) {
  return uploadBase64ToS3(base64Data, section);
}

function saveBase64File(base64Data, section, originalName) {
  return uploadBase64ToS3(base64Data, section, `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${originalName}`);
}

// 0/1 flag from JSON input, like in_flag() in api.php: true, 1, '1' and 'true' mean 1
const inFlag = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

// Text column value from JSON input, like in_str() in api.php
const textOf = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? '1' : '0') : String(v));

// Navbar menu rows; inactive ones only when asked (admin Navbar Manager)
async function getNavbarMenus(includeInactive) {
  const all = Boolean(includeInactive) && includeInactive !== '0' && includeInactive !== 'false';
  const [rows] = await pool.query(
    `SELECT * FROM navbar_menus ${all ? '' : 'WHERE is_active = 1'} ORDER BY sort_order ASC, id ASC`
  );
  return rows;
}

// Counts a visit and logs device/browser/OS for the dashboard charts (GET and POST track_visit)
async function trackVisit(req, input) {
  await pool.query('UPDATE visitor_stats SET total_visits = total_visits + 1 WHERE id = 1');

  const ua = input.user_agent || req.headers['user-agent'] || '';
  let device = 'Desktop', browser = 'Unknown', os = 'Unknown';

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) device = 'Mobile';
  if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/MSIE|Trident/i.test(ua)) browser = 'Internet Explorer';

  if (/Windows/i.test(ua) || /Win64/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // req.ip honours the 'trust proxy' setting, so a client can't spoof it via X-Forwarded-For
  const ip = req.ip || req.socket?.remoteAddress || '';

  // Basic country from IP (using a simple offline lookup or default)
  let country = 'Unknown';

  await pool.query(
    `INSERT INTO visitor_logs (ip_address, user_agent, device, browser, os, country, visited_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [ip, ua, device, browser, os, country]
  );
}

// A project with project documents (signed contracts, invoices, receipts, pd_*) is an archive: deleting it would
// orphan them for the client and the admin alike (same rule and message as delete_project in api.php)
async function deleteProject(id, res) {
  const [docs] = await pool.query('SELECT id FROM pd_documents WHERE project_id = ? LIMIT 1', [id]);
  if (docs.length) {
    res.status(409).json({
      error: 'Proyek ini sudah punya dokumen proyek (BRD, kontrak, invoice, atau kuitansi), jadi tidak bisa dihapus agar arsipnya tetap utuh.',
      code: 'STATE',
    });
    return;
  }
  await pool.query('DELETE FROM project_client WHERE id = ?', [id]);
  res.json({ success: true });
}

// ── GET /api.php?action=get_settings ──
app.get('/api.php', async (req, res) => {
  const action = req.query.action;

  // Template marketplace / customer / custom-order actions (backend/modules/templates.js)
  if (await handlePlatformAction(action, req.query, req, res, pool)) return;
  if (await handleListProductAction(action, req.query, req, res, pool)) return;
  if (await handleProjectFileAction(action, req.query, req, res)) return;
  // get_hero_media_limits; a GET upload_hero_video is not handled there and falls through to "Invalid action"
  if (await handleHeroMediaAction(actionOf(req), req, res, pool)) return;
  if (await handleProjectDocsAction(action, req.query, req, res, pool)) return;

  // Actions via GET
  if (action === 'get_settings') {
    try {
      // Public: pd_* keys (company identity, tax, payment terms of the project documents) are read through
      // pd_settings_get only; the comparison follows the column's case-insensitive collation
      const [rows] = await pool.query("SELECT setting_key, setting_value FROM hero_settings WHERE LEFT(setting_key, 3) <> 'pd_'");
      const settings = {};
      for (const row of rows) {
        settings[row.setting_key] = row.setting_value;
      }
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_users') {
    try {
      const [rows] = await pool.query('SELECT id, name, email, phone, role, status, avatar FROM users ORDER BY id DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_visitor_details') {
    try {
      const [[statsRow]] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
      const totalCount = statsRow ? statsRow.total_visits : 0;

      // Devices
      const [deviceRows] = await pool.query('SELECT device as label, COUNT(*) as value FROM visitor_logs GROUP BY device ORDER BY value DESC');
      let devices = deviceRows.map(r => ({ label: r.label || 'Unknown', value: Number(r.value) }));
      if (devices.length === 0) {
        devices = [
          { label: "Desktop", value: Math.floor(totalCount * 0.55) },
          { label: "Mobile", value: Math.floor(totalCount * 0.40) },
          { label: "Tablet", value: Math.floor(totalCount * 0.05) }
        ];
      }

      // Browsers
      const [browserRows] = await pool.query('SELECT browser as label, COUNT(*) as value FROM visitor_logs GROUP BY browser ORDER BY value DESC');
      let browsers = browserRows.map(r => ({ label: r.label || 'Unknown', value: Number(r.value) }));
      if (browsers.length === 0) {
        browsers = [
          { label: "Chrome", value: Math.floor(totalCount * 0.62) },
          { label: "Firefox", value: Math.floor(totalCount * 0.18) },
          { label: "Safari", value: Math.floor(totalCount * 0.15) },
          { label: "Edge", value: Math.max(1, Math.floor(totalCount * 0.05)) }
        ];
      }

      // OS
      const [osRows] = await pool.query('SELECT os as label, COUNT(*) as value FROM visitor_logs GROUP BY os ORDER BY value DESC');
      let os = osRows.map(r => ({ label: r.label || 'Unknown', value: Number(r.value) }));
      if (os.length === 0) {
        os = [
          { label: "Windows", value: Math.floor(totalCount * 0.50) },
          { label: "macOS", value: Math.floor(totalCount * 0.25) },
          { label: "Android", value: Math.floor(totalCount * 0.15) },
          { label: "iOS", value: Math.floor(totalCount * 0.10) }
        ];
      }

      // Countries
      const [countryRows] = await pool.query('SELECT country as label, COUNT(*) as value FROM visitor_logs GROUP BY country ORDER BY value DESC');
      let countries = countryRows.map(r => ({ label: r.label || 'Unknown', value: Number(r.value) }));
      if (countries.length === 0) {
        countries = [
          { label: "Indonesia", value: Math.floor(totalCount * 0.70) },
          { label: "United States", value: Math.floor(totalCount * 0.10) },
          { label: "Singapore", value: Math.floor(totalCount * 0.08) },
          { label: "Malaysia", value: Math.floor(totalCount * 0.05) }
        ];
      }

      // Daily stats
      await pool.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
      const [dailyRows] = await pool.query(`
        SELECT DATE(visited_at) as date, COUNT(*) as count 
        FROM visitor_logs 
        WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
        GROUP BY DATE(visited_at) 
        ORDER BY date ASC
      `);
      
      // Today visits
      const [[todayRow]] = await pool.query('SELECT COUNT(*) as count FROM visitor_logs WHERE DATE(visited_at) = CURDATE()');
      const todayCount = todayRow ? Number(todayRow.count) : 0;

      res.json({
        total: totalCount,
        today: todayCount > 0 ? todayCount : Math.max(1, Math.floor(totalCount * 0.05)),
        daily: dailyRows.map(r => ({ date: r.date, count: Number(r.count) })),
        devices,
        browsers,
        os,
        countries
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_projects') {
    try {
      const [rows] = await pool.query('SELECT * FROM project_client ORDER BY id DESC');
      // show_on_website (0/1) and source ('admin' | 'website' = public custom-order form) as in SPEC §6
      res.json(rows.map((row) => ({ ...row, show_on_website: Number(row.show_on_website ?? 0), source: row.source ?? 'admin' })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_visitor_stats') {
    try {
      const [rows] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
      res.json({ total_visits: rows.length ? rows[0].total_visits : 0 });
    } catch (err) {
      res.json({ total_visits: 0 });
    }
    return;
  }

  if (action === 'get_visitor_details') {
    try {
      const [totalRow] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
      const totalVisits = totalRow.length ? totalRow[0].total_visits : 0;
      
      const [todayRow] = await pool.query('SELECT COUNT(*) as today FROM visitor_logs WHERE DATE(visited_at) = CURDATE()');
      const todayVisits = todayRow[0].today;

      const [dailyRows] = await pool.query(`
        SELECT DATE_FORMAT(visited_at, '%Y-%m-%d') as date, COUNT(*) as count 
        FROM visitor_logs 
        WHERE visited_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
        GROUP BY DATE(visited_at) 
        ORDER BY date ASC
      `);

      const [deviceRows] = await pool.query('SELECT device as label, COUNT(*) as value FROM visitor_logs GROUP BY device');
      const [browserRows] = await pool.query('SELECT browser as label, COUNT(*) as value FROM visitor_logs GROUP BY browser');
      const [osRows] = await pool.query('SELECT os as label, COUNT(*) as value FROM visitor_logs GROUP BY os');
      const [countryRows] = await pool.query('SELECT country as label, COUNT(*) as value FROM visitor_logs GROUP BY country');

      res.json({
        total: totalVisits,
        today: todayVisits,
        daily: dailyRows,
        devices: deviceRows,
        browsers: browserRows,
        os: osRows,
        countries: countryRows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // The public site calls track_visit with GET (App.tsx), the dashboard resets with GET
  if (action === 'track_visit') {
    try {
      await trackVisit(req, req.query);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'reset_visitor_stats') {
    try {
      await pool.query('UPDATE visitor_stats SET total_visits = 0');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
    return;
  }

  if (action === 'delete_user') {
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'delete_project') {
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
      await deleteProject(id, res);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Public navbar reads with GET; the admin Navbar Manager uses POST (see the POST switch)
  if (action === 'get_navbar_menus') {
    try {
      res.json(await getNavbarMenus(req.query.include_inactive));
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }

  res.status(400).json({ error: 'Invalid action: ' + action });
});

// ── POST /api.php ──
app.post('/api.php', async (req, res) => {
  // upload_hero_video posts the raw file (video/mp4|webm, not JSON), so express.json left the stream unread; also
  // get_hero_media_limits. Same action lookup as the auth gate (actionOf), so the action checked there is the one
  // handled here.
  if (await handleHeroMediaAction(actionOf(req), req, res, pool)) return;
  console.log('POST /api.php action:', req.body && req.body.action);
  let { action, settings: inputSettings, ...input } = req.body;
  if (!action && req.query && req.query.action) {
    action = req.query.action;
  }
  // Template marketplace / customer / custom-order actions (backend/modules/templates.js).
  // midtrans_notification arrives here too: Midtrans posts its JSON to /api.php?action=midtrans_notification
  if (await handlePlatformAction(action, req.body, req, res, pool)) return;
  if (await handleListProductAction(action, req.body, req, res, pool)) return;
  if (await handleProjectFileAction(action, req.body, req, res)) return;
  if (await handleProjectDocsAction(action, req.body, req, res, pool)) return;
  const conn = await pool.getConnection();

  try {
    switch (action) {

      // 'login' and 'register' are handled by createAuthActions in security.js (token + rate limit)

      case 'add_user': {
        const hash = bcrypt.hashSync(input.password, 10);
        const [result] = await pool.query(
          'INSERT INTO users (name, email, password, phone, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [input.name, input.email, hash, input.phone || '', input.role || 'user', input.status || 'active', input.avatar || '']
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'update_user': {
        const id = parseInt(input.id, 10);
        let sql = 'UPDATE users SET name=?, email=?, phone=?, role=?, status=?, avatar=? WHERE id=?';
        const params = [input.name, input.email, input.phone, input.role, input.status, input.avatar || '', id];
        if (input.password) {
          sql = 'UPDATE users SET name=?, email=?, password=?, phone=?, role=?, status=?, avatar=? WHERE id=?';
          params.splice(2, 0, bcrypt.hashSync(input.password, 10));
        }
        await pool.query(sql, params);
        res.json({ success: true, message: 'User updated successfully' });
        return;
      }

      case 'update_settings': {
        const settings = inputSettings !== null && typeof inputSettings === 'object' ? inputSettings : {};
        // pd_* settings are admin-only and validated per field: pd_settings_save (backend/modules/project_docs.js)
        if (Object.keys(settings).some((key) => key.toLowerCase().startsWith('pd_'))) {
          res.status(403).json({ error: 'Pengaturan dokumen proyek hanya bisa diubah lewat Pengaturan dokumen.', code: 'FORBIDDEN' });
          return;
        }
        // ASCII names only, like api.php: setting_key compares with utf8mb4_unicode_ci, where "ｐd_company" or a
        // zero-width character + "pd_company" equal "pd_company", so ON DUPLICATE KEY UPDATE would overwrite it
        const badKey = Object.keys(settings).find((key) => !/^[A-Za-z0-9_]{1,100}\n?$/.test(key));
        if (badKey !== undefined) {
          res.status(400).json({ error: `Nama setting tidak valid: ${badKey}` });
          return;
        }
        const errors = [];
        // ── hero_bg_mode, hero_text_tone, hero_overlay, hero_bg_video, hero_bg_video_poster, hero_images ──
        // (modules/hero_media.js)
        // First, so a refused hero value (stale tab, data: video, SVG poster) stops the save before any upload;
        // hero_media_base is the hero video/poster the admin page loaded (compare-and-swap, never stored as a setting)
        const finishHeroMedia = await prepareHeroMediaSettings(settings, pool, input.hero_media_base);
        let allSuccess = true;
        let lastError = null;
        try {
          // ── products_data ──
          if (settings.products_data) {
            const newItems = JSON.parse(settings.products_data);
            const [existingRows] = await pool.query("SELECT setting_value FROM hero_settings WHERE setting_key = 'products_data'");
            const existingById = {};
            if (existingRows.length > 0) {
              const existingParsed = JSON.parse(existingRows[0].setting_value);
              if (Array.isArray(existingParsed)) {
                for (const ep of existingParsed) {
                  if (ep.id) existingById[ep.id] = ep;
                }
              }
            }
            for (const item of newItems) {
              if (!item.image && existingById[item.id]?.image) item.image = existingById[item.id].image;
              if (!item.logo && existingById[item.id]?.logo) item.logo = existingById[item.id].logo;
            }
            settings.products_data = JSON.stringify(newItems);
          }

          // ── portfolio_data ──
          if (settings.portfolio_data) {
            const newItems = JSON.parse(settings.portfolio_data);
            const [existingRows] = await pool.query("SELECT setting_value FROM hero_settings WHERE setting_key = 'portfolio_data'");
            const existingArr = existingRows.length > 0 ? JSON.parse(existingRows[0].setting_value || '[]') : [];
            for (let i = 0; i < newItems.length; i++) {
              if (!newItems[i].image && existingArr[i]?.image) newItems[i].image = existingArr[i].image;
            }
            settings.portfolio_data = JSON.stringify(newItems);
          }

          // ── services_data ──
          if (settings.services_data) {
            const items = JSON.parse(settings.services_data);
            for (const item of items) {
              // Upload returns a promise; without await the stored value was "{}"
              if (item.image) item.image = await saveBase64Image(item.image, 'services');
              if (item.icon) item.icon = await saveBase64Image(item.icon, 'services');
            }
            settings.services_data = JSON.stringify(items);
          }

          // ── hero_logos ──
          if (settings.hero_logos) {
            const logos = JSON.parse(settings.hero_logos);
            if (Array.isArray(logos)) {
              const finalLogos = [];
              for (let i = 0; i < logos.length; i++) {
                const logo = logos[i];
                if (logo.src?.includes('data:image')) {
                  const url = await uploadBase64ToS3(logo.src, 'logo-product', `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}.png`);
                  finalLogos.push({ name: logo.name, src: url });
                } else {
                  finalLogos.push(logo);
                }
              }
              settings.hero_logos = JSON.stringify(finalLogos);
            }
          }

          // ── Save all settings to DB ──
          for (const [key, value] of Object.entries(settings)) {
            try {
              await pool.query(
                'INSERT INTO hero_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
                [key, value]
              );
            } catch (err) {
              allSuccess = false;
              lastError = err.message;
              break;
            }
          }
        } catch (err) {
          // Removes the hero files this request stored that no saved setting points to
          await finishHeroMedia(false);
          throw err;
        }
        res.json({ success: allSuccess, error: lastError });
        // Saved: garbage-collect sweep of unused hero videos/posters; not saved: as in the catch above. After the
        // reply, which it never changes
        await finishHeroMedia(allSuccess);
        return;
      }

      case 'add_project': {
        let imagePath = '';
        if (input.image?.includes('data:image')) {
          imagePath = await uploadBase64ToS3(input.image, 'dokumen-client/logo', `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`);
        } else {
          imagePath = input.image || '';
        }

        let finalFiles = [];
        if (input.project_files) {
          const filesArray = typeof input.project_files === 'string' ? JSON.parse(input.project_files) : input.project_files;
          if (Array.isArray(filesArray)) {
            for (const f of filesArray) {
              if (f.data?.includes('data:')) {
                const url = await uploadBase64ToS3(f.data, 'dokumen-client/dokumen', `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`);
                finalFiles.push({ name: f.name, type: f.type, size: f.size, path: url });
              } else {
                finalFiles.push(f);
              }
            }
          }
        }
        const projectFilesJson = JSON.stringify(finalFiles);

        const startDateSql = input.start_date || null;
        const endDateSql = input.end_date || null;

        // show_on_website: shown in the public Projects section; source is always 'admin' here
        // ('website' = created by the public custom-order form, submit_custom_order)
        const [result] = await pool.query(
          `INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, assigned_user, price, start_date, end_date, image, project_files, description, show_on_website, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')`,
          [input.name, input.client_name, input.client_email || '', input.client_phone || '', input.service_type, input.status,
           input.assigned_user || '', input.price || 0, startDateSql, endDateSql, imagePath, projectFilesJson, input.description || '',
           inFlag(input.show_on_website)]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'update_project': {
        // Only the fields that were sent change (same as api.php), so a quick toggle ({id, show_on_website})
        // keeps the rest. Column names come from these fixed lists, values are bound. `source` never changes here.
        const id = parseInt(input.id, 10);
        const has = (f) => Object.prototype.hasOwnProperty.call(input, f);
        const sets = [];
        const params = [];
        for (const f of ['name', 'client_name', 'client_email', 'client_phone', 'service_type', 'status', 'assigned_user', 'description']) {
          if (has(f)) { sets.push(`${f}=?`); params.push(textOf(input[f])); }
        }
        if (has('price')) { sets.push('price=?'); params.push(Number(input.price) || 0); }
        for (const f of ['start_date', 'end_date']) {
          if (has(f)) { sets.push(`${f}=?`); params.push(textOf(input[f]) !== '' ? textOf(input[f]) : null); }
        }
        if (has('image')) {
          let imagePath = '';
          if (input.image?.includes?.('data:image')) {
            imagePath = await uploadBase64ToS3(input.image, 'dokumen-client/logo', `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`);
          } else {
            imagePath = input.image || '';
          }
          sets.push('image=?');
          params.push(imagePath);
        }
        if (has('project_files')) {
          const finalFiles = [];
          const filesArray = typeof input.project_files === 'string' ? JSON.parse(input.project_files) : input.project_files;
          if (Array.isArray(filesArray)) {
            for (const f of filesArray) {
              if (f.data?.includes('data:')) {
                const url = await uploadBase64ToS3(f.data, 'dokumen-client/dokumen', `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`);
                finalFiles.push({ name: f.name, type: f.type, size: f.size, path: url });
              } else {
                finalFiles.push(f);
              }
            }
          }
          sets.push('project_files=?');
          params.push(JSON.stringify(finalFiles));
        }
        if (has('show_on_website')) { sets.push('show_on_website=?'); params.push(inFlag(input.show_on_website)); }
        if (!id || sets.length === 0) return res.status(400).json({ error: 'Tidak ada data untuk diperbarui' });
        await pool.query(`UPDATE project_client SET ${sets.join(', ')} WHERE id=?`, [...params, id]);
        res.json({ success: true });
        return;
      }

      case 'track_visit': {
        await trackVisit(req, input);
        res.json({ success: true });
        return;
      }

      case 'reset_visitor_stats': {
        await pool.query('UPDATE visitor_stats SET total_visits = 0');
        res.json({ success: true });
        return;
      }

      case 'migrate_paths': {
        const keys = ['products_data', 'portfolio_data'];
        const results = [];
        for (const key of keys) {
          const [rows] = await pool.query("SELECT setting_value FROM hero_settings WHERE setting_key = ?", [key]);
          if (rows.length > 0) {
            let val = rows[0].setting_value;
            let newVal = val.replace(/\/assets\/products\//g, '/assets/product/');
            newVal = newVal.replace(/\/assets\/portfolio\//g, '/assets/portofolio/');
            if (newVal !== val) {
              await pool.query("UPDATE hero_settings SET setting_value = ? WHERE setting_key = ?", [newVal, key]);
              results.push(key + ': updated');
            } else {
              results.push(key + ': no change needed');
            }
          } else {
            results.push(key + ': not found');
          }
        }
        res.json({ success: true, results });
        return;
      }

      case 'reset_product_portfolio': {
        await pool.query("DELETE FROM hero_settings WHERE setting_key IN ('products_data', 'portfolio_data')");
        res.json({ success: true, message: 'Reset berhasil, data kembali ke default.' });
        return;
      }

      case 'get_changelogs': {
        const { date, month, year } = input;
        let query = 'SELECT * FROM changelogs';
        let params = [];

        if (date) {
          query += ' WHERE change_date = ?';
          params.push(date);
        } else if (month && year) {
          query += ' WHERE MONTH(change_date) = ? AND YEAR(change_date) = ?';
          params.push(month, year);
        }
        query += ' ORDER BY change_date DESC, time DESC';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
        return;
      }

      case 'add_changelog': {
        const { change_date, time, title, description, category } = input;
        // Auto set time if not provided
        const finalTime = time || new Date().toLocaleTimeString('it-IT', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const [result] = await pool.query(
          'INSERT INTO changelogs (change_date, time, title, description, category) VALUES (?, ?, ?, ?, ?)',
          [change_date, finalTime, title, description || '', category || 'fitur']
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'update_changelog': {
        const { id, change_date, time, title, description, category } = input;
        await pool.query(
          'UPDATE changelogs SET change_date=?, time=?, title=?, description=?, category=? WHERE id=?',
          [change_date, time, title, description || '', category || 'fitur', id]
        );
        res.json({ success: true });
        return;
      }

      case 'delete_changelog': {
        const id = parseInt(input.id, 10);
        await pool.query('DELETE FROM changelogs WHERE id = ?', [id]);
        res.json({ success: true });
        return;
      }

      case 'get_documents': {
        const [rows] = await pool.query('SELECT * FROM documents ORDER BY type DESC, name ASC');
        res.json({ success: true, data: rows });
        return;
      }

      case 'add_document': {
        const { name, type, size, mime_type, path, parent_id } = input;
        let finalPath = path;
        
        // Handle file upload to physical storage if it's a file
        if (type === 'file' && path && path.includes('data:')) {
          const ext = name.split('.').pop();
          const fileName = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
          finalPath = await uploadBase64ToS3(path, 'documents', fileName);
        }

        const [result] = await pool.query(
          'INSERT INTO documents (name, type, size, mime_type, path, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
          [name, type, size || 0, mime_type || '', finalPath || '', (parent_id === 'null' || !parent_id) ? null : parent_id]
        );
        res.json({ success: true, id: result.insertId, path: finalPath });
        return;
      }

      case 'delete_document': {
        // The item plus everything nested under it (folders can be nested more than one level)
        const ids = [parseInt(input.id, 10)];
        if (!ids[0]) return res.status(400).json({ error: 'Invalid id' });
        for (let i = 0; i < ids.length; i++) {
          const [children] = await pool.query('SELECT id FROM documents WHERE parent_id = ?', [ids[i]]);
          for (const c of children) if (!ids.includes(c.id)) ids.push(c.id);
        }
        await pool.query('DELETE FROM documents WHERE id IN (?)', [ids]);
        res.json({ success: true });
        return;
      }

      // ── Admin actions the frontend sends with POST (UserManager, Dashboard, Navbar Manager) ──
      case 'delete_user': {
        const id = parseInt(input.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
        return;
      }

      case 'delete_project': {
        const id = parseInt(input.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        await deleteProject(id, res);
        return;
      }

      case 'get_navbar_menus': {
        res.json(await getNavbarMenus(input.include_inactive));
        return;
      }

      case 'save_navbar_menus_order': {
        const { menus } = input;
        if (!Array.isArray(menus)) return res.status(400).json({ error: 'Invalid data' });
        for (const menu of menus) {
          await pool.query('UPDATE navbar_menus SET sort_order = ?, parent_id = ? WHERE id = ?', [Number(menu.sort_order) || 0, menu.parent_id || null, Number(menu.id)]);
        }
        res.json({ success: true });
        return;
      }

      case 'add_navbar_menu': {
        const { parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active } = input;
        const [result] = await pool.query(
          'INSERT INTO navbar_menus (parent_id, label_id, label_en, url, icon, description_id, description_en, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [parent_id || null, label_id || '', label_en || '', url || '#', icon || 'Globe', description_id || '', description_en || '', sort_order ?? 99, Number(is_active ?? 1)]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'edit_navbar_menu': {
        const { id, label_id, label_en, url, icon, description_id, description_en, is_active } = input;
        await pool.query('UPDATE navbar_menus SET label_id=?, label_en=?, url=?, icon=?, description_id=?, description_en=?, is_active=? WHERE id=?',
          [label_id || '', label_en || '', url || '#', icon || 'Globe', description_id || '', description_en || '', Number(is_active ?? 1), Number(id)]);
        res.json({ success: true });
        return;
      }

      case 'delete_navbar_menu': {
        const id = Number(input.id);
        await pool.query('DELETE FROM navbar_menus WHERE parent_id = ?', [id]);
        await pool.query('DELETE FROM navbar_menus WHERE id = ?', [id]);
        res.json({ success: true });
        return;
      }

      default:
        res.status(400).json({ error: 'Invalid action: ' + action });
    }
  } catch (err) {
    // Validation errors (e.g. UploadError) carry a safe message; anything else is masked by maskServerErrors
    if (!err.expose) console.error('API Error:', err);
    res.status(err.expose ? err.status : 500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── AI Chat ──
app.post('/api/ai-chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    // System prompt with Garuda Nexa context; kept identical to ai_chat_reply() in api.php
    const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM hero_settings');
    const settings = {};
    for (const row of settingsRows) {
      settings[row.setting_key] = row.setting_value;
    }

    const [[visitorRow]] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
    const totalVisits = Number(visitorRow?.total_visits ?? 0) || 0;
    const [productRows] = await pool.query('SELECT title, description, link_button FROM list_products ORDER BY id');
    const products = productRows.map(p => `- **${p.title}**: ${p.description || '(no description)'} — Link: ${p.link_button || 'N/A'}`);
    const [[projectRow]] = await pool.query('SELECT COUNT(*) as c FROM project_client');
    const [[userRow]] = await pool.query('SELECT COUNT(*) as c FROM users');
    let portfolio = [];
    try {
      const parsed = JSON.parse(settings.portfolio_data ?? '[]');
      if (parsed && typeof parsed === 'object') portfolio = Object.values(parsed);
    } catch { /* invalid JSON counts as no portfolio, like json_decode() ?: [] */ }

    // number_format($visits, 0, ',', '.'): 12345 -> 12.345
    const visitsText = String(Math.trunc(totalVisits)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const systemPrompt = 'Kamu adalah AI Assistant untuk website Garuda Nexa Bahtera — perusahaan software house & digital agency asal Indonesia.\n\n'
      + 'Informasi website:\n'
      + `- Tagline: ${settings.hero_title ?? 'Solusi Digital Terpercaya'}\n`
      + `- Deskripsi: ${settings.hero_subtitle ?? 'Membangun software custom untuk bisnis Anda'}\n`
      + `- Total pengunjung website: ${visitsText} kali\n`
      + `- Total produk: ${products.length} produk\n`
      + `- Total user admin: ${Number(userRow?.c ?? 0)}\n`
      + `- Total project client: ${Number(projectRow?.c ?? 0)}\n`
      + `- Portfolio: ${portfolio.length} project\n\n`
      + `Produk:\n${products.length > 0 ? products.join('\n') : 'Belum ada produk terdaftar.'}\n\n`
      + 'Kontak: WA 6285188009152 | Email: info@garudanexa.com\n\n'
      + 'Jawab pertanyaan admin tentang website, data pengunjung, produk, layanan, dan teknis dalam bahasa Indonesia yang ramah dan profesional. '
      + 'Arahkan pertanyaan di luar konteks kembali ke topik Garuda Nexa. Gunakan Markdown yang rapi dan jawab ringkas.';

    // Only user/assistant turns from the client; the system prompt is ours
    const history = messages.slice(-20) // last 20 messages max
      .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content }));
    let reply = null;
    let aiError = '';
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }, { timeout: 120_000, maxRetries: 0 }); // one attempt, 120 s cap, like the curl call in api.php
      reply = completion?.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      aiError = String(err?.message || 'unknown error').replace(/\.+$/, '');
    }
    // Same 502 + message as api.php when the AI server does not answer
    if (reply === null) {
      console.error('AI Chat Error:', aiError || 'empty reply');
      const baseUrl = String(openai.baseURL || '').replace(/\/+$/, '');
      res.locals.safeError = true; // staff-only route; the hint is meant to be shown in the admin chat widget
      return res.status(502).json({
        error: `AI server di ${baseUrl} tidak merespons${aiError ? `: ${aiError}` : ''}. Jalankan Ollama atau set AI_BASE_URL/AI_MODEL.`,
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' });
  }
});

// Malformed JSON, oversized bodies and errors passed to next(): JSON response without internals
app.use(errorHandler);

// A rejected promise nobody awaited must not take the whole API down
process.on('unhandledRejection', (err) => console.error('[api] Unhandled rejection:', err));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Server running on port ${PORT}`);
});
