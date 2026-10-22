// Data preload HTML prerender (src/lib/preload.ts, docs/platform/SEO-PLAN.md §5.2 langkah 2): primePreload mengisi cache
// yang dibaca komponen di render pertama, readPreload membaca <script id="gn-preload">, useHydrated = false saat render
// server/hidrasi, dan useCachedJson tetap menyegarkan data preload dari server.
import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { peekApiGet } from '../api';
import { useCachedJson } from '../../hooks/useCachedJson';
import { PRELOAD_URLS, preloadNow, primePreload, resetPreload, seoDataFromApi, useHydrated } from '../preload';
import { FIXTURE_API, FIXTURE_BUILT_AT, FIXTURE_TEMPLATES, fixturePreload } from './preloadFixture';

const identity = (data: unknown) => data;

describe('primePreload', () => {
  afterEach(() => {
    resetPreload();
    vi.restoreAllMocks();
  });

  it('makes API responses readable synchronously (peekApiGet) by request URL', () => {
    expect(peekApiGet('get_templates')).toBeUndefined();
    primePreload(fixturePreload('/template/finova'));
    expect(peekApiGet<{ templates: unknown[] }>('get_templates')?.templates).toHaveLength(5);
    expect(peekApiGet<{ template: { slug: string } }>('get_template', { slug: 'finova' })?.template.slug).toBe('finova');
    expect(peekApiGet('get_template', { slug: 'aura-studio' })).toBeUndefined();
    resetPreload();
    expect(peekApiGet('get_templates')).toBeUndefined();
  });

  it('gives useCachedJson its data on the first render, then still refreshes it from the server', async () => {
    primePreload(fixturePreload('/'));
    const fresh = { ...(FIXTURE_API[PRELOAD_URLS.settings] as object), contact_email: 'baru@garudanexa.com' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(fresh)));
    const { result } = renderHook(() => useCachedJson(PRELOAD_URLS.settings, identity, {}));
    expect(result.current.loaded).toBe(true);
    expect((result.current.data as { contact_email: string }).contact_email).toBe('info@garudanexa.com');
    await waitFor(() => expect((result.current.data as { contact_email: string }).contact_email).toBe('baru@garudanexa.com'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the preloaded data when the refresh fails', async () => {
    primePreload(fixturePreload('/'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const { result } = renderHook(() => useCachedJson(PRELOAD_URLS.settings, identity, {}));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect((result.current.data as { contact_email: string }).contact_email).toBe('info@garudanexa.com');
  });

  it('without preload: loading first, the fallback when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const { result } = renderHook(() => useCachedJson(PRELOAD_URLS.settings, identity, { kosong: true }));
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.data).toEqual({ kosong: true });
  });
});

describe('readPreload (browser)', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  const freshModule = () => import('../preload');

  it('parses <script id="gn-preload">, including the escaped "<"', async () => {
    const data = { ...fixturePreload('/'), path: '/', note: '</script><!--' };
    const script = document.createElement('script');
    script.id = 'gn-preload';
    script.type = 'application/json';
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    document.body.appendChild(script);
    const { readPreload } = await freshModule();
    expect(readPreload()).toMatchObject({ path: '/', builtAt: FIXTURE_BUILT_AT, note: '</script><!--' });
  });

  it('returns null without the element, or when its content is not preload data', async () => {
    expect((await freshModule()).readPreload()).toBeNull();
    vi.resetModules();
    const script = document.createElement('script');
    script.id = 'gn-preload';
    script.type = 'application/json';
    script.textContent = '{"bukan":"preload"}';
    document.body.appendChild(script);
    expect((await freshModule()).readPreload()).toBeNull();
  });
});

describe('preloadNow', () => {
  afterEach(() => resetPreload());

  it('is the time the data was fetched while preload data is primed (server render and hydration agree)', () => {
    primePreload(fixturePreload('/'));
    expect(preloadNow()).toBe(Date.parse(FIXTURE_BUILT_AT));
    resetPreload();
    const before = Date.now();
    expect(preloadNow()).toBeGreaterThanOrEqual(before);
  });
});

describe('useHydrated', () => {
  const Probe = () => <span>{useHydrated() ? 'klien' : 'server'}</span>;

  it('is false in the server render and true in a normal client render', () => {
    expect(renderToString(<Probe />)).toContain('server');
    expect(renderHook(() => useHydrated()).result.current).toBe(true);
  });
});

describe('seoDataFromApi', () => {
  it('builds the SeoData contract from the raw responses', () => {
    const data = seoDataFromApi(FIXTURE_API, FIXTURE_BUILT_AT);
    expect(data.templates.map((t) => t.slug)).toEqual(FIXTURE_TEMPLATES.map((t) => t.slug));
    expect(Object.keys(data.templateBySlug).sort()).toEqual(FIXTURE_TEMPLATES.map((t) => t.slug).sort());
    expect(data.settings.contact_email).toBe('info@garudanexa.com');
    expect(data.navbar).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.builtAt).toBe(FIXTURE_BUILT_AT);
  });

  it('prefers the per-slug get_template response and survives missing or broken responses', () => {
    const api = {
      [PRELOAD_URLS.template('finova')]: { template: { ...FIXTURE_TEMPLATES[4], name: 'Finova Baru' } },
      [PRELOAD_URLS.settings]: { error: 'x' },
      [PRELOAD_URLS.templates]: { templates: [FIXTURE_TEMPLATES[4], null, { bukan: 'template' }] },
    };
    const data = seoDataFromApi(api, FIXTURE_BUILT_AT);
    expect(data.templates).toHaveLength(1);
    expect(data.templateBySlug.finova.name).toBe('Finova Baru');
    expect(data.projects).toEqual([]);
  });
});
