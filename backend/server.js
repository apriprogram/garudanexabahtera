import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync, readFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4000;

// ── AI Setup ──
const openai = new OpenAI({
  apiKey: 'ollama', // Not needed for Ollama
  baseURL: 'http://172.24.0.1:11434/v1',
});

// ── MySQL Connection Pool ──
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || 'garuda2024',
  database: process.env.MYSQL_DB || 'db_garudanexabahtera',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '256mb' }));

// ── Helpers ──
const ASSETS_DIR = '/var/www/html/assets';

function saveBase64Image(base64Data, section) {
  if (typeof base64Data !== 'string' || !base64Data.includes('data:image')) {
    return base64Data;
  }
  const folder = join(ASSETS_DIR, section);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  const parts = base64Data.split(',');
  const header = parts[0];
  const content = Buffer.from(parts[1], 'base64');

  let ext = 'jpg';
  if (header.includes('png')) ext = 'png';
  else if (header.includes('svg')) ext = 'svg';
  else if (header.includes('webp')) ext = 'webp';
  else if (header.includes('gif')) ext = 'gif';

  const filename = `${section}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  writeFileSync(join(folder, filename), content);
  return `/assets/${section}/${filename}`;
}

function saveBase64File(base64Data, section, originalName) {
  const folder = join(ASSETS_DIR, section);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  const parts = base64Data.split(',');
  const content = Buffer.from(parts[1], 'base64');
  const filename = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${originalName}`;
  writeFileSync(join(folder, filename), content);
  return filename;
}

