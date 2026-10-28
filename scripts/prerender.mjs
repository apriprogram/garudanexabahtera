// Prerender halaman publik host utama saat deploy (docs/platform/SEO-PLAN.md §5.2). Dipanggil oleh
// scripts/deploy-cpanel.mjs setelah build klien, penyalinan public/ dan API ke OUT:
//
//   1. build SSR src/entry-server.tsx ke DEPLOY_DIR/ssr (di luar OUT, tidak ikut terbit)
//   2. ambil data dari API (PRERENDER_API, default https://garudanexa.com): berurutan, UA GarudaNexaPrerender/1.0,
//      timeout 15 detik, 2× coba ulang. Gagal atau template < MIN_TEMPLATES (default 5) → deploy dibatalkan.
//      Satu-satunya pengecualian: get_guides dengan PRERENDER_GUIDES_BOOTSTRAP=1 (deploy pertama, guidesFetchFallback).
//   3. per rute: head (getHead + renderHeadTags) + HTML aplikasi + <script id="gn-preload"> → OUT/_pre/{path}.html
//   4. OUT/app.html (cangkang noindex untuk rute aplikasi), OUT/404.html (NotFound, noindex)
//   5. sitemap.xml, llms.txt, llms-full.txt (scripts/seo/*.mjs, WP4), OG (opsional, WP3)
//   6. OUT/seo.php + OUT/_pre/seo-fallback.json (cadangan template yang terbit setelah deploy), OUT/site.php +
//      OUT/modules/site_defaults.json (head SEO domain pembeli; kuncinya harus sama dengan registri template)
//   7. daftar rute prerender ditulis ke blok gn-prerender di OUT/.htaccess
//   8. cek kewarasan: tepat 1 <h1>/<title>/canonical per halaman, JSON-LD valid, title unik
//
// strict = deploy sungguhan: semua langkah wajib. strict=false (deploy-cpanel.mjs --build-only) melewati builder
// WP3/WP4 yang belum ada dan menurunkan cek head (canonical, title unik) jadi peringatan, supaya pipeline bisa
// diuji selagi modul paket lain masih stub. Data API tetap wajib di kedua mode.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

