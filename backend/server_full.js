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

    if (action === 'get_visitor_details') {
      const [[statsRow]] = await pool.query('SELECT total_visits FROM visitor_stats WHERE id = 1');
      const totalCount = statsRow ? statsRow.total_visits : 0;
      
      const [deviceRows] = await pool.query('SELECT device as label, COUNT(*) as value FROM visitor_logs GROUP BY device');
      const [browserRows] = await pool.query('SELECT browser as label, COUNT(*) as value FROM visitor_logs GROUP BY browser');
      
      return res.json({
        total_visits: totalCount,
        devices: deviceRows,
        browsers: browserRows
      });
    }

    res.status(400).json({ error: 'Invalid GET action' });
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

// ── AI Chat ──
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
