#!/usr/bin/env node
// Pengaman SEO setelah deploy (docs/platform/SEO-PLAN.md §5.9 langkah 1). Dijalankan setelah setiap Pull di cPanel:
//   node scripts/seo/seo-check.mjs                          # production, https://garudanexa.com
//   node scripts/seo/seo-check.mjs --base http://127.0.0.1:8909 --host garudanexa.com   # build lokal di balik Apache
// Opsi: --base URL (bawaan https://garudanexa.com), --host HOST (host situs; bawaan hostname --base, dikirim sebagai
//       header Host bila --base menunjuk ke server lain), --api URL (asal atau URL api.php untuk get_templates; bawaan
//       --base), --delay MS (jeda antar-request, bawaan 400), --timeout MS (bawaan 15000).
// Keluar dengan kode 1 bila ada yang gagal.
//
// Yang dicek:
// 1. sitemap.xml: setiap URL 200, tepat 1 <h1>, canonical = URL itu, <title> ada, unik dan ≤60 karakter, description
//    ≤160 karakter, semua JSON-LD bisa di-parse, robots `index` (meta dan header X-Robots-Tag), dan ≥600 kata di
//    <main> untuk halaman template.
// 2. Harga: Offer di JSON-LD Product setiap halaman template sama dengan harga get_templates, dan setiap template yang
//    terbit ada di sitemap (kalau tidak: deploy ulang, lihat deploy/cpanel/README.md).
// 3. Tes negatif (tabel §5.2): 404 untuk halaman yang tidak ada dan file internal (_pre/, app.html, 404.html,
//    seo.php), 200 + noindex untuk rute aplikasi, 301 satu lompatan untuk www, /index.html dan garis miring di akhir,
//    llms.txt / llms-full.txt / robots.txt sebagai text/plain.
//
// Sopan: request berurutan dengan jeda, User-Agent jujur "GarudaNexaSeoCheck/1.0" (bukan UA crawler), tanpa coba
// ulang. Jika server menjawab 429/503 (WAF membatasi), pengecekan langsung berhenti.
// Fungsi pengecekan murni (tanpa jaringan) diekspor untuk tes: __tests__/seo/seo-check.test.ts.
import http from 'node:http';
import https from 'node:https';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSitemap } from './sitemap.mjs';

export const USER_AGENT = 'GarudaNexaSeoCheck/1.0 (+https://garudanexa.com)';
export const DEFAULT_BASE = 'https://garudanexa.com';
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
export const TEMPLATE_MIN_WORDS = 600;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_SITEMAP_URLS = 300;
const TEMPLATE_PATH = /^\/template\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

// ─── Argumen & alamat ────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const opts = { base: DEFAULT_BASE, host: null, api: null, delay: 400, timeout: 15000, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) throw new Error(`${arg} butuh nilai`);
      i += 1;
      return next;
    };
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--base') opts.base = value();
    else if (arg === '--host') opts.host = value();
    else if (arg === '--api') opts.api = value();
    else if (arg === '--delay') opts.delay = Number(value());
    else if (arg === '--timeout') opts.timeout = Number(value());
    else throw new Error(`Opsi tidak dikenal: ${arg}`);
  }
  let base;
  try {
    base = new URL(opts.base);
  } catch {
    throw new Error(`--base bukan URL: ${opts.base}`);
  }
  if (!/^https?:$/.test(base.protocol)) throw new Error(`--base harus http(s): ${opts.base}`);
  opts.base = base.origin;
  opts.host = String(opts.host ?? base.hostname).toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(opts.host)) throw new Error(`--host tidak valid: ${opts.host}`);
  if (opts.api) {
    try {
      new URL(opts.api);
    } catch {
      throw new Error(`--api bukan URL: ${opts.api}`);
    }
  }
  if (!Number.isFinite(opts.delay) || opts.delay < 0) throw new Error('--delay harus angka ≥ 0');
  if (!Number.isFinite(opts.timeout) || opts.timeout <= 0) throw new Error('--timeout harus angka > 0');
  return opts;
}