export const USER_AGENT = 'GarudaNexaPrerender/1.0';
const FETCH_TIMEOUT_MS = 15_000;
const FETCH_RETRIES = 2;
const SITE_ORIGIN = 'https://garudanexa.com';
const TRACK_GLOBAL = '__GN_RENDERED_MODULES__';
const TRACK_MODULE = '\0gn-track-lazy';
/** Path rute yang boleh diprerender: huruf kecil, angka, "-" dan "/" (dipakai apa adanya di regex .htaccess). */
const ROUTE_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
/** Prefix rute aplikasi (app.html, noindex): tidak pernah diprerender. Sama dengan aturan di deploy/cpanel/htaccess. */
const APP_ROUTE = /^\/(?:akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(?:\/|$)/;
const HTACCESS_BEGIN = '# BEGIN gn-prerender';
const HTACCESS_END = '# END gn-prerender';

const log = (...args) => console.log('[prerender]', ...args);
const warn = (...args) => console.warn('[prerender] PERINGATAN:', ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const posix = (path) => path.split(sep).join('/');
const pick = (object, keys) => Object.fromEntries(keys.map((key) => [key, object[key]]));

// ─── 1. Build SSR ────────────────────────────────────────────────────────────

/**
 * Plugin build SSR: `lazy(() => import('./x'))` dibungkus agar setiap render mencatat modul halaman yang dipakai.
 * Dari catatan itu prerender tahu chunk klien rute tersebut (manifest Vite), lalu main.tsx memuatnya sebelum
 * hydrateRoot. Hanya di bundel SSR; bundel klien tidak berubah.
 */
export function trackLazyPlugin(root) {
  const LAZY_IMPORT = /\blazy\(\s*\(\)\s*=>\s*import\(\s*(['"])([^'"]+)\1\s*\)\s*\)/g;
  return {
    name: 'gn-track-lazy',
    enforce: 'pre',
    resolveId(id) {
      return id === TRACK_MODULE ? id : null;
    },
    load(id) {
      if (id !== TRACK_MODULE) return null;
      return [
        "import { createElement, lazy } from 'react';",
        'export function trackLazy(id, factory) {',
        '  const Lazy = lazy(factory);',
        `  const Tracked = (props) => { globalThis.${TRACK_GLOBAL}?.add(id); return createElement(Lazy, props); };`,
        '  return Tracked;',
        '}',
      ].join('\n');
    },
    async transform(code, id) {
      if (!/\.[jt]sx?$/.test(id) || id.includes('node_modules') || !code.includes('lazy(')) return null;
      const matches = [...code.matchAll(LAZY_IMPORT)];
      if (matches.length === 0) return null;
      let out = '';
      let last = 0;
      for (const match of matches) {
        const resolved = await this.resolve(match[2], id);
        if (!resolved || resolved.external) continue;
        const moduleId = posix(relative(root, resolved.id.split('?')[0]));
        out += code.slice(last, match.index);
        out += `__gnTrackLazy(${JSON.stringify(moduleId)}, () => import(${JSON.stringify(match[2])}))`;
        last = match.index + match[0].length;
      }
      if (last === 0) return null;
      out += code.slice(last);
      return { code: `import { trackLazy as __gnTrackLazy } from ${JSON.stringify(TRACK_MODULE)};\n${out}`, map: null };
    },
  };
}

async function buildServerBundle(root, ssrDir) {
  await build({
    root,
    publicDir: false,
    logLevel: 'warn',
    mode: 'production',
    plugins: [trackLazyPlugin(root)],
    // Bundel berdiri sendiri: DEPLOY_DIR di luar proyek tidak punya node_modules untuk import eksternal
    ssr: { noExternal: true },
    build: { ssr: 'src/entry-server.tsx', outDir: ssrDir, emptyOutDir: true, copyPublicDir: false },
  });
  // Bundel ESM di luar proyek: package.json sendiri supaya Node tidak menebak jenis modulnya
  writeFileSync(join(ssrDir, 'package.json'), JSON.stringify({ type: 'module' }));
  const entry = readdirSync(ssrDir).find((name) => /^entry-server\.m?js$/.test(name));
  if (!entry) throw new Error(`Bundel SSR tidak ditemukan di ${ssrDir}`);
  return import(pathToFileURL(join(ssrDir, entry)).href);
}

// ─── 2. Data API ─────────────────────────────────────────────────────────────

/** GET JSON dengan timeout dan coba ulang. Respons {error} atau status ≠ 200 dianggap gagal. */
export async function fetchJson(url, { fetchImpl = fetch, retries = FETCH_RETRIES, timeoutMs = FETCH_TIMEOUT_MS, retryDelayMs = 1000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await sleep(retryDelayMs * attempt);
    try {
      const res = await fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      // `status` ikut di error akhir: guidesFetchFallback membedakan jawaban HTTP gagal dari timeout/bukan JSON
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`bukan JSON (${text.slice(0, 80).replace(/\s+/g, ' ')}…)`);
      }
      if (body && typeof body === 'object' && !Array.isArray(body) && 'error' in body) throw new Error(`error API: ${body.error}`);
      return body;
    } catch (error) {
      lastError = error;
    }
  }
  throw Object.assign(new Error(`Gagal mengambil ${url} setelah ${retries + 1} percobaan: ${lastError?.message ?? lastError}`), {
    status: lastError?.status,
  });
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Cek bentuk katalog: tidak pernah mempublikasikan katalog kosong atau rusak. */
export function validateCatalog(templatesBody, minTemplates) {
  const list = templatesBody?.templates;
  if (!Array.isArray(list)) throw new Error('get_templates tidak berisi daftar templates');
  for (const tpl of list) {
    if (!tpl || typeof tpl !== 'object') throw new Error('get_templates berisi entri kosong');
    if (typeof tpl.slug !== 'string' || !SLUG.test(tpl.slug) || tpl.slug === 'kategori') throw new Error(`Slug template tidak valid: ${JSON.stringify(tpl.slug)}`);
    if (typeof tpl.name !== 'string' || !tpl.name.trim()) throw new Error(`Template ${tpl.slug} tanpa nama`);
    if (typeof tpl.price !== 'number' || !(tpl.price > 0)) throw new Error(`Template ${tpl.slug} tanpa harga yang valid`);
  }
  const slugs = list.map((tpl) => tpl.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('get_templates berisi slug ganda');
  if (list.length < minTemplates) {
    throw new Error(`Hanya ${list.length} template terbit (minimal ${minTemplates}, atur lewat MIN_TEMPLATES). Deploy dibatalkan.`);
  }
  return slugs;
}

/** Variabel lingkungan untuk deploy pertama artikel panduan dari database (guidesFetchFallback). */
export const GUIDES_BOOTSTRAP_ENV = 'PRERENDER_GUIDES_BOOTSTRAP';

/**
 * Keputusan saat get_guides gagal. Deploy pertama sejak artikel panduan pindah ke database: api.php production yang lama
 * belum mengenal get_guides (aksi tak dikenal → HTTP 401) dan baru mengenalnya setelah deploy ini sendiri terbit.
 * PRERENDER_GUIDES_BOOTSTRAP=1 = pengecualian sadar untuk deploy itu: jawaban HTTP gagal → lanjut dengan daftar panduan
 * kosong (semua artikel seed masih draf) + peringatan. Tanpa flag, atau bila gagalnya bukan jawaban HTTP (timeout,
 * bukan JSON, {error}), deploy dibatalkan dengan penjelasan: artikel tidak pernah dilewati diam-diam.
 * Hasil: { body: pengganti respons get_guides, warning }.
 */
export function guidesFetchFallback(error, { env = process.env } = {}) {
  const reason = error?.message ?? String(error);
  const bootstrap = env[GUIDES_BOOTSTRAP_ENV] === '1';
  if (bootstrap && Number.isInteger(error?.status)) {
    return {
      body: { success: true, guides: [] },
      warning:
        `${reason}. ${GUIDES_BOOTSTRAP_ENV}=1: lanjut tanpa artikel panduan (deploy pertama, api.php production belum ` +
        'mengenal get_guides). Setelah Pull, cek https://garudanexa.com/api.php?action=get_guides, lalu hapus variabel ini dari shell.',
    };
  }
  if (bootstrap) {
    throw new Error(`${reason}. ${GUIDES_BOOTSTRAP_ENV}=1 hanya melewati jawaban HTTP gagal (mis. 401 dari api.php lama), bukan timeout atau respons rusak.`);
  }
  throw new Error(
    `${reason}. Deploy pertama sejak artikel panduan pindah ke database? api.php production yang lama belum mengenal ` +
      'get_guides: jalankan migration 2026-10-24_017_guide_articles.sql di phpMyAdmin, cek tabelnya, lalu deploy sekali ' +
      `dengan ${GUIDES_BOOTSTRAP_ENV}=1 (deploy/cpanel/README.md §1a). Bukan deploy pertama: cek get_guides di API production.`,
  );
}

async function fetchSiteData(apiBase, urls, minTemplates) {
  const base = apiBase.replace(/\/+$/, '');
  const api = {};
  const get = async (url) => {
    log('GET', `${base}${url}`);
    api[url] = await fetchJson(`${base}${url}`);
    return api[url];
  };
  const settings = await get(urls.settings);
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('get_settings bukan objek');
  const navbar = await get(urls.navbar);
  if (!Array.isArray(navbar)) throw new Error('get_navbar_menus bukan daftar');
  const slugs = validateCatalog(await get(urls.templates), minTemplates);
  const projects = await get(urls.projects);
  if (!Array.isArray(projects?.projects)) throw new Error('get_public_projects tidak berisi daftar projects');
  for (const slug of slugs) {
    const body = await get(urls.template(slug));
    if (body?.template?.slug !== slug) throw new Error(`get_template ${slug} mengembalikan template lain`);
  }
  // Artikel panduan terbit (database, dikelola admin): daftar + isi tiap artikel untuk preload halamannya
  let guides;
  try {
    guides = await get(urls.guides);
    if (process.env[GUIDES_BOOTSTRAP_ENV] === '1') {
      warn(`${GUIDES_BOOTSTRAP_ENV}=1 tidak terpakai: get_guides sudah dijawab API. Hapus variabel ini dari shell.`);
    }
  } catch (error) {
    // Deploy pertama (api.php lama tanpa get_guides): lanjut hanya dengan PRERENDER_GUIDES_BOOTSTRAP=1, selain itu batal.
    // Pengganti masuk `api` supaya gn-preload sama dengan data render (daftar kosong), hidrasi tetap cocok.
    const fallback = guidesFetchFallback(error);
    warn(fallback.warning);
    guides = api[urls.guides] = fallback.body;
  }
  if (!Array.isArray(guides?.guides)) throw new Error('get_guides tidak berisi daftar guides');
  // API publik hanya mengirim artikel yang sudah ditinjau manusia (SEO-PLAN §5.8); draf di sini = backend rusak
  const drafts = unreviewedArticles(guides.guides);
  if (drafts.length) throw new Error(`get_guides mengirim artikel yang belum ditinjau (draf): ${drafts.join(', ')}`);
  for (const { slug } of guides.guides) {
    const body = await get(urls.guide(slug));
    if (body?.guide?.slug !== slug) throw new Error(`get_guide ${slug} mengembalikan artikel lain`);
  }
  return { api, slugs };
}

// ─── 3. Halaman ──────────────────────────────────────────────────────────────

/** "/" → "index.html", "/template/finova" → "template/finova.html" (relatif terhadap _pre/). */
export const preFileFor = (path) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);

/** JSON aman di dalam <script>: "<" di-escape supaya "</script>" atau "<!--" di data tidak menutup elemen. */
export const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const HEAD_TAGS_TO_REPLACE = [
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name="description"[^>]*>\s*/gi,
  /<meta\s+name="robots"[^>]*>\s*/gi,
  /<meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*>\s*/gi,
  /<link\s+rel="canonical"[^>]*>\s*/gi,
  /<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi,
];

/** Cangkang index.html tanpa tag head per halaman (title, description, robots, og/twitter, canonical, JSON-LD). */
export function stripPageHead(shell) {
  const end = shell.indexOf('</head>');
  if (end < 0) throw new Error('index.html tanpa </head>');
  let head = shell.slice(0, end);
  for (const pattern of HEAD_TAGS_TO_REPLACE) head = head.replace(pattern, '');
  return head + shell.slice(end);
}

/** Sisipkan tag tepat setelah meta viewport (sebelum stylesheet & script), atau sebelum </head>. */
export function injectHead(shell, tags) {
  if (!tags) return shell;
  const viewport = /<meta\s+name="viewport"[^>]*>/i.exec(shell);
  if (viewport) {
    const at = viewport.index + viewport[0].length;
    return `${shell.slice(0, at)}\n    ${tags.split('\n').join('\n    ')}${shell.slice(at)}`;
  }
  return shell.replace('</head>', `    ${tags}\n  </head>`);
}

const ROOT_DIV = /<div id="root"><\/div>/;

/**
 * React merender ke potongan (bukan dokumen utuh), jadi tag yang biasanya ia taruh di <head> (preload gambar dari
 * <img>, dsb.) muncul di awal HTML aplikasi. Pindahkan ke head; preload yang sudah ada di head tidak digandakan.
 */
export function hoistLeadingTags(appHtml, headTags) {
  const match = /^(?:<(?:link|meta)\b[^>]*>)+/.exec(appHtml);
  if (!match) return { appHtml, headTags };
  const hrefOf = (tag) => /\shref="([^"]*)"/.exec(tag)?.[1];
  const present = new Set([...headTags.matchAll(/<link\b[^>]*>/g)].map(([tag]) => hrefOf(tag)).filter(Boolean));
  const hoisted = (match[0].match(/<(?:link|meta)\b[^>]*>/g) ?? []).filter((tag) => {
    const href = hrefOf(tag);
    if (!href) return true;
    if (present.has(href)) return false;
    present.add(href);
    return true;
  });
  const head = [headTags, ...hoisted].filter(Boolean).join('\n');
  return { appHtml: appHtml.slice(match[0].length), headTags: head };
}

/**
 * Setting lama yang tidak dibaca halaman publik mana pun tetapi berisi fakta basi: paket harga & durasi jasa custom
 * (section "pricing" sudah dihapus, lihat REMOVED_SECTIONS di Navbar.tsx; design.md: jasa custom tanpa angka harga),
 * serta data section produk & proses lama. Tidak ikut gn-preload, supaya HTML mentah yang dibaca crawler AI tidak
 * memuatnya. Server dan klien sama-sama memakai preload yang sudah disaring, jadi hidrasi tetap cocok.
 * __tests__/backend/prerender.test.ts memastikan tidak ada kode publik yang membaca key ini.
 */
export const PRELOAD_OMIT_SETTINGS = [
  'pricing_title',
  'pricing_subtitle',
  'pricing_data',
  'process_data',
  'products_data',
  'products_categories',
];

/** get_settings untuk gn-preload: tanpa PRELOAD_OMIT_SETTINGS. */
export const preloadSettings = (settings) =>
  Object.fromEntries(Object.entries(settings ?? {}).filter(([key]) => !PRELOAD_OMIT_SETTINGS.includes(key)));

/**
 * Batas gambar base64 (data URI, byte) per setting gn-preload sebelum prerender memberi peringatan. Setting ikut ke
 * setiap halaman: sampul proyek lama di portfolio_data (base64 dari halaman admin lama) membuat tiap halaman ~500 KB
 * dan beranda ~1 MB. Tempat gambar adalah file upload; update_settings sudah menyimpan sampul data: sebagai file
 * (backend/modules/portfolio_media.php), jadi sekali Simpan di admin memindahkan yang lama.
 */
export const INLINE_IMAGE_WARN_BYTES = 8 * 1024;
// Data URI base64, juga di JSON yang garis miringnya di-escape (image\/jpeg)
const BASE64_DATA_URI = /data:[\w.+-]+\\?\/[\w.+-]+;base64,[A-Za-z0-9+/=\\]+/gi;

/** Setting gn-preload berisi gambar base64 lebih dari INLINE_IMAGE_WARN_BYTES: [{ key, bytes }]. */
export const inlineImageSettings = (settings) =>
  Object.entries(preloadSettings(settings))
    .map(([key, value]) => ({ key, bytes: (String(value ?? '').match(BASE64_DATA_URI) ?? []).reduce((sum, uri) => sum + uri.length, 0) }))
    .filter(({ bytes }) => bytes > INLINE_IMAGE_WARN_BYTES);

/**
 * get_public_projects untuk gn-preload: hanya proyek yang benar-benar tampil (`select` = presentableProjects, fungsi
 * yang sama dengan Projects.tsx). Proyek berisi teks uji/Lorem ipsum, atau satu-satunya proyek layak (beranda lalu
 * memakai portofolio cadangan), tidak ikut ke HTML mentah yang dibaca crawler AI. Hasil render sama.
 */
export const preloadProjects = (body, select) =>
  body && Array.isArray(body.projects) ? { ...body, projects: select(body.projects) } : body;

/** Halaman utuh: head + isi #root + data preload. */
export function composePage(shell, { headTags: pageHead, appHtml: rawApp, preload }) {
  if (!ROOT_DIV.test(shell)) throw new Error('index.html tanpa <div id="root"></div>');
  const { appHtml, headTags } = hoistLeadingTags(rawApp, pageHead);
  let html = injectHead(stripPageHead(shell), headTags);
  const preloadTag = preload ? `\n    <script id="gn-preload" type="application/json">${scriptJson(preload)}</script>` : '';
  // Fungsi pengganti: "$" di HTML aplikasi tidak boleh dibaca sebagai pola replace
  html = html.replace(ROOT_DIV, () => `<div id="root">${appHtml}</div>${preloadTag}`);
  return html;
}

/** Chunk klien (beserta import statisnya) untuk modul halaman yang dirender, di luar yang sudah dimuat entry. */
export function chunksFor(manifest, moduleIds) {
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  const loaded = new Set();
  const walk = (key, into) => {
    const chunk = manifest[key];
    if (!chunk || into.has(chunk.file)) return;
    into.add(chunk.file);
    for (const dep of chunk.imports ?? []) walk(dep, into);
  };
  if (entryKey) walk(entryKey, loaded);
  const js = new Set();
  const css = new Set();
  for (const id of moduleIds) {
    const found = new Set();
    walk(id, found);
    for (const file of found) if (!loaded.has(file)) js.add(file);
    for (const key of Object.keys(manifest)) {
      if (found.has(manifest[key].file)) for (const sheet of manifest[key].css ?? []) css.add(sheet);
    }
  }
  if (entryKey) for (const sheet of manifest[entryKey].css ?? []) css.delete(sheet);
  return { js: [...js].map((file) => `/${file}`), css: [...css].map((file) => `/${file}`) };
}

const resourceTags = ({ js, css }) =>
  [...css.map((href) => `<link rel="stylesheet" crossorigin href="${href}">`), ...js.map((href) => `<link rel="modulepreload" crossorigin href="${href}">`)].join('\n');

// ─── 4. Cek kewarasan ────────────────────────────────────────────────────────

const count = (html, pattern) => (html.match(pattern) ?? []).length;

/**
 * Masalah satu halaman _pre: [{ level: 'error' | 'head', message }]. 'head' = bergantung WP3 (turun jadi peringatan).
 * `indexable` = robots index,follow: tepat 1 canonical. Halaman publik noindex (mis. /panduan tanpa artikel terbit,
 * kategori dengan < 2 template) sengaja tanpa canonical (src/seo/page.ts), jadi harus 0.
 */
export function checkPage(file, html, { indexable = true } = {}) {
  const problems = [];
  const head = html.slice(0, html.indexOf('</head>'));
  const root = html.slice(html.indexOf('<div id="root">'));
  const h1 = count(root, /<h1[\s>]/g);
  if (h1 !== 1) problems.push({ level: 'error', message: `${file}: ${h1} <h1> (harus tepat 1)` });
  const titles = count(head, /<title>/g);
  if (titles !== 1) problems.push({ level: 'error', message: `${file}: ${titles} <title> (harus tepat 1)` });
  const canonicals = count(head, /<link\s+rel="canonical"/g);
  if (indexable && canonicals !== 1) problems.push({ level: 'head', message: `${file}: ${canonicals} canonical (harus tepat 1)` });
  if (!indexable && canonicals !== 0) problems.push({ level: 'head', message: `${file}: ${canonicals} canonical di halaman noindex (harus 0)` });
  if (!indexable && !/<meta name="robots" content="noindex/.test(head)) {
    problems.push({ level: 'error', message: `${file}: halaman noindex tanpa meta robots noindex` });
  }
  if (count(html, /<title>/g) !== titles) problems.push({ level: 'error', message: `${file}: <title> di luar <head>` });
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch (error) {
      problems.push({ level: 'error', message: `${file}: JSON-LD tidak valid (${error.message})` });
    }
  }
  // <!--$!--> = batas Suspense yang gagal dirender di server (React mengirim fallback); <!--$?--> = belum selesai
  if (/<!--\$[!?]-->/.test(root)) problems.push({ level: 'error', message: `${file}: ada batas Suspense yang tidak selesai dirender` });
  if (root.includes('aria-label="Memuat halaman"')) problems.push({ level: 'error', message: `${file}: berisi spinner fallback` });
  return problems;
}

const titleOf = (html) => /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';

// ─── 5. .htaccess ────────────────────────────────────────────────────────────

/** Rute per RewriteRule di blok gn-prerender: baris tetap pendek berapa pun jumlah halaman (lihat HTACCESS_MAX_LINE). */
export const HTACCESS_ROUTES_PER_RULE = 40;
/**
 * Batas panjang satu baris .htaccess. Apache menolak baris > 8190 karakter ("Line too long") dan seluruh .htaccess
 * gagal: 500 untuk semua halaman, api.php dan domain pembeli. Diberi jarak aman di bawah batas itu.
 */
export const HTACCESS_MAX_LINE = 8000;

/** Isi blok gn-prerender: rute host utama yang punya file _pre (selain "/", yang punya aturan sendiri). */
export function htaccessRoutes(paths) {
  const others = paths.filter((path) => path !== '/').map((path) => path.slice(1)).sort();
  for (const path of others) if (!ROUTE_PATTERN.test(`/${path}`)) throw new Error(`Rute tidak aman untuk .htaccess: /${path}`);
  const lines = [
    `  ${HTACCESS_BEGIN} (diisi scripts/prerender.mjs: ${paths.length} halaman)`,
    '  RewriteCond %{HTTP_HOST} ^garudanexa\\.com$ [NC]',
    '  RewriteRule ^$ _pre/index.html [L]',
  ];
  // Satu pasang RewriteCond + RewriteRule per kelompok rute, supaya tidak ada baris yang melewati batas Apache
  for (let i = 0; i < others.length; i += HTACCESS_ROUTES_PER_RULE) {
    const group = others.slice(i, i + HTACCESS_ROUTES_PER_RULE);
    lines.push('  RewriteCond %{HTTP_HOST} ^garudanexa\\.com$ [NC]', `  RewriteRule ^(${group.join('|')})$ _pre/$1.html [L]`);
  }
  lines.push(`  ${HTACCESS_END}`);
  return lines.join('\n');
}

/** Baris .htaccess yang terlalu panjang ({ line: nomor mulai 1, length }), kosong bila aman. */
export const longHtaccessLines = (htaccess) =>
  htaccess
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, length: line.length }))
    .filter(({ length }) => length >= HTACCESS_MAX_LINE);

