// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/panduan
// /panduan dan /panduan/{slug} (docs/platform/SEO-PLAN.md §5.8): head (Article + BreadcrumbList, tanggal = tanggal yang
// terlihat), rute untuk prerender/sitemap/llms, lalu render seperti prerender (StaticRouter + data preload) dan hidrasi:
// tanpa mismatch, satu H1, daftar isi = H2, token data terganti, tautan internal <a href> asli, eksternal di tab baru.
// Lalu data yang hanya ada di API (artikel terbit setelah deploy, get_guides gagal): bukan 404 saat navigasi, tautan
// tidak dialihkan tanpa daftar artikel, Sumber dari kolom sumber, dan pesan gagal + "Coba lagi" di /panduan.
import { StrictMode } from 'react';
import { act } from '@testing-library/react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { prerender } from 'react-dom/static';
import * as Router from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../App';
import type { Article } from '../../../../content/panduan';
import { proseBeforeSources } from '../../../../content/panduan/parse';
import { FIXTURE_BUILT_AT, FIXTURE_GUIDES as ARTICLES, fixtureFetch, fixturePreload, guideSummary } from '../../../../lib/__tests__/preloadFixture';
import { PRELOAD_URLS, primePreload, resetPreload, seoDataFromApi } from '../../../../lib/preload';
import { formatDateId } from '../../../../seo/format';
import { getHead, getIndexableRoutes } from '../../../../seo/routes';
import type { SeoData } from '../../../../seo/types';
import { articleHeadTitle } from '../PanduanArticle.seo';
import { GUIDES_DESCRIPTION, GUIDES_TITLE } from '../PanduanIndex.seo';

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
const DATA: SeoData = seoDataFromApi(fixturePreload('/').api, FIXTURE_BUILT_AT);
type Node = Record<string, unknown>;
const nodeOfType = (path: string, type: string) => getHead(path, DATA).jsonLd.find((n) => (n as Node)['@type'] === type) as Node | undefined;

async function serverHtml(path: string): Promise<string> {
  resetPreload();
  primePreload(fixturePreload(path));
  const { prelude } = await prerender(
    <StrictMode>
      <Router.StaticRouter location={path}>
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function hydrate(path: string, fetchImpl: typeof fixtureFetch = fixtureFetch) {
  const html = await serverHtml(path);
  expect(html).not.toMatch(/<!--\$[!?]-->/);
  container = document.createElement('div');
  container.id = 'root';
  container.innerHTML = html;
  document.body.appendChild(container);
  const serverH1 = container.querySelector('h1');
  resetPreload();
  primePreload(fixturePreload(path));
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
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
        <Router.MemoryRouter initialEntries={[path]}>
          <App />
        </Router.MemoryRouter>
      </StrictMode>,
      { onRecoverableError: (error) => problems.push(`recoverable: ${String(error)}`) },
    );
  });
  await vi.waitFor(() => expect(hasFiber(container!.querySelector('h1'))).toBe(true), { timeout: 10_000 });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return { html, problems, serverH1, el: container! };
}

/** Render biasa di browser tanpa HTML prerender dan tanpa data preload (app.html, seo.php, 404.html di path lain). */
async function renderClient(path: string, fetchImpl: typeof fixtureFetch) {
  resetPreload();
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  await act(async () => {
    root = createRoot(container!);
    root.render(
      <StrictMode>
        <Router.MemoryRouter initialEntries={[path]}>
          <App />
        </Router.MemoryRouter>
      </StrictMode>,
    );
  });
  return container!;
}

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const requestPath = (input: RequestInfo | URL) =>
  (typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url).replace(/^https?:\/\/[^/]+/, '');

/** Artikel yang terbit setelah deploy terakhir: tidak ada di data preload, hanya di API. */
const KLINIK = ARTICLES.find((a) => a.slug === 'website-klinik-kecantikan')!;
const FRESH: Article = {
  ...KLINIK,
  slug: 'artikel-baru-setelah-deploy',
  title: 'Artikel baru yang terbit setelah deploy terakhir',
  datePublished: '2026-10-24',
  dateModified: '2026-10-24',
  reviewed: '2026-10-24',
  related: [],
};

