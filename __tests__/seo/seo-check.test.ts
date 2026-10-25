// @vitest-environment node
// Jalankan: npx vitest run __tests__/seo
// scripts/seo/seo-check.mjs (docs/platform/SEO-PLAN.md §5.9 langkah 1). Fungsi pengecekan murni, dan runSeoCheck
// dengan server tiruan (get palsu): tidak pernah menghubungi jaringan.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASE,
  USER_AGENT,
  checkCatalogCoverage,
  checkDuplicateTitles,
  checkIndexablePage,
  checkNegative,
  checkSitemapEntries,
  checkTemplatePrice,
  countWords,
  decodeEntities,
  KEEP_ALIVE_LEAD,
  keepAliveCases,
  ldNodes,
  negativeCases,
  pageFacts,
  parseArgs,
  requestTarget,
  runSeoCheck,
  tagAttributes,
  templatesFromApi,
  templatesTarget,
} from '../../scripts/seo/seo-check.mjs';
import { buildSitemap } from '../../scripts/seo/sitemap.mjs';

const HOST = 'garudanexa.com';
const LOC = 'https://garudanexa.com/template/aura-studio';
const words = (n: number) => Array.from({ length: n }, (_, i) => `kata${i}`).join(' ');

interface PageOpts {
  title?: string;
  description?: string;
  canonical?: string | null;
  robots?: string;
  h1?: number;
  mainWords?: number;
  jsonLd?: string[];
}

function page({
  title = 'Aura Studio: Template Website Klinik Kecantikan',
  description = 'Template website klinik kecantikan siap pakai.',
  canonical = LOC,
  robots = 'index,follow',
  h1 = 1,
  mainWords = 650,
  jsonLd = [JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Product', name: 'Aura Studio', offers: { '@type': 'Offer', price: 1390000, priceCurrency: 'IDR' } }] })],
}: PageOpts = {}) {
  return [
    '<!doctype html><html lang="id"><head>',
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" data-gn="description">`,
    `<meta name="robots" content="${robots}" data-gn="robots">`,
    canonical ? `<link rel="canonical" href="${canonical}" data-gn="canonical">` : '',
    ...jsonLd.map((json) => `<script type="application/ld+json" data-gn="jsonld">${json}</script>`),
    '</head><body><div id="root"><header>Navigasi</header>',
    '<main>',
    ...Array.from({ length: h1 }, () => '<h1>Aura Studio</h1>'),
    `<p>${words(mainWords)}</p><script>var bukanKata = "a b c d e f";</script>`,
    '</main><footer>kaki halaman</footer></div></body></html>',
  ].join('');
}

const html200 = (body: string, headers: Record<string, string> = {}) => ({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...headers }, body });

describe('argumen & alamat', () => {
  it('bawaan production, host dari --base', () => {
    const opts = parseArgs([]);
    expect(opts).toMatchObject({ base: DEFAULT_BASE, host: HOST, api: null, delay: 400 });
    expect(parseArgs(['--base', 'http://127.0.0.1:8909/', '--host', 'GarudaNexa.com', '--delay', '0'])).toMatchObject({
      base: 'http://127.0.0.1:8909',
      host: HOST,
      delay: 0,
    });
    expect(() => parseArgs(['--base'])).toThrow('butuh nilai');
    expect(() => parseArgs(['--base', 'ftp://x'])).toThrow('http');
    expect(() => parseArgs(['--delay', '-1'])).toThrow('--delay');
    expect(() => parseArgs(['--host', 'a/b'])).toThrow('--host');
    expect(() => parseArgs(['--submit'])).toThrow('tidak dikenal');
  });

  it('production: URL langsung (www di host www); lokal: --base dengan header Host', () => {
    const prod = parseArgs([]);
    expect(requestTarget(prod, '/template')).toEqual({ url: 'https://garudanexa.com/template', hostHeader: null });
    expect(requestTarget(prod, '/template', { www: true })).toEqual({ url: 'https://www.garudanexa.com/template', hostHeader: null });
    const local = parseArgs(['--base', 'http://127.0.0.1:8909', '--host', HOST]);
    expect(requestTarget(local, '/template')).toEqual({ url: 'http://127.0.0.1:8909/template', hostHeader: HOST });
    expect(requestTarget(local, '/', { www: true })).toEqual({ url: 'http://127.0.0.1:8909/', hostHeader: `www.${HOST}` });
  });

  it('get_templates lewat --base, atau --api (asal atau URL api.php)', () => {
    expect(templatesTarget(parseArgs([]))).toEqual({ url: 'https://garudanexa.com/api.php?action=get_templates', hostHeader: null });
    expect(templatesTarget(parseArgs(['--base', 'http://127.0.0.1:8909', '--host', HOST]))).toEqual({
      url: 'http://127.0.0.1:8909/api.php?action=get_templates',
      hostHeader: HOST,
    });
    expect(templatesTarget(parseArgs(['--api', 'http://127.0.0.1:8000']))).toEqual({ url: 'http://127.0.0.1:8000/api.php?action=get_templates', hostHeader: null });
    expect(templatesTarget(parseArgs(['--api', 'http://127.0.0.1:8000/api.php']))).toEqual({ url: 'http://127.0.0.1:8000/api.php?action=get_templates', hostHeader: null });
  });

  it('User-Agent jujur, bukan crawler', () => {
    expect(USER_AGENT).toMatch(/^GarudaNexaSeoCheck\/\d/);
    expect(USER_AGENT).not.toMatch(/bot|crawl|spider|googlebot|bingbot|gptbot/i);
  });
});