export function fillHtaccess(htaccess, block) {
  const start = htaccess.indexOf(HTACCESS_BEGIN);
  const end = htaccess.indexOf(HTACCESS_END);
  if (start < 0 || end < start) throw new Error(`.htaccess tanpa blok "${HTACCESS_BEGIN}" … "${HTACCESS_END}"`);
  const lineStart = htaccess.lastIndexOf('\n', start) + 1;
  const lineEnd = htaccess.indexOf('\n', end);
  const filled = htaccess.slice(0, lineStart) + block + (lineEnd < 0 ? '' : htaccess.slice(lineEnd));
  const long = longHtaccessLines(filled);
  if (long.length) {
    const where = long.map(({ line, length }) => `baris ${line} (${length} karakter)`).join(', ');
    throw new Error(`.htaccess punya baris ≥ ${HTACCESS_MAX_LINE} karakter (${where}); Apache akan menolak seluruh file (500)`);
  }
  return filled;
}

// ─── seo.php ─────────────────────────────────────────────────────────────────

/**
 * Konteks backend/seo.php (_pre/seo-fallback.json): node JSON-LD global (Organization, WebSite, …) diambil dari head
 * halaman template yang diprerender, jadi bentuknya sama persis dengan kode TypeScript; Product & BreadcrumbList dibuat
 * seo.php dari DB dengan aturan yang sama (dicek __tests__/backend/seo-fallback.test.ts).
 */
