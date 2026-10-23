// Sumber kunjungan dari sisi browser (docs/platform/SEO-PLAN.md §5.9 langkah 2): sekali per sesi, host referrer saja,
// path tanpa query, utm_source saja. Validasi akhir ada di server (__tests__/backend/visit-sources.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { referrerHostOf, trackVisitOnce, visitSourceOf } from '../visitTracking';

describe('referrerHostOf', () => {
  it('hanya host, tanpa path atau query', () => {
    expect(referrerHostOf('https://chatgpt.com/')).toBe('chatgpt.com');
    expect(referrerHostOf('https://www.Google.co.id/search?q=template+website')).toBe('www.google.co.id');
    expect(referrerHostOf('android-app://com.google.android.googlequicksearchbox/')).toBe('com.google.android.googlequicksearchbox');
  });

  it('kosong, tidak valid, atau dari Garuda Nexa sendiri = null', () => {
    expect(referrerHostOf('')).toBeNull();
    expect(referrerHostOf('bukan url')).toBeNull();
    expect(referrerHostOf('https://garudanexa.com/template')).toBeNull();
    expect(referrerHostOf('https://www.garudanexa.com/')).toBeNull();
    expect(referrerHostOf('http://localhost:5173/harga')).toBeNull();
  });
});

describe('visitSourceOf', () => {
  it('path landing tanpa query, utm_source saja', () => {
    expect(visitSourceOf({ pathname: '/template/aura-studio', search: '?utm_source=chatgpt.com&utm_medium=referral&q=rahasia' }, 'https://chatgpt.com/')).toEqual({
      referrer_host: 'chatgpt.com',
      landing_path: '/template/aura-studio',
      utm_source: 'chatgpt.com',
    });
    expect(visitSourceOf({ pathname: '/', search: '' }, '')).toEqual({ referrer_host: null, landing_path: '/', utm_source: null });
    expect(visitSourceOf({ pathname: '/harga', search: `?utm_source=${'x'.repeat(300)}` }, '').utm_source).toHaveLength(100);
    expect(visitSourceOf({ pathname: '/harga', search: '?utm_source=%20%20' }, '').utm_source).toBeNull();
  });
});

describe('trackVisitOnce', () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response('{"success":true}')));

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/template/finova?utm_source=perplexity&ref=x');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('POST sekali per sesi dengan sumbernya, bukan URL lengkap', () => {
    trackVisitOnce();
    trackVisitOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api.php?action=track_visit');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'track_visit',
      referrer_host: null,
      landing_path: '/template/finova',
      utm_source: 'perplexity',
    });
  });

  it('tetap aman bila sessionStorage diblokir', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => trackVisitOnce()).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    getItem.mockRestore();
  });

  it('gagal kirim tidak melempar error', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    expect(() => trackVisitOnce()).not.toThrow();
    await Promise.resolve();
  });
});