describe('membaca HTML', () => {
  it('entity, atribut dan jumlah kata', () => {
    expect(decodeEntities('Harga &amp; Paket &#8211; &#x2014; &quot;x&quot; &nbsp;&bogus;')).toBe('Harga & Paket – — "x"  &bogus;');
    expect(tagAttributes(`<meta NAME="robots" content='noindex,follow' data-gn=robots>`)).toEqual({ name: 'robots', content: 'noindex,follow', 'data-gn': 'robots' });
    expect(countWords('Rp1.390.000 per tahun – termasuk hosting & SSL')).toBe(6);
  });

  it('fakta halaman: head, h1, JSON-LD, kata di <main> tanpa script', () => {
    const facts = pageFacts(page({ title: 'Harga &amp; Paket', mainWords: 10, jsonLd: ['{"@type":"Thing"}', '{rusak'] }));
    expect(facts.titles).toEqual(['Harga & Paket']);
    expect(facts.descriptions).toEqual(['Template website klinik kecantikan siap pakai.']);
    expect(facts.robots).toEqual(['index,follow']);
    expect(facts.canonicals).toEqual([LOC]);
    expect(facts.h1).toBe(1);
    expect(facts.jsonLd.map((b: { ok: boolean }) => b.ok)).toEqual([true, false]);
    expect(facts.mainCount).toBe(1);
    expect(facts.mainWords).toBe(12); // "Aura Studio" + 10 kata, script tidak dihitung
  });

  it('node JSON-LD dari @graph dan array', () => {
    const nodes = ldNodes([{ '@graph': [{ '@type': 'Organization' }, { '@type': 'Product' }] }, [{ '@type': 'WebSite' }], { tanpaTipe: 1 }]);
    expect(nodes.map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'Product', 'WebSite']);
  });
});

