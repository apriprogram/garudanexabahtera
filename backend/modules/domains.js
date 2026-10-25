// Domain berbayar (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §1–§2): daftar ekstensi & harga jual, normalisasi &
// validasi domain yang dipesan, dan cek ketersediaan. Sama dengan backend/modules/domains.php dan
// src/lib/domainPricing.ts (tes: __tests__/backend/domain-renewal.test.ts). Dipakai templates.js.
//
// Sumber data:
// - DewaBiz (registrar, https://docs.dewabiz.co.id/developer/api) bila DEWABIZ_RESELLER_ID + DEWABIZ_API_KEY diisi:
//   ketersediaan dari GET /domains/availability, daftar ekstensi & harga beli dari GET /account/prices (cache 6 jam di
//   memori proses). Harga beli tidak pernah dikirim ke browser.
// - Tanpa DewaBiz (atau saat DewaBiz gagal): RDAP registri untuk ketersediaan, tabel DOMAIN_TLDS untuk harga.
import { promises as dns } from 'node:dns';

// Harga jual per tahun (rupiah, sama untuk tahun pertama dan perpanjangan) bila DewaBiz tidak dipakai. .com/.id/
// .web.id/.my.id dari pemilik 2026-10-25, sisanya harga pasaran. Urutan = urutan tampilan & daftar saran domain.
export const DOMAIN_TLDS = [
  { tld: 'com', price: 250000, requirement: null },
  { tld: 'id', price: 250000, requirement: null },
  { tld: 'co.id', price: 350000, requirement: 'Untuk badan usaha: butuh NIB atau akta perusahaan' },
  { tld: 'my.id', price: 50000, requirement: null },
  { tld: 'web.id', price: 50000, requirement: null },
  { tld: 'biz.id', price: 100000, requirement: null },
  { tld: 'net', price: 250000, requirement: null },
  { tld: 'org', price: 250000, requirement: null },
  { tld: 'or.id', price: 100000, requirement: 'Untuk organisasi: butuh akta atau SK organisasi' },
  { tld: 'sch.id', price: 75000, requirement: 'Untuk sekolah: butuh surat keterangan/NPSN sekolah' },
  { tld: 'ac.id', price: 75000, requirement: 'Untuk perguruan tinggi: butuh SK pendirian' },
];
// Harga tetap dari pemilik, juga saat harga diambil dari DewaBiz (tetapi tidak pernah di bawah harga beli)
export const DOMAIN_FIXED_PRICES = { com: 250000, id: 250000, 'my.id': 50000, 'web.id': 50000 };
export const DOMAIN_MARKUP_DEFAULT = 25; // % di atas harga beli DewaBiz untuk ekstensi lain (setting domain_markup_percent)
const DOMAIN_MARKUP_MAX = 500;
const DOMAIN_FORMAT = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
const DOMAIN_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
export const DOMAIN_UNSUPPORTED_MESSAGE = 'Ekstensi domain belum tersedia. Pilih ekstensi dari daftar.';
const RDAP_TIMEOUT_MS = 6000;
// RDAP per ekstensi (IANA bootstrap https://data.iana.org/rdap/dns.json); semua ekstensi .id ke PANDI
const RDAP_BASE = {
  com: 'https://rdap.verisign.com/com/v1/',
  net: 'https://rdap.verisign.com/net/v1/',
  org: 'https://rdap.publicinterestregistry.org/rdap/',
  id: 'https://rdap.pandi.id/rdap/',
};
const DEWABIZ_DEFAULT_URL = 'https://api.dewabiz.co.id/v1';
const DEWABIZ_PRICE_TTL_MS = 21600 * 1000;
const DEWABIZ_RETRY_AFTER_MS = 600 * 1000; // jeda sebelum mencoba lagi setelah daftar harga gagal diambil
const DEWABIZ_TIMEOUT_MS = 8000;

// PHP trim()/strtolower(): ASCII only, like domain_normalize
const phpTrim = (s) => String(s).replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
const asciiLower = (s) => s.replace(/[A-Z]+/g, (m) => m.toLowerCase());
// PHP is_numeric() for strings and numbers
const isNumeric = (v) => (typeof v === 'number' && Number.isFinite(v))
  || (typeof v === 'string' && /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/.test(v));

/** Huruf kecil, tanpa skema, www., path/port/query, dan titik di akhir (sama dengan domain_normalize). */
export function domainNormalize(value) {
  return asciiLower(phpTrim(value))
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#:][\s\S]*$/, '')
    .replace(/\.+$/, '');
}