export function seoFallbackContext(ssr, data, sampleSlug, builtAt) {
  const sample = ssr.getHead(`/template/${sampleSlug}`, data);
  const globalJsonLd = (sample.jsonLd ?? []).filter((node) => !['Product', 'BreadcrumbList'].includes(node?.['@type']));
  const organizationId = globalJsonLd.find((node) => node?.['@type'] === 'Organization')?.['@id'] ?? `${SITE_ORIGIN}/#organization`;
  return {
    builtAt,
    origin: SITE_ORIGIN,
    brandName: ssr.COMPANY_FACTS.name,
    organizationId,
    globalJsonLd,
    defaultOgImage: ssr.notFoundHead().ogImage,
    categorySlugs: [...ssr.CATEGORY_SLUGS],
    // Nama halaman kategori untuk remah BreadcrumbList (sama dengan template-detail.seo.ts)
    categoryNames: Object.fromEntries((ssr.CATEGORY_LIST ?? []).map((meta) => [meta.slug, meta.name])),
    pricingIncludes: ssr.getTemplatePricing(data.settings).includes,
    // Artikel panduan yang terbit setelah deploy (seo.php?guide=…): akhiran judul, kartu OG, penulis JSON-LD
    guide: ssr.guideFallbackContext?.() ?? null,
    // ?v=<hash> pratinjau & galeri template (src/seo/assetVersion.ts), dari peta yang sama dengan bundel ini
    assetVersions: { ...(ssr.ASSET_VERSIONS ?? {}) },
  };
}