/**
 * Ke mana request dikirim untuk path di host situs (atau www.host). Bila --base memang host situs (production), URL-nya
 * langsung; bila --base server lain (Apache lokal), request ke --base dengan header Host.
 */
export function requestTarget({ base, host }, path, { www = false } = {}) {
  const origin = new URL(base);
  const wanted = www ? `www.${host}` : host;
  if (origin.hostname === host) {
    return { url: `${origin.protocol}//${wanted}${origin.port ? `:${origin.port}` : ''}${path}`, hostHeader: null };
  }
  return { url: `${origin.origin}${path}`, hostHeader: wanted };
}

/** URL get_templates: --api boleh asal (https://garudanexa.com) atau URL api.php lengkap. */
export function templatesTarget(opts) {
  if (!opts.api) return requestTarget(opts, '/api.php?action=get_templates');
  const api = new URL(opts.api);
  if (!/\.php$/.test(api.pathname)) api.pathname = `${api.pathname.replace(/\/+$/, '')}/api.php`;
  api.search = '?action=get_templates';
  return { url: api.toString(), hostHeader: null };
}

/** Alamat kanonis sebuah path: selalu https://{host}{path}. */
export const siteUrl = (host, path) => `https://${host}${path}`;

// ─── Membaca HTML ────────────────────────────────────────────────────────────

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Atribut sebuah tag pembuka: <meta name="robots" content="index,follow"> → { name, content }. */
export function tagAttributes(tag) {
  const attrs = {};
  for (const [, name, dq, sq, bare] of String(tag).matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    const key = name.toLowerCase();
    if (!(key in attrs)) attrs[key] = decodeEntities(dq ?? sq ?? bare ?? '');
  }
  return attrs;
}

const stripBlocks = (html) => html.replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' ');

