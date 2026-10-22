// @vitest-environment jsdom
// Jalankan: npx vitest run src/seo
// head.ts (docs/platform/SEO-PLAN.md §5.3 langkah 3): renderHeadTags (prerender) dan applyHead (klien) menulis tag yang
// sama; applyHead di atas head hasil prerender tidak mengubah apa pun (hidrasi tanpa kedipan), memperbarui tag di
// tempat saat navigasi, menghapus tag data-gn yang tidak dipakai, dan mengambil alih tag lama tanpa menggandakannya.
import { afterEach, describe, expect, it } from 'vitest';
import { applyHead, headTags, renderHeadTags } from '../head';
import { getHead } from '../routes';
import { DATA } from './fixtures';

const reset = () => {
  document.head.innerHTML = '<meta charset="utf-8"><title>Memuat situs…</title><meta name="theme-color" content="#ffffff">';
};

afterEach(reset);

/** Jumlah mutasi DOM di <head> selama fn berjalan. */
async function mutations(fn: () => void): Promise<number> {
  let count = 0;
  const observer = new MutationObserver((records) => {
    count += records.length;
  });
  observer.observe(document.head, { subtree: true, childList: true, attributes: true, characterData: true });
  fn();
  await Promise.resolve();
  observer.disconnect();
  return count + observer.takeRecords().length;
}

const meta = (selector: string) => document.head.querySelector(selector)?.getAttribute('content');
const ldTypes = () =>
  (JSON.parse(document.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '{"@graph":[]}')['@graph'] as { '@type': string }[]).map(
    (n) => n['@type'],
  );

describe('applyHead', () => {
  it('menulis title, description, robots, canonical, OG, twitter, ikon, manifest dan JSON-LD', () => {
    reset();
    applyHead(getHead('/template/aura-studio', DATA));
    expect(document.title).toBe('Aura Studio: Template Kecantikan & Klinik – Rp1,39 jt');
    expect(meta('meta[name="description"]')).toContain('Rp1.390.000');
    expect(meta('meta[name="robots"]')).toBe('index,follow');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://garudanexa.com/template/aura-studio');
    expect(meta('meta[property="og:url"]')).toBe('https://garudanexa.com/template/aura-studio');
    expect(meta('meta[property="og:type"]')).toBe('product');
    expect(meta('meta[property="og:image"]')).toBe('https://garudanexa.com/og/template-aura-studio.jpg');
    expect(meta('meta[property="og:image:width"]')).toBe('1200');
    expect(meta('meta[property="og:locale"]')).toBe('id_ID');
    expect(meta('meta[property="product:price:amount"]')).toBe('1390000');
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/site.webmanifest');
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')).not.toBeNull();
    expect(document.head.querySelector('link[rel="preload"][as="image"]')?.getAttribute('fetchpriority')).toBe('high');
    expect(ldTypes()).toEqual(['Organization', 'WebSite', 'Product', 'BreadcrumbList']);
    expect(meta('meta[name="theme-color"]')).toBe('#ffffff'); // tag di luar data-gn tidak disentuh
  });

  it('di atas head hasil prerender (renderHeadTags) tidak ada mutasi sama sekali', async () => {
    const head = getHead('/template/aura-studio', DATA);
    document.head.innerHTML = `<meta charset="utf-8">${renderHeadTags(head)}`;
    expect(await mutations(() => applyHead(head))).toBe(0);
  });

  it('navigasi: tag diperbarui di tempat, canonical/preload/Product hilang di halaman noindex', async () => {
    reset();
    applyHead(getHead('/template/aura-studio', DATA));
    const description = document.head.querySelector('meta[name="description"]');
    applyHead(getHead('/pesan-custom', DATA));
    expect(document.head.querySelector('meta[name="description"]')).toBe(description);
    expect(document.title).toBe('Pesan Website / Aplikasi Mobile Custom | Garuda Nexa');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://garudanexa.com/pesan-custom');
    expect(document.head.querySelector('link[rel="preload"]')).toBeNull();
    expect(document.head.querySelector('meta[property="product:price:amount"]')).toBeNull();
    expect(ldTypes()).toEqual(['Organization', 'WebSite', 'WebPage']);

    applyHead(getHead('/akun', DATA));
    expect(meta('meta[name="robots"]')).toBe('noindex,follow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
    // menerapkan kepala yang sama lagi tidak mengubah DOM
    expect(await mutations(() => applyHead(getHead('/akun', DATA)))).toBe(0);
  });

  it('tiap tag hanya satu kali; tag lama tanpa data-gn diambil alih, bukan digandakan', () => {
    document.head.innerHTML = '<title>x</title><meta name="robots" content="noindex"><meta name="description" content="lama">';
    applyHead(getHead('/', DATA));
    for (const tag of headTags(getHead('/', DATA))) {
      expect(document.head.querySelectorAll(`[data-gn="${tag.key}"]`).length, tag.key).toBe(1);
    }
    expect(document.head.querySelectorAll('meta[name="robots"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(meta('meta[name="robots"]')).toBe('index,follow');
  });
});

describe('renderHeadTags', () => {
  it('satu title, satu description, satu canonical, JSON-LD bisa di-parse dan aman di <script>', () => {
    const html = renderHeadTags(getHead('/template/finova', DATA));
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html.match(/<link rel="canonical"/g)).toHaveLength(1);
    const json = /<script type="application\/ld\+json" data-gn="jsonld">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
    expect(() => JSON.parse(json)).not.toThrow();
    expect(json).not.toMatch(/[<>]/);
  });

  it('halaman noindex: tanpa canonical, og:url dan JSON-LD', () => {
    const html = renderHeadTags(getHead('/demo/finova', DATA));
    expect(html).toContain('<meta name="robots" content="noindex,follow" data-gn="robots">');
    expect(html).not.toContain('canonical');
    expect(html).not.toContain('og:url');
    expect(html).not.toContain('ld+json');
  });
});
