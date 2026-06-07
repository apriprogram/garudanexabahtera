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

  if (action === 'get_documents') {
    try {
      const [rows] = await pool.query('SELECT * FROM documents ORDER BY type DESC, name ASC');
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (action === 'get_settings') {
    try {
      const [rows] = await pool.query('SELECT setting_key, setting_value FROM hero_settings');
      const settings = {};
      for (const row of rows) settings[row.setting_key] = row.setting_value;
      res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }

  if (action === 'get_users') {
    try {
      const [rows] = await pool.query('SELECT id, name, email, phone, role, status, avatar FROM users ORDER BY id DESC');
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }
  
  res.status(400).json({ error: 'Invalid GET action' });
});

// ── API Routes (POST) ──
app.post('/api.php', async (req, res) => {
  const { action, ...input } = req.body;
  
  try {
    switch (action) {
      case 'add_document': {
        const { name, type, size, mime_type, path, parent_id } = input;
        let finalPath = path;
        
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
        await pool.query('DELETE FROM documents WHERE id = ? OR parent_id = ?', [input.id, input.id]);
        res.json({ success: true });
        return;
      }

      default:
        res.status(400).json({ error: 'Invalid action: ' + action });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