/** Teks yang terbaca dari potongan HTML (tanpa script/style), spasi dirapikan. */
export function visibleText(html) {
  return decodeEntities(stripBlocks(String(html)).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Jumlah kata: token yang berisi huruf atau angka ("Rp1.390.000" = 1, "–" = 0). */
export function countWords(text) {
  return String(text)
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Fakta SEO satu halaman HTML. */
export function pageFacts(html) {
  const source = String(html);
  const headEnd = source.search(/<\/head\s*>/i);
  const head = headEnd === -1 ? source : source.slice(0, headEnd);
  const body = headEnd === -1 ? source : source.slice(headEnd);
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => tagAttributes(m[0]));
  const metaContents = (name) => metas.filter((m) => (m.name ?? '').toLowerCase() === name).map((m) => m.content ?? '');
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => tagAttributes(m[0]));
  const titles = [...source.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)].map((m) => decodeEntities(m[1]).replace(/\s+/g, ' ').trim());
  const jsonLd = [...source.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].map((m) => {
    try {
      return { ok: true, value: JSON.parse(m[1]) };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });
  const mains = [...stripBlocks(body).matchAll(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/gi)].map((m) => m[1]);
  return {
    titles,
    descriptions: metaContents('description'),
    robots: metaContents('robots'),
    canonicals: links.filter((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical')).map((l) => l.href ?? ''),
    h1: (stripBlocks(body).match(/<h1[\s>]/gi) ?? []).length,
    jsonLd,
    mainCount: mains.length,
    mainWords: countWords(visibleText(mains.join(' '))),
  };
}

const robotsTokens = (value) =>
  String(value ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
const saysNoindex = (value) => robotsTokens(value).some((t) => t === 'noindex' || t === 'none');

const headerOf = (res, name) => {
  const value = res.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
};

/** Node JSON-LD datar: dokumen, array dan @graph dibuka. */
export function ldNodes(values) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      if (Array.isArray(node['@graph'])) walk(node['@graph']);
      if (node['@type'] !== undefined) out.push(node);
    }
  };
  values.forEach(walk);
  return out;
}

const isType = (node, type) => (Array.isArray(node['@type']) ? node['@type'].includes(type) : node['@type'] === type);

// ─── Pengecekan (murni: masalah sebagai daftar teks) ─────────────────────────

/** Halaman di sitemap: 200, indexable, head lengkap. */
export function checkIndexablePage({ loc, res, facts, isTemplate }) {
  const problems = [];
  if (res.status !== 200) return [`HTTP ${res.status} (harus 200)`];
  const type = headerOf(res, 'content-type');
  if (!/^text\/html\b/i.test(type)) problems.push(`Content-Type "${type}" (harus text/html)`);
  if (facts.titles.length !== 1) problems.push(`${facts.titles.length} <title> (harus tepat 1)`);
  const title = facts.titles[0] ?? '';
  if (facts.titles.length && !title) problems.push('<title> kosong');
  if ([...title].length > TITLE_MAX) problems.push(`title ${[...title].length} karakter (maks ${TITLE_MAX}): "${title}"`);
  if (facts.descriptions.length !== 1) problems.push(`${facts.descriptions.length} meta description (harus tepat 1)`);
  const description = facts.descriptions[0] ?? '';
  if (facts.descriptions.length && !description.trim()) problems.push('meta description kosong');
  if ([...description].length > DESCRIPTION_MAX) problems.push(`description ${[...description].length} karakter (maks ${DESCRIPTION_MAX})`);
  if (facts.canonicals.length !== 1) problems.push(`${facts.canonicals.length} canonical (harus tepat 1)`);
  else if (facts.canonicals[0] !== loc) problems.push(`canonical ${facts.canonicals[0]} ≠ ${loc}`);
  if (facts.robots.length !== 1) problems.push(`${facts.robots.length} meta robots (harus tepat 1)`);
  else if (!robotsTokens(facts.robots[0]).includes('index') || saysNoindex(facts.robots[0])) problems.push(`meta robots "${facts.robots[0]}" (harus index)`);
  const xRobots = headerOf(res, 'x-robots-tag');
  if (saysNoindex(xRobots)) problems.push(`header X-Robots-Tag "${xRobots}"`);
  if (facts.h1 !== 1) problems.push(`${facts.h1} <h1> (harus tepat 1)`);
  if (facts.jsonLd.length === 0) problems.push('tidak ada JSON-LD');
  facts.jsonLd.forEach((block, i) => {
    if (!block.ok) problems.push(`JSON-LD #${i + 1} tidak bisa di-parse (${block.error})`);
  });
  if (isTemplate) {
    if (facts.mainCount !== 1) problems.push(`${facts.mainCount} <main> (harus tepat 1)`);
    if (facts.mainWords < TEMPLATE_MIN_WORDS) problems.push(`${facts.mainWords} kata di <main> (minimal ${TEMPLATE_MIN_WORDS} untuk halaman template)`);
  }
  return problems;
}

/** Title yang dipakai lebih dari satu URL. */
export function checkDuplicateTitles(pages) {
  const byTitle = new Map();
  for (const { loc, title } of pages) {
    if (!title) continue;
    byTitle.set(title, [...(byTitle.get(title) ?? []), loc]);
  }
  return [...byTitle].filter(([, locs]) => locs.length > 1).map(([title, locs]) => `title "${title}" dipakai ${locs.length} URL: ${locs.join(', ')}`);
}

/** Daftar template dari respons get_templates: [{ slug, name, price }]. */
export function templatesFromApi(body) {
  const list = body?.templates;
  if (!Array.isArray(list)) throw new Error('get_templates tidak berisi daftar templates');
  return list.map((t) => ({ slug: String(t?.slug ?? ''), name: String(t?.name ?? ''), price: Number(t?.price) }));
}

/** Harga Offer di JSON-LD Product sama dengan get_templates (IDR). */
export function checkTemplatePrice({ slug, nodes, template }) {
  if (!template) return [`template "${slug}" ada di sitemap tetapi tidak ada di get_templates (tidak terbit lagi?): deploy ulang`];
  if (!Number.isFinite(template.price) || template.price <= 0) return [`get_templates: harga "${slug}" tidak valid`];
  const products = nodes.filter((node) => isType(node, 'Product'));
  if (products.length === 0) return ['tidak ada JSON-LD Product'];
  const problems = [];
  for (const product of products) {
    const offers = [].concat(product.offers ?? []);
    if (offers.length === 0) problems.push('Product tanpa offers');
    for (const offer of offers) {
      const price = Number(offer?.price);
      if (price !== template.price) problems.push(`harga JSON-LD ${offer?.price} ≠ get_templates ${template.price}: deploy ulang`);
      if (offer?.priceCurrency !== 'IDR') problems.push(`priceCurrency "${offer?.priceCurrency}" (harus IDR)`);
    }
  }
  return problems;
}

/** Setiap template terbit punya halaman di sitemap. */
export function checkCatalogCoverage({ host, locs, templates }) {
  const inSitemap = new Set(locs);
  return templates
    .filter((t) => !inSitemap.has(siteUrl(host, `/template/${t.slug}`)))
    .map((t) => `template "${t.slug}" terbit tetapi tidak ada di sitemap: deploy ulang`);
}

/** Sitemap: URL https di host situs, path kanonis, tanpa duplikat. */
export function checkSitemapEntries({ host, entries }) {
  const problems = [];
  if (entries.length === 0) problems.push('sitemap kosong');
  if (entries.length > MAX_SITEMAP_URLS) problems.push(`sitemap berisi ${entries.length} URL (skrip ini memeriksa maksimal ${MAX_SITEMAP_URLS})`);
  const seen = new Set();
  for (const { loc } of entries) {
    let url;
    try {
      url = new URL(loc);
    } catch {
      problems.push(`<loc> bukan URL: ${loc}`);
      continue;
    }
    if (url.protocol !== 'https:' || url.hostname !== host || url.port) problems.push(`<loc> bukan https://${host}: ${loc}`);
    if (url.search || url.hash) problems.push(`<loc> dengan query/fragment: ${loc}`);
    if (seen.has(loc)) problems.push(`<loc> ganda: ${loc}`);
    seen.add(loc);
  }
  return problems;
}

/** Tes negatif (tabel §5.2 + file internal + teks). `slug` = template contoh yang terbit. */
export function negativeCases(host, slug) {
  const to = (path) => siteUrl(host, path);
  const cases = [
    { path: '/halaman-tidak-ada-seo-check', expect: { status: 404 } },
    { path: '/template/tidak-ada-seo-check', expect: { status: 404 } },
    { path: '/template/kategori', expect: { status: 404 } },
    { path: '/panduan/tidak-ada-seo-check', expect: { status: 404 } },
    { path: '/_pre/index.html', expect: { status: 404 } },
    // Versi %-encoding (THE_REQUEST belum di-decode, deploy/cpanel/htaccess punya aturan khusus)
    { path: '/%5Fpre/index.html', expect: { status: 404 } },
    { path: '/app.html', expect: { status: 404 } },
    { path: '/404.html', expect: { status: 404 } },
    { path: '/akun', expect: { status: 200, noindex: true } },
    { path: '/masuk', expect: { status: 200, noindex: true } },
    { path: '/daftar', expect: { status: 200, noindex: true } },
    { path: '/', www: true, expect: { status: 301, location: to('/') } },
    { path: '/template', www: true, expect: { status: 301, location: to('/template') } },
    { path: '/index.html', expect: { status: 301, location: to('/') } },
    { path: '/template/', expect: { status: 301, location: to('/template') } },
    { path: '/llms.txt', expect: { status: 200, contentType: 'text/plain' } },
    { path: '/llms-full.txt', expect: { status: 200, contentType: 'text/plain' } },
    { path: '/robots.txt', expect: { status: 200, contentType: 'text/plain', contains: `Sitemap: ${to('/sitemap.xml')}` } },
  ];
  if (slug) {
    cases.push(
      { path: `/seo.php?slug=${slug}`, expect: { status: 404 } },
      { path: `/seo%2Ephp?slug=${slug}`, expect: { status: 404 } },
      { path: `/demo/${slug}`, expect: { status: 200, noindex: true } },
      { path: `/pesan/${slug}`, expect: { status: 200, noindex: true } },
      { path: `/template/${slug}/`, expect: { status: 301, location: to(`/template/${slug}`) } },
    );
  }
  return cases;
}

/** Hasil satu tes negatif. */
export function checkNegative(testCase, res) {
  const { expect } = testCase;
  const problems = [];
  if (res.status !== expect.status) problems.push(`HTTP ${res.status} (harus ${expect.status})`);
  if (expect.location !== undefined) {
    const location = headerOf(res, 'location');
    if (location !== expect.location) problems.push(`Location "${location}" (harus ${expect.location}, satu lompatan)`);
  }
  if (expect.noindex) {
    const facts = pageFacts(res.body ?? '');
    if (!facts.robots.some(saysNoindex)) problems.push(`HTML tanpa meta robots noindex (${facts.robots.join(' | ') || 'tidak ada'})`);
    if (facts.canonicals.length) problems.push(`halaman noindex punya canonical ${facts.canonicals.join(', ')}`);
  }
  if (expect.contentType !== undefined) {
    const type = headerOf(res, 'content-type');
    if (!type.toLowerCase().startsWith(expect.contentType)) problems.push(`Content-Type "${type}" (harus ${expect.contentType})`);
  }
  if (expect.contains !== undefined && !String(res.body ?? '').includes(expect.contains)) problems.push(`isi tanpa "${expect.contains}"`);
  return problems;
}

// ─── Jaringan ────────────────────────────────────────────────────────────────

/** GET tanpa mengikuti redirect: { status, headers, body }. */
export function httpGet({ url, hostHeader }, { timeoutMs = 15000 } = {}) {
  const target = new URL(url);
  const lib = target.protocol === 'https:' ? https : http;
  const headers = { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Encoding': 'identity' };
  if (hostHeader) headers.Host = hostHeader;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      target,
      { method: 'GET', headers, timeout: timeoutMs, ...(hostHeader && target.protocol === 'https:' ? { servername: hostHeader } : {}) },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            req.destroy(new Error(`respons lebih dari ${MAX_BODY_BYTES} byte`));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error(`timeout ${timeoutMs} ms`)));
    req.on('error', reject);
    req.end();
  });
}