describe('halaman di sitemap', () => {
  const check = (body: string, opts: { isTemplate?: boolean; headers?: Record<string, string>; status?: number } = {}) => {
    const res = { ...html200(body, opts.headers), status: opts.status ?? 200 };
    return checkIndexablePage({ loc: LOC, res, facts: pageFacts(body), isTemplate: opts.isTemplate ?? true });
  };

  it('halaman yang benar lulus', () => {
    expect(check(page())).toEqual([]);
  });

  it('status, title, description, canonical, robots, h1, JSON-LD, kata', () => {
    expect(check(page(), { status: 404 })).toEqual(['HTTP 404 (harus 200)']);
    expect(check(page({ title: 'x'.repeat(61) }))).toEqual([expect.stringContaining('title 61 karakter')]);
    expect(check(page({ description: 'd'.repeat(161) }))).toEqual(['description 161 karakter (maks 160)']);
    expect(check(page({ canonical: 'https://garudanexa.com/template' }))).toEqual([`canonical https://garudanexa.com/template ≠ ${LOC}`]);
    expect(check(page({ canonical: null }))).toEqual(['0 canonical (harus tepat 1)']);
    expect(check(page({ robots: 'noindex,follow' }))).toEqual(['meta robots "noindex,follow" (harus index)']);
    expect(check(page(), { headers: { 'x-robots-tag': 'noindex' } })).toEqual(['header X-Robots-Tag "noindex"']);
    expect(check(page({ h1: 2 }))).toEqual(['2 <h1> (harus tepat 1)']);
    expect(check(page({ h1: 0 }))).toEqual(['0 <h1> (harus tepat 1)']);
    expect(check(page({ jsonLd: [] }))).toEqual(['tidak ada JSON-LD']);
    expect(check(page({ jsonLd: ['{"a":'] }))[0]).toMatch(/^JSON-LD #1 tidak bisa di-parse/);
    expect(check(page({ mainWords: 100 }))).toEqual(['102 kata di <main> (minimal 600 untuk halaman template)']);
    expect(check(page({ mainWords: 100 }), { isTemplate: false })).toEqual([]);
    expect(check(page(), { headers: { 'content-type': 'application/json' } })).toEqual(['Content-Type "application/json" (harus text/html)']);
  });

  it('title ganda antar-URL', () => {
    expect(
      checkDuplicateTitles([
        { loc: 'https://garudanexa.com/a', title: 'Sama' },
        { loc: 'https://garudanexa.com/b', title: 'Sama' },
        { loc: 'https://garudanexa.com/c', title: 'Beda' },
      ]),
    ).toEqual(['title "Sama" dipakai 2 URL: https://garudanexa.com/a, https://garudanexa.com/b']);
  });

  it('sitemap: https host situs, tanpa query, tanpa ganda', () => {
    const ok = [{ loc: 'https://garudanexa.com/' }, { loc: LOC }];
    expect(checkSitemapEntries({ host: HOST, entries: ok })).toEqual([]);
    expect(
      checkSitemapEntries({
        host: HOST,
        entries: [{ loc: 'http://garudanexa.com/' }, { loc: 'https://www.garudanexa.com/x' }, { loc: `${LOC}?a=1` }, { loc: LOC }, { loc: LOC }],
      }),
    ).toEqual([
      '<loc> bukan https://garudanexa.com: http://garudanexa.com/',
      '<loc> bukan https://garudanexa.com: https://www.garudanexa.com/x',
      `<loc> dengan query/fragment: ${LOC}?a=1`,
      `<loc> ganda: ${LOC}`,
    ]);
    expect(checkSitemapEntries({ host: HOST, entries: [] })).toEqual(['sitemap kosong']);
  });
});

describe('harga JSON-LD = get_templates', () => {
  const templates = templatesFromApi({ templates: [{ slug: 'aura-studio', name: 'Aura Studio', price: 1390000 }, { slug: 'finova', name: 'Finova', price: '1990000' }] });
  const nodes = (price: unknown, currency = 'IDR') => ldNodes([{ '@graph': [{ '@type': 'Product', offers: { '@type': 'Offer', price, priceCurrency: currency } }] }]);

  it('sama → lulus; beda, mata uang lain, tanpa Product → gagal', () => {
    expect(checkTemplatePrice({ slug: 'aura-studio', nodes: nodes(1390000), template: templates[0] })).toEqual([]);
    expect(checkTemplatePrice({ slug: 'finova', nodes: nodes('1990000'), template: templates[1] })).toEqual([]);
    expect(checkTemplatePrice({ slug: 'aura-studio', nodes: nodes(990000), template: templates[0] })).toEqual(['harga JSON-LD 990000 ≠ get_templates 1390000: deploy ulang']);
    expect(checkTemplatePrice({ slug: 'aura-studio', nodes: nodes(1390000, 'USD'), template: templates[0] })).toEqual(['priceCurrency "USD" (harus IDR)']);
    expect(checkTemplatePrice({ slug: 'aura-studio', nodes: ldNodes([{ '@type': 'WebPage' }]), template: templates[0] })).toEqual(['tidak ada JSON-LD Product']);
    expect(checkTemplatePrice({ slug: 'lama', nodes: nodes(1), template: undefined })[0]).toMatch(/tidak ada di get_templates/);
  });

  it('template terbit yang belum ada di sitemap', () => {
    expect(checkCatalogCoverage({ host: HOST, locs: [LOC], templates })).toEqual(['template "finova" terbit tetapi tidak ada di sitemap: deploy ulang']);
    expect(() => templatesFromApi({ error: 'x' })).toThrow('templates');
  });
});

describe('tes negatif', () => {
  const cases = negativeCases(HOST, 'aura-studio');
  const byPath = (path: string, www = false) => cases.find((c: { path: string; www?: boolean }) => c.path === path && Boolean(c.www) === www)!;

  it('mencakup tabel §5.2, file internal dan teks', () => {
    const paths = cases.map((c: { path: string; www?: boolean }) => `${c.www ? 'www:' : ''}${c.path}`);
    for (const path of [
      '/halaman-tidak-ada-seo-check',
      '/template/tidak-ada-seo-check',
      '/_pre/index.html',
      '/%5Fpre/index.html',
      '/app.html',
      '/404.html',
      '/404%2Ehtml',
      '/seo.php?slug=aura-studio',
      '/seo%2Ephp?slug=aura-studio',
      '/akun',
      '/demo/aura-studio',
      'www:/',
      '/index.html',
      '/template/aura-studio/',
      '/llms.txt',
    ]) {
      expect(paths).toContain(path);
    }
    expect(negativeCases(HOST, null).some((c: { path: string }) => c.path.includes('null'))).toBe(false);
  });

  it('urutan keep-alive: setiap file internal dan 404 biasa langsung sesudah 404 biasa', () => {
    const sequence = keepAliveCases(1);
    expect(sequence).toHaveLength(12);
    sequence.forEach((c: { path: string }, i: number) => {
      if (i % 2 === 0) expect(c).toEqual({ path: KEEP_ALIVE_LEAD, expect: { status: 404 } });
    });
    const tested = sequence.filter((_: unknown, i: number) => i % 2 === 1).map((c: { path: string; expect: { status: number } }) => `${c.path} ${c.expect.status}`);
    expect(tested).toEqual(['/404.html 410', '/404%2Ehtml 410', '/app.html 404', '/_pre/index.html 404', '/seo.php 404', `${KEEP_ALIVE_LEAD} 404`]);
    // Bawaan dua putaran (koneksi ke origin di balik Cloudflare tidak selalu sama)
    expect(keepAliveCases()).toEqual([...sequence, ...sequence]);
  });

  it('404.html yang dibuka langsung harus 410, bukan 404 atau 500', () => {
    expect(checkNegative(byPath('/404.html'), { status: 410, headers: {}, body: '' })).toEqual([]);
    expect(checkNegative(byPath('/404.html'), { status: 500, headers: {}, body: '' })).toEqual(['HTTP 500 (harus 410)']);
  });

  it('301 harus satu lompatan ke https host utama', () => {
    const c = byPath('/template/aura-studio/');
    expect(checkNegative(c, { status: 301, headers: { location: 'https://garudanexa.com/template/aura-studio' }, body: '' })).toEqual([]);
    expect(checkNegative(c, { status: 301, headers: { location: 'http://garudanexa.com/template/aura-studio' }, body: '' })).toEqual([
      'Location "http://garudanexa.com/template/aura-studio" (harus https://garudanexa.com/template/aura-studio, satu lompatan)',
    ]);
    expect(checkNegative(byPath('/', true), { status: 200, headers: {}, body: '' })[0]).toBe('HTTP 200 (harus 301)');
  });

  it('rute aplikasi: 200 + noindex di HTML, tanpa canonical', () => {
    const c = byPath('/akun');
    expect(checkNegative(c, html200(page({ robots: 'noindex,follow', canonical: null })))).toEqual([]);
    expect(checkNegative(c, html200(page({ robots: 'index,follow', canonical: null })))).toEqual(['HTML tanpa meta robots noindex (index,follow)']);
    expect(checkNegative(c, html200(page({ robots: 'noindex,follow' })))).toEqual([`halaman noindex punya canonical ${LOC}`]);
  });

  it('llms.txt dan robots.txt sebagai text/plain', () => {
    expect(checkNegative(byPath('/llms.txt'), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: '# Garuda Nexa' })).toEqual([]);
    expect(checkNegative(byPath('/llms.txt'), { status: 200, headers: { 'content-type': 'text/html' }, body: '' })).toEqual(['Content-Type "text/html" (harus text/plain)']);
    expect(checkNegative(byPath('/robots.txt'), { status: 200, headers: { 'content-type': 'text/plain' }, body: 'User-agent: *' })).toEqual([
      'isi tanpa "Sitemap: https://garudanexa.com/sitemap.xml"',
    ]);
  });
});

