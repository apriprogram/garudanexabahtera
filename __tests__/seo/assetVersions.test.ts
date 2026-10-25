// @vitest-environment node
// Jalankan: npx vitest run __tests__/seo/assetVersions.test.ts
// ?v=<hash isi> untuk kartu OG dan pratinjau template (scripts/asset-versions.mjs → virtual:gn-asset-versions →
// src/seo/assetVersion.ts): Cloudflare menyimpan gambar 30 hari per URL, jadi gambar yang diganti dengan nama sama
// harus mendapat URL baru. Peta harus selalu sama dengan isi berkas, helper tidak boleh menggandakan versi, dan data
// admin (yang dikirim balik saat menyimpan) tidak boleh ikut diberi versi.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ASSET_VERSION_LENGTH, assetVersionsPlugin, computeAssetVersions } from '../../scripts/asset-versions.mjs';
import { apiGet, clearApiCache, peekApiGet, primeApiGet, apiUrl } from '../../src/lib/api';
import { ASSET_VERSIONS, versionTemplateImages, versionTemplateResponse, versionedAsset } from '../../src/seo/assetVersion';
import { isOgCardUrl, ogCardUrl } from '../../src/seo/og';
import { OG_CARDS } from '../../src/seo/ogCards.generated';

const ROOT = resolve(__dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const HEX = new RegExp(`^[0-9a-f]{${ASSET_VERSION_LENGTH}}$`);
const PREVIEW = '/assets/templates/aura-studio-preview.webp';

describe('peta versi (virtual:gn-asset-versions)', () => {
  it('sama dengan hash isi berkas di public/ saat ini (dihitung ulang setiap build, tanpa langkah manual)', () => {
    expect(ASSET_VERSIONS).toEqual(computeAssetVersions(PUBLIC));
    expect(ASSET_VERSION_LENGTH).toBe(8);
  });

  it('setiap kartu OG punya versi', () => {
    for (const name of OG_CARDS) expect(ASSET_VERSIONS[`/og/${name}.jpg`], name).toMatch(HEX);
  });

  it('setiap pratinjau & galeri template di seed punya versi; subfolder (photos/, logos/) tidak ikut', () => {
    const seed = readFileSync(join(ROOT, 'database', 'seed.templates.sql'), 'utf8');
    const paths = [...new Set(seed.match(/\/assets\/templates\/[a-z0-9._-]+\.(?:webp|png|jpe?g)/g) ?? [])];
    expect(paths.length).toBeGreaterThan(20);
    for (const path of paths) expect(ASSET_VERSIONS[path], path).toMatch(HEX);
    for (const [key, value] of Object.entries(ASSET_VERSIONS)) {
      expect(key).toMatch(/^\/(og\/[a-z0-9-]+\.jpg|assets\/templates\/[A-Za-z0-9._-]+\.(webp|png|jpe?g|svg))$/);
      expect(value, key).toMatch(HEX);
    }
  });

  it('isi berubah → versi berubah; SVG CRLF dan LF → versi sama (tidak bergantung core.autocrlf)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gn-asset-versions-'));
    try {
      mkdirSync(join(dir, 'og'));
      mkdirSync(join(dir, 'assets', 'templates', 'photos'), { recursive: true });
      writeFileSync(join(dir, 'og', 'harga.jpg'), 'a');
      writeFileSync(join(dir, 'assets', 'templates', 'x-preview.svg'), '<svg>\r\n</svg>\r\n');
      writeFileSync(join(dir, 'assets', 'templates', 'photos', 'foto-1200.webp'), 'p');
      writeFileSync(join(dir, 'assets', 'templates', 'catatan.txt'), 't');
      const first = computeAssetVersions(dir);
      expect(Object.keys(first)).toEqual(['/og/harga.jpg', '/assets/templates/x-preview.svg']);
      writeFileSync(join(dir, 'assets', 'templates', 'x-preview.svg'), '<svg>\n</svg>\n');
      expect(computeAssetVersions(dir)['/assets/templates/x-preview.svg']).toBe(first['/assets/templates/x-preview.svg']);
      writeFileSync(join(dir, 'og', 'harga.jpg'), 'b');
      expect(computeAssetVersions(dir)['/og/harga.jpg']).not.toBe(first['/og/harga.jpg']);
      expect(computeAssetVersions(join(dir, 'tidak-ada'))).toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('plugin dev (configureServer)', () => {
  it('berkas di peta berubah → modul virtual di-invalidate; tidak pernah reload paksa; photos/, logos/, folder lain diabaikan', () => {
    const handlers: Record<string, (file: string) => void> = {};
    const invalidated: string[] = [];
    const sent: unknown[] = [];
    const graph = {
      getModuleById: (id: string) => ({ id }),
      invalidateModule: (mod: { id: string }) => invalidated.push(mod.id),
    };
    const server = {
      moduleGraph: graph,
      environments: {},
      watcher: { on: (event: string, fn: (file: string) => void) => (handlers[event] = fn) },
      ws: { send: (msg: unknown) => sent.push(msg) },
    };
    const plugin = assetVersionsPlugin({ publicDir: PUBLIC }) as unknown as { configureServer: (s: unknown) => void };
    plugin.configureServer(server);
    const at = (...parts: string[]) => join(PUBLIC, ...parts);
    for (const event of ['add', 'change', 'unlink']) {
      handlers[event](at('assets', 'templates', 'photos', 'foto-1200.webp'));
      handlers[event](at('assets', 'templates', 'logos', 'x.svg'));
      handlers[event](at('assets', 'product', 'p.webp'));
      handlers[event](at('og', 'catatan.txt'));
    }
    expect(invalidated).toEqual([]);
    handlers.change(at('og', 'harga.jpg'));
    handlers.add(at('assets', 'templates', 'madani_0123456789ab.webp'));
    expect(invalidated).toEqual(['\0virtual:gn-asset-versions', '\0virtual:gn-asset-versions']);
    expect(sent).toEqual([]);
  });
});

describe('versionedAsset', () => {
  const v = ASSET_VERSIONS[PREVIEW];

  it('path situs dan URL absolut garudanexa.com berkas yang dikenal → ?v=<hash>', () => {
    expect(versionedAsset(PREVIEW)).toBe(`${PREVIEW}?v=${v}`);
    expect(versionedAsset(`https://garudanexa.com${PREVIEW}`)).toBe(`https://garudanexa.com${PREVIEW}?v=${v}`);
    expect(versionedAsset(`  ${PREVIEW} `)).toBe(`${PREVIEW}?v=${v}`);
  });

  it('idempoten; query/hash yang sudah ada, berkas tak dikenal, URL luar, dan nilai kosong apa adanya', () => {
    expect(versionedAsset(versionedAsset(PREVIEW))).toBe(`${PREVIEW}?v=${v}`);
    expect(versionedAsset(`${PREVIEW}?v=lama`)).toBe(`${PREVIEW}?v=lama`);
    expect(versionedAsset(`${PREVIEW}#x`)).toBe(`${PREVIEW}#x`);
    expect(versionedAsset('/assets/templates/foto_0123456789ab.webp')).toBe('/assets/templates/foto_0123456789ab.webp');
    expect(versionedAsset('/assets/templates/photos/cakrawala-hero-1-1920.webp')).toBe('/assets/templates/photos/cakrawala-hero-1-1920.webp');
    expect(versionedAsset('https://cdn.contoh.test/assets/templates/aura-studio-preview.webp')).toBe(
      'https://cdn.contoh.test/assets/templates/aura-studio-preview.webp',
    );
    expect(versionedAsset(`//garudanexa.com${PREVIEW}`)).toBe(`//garudanexa.com${PREVIEW}`);
    expect(versionedAsset('assets/templates/aura-studio-preview.webp')).toBe('assets/templates/aura-studio-preview.webp');
    expect(versionedAsset('')).toBe('');
  });
});

describe('kartu OG berversi', () => {
  it('ogCardUrl: …/og/{kartu}.jpg?v=<hash kartu itu>; kartu yang tidak ada → default dengan versi default', () => {
    expect(ogCardUrl('harga')).toBe(`https://garudanexa.com/og/harga.jpg?v=${ASSET_VERSIONS['/og/harga.jpg']}`);
    expect(ogCardUrl('tidak-ada')).toBe(`https://garudanexa.com/og/default.jpg?v=${ASSET_VERSIONS['/og/default.jpg']}`);
  });

  it('isOgCardUrl mengabaikan query versi (og:image:width/height tetap ditulis)', () => {
    expect(isOgCardUrl(ogCardUrl('harga'))).toBe(true);
    expect(isOgCardUrl('https://garudanexa.com/og/harga.jpg')).toBe(true);
    expect(isOgCardUrl('https://garudanexa.com/og/harga.png?v=1')).toBe(false);
    expect(isOgCardUrl(`https://garudanexa.com${PREVIEW}?v=1`)).toBe(false);
    expect(isOgCardUrl('https://contoh.test/og/harga.jpg?v=1')).toBe(false);
  });
});

describe('data template dari API', () => {
  const raw = {
    id: 4,
    slug: 'aura-studio',
    preview_image: PREVIEW,
    gallery: ['/assets/templates/aura-studio-1.webp', PREVIEW, '/assets/sites/9/unggahan.webp', 7],
  };

  it('versionTemplateImages: pratinjau & galeri berversi di objek baru; aslinya tidak diubah', () => {
    const before = structuredClone(raw);
    const out = versionTemplateImages(raw);
    expect(out).not.toBe(raw);
    expect(raw).toEqual(before);
    expect(out.preview_image).toBe(versionedAsset(PREVIEW));
    expect(out.gallery).toEqual([versionedAsset('/assets/templates/aura-studio-1.webp'), versionedAsset(PREVIEW), '/assets/sites/9/unggahan.webp', 7]);
    expect(versionTemplateImages(null)).toBeNull();
  });

  it('versionTemplateResponse: hanya get_templates/get_template; respons admin apa adanya; hasil di-cache per objek', () => {
    const list = { success: true, templates: [raw] };
    const one = { success: true, template: raw };
    const admin = { templates: [raw] };
    expect(versionTemplateResponse('get_templates', list).templates[0].preview_image).toBe(versionedAsset(PREVIEW));
    expect(versionTemplateResponse('get_template', one).template.preview_image).toBe(versionedAsset(PREVIEW));
    expect(versionTemplateResponse('admin_get_templates', admin)).toBe(admin);
    expect(versionTemplateResponse('get_templates', list)).toBe(versionTemplateResponse('get_templates', list));
    expect(list.templates[0].preview_image).toBe(PREVIEW);
  });
});

describe('apiGet & peekApiGet', () => {
  afterEach(() => {
    clearApiCache();
    vi.unstubAllGlobals();
  });

  const stubFetch = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = String(url).includes('action=get_template&') ? { success: true, template: { ...raw() } } : { success: true, templates: [raw()] };
        return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
  const raw = () => ({ id: 4, slug: 'aura-studio', preview_image: PREVIEW, gallery: [PREVIEW] });

  it('get_templates & get_template publik → gambar berversi', async () => {
    stubFetch();
    const list = await apiGet<{ templates: { preview_image: string; gallery: string[] }[] }>('get_templates');
    expect(list.templates[0].preview_image).toBe(versionedAsset(PREVIEW));
    expect(list.templates[0].gallery).toEqual([versionedAsset(PREVIEW)]);
    const one = await apiGet<{ template: { preview_image: string } }>('get_template', { slug: 'aura-studio' });
    expect(one.template.preview_image).toBe(versionedAsset(PREVIEW));
  });

  it('admin_get_templates TIDAK diberi versi (nilainya dikirim balik ke admin_save_template)', async () => {
    stubFetch();
    const admin = await apiGet<{ templates: { preview_image: string; gallery: string[] }[] }>('admin_get_templates');
    expect(admin.templates[0].preview_image).toBe(PREVIEW);
    expect(admin.templates[0].gallery).toEqual([PREVIEW]);
  });

  it('peekApiGet (data preload prerender) berversi sama dengan apiGet, objek yang sama tiap dibaca', () => {
    primeApiGet(apiUrl('get_templates'), { success: true, templates: [raw()] });
    const first = peekApiGet<{ templates: { preview_image: string }[] }>('get_templates');
    expect(first?.templates[0].preview_image).toBe(versionedAsset(PREVIEW));
    expect(peekApiGet('get_templates')).toBe(first);
    expect(peekApiGet('get_template', { slug: 'tidak-ada' })).toBeUndefined();
  });
});