/** Ekstensi yang dijual (akhiran terpanjang) dari daftar `tlds` (bawaan: DOMAIN_TLDS), atau null. */
export function domainTld(domain, tlds = DOMAIN_TLDS) {
  let best = null;
  for (const t of tlds) {
    if (domain.endsWith(`.${t.tld}`) && (!best || t.tld.length > best.tld.length)) best = t;
  }
  return best;
}

/** Masalah domain yang akan dipesan (sudah dinormalisasi, tidak kosong): satu label + ekstensi yang dijual. null = valid. */
export function domainProblem(domain, tlds = DOMAIN_TLDS) {
  if (!domain.includes('.')) return 'Tambahkan ekstensi domain, mis. .com atau .id.';
  if (Buffer.byteLength(domain, 'utf8') > 253 || !DOMAIN_FORMAT.test(domain)) return 'Format domain tidak valid, contoh: namabisnis.com';
  const tld = domainTld(domain, tlds);
  const name = tld ? domain.slice(0, -(tld.tld.length + 1)) : '';
  if (!tld) return DOMAIN_UNSUPPORTED_MESSAGE;
  if (!DOMAIN_LABEL.test(name)) return 'Format domain tidak valid, contoh: namabisnis.com'; // subdomain, '-' di ujung
  return null;
}

/**
 * Harga jual domain per tahun dari daftar `tlds`, atau null bila ekstensinya tidak dijual (mis. domain pesanan lama).
 * `domain` = domain yang sudah divalidasi/tersimpan (tanpa normalisasi lagi: "www.my.id" tetap ekstensi my.id).
 */
export function domainPrice(domain, tlds = DOMAIN_TLDS) {
  const tld = domainTld(asciiLower(phpTrim(domain)), tlds);
  return tld ? Number(tld.price) : null;
}

/**
 * Daftar ekstensi yang dijual + harga jual per tahun: { source: 'dewabiz'|'default', tlds: [{ tld, price, requirement }] }.
 * Dengan DewaBiz: semua ekstensi aktif di DewaBiz, ekstensi populer (urutan DOMAIN_TLDS) lebih dulu, sisanya urut abjad;
 * harga = DOMAIN_FIXED_PRICES atau harga beli + markup, dibulatkan ke atas ke Rp1.000, minimal harga beli. Sama dengan
 * domain_catalog().
 */
