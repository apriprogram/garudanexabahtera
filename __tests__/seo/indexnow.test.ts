// @vitest-environment node
// Jalankan: npx vitest run __tests__/seo
// IndexNow (docs/platform/SEO-PLAN.md §5.4 langkah 4). Tidak pernah menghubungi endpoint sungguhan: fetch selalu tiruan.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { INDEXNOW_ENDPOINT, changedUrls, findKey, indexNowPayload, submitIndexNow, verifyKeyLive } from '../../scripts/seo/indexnow.mjs';
import { buildSitemap } from '../../scripts/seo/sitemap.mjs';

const ROOT = resolve(__dirname, '..', '..');

const sitemap = (entries: { path: string; lastmod: string }[]) => buildSitemap(entries, 'https://garudanexa.com');

describe('kunci', () => {
  it('tepat satu public/{32 hex}.txt yang isinya kunci itu sendiri', () => {
    const key = findKey(join(ROOT, 'public'));
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(readFileSync(join(ROOT, 'public', `${key}.txt`), 'utf8').trim()).toBe(key);
  });
});

describe('changedUrls', () => {
  const before = sitemap([
    { path: '/', lastmod: '2026-10-23' },
    { path: '/template/aura-studio', lastmod: '2026-10-23' },
    { path: '/template/lama', lastmod: '2026-10-20' },
  ]);
  const after = sitemap([
    { path: '/', lastmod: '2026-10-23' },
    { path: '/template/aura-studio', lastmod: '2026-11-01' },
    { path: '/template/baru', lastmod: '2026-11-01' },
  ]);

  it('URL baru, lastmod berubah, dan URL yang dihapus; yang sama tidak dikirim', () => {
    expect(changedUrls(before, after)).toEqual([
      'https://garudanexa.com/template/aura-studio',
      'https://garudanexa.com/template/baru',
      'https://garudanexa.com/template/lama',
    ]);
    expect(changedUrls(after, after)).toEqual([]);
  });

  it('tanpa sitemap sebelumnya: semua URL', () => {
    expect(changedUrls(null, after)).toHaveLength(3);
  });
});

describe('payload & kiriman', () => {
  const key = 'a'.repeat(32);

  it('payload JSON IndexNow: host, key, keyLocation, urlList; URL host lain ditolak', () => {
    expect(indexNowPayload({ key, urlList: ['https://garudanexa.com/'] })).toEqual({
      host: 'garudanexa.com',
      key,
      keyLocation: `https://garudanexa.com/${key}.txt`,
      urlList: ['https://garudanexa.com/'],
    });
    expect(() => indexNowPayload({ key, urlList: ['https://contoh.com/'] })).toThrow(/bukan milik/);
    expect(() => indexNowPayload({ key: 'xyz', urlList: [] })).toThrow(/kunci/);
  });

  it('POST JSON ke api.indexnow.org; 200/202 diterima, kode lain menjadi error yang jelas', async () => {
    const payload = indexNowPayload({ key, urlList: ['https://garudanexa.com/template/aura-studio'] });
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));
    expect(await submitIndexNow(payload, { fetchImpl })).toEqual({ status: 202 });
    expect(fetchImpl).toHaveBeenCalledWith(INDEXNOW_ENDPOINT, expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual(payload);
    await expect(submitIndexNow(payload, { fetchImpl: async () => new Response(null, { status: 403 }) })).rejects.toThrow(/403/);
    expect(await submitIndexNow({ ...payload, urlList: [] }, { fetchImpl })).toMatchObject({ skipped: true });
  });

  it('file kunci harus sudah live sebelum mengirim', async () => {
    const payload = indexNowPayload({ key, urlList: ['https://garudanexa.com/'] });
    await expect(verifyKeyLive(payload, { fetchImpl: async () => new Response(key) })).resolves.toBeUndefined();
    await expect(verifyKeyLive(payload, { fetchImpl: async () => new Response('<html>', { status: 404 }) })).rejects.toThrow(/belum live/);
  });
});
