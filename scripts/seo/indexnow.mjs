#!/usr/bin/env node
// IndexNow (docs/platform/SEO-PLAN.md §5.4 langkah 4): beri tahu Bing (dan mesin IndexNow lain) URL yang berubah.
//
// Dijalankan SETELAH Pull/Deploy di cPanel (deploy di sini dua langkah), dari mesin deploy:
//   node scripts/seo/indexnow.mjs              # uji coba: tampilkan URL & payload, TIDAK mengirim apa pun
//   node scripts/seo/indexnow.mjs --submit     # kirim, lalu simpan sitemap ini sebagai "terakhir dikirim"
// Opsi: --deploy-dir DIR (bawaan $DEPLOY_DIR atau ../.garudanexa-deploy), --sitemap FILE (bawaan DIR/build/sitemap.xml),
//       --all (kirim semua URL di sitemap, bukan hanya yang berubah).
// URL yang dikirim = URL baru atau yang <lastmod>-nya berubah dibanding sitemap yang terakhir berhasil dikirim
// (DIR/indexnow/last-sitemap.xml), ditambah URL yang hilang dari sitemap (IndexNow juga menerima URL yang dihapus).
// Kunci: public/{32 hex}.txt yang isinya kunci itu sendiri; sebelum mengirim, skrip memastikan file kunci live di
// https://garudanexa.com/{kunci}.txt. Jika Cloudflare Crawler Hints aktif, skrip ini opsional.
// Detail operasional: docs/platform/SEO-RUNBOOK.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSitemap } from './sitemap.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const SITE_ORIGIN = 'https://garudanexa.com';
const MAX_URLS = 10000;
const KEY_FILE = /^([0-9a-f]{32})\.txt$/;

/** Kunci IndexNow dari public/: file {kunci}.txt yang isinya sama dengan namanya. */
export function findKey(publicDir = join(ROOT, 'public')) {
  const keys = readdirSync(publicDir)
    .map((name) => KEY_FILE.exec(name)?.[1])
    .filter((key) => key && readFileSync(join(publicDir, `${key}.txt`), 'utf8').trim() === key);
  if (keys.length !== 1) throw new Error(`[indexnow] harus ada tepat satu public/{32 hex}.txt berisi kuncinya (ditemukan ${keys.length})`);
  return keys[0];
}

/**
 * URL yang perlu dikirim: baru, lastmod berubah, atau hilang dari sitemap baru. Tanpa sitemap sebelumnya → semua URL.
 * Urutan: urutan sitemap baru, lalu URL yang dihapus.
 */
export function changedUrls(previousXml, nextXml) {
  const next = parseSitemap(nextXml);
  if (!previousXml) return next.map((e) => e.loc);
  const before = new Map(parseSitemap(previousXml).map((e) => [e.loc, e.lastmod]));
  const changed = next.filter((e) => !before.has(e.loc) || before.get(e.loc) !== e.lastmod).map((e) => e.loc);
  const nextLocs = new Set(next.map((e) => e.loc));
  const removed = [...before.keys()].filter((loc) => !nextLocs.has(loc));
  return [...changed, ...removed];
}

/** Payload JSON IndexNow; semua URL harus milik host situs. */
export function indexNowPayload({ origin = SITE_ORIGIN, key, urlList }) {
  const host = new URL(origin).hostname;
  if (!/^[0-9a-f]{32}$/.test(String(key))) throw new Error('[indexnow] kunci tidak valid');
  for (const url of urlList) {
    if (new URL(url).hostname !== host) throw new Error(`[indexnow] URL bukan milik ${host}: ${url}`);
  }
  return { host, key, keyLocation: `${origin.replace(/\/+$/, '')}/${key}.txt`, urlList: [...urlList] };
}

/** Kirim satu payload (≤ 10.000 URL). 200/202 = diterima; selain itu Error berisi kode & arti. */
export async function submitIndexNow(payload, { endpoint = INDEXNOW_ENDPOINT, fetchImpl = fetch } = {}) {
  if (payload.urlList.length === 0) return { status: 204, skipped: true };
  if (payload.urlList.length > MAX_URLS) throw new Error(`[indexnow] maksimal ${MAX_URLS} URL per kiriman`);
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (res.status === 200 || res.status === 202) return { status: res.status };
  const meaning =
    { 400: 'format salah', 403: 'kunci tidak valid / file kunci tidak ditemukan', 422: 'URL bukan milik host atau kunci tidak cocok', 429: 'terlalu sering (tunggu)' }[
      res.status
    ] ?? 'gagal';
  throw new Error(`[indexnow] ${endpoint} → HTTP ${res.status} (${meaning})`);
}

/** Pastikan file kunci sudah live (IndexNow memverifikasinya). */
export async function verifyKeyLive(payload, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(payload.keyLocation, { headers: { 'User-Agent': 'GarudaNexaIndexNow/1.0' } });
  const body = res.ok ? (await res.text()).trim() : '';
  if (body !== payload.key) throw new Error(`[indexnow] ${payload.keyLocation} belum live atau isinya salah (HTTP ${res.status}); Pull di cPanel dulu`);
}

function parseArgs(argv) {
  const args = { submit: false, all: false, deployDir: process.env.DEPLOY_DIR || join(ROOT, '..', '.garudanexa-deploy'), sitemap: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--submit') args.submit = true;
    else if (arg === '--all') args.all = true;
    else if (arg === '--deploy-dir') args.deployDir = argv[++i];
    else if (arg === '--sitemap') args.sitemap = argv[++i];
    else throw new Error(`Argumen tidak dikenal: ${arg}`);
  }
  args.sitemap ??= join(args.deployDir, 'build', 'sitemap.xml');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.sitemap)) throw new Error(`${args.sitemap} tidak ada: jalankan deploy (prerender) dulu`);
  const stateDir = join(args.deployDir, 'indexnow');
  const lastFile = join(stateDir, 'last-sitemap.xml');
  const next = readFileSync(args.sitemap, 'utf8');
  const previous = !args.all && existsSync(lastFile) ? readFileSync(lastFile, 'utf8') : null;
  const urls = changedUrls(previous, next);
  const payload = indexNowPayload({ key: findKey(), urlList: urls });
  console.log(`[indexnow] ${urls.length} URL ${previous ? 'berubah sejak kiriman terakhir' : '(semua URL di sitemap)'}`);
  for (const url of urls) console.log(`  ${url}`);
  if (!args.submit) {
    console.log('[indexnow] uji coba: tidak ada yang dikirim. Tambahkan --submit setelah Pull di cPanel.');
    console.log(JSON.stringify({ endpoint: INDEXNOW_ENDPOINT, ...payload }, null, 2));
    return;
  }
  if (urls.length === 0) {
    console.log('[indexnow] tidak ada perubahan, tidak ada yang dikirim.');
    return;
  }
  await verifyKeyLive(payload);
  const { status } = await submitIndexNow(payload);
  mkdirSync(stateDir, { recursive: true });
  copyFileSync(args.sitemap, lastFile);
  console.log(`[indexnow] diterima (HTTP ${status}); ${lastFile} diperbarui.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