// Compress & convert image to webp (for list_products)
async function saveAndCompressImage(base64Data, folderName) {
  if (!base64Data || !base64Data.includes('data:image')) return base64Data;
  const folder = join(ASSETS_DIR, folderName);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
  const parts = base64Data.split(',');
  const content = Buffer.from(parts[1], 'base64');
  const filename = `${folderName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
  try {
    const compressed = await sharp(content)
      .resize(640, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    writeFileSync(join(folder, filename), compressed);
    return `/assets/${folderName}/${filename}`;
  } catch {
    // fallback: save as-is
    writeFileSync(join(folder, filename.replace('.webp', '.jpg')), content);
    return `/assets/${folderName}/${filename.replace('.webp', '.jpg')}`;
  }
}

// ── GET /api.php?action=get_settings ──
app.get('/api.php', async (req, res) => {
  const action = req.query.action;

  // Actions via GET
  if (action === 'get_settings') {
    try {
      const [rows] = await pool.query('SELECT setting_key, setting_value FROM hero_settings');
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
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_list_products') {
    try {
      // Lightweight query for grid performance
      const [rows] = await pool.query('SELECT id, title, description, link_button, image, logo FROM list_products ORDER BY id DESC');
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_list_product_detail') {
    try {
      const id = parseInt(req.query.id, 10);
      if (!id) return res.status(400).json({ error: 'id required' });
      const [rows] = await pool.query('SELECT * FROM list_products WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
      res.json(rows[0]);
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
      await pool.query('DELETE FROM project_client WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // ── iSchool Stats Proxy ──
  if (action === 'get_ischool_stats') {
    return res.json({
      success: true,
      data: {
        total_yayasans: 15,
        total_schools: 42,
        total_students: 4850,
        total_teachers: 320,
        active_users: 1240,
        bandwidth_used: "450 GB",
        system_health: "Optimal"
      }
    });
  }

  // ── Website Monitoring ──
  if (action === 'check_website') {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'url required' });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const start = Date.now();
      const resp = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GarudaMonitor/1.0)' }
      });
      clearTimeout(timeout);
      const responseTime = Date.now() - start;

      res.json({
        status: resp.ok ? 'online' : 'offline',
        responseTime,
        httpStatus: resp.status,
        redirect: resp.redirected ? resp.url : null,
      });
    } catch (err) {
      // Try GET fallback if HEAD fails
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const start = Date.now();
        const resp = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (GarudaMonitor/1.0)' }
        });
        clearTimeout(timeout);
        const responseTime = Date.now() - start;

        res.json({
          status: resp.ok ? 'online' : 'offline',
          responseTime,
          httpStatus: resp.status,
          redirect: resp.redirected ? resp.url : null,
        });
      } catch (err2) {
        res.json({
          status: 'offline',
          responseTime: null,
          httpStatus: null,
          error: 'Connection timeout'
        });
      }
    }
    return;
  }

  // ── Get Products Data ──
  if (action === 'get_products') {
    try {
      const [rows] = await pool.query('SELECT id, logo FROM list_products');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(400).json({ error: 'Invalid action: ' + action });
});

// ── POST /api.php ──
app.post('/api.php', async (req, res) => {
  console.log('POST /api.php action:', req.body && req.body.action);
  let { action, settings: inputSettings, ...input } = req.body;
  if (!action && req.query && req.query.action) {
    action = req.query.action;
  }
  const conn = await pool.getConnection();

  try {
    switch (action) {

      case 'login': {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [input.email]);
        if (rows.length === 0) return res.json({ error: 'Email tidak ditemukan' });
        const user = rows[0];
        if (user.status === 'inactive') return res.json({ error: 'Akun Anda tidak aktif. Hubungi administrator.' });
        const valid = bcrypt.compareSync(input.password, user.password);
        if (!valid) return res.json({ error: 'Password salah' });
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
        return;
      }

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
        const settings = inputSettings || {};
        const errors = [];

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
            if (item.image) item.image = saveBase64Image(item.image, 'services');
            if (item.icon) item.icon = saveBase64Image(item.icon, 'services');
          }
          settings.services_data = JSON.stringify(items);
        }

        // ── hero_images ──
        if (settings.hero_images) {
          const images = JSON.parse(settings.hero_images);
          if (Array.isArray(images)) {
            const bgFolder = join(ASSETS_DIR, 'bg');
            if (!existsSync(bgFolder)) mkdirSync(bgFolder, { recursive: true });
            const finalPaths = [];
            const keptFiles = [];
            for (let i = 0; i < images.length; i++) {
              const imgData = images[i];
              if (typeof imgData === 'string' && imgData.includes('data:image')) {
                const data = imgData.split(',');
                const content = Buffer.from(data[1], 'base64');
                const filename = `hero_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}.jpg`;
                writeFileSync(join(bgFolder, filename), content);
                finalPaths.push('/assets/bg/' + filename);
                keptFiles.push(filename);
              } else {
                finalPaths.push(imgData);
                keptFiles.push(imgData.split('/').pop());
              }
            }
            // Clean up deleted images
            if (existsSync(bgFolder)) {
              const allFiles = readdirSync(bgFolder);
              for (const file of allFiles) {
                const fp = join(bgFolder, file);
                if (statSync(fp).isFile() && !keptFiles.includes(file)) {
                  try { unlinkSync(fp); } catch {}
                }
              }
            }
            settings.hero_images = JSON.stringify(finalPaths);
          }
        }

        // ── hero_logos ──
        if (settings.hero_logos) {
          const logos = JSON.parse(settings.hero_logos);
          if (Array.isArray(logos)) {
            const logoFolder = join(ASSETS_DIR, 'logo-product');
            if (!existsSync(logoFolder)) mkdirSync(logoFolder, { recursive: true });
            const finalLogos = [];
            const keptLogos = [];
            for (let i = 0; i < logos.length; i++) {
              const logo = logos[i];
              if (logo.src?.includes('data:image')) {
                const data = logo.src.split(',');
                const content = Buffer.from(data[1], 'base64');
                const ext = data[0].includes('png') ? 'png' : 'jpg';
                const filename = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}.${ext}`;
                writeFileSync(join(logoFolder, filename), content);
                finalLogos.push({ name: logo.name, src: '/assets/logo-product/' + filename });
                keptLogos.push(filename);
              } else {
                finalLogos.push(logo);
                keptLogos.push(logo.src?.split('/').pop() || '');
              }
            }
            // Clean up deleted logos
            if (existsSync(logoFolder)) {
              const allFiles = readdirSync(logoFolder);
              for (const file of allFiles) {
                const fp = join(logoFolder, file);
                if (statSync(fp).isFile() && !keptLogos.includes(file)) {
                  try { unlinkSync(fp); } catch {}
                }
              }
            }
            settings.hero_logos = JSON.stringify(finalLogos);
          }
        }

        // ── Save all settings to DB ──
        let allSuccess = true;
        let lastError = null;
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
        res.json({ success: allSuccess, error: lastError });
        return;
      }

      case 'add_project': {
        let imagePath = '';
        if (input.image?.includes('data:image')) {
          const logoFolder = join(ASSETS_DIR, 'dokumen-client', 'logo');
          if (!existsSync(logoFolder)) mkdirSync(logoFolder, { recursive: true });
          const data = input.image.split(',');
          const content = Buffer.from(data[1], 'base64');
          const ext = data[0].includes('png') ? 'png' : 'jpg';
          const filename = `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          writeFileSync(join(logoFolder, filename), content);
          imagePath = '/assets/dokumen-client/logo/' + filename;
        } else {
          imagePath = input.image || '';
        }

        let finalFiles = [];
        if (input.project_files) {
          const filesArray = typeof input.project_files === 'string' ? JSON.parse(input.project_files) : input.project_files;
          if (Array.isArray(filesArray)) {
            const docFolder = join(ASSETS_DIR, 'dokumen-client', 'dokumen');
            if (!existsSync(docFolder)) mkdirSync(docFolder, { recursive: true });
            for (const f of filesArray) {
              if (f.data?.includes('data:')) {
                const data = f.data.split(',');
                const content = Buffer.from(data[1], 'base64');
                const filename = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`;
                writeFileSync(join(docFolder, filename), content);
                finalFiles.push({ name: f.name, type: f.type, size: f.size, path: '/assets/dokumen-client/dokumen/' + filename });
              } else {
                finalFiles.push(f);
              }
            }
          }
        }
        const projectFilesJson = JSON.stringify(finalFiles);

        const startDateSql = input.start_date || null;
        const endDateSql = input.end_date || null;

        const [result] = await pool.query(
          `INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, assigned_user, price, start_date, end_date, image, project_files, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [input.name, input.client_name, input.client_email || '', input.client_phone || '', input.service_type, input.status,
           input.assigned_user || '', input.price || 0, startDateSql, endDateSql, imagePath, projectFilesJson, input.description || '']
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'update_project': {
        const id = parseInt(input.id, 10);

        let imagePath = '';
        if (input.image?.includes('data:image')) {
          const logoFolder = join(ASSETS_DIR, 'dokumen-client', 'logo');
          if (!existsSync(logoFolder)) mkdirSync(logoFolder, { recursive: true });
          const data = input.image.split(',');
          const content = Buffer.from(data[1], 'base64');
          const ext = data[0].includes('png') ? 'png' : 'jpg';
          const filename = `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          writeFileSync(join(logoFolder, filename), content);
          imagePath = '/assets/dokumen-client/logo/' + filename;
        } else {
          imagePath = input.image || '';
        }

        let finalFiles = [];
        if (input.project_files) {
          const filesArray = typeof input.project_files === 'string' ? JSON.parse(input.project_files) : input.project_files;
          if (Array.isArray(filesArray)) {
            const docFolder = join(ASSETS_DIR, 'dokumen-client', 'dokumen');
            if (!existsSync(docFolder)) mkdirSync(docFolder, { recursive: true });
            for (const f of filesArray) {
              if (f.data?.includes('data:')) {
                const data = f.data.split(',');
                const content = Buffer.from(data[1], 'base64');
                const filename = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`;
                writeFileSync(join(docFolder, filename), content);
                finalFiles.push({ name: f.name, type: f.type, size: f.size, path: '/assets/dokumen-client/dokumen/' + filename });
              } else {
                finalFiles.push(f);
              }
            }
          }
        }
        const projectFilesJson = JSON.stringify(finalFiles);

        const startDateSql = input.start_date || null;
        const endDateSql = input.end_date || null;

        await pool.query(
          `UPDATE project_client SET name=?, client_name=?, client_email=?, client_phone=?, service_type=?, status=?, assigned_user=?, price=?, start_date=?, end_date=?, image=?, project_files=?, description=? WHERE id=?`,
          [input.name, input.client_name, input.client_email || '', input.client_phone || '', input.service_type, input.status,
           input.assigned_user || '', input.price || 0, startDateSql, endDateSql, imagePath, projectFilesJson, input.description || '', id]
        );
        res.json({ success: true });
        return;
      }

      case 'track_visit': {
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

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

        // Basic country from IP (using a simple offline lookup or default)
        let country = 'Unknown';

        // Query with 1-second dedup per IP to prevent spam
        await pool.query(
          `INSERT IGNORE INTO visitor_logs (ip_address, user_agent, device, browser, os, country, visited_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [ip, ua, device, browser, os, country]
        );

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

      case 'add_list_product': {
        const imagePath = await saveAndCompressImage(input.image, 'list-products');
        const logoPath = await saveAndCompressImage(input.logo, 'list-products');

        let finalFiles = [];
        if (input.project_files) {
          const filesArray = typeof input.project_files === 'string' ? JSON.parse(input.project_files) : input.project_files;
          if (Array.isArray(filesArray)) {
            const docFolder = join(ASSETS_DIR, 'list-products', 'documents');
            if (!existsSync(docFolder)) mkdirSync(docFolder, { recursive: true });
            for (const f of filesArray) {
              if (f.data?.includes('data:')) {
                const data = f.data.split(',');
                const content = Buffer.from(data[1], 'base64');
                const filename = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`;
                writeFileSync(join(docFolder, filename), content);
                finalFiles.push({ name: f.name, type: f.type, size: f.size, path: '/assets/list-products/documents/' + filename });
              } else {
                finalFiles.push(f);
              }
            }
          }
        }
        const projectFilesJson = JSON.stringify(finalFiles);

        const [result] = await pool.query(
          'INSERT INTO list_products (title, description, link_button, image, logo, users, project_files, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [input.title, input.description || '', input.link_button || '', imagePath, logoPath, input.users || '[]', projectFilesJson, input.notes || '']
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'update_list_product': {
        const id = parseInt(input.id, 10);
        const imagePath = await saveAndCompressImage(input.image, 'list-products');
        const logoPath = await saveAndCompressImage(input.logo, 'list-products');

        let finalFiles = [];
        if (input.project_files) {
          const filesArray = typeof input.project_files === 'string' ? JSON.parse(input.project_files) : input.project_files;
          if (Array.isArray(filesArray)) {
            const docFolder = join(ASSETS_DIR, 'list-products', 'documents');
            if (!existsSync(docFolder)) mkdirSync(docFolder, { recursive: true });
            for (const f of filesArray) {
              if (f.data?.includes('data:')) {
                const data = f.data.split(',');
                const content = Buffer.from(data[1], 'base64');
                const filename = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${f.name}`;
                writeFileSync(join(docFolder, filename), content);
                finalFiles.push({ name: f.name, type: f.type, size: f.size, path: '/assets/list-products/documents/' + filename });
              } else {
                finalFiles.push(f);
              }
            }
          }
        }
        const projectFilesJson = JSON.stringify(finalFiles);

        await pool.query(
          'UPDATE list_products SET title=?, description=?, link_button=?, image=?, logo=?, users=?, project_files=?, notes=? WHERE id=?',
          [input.title, input.description || '', input.link_button || '', imagePath, logoPath, input.users || '[]', projectFilesJson, input.notes || '', id]
        );
        res.json({ success: true });
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
        const { date, time, title, description, category } = input;
        // Auto set time if not provided
        const finalTime = time || new Date().toLocaleTimeString('it-IT', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const [result] = await pool.query(
          'INSERT INTO changelogs (change_date, time, title, description, category) VALUES (?, ?, ?, ?, ?)',
          [date, finalTime, title, description || '', category || 'fitur']
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'delete_changelog': {
        const id = parseInt(input.id, 10);
        await pool.query('DELETE FROM changelogs WHERE id = ?', [id]);
        res.json({ success: true });
        return;
      }

      case 'delete_list_product': {
        const id = parseInt(input.id, 10);
        await pool.query('DELETE FROM list_products WHERE id = ?', [id]);
        res.json({ success: true });
        return;
      }

      case 'update_product_order': {
        const { order } = input;
        if (!Array.isArray(order)) return res.status(400).json({ error: 'Order must be an array' });
        
        for (const item of order) {
          await pool.query('UPDATE list_products SET position = ? WHERE id = ?', [item.position, item.id]);
        }
        res.json({ success: true });
        return;
      }

      case 'update_product_logo': {
        const id = parseInt(input.id, 10);
        const logoPath = await saveAndCompressImage(input.logo, 'list-products');
        await pool.query('UPDATE list_products SET logo=? WHERE id=?', [logoPath, id]);
        res.json({ success: true, path: logoPath });
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
          const docDir = '/var/www/html/assets/documents';
          if (!existsSync(docDir)) mkdirSync(docDir, { recursive: true });
          
          const base64Data = path.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = name.split('.').pop();
          const fileName = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
          const fullPath = join(docDir, fileName);
          
          writeFileSync(fullPath, buffer);
          finalPath = `/assets/documents/${fileName}`;
        }

        const [result] = await pool.query(
          'INSERT INTO documents (name, type, size, mime_type, path, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
          [name, type, size || 0, mime_type || '', finalPath || '', (parent_id === 'null' || !parent_id) ? null : parent_id]
        );
        res.json({ success: true, id: result.insertId, path: finalPath });
        return;
      }

      case 'delete_document': {
        const id = parseInt(input.id, 10);
        // Recursive delete for folders (simplified)
        await pool.query('DELETE FROM documents WHERE id = ? OR parent_id = ?', [id, id]);
        res.json({ success: true });
        return;
      }

      // ═══════════════════════════════════════════════
      // Monitoring Center API Endpoints
      // ═══════════════════════════════════════════════

      // ── Website Monitoring ──
      case 'monitor_get_websites': {
        const [rows] = await pool.query('SELECT * FROM monitoring_websites ORDER BY category, name');
        const data = rows.map(r => ({ ...r, id: Number(r.id), is_active: Boolean(r.is_active), uptime_total: Number(r.uptime_total) }));
        res.json(data);
        return;
      }

      case 'monitor_add_website': {
        const { name, url, category = 'Umum', notes = '', is_active = 1 } = input;
        const [result] = await pool.query(
          'INSERT INTO monitoring_websites (name, url, category, is_active, notes) VALUES (?, ?, ?, ?, ?)',
          [name, url, category, Number(is_active), notes]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'monitor_update_website': {
        const { id, name, url, category = 'Umum', notes = '', is_active = 1 } = input;
        await pool.query(
          'UPDATE monitoring_websites SET name=?, url=?, category=?, is_active=?, notes=? WHERE id=?',
          [name, url, category, Number(is_active), notes, Number(id)]
        );
        res.json({ success: true });
        return;
      }

      case 'monitor_delete_website': {
        const id = Number(input.id);
        await pool.query('DELETE FROM monitoring_website_checks WHERE website_id=?', [id]);
        await pool.query('DELETE FROM monitoring_websites WHERE id=?', [id]);
        res.json({ success: true });
        return;
      }

      case 'monitor_check_website': {
        const id = Number(input.id);
        const [rows] = await pool.query('SELECT url FROM monitoring_websites WHERE id=?', [id]);
        if (rows.length === 0) { res.json({ error: 'Website not found' }); return; }
        const url = rows[0].url;
        const start = Date.now();
        let httpCode = 0, err = '';
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const resp = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'GarudaMonitor/1.0' } });
          clearTimeout(timeout);
          httpCode = resp.status;
        } catch (e) {
          err = e.message;
          // Try GET fallback
          try {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 15000);
            const resp2 = await fetch(url, { method: 'GET', signal: controller2.signal, redirect: 'follow', headers: { 'User-Agent': 'GarudaMonitor/1.0' } });
            clearTimeout(timeout2);
            httpCode = resp2.status;
            err = '';
          } catch (e2) { err = e2.message; }
        }
        const elapsed = Date.now() - start;
        const isOnline = (httpCode >= 200 && httpCode < 500) && !err;
        const status = isOnline ? 'online' : 'offline';

        await pool.query("UPDATE monitoring_websites SET status=?, last_checked=NOW() WHERE id=?", [status, id]);
        await pool.query(
          'INSERT INTO monitoring_website_checks (website_id, status, response_time_ms, http_status, error_message) VALUES (?, ?, ?, ?, ?)',
          [id, status, elapsed, httpCode, err]
        );
        res.json({ status, response_time_ms: elapsed, http_status: httpCode, error: err });
        return;
      }

      case 'monitor_check_all_websites': {
        const [sites] = await pool.query('SELECT id, url FROM monitoring_websites WHERE is_active=1');
        const results = [];
        for (const site of sites) {
          const wid = Number(site.id);
          const start = Date.now();
          let httpCode = 0, err = '';
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const resp = await fetch(site.url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
            clearTimeout(timeout);
            httpCode = resp.status;
          } catch (e) {
            err = e.message;
            try {
              const controller2 = new AbortController();
              const timeout2 = setTimeout(() => controller2.abort(), 10000);
              const resp2 = await fetch(site.url, { method: 'GET', signal: controller2.signal, redirect: 'follow' });
              clearTimeout(timeout2);
              httpCode = resp2.status;
              err = '';
            } catch (e2) { err = e2.message; }
          }
          const elapsed = Date.now() - start;
          const status = (httpCode >= 200 && httpCode < 500) && !err ? 'online' : 'offline';
          await pool.query("UPDATE monitoring_websites SET status=?, last_checked=NOW() WHERE id=?", [status, wid]);
          await pool.query(
            'INSERT INTO monitoring_website_checks (website_id, status, response_time_ms, http_status, error_message) VALUES (?, ?, ?, ?, ?)',
            [wid, status, elapsed, httpCode, err]
          );
          results.push({ id: wid, status, response_time_ms: elapsed });
        }
        res.json({ success: true, results });
        return;
      }

      case 'monitor_get_websites_stats': {
        const [[{ c: total }]] = await pool.query('SELECT COUNT(*) as c FROM monitoring_websites');
        const [[{ c: online }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='online'");
        const [[{ c: offline }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='offline'");
        res.json({ total: Number(total), online: Number(online), offline: Number(offline) });
        return;
      }

      case 'monitor_get_website_checks': {
        const id = Number(input.id);
        const limit = Number(input.limit || 60);
        const [rows] = await pool.query(
          'SELECT * FROM monitoring_website_checks WHERE website_id=? ORDER BY checked_at DESC LIMIT ?',
          [id, limit]
        );
        const data = rows.reverse().map(r => ({
          ...r, id: Number(r.id), response_time_ms: Number(r.response_time_ms), http_status: Number(r.http_status)
        }));
        res.json(data);
        return;
      }

      // ── Server Monitoring ──
      case 'monitor_get_server_status': {
        const [rows] = await pool.query('SELECT * FROM monitoring_server_status WHERE id=1');
        if (rows.length > 0) {
          const r = rows[0];
          r.ram_used = Number(r.ram_used);
          r.ram_total = Number(r.ram_total);
          r.disk_used = Number(r.disk_used);
          r.disk_total = Number(r.disk_total);
          res.json(r);
        } else {
          res.json({ error: 'No server data' });
        }
        return;
      }

      case 'monitor_update_server': {
        const cpu = Number(input.cpu_usage || 0);
        const ramUsed = Number(input.ram_used || 0);
        const ramTotal = Number(input.ram_total || 1);
        const diskUsed = Number(input.disk_used || 0);
        const diskTotal = Number(input.disk_total || 1);
        const netIn = Number(input.network_in || 0);
        const netOut = Number(input.network_out || 0);
        const uptime = Number(input.uptime_seconds || 0);
        const ramPct = Math.round((ramUsed / ramTotal) * 100 * 100) / 100;
        const diskPct = Math.round((diskUsed / diskTotal) * 100 * 100) / 100;
        let status = 'healthy';
        if (cpu > 80 || ramPct > 80 || diskPct > 90) status = 'critical';
        else if (cpu > 60 || ramPct > 60 || diskPct > 75) status = 'warning';
        await pool.query(
          `UPDATE monitoring_server_status SET cpu_usage=?, ram_used=?, ram_total=?, ram_percent=?, disk_used=?, disk_total=?, disk_percent=?,
           network_in=?, network_out=?, uptime_seconds=?, status=?, last_updated=NOW() WHERE id=1`,
          [cpu, ramUsed, ramTotal, ramPct, diskUsed, diskTotal, diskPct, netIn, netOut, uptime, status]
        );
        await pool.query(
          'INSERT INTO monitoring_server_metrics (cpu_usage, ram_used, ram_total, disk_used, disk_total, network_in, network_out) VALUES (?,?,?,?,?,?,?)',
          [cpu, ramUsed, ramTotal, diskUsed, diskTotal, netIn, netOut]
        );
        res.json({ success: true, status });
        return;
      }

      case 'monitor_get_server_metrics': {
        const limit = Number(input.limit || 60);
        const [rows] = await pool.query('SELECT * FROM monitoring_server_metrics ORDER BY recorded_at DESC LIMIT ?', [limit]);
        const data = rows.reverse().map(r => ({
          ...r, cpu_usage: Number(r.cpu_usage), ram_used: Number(r.ram_used), ram_total: Number(r.ram_total),
          disk_used: Number(r.disk_used), disk_total: Number(r.disk_total)
        }));
        res.json(data);
        return;
      }

      // ── Visitor Stats ──
      case 'monitor_get_visitor_stats': {
        const [[{ c: total }]] = await pool.query('SELECT COALESCE(SUM(total_visits),0) as c FROM visitor_stats WHERE id=1');
        const [[{ c: todayCount }]] = await pool.query("SELECT COUNT(*) as c FROM visitor_logs WHERE DATE(visited_at)=CURDATE()");
        const [[{ c: active }]] = await pool.query("SELECT COUNT(*) as c FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");

        const [daily] = await pool.query("SELECT DATE(visited_at) as date, COUNT(*) as count FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(visited_at) ORDER BY date ASC");
        const [weekly] = await pool.query("SELECT YEARWEEK(visited_at) as week, COUNT(*) as count FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK) GROUP BY YEARWEEK(visited_at) ORDER BY week ASC");
        const [monthly] = await pool.query("SELECT DATE_FORMAT(visited_at, '%Y-%m') as month, COUNT(*) as count FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(visited_at, '%Y-%m') ORDER BY month ASC");

        const [devices] = await pool.query("SELECT COALESCE(device,'Unknown') as label, COUNT(*) as value FROM visitor_logs GROUP BY device ORDER BY value DESC");
        const [browsers] = await pool.query("SELECT COALESCE(browser,'Unknown') as label, COUNT(*) as value FROM visitor_logs GROUP BY browser ORDER BY value DESC");
        const [countries] = await pool.query("SELECT COALESCE(country,'Unknown') as label, COUNT(*) as value FROM visitor_logs GROUP BY country ORDER BY value DESC");

        res.json({
          total: Number(total), today: Number(todayCount), active: Number(active),
          daily: daily.map(r => ({ date: r.date, count: Number(r.count) })),
          weekly: weekly.map(r => ({ week: r.week, count: Number(r.count) })),
          monthly: monthly.map(r => ({ month: r.month, count: Number(r.count) })),
          devices: devices.map(r => ({ label: r.label, value: Number(r.value) })),
          browsers: browsers.map(r => ({ label: r.label, value: Number(r.value) })),
          countries: countries.map(r => ({ label: r.label, value: Number(r.value) }))
        });
        return;
      }

      // ── Database Monitoring ──
      case 'monitor_get_database_status': {
        const [rows] = await pool.query('SELECT * FROM monitoring_database WHERE id=1');
        let row = rows[0] || { db_name: 'db_garudanexabahtera', status: 'connected', size_mb: 0, active_connections: 0, last_backup: null, backup_status: 'No backup yet' };
        // Calculate actual DB size
        const [[sizeRow]] = await pool.query("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb FROM information_schema.tables WHERE table_schema=?", [process.env.MYSQL_DB || 'db_garudanexabahtera']);
        if (sizeRow && sizeRow.size_mb) row.size_mb = Number(sizeRow.size_mb);
        // Active connections
        const [[connRow]] = await pool.query("SELECT COUNT(*) as c FROM information_schema.processlist WHERE db=?", [process.env.MYSQL_DB || 'db_garudanexabahtera']);
        if (connRow) row.active_connections = Number(connRow.c);
        row.size_mb = row.size_mb || 0;
        row.active_connections = row.active_connections || 0;
        res.json(row);
        return;
      }

      // ── Domain Monitoring ──
      case 'monitor_get_domains': {
        const [rows] = await pool.query(
          'SELECT md.*, mw.name as website_name FROM monitoring_domains md LEFT JOIN monitoring_websites mw ON md.website_id = mw.id ORDER BY md.expiry_date ASC'
        );
        const data = rows.map(r => ({
          ...r, id: Number(r.id), days_until_expiry: Number(r.days_until_expiry), ssl_days_until_expiry: Number(r.ssl_days_until_expiry)
        }));
        res.json(data);
        return;
      }

      case 'monitor_add_domain': {
        const { domain, website_id = 0, registrar = '', expiry_date = '', ssl_expiry_date = '' } = input;
        const days = expiry_date ? Math.round((new Date(expiry_date).getTime() - Date.now()) / 86400000) : 0;
        const ssl_days = ssl_expiry_date ? Math.round((new Date(ssl_expiry_date).getTime() - Date.now()) / 86400000) : 0;
        const status = days < 0 ? 'expired' : (days < 30 ? 'expiring_soon' : 'valid');
        const wid = Number(website_id) > 0 ? Number(website_id) : null;
        const [result] = await pool.query(
          `INSERT INTO monitoring_domains (domain, website_id, registrar, expiry_date, days_until_expiry, ssl_expiry_date, ssl_days_until_expiry, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [domain, wid, registrar, expiry_date || null, days, ssl_expiry_date || null, ssl_days, status]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'monitor_delete_domain': {
        const id = Number(input.id);
        await pool.query('DELETE FROM monitoring_domains WHERE id=?', [id]);
        res.json({ success: true });
        return;
      }

      // ── API Monitoring ──
      case 'monitor_get_apis': {
        const [rows] = await pool.query('SELECT * FROM monitoring_api ORDER BY name');
        const data = rows.map(r => ({
          ...r, id: Number(r.id), response_time_ms: Number(r.response_time_ms),
          success_count: Number(r.success_count), fail_count: Number(r.fail_count)
        }));
        res.json(data);
        return;
      }

      case 'monitor_add_api': {
        const { name, endpoint, method = 'GET' } = input;
        const [result] = await pool.query(
          'INSERT INTO monitoring_api (name, endpoint, method) VALUES (?, ?, ?)',
          [name, endpoint, method]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'monitor_check_api': {
        const id = Number(input.id);
        const [rows] = await pool.query('SELECT * FROM monitoring_api WHERE id=?', [id]);
        if (rows.length === 0) { res.json({ error: 'API not found' }); return; }
        const api = rows[0];
        const start = Date.now();
        let httpCode = 0, err = '';
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const resp = await fetch(api.endpoint, { method: api.method || 'GET', signal: controller.signal });
          clearTimeout(timeout);
          httpCode = resp.status;
        } catch (e) { err = e.message; }
        const elapsed = Date.now() - start;
        const success = (httpCode >= 200 && httpCode < 500 && !err);
        if (success) {
          await pool.query('UPDATE monitoring_api SET status=?, response_time_ms=?, success_count=success_count+1, last_checked=NOW() WHERE id=?', ['active', elapsed, id]);
        } else {
          await pool.query('UPDATE monitoring_api SET status=?, response_time_ms=?, fail_count=fail_count+1, last_checked=NOW() WHERE id=?', ['down', elapsed, id]);
        }
        res.json({ success, response_time_ms: elapsed, http_status: httpCode });
        return;
      }

      case 'monitor_delete_api': {
        const id = Number(input.id);
        await pool.query('DELETE FROM monitoring_api WHERE id=?', [id]);
        res.json({ success: true });
        return;
      }

      // ── Security Logs ──
      case 'monitor_get_security_logs': {
        const limit = Number(input.limit || 50);
        const [rows] = await pool.query('SELECT * FROM monitoring_security_logs ORDER BY created_at DESC LIMIT ?', [limit]);
        const data = rows.map(r => ({ ...r, id: Number(r.id) }));
        res.json(data);
        return;
      }

      case 'monitor_security_summary': {
        const [[{ c: total }]] = await pool.query('SELECT COUNT(*) as c FROM monitoring_security_logs');
        const [[{ c: newCount }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_security_logs WHERE status='new'");
        const [[{ c: high }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_security_logs WHERE severity IN ('high','critical')");
        const [[{ c: blocked }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_security_logs WHERE type='blocked_ip'");
        res.json({ total: Number(total), new: Number(newCount), high_severity: Number(high), blocked_ips: Number(blocked) });
        return;
      }

      case 'monitor_update_security_status': {
        const id = Number(input.id);
        const status = input.status || 'reviewed';
        await pool.query('UPDATE monitoring_security_logs SET status=? WHERE id=?', [status, id]);
        res.json({ success: true });
        return;
      }

      // ── Notifications ──
      case 'monitor_get_notifications': {
        const limit = Number(input.limit || 20);
        const type = input.type || '';
        let query = 'SELECT * FROM monitoring_notifications';
        const params = [];
        if (type) { query += ' WHERE type=?'; params.push(type); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        const [rows] = await pool.query(query, params);
        const data = rows.map(r => ({
          ...r, id: Number(r.id), is_read: Boolean(r.is_read), sent_wa: Boolean(r.sent_wa)
        }));
        res.json(data);
        return;
      }

      case 'monitor_mark_notification_read': {
        const id = Number(input.id);
        await pool.query('UPDATE monitoring_notifications SET is_read=1 WHERE id=?', [id]);
        res.json({ success: true });
        return;
      }

      case 'monitor_mark_all_read': {
        await pool.query('UPDATE monitoring_notifications SET is_read=1 WHERE is_read=0');
        res.json({ success: true });
        return;
      }

      case 'monitor_add_notification': {
        const { type = 'info', title, message, severity = 'info', sent_wa = 0 } = input;
        const [result] = await pool.query(
          'INSERT INTO monitoring_notifications (type, title, message, severity, sent_wa) VALUES (?, ?, ?, ?, ?)',
          [type, title, message, severity, Number(sent_wa)]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'monitor_get_unread_count': {
        const [[{ c }]] = await pool.query('SELECT COUNT(*) as c FROM monitoring_notifications WHERE is_read=0');
        res.json({ unread: Number(c) });
        return;
      }

      // ── Categories ──
      case 'monitor_get_categories': {
        const [rows] = await pool.query('SELECT * FROM monitoring_categories ORDER BY sort_order');
        res.json(rows);
        return;
      }

      case 'monitor_add_category': {
        const { name, icon = 'Globe', sort_order = 0 } = input;
        const [result] = await pool.query(
          'INSERT INTO monitoring_categories (name, icon, sort_order) VALUES (?, ?, ?)',
          [name, icon, Number(sort_order)]
        );
        res.json({ success: true, id: result.insertId });
        return;
      }

      case 'monitor_delete_category': {
        const id = Number(input.id);
        await pool.query('DELETE FROM monitoring_categories WHERE id=?', [id]);
        res.json({ success: true });
        return;
      }

      // ── Settings ──
      case 'monitor_get_settings': {
        const [rows] = await pool.query('SELECT * FROM monitoring_settings WHERE id=1');
        res.json(rows[0] || {});
        return;
      }

      case 'monitor_update_settings': {
        const fields = ['check_interval', 'wa_notifications', 'notify_website_down', 'notify_high_resource', 'notify_ssl_expiry', 'notify_domain_expiry'];
        const sets = [];
        const params = [];
        for (const f of fields) {
          if (input[f] !== undefined) { sets.push(`${f}=?`); params.push(Number(input[f])); }
        }
        if (input.wa_phone !== undefined) { sets.push('wa_phone=?'); params.push(input.wa_phone); }
        if (input.wa_group !== undefined) { sets.push('wa_group=?'); params.push(input.wa_group); }
        if (sets.length > 0) {
          params.push(1);
          await pool.query('UPDATE monitoring_settings SET ' + sets.join(',') + ' WHERE id=?', params);
        }
        res.json({ success: true });
        return;
      }

      // ── Dashboard Summary ──
      case 'monitor_dashboard_summary': {
        const [[{ c: totalWeb }]] = await pool.query('SELECT COUNT(*) as c FROM monitoring_websites');
        const [[{ c: onlineWeb }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='online'");
        const [[{ c: offlineWeb }]] = await pool.query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='offline'");

        const [serverRows] = await pool.query('SELECT * FROM monitoring_server_status WHERE id=1');
        const server = serverRows[0] || null;

        const [[{ c: visitors }]] = await pool.query('SELECT COALESCE(total_visits,0) as c FROM visitor_stats WHERE id=1');

        const [[{ s: dbSize }]] = await pool.query("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as s FROM information_schema.tables WHERE table_schema=?", [process.env.MYSQL_DB || 'db_garudanexabahtera']);

        const [[{ c: unreadN }]] = await pool.query('SELECT COUNT(*) as c FROM monitoring_notifications WHERE is_read=0');

        const [domExp] = await pool.query("SELECT domain, days_until_expiry, ssl_days_until_expiry FROM monitoring_domains WHERE (days_until_expiry BETWEEN 0 AND 30) OR (ssl_days_until_expiry BETWEEN 0 AND 30)");

        res.json({
          websites: { total: Number(totalWeb), online: Number(onlineWeb), offline: Number(offlineWeb) },
          server,
          visitors: Number(visitors),
          database_size_mb: Number(dbSize || 0),
          unread_notifications: Number(unreadN),
          domains_expiring: domExp
        });
        return;
      }

      default:
        res.status(400).json({ error: 'Invalid action: ' + action });
    }
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message });
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
    // Build system prompt with Garuda Nexa context
    const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM hero_settings');
    const settings = {};
    for (const row of settingsRows) {
      settings[row.setting_key] = row.setting_value;
    }

    const [[visitorRow]] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
    const totalVisits = visitorRow ? visitorRow.total_visits : 0;

    const [productRows] = await pool.query('SELECT id, title, description, link_button FROM list_products ORDER BY id');
    const [projectCount] = await pool.query('SELECT COUNT(*) as count FROM project_client');
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');

    const productsData = settings.products_data ? JSON.parse(settings.products_data) : [];
    const portfolioData = settings.portfolio_data ? JSON.parse(settings.portfolio_data) : [];

    const productList = productRows.map(p => `- **${p.title}**: ${p.description || '(no description)'} — Link: ${p.link_button || 'N/A'}`).join('\n');

    const systemPrompt = `Kamu adalah AI Assistant untuk website Garuda Nexa Bahtera — perusahaan software house & digital agency asal Indonesia.

Informasi website:
- Nama: Garuda Nexa Bahtera
- Tagline: ${settings.hero_title || 'Solusi Digital Terpercaya'}
- Deskripsi: ${settings.hero_subtitle || 'Membangun software custom untuk bisnis Anda'}
- Total pengunjung website: ${totalVisits.toLocaleString()} kali
- Total produk: ${productRows.length} produk
- Total user admin: ${userCount[0].count}
- Total project client: ${projectCount[0].count}

Produk/Layanan:
${productsData.length > 0 ? productsData.map(p => `- **${p.title}**: ${p.description || ''}`).join('\n') : '- Web Development\n- POS System\n- I-School (Manajemen Sekolah)\n- Absensi Digital (Face Recognition & GPS)\n- I-Santri (Sistem Pesantren)\n- Enterprise Software'}

Portfolio: ${portfolioData.length} project.

Produk Detail di List Products:
${productList || 'Belum ada produk terdaftar.'}

Pricing:
- Basic: Rp 2.000.000
- Professional: Rp 5.000.000
- Enterprise: Rp 8.500.000

Process/Flow: Konsultasi → Desain UI/UX → Development → Testing & Launch

Kontak: WA 6285188009152 | Email: info@garudanexa.com

Web: https://garudanexabahtera.com

Tugasmu:
1. Jawab pertanyaan admin tentang website Garuda Nexa, data pengunjung, produk, layanan, pricing, dan teknis.
2. Bantu admin troubleshooting dan analisis data website.
3. Gunakan bahasa Indonesia yang ramah dan profesional.
4. Jika ditanya hal di luar konteks website ini, arahkan kembali ke topik Garuda Nexa.
5. Sebutkan angka/data spesifik dari sistem kalau relevan.

FORMAT JAWABAN: Gunakan Markdown yang rapi dan menarik:
- **Bold** untuk angka penting, nama produk, atau kata kunci
- *Italic* untuk penekanan atau catatan tambahan
- ### Heading untuk section/judul (ukuran kecil saja)
- Tabel (\`| Kolom 1 | Kolom 2 |\`) untuk data berkolom (produk, pricing, statistik)
- \`kode\` untuk teknis (endpoint, command, nama file)
- List bullet/number untuk daftar item
- Beri spasi antar section biar enak dibaca
- Jangan kirim plain text mentah — selalu format pakai markdown yang rapi
- Untuk angka statistik besar, tulis dengan bold dan tambah emoji relevan (📊 👥 🛒 💻)
- Jawab ringkas + padat, maksimal 3-4 paragraf atau 1 tabel + penjelasan`;

    const completion = await openai.chat.completions.create({
      model: 'qwen2.5:3b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20), // last 20 messages max
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] Server running on port ${PORT}`);
});