describe('head panduan', () => {
  it('/panduan: index, judul & deskripsi Lampiran A, CollectionPage + ItemList semua artikel + BreadcrumbList', () => {
    const head = getHead('/panduan', DATA);
    expect(head.robots).toBe('index,follow');
    expect(head.title).toBe(GUIDES_TITLE);
    expect(head.title.length).toBeLessThanOrEqual(60);
    expect(GUIDES_DESCRIPTION.length).toBeLessThanOrEqual(155);
    expect(head.canonical).toBe('https://garudanexa.com/panduan');
    const list = nodeOfType('/panduan', 'ItemList') as { itemListElement: { url: string }[] };
    expect(list.itemListElement.map((i) => i.url)).toEqual(ARTICLES.map((a) => `https://garudanexa.com/panduan/${a.slug}`));
    expect(nodeOfType('/panduan', 'CollectionPage')).toMatchObject({ mainEntity: { '@id': 'https://garudanexa.com/panduan#itemlist' } });
    expect(nodeOfType('/panduan', 'BreadcrumbList')).toBeDefined();
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('/panduan/%s: Article (tanggal, penulis, gambar) + BreadcrumbList', (slug, a) => {
    const path = `/panduan/${slug}`;
    const head = getHead(path, DATA);
    expect(head.robots).toBe('index,follow');
    expect(head.canonical).toBe(`https://garudanexa.com${path}`);
    expect(head.title).toBe(articleHeadTitle(a.title));
    expect(head.title.length).toBeLessThanOrEqual(60);
    expect(head.description).toBe(a.description);
    expect(head.ogType).toBe('article');
    expect(head.ogImage).toMatch(/^https:\/\/garudanexa\.com\/og\/panduan(-[a-z0-9-]+)?\.jpg\?v=[0-9a-f]{8}$/);
    const article = nodeOfType(path, 'Article')!;
    expect(article).toEqual({
      '@type': 'Article',
      '@id': `https://garudanexa.com${path}#article`,
      headline: a.title,
      description: a.description,
      url: `https://garudanexa.com${path}`,
      mainEntityOfPage: `https://garudanexa.com${path}`,
      image: [head.ogImage],
      datePublished: a.datePublished,
      dateModified: a.dateModified,
      inLanguage: 'id-ID',
      author: { '@type': 'Organization', name: 'Tim Garuda Nexa', url: 'https://garudanexa.com/tentang' },
      publisher: { '@id': 'https://garudanexa.com/#organization' },
    });
    expect((article.headline as string).length).toBeLessThanOrEqual(110);
    const crumbs = nodeOfType(path, 'BreadcrumbList') as { itemListElement: { name: string; item: string }[] };
    expect(crumbs.itemListElement.map((c) => c.item)).toEqual(['https://garudanexa.com/', 'https://garudanexa.com/panduan', `https://garudanexa.com${path}`]);
    expect(crumbs.itemListElement[2].name).toBe(a.title);
    // Organization + WebSite ikut di setiap halaman yang diindeks
    expect(nodeOfType(path, 'Organization')).toBeDefined();
  });

  it('slug tanpa artikel → kepala 404 (noindex)', () => {
    const head = getHead('/panduan/belum-ada-artikel', DATA);
    expect(head.robots).toBe('noindex,follow');
    expect(head.canonical).toBeNull();
  });

  it('rute index: /panduan dan semua artikel, lastmod = dateModified (terbaru untuk /panduan)', () => {
    const routes = getIndexableRoutes(DATA);
    for (const a of ARTICLES) expect(routes).toContainEqual({ path: `/panduan/${a.slug}`, lastmod: a.dateModified });
    const latest = ARTICLES.map((a) => a.dateModified).sort().at(-1)!;
    const guides = routes.find((r) => r.path === '/panduan');
    expect((guides?.lastmod ?? '') >= latest).toBe(true);
  });
});

// Prerender + hidrasi App penuh: di bawah beban paralel bisa lebih dari 5 detik bawaan vitest (waitFor di hydrate()
// sendiri memberi 10 detik); tanpa batas ini tes terputus di tengah hidrasi dan berantai jadi galat lain
const SLOW = { timeout: 30_000 };

describe('halaman panduan: prerender + hidrasi', SLOW, () => {
  it('/panduan: satu H1, semua artikel sebagai tautan dengan tanggal, tautan lanjutan', async () => {
    const { problems, serverH1, el } = await hydrate('/panduan');
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(serverH1?.textContent).toBe('Panduan website untuk bisnis');
    const main = el.querySelector('main')!;
    for (const a of ARTICLES) {
      const link = main.querySelector(`a[href="/panduan/${a.slug}"]`);
      expect(link, a.slug).not.toBeNull();
      expect(link!.textContent).toContain(a.title);
      expect(link!.querySelector('time')?.getAttribute('dateTime')).toBe(a.dateModified);
    }
    for (const href of ['/template', '/harga', '/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/tentang']) {
      expect(main.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
  });

  it.each(ARTICLES.map((a) => [a.slug, a] as const))('/panduan/%s', async (slug, a) => {
    const path = `/panduan/${slug}`;
    const { html, problems, serverH1, el } = await hydrate(path);
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(serverH1?.textContent).toBe(a.title);

    // Tanggal terlihat = tanggal JSON-LD
    const article = nodeOfType(path, 'Article')!;
    const header = el.querySelector('main header')!;
    const times = [...header.querySelectorAll('time')].map((t) => t.getAttribute('dateTime'));
    expect(times).toContain(article.dateModified);
    if (a.datePublished !== a.dateModified) expect(times).toContain(article.datePublished);
    expect(header.textContent).toContain(`Diperbarui ${formatDateId(a.dateModified)}`);
    expect(header.textContent).toMatch(/Oleh Tim Garuda Nexa/);
    expect(header.textContent).toMatch(/\d+ menit baca/);

    // Daftar isi = H2 isi artikel (anchor ke id yang ada)
    const toc = el.querySelector('nav[aria-label="Daftar isi"]')!;
    const tocTargets = [...toc.querySelectorAll('a')].map((link) => link.getAttribute('href')!);
    expect(tocTargets.length).toBeGreaterThanOrEqual(5);
    for (const target of tocTargets) expect(el.querySelector(target), target).not.toBeNull();

    // Token data terganti (harga & nama dari data template), tidak ada sisa {{…}}
    expect(html).not.toMatch(/\{\{|\}\}/);
    if (a.body.includes('{{harga_template_rentang')) expect(el.textContent).toContain('Rp990.000–Rp1.790.000');
    if (a.body.includes('{{template:aura-studio')) expect(el.textContent).toContain('Aura Studio');

    // Tabel dalam bingkai yang bisa digeser, checklist berikon (bukan kotak centang), FAQ, Sumber
    expect(el.querySelector('[role="region"] > table')).not.toBeNull();
    // Bingkai tabel = containing block (relative): teks sr-only tautan di sel tidak melebarkan halaman di HP
    for (const region of el.querySelectorAll('main [role="region"]')) expect(region.className).toMatch(/(^|\s)relative(\s|$)/);
    expect(el.querySelector('main input[type="checkbox"]')).toBeNull();
    expect(el.querySelector('#pertanyaan-yang-sering-diajukan')).not.toBeNull();
    // Isi sudah menulis "## Sumber" sendiri: kolom sumber tidak menambah bagian kedua
    expect(el.querySelectorAll('#sumber')).toHaveLength(1);

    // Tautan: internal = <a href="/…"> tanpa target; eksternal = tab baru + noopener
    const links = [...el.querySelectorAll('main article a')];
    for (const source of a.sources) {
      const external = links.find((link) => link.getAttribute('href') === source);
      expect(external, source).toBeDefined();
      expect(external!.getAttribute('target')).toBe('_blank');
      expect(external!.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(links.some((link) => link.getAttribute('href') === '/harga' && !link.hasAttribute('target'))).toBe(true);

    // Ajakan, kotak penulis, artikel lain
    expect(el.querySelector('#ajakan-judul')).not.toBeNull();
    expect(el.querySelector('#penulis-judul')?.textContent).toBe('Tim Garuda Nexa');
    expect(el.querySelectorAll('#panduan-terkait ~ * a[href^="/panduan/"], section[aria-labelledby="panduan-terkait"] a[href^="/panduan/"]').length).toBeGreaterThanOrEqual(1);
  });

  it('kunjungan dihitung sekali per sesi browser (guide_view): /panduan dan artikel', async () => {
    window.sessionStorage.clear();
    const viewPosts = () =>
      vi
        .mocked(fetch)
        .mock.calls.map(([, init]) => (init?.method === 'POST' ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null))
        .filter((body) => body?.action === 'guide_view');
    // Halaman berikutnya di sesi yang sama: bongkar seperti afterEach (fetch & console dipasang ulang hydrate)
    const leave = () => {
      act(() => root?.unmount());
      root = null;
      container?.remove();
      container = null;
      resetPreload();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    };
    await hydrate('/panduan');
    // StrictMode menjalankan effect dua kali: tetap satu request
    expect(viewPosts()).toEqual([{ page: '/panduan', action: 'guide_view' }]);
    leave();
    const slug = ARTICLES[0].slug;
    await hydrate(`/panduan/${slug}`);
    expect(viewPosts()).toEqual([{ page: `/panduan/${slug}`, action: 'guide_view' }]);
    leave();
    // Sudah dihitung di sesi ini: tidak dikirim lagi
    await hydrate('/panduan');
    expect(viewPosts()).toEqual([]);
  });

  it('slug tanpa artikel → halaman 404', async () => {
    const html = await serverHtml('/panduan/belum-ada-artikel');
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(text).toContain('Halaman ini tidak ditemukan.');
  });
});

describe('halaman panduan: artikel dan daftar dari API (setelah deploy terakhir)', SLOW, () => {
  it('navigasi di situs ke artikel yang terbit setelah deploy: kerangka memuat (bukan 404), lalu artikelnya', async () => {
    let releaseGuide: () => void = () => undefined;
    const guideHeld = new Promise<void>((resolve) => (releaseGuide = resolve));
    const { problems, el } = await hydrate('/panduan', async (input) => {
      const path = requestPath(input);
      if (path === PRELOAD_URLS.guides) return jsonResponse({ success: true, guides: [FRESH, ...ARTICLES].map(guideSummary) });
      if (path === PRELOAD_URLS.guide(FRESH.slug)) {
        await guideHeld;
        return jsonResponse({ success: true, guide: FRESH });
      }
      return fixtureFetch(input);
    });
    expect(problems).toEqual([]);
    // Daftar disegarkan dari API: kartu artikel baru muncul (data preload belum memuatnya)
    const link = await vi.waitFor(() => {
      const found = el.querySelector<HTMLAnchorElement>(`main a[href="/panduan/${FRESH.slug}"]`);
      expect(found).not.toBeNull();
      return found!;
    });
    await act(async () => link.click());
    await vi.waitFor(() => expect(el.querySelector('[aria-label="Memuat artikel"]')).not.toBeNull(), { timeout: 10_000 });
    expect(el.textContent).not.toContain('tidak ditemukan.');
    await act(async () => releaseGuide());
    await vi.waitFor(() => expect(el.querySelector('h1')?.textContent).toBe(FRESH.title), { timeout: 10_000 });
    expect(el.textContent).not.toContain('tidak ditemukan.');
  });

  it('dibuka langsung tanpa preload, get_guides gagal: tautan ke artikel lain tetap, Sumber dari kolom sumber', async () => {
    // Isi tanpa bagian "## Sumber": daftar sumber diambil dari kolom Sumber admin
    const fresh: Article = { ...FRESH, body: proseBeforeSources(FRESH.body) };
    expect(fresh.body).not.toMatch(/^##\s+Sumber/m);
    expect(fresh.sources.length).toBeGreaterThan(0);
    const el = await renderClient(`/panduan/${fresh.slug}`, (input) => {
      const path = requestPath(input);
      if (path === PRELOAD_URLS.guides) return jsonResponse({ error: 'Server sibuk.' }, 503);
      if (path === PRELOAD_URLS.guide(fresh.slug)) return jsonResponse({ success: true, guide: fresh });
      return fixtureFetch(input);
    });
    await vi.waitFor(() => expect(el.querySelector('h1')?.textContent).toBe(fresh.title), { timeout: 10_000 });
    const article = el.querySelector('main article')!;
    // Daftar artikel tidak diketahui: tautan tidak dialihkan ke /panduan, "Panduan lainnya" tidak tampil
    expect(article.querySelector('a[href="/panduan/template-vs-jasa-website-custom"]')).not.toBeNull();
    expect(el.querySelector('#panduan-terkait')).toBeNull();
    // Bagian Sumber ditambahkan sekali, ikut daftar isi, tautannya eksternal (tab baru)
    expect(el.querySelectorAll('#sumber')).toHaveLength(1);
    const toc = el.querySelector('nav[aria-label="Daftar isi"]')!;
    expect([...toc.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toContain('#sumber');
    const links = [...article.querySelectorAll('a')];
    for (const source of fresh.sources) {
      const external = links.find((a) => a.getAttribute('href') === source);
      expect(external, source).toBeDefined();
      expect(external!.getAttribute('target')).toBe('_blank');
    }
  });

  it('/panduan tanpa preload dan get_guides gagal: pesan gagal + "Coba lagi", bukan "sedang kami tulis"', async () => {
    let up = false;
    const el = await renderClient('/panduan', (input) => {
      if (requestPath(input) !== PRELOAD_URLS.guides) return fixtureFetch(input);
      return up ? jsonResponse({ success: true, guides: ARTICLES.map(guideSummary) }) : jsonResponse({ error: 'Server sibuk.' }, 503);
    });
    await vi.waitFor(() => expect(el.textContent).toContain('Daftar panduan gagal dimuat'), { timeout: 10_000 });
    expect(el.textContent).not.toContain('sedang kami tulis');
    up = true;
    const retry = [...el.querySelectorAll('button')].find((button) => button.textContent === 'Coba lagi')!;
    expect(retry).toBeDefined();
    await act(async () => retry.click());
    await vi.waitFor(() => expect(el.querySelector(`main a[href="/panduan/${ARTICLES[0].slug}"]`)).not.toBeNull(), { timeout: 10_000 });
    expect(el.textContent).not.toContain('Daftar panduan gagal dimuat');
  });
});
