// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/public/info/__tests__/wp6Pages.test.tsx
// Halaman WP6 (docs/platform/SEO-PLAN.md §5.6) dirender seperti prerender (StaticRouter + data preload), lalu dihidrasi:
// tanpa hydration mismatch, tepat satu H1, isi cukup panjang, harga hanya dari data, jasa custom tanpa angka, fakta null
// tidak dirender, dan FAQPage di head sama persis dengan FAQ yang terlihat.
import { StrictMode } from 'react';
import { act } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { prerender } from 'react-dom/static';
import * as Router from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../App';
import { faqItems, MOBILE_SERVICE_FAQ_IDS, WEB_SERVICE_FAQ_IDS } from '../../../../content/faq';
import { FIXTURE_BUILT_AT, FIXTURE_TEMPLATES, fixtureFetch, fixturePreload } from '../../../../lib/__tests__/preloadFixture';
import { primePreload, resetPreload, seoDataFromApi } from '../../../../lib/preload';
import { getHead, getIndexableRoutes } from '../../../../seo/routes';

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
const PRICE = /Rp\s?\d|\d\.\d{3}\.\d{3}/;

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

async function hydrate(path: string) {
  const html = await serverHtml(path);
  expect(html).not.toMatch(/<!--\$[!?]-->/);
  container = document.createElement('div');
  container.id = 'root';
  container.innerHTML = html;
  document.body.appendChild(container);
  const serverH1 = container.querySelector('h1');
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

/** Teks terlihat (tag → spasi), seperti `sed 's/<[^>]*>/ /g'` di kriteria penerimaan. */
const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const mainHtml = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const wordCount = (html: string) => visibleText(mainHtml(html)).split(' ').length;
const DATA = seoDataFromApi(fixturePreload('/').api, FIXTURE_BUILT_AT);
const faqJsonLd = (path: string) => {
  const node = getHead(path, DATA).jsonLd.find((n) => (n as { '@type'?: string })['@type'] === 'FAQPage') as
    | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    | undefined;
  return node?.mainEntity.map((q) => ({ question: q.name, answer: q.acceptedAnswer.text })) ?? null;
};

describe('halaman WP6: prerender + hidrasi', () => {
  it.each([
    ['/jasa-pembuatan-website', 'Jasa pembuatan website custom untuk bisnis & instansi', WEB_SERVICE_FAQ_IDS],
    ['/jasa-pembuatan-aplikasi-mobile', 'Jasa pembuatan aplikasi Android & iOS custom', MOBILE_SERVICE_FAQ_IDS],
  ] as const)('%s: ≥800 kata, tanpa harga, FAQ 5–7 = JSON-LD, Service', async (path, h1, ids) => {
    const { html, problems, serverH1, el } = await hydrate(path);
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')).toBe(serverH1);
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(serverH1).toHaveProperty('textContent', h1);
    expect(wordCount(html)).toBeGreaterThanOrEqual(800);
    expect(visibleText(mainHtml(html))).not.toMatch(PRICE);
    const faqs = faqItems(ids);
    expect(faqs.length).toBeGreaterThanOrEqual(5);
    expect(faqs.length).toBeLessThanOrEqual(7);
    for (const faq of faqs) expect(visibleText(html)).toContain(faq.answer);
    expect(faqJsonLd(path)).toEqual(faqs);
    const head = getHead(path, DATA);
    expect(head.robots).toBe('index,follow');
    expect(head.jsonLd.map((n) => (n as { '@type': string })['@type'])).toEqual(['Organization', 'WebSite', 'WebPage', 'Service', 'BreadcrumbList', 'FAQPage']);
    expect(JSON.stringify(head.jsonLd)).not.toMatch(/"price"|"offers"/);
    // Tautan ke formulir custom dan WhatsApp
    expect(el.querySelector('a[href^="/pesan-custom?layanan="]')).not.toBeNull();
    expect(el.querySelector('main a[href^="https://wa.me/6285188009152"]')).not.toBeNull();
  });

  it.each([
    [
      '/jasa-pembuatan-website',
      [
        ['/panduan/template-vs-jasa-website-custom', 'template vs jasa website custom'],
        ['/panduan/biaya-website-company-profile', 'biaya membuat website company profile'],
      ],
    ],
    ['/jasa-pembuatan-aplikasi-mobile', [['/panduan/biaya-aplikasi-android-ios', 'biaya pembuatan aplikasi Android & iOS']]],
    [
      '/harga',
      [
        ['/panduan/biaya-website-company-profile', 'biaya pembuatan website company profile'],
        ['/panduan/biaya-aplikasi-android-ios', 'biaya pembuatan aplikasi Android & iOS'],
      ],
    ],
  ])('%s menautkan artikel panduan terkait dengan anchor kontekstual (§5.8, Lampiran A.3)', async (path, expected) => {
    const { problems, el } = await hydrate(path);
    expect(problems).toEqual([]);
    expect([...el.querySelectorAll('main a[href^="/panduan/"]')].map((a) => [a.getAttribute('href'), a.textContent])).toEqual(expected);
  });

  it('/harga: tabel semua template dari data + "Harga berlaku per", dua tabel perbandingan, FAQ = JSON-LD', async () => {
    const { html, problems, el } = await hydrate('/harga');
    expect(problems).toEqual([]);
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    const text = visibleText(mainHtml(html));
    expect(text).toContain('Harga berlaku per 23 Oktober 2026');
    for (const t of FIXTURE_TEMPLATES) {
      expect(el.querySelector(`main a[href="/template/${t.slug}"]`), t.slug).not.toBeNull();
      expect(text).toContain(`Rp${t.price.toLocaleString('id-ID')}`);
    }
    expect(text).toContain('Rp990.000–Rp1.790.000');
    expect(el.querySelectorAll('main table')).toHaveLength(3);
    expect(text).toContain('Website builder (rakit sendiri)');
    expect(text).toContain('Midtrans');
    expect(text).toContain('paling lambat 7 hari kerja');
    expect(el.querySelector('main a[href="/kebijakan-pengembalian-dana"]')).not.toBeNull();
    const faqs = faqJsonLd('/harga')!;
    expect(faqs.length).toBeGreaterThanOrEqual(5);
    for (const faq of faqs) expect(visibleText(html)).toContain(faq.answer);
    expect(getHead('/harga', DATA).title).toBe('Harga Template Website & Jasa Website 2026 | Garuda Nexa');
    expect(getHead('/harga', DATA).description).toContain('mulai Rp990 rb');
  });

  it('/tentang: fakta yang diketahui saja (tanpa alamat, NIB, tim, produk sendiri)', async () => {
    const { html, problems, el } = await hydrate('/tentang');
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')?.textContent).toBe('Tentang Garuda Nexa');
    const text = visibleText(mainHtml(html));
    expect(text).toContain('PT Garuda Nexa Bahtera');
    expect(text).toContain('0851-8800-9152');
    expect(text).toContain('Rp990.000–Rp1.790.000');
    expect(text).not.toMatch(/Alamat|NIB|Tanda daftar PSE|Jam layanan|Produk kami|\bTim\b|testimoni dari|rating/);
    for (const path of ['/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/template', '/syarat-ketentuan', '/kontak']) {
      expect(el.querySelector(`main a[href="${path}"]`), path).not.toBeNull();
    }
    expect(getHead('/tentang', DATA).jsonLd.map((n) => (n as { '@type': string })['@type'])).toContain('AboutPage');
  });

  it('/kontak: NAP sama dengan Footer, tanpa alamat/jam layanan selama null', async () => {
    const { html, problems, el } = await hydrate('/kontak');
    expect(problems).toEqual([]);
    expect(el.querySelector('h1')?.textContent).toBe('Hubungi Garuda Nexa');
    const main = el.querySelector('main')!;
    const footer = el.querySelector('footer')!;
    expect([...main.querySelectorAll('a[href="tel:+6285188009152"]')].some((a) => a.textContent === '0851-8800-9152')).toBe(true);
    expect(footer.textContent).toContain('0851-8800-9152');
    expect(main.querySelector('a[href="mailto:info@garudanexa.com"]')).not.toBeNull();
    expect(visibleText(mainHtml(html))).not.toMatch(/Alamat|Jam layanan|Waktu respons/);
    expect(main.querySelector('address')).toBeNull();
    expect(getHead('/kontak', DATA).title).toBe('Kontak Garuda Nexa: WhatsApp & Email');
  });

  it('semua halaman WP6 masuk sitemap dengan judul ≤60 dan deskripsi ≤155 karakter yang unik', () => {
    const paths = ['/jasa-pembuatan-website', '/jasa-pembuatan-aplikasi-mobile', '/harga', '/tentang', '/kontak'];
    const indexable = getIndexableRoutes(DATA).map((e) => e.path);
    const titles = new Set<string>();
    for (const path of paths) {
      expect(indexable, path).toContain(path);
      const head = getHead(path, DATA);
      expect(head.title.length, head.title).toBeLessThanOrEqual(60);
      expect(head.description.length, head.description).toBeLessThanOrEqual(155);
      expect(head.canonical).toBe(`https://garudanexa.com${path}`);
      expect(titles.has(head.title)).toBe(false);
      titles.add(head.title);
    }
  });
});

describe('beranda', () => {
  it('satu H1 statis berisi "template website", strip, kategori, perbandingan, FAQ, tanpa deskripsi section, tanpa hydration error', async () => {
    const { html, problems, el } = await hydrate('/');
    expect(problems).toEqual([]);
    const h1s = el.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toMatch(/template website/i);
    expect(h1s[0].id).toBe('hero-title');
    // Judul mode custom = <p>, tetap ada sebagai teks di HTML server
    expect(visibleText(html)).toContain('Jasa pembuatan website & aplikasi mobile custom.');
    const text = visibleText(html);
    // Deskripsi di kepala section & chip bernomor dihapus (permintaan pemilik 2026-10-23); nama legal tetap di footer
    expect(text).toContain('PT Garuda Nexa Bahtera');
    expect(text).not.toContain('menyediakan template website untuk');
    expect(text).not.toMatch(/0\d\s*Kategori/);
    expect(text).toContain('Apa saja yang sudah termasuk');
    expect(text).toContain('Sudah termasuk');
    for (const slug of ['company-profile', 'kecantikan-klinik', 'olahraga-komunitas', 'fintech-startup']) {
      expect(el.querySelector(`a[href="/template/kategori/${slug}"]`), slug).not.toBeNull();
    }
    const h2s = [...el.querySelectorAll('h2')].map((h) => h.textContent ?? '');
    expect(h2s.filter((t) => /template website|jasa pembuatan website|website atau aplikasi/i.test(t)).length).toBeGreaterThanOrEqual(3);
    expect(el.querySelector('#perbandingan table')).not.toBeNull();
    // Artikel panduan sudah terbit (WP8) → section panduan terbaru dengan tautan artikel
    expect(el.querySelector('#panduan a[href^="/panduan/"]')).not.toBeNull();
    // Mode custom: H1 tetap elemen yang sama, judul custom tetap <p>
    const customTab = [...el.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) => /custom/i.test(b.textContent ?? ''))!;
    await act(async () => customTab.click());
    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent).toMatch(/template website/i);
    expect(problems).toEqual([]);
  });
});
