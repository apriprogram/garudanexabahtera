// Hidrasi HTML prerender tanpa mismatch (docs/platform/SEO-PLAN.md §5.2, WP2).
// Server: pohon yang sama dengan src/entry-server.tsx (StrictMode → StaticRouter → SeoManager + App) dengan data
// preload, tanpa query string (HTML _pre/*.html dibuat per path). Klien: hydrateRoot dengan data preload yang sama di
// URL sebenarnya (boleh ber-query), seperti src/main.tsx. React versi development melaporkan setiap perbedaan teks
// maupun atribut lewat console.error / onRecoverableError; keduanya harus kosong dan node <h1> server tetap dipakai.
import { StrictMode } from 'react';
import { act } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { prerender } from 'react-dom/static';
// react-router-dom (v7) mengekspor ulang react-router; satu specifier = satu instance konteks router di Vitest
import * as Router from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { primePreload, resetPreload } from '../lib/preload';
import { SeoManager } from '../seo/SeoManager';
import { fixtureFetch, fixturePreload } from '../lib/__tests__/preloadFixture';

/**
 * Konteks react-router. Server (Fizz) dan klien berbagi objek konteks yang sama karena tes menjalankan keduanya di satu
 * proses: render server yang ditunda React.lazy bisa meninggalkan nilai konteks (mis. lokasi StaticRouter) yang lalu
 * terbaca klien ("<Router> inside another <Router>"). Di deploy keduanya proses terpisah; di sini dikembalikan manual.
 */
type ContextObject = { $$typeof: symbol; _currentValue: unknown; _currentValue2: unknown };
const ROUTER_CONTEXTS = (Object.values(Router) as unknown[]).filter(
  (value): value is ContextObject => Boolean(value) && (value as ContextObject).$$typeof === Symbol.for('react.context'),
);
const CONTEXT_DEFAULTS = ROUTER_CONTEXTS.map((context) => [context, context._currentValue, context._currentValue2] as const);
const restoreRouterContexts = () => {
  for (const [context, value, value2] of CONTEXT_DEFAULTS) {
    context._currentValue = value;
    context._currentValue2 = value2;
  }
};

const HYDRATION_PROBLEM = /hydrat|did(?: not|n't) match|server rendered|Suspense boundary received an update/i;

async function serverHtml(path: string): Promise<string> {
  resetPreload();
  primePreload(fixturePreload(path));
  const { prelude } = await prerender(
    <StrictMode>
      <Router.StaticRouter location={path}>
        <SeoManager />
        <App />
      </Router.StaticRouter>
    </StrictMode>,
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );
  const html = await new Response(prelude).text();
  restoreRouterContexts();
  return html;
}

const hasFiber = (node: Element | null) => Boolean(node) && Object.keys(node as object).some((key) => key.startsWith('__reactFiber$'));

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  resetPreload();
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Render server (tanpa sesi, tanpa preferensi browser: seperti Node saat deploy) lalu hidrasi di "browser".
 * `browser` menyiapkan keadaan yang hanya ada di klien (localStorage, matchMedia) setelah HTML server dibuat.
 */
async function hydrate(path: string, { clientUrl = path, browser }: { clientUrl?: string; browser?: () => void } = {}) {
  const html = await serverHtml(path);
  browser?.();
  expect(html).not.toMatch(/<!--\$[!?]-->/);
  container = document.createElement('div');
  container.id = 'root';
  container.innerHTML = html;
  document.body.appendChild(container);
  const serverH1 = container.querySelector('h1');
  expect(serverH1).not.toBeNull();

  resetPreload();
  primePreload(fixturePreload(path));
  vi.stubGlobal('fetch', vi.fn(fixtureFetch));
  const problems: string[] = [];
  const consoleError = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const text = args.map(String).join(' ');
    if (HYDRATION_PROBLEM.test(text)) problems.push(text.slice(0, 2000));
    else if (!/Not implemented|getContext/.test(text)) consoleError(...args);
  });
  await act(async () => {
    root = hydrateRoot(
      container!,
      <StrictMode>
        <Router.MemoryRouter initialEntries={[clientUrl]}>
          <SeoManager />
          <App />
        </Router.MemoryRouter>
      </StrictMode>,
      { onRecoverableError: (error) => problems.push(`recoverable: ${String(error)}`) },
    );
  });
  // Batas Suspense rute (React.lazy) terhidrasi setelah chunk-nya dimuat
  await vi.waitFor(() => expect(hasFiber(container!.querySelector('h1'))).toBe(true), { timeout: 10_000 });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return { problems, serverH1, container: container! };
}

