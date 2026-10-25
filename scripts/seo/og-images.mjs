#!/usr/bin/env node
// Kartu Open Graph 1200×630 dan ikon situs Garuda Nexa (docs/platform/SEO-PLAN.md §5.3 langkah 8–9, keputusan default 7).
//
// Dibuat SEKALI lalu di-commit (bukan saat deploy): public/og/*.jpg, public/favicon.ico, public/apple-touch-icon.png,
// public/icon-192.png, public/icon-512.png, public/site.webmanifest, public/brand/logo-512.png, dan daftar kartu di
// src/seo/ogCards.generated.ts (dibaca getHead; kartu yang tidak ada → default.jpg).
// Tanpa dependensi baru: HTML kartu dirender headless Chrome/Edge lewat DevTools Protocol (WebSocket bawaan Node ≥ 22).
// Kartu tidak memuat harga (supaya tidak basi). Nama, kategori dan pratinjau template diambil dari API saat skrip jalan.
//
// Pakai (lihat docs/platform/SEO-RUNBOOK.md):
//   node scripts/seo/og-images.mjs                         # data dari https://garudanexa.com (PRERENDER_API / --api)
//   node scripts/seo/og-images.mjs --api http://127.0.0.1:8000
//   node scripts/seo/og-images.mjs --only icons            # ikon saja; --only cards = kartu saja
//   CHROME_PATH=... node scripts/seo/og-images.mjs         # bila Chrome/Edge tidak ditemukan otomatis
// Untuk prerender/deploy (WP2): buildOgImages({ templates, outDir, publicDir }) hanya memeriksa kartu yang belum ada dan
// memberi peringatan (kepala halamannya otomatis memakai default.jpg); jalankan skrip ini lalu commit untuk membuatnya.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** Batas ukuran kartu (rencana: ≤ 150 KB); target sedikit di bawahnya. */
export const OG_MAX_BYTES = 150 * 1024;
const OG_TARGET_BYTES = 140 * 1024;

/** Slug halaman kategori (sama dengan CATEGORY_SLUGS di src/seo/paths.ts). */
export const CATEGORY_SLUGS = ['company-profile', 'kecantikan-klinik', 'olahraga-komunitas', 'fintech-startup', 'yoga-wellness', 'toko-online', 'sekolah-pendidikan'];

const BRAND = {
  primary: '#211FFE',
  brand50: '#EEEEFF',
  brand100: '#DFDEFF',
  brand200: '#C2C1FF',
  fg: '#121620',
  muted: '#4B5262',
  subtle: '#697181',
  line: '#E3E6EE',
  alt: '#F7F8FB',
};