export async function domainCatalog(pool, env = process.env) {
  const costs = await dewabizCosts(env);
  if (costs === null) return { source: 'default', tlds: DOMAIN_TLDS };
  const markup = await domainMarkupPercent(pool);
  const rank = new Map(DOMAIN_TLDS.map((t, i) => [t.tld, i]));
  const requirements = new Map(DOMAIN_TLDS.map((t) => [t.tld, t.requirement]));
  const tlds = Object.keys(costs).sort((a, b) => {
    if (rank.has(a) || rank.has(b)) return (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return {
    source: 'dewabiz',
    tlds: tlds.map((tld) => {
      const cost = Math.trunc(Number(costs[tld]));
      const price = Object.hasOwn(DOMAIN_FIXED_PRICES, tld) ? DOMAIN_FIXED_PRICES[tld] : domainRoundUp(cost * (100 + markup), 100);
      return { tld, price: Math.max(price, domainRoundUp(cost, 1)), requirement: requirements.get(tld) ?? null };
    }),
  };
}

/** ceil(numerator / denominator) ke kelipatan Rp1.000 atas, dengan bilangan bulat (sama dengan domain_round_up). */
export function domainRoundUp(numerator, denominator) {
  return Math.floor((numerator + denominator * 1000 - 1) / (denominator * 1000)) * 1000;
}

/** Markup harga DewaBiz (%), setting domain_markup_percent; kosong/tidak valid = bawaan. */
export async function domainMarkupPercent(pool) {
  const [rows] = await pool.query({ sql: "SELECT setting_value FROM hero_settings WHERE setting_key = 'domain_markup_percent' LIMIT 1", values: [] });
  const raw = phpTrim(String(rows[0]?.setting_value ?? ''));
  if (!/^\d{1,3}$/.test(raw) || Number(raw) > DOMAIN_MARKUP_MAX) return DOMAIN_MARKUP_DEFAULT;
  return Number(raw);
}

/** Domain yang dicek + nama yang sama di ekstensi populer lain yang dijual (urutan DOMAIN_TLDS), untuk daftar pilihan. */
export function domainAlternatives(domain, tlds = DOMAIN_TLDS) {
  const tld = domainTld(domain, tlds);
  if (!tld) return [domain];
  const name = domain.slice(0, -(tld.tld.length + 1));
  const sold = new Set(tlds.map((t) => t.tld));
  return [domain, ...DOMAIN_TLDS.filter((t) => t.tld !== tld.tld && sold.has(t.tld)).map((t) => `${name}.${t.tld}`)];
}

/** 'available' | 'taken' | 'unknown' untuk satu domain. */
export async function domainAvailability(domain, env = process.env) {
  return (await domainAvailabilityMany([domain], env))[domain];
}

/**
 * Ketersediaan beberapa domain sekaligus, semua request paralel (sama dengan domain_availability_many):
 * 1. DewaBiz GET /domains/availability (available 1 = tersedia; 0 atau nama premium = tidak tersedia), bila dikonfigurasi;
 * 2. yang belum pasti: RDAP registri (200 = terdaftar, 404 = tersedia). Env DOMAIN_RDAP_URL: 'off' = lewati RDAP, atau
 *    templat URL dengan {domain} untuk tes (http boleh, tanpa langkah 3);
 * 3. yang masih belum pasti: domain dengan name server (DNS NS) pasti sudah terdaftar.
 */
export async function domainAvailabilityMany(domains, env = process.env) {
  const result = Object.fromEntries(domains.map((d) => [d, 'unknown']));
  const cfg = dewabizConfig(env);
  if (cfg) {
    await Promise.all(Object.keys(result).map(async (domain) => {
      const { code, body } = await dewabizGet(cfg, '/domains/availability', { domain });
      if (code === 200) result[domain] = dewabizAvailability(domain, body) ?? 'unknown';
    }));
  }

  const override = env.DOMAIN_RDAP_URL ?? '';
  if (override === 'off') return result;
  await Promise.all(Object.keys(result).map(async (domain) => {
    const url = result[domain] === 'unknown' ? rdapUrl(domain, override) : null;
    if (url === null || (!/^https:\/\//i.test(url) && !(override !== '' && /^http:\/\//i.test(url)))) return;
    const code = await httpStatus(url, { Accept: 'application/rdap+json, application/json' }, RDAP_TIMEOUT_MS);
    if (code === 200) result[domain] = 'taken';
    else if (code === 404) result[domain] = 'available';
  }));
  if (override !== '') return result;
  await Promise.all(Object.keys(result).map(async (domain) => {
    if (result[domain] !== 'unknown') return;
    try {
      const ns = await Promise.race([dns.resolveNs(domain), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))]);
      if (Array.isArray(ns) && ns.length > 0) result[domain] = 'taken';
    } catch {
      // NXDOMAIN / no answer: stays unknown
    }
  }));
  return result;
}

/** URL RDAP untuk domain dengan ekstensi .com/.net/.org/.id-an, atau null. */
function rdapUrl(domain, override) {
  const m = /\.([a-z0-9-]+)$/.exec(domain);
  if (!m) return null;
  if (override !== '') return override.split('{domain}').join(encodeURIComponent(domain));
  const base = RDAP_BASE[m[1]];
  return base ? `${base}domain/${encodeURIComponent(domain)}` : null;
}

async function httpStatus(url, headers, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    await response.arrayBuffer().catch(() => null);
    return response.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// ── DewaBiz ──

/** { url, auth } bila reseller ID dan API key diisi di .env, selain itu null. */
export function dewabizConfig(env = process.env) {
  const id = phpTrim(env.DEWABIZ_RESELLER_ID ?? '');
  const key = phpTrim(env.DEWABIZ_API_KEY ?? '');
  if (id === '' || key === '') return null;
  const url = phpTrim(env.DEWABIZ_API_URL ?? DEWABIZ_DEFAULT_URL).replace(/\/+$/, '');
  return { url: url !== '' ? url : DEWABIZ_DEFAULT_URL, auth: `${id}:${key}` };
}

/** GET ke DewaBiz dengan Basic auth (reseller ID : API key); https saja, kecuali URL tes http:// yang eksplisit. Never throws. */
async function dewabizGet(cfg, path, query) {
  const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
  const url = `${cfg.url}${path}${qs ? `?${qs}` : ''}`;
  if (!/^https:\/\//i.test(url) && !/^http:\/\//i.test(cfg.url)) return { code: 0, body: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEWABIZ_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(cfg.auth).toString('base64')}` },
      signal: controller.signal,
      redirect: 'error',
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return { code: response.status, body };
  } catch {
    return { code: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// PHP empty(): the DewaBiz flags are read the same way as in domains.php
const phpEmpty = (v) => v === undefined || v === null || v === false || v === 0 || v === '' || v === '0'
  || (Array.isArray(v) && v.length === 0) || (isObject(v) && Object.keys(v).length === 0);

/**
 * Status dari jawaban /domains/availability ({success, data: {name, available, is_premium_name}} atau data berupa daftar),
 * null bila tidak bisa dipakai. Nama premium tidak dijual dengan harga daftar: 'taken'. Sama dengan dewabiz_availability().
 */
export function dewabizAvailability(domain, body) {
  if (!isObject(body) || phpEmpty(body.success) || body.data === null || typeof body.data !== 'object') return null;
  let data = body.data;
  if (Array.isArray(data)) {
    const match = data.filter((item) => isObject(item) && String(item.name ?? '').toLowerCase() === domain).pop();
    data = match ?? (isObject(data[0]) ? data[0] : {});
  }
  if (!Object.hasOwn(data, 'available') || !isNumeric(data.available)) return null;
  if (!phpEmpty(data.is_premium_name)) return 'taken';
  return Math.trunc(Number(data.available)) === 1 ? 'available' : 'taken';
}

// Cache harga beli per konfigurasi (url + kredensial): { at, costs, tried, pending }
const costCache = new Map();

/**
 * Harga beli per ekstensi dari DewaBiz ({ tld: rupiah per tahun }, maksimum registrasi/perpanjangan 1 tahun), cache
 * 6 jam; cache lama dipakai bila DewaBiz gagal. null = tidak dikonfigurasi / belum ada data. Setelah gagal, DewaBiz tidak
 * ditanya lagi selama 10 menit; hanya satu permintaan yang memperbarui, yang lain memakai data lama (atau tabel bawaan)
 * tanpa menunggu. Sama dengan dewabiz_costs().
 */
export async function dewabizCosts(env = process.env) {
  const cfg = dewabizConfig(env);
  if (!cfg) return null;
  const key = `${cfg.url}|${cfg.auth}`;
  const entry = costCache.get(key) ?? { at: 0, costs: null, tried: 0, pending: null };
  costCache.set(key, entry);
  const now = Date.now();
  if ((entry.costs && entry.at > now - DEWABIZ_PRICE_TTL_MS) || entry.tried > now - DEWABIZ_RETRY_AFTER_MS) return entry.costs;
  if (entry.pending) return entry.costs;
  entry.pending = dewabizFetchCosts(cfg)
    .then((costs) => {
      if (costs !== null) Object.assign(entry, { at: Date.now(), costs, tried: 0 });
      else {
        entry.tried = Date.now();
        if (!entry.costs) console.error('[dewabiz] price list unavailable, using the default domain prices');
      }
      return entry.costs;
    })
    .finally(() => {
      entry.pending = null;
    });
  return entry.pending;
}

/** GET /account/prices (semua halaman, maks. 20): hanya ekstensi aktif. */
async function dewabizFetchCosts(cfg) {
  const costs = {};
  for (let page = 1, last = 1; page <= last && page <= 20; page++) {
    const { code, body } = await dewabizGet(cfg, '/account/prices', { page, limit: 100 });
    if (code !== 200 || !isObject(body) || !Array.isArray(body.data)) {
      console.error(`[dewabiz] GET /account/prices page ${page}: HTTP ${code}`);
      return null;
    }
    for (const item of body.data) {
      const ext = isObject(item) ? item.domain_extension : null;
      if (!isObject(ext) || Math.trunc(Number(ext.status ?? 0)) !== 1) continue;
      const tld = asciiLower(phpTrim(String(ext.extension ?? ''))).replace(/^\.+/, '');
      if (!/^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*$/.test(tld)) continue;
      const cost = Math.max(dewabizFirstYear(item.registration), dewabizFirstYear(item.renewal));
      if (cost > 0) costs[tld] = Math.max(costs[tld] ?? 0, cost);
    }
    last = Math.trunc(Number(body.meta?.last_page ?? 1)) || 1;
  }
  return Object.keys(costs).length ? costs : null;
}

/** Harga 1 tahun dari {"1": 100000, "2": ...} (nilai angka atau teks), atau elemen pertama bila berupa daftar. */
export function dewabizFirstYear(prices) {
  let value;
  if (Array.isArray(prices)) value = prices[0];
  else if (isObject(prices)) value = prices['1'];
  else return 0;
  return isNumeric(value) && Number(value) > 0 ? Math.ceil(Number(value)) : 0;
}