class RateLimited extends Error {}

// ─── Jalankan ────────────────────────────────────────────────────────────────

/**
 * Semua pengecekan, berurutan. `get(target)` → { status, headers, body } (bawaan httpGet). Mengembalikan
 * { problems: [{ where, message }], pages, negatives }.
 */
export async function runSeoCheck(opts, { get = (target) => httpGet(target, { timeoutMs: opts.timeout }), log = console.log, sleep } = {}) {
  const wait = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const problems = [];
  const report = (where, list) => {
    for (const message of list) problems.push({ where, message });
    log(`${list.length ? 'GAGAL' : 'OK   '} ${where}${list.length ? `\n      - ${list.join('\n      - ')}` : ''}`);
  };
  let requests = 0;
  const fetchOnce = async (target) => {
    if (requests > 0 && opts.delay > 0) await wait(opts.delay);
    requests += 1;
    let res;
    try {
      res = await get(target);
    } catch (error) {
      return { status: 0, headers: {}, body: '', error: error.message };
    }
    if (res.status === 429 || res.status === 503) throw new RateLimited(`${target.url} → HTTP ${res.status}: server membatasi request, pengecekan dihentikan. Coba lagi nanti.`);
    return res;
  };
  const failed = (res) => (res.error ? [`request gagal: ${res.error}`] : null);

  try {
    // 1. Sitemap
    const sitemapRes = await fetchOnce(requestTarget(opts, '/sitemap.xml'));
    const sitemapProblems = failed(sitemapRes) ?? [];
    let entries = [];
    if (!sitemapRes.error) {
      if (sitemapRes.status !== 200) sitemapProblems.push(`HTTP ${sitemapRes.status} (harus 200)`);
      else {
        const type = headerOf(sitemapRes, 'content-type');
        if (!/xml/i.test(type)) sitemapProblems.push(`Content-Type "${type}" (harus XML)`);
        entries = parseSitemap(sitemapRes.body);
        sitemapProblems.push(...checkSitemapEntries({ host: opts.host, entries }));
      }
    }
    report(`/sitemap.xml (${entries.length} URL)`, sitemapProblems);
    entries = entries.slice(0, MAX_SITEMAP_URLS);

    // 2. Harga dari API
    let templates = null;
    const apiTarget = templatesTarget(opts);
    const apiRes = await fetchOnce(apiTarget);
    const apiProblems = failed(apiRes) ?? [];
    if (!apiRes.error) {
      try {
        if (apiRes.status !== 200) throw new Error(`HTTP ${apiRes.status}`);
        templates = templatesFromApi(JSON.parse(apiRes.body));
        if (templates.length === 0) apiProblems.push('get_templates kosong');
      } catch (error) {
        apiProblems.push(`get_templates tidak bisa dibaca: ${error.message}`);
      }
    }
    report(`get_templates (${templates ? templates.length : '?'} template)`, apiProblems);
    const bySlug = new Map((templates ?? []).map((t) => [t.slug, t]));

    // 3. Setiap URL sitemap
    const pages = [];
    for (const { loc } of entries) {
      let path;
      try {
        path = new URL(loc).pathname;
      } catch {
        continue;
      }
      const res = await fetchOnce(requestTarget(opts, path));
      const templateSlug = TEMPLATE_PATH.exec(path)?.[1];
      const isTemplate = Boolean(templateSlug) && templateSlug !== 'kategori';
      let list = failed(res);
      let facts = null;
      if (!list) {
        facts = pageFacts(res.body);
        list = checkIndexablePage({ loc, res, facts, isTemplate });
        if (isTemplate && res.status === 200 && templates) {
          const nodes = ldNodes(facts.jsonLd.filter((b) => b.ok).map((b) => b.value));
          list.push(...checkTemplatePrice({ slug: templateSlug, nodes, template: bySlug.get(templateSlug) }));
        }
      }
      pages.push({ loc, title: facts?.titles[0] ?? '' });
      report(`${path}${facts && isTemplate ? ` (${facts.mainWords} kata)` : ''}`, list);
    }
    const crossPage = checkDuplicateTitles(pages);
    if (templates) crossPage.push(...checkCatalogCoverage({ host: opts.host, locs: entries.map((e) => e.loc), templates }));
    report('title unik & semua template di sitemap', crossPage);

    // 4. Tes negatif
    const sample = templates?.find((t) => entries.some((e) => e.loc === siteUrl(opts.host, `/template/${t.slug}`)))?.slug ?? templates?.[0]?.slug ?? null;
    const cases = negativeCases(opts.host, sample);
    for (const testCase of cases) {
      const res = await fetchOnce(requestTarget(opts, testCase.path, { www: testCase.www }));
      const label = `${testCase.www ? `www.${opts.host}` : ''}${testCase.path} → ${testCase.expect.status}${testCase.expect.noindex ? ' noindex' : ''}`;
      report(label, failed(res) ?? checkNegative(testCase, res));
    }
    return { problems, pages: pages.length, negatives: cases.length, requests };
  } catch (error) {
    if (!(error instanceof RateLimited)) throw error;
    report('batas request', [error.message]);
    return { problems, pages: 0, negatives: 0, requests, rateLimited: true };
  }
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[seo-check] ${error.message}`);
    process.exit(1);
  }
  if (opts.help) {
    console.log('Pakai: node scripts/seo/seo-check.mjs [--base URL] [--host HOST] [--api URL] [--delay MS] [--timeout MS]');
    return;
  }
  console.log(`[seo-check] ${opts.base} (host ${opts.host}), jeda ${opts.delay} ms`);
  const result = await runSeoCheck(opts);
  console.log(
    `\n[seo-check] ${result.pages} halaman sitemap, ${result.negatives} tes negatif, ${result.requests} request: ` +
      (result.problems.length ? `${result.problems.length} masalah` : 'semua lulus'),
  );
  if (result.problems.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[seo-check] ${error.stack ?? error}`);
    process.exit(1);
  });
}