/** Path sayap Garuda Nexa, dibaca dari src/components/ui/LogoMark.tsx (WINGS_PATH, viewBox 0 0 257 156). */
export function readWingsPath(root = ROOT) {
  const source = readFileSync(join(root, 'src', 'components', 'ui', 'LogoMark.tsx'), 'utf8');
  const match = /WINGS_PATH\s*=\s*'([^']+)'/.exec(source);
  if (!match) throw new Error('WINGS_PATH tidak ditemukan di src/components/ui/LogoMark.tsx');
  return match[1];
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** "Kecantikan & Klinik" → "kecantikan-klinik" bila slug itu halaman kategori, selain itu null (= src/seo/templateSeo.ts). */
export function categorySlugOf(category) {
  const slug = String(category ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return CATEGORY_SLUGS.includes(slug) ? slug : null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Template terbit dengan slug sah, urut sort_order. */
export function publishedTemplates(templates) {
  return (Array.isArray(templates) ? templates : [])
    .filter((t) => t && typeof t.slug === 'string' && SLUG.test(t.slug) && t.status !== 'draft')
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

const HUB_CARD_NAMES = ['default', 'catalog', 'jasa-website', 'jasa-aplikasi', 'harga', 'panduan', 'tentang', 'kontak'];

/** Nama semua kartu yang seharusnya ada untuk data ini (tanpa .jpg). */
export function expectedCards(templates) {
  const list = publishedTemplates(templates);
  const categories = CATEGORY_SLUGS.filter((slug) => list.some((t) => categorySlugOf(t.category) === slug));
  return [...HUB_CARD_NAMES, ...categories.map((slug) => `kategori-${slug}`), ...list.map((t) => `template-${t.slug}`)];
}

// ─── HTML kartu ────────────────────────────────────────────────────────────────────────────────────────────────────

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">';

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${OG_WIDTH}px;height:${OG_HEIGHT}px;overflow:hidden;background:#fff}
body{font-family:Inter,"Segoe UI",Arial,sans-serif;color:${BRAND.fg};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.wings{display:block;fill:currentColor}
`;

const wingsSvg = (wings, height, color) =>
  `<svg class="wings" viewBox="0 0 257 156" style="height:${height}px;width:${(height * 257) / 156}px;color:${color}" aria-hidden="true"><path d="${wings}"/></svg>`;

const page = (body, css) =>
  `<!doctype html><html lang="id"><head><meta charset="utf-8">${FONT_LINK}<style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`;

/** Bingkai jendela browser datar berisi tangkapan layar (pratinjau template 1600×1000). */
const frame = (src, { x, y, w }) => `
<div class="frame" style="left:${x}px;top:${y}px;width:${w}px">
  <div class="bar"><i></i><i></i><i></i></div>
  <div class="shot" style="height:${Math.round(w * 0.625) - 28}px;background-image:url('${src}')"></div>
</div>`;

const HUB_CSS = `
.card{position:relative;width:${OG_WIDTH}px;height:${OG_HEIGHT}px;overflow:hidden;background:#fff}
.glow{position:absolute;right:-220px;top:-260px;width:980px;height:980px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(33,31,254,.16),rgba(33,31,254,.06) 55%,rgba(33,31,254,0) 100%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(${BRAND.line} 1.6px,transparent 1.7px);background-size:28px 28px;
  -webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 55%,#000 100%);opacity:.9}
.left{position:absolute;left:72px;top:64px;bottom:60px;width:var(--text-w);display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;letter-spacing:-.03em;color:${BRAND.fg}}
.brand small{font-weight:600;color:${BRAND.subtle};font-size:30px}
.text{margin-top:auto;margin-bottom:auto}
.eyebrow{font-size:22px;font-weight:600;color:${BRAND.primary};letter-spacing:.02em}
h1{margin-top:14px;font-size:var(--h1);line-height:1.07;font-weight:700;letter-spacing:-.035em;color:${BRAND.fg}}
h1 em{font-style:normal;color:${BRAND.primary}}
.sub{margin-top:20px;font-size:25px;line-height:1.4;color:${BRAND.muted};font-weight:500}
.url{font-size:21px;font-weight:600;color:${BRAND.subtle};letter-spacing:-.01em}
.frame{position:absolute;background:#fff;border-radius:20px;box-shadow:0 0 0 1.5px ${BRAND.line},0 24px 60px -24px rgba(18,22,32,.28);overflow:hidden}
.frame .bar{height:28px;display:flex;align-items:center;gap:7px;padding:0 14px;background:${BRAND.alt};border-bottom:1.5px solid ${BRAND.line}}
.frame .bar i{width:10px;height:10px;border-radius:50%;background:${BRAND.line};display:block}
.shot{background-size:cover;background-position:top center}
.mark{position:absolute;right:96px;top:50%;transform:translateY(-50%);width:360px;height:360px;border-radius:84px;background:${BRAND.brand50};
  box-shadow:inset 0 0 0 1.5px ${BRAND.brand100};display:flex;align-items:center;justify-content:center;color:${BRAND.primary}}
`;

/**
 * Kartu halaman hub: logo + teks di kiri, visual di kanan (tangkapan layar template atau lambang sayap).
 * `shots` = path file pratinjau (file://), maksimal 2.
 */
function hubCard({ wings, eyebrow, headline, sub, shots = [] }) {
  const withShots = shots.length > 0;
  const visual = withShots
    ? shots.length > 1
      ? frame(shots[1], { x: 770, y: 46, w: 560 }) + frame(shots[0], { x: 660, y: 218, w: 600 })
      : frame(shots[0], { x: 640, y: 120, w: 640 })
    : `<div class="mark">${wingsSvg(wings, 150, BRAND.primary)}</div>`;
  const css = `${HUB_CSS}:root{--text-w:${withShots ? 560 : 640}px;--h1:${withShots ? 52 : 58}px}`;
  return page(
    `<div class="card"><div class="glow"></div><div class="dots"></div>${visual}
      <div class="left">
        <div class="brand">${wingsSvg(wings, 30, BRAND.primary)}<span>Garuda Nexa <small>Bahtera</small></span></div>
        <div class="text">
          <p class="eyebrow">${escapeHtml(eyebrow)}</p>
          <h1>${headline}</h1>
          <p class="sub">${escapeHtml(sub)}</p>
        </div>
        <p class="url">garudanexa.com</p>
      </div></div>`,
    css,
  );
}

const TEMPLATE_CSS = `
.card{position:relative;width:${OG_WIDTH}px;height:${OG_HEIGHT}px;overflow:hidden;background:${BRAND.alt}}
.shot{position:absolute;left:0;top:0;width:${OG_WIDTH}px;height:516px;background-size:cover;background-position:top center}
.brandbar{position:absolute;left:0;right:0;bottom:0;height:114px;background:${BRAND.primary};color:#fff;display:flex;align-items:center;
  justify-content:space-between;padding:0 56px;gap:40px}
.name{font-size:42px;font-weight:700;letter-spacing:-.03em;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.niche{margin-top:6px;font-size:22px;font-weight:500;color:${BRAND.brand100};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who{min-width:0}
.logo{display:flex;align-items:center;gap:12px;font-size:26px;font-weight:700;letter-spacing:-.03em;flex-shrink:0;text-align:right}
.logo small{display:block;font-size:17px;font-weight:500;color:${BRAND.brand200};letter-spacing:0}
`;

/** Kartu template: tangkapan layar beranda template + bilah merek berisi nama dan niche (tanpa harga). */
function templateCardHtml({ wings, name, niche, shot }) {
  return page(
    `<div class="card"><div class="shot" style="background-image:url('${shot}')"></div>
      <div class="brandbar">
        <div class="who"><p class="name">${escapeHtml(name)}</p><p class="niche">${escapeHtml(niche)}</p></div>
        <div class="logo">${wingsSvg(wings, 34, '#fff')}<span>Garuda Nexa<small>garudanexa.com</small></span></div>
      </div></div>`,
    TEMPLATE_CSS,
  );
}

/** Ikon: sayap di tengah kanvas persegi. `background` null = transparan. `inset` = jarak tepi (proporsi sisi). */
function iconHtml({ wings, size, background, inset }) {
  const width = size * (1 - inset * 2);
  const height = (width * 156) / 257;
  return page(
    `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${background ?? 'transparent'}">
      <svg viewBox="0 0 257 156" style="width:${width}px;height:${height}px" aria-hidden="true"><path fill="${BRAND.primary}" d="${wings}"/></svg>
    </div>`,
    `html,body{width:${size}px;height:${size}px;background:transparent}`,
  );
}

const lower = (value) => String(value ?? '').trim();

/** Teks semua kartu hub & kategori. Tidak ada harga; kategori dan template dari data. */
export function hubCardSpecs(templates) {
  const list = publishedTemplates(templates);
  const categories = [...new Set(list.map((t) => lower(t.category)).filter(Boolean))];
  const previewOf = (t) => t.__previewFile;
  const shots = (items) => items.map(previewOf).filter(Boolean).slice(0, 2);
  const specs = [
    {
      name: 'default',
      eyebrow: 'Template website & jasa custom',
      headline: 'Template website siap pakai, termasuk <em>domain &amp; hosting</em>',
      sub: 'Bayar online via Midtrans, kelola isi lewat CMS. Juga jasa website & aplikasi Android/iOS custom.',
      shots: shots(list.slice(0, 2)),
    },
    {
      name: 'catalog',
      eyebrow: 'Katalog template',
      headline: 'Template website <em>siap pakai</em>',
      // Nama kategori tidak dipotong di tengah ("Yoga &" / "Wellness"); baris hanya pindah di antara kategori
      sub: categories.length ? categories.map((c) => c.replace(/ /g, '\u00a0')).join(' · ') : 'Lihat demo, pesan, dan bayar online.',
      shots: shots(list.slice(-2)),
    },
    {
      name: 'jasa-website',
      eyebrow: 'Jasa custom',
      headline: 'Jasa pembuatan <em>website custom</em>',
      sub: 'Untuk perusahaan, sekolah, instansi & UMKM. Konsultasi gratis, penawaran jelas sebelum mulai.',
    },
    {
      name: 'jasa-aplikasi',
      eyebrow: 'Jasa custom',
      headline: 'Jasa pembuatan aplikasi <em>Android &amp; iOS</em>',
      sub: 'Sesuai alur bisnis Anda: kasir, absensi, manajemen sekolah & lainnya. Konsultasi gratis.',
    },
    {
      name: 'harga',
      eyebrow: 'Harga',
      headline: 'Harga template website &amp; <em>jasa website</em>',
      sub: 'Harga template tertera, sudah termasuk domain, hosting & SSL tahun pertama. Custom lewat penawaran.',
    },
    {
      name: 'panduan',
      eyebrow: 'Panduan',
      headline: 'Panduan website <em>untuk bisnis</em>',
      sub: 'Biaya, domain & hosting, template vs custom, dan checklist konten website.',
    },
    {
      name: 'tentang',
      eyebrow: 'Tentang kami',
      headline: 'Tentang <em>Garuda Nexa</em>',
      sub: 'PT Garuda Nexa Bahtera: template website siap pakai serta jasa pembuatan website & aplikasi mobile custom.',
    },
    {
      name: 'kontak',
      eyebrow: 'Kontak',
      headline: 'Hubungi <em>Garuda Nexa</em>',
      sub: 'Tanya template atau konsultasi website & aplikasi custom gratis, lewat WhatsApp atau email.',
    },
  ];
  for (const slug of CATEGORY_SLUGS) {
    const items = list.filter((t) => categorySlugOf(t.category) === slug);
    if (items.length === 0) continue;
    specs.push({
      name: `kategori-${slug}`,
      eyebrow: 'Kategori template',
      headline: `Template website <em>${escapeHtml(lower(items[0].category))}</em>`,
      sub: 'Siap pakai, sudah termasuk domain, hosting & SSL tahun pertama. Lihat demonya.',
      shots: shots(items),
    });
  }
  return specs;
}

// ─── Headless Chrome (DevTools Protocol) ───────────────────────────────────────────────────────────────────────────

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`CHROME_PATH tidak ada: ${fromEnv}`);
    return fromEnv;
  }
  const found = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!found) throw new Error('Chrome/Edge tidak ditemukan. Set CHROME_PATH ke chrome.exe / msedge.exe.');
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8'));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: ok, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else ok(msg.result);
      } else if (msg.method) {
        for (const listener of [...this.listeners]) listener(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((ok, reject) => this.pending.set(id, { resolve: ok, reject }));
  }

  once(method, sessionId, timeoutMs = 30000) {
    return new Promise((ok, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((l) => l !== listener);
        reject(new Error(`Timeout menunggu ${method}`));
      }, timeoutMs);
      const listener = (msg) => {
        if (msg.method !== method || (sessionId && msg.sessionId !== sessionId)) return;
        clearTimeout(timer);
        this.listeners = this.listeners.filter((l) => l !== listener);
        ok(msg.params);
      };
      this.listeners.push(listener);
    });
  }
}

/** Jalankan Chrome headless; kembalikan { render(html, opts), close() }. */
export async function launchRenderer({ tmpRoot = process.env.OG_TMP_DIR || tmpdir() } = {}) {
  if (typeof WebSocket === 'undefined') throw new Error('Butuh Node ≥ 22 (WebSocket bawaan).');
  mkdirSync(tmpRoot, { recursive: true });
  const workDir = mkdtempSync(join(tmpRoot, 'gn-og-'));
  const profile = join(workDir, 'profile');
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--force-color-profile=srgb',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) {
    chrome.kill();
    throw new Error('Chrome tidak membuka DevTools (DevToolsActivePort tidak muncul).');
  }
  let lines = [];
  for (let i = 0; i < 50 && lines.length < 2; i++) {
    lines = readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    if (lines.length < 2) await sleep(100);
  }
  const ws = new WebSocket(`ws://127.0.0.1:${lines[0]}${lines[1]}`);
  await new Promise((ok, reject) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => reject(new Error('Gagal terhubung ke DevTools Chrome')), { once: true });
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  let counter = 0;

  async function render(html, { width, height, format = 'png', quality, transparent = false }) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send(
      'Emulation.setDefaultBackgroundColorOverride',
      transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {},
      sessionId,
    );
    const file = join(workDir, `card-${counter++}.html`);
    writeFileSync(file, html, 'utf8');
    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await cdp.send('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
    await loaded;
    const { result } = await cdp.send(
      'Runtime.evaluate',
      {
        expression:
          'document.fonts.ready.then(() => Promise.all([...document.querySelectorAll("img")].map((i) => i.decode().catch(() => null))))' +
          '.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))' +
          '.then(() => document.fonts.check("700 40px Inter"))',
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    const shot = await cdp.send(
      'Page.captureScreenshot',
      { format, ...(quality ? { quality } : {}), clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: false },
      sessionId,
    );
    return { buffer: Buffer.from(shot.data, 'base64'), interLoaded: result?.value === true };
  }

  async function close() {
    try {
      await Promise.race([cdp.send('Browser.close'), sleep(3000)]);
    } catch {
      // Chrome sudah tertutup
    }
    ws.close();
    chrome.kill();
    for (let i = 0; i < 20; i++) {
      try {
        rmSync(workDir, { recursive: true, force: true });
        break;
      } catch {
        await sleep(250); // Windows: berkas profil masih dikunci sebentar
      }
    }
  }

  return { render, close };
}

// ─── Penulisan berkas ──────────────────────────────────────────────────────────────────────────────────────────────

/** Ukuran gambar dari header PNG/JPEG (tanpa dependensi), untuk verifikasi. */
export function imageSize(buffer) {
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) return { type: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) return null;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpeg', height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}

/** ICO berisi PNG (didukung semua browser modern) dari beberapa ukuran. */
export function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, png } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)]);
}

async function renderJpegUnderLimit(renderer, html) {
  let last = null;
  for (const quality of [88, 84, 80, 76, 72, 68, 64, 60, 55, 50]) {
    last = await renderer.render(html, { width: OG_WIDTH, height: OG_HEIGHT, format: 'jpeg', quality });
    if (last.buffer.length <= OG_TARGET_BYTES) return { ...last, quality };
  }
  if (last.buffer.length > OG_MAX_BYTES) throw new Error(`Kartu OG > ${OG_MAX_BYTES} byte bahkan di kualitas 50`);
  return { ...last, quality: 50 };
}

/** Path file pratinjau template di public/ (preview_image raster), atau null. */
function previewFile(template, publicDir) {
  // Query versi (?v=…, src/seo/assetVersion.ts) dibuang: yang dicari berkasnya di public/
  const preview = String(template.preview_image ?? '').replace(/[?#].*$/, '');
  const candidates = [preview, `/assets/templates/${template.slug}-preview.webp`]
    .filter((p) => typeof p === 'string' && /^\/[^?#]+\.(webp|png|jpe?g)$/i.test(p.trim()))
    .map((p) => join(publicDir, ...p.trim().slice(1).split('/')));
  const file = candidates.find((path) => existsSync(path));
  return file ? pathToFileURL(file).href : null;
}

const MANIFEST_HEADER =
  '// DIBUAT OTOMATIS oleh scripts/seo/og-images.mjs. Jangan diedit manual: jalankan ulang skripnya.\n' +
  '// Daftar kartu Open Graph yang ada di public/og/{nama}.jpg (1200×630). Dipakai src/seo/og.ts.\n';

/** Tulis src/seo/ogCards.generated.ts dari isi public/og/. */
export function writeCardManifest({ root = ROOT, publicDir = join(root, 'public') } = {}) {
  const dir = join(publicDir, 'og');
  const names = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /^[a-z0-9-]+\.jpg$/.test(f))
        .map((f) => f.replace(/\.jpg$/, ''))
        .sort()
    : [];
  const body = names.length ? `[\n${names.map((n) => `  '${n}',`).join('\n')}\n]` : '[]';
  writeFileSync(join(root, 'src', 'seo', 'ogCards.generated.ts'), `${MANIFEST_HEADER}export const OG_CARDS: readonly string[] = ${body};\n`, 'utf8');
  return names;
}

/** Render semua kartu OG ke {publicDir}/og (atau hanya `only`). */
export async function renderCards({ templates, publicDir = join(ROOT, 'public'), renderer, only, log = console }) {
  const wings = readWingsPath();
  const outDir = join(publicDir, 'og');
  mkdirSync(outDir, { recursive: true });
  const list = publishedTemplates(templates).map((t) => ({ ...t, __previewFile: previewFile(t, publicDir) }));
  const jobs = [
    ...hubCardSpecs(list).map((spec) => ({ name: spec.name, html: hubCard({ wings, ...spec }) })),
    ...list
      .filter((t) => t.__previewFile)
      .map((t) => ({
        name: `template-${t.slug}`,
        html: templateCardHtml({ wings, name: t.name, niche: `Template website ${lower(t.category) || 'siap pakai'}`, shot: t.__previewFile }),
      })),
  ];
  for (const t of list.filter((x) => !x.__previewFile)) log.warn(`[og] ${t.slug}: pratinjau raster tidak ada di public/, kartu dilewati (pakai default.jpg)`);
  const written = [];
  for (const job of jobs) {
    if (only && !only.includes(job.name)) continue;
    const { buffer, quality, interLoaded } = await renderJpegUnderLimit(renderer, job.html);
    if (!interLoaded) log.warn(`[og] ${job.name}: font Inter tidak termuat (offline?), memakai font cadangan`);
    writeFileSync(join(outDir, `${job.name}.jpg`), buffer);
    written.push({ name: job.name, bytes: buffer.length, quality });
    log.log(`[og] og/${job.name}.jpg  ${(buffer.length / 1024).toFixed(1)} KB  q${quality}`);
  }
  return written;
}

const WEB_MANIFEST = {
  name: 'Garuda Nexa',
  short_name: 'Garuda Nexa',
  description: 'Template website siap pakai serta jasa pembuatan website dan aplikasi mobile custom.',
  lang: 'id',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'browser',
  background_color: '#ffffff',
  theme_color: '#ffffff',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
};

/** favicon.ico (16/32/48), apple-touch-icon.png (180), icon-192/512.png, brand/logo-512.png, site.webmanifest. */
export async function renderIcons({ publicDir = join(ROOT, 'public'), renderer, log = console }) {
  const wings = readWingsPath();
  const png = async (size, background, inset) =>
    (await renderer.render(iconHtml({ wings, size, background, inset }), { width: size, height: size, format: 'png', transparent: !background }))
      .buffer;
  const ico = buildIco([
    { size: 16, png: await png(16, null, 0) },
    { size: 32, png: await png(32, null, 0) },
    { size: 48, png: await png(48, null, 0.02) },
  ]);
  const files = {
    'favicon.ico': ico,
    'apple-touch-icon.png': await png(180, '#ffffff', 0.15),
    'icon-192.png': await png(192, '#ffffff', 0.15),
    'icon-512.png': await png(512, '#ffffff', 0.15),
    'brand/logo-512.png': await png(512, null, 0.06),
    'site.webmanifest': Buffer.from(`${JSON.stringify(WEB_MANIFEST, null, 2)}\n`, 'utf8'),
  };
  mkdirSync(join(publicDir, 'brand'), { recursive: true });
  for (const [name, buffer] of Object.entries(files)) {
    writeFileSync(join(publicDir, ...name.split('/')), buffer);
    log.log(`[icons] ${name}  ${(buffer.length / 1024).toFixed(1)} KB`);
  }
  return Object.keys(files);
}

/**
 * Untuk prerender/deploy (kontrak SEO-PLAN §4): periksa kartu yang seharusnya ada untuk data ini. Kartu dibuat dan
 * di-commit lewat CLI skrip ini, jadi di sini hanya peringatan; kepala halaman tanpa kartu memakai default.jpg.
 * `render: true` membuat kartu yang belum ada langsung ke publicDir (butuh Chrome), lalu memperbarui daftar kartu.
 */
export async function buildOgImages({ templates, outDir, publicDir = join(ROOT, 'public'), render = false, log = console } = {}) {
  void outDir; // kartu ikut tersalin bersama public/ oleh skrip deploy
  const expected = expectedCards(templates);
  const missing = expected.filter((name) => !existsSync(join(publicDir, 'og', `${name}.jpg`)));
  if (missing.length && render) {
    const renderer = await launchRenderer();
    try {
      await renderCards({ templates, publicDir, renderer, only: missing, log });
    } finally {
      await renderer.close();
    }
    writeCardManifest({ publicDir });
    return { expected, missing: [] };
  }
  if (missing.length) {
    log.warn(
      `[og] ${missing.length} kartu OG belum ada (${missing.join(', ')}); halamannya memakai og/default.jpg. ` +
        'Buat dengan: node scripts/seo/og-images.mjs, lalu commit public/og dan src/seo/ogCards.generated.ts.',
    );
  }
  return { expected, missing };
}

async function fetchTemplates(api) {
  const url = `${api.replace(/\/+$/, '')}/api.php?action=get_templates`;
  const res = await fetch(url, { headers: { 'User-Agent': 'GarudaNexaOgImages/1.0', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body?.templates)) throw new Error(`${url}: respons tanpa daftar templates`);
  return body.templates;
}

function parseArgs(argv) {
  const args = { api: process.env.PRERENDER_API || 'https://garudanexa.com', only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--api') args.api = argv[++i];
    else if (argv[i] === '--only') args.only = argv[++i];
    else if (argv[i] === '--tmp') process.env.OG_TMP_DIR = argv[++i];
    else throw new Error(`Argumen tidak dikenal: ${argv[i]}`);
  }
  if (args.only && !['icons', 'cards'].includes(args.only)) throw new Error('--only harus "icons" atau "cards"');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const renderer = await launchRenderer();
  try {
    if (args.only !== 'cards') await renderIcons({ renderer });
    if (args.only !== 'icons') {
      const templates = await fetchTemplates(args.api);
      console.log(`[og] ${publishedTemplates(templates).length} template dari ${args.api}`);
      await renderCards({ templates, renderer });
      const names = writeCardManifest();
      console.log(`[og] src/seo/ogCards.generated.ts: ${names.length} kartu`);
    }
  } finally {
    await renderer.close();
  }
  // Verifikasi akhir: ukuran & dimensi
  const dir = join(ROOT, 'public', 'og');
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    const buffer = readFileSync(join(dir, file));
    const size = imageSize(buffer);
    if (!size || size.width !== OG_WIDTH || size.height !== OG_HEIGHT || statSync(join(dir, file)).size > OG_MAX_BYTES) {
      throw new Error(`public/og/${file}: harus JPEG ${OG_WIDTH}×${OG_HEIGHT} ≤ ${OG_MAX_BYTES} byte`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