describe('hydrating prerendered pages', () => {
  it('/template/aura-studio: same DOM, no mismatch, data from the preload (no skeleton)', async () => {
    const { problems, serverH1, container: el } = await hydrate('/template/aura-studio');
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    expect(serverH1?.textContent).toContain('Aura Studio');
    expect(el.textContent).toContain('1.390.000');
  }, 30_000);

  // WP5: isi panjang halaman template, katalog dan kategori ada di HTML server dan terhidrasi tanpa perbedaan
  it('/template/aura-studio (WP5): ≥ 600 words in <main> and links to category, /harga, custom service and a guide', async () => {
    const { problems, container: el } = await hydrate('/template/aura-studio');
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')?.textContent).toBe('Aura Studio: Template Website Klinik Kecantikan & Salon');
    const main = el.querySelector('main') as HTMLElement;
    expect((main.textContent ?? '').match(/[\p{L}\p{N}]+/gu)?.length ?? 0).toBeGreaterThanOrEqual(600);
    const hrefs = new Set([...main.querySelectorAll('a')].map((a) => a.getAttribute('href')));
    for (const href of ['/template/kategori/kecantikan-klinik', '/harga', '/jasa-pembuatan-website']) expect(hrefs).toContain(href);
    expect([...hrefs].some((href) => href === '/panduan' || href?.startsWith('/panduan/'))).toBe(true);
  }, 30_000);

  const mainLinks = (el: HTMLElement) => new Set([...el.querySelectorAll('main a')].map((a) => a.getAttribute('href')));

  it('/template (WP5): every template card and category chip is an <a href> in the server HTML', async () => {
    const { problems, serverH1, container: el } = await hydrate('/template');
    expect(problems).toEqual([]);
    expect(serverH1?.textContent).toBe('Pilih Template');
    const hrefs = mainLinks(el);
    for (const slug of ['corporate-nexa', 'startup-clean', 'arena-club', 'aura-studio', 'finova', 'serenity']) expect(hrefs).toContain(`/template/${slug}`);
    for (const slug of ['company-profile', 'kecantikan-klinik', 'olahraga-komunitas', 'fintech-startup', 'yoga-wellness']) {
      expect(hrefs).toContain(`/template/kategori/${slug}`);
    }
  }, 30_000);

  it('/template/kategori/kecantikan-klinik (WP5): template links and the checklist in the server HTML', async () => {
    const { problems, serverH1, container: el } = await hydrate('/template/kategori/kecantikan-klinik');
    expect(problems).toEqual([]);
    expect(serverH1?.textContent).toBe('Template website klinik kecantikan & salon');
    expect(mainLinks(el)).toContain('/template/aura-studio');
    expect(el.textContent).toContain('Apa yang perlu ada di website klinik kecantikan & salon');
  }, 30_000);

  it('/template/kategori/yoga-wellness: Serenity link and the checklist in the server HTML', async () => {
    const { problems, serverH1, container: el } = await hydrate('/template/kategori/yoga-wellness');
    expect(problems).toEqual([]);
    expect(serverH1?.textContent).toBe('Template website studio yoga & pilates');
    expect(mainLinks(el)).toContain('/template/serenity');
    expect(mainLinks(el)).not.toContain('/template/arena-club');
    expect(el.textContent).toContain('Apa yang perlu ada di website studio yoga & pilates');
  }, 30_000);

  it('/pesan-custom?layanan=mobile: query string and session are applied only after hydration', async () => {
    const payload = btoa(JSON.stringify({ sub: 9, role: 'customer', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const { problems, serverH1, container: el } = await hydrate('/pesan-custom', {
      clientUrl: '/pesan-custom?layanan=mobile',
      browser: () => {
        localStorage.setItem('authToken', `x.${payload}.y`);
        localStorage.setItem('currentUser', JSON.stringify({ id: 9, name: 'Uji Pembeli', email: 'uji@example.test', role: 'customer' }));
      },
    });
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    await vi.waitFor(() => {
      expect(el.querySelector<HTMLInputElement>('input[type="radio"][value="mobile_app"]')?.checked).toBe(true);
      expect(el.querySelector<HTMLInputElement>('#co-name')?.value).toBe('Uji Pembeli');
      // Pembeli yang login: baris akun berganti ke "Akun Saya" (bukan "Daftar Akun") setelah hidrasi
      expect(el.textContent).toContain('atau buka Akun Saya');
    });
  }, 30_000);

  it('404.html (rendered at /404) hydrates at any path without an owner, then shows that path', async () => {
    const { problems, serverH1, container: el } = await hydrate('/404', { clientUrl: '/halaman-tidak-ada' });
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    await vi.waitFor(() => expect(el.textContent).toContain('/halaman-tidak-ada'));
  }, 30_000);

  it('/ with prefers-reduced-motion: the hero media renders like the server first', async () => {
    const reducedMotion = () =>
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
          }) as MediaQueryList,
      );
    const { problems, serverH1, container: el } = await hydrate('/', { browser: reducedMotion });
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    // Katalog dari preload sudah ada di HTML server: tautan ke setiap template
    const links = new Set([...el.querySelectorAll('a[href^="/template/"]')].map((a) => a.getAttribute('href')));
    expect(links.size).toBeGreaterThanOrEqual(5);
  }, 30_000);
});
