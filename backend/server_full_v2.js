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
  apiKey: 'ollama', 
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

// ── API Routes (GET) ──
app.get('/api.php', async (req, res) => {
  const action = req.query.action;

  try {
    if (action === 'get_settings') {
      const [rows] = await pool.query('SELECT setting_key, setting_value FROM hero_settings');
      const settings = {};
      for (const row of rows) settings[row.setting_key] = row.setting_value;
      return res.json(settings);
    }

    if (action === 'get_users') {
      const [rows] = await pool.query('SELECT id, name, email, phone, role, status, avatar FROM users ORDER BY id DESC');
      return res.json(rows);
    }

    if (action === 'get_documents') {
      const [rows] = await pool.query('SELECT * FROM documents ORDER BY type DESC, name ASC');
      return res.json({ success: true, data: rows });
    }

    if (action === 'get_projects') {
      const [rows] = await pool.query('SELECT * FROM project_client ORDER BY id DESC');
      return res.json(rows);
    }

    if (action === 'get_visitor_stats') {
      const [[statsRow]] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
      return res.json({ total_visits: statsRow ? statsRow.total_visits : 0 });
    }

    if (action === 'get_visitor_details') {
      const [[statsRow]] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
      const [deviceRows] = await pool.query('SELECT device as label, COUNT(*) as value FROM visitor_logs GROUP BY device');
      const [browserRows] = await pool.query('SELECT browser as label, COUNT(*) as value FROM visitor_logs GROUP BY browser');
      return res.json({
        total_visits: statsRow ? statsRow.total_visits : 0,
        devices: deviceRows,
        browsers: browserRows
      });
    }

    if (action === 'check_website') {
      const url = req.query.url;
      try {
        const start = Date.now();
        const response = await fetch(url);
        const responseTime = Date.now() - start;
        return res.json({ 
          status: response.ok || response.status < 500 ? 'online' : 'offline',
          responseTime,
          httpStatus: response.status
        });
      } catch (err) {
        return res.json({ status: 'offline', responseTime: 0, httpStatus: 0 });
      }
    }

    res.status(400).json({ error: 'Invalid GET action: ' + action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API Routes (POST) ──
app.post('/api.php', async (req, res) => {
  const { action, ...input } = req.body;
  
  try {
    switch (action) {
      case 'login': {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [input.email]);
        if (rows.length === 0) return res.json({ error: 'Email tidak ditemukan' });
        const user = rows[0];
        const valid = bcrypt.compareSync(input.password, user.password);
        if (!valid) return res.json({ error: 'Password salah' });
        const { password, ...safeUser } = user;
        return res.json({ success: true, user: safeUser });
      }

      case 'add_project': {
        const { name, client_name, client_email, client_phone, service_type, status, price, start_date, end_date, image, project_files, description, assigned_user } = input;
        const [result] = await pool.query(
          'INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, price, start_date, end_date, image, project_files, description, assigned_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, client_name, client_email, client_phone, service_type, status, price, start_date, end_date, image, project_files, description, assigned_user]
        );
        return res.json({ success: true, id: result.insertId });
      }

      case 'update_project': {
        const { id, name, client_name, client_email, client_phone, service_type, status, price, start_date, end_date, image, project_files, description, assigned_user } = input;
        await pool.query(
          'UPDATE project_client SET name=?, client_name=?, client_email=?, client_phone=?, service_type=?, status=?, price=?, start_date=?, end_date=?, image=?, project_files=?, description=?, assigned_user=? WHERE id=?',
          [name, client_name, client_email, client_phone, service_type, status, price, start_date, end_date, image, project_files, description, assigned_user, id]
        );
        return res.json({ success: true });
      }

      case 'delete_project': {
        await pool.query('DELETE FROM project_client WHERE id = ?', [input.id]);
        return res.json({ success: true });
      }

      case 'get_products': {
        const [rows] = await pool.query('SELECT id, logo FROM list_products');
        return res.json(rows);
      }

      case 'update_product_logo': {
        const { id, logo } = input;
        console.log('API call: update_product_logo', { id, logoSize: logo?.length });
        
        if (!id) return res.status(400).json({ success: false, error: 'ID produk tidak disertakan' });
        if (!logo) return res.status(400).json({ success: false, error: 'Data logo tidak ditemukan' });

        let finalLogoPath = logo;

        try {
          if (logo && logo.includes('data:')) {
            const logoDir = join(ASSETS_DIR, 'logo-product');
            if (!existsSync(logoDir)) mkdirSync(logoDir, { recursive: true });
            
            const base64Data = logo.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const mimeMatch = logo.match(/^data:(image\/\w+);base64,/);
            const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'png';
            const fileName = `logo_${Date.now()}.${ext}`;
            const fullPath = join(logoDir, fileName);
            
            writeFileSync(fullPath, buffer);
            finalLogoPath = `/assets/logo-product/${fileName}`;
            console.log('File written successfully to:', fullPath);
          }

          const [result] = await pool.query('UPDATE list_products SET logo = ? WHERE id = ?', [finalLogoPath, id]);
          console.log('Database updated, affected rows:', result.affectedRows);
          
          if (result.affectedRows === 0) {
             return res.status(404).json({ success: false, error: 'Produk dengan ID ' + id + ' tidak ditemukan di database' });
          }

          return res.json({ success: true, logo: finalLogoPath });
        } catch (err) {
          console.error('Error in update_product_logo:', err);
          return res.status(500).json({ success: false, error: 'Gagal memproses logo: ' + err.message });
        }
      }

      case 'add_document': {
        const { name, type, size, mime_type, path, parent_id } = input;
        let finalPath = path;
        if (type === 'file' && path && path.includes('data:')) {
          const docDir = join(ASSETS_DIR, 'documents');
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
        return res.json({ success: true, id: result.insertId, path: finalPath });
      }

      case 'delete_document': {
        await pool.query('DELETE FROM documents WHERE id = ? OR parent_id = ?', [input.id, input.id]);
        return res.json({ success: true });
      }

      default:
        res.status(400).json({ error: 'Invalid action: ' + action });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai-chat', async (req, res) => {
  const { messages } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'qwen2.5:3b',
      messages: messages.slice(-10),
      temperature: 0.7,
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