describe('runSeoCheck (server tiruan)', () => {
  const sitemap = buildSitemap(
    [
      { path: '/', lastmod: '2026-10-23' },
      { path: '/template/aura-studio', lastmod: '2026-10-23' },
    ],
    'https://garudanexa.com',
  );
  const home = page({ title: 'Template Website Siap Pakai | Garuda Nexa', canonical: 'https://garudanexa.com/', mainWords: 10, jsonLd: ['{"@type":"WebSite"}'] });
  const plain = (body: string) => ({ status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }, body });

  /** Situs yang benar; `override` mengganti jawaban per kunci "host path". */
  function fakeSite(override: Record<string, { status: number; headers?: Record<string, string>; body?: string }> = {}) {
    const calls: string[] = [];
    const routes: Record<string, { status: number; headers?: Record<string, string>; body?: string }> = {
      [`${HOST} /sitemap.xml`]: { status: 200, headers: { 'content-type': 'application/xml' }, body: sitemap },
      [`${HOST} /api.php?action=get_templates`]: { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ templates: [{ slug: 'aura-studio', name: 'Aura Studio', price: 1390000 }] }) },
      [`${HOST} /`]: html200(home),
      [`${HOST} /template/aura-studio`]: html200(page()),
      [`${HOST} /akun`]: html200(page({ robots: 'noindex,follow', canonical: null })),
      [`${HOST} /masuk`]: html200(page({ robots: 'noindex,follow', canonical: null })),
      [`${HOST} /daftar`]: html200(page({ robots: 'noindex,follow', canonical: null })),
      [`${HOST} /demo/aura-studio`]: html200(page({ robots: 'noindex,follow', canonical: null })),
      [`${HOST} /pesan/aura-studio`]: html200(page({ robots: 'noindex,follow', canonical: null })),
      [`www.${HOST} /`]: { status: 301, headers: { location: 'https://garudanexa.com/' } },
      [`www.${HOST} /template`]: { status: 301, headers: { location: 'https://garudanexa.com/template' } },
      [`${HOST} /index.html`]: { status: 301, headers: { location: 'https://garudanexa.com/' } },
      [`${HOST} /template/`]: { status: 301, headers: { location: 'https://garudanexa.com/template' } },
      [`${HOST} /template/aura-studio/`]: { status: 301, headers: { location: 'https://garudanexa.com/template/aura-studio' } },
      [`${HOST} /llms.txt`]: plain('# Garuda Nexa'),
      [`${HOST} /llms-full.txt`]: plain('# Garuda Nexa'),
      [`${HOST} /robots.txt`]: plain('User-agent: *\nAllow: /\n\nSitemap: https://garudanexa.com/sitemap.xml\n'),
      [`${HOST} /404.html`]: { status: 410, headers: { 'content-type': 'text/html' } },
      [`${HOST} /404%2Ehtml`]: { status: 410, headers: { 'content-type': 'text/html' } },
      ...override,
    };
    const get = async ({ url, hostHeader }: { url: string; hostHeader: string | null }) => {
      const u = new URL(url);
      const key = `${hostHeader ?? u.hostname} ${u.pathname}${u.search}`;
      calls.push(key);
      const res = routes[key] ?? { status: 404, headers: { 'content-type': 'text/html' }, body: '<h1>404</h1>' };
      return { headers: {}, body: '', ...res };
    };
    return { get, calls };
  }

  const run = (site: ReturnType<typeof fakeSite>, args: string[] = ['--base', 'http://127.0.0.1:8909', '--host', HOST, '--delay', '5']) => {
    const lines: string[] = [];
    const sleeps: number[] = [];
    return runSeoCheck(parseArgs(args), { get: site.get, log: (line: string) => lines.push(line), sleep: async (ms: number) => void sleeps.push(ms) }).then((result: object) => ({
      ...result,
      lines,
      sleeps,
    }));
  };

  it('situs yang benar lulus; request berurutan dengan jeda', async () => {
    const site = fakeSite();
    const result = await run(site);
    expect(result.problems).toEqual([]);
    expect(result.pages).toBe(2);
    expect(site.calls[0]).toBe(`${HOST} /sitemap.xml`);
    expect(result.sleeps).toHaveLength(site.calls.length - 1);
    expect(result.sleeps.every((ms: number) => ms === 5)).toBe(true);
  });

  it('harga basi, 404 yang jadi 200, dan www tanpa redirect tercatat', async () => {
    const site = fakeSite({
      [`${HOST} /template/aura-studio`]: html200(page({ jsonLd: [JSON.stringify({ '@type': 'Product', offers: { price: 990000, priceCurrency: 'IDR' } })] })),
      [`${HOST} /halaman-tidak-ada-seo-check`]: html200(page({ robots: 'noindex,follow', canonical: null })),
      [`www.${HOST} /`]: html200(home),
    });
    const result = await run(site);
    const where = result.problems.map((p: { where: string }) => p.where);
    expect(where).toContain('/template/aura-studio (652 kata)');
    expect(where).toContain('/halaman-tidak-ada-seo-check → 404');
    expect(where).toContain(`www.${HOST}/ → 301`);
    expect(result.problems.find((p: { message: string }) => p.message.includes('990000'))).toBeTruthy();
  });

  it('berhenti begitu server membatasi (429/503)', async () => {
    const site = fakeSite({ [`${HOST} /template/aura-studio`]: { status: 429 } });
    const result = await run(site);
    expect(result.rateLimited).toBe(true);
    expect(site.calls.at(-1)).toBe(`${HOST} /template/aura-studio`);
    expect(result.problems).toHaveLength(1);
  });

  it('request yang gagal (jaringan) dicatat, pengecekan lanjut', async () => {
    const site = fakeSite();
    const flaky = async (target: { url: string; hostHeader: string | null }) => {
      if (target.url.endsWith('/llms.txt')) throw new Error('ECONNRESET');
      return site.get(target);
    };
    const result = await run({ ...site, get: flaky });
    expect(result.problems).toEqual([{ where: '/llms.txt → 200', message: 'request gagal: ECONNRESET' }]);
  });

  it('urutan keep-alive lewat satu koneksi; sisa ErrorDocument LiteSpeed (/404.html 200, soft 404) tertangkap', async () => {
    const site = fakeSite();
    const opened: { calls: string[]; closed: boolean }[] = [];
    /** Seperti LiteSpeed lama: sesudah 404 di koneksi yang sama, /404.html 200 dan 404 berikutnya 200 berisi halaman 404. */
    const connect = (buggy: boolean) => () => {
      const conn = { calls: [] as string[], closed: false };
      opened.push(conn);
      let after404 = false;
      return {
        get: async (target: { url: string; hostHeader: string | null }) => {
          const res = await site.get(target);
          conn.calls.push(new URL(target.url).pathname);
          const status = buggy && after404 ? 200 : res.status;
          after404 = status === 404;
          return { ...res, status, reused: conn.calls.length > 1 };
        },
        close: () => {
          conn.closed = true;
        },
      };
    };
    const args = ['--base', 'http://127.0.0.1:8909', '--host', HOST, '--delay', '0'];
    const ok = await runSeoCheck(parseArgs(args), { get: site.get, connect: connect(false), log: () => {} });
    expect(ok.problems).toEqual([]);
    expect(ok.keepAlive).toBe(24);
    expect(opened).toHaveLength(1);
    expect(opened[0].calls).toEqual(keepAliveCases().map((c: { path: string }) => c.path));
    expect(opened[0].closed).toBe(true);

    const bad = await runSeoCheck(parseArgs(args), { get: site.get, connect: connect(true), log: () => {} });
    const wrong = ['/404.html → 410', '/404%2Ehtml → 410', '/app.html → 404', '/_pre/index.html → 404', '/seo.php → 404', `${KEEP_ALIVE_LEAD} → 404`];
    expect(bad.problems.map((p: { where: string }) => p.where)).toEqual([
      ...wrong.map((label, i) => `keep-alive #${2 * i + 2} ${label}`),
      ...wrong.map((label, i) => `keep-alive #${2 * i + 14} ${label}`),
    ]);
    expect(bad.problems[0].message).toBe('HTTP 200 (harus 410)');
    expect(opened[1].closed).toBe(true);
  });

  it('keep-alive yang tidak dipakai ulang server dicatat di label', async () => {
    const site = fakeSite();
    const lines: string[] = [];
    const connect = () => ({ get: async (target: { url: string; hostHeader: string | null }) => ({ ...(await site.get(target)), reused: false }), close: () => {} });
    const result = await runSeoCheck(parseArgs(['--base', 'http://127.0.0.1:8909', '--host', HOST, '--delay', '0']), { get: site.get, connect, log: (line: string) => lines.push(line) });
    expect(result.problems).toEqual([]);
    expect(lines).toContain('OK    keep-alive #1 /halaman-tidak-ada-seo-check → 404');
    expect(lines).toContain('OK    keep-alive #2 /404.html → 410 (koneksi baru, urutan tidak teruji)');
  });
});