// ─── site.php ────────────────────────────────────────────────────────────────

export const SITE_DEFAULTS_UPDATE = 'UPDATE_SITE_DEFAULTS=1 npx vitest run __tests__/backend/site-defaults.test.ts';

/**
 * backend/modules/site_defaults.json → OUT/modules/site_defaults.json (dibaca site.php dan site_posts.php di produksi).
 * templateCodes = kode template registri TEMPLATES dari bundel SSR (templateCodes() di src/entry-server.tsx). Berkas
 * rusak, atau kuncinya tidak sama dengan kode registri (template baru/dihapus tanpa memperbarui berkas), menggagalkan
 * build: tanpa bawaan template yang benar, head domain pembeli kehilangan nama & deskripsi bawaan dan status index
 * salah menganggap konten pembeli sebagai konten bawaan (atau sebaliknya).
 */
export function copySiteDefaults(root, outDir, templateCodes) {
  const source = join(root, 'backend', 'modules', 'site_defaults.json');
  const defaults = JSON.parse(readFileSync(source, 'utf8'));
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults) || Object.keys(defaults).length === 0) {
    throw new Error(`${source} kosong atau bukan objek: jalankan ${SITE_DEFAULTS_UPDATE}`);
  }
  if (!Array.isArray(templateCodes) || templateCodes.length === 0) {
    throw new Error(`Kode template registri dari bundel SSR (templateCodes) tidak ada, jadi ${source} tidak bisa dicek.`);
  }
  const codes = new Set(templateCodes.map(String));
  const missing = [...codes].filter((code) => !Object.hasOwn(defaults, code)).sort();
  const unknown = Object.keys(defaults).filter((code) => !codes.has(code)).sort();
  if (missing.length || unknown.length) {
    const diff = [
      missing.length ? `belum ada: ${missing.join(', ')}` : '',
      unknown.length ? `tidak ada di registri: ${unknown.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(`${source} tidak sama dengan registri template (${diff.join('; ')}): jalankan ${SITE_DEFAULTS_UPDATE}, lalu commit berkasnya.`);
  }
  mkdirSync(join(outDir, 'modules'), { recursive: true });
  cpSync(source, join(outDir, 'modules', 'site_defaults.json'));
}

// ─── Builder paket lain (WP3/WP4) ────────────────────────────────────────────

async function optionalModule(root, rel, exportsNeeded, strict, { required = true } = {}) {
  const file = join(root, rel);
  const missing = (why) => {
    if (strict && required) throw new Error(`${rel}: ${why} (wajib untuk deploy)`);
    warn(`${rel}: ${why}; dilewati.`);
    return null;
  };
  if (!existsSync(file)) return missing('belum ada');
  const mod = await import(pathToFileURL(file).href);
  const absent = exportsNeeded.filter((name) => typeof mod[name] !== 'function');
  if (absent.length) return missing(`ekspor ${absent.join(', ')} belum ada`);
  return mod;
}

// ─── Utama ───────────────────────────────────────────────────────────────────

/** Slug artikel panduan yang belum ditinjau manusia (tanpa `reviewed`, SEO-PLAN §5.8). */
export const unreviewedArticles = (articles) => articles.filter((article) => !article?.reviewed).map((article) => article.slug);

/**
 * Sumber data prerender: PRERENDER_API, bawaan https://garudanexa.com. Deploy sungguhan (strict) hanya boleh memakai
 * API production: PRERENDER_API=http://127.0.0.1:8000 yang tertinggal di shell setelah uji --build-only akan menerbitkan
 * data database lokal (proyek uji, harga, navbar) ke production. PRERENDER_ALLOW_NONPROD=1 = pengecualian sadar.
 */
export function prerenderApiBase({ strict, env = process.env }) {
  const apiBase = env.PRERENDER_API || SITE_ORIGIN;
  let origin;
  try {
    origin = new URL(apiBase).origin;
  } catch {
    throw new Error(`PRERENDER_API bukan URL yang valid: ${JSON.stringify(apiBase)}`);
  }
  if (strict && origin !== SITE_ORIGIN && env.PRERENDER_ALLOW_NONPROD !== '1') {
    throw new Error(
      `Deploy sungguhan harus memakai data production (${SITE_ORIGIN}), bukan PRERENDER_API=${apiBase}. ` +
        'Hapus PRERENDER_API dari shell, atau set PRERENDER_ALLOW_NONPROD=1 bila memang disengaja.',
    );
  }
  return apiBase;
}

/**
 * @param {object} options
 * @param {string} options.root      folder proyek
 * @param {string} options.outDir    OUT (isi public_html)
 * @param {string} options.deployDir DEPLOY_DIR (bundel SSR & manifest di sini, di luar OUT)
 * @param {boolean} options.strict   true = deploy sungguhan
 */
export async function prerender({ root, outDir, deployDir, strict }) {
  process.env.NODE_ENV = 'production';
  const apiBase = prerenderApiBase({ strict });
  const minTemplates = Number(process.env.MIN_TEMPLATES ?? 5);
  if (!Number.isInteger(minTemplates) || minTemplates < 1) throw new Error('MIN_TEMPLATES harus bilangan bulat ≥ 1');

  // Manifest klien (dibuat build klien dengan manifest: true) dipindah keluar dari OUT: tidak ikut terbit
  const manifestSrc = join(outDir, '.vite', 'manifest.json');
  if (!existsSync(manifestSrc)) throw new Error(`${manifestSrc} tidak ada: build klien harus memakai build.manifest = true`);
  const manifest = JSON.parse(readFileSync(manifestSrc, 'utf8'));
  writeFileSync(join(deployDir, 'client-manifest.json'), JSON.stringify(manifest, null, 2));
  rmSync(join(outDir, '.vite'), { recursive: true, force: true });

  log('build SSR…');
  const ssr = await buildServerBundle(root, join(deployDir, 'ssr'));

  log(`data dari ${apiBase} (minimal ${minTemplates} template)…`);
  const { api, slugs } = await fetchSiteData(apiBase, ssr.PRELOAD_URLS, minTemplates);
  const builtAt = new Date().toISOString();
  const data = ssr.seoDataFromApi(api, builtAt);
  writeFileSync(join(deployDir, 'prerender-data.json'), JSON.stringify({ builtAt, api }, null, 2));
  for (const { key, bytes } of inlineImageSettings(api[ssr.PRELOAD_URLS.settings])) {
    warn(
      `setting ${key} berisi ${Math.round(bytes / 1024)} KB gambar base64 yang ikut gn-preload ke setiap halaman. Simpan ` +
        'gambarnya sebagai file upload (portfolio_data: sekali Simpan di admin Pengaturan website), lalu deploy ulang.',
    );
  }

  // Rute: semua routes() modul SEO (sitemap memakai yang index saja), tanpa rute aplikasi
  const indexable = ssr.getIndexableRoutes(data);
  const fromModules = (ssr.seoModules?.() ?? []).flatMap(({ seo }) => seo.routes?.(data) ?? []);
  const paths = [...new Set([...indexable, ...fromModules].map((entry) => ssr.normalizePathname(entry.path)))].filter(
    (path) => !APP_ROUTE.test(path),
  );
  const required = ['/', ssr.HUB_PATHS.customOrder, ...Object.values(ssr.LEGAL_PATHS), ...slugs.map((slug) => `/template/${slug}`)];
  const missing = required.filter((path) => !paths.includes(path));
  if (missing.length) {
    if (strict) throw new Error(`getIndexableRoutes() tidak memuat halaman wajib: ${missing.join(', ')}`);
    warn(`routes() belum memuat ${missing.join(', ')} (head WP3 belum jadi?); ikut diprerender sebagai cadangan --build-only.`);
    paths.push(...missing);
  }
  for (const path of paths) {
    if (!ROUTE_PATTERN.test(path)) throw new Error(`Rute tidak bisa diprerender (hanya a-z, 0-9, "-", "/"): ${path}`);
    if (path === '/index') throw new Error('Rute /index bentrok dengan _pre/index.html');
  }
  paths.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

  const shell = readFileSync(join(outDir, 'index.html'), 'utf8');
  const preDir = join(outDir, '_pre');
  rmSync(preDir, { recursive: true, force: true });
  // get_guides di semua halaman: tautan panduan di /harga, jasa, kategori dan detail template (guideLink)
  const common = [ssr.PRELOAD_URLS.settings, ssr.PRELOAD_URLS.navbar, ssr.PRELOAD_URLS.templates, ssr.PRELOAD_URLS.guides];
  const apiFor = (path) => {
    const urls = [...common];
    if (path === '/') urls.push(ssr.PRELOAD_URLS.projects);
    const slug = /^\/template\/([a-z0-9-]+)$/.exec(path)?.[1];
    if (slug && api[ssr.PRELOAD_URLS.template(slug)]) urls.push(ssr.PRELOAD_URLS.template(slug));
    const guideSlug = /^\/panduan\/([a-z0-9-]+)$/.exec(path)?.[1];
    if (guideSlug && api[ssr.PRELOAD_URLS.guide(guideSlug)]) urls.push(ssr.PRELOAD_URLS.guide(guideSlug));
    const trim = (url) =>
      url === ssr.PRELOAD_URLS.settings
        ? preloadSettings(api[url])
        : url === ssr.PRELOAD_URLS.projects
          ? preloadProjects(api[url], ssr.presentableProjects)
          : api[url];
    return Object.fromEntries(urls.map((url) => [url, trim(url)]));
  };

  const renderPage = async (path, preloadPath) => {
    const preload = { path: preloadPath, builtAt, api: apiFor(path) };
    globalThis[TRACK_GLOBAL] = new Set();
    const { html, errors } = await ssr.render(path, preload);
    const modules = [...globalThis[TRACK_GLOBAL]];
    delete globalThis[TRACK_GLOBAL];
    if (errors.length) {
      throw new Error(`Render ${path} gagal: ${errors.map((error) => error?.stack || String(error)).join('\n')}`);
    }
    const resources = chunksFor(manifest, modules);
    preload.chunks = resources.js;
    return { html, preload, resources };
  };

  const problems = [];
  const titles = new Map();
  for (const path of paths) {
    const { html, preload, resources } = await renderPage(path, path);
    const head = ssr.getHead(path, data);
    const headTags = [ssr.renderHeadTags(head), resourceTags(resources)].filter(Boolean).join('\n');
    const page = composePage(shell, { headTags, appHtml: html, preload });
    const file = preFileFor(path);
    mkdirSync(dirname(join(preDir, file)), { recursive: true });
    writeFileSync(join(preDir, file), page);
    problems.push(...checkPage(`_pre/${file}`, page, { indexable: head.robots === 'index,follow' }));
    const title = titleOf(page);
    if (titles.has(title)) problems.push({ level: 'head', message: `title ganda "${title}": ${titles.get(title)} dan ${path}` });
    else titles.set(title, path);
    if (head.robots !== 'index,follow') warn(`${path}: robots ${head.robots}`);
    log(`${path} → _pre/${file} (${Math.round(page.length / 1024)} KB, ${preload.chunks.length} chunk)`);
  }

  // 404.html: NotFound hasil prerender (noindex). main.tsx tidak menghidrasinya (path berbeda), cukup tampil tanpa JS.
  {
    const { html, preload, resources } = await renderPage('/404', null);
    const headTags = [ssr.renderHeadTags(ssr.notFoundHead()), resourceTags(resources)].filter(Boolean).join('\n');
    const page = composePage(shell, { headTags, appHtml: html, preload });
    if (!/<meta name="robots" content="noindex/.test(page)) throw new Error('404.html tanpa robots noindex');
    writeFileSync(join(outDir, '404.html'), page);
    log('404.html');
  }

  // app.html: cangkang aplikasi (akun, pesan, masuk, demo, admin, …) + noindex,follow
  {
    const app = injectHead(stripPageHead(shell).replace(/<title>[\s\S]*?<\/title>/i, ''), [
      '<title>Garuda Nexa</title>',
      '<meta name="robots" content="noindex,follow">',
    ].join('\n'));
    writeFileSync(join(outDir, 'app.html'), app);
    log('app.html');
  }

  // Sitemap & llms.txt (WP4), OG (WP3, opsional: gambar OG di-commit di public/og)
  const entries = indexable;
  const sitemapMod = await optionalModule(root, 'scripts/seo/sitemap.mjs', ['buildSitemap'], strict);
  if (sitemapMod) {
    writeFileSync(join(outDir, 'sitemap.xml'), await sitemapMod.buildSitemap(entries, SITE_ORIGIN));
    log(`sitemap.xml (${entries.length} URL)`);
  }
  const llmsMod = await optionalModule(root, 'scripts/seo/llms.mjs', ['buildLlmsTxt', 'buildLlmsFullTxt'], strict);
  if (llmsMod) {
    // Argumen opsional WP4: judul/deskripsi halaman dari head, dan artikel panduan (hanya yang index yang ditulis)
    const pages = Object.fromEntries(entries.map(({ path }) => [path, pick(ssr.getHead(path, data), ['title', 'description'])]));
    const guides = (data.guides ?? []).map((a) => pick(a, ['slug', 'title', 'description', 'dateModified']));
    // FAQ gabungan dengan teks yang sama persis dengan di situs (WP6, src/content/faq.ts)
    const faqs = ssr.faqForLlms?.(data) ?? [];
    const input = { facts: ssr.COMPANY_FACTS, templates: data.templates, entries, builtAt, pages, guides, faqs };
    writeFileSync(join(outDir, 'llms.txt'), await llmsMod.buildLlmsTxt(input));
    writeFileSync(join(outDir, 'llms-full.txt'), await llmsMod.buildLlmsFullTxt(input));
    log('llms.txt, llms-full.txt');
  }
  const ogMod = await optionalModule(root, 'scripts/seo/og-images.mjs', ['buildOgImages'], strict, { required: false });
  if (ogMod) await ogMod.buildOgImages({ templates: data.templates, outDir, publicDir: join(root, 'public') });

  // seo.php + data cadangannya. JSON-LD global (Organization, WebSite, …) diambil dari head halaman template yang
  // diprerender supaya bentuknya sama persis; Product & BreadcrumbList dibuat seo.php dari DB.
  cpSync(join(root, 'backend', 'seo.php'), join(outDir, 'seo.php'));
  writeFileSync(join(preDir, 'seo-fallback.json'), JSON.stringify(seoFallbackContext(ssr, data, slugs[0], builtAt), null, 2));
  // site.php: head SEO, robots.txt & sitemap.xml domain pembeli (SITE-POSTS-SEO-SPEC §6), memakai helper seo.php. Bawaan
  // template-nya (modules/site_defaults.json) tidak ikut salinan modules/*.php di deploy-cpanel.mjs, jadi disalin di sini
  // setelah kuncinya dicocokkan dengan registri template di bundel SSR; modules/.htaccess menutupnya dari web.
  cpSync(join(root, 'backend', 'site.php'), join(outDir, 'site.php'));
  copySiteDefaults(root, outDir, await ssr.templateCodes?.());

  // Rute prerender → .htaccess
  const htaccessFile = join(outDir, '.htaccess');
  writeFileSync(htaccessFile, fillHtaccess(readFileSync(htaccessFile, 'utf8'), htaccessRoutes(paths)));

  const errors = problems.filter((p) => p.level === 'error' || (strict && p.level === 'head'));
  for (const p of problems) if (!errors.includes(p)) warn(p.message);
  if (errors.length) throw new Error(`Cek prerender gagal:\n  ${errors.map((p) => p.message).join('\n  ')}`);
  log(`selesai: ${paths.length} halaman, data ${builtAt}`);
  return { paths, builtAt, entries, dataOrigin: new URL(apiBase).origin };
}

