// @vitest-environment node
// Prerender saat deploy (docs/platform/SEO-PLAN.md §5.2, WP2): scripts/prerender.mjs, src/entry-server.tsx dan blok
// routing host utama di deploy/cpanel/htaccess. Aturan .htaccess juga sudah dicoba di Apache sungguhan (laporan WP2);
// di sini strukturnya dikunci dan pola regex-nya diuji.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  GUIDES_BOOTSTRAP_ENV,
  HTACCESS_MAX_LINE,
  HTACCESS_ROUTES_PER_RULE,
  PRELOAD_OMIT_SETTINGS,
  USER_AGENT,
  checkPage,
  chunksFor,
  composePage,
  fetchJson,
  fillHtaccess,
  guidesFetchFallback,
  hoistLeadingTags,
  htaccessRoutes,
  injectHead,
  longHtaccessLines,
  preFileFor,
  preloadProjects,
  preloadSettings,
  prerenderApiBase,
  scriptJson,
  unreviewedArticles,
  seoFallbackContext,
  stripPageHead,
  validateCatalog,
} from '../../scripts/prerender.mjs';
import * as ssr from '../../src/entry-server';
import { FIXTURE_API, FIXTURE_BUILT_AT, FIXTURE_TEMPLATES, fixturePreload } from '../../src/lib/__tests__/preloadFixture';

const ROOT = resolve(__dirname, '..', '..');
const HTACCESS = readFileSync(join(ROOT, 'deploy', 'cpanel', 'htaccess'), 'utf8').replace(/\r\n/g, '\n');

const SHELL = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Memuat situs…</title>
    <meta name="description" content="lama" />
    <meta property="og:title" content="lama" />
    <link rel="canonical" href="https://contoh.test/" />
    <script type="module" crossorigin src="/assets/index-AbCdEf12.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-Zz9Yy8Xx.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('page assembly', () => {
  it('maps paths to _pre files', () => {
    expect(preFileFor('/')).toBe('index.html');
    expect(preFileFor('/pesan-custom')).toBe('pesan-custom.html');
    expect(preFileFor('/template/finova')).toBe('template/finova.html');
  });

  it('keeps stale settings no public page reads (custom package prices, old sections) out of gn-preload', () => {
    const settings = { contact_email: 'info@garudanexa.com', disabled_sections: '["pricing"]', pricing_data: '[{"price":"Rp 2.000.000"}]', process_data: '[]' };
    expect(preloadSettings(settings)).toEqual({ contact_email: 'info@garudanexa.com', disabled_sections: '["pricing"]' });
    expect(preloadSettings(undefined)).toEqual({});
    // Bila halaman publik mulai membaca salah satu key ini, hapus dari PRELOAD_OMIT_SETTINGS (hidrasi butuh datanya)
    const publicFiles = readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
      .map((file) => file.split('\\').join('/'))
      .filter((file) => /\.tsx?$/.test(file) && !/(^|\/)__tests__\//.test(file) && !file.startsWith('pages/admin/') && !file.startsWith('templates/'));
    expect(publicFiles.length).toBeGreaterThan(50);
    for (const file of publicFiles) {
      const source = readFileSync(join(ROOT, 'src', file), 'utf8');
      for (const key of PRELOAD_OMIT_SETTINGS) expect(source.includes(key), `${file} membaca ${key}`).toBe(false);
    }
  });

  it('escapes "<" in the inline JSON so data can never close the <script>', () => {
    const value = { a: '</script><script>alert(1)</script>', b: '<!-- x -->' };
    const json = scriptJson(value);
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual(value);
  });

  it('strips the per-page head of the shell but keeps charset, viewport, scripts and styles', () => {
    const head = stripPageHead(SHELL);
    expect(head).not.toMatch(/<title>|name="description"|og:title|rel="canonical"/);
    expect(head).toContain('<meta charset="UTF-8" />');
    expect(head).toContain('name="viewport"');
    expect(head).toContain('src="/assets/index-AbCdEf12.js"');
    expect(head).toContain('href="/assets/index-Zz9Yy8Xx.css"');
  });

  it('puts the page head right after the viewport, before scripts and styles', () => {
    const html = injectHead(stripPageHead(SHELL), '<title>Baru</title>');
    expect(html.indexOf('<title>Baru</title>')).toBeGreaterThan(html.indexOf('name="viewport"'));
    expect(html.indexOf('<title>Baru</title>')).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it('fills #root, adds the preload data after it, and moves React hoisted tags into the head', () => {
    const page = composePage(SHELL, {
      headTags: '<title>Halaman</title>\n<link rel="preload" as="image" href="/a.webp" fetchpriority="high">',
      appHtml: '<link rel="preload" as="image" href="/a.webp"/><link rel="preload" as="image" href="/b.webp"/><main><h1>Judul $& $1</h1></main>',
      preload: { path: '/', builtAt: FIXTURE_BUILT_AT, api: { x: '</script>' } },
    });
    expect(page).toContain('<div id="root"><main><h1>Judul $& $1</h1></main></div>');
    expect(page.match(/href="\/a\.webp"/g)).toHaveLength(1);
    expect(page.indexOf('href="/b.webp"')).toBeLessThan(page.indexOf('</head>'));
    const json = /<script id="gn-preload" type="application\/json">(.*?)<\/script>/.exec(page)?.[1];
    expect(JSON.parse(json!)).toMatchObject({ path: '/', api: { x: '</script>' } });
    expect(page.indexOf('id="gn-preload"')).toBeGreaterThan(page.indexOf('<div id="root">'));
  });

  it('only hoists the leading run of link/meta tags', () => {
    const out = hoistLeadingTags('<div><link rel="x" href="/in-body"></div>', '<title>t</title>');
    expect(out.appHtml).toBe('<div><link rel="x" href="/in-body"></div>');
  });

  it('lists the route chunks (and their static imports) that the entry does not load already', () => {
    const manifest = {
      'index.html': { file: 'assets/index-a.js', isEntry: true, imports: ['_vendor'], css: ['assets/index-a.css'] },
      _vendor: { file: 'assets/vendor-b.js' },
      'src/pages/public/TemplateDetail.tsx': {
        file: 'assets/TemplateDetail-c.js',
        isDynamicEntry: true,
        imports: ['_vendor', '_icon'],
        css: ['assets/TemplateDetail-c.css'],
      },
      _icon: { file: 'assets/icon-d.js' },
    };
    expect(chunksFor(manifest, ['src/pages/public/TemplateDetail.tsx'])).toEqual({
      js: ['/assets/TemplateDetail-c.js', '/assets/icon-d.js'],
      css: ['/assets/TemplateDetail-c.css'],
    });
    expect(chunksFor(manifest, ['src/tidak/ada.tsx'])).toEqual({ js: [], css: [] });
  });
});

describe('sanity checks', () => {
  const page = (root: string, head = '<title>T</title><link rel="canonical" href="https://garudanexa.com/x">') =>
    `<html><head>${head}</head><body><div id="root">${root}</div></body></html>`;

  it('accepts a complete page', () => {
    expect(checkPage('ok', page('<main><h1>Judul</h1></main>'))).toEqual([]);
  });

  it('rejects missing/extra h1, unfinished Suspense, spinner fallbacks and broken JSON-LD', () => {
    const messages = (html: string) => checkPage('p', html).map((p: { message: string }) => p.message).join('\n');
    expect(messages(page('<p>tanpa judul</p>'))).toMatch(/0 <h1>/);
    expect(messages(page('<h1>a</h1><h1>b</h1>'))).toMatch(/2 <h1>/);
    expect(messages(page('<h1>a</h1><!--$?--><template id="B:0"></template><!--/$-->'))).toMatch(/Suspense/);
    expect(messages(page('<h1>a</h1><div role="status" aria-label="Memuat halaman"></div>'))).toMatch(/spinner/);
    expect(messages(page('<h1>a</h1>', '<title>T</title><link rel="canonical" href="x"><script type="application/ld+json">{x</script>'))).toMatch(
      /JSON-LD/,
    );
  });

  it('reports a missing canonical as a head problem (a warning only in --build-only)', () => {
    expect(checkPage('p', page('<h1>a</h1>', '<title>T</title>'))).toEqual([{ level: 'head', message: 'p: 0 canonical (harus tepat 1)' }]);
  });

  it('a public noindex page (e.g. /panduan without published articles) has no canonical and a noindex meta', () => {
    const noindexHead = '<title>T</title><meta name="robots" content="noindex,follow">';
    expect(checkPage('p', page('<h1>a</h1>', noindexHead), { indexable: false })).toEqual([]);
    expect(checkPage('p', page('<h1>a</h1>', `${noindexHead}<link rel="canonical" href="https://garudanexa.com/p">`), { indexable: false })).toEqual([
      { level: 'head', message: 'p: 1 canonical di halaman noindex (harus 0)' },
    ]);
    expect(checkPage('p', page('<h1>a</h1>', '<title>T</title>'), { indexable: false })).toEqual([
      { level: 'error', message: 'p: halaman noindex tanpa meta robots noindex' },
    ]);
  });
});

describe('API data', () => {
  it('rejects an empty, short or broken catalog', () => {
    const body = FIXTURE_API['/api.php?action=get_templates'];
    expect(validateCatalog(body, 5)).toEqual(FIXTURE_TEMPLATES.map((t) => t.slug));
    expect(() => validateCatalog(body, 6)).toThrow(/minimal 6/);
    expect(() => validateCatalog({ templates: [] }, 1)).toThrow(/minimal 1/);
    expect(() => validateCatalog({}, 1)).toThrow(/daftar templates/);
    expect(() => validateCatalog({ templates: [{ ...FIXTURE_TEMPLATES[0], slug: 'kategori' }] }, 1)).toThrow(/Slug/);
    expect(() => validateCatalog({ templates: [{ ...FIXTURE_TEMPLATES[0], price: 0 }] }, 1)).toThrow(/harga/);
    expect(() => validateCatalog({ templates: [FIXTURE_TEMPLATES[0], FIXTURE_TEMPLATES[0]] }, 1)).toThrow(/ganda/);
  });

  it('fetches sequentially with the prerender user agent and retries twice', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('reset'))
      .mockResolvedValueOnce(new Response('<html>WAF</html>', { status: 403 }))
      .mockResolvedValueOnce(new Response('{"ok":1}', { status: 200 }));
    await expect(fetchJson('https://contoh.test/api', { fetchImpl, retryDelayMs: 0 })).resolves.toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0][1].headers['User-Agent']).toBe(USER_AGENT);
    expect(USER_AGENT).toBe('GarudaNexaPrerender/1.0');
  });

  it('fails after 3 attempts, on {error} bodies, on non-JSON and on timeouts', async () => {
    const always = (make: () => Promise<Response>) => vi.fn(make);
    const error = always(async () => new Response('{"error":"rusak"}', { status: 200 }));
    await expect(fetchJson('u', { fetchImpl: error, retryDelayMs: 0 })).rejects.toThrow(/3 percobaan: error API: rusak/);
    expect(error).toHaveBeenCalledTimes(3);
    const html = always(async () => new Response('<!doctype html>', { status: 200 }));
    await expect(fetchJson('u', { fetchImpl: html, retryDelayMs: 0 })).rejects.toThrow(/bukan JSON/);
    const hang = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise<Response>((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))),
    );
    await expect(fetchJson('u', { fetchImpl: hang, retries: 0, timeoutMs: 20 })).rejects.toThrow(/1 percobaan/);
  });
});

describe('.htaccess routing (main host only)', () => {
  const pos = (needle: string) => {
    const at = HTACCESS.indexOf(needle);
    expect(at, needle).toBeGreaterThan(-1);
    return at;
  };

  it('keeps the rule order: internal files blocked → ai-chat → trailing slash → prerender → seo.php → app → buyer SPA → 404', () => {
    const order = [
      pos('RewriteCond %{THE_REQUEST} \\s/+(_pre([/?\\s]|$)|app\\.html|seo\\.php) [NC]'),
      pos('RewriteCond %{THE_REQUEST} \\s/+404\\.html[\\s?] [NC]'),
      pos('RewriteRule ^api/ai-chat/?$ api.php?action=ai_chat [QSA,L]'),
      pos('RewriteRule ^(.+?)/+$ https://garudanexa.com/$1 [R=301,L]'),
      pos('# BEGIN gn-prerender'),
      pos('RewriteRule ^template/([a-z0-9-]{1,120})$ seo.php?slug=$1 [L]'),
      pos('RewriteRule ^(akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(/.*)?$ app.html [L]'),
      pos('RewriteCond %{HTTP_HOST} !^garudanexa\\.com$ [NC]'),
      // yang pertama R=404 = blok file internal; yang terakhir = 404 asli host utama
      HTACCESS.lastIndexOf('RewriteRule ^ - [R=404,L]'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(pos('ErrorDocument 404 /404.html')).toBeLessThan(pos('# php -- BEGIN cPanel-generated handler'));
    expect(HTACCESS).toMatch(/AddType "text\/plain; charset=utf-8" \.txt/);
    expect(HTACCESS).toMatch(/<FilesMatch "\\\.html\$">\n\s*Header set Cache-Control "no-cache"/);
  });

  it('blocks direct requests for internal files but not similar public paths', () => {
    expect(HTACCESS).toContain('RewriteCond %{THE_REQUEST} \\s/+(_pre([/?\\s]|$)|app\\.html|seo\\.php) [NC]');
    const rule = new RegExp(String.raw`\s/+(_pre([/?\s]|$)|app\.html|seo\.php)`, 'i');
    const line = (path: string) => `GET ${path} HTTP/1.1`;
    for (const path of ['/_pre/index.html', '/_pre', '/_pre?x', '//_pre/template/finova.html', '/app.html', '/seo.php?slug=finova']) {
      expect(rule.test(line(path)), path).toBe(true);
    }
    for (const path of ['/', '/template/finova', '/pesan-custom', '/_preview', '/api.php?action=get_settings', '/assets/app.js']) {
      expect(rule.test(line(path)), path).toBe(false);
    }
  });

  it('answers a direct /404.html with 410, never R=404 (LiteSpeed returns 500 for a 404 on its own ErrorDocument)', () => {
    const goneRule = ['RewriteCond %{ENV:REDIRECT_STATUS} ^$', 'RewriteCond %{THE_REQUEST} \\s/+404\\.html[\\s?] [NC]', 'RewriteRule ^ - [G,L]'].join('\n  ');
    expect(HTACCESS).toContain(goneRule);
    expect(HTACCESS).toContain('RewriteRule ^/*404\\.html$ - [G,L,NC]');
    expect(HTACCESS).not.toMatch(/404\\\.html[^\n]*\[R=404/);
    const rule = new RegExp(String.raw`\s/+404\.html[\s?]`, 'i');
    for (const path of ['/404.html', '//404.html', '/404.html?x']) expect(rule.test(`GET ${path} HTTP/1.1`), path).toBe(true);
    // The ErrorDocument subrequest of an ordinary 404 keeps the original request line, so it is never caught
    for (const path of ['/halaman-tidak-ada', '/template/tidak-ada', '/x404.html']) expect(rule.test(`GET ${path} HTTP/1.1`), path).toBe(false);
  });

  it('also blocks percent-encoded requests for internal files (matched on the decoded path)', () => {
    const encodedRule = [
      'RewriteCond %{ENV:REDIRECT_STATUS} ^$',
      'RewriteCond %{THE_REQUEST} ^\\S+\\s+[^?\\s]*%',
      'RewriteRule ^/*(_pre(/|$)|app\\.html$|seo\\.php$) - [R=404,L,NC]',
    ].join('\n  ');
    expect(HTACCESS).toContain(encodedRule);
    // Sebelum aturan rute (garis miring, prerender, seo.php), sesudah blok file internal biasa
    expect(pos(encodedRule)).toBeGreaterThan(pos('RewriteCond %{THE_REQUEST} \\s/+(_pre'));
    expect(pos(encodedRule)).toBeLessThan(pos('# BEGIN gn-prerender'));
    const hasPercent = /^\S+\s+[^?\s]*%/;
    const decodedPath = /^\/*(_pre(\/|$)|app\.html$|seo\.php$)/i;
    const blocked = (requestPath: string) => {
      const [path] = requestPath.split('?');
      return hasPercent.test(`GET ${requestPath} HTTP/1.1`) && decodedPath.test(decodeURIComponent(path).replace(/^\//, ''));
    };
    for (const path of ['/%5Fpre/index.html', '/%5fpre/template/finova.html', '/%5Fpre/seo-fallback.json', '/seo%2Ephp?slug=finova', '/app%2Ehtml', '/%61pp.html']) {
      expect(blocked(path), path).toBe(true);
    }
    for (const path of ['/harga', '/template/finova', '/template?q=%5Fpre', '/assets/foto%20baru.jpg', '/%5Fpreview']) {
      expect(blocked(path), path).toBe(false);
    }
  });

  it('sends app routes to app.html, but never /pesan-custom', () => {
    const app = /^(akun|admin|pesan|demo|situs|masuk|daftar|login|auth)(\/.*)?$/;
    for (const path of ['akun', 'akun/pesanan/GN-1', 'pesan/aura-studio', 'demo/finova', 'situs/12', 'masuk', 'daftar', 'admin', 'login', 'auth']) {
      expect(app.test(path), path).toBe(true);
    }
    for (const path of ['pesan-custom', 'akunku', 'template/finova', 'demo-x']) expect(app.test(path), path).toBe(false);
  });

  it('writes the prerendered routes into the gn-prerender block without -f checks on DOCUMENT_ROOT', () => {
    const block = htaccessRoutes(['/', '/template/finova', '/pesan-custom']);
    expect(block).toContain('RewriteRule ^$ _pre/index.html [L]');
    expect(block).toContain('RewriteRule ^(pesan-custom|template/finova)$ _pre/$1.html [L]');
    expect(block).not.toContain('DOCUMENT_ROOT');
    const filled = fillHtaccess(HTACCESS, block);
    expect(filled).toContain(block);
    expect(filled.match(/# BEGIN gn-prerender/g)).toHaveLength(1);
    expect(filled.trimEnd().endsWith('# php -- END cPanel-generated handler, do not edit')).toBe(true);
    expect(() => fillHtaccess('RewriteEngine On\n', block)).toThrow(/gn-prerender/);
    expect(() => htaccessRoutes(['/', '/a b'])).toThrow(/tidak aman/);
    expect(() => htaccessRoutes(['/', '/x|y'])).toThrow(/tidak aman/);
  });

  it('splits many routes over several short RewriteRules (Apache rejects .htaccess lines over 8190 characters)', () => {
    const paths = ['/', ...Array.from({ length: 500 }, (_, i) => `/panduan/artikel-panduan-yang-cukup-panjang-nomor-${i + 1}`)];
    const block = htaccessRoutes(paths);
    const rules = block.split('\n').filter((line) => line.includes('_pre/$1.html'));
    expect(rules).toHaveLength(Math.ceil(500 / HTACCESS_ROUTES_PER_RULE));
    // Setiap RewriteRule punya RewriteCond host utama sendiri tepat di atasnya
    const lines = block.split('\n');
    for (const rule of rules) expect(lines[lines.indexOf(rule) - 1]).toBe('  RewriteCond %{HTTP_HOST} ^garudanexa\\.com$ [NC]');
    const routed = rules.flatMap((rule) => /\^\((.*)\)\$/.exec(rule)![1].split('|'));
    expect(routed.sort()).toEqual(paths.slice(1).map((p) => p.slice(1)).sort());
    const filled = fillHtaccess(HTACCESS, block);
    expect(longHtaccessLines(filled)).toEqual([]);
    expect(Math.max(...filled.split('\n').map((line) => line.length))).toBeLessThan(HTACCESS_MAX_LINE);
    // Pengaman terakhir: baris yang tetap terlalu panjang menggagalkan build, bukan situs
    const tooLong = `  # BEGIN gn-prerender\n  RewriteRule ^(${'a'.repeat(HTACCESS_MAX_LINE)})$ x [L]\n  # END gn-prerender`;
    expect(() => fillHtaccess(HTACCESS, tooLong)).toThrow(/karakter/);
  });
});

describe('data source', () => {
  it('a real deploy only reads production data; --build-only may use a local API', () => {
    expect(prerenderApiBase({ strict: true, env: {} })).toBe('https://garudanexa.com');
    expect(prerenderApiBase({ strict: true, env: { PRERENDER_API: 'https://garudanexa.com/' } })).toBe('https://garudanexa.com/');
    expect(() => prerenderApiBase({ strict: true, env: { PRERENDER_API: 'http://127.0.0.1:8000' } })).toThrow(/data production/);
    expect(() => prerenderApiBase({ strict: true, env: { PRERENDER_API: 'https://staging.garudanexa.com' } })).toThrow(/data production/);
    expect(prerenderApiBase({ strict: true, env: { PRERENDER_API: 'http://127.0.0.1:8000', PRERENDER_ALLOW_NONPROD: '1' } })).toBe(
      'http://127.0.0.1:8000',
    );
    expect(prerenderApiBase({ strict: false, env: { PRERENDER_API: 'http://127.0.0.1:8000' } })).toBe('http://127.0.0.1:8000');
    expect(() => prerenderApiBase({ strict: false, env: { PRERENDER_API: 'bukan url' } })).toThrow(/bukan URL/);
  });

  it('finds unreviewed guide articles (a real deploy refuses them)', () => {
    expect(unreviewedArticles([{ slug: 'a', reviewed: null }, { slug: 'b', reviewed: '2026-11-06' }, { slug: 'c', reviewed: '' }])).toEqual(['a', 'c']);
    expect(unreviewedArticles([])).toEqual([]);
    const source = readFileSync(join(ROOT, 'scripts', 'prerender.mjs'), 'utf8');
    // Guides come from get_guides (database): the API sends published ones only, a draft there aborts the deploy
    expect(source).toMatch(/if \(drafts\.length\) throw new Error\(`get_guides mengirim artikel yang belum ditinjau/);
  });

  it('first deploy of the database guides: a failing get_guides is skipped only with PRERENDER_GUIDES_BOOTSTRAP=1', async () => {
    expect(GUIDES_BOOTSTRAP_ENV).toBe('PRERENDER_GUIDES_BOOTSTRAP');
    const bootstrap = { env: { PRERENDER_GUIDES_BOOTSTRAP: '1' } };
    // The old production api.php does not know get_guides: not a public action, so 401 (until this deploy is live)
    const old = vi.fn(async () => new Response('{"error":"Sesi tidak valid atau sudah berakhir."}', { status: 401 }));
    const httpError = await fetchJson('https://garudanexa.com/api.php?action=get_guides', { fetchImpl: old, retryDelayMs: 0 }).catch((e: unknown) => e);
    expect(httpError).toMatchObject({ status: 401, message: expect.stringMatching(/3 percobaan: HTTP 401$/) });

    // Without the flag (or with any other value) the deploy stops and explains the migration 017 + flag bootstrap
    for (const env of [{}, { PRERENDER_GUIDES_BOOTSTRAP: '0' }, { PRERENDER_GUIDES_BOOTSTRAP: 'true' }]) {
      expect(() => guidesFetchFallback(httpError, { env })).toThrow(/HTTP 401\. .*2026-10-24_017_guide_articles\.sql.*PRERENDER_GUIDES_BOOTSTRAP=1/);
    }
    // With the flag: an empty guide list in the get_guides shape (it also goes into gn-preload) and a warning
    const fallback = guidesFetchFallback(httpError, bootstrap);
    expect(fallback.body).toEqual({ success: true, guides: [] });
    expect(fallback.warning).toMatch(/HTTP 401\. PRERENDER_GUIDES_BOOTSTRAP=1: lanjut tanpa artikel panduan/);

    // Not an HTTP answer (broken body, {error} with 200, timeout): never skipped, flag or not
    const broken = await fetchJson('u', { fetchImpl: vi.fn(async () => new Response('<html>WAF</html>', { status: 200 })), retryDelayMs: 0 }).catch(
      (e: unknown) => e,
    );
    const apiError = await fetchJson('u', { fetchImpl: vi.fn(async () => new Response('{"error":"rusak"}', { status: 200 })), retryDelayMs: 0 }).catch(
      (e: unknown) => e,
    );
    for (const error of [broken, apiError, new Error('Gagal mengambil u setelah 3 percobaan: The operation was aborted due to timeout')]) {
      expect((error as { status?: number }).status).toBeUndefined();
      expect(() => guidesFetchFallback(error, bootstrap)).toThrow(/hanya melewati jawaban HTTP gagal/);
      expect(() => guidesFetchFallback(error, { env: {} })).toThrow(/PRERENDER_GUIDES_BOOTSTRAP=1/);
    }

    // fetchSiteData puts the substitute into `api`, so the preload matches what was rendered
    const source = readFileSync(join(ROOT, 'scripts', 'prerender.mjs'), 'utf8').replace(/\r\n/g, '\n');
    expect(source).toMatch(/const fallback = guidesFetchFallback\(error\);\n\s*warn\(fallback\.warning\);\n\s*guides = api\[urls\.guides\] = fallback\.body;/);
  });

  it('the deploy commit records where the data came from', () => {
    const deploy = readFileSync(join(ROOT, 'scripts', 'deploy-cpanel.mjs'), 'utf8');
    expect(deploy).toMatch(/commit -m "deploy: build dari main \$\{sourceSha\}\$\{dirty\} \(data \$\{prerendered\.dataOrigin\} \$\{prerendered\.builtAt\}\)"/);
  });
});

describe('server render (src/entry-server.tsx)', () => {
  const render = async (path: string) => {
    const result = await ssr.render(path, fixturePreload(path));
    expect(result.errors).toEqual([]);
    expect(result.html).not.toMatch(/<!--\$[!?]-->/);
    expect(result.html).not.toContain('aria-label="Memuat halaman"');
    return result.html;
  };
  const h1Count = (html: string) => (html.match(/<h1[\s>]/g) ?? []).length;

  it('renders the home page with the catalog from the preload: every template linked, one h1', async () => {
    const html = await render('/');
    expect(h1Count(html)).toBe(1);
    for (const t of FIXTURE_TEMPLATES) expect(html).toContain(`href="/template/${t.slug}"`);
  }, 30_000);

  it('renders a template page with its price instead of a skeleton', async () => {
    const html = await render('/template/aura-studio');
    expect(h1Count(html)).toBe(1);
    expect(html.replace(/<[^>]+>/g, ' ')).toContain('1.390.000');
  }, 30_000);

  it('renders /pesan-custom and a legal page without touching browser-only APIs', async () => {
    expect(h1Count(await render('/pesan-custom'))).toBe(1);
    expect(h1Count(await render('/syarat-ketentuan'))).toBe(1);
  }, 30_000);

  it('gives the HTML only to the data it was given (caches are reset between pages)', async () => {
    const empty = { path: '/', builtAt: FIXTURE_BUILT_AT, api: {} };
    const html = (await ssr.render('/', empty)).html;
    expect(html).not.toContain('href="/template/finova"');
  }, 30_000);

  it('keeps unpresentable projects out of gn-preload without changing the rendered home page', async () => {
    const good = (id: number, name: string) => ({
      id,
      name,
      service_type: 'website',
      image: `/assets/dokumen-client/logo/p${id}.png`,
      description: `Website profil untuk ${name} dengan halaman layanan, galeri, dan kontak WhatsApp.`,
    });
    const junk = { id: 9, name: '[TEST verif-ui] Aplikasi', service_type: 'mobile_app', image: '/x.png', description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do.' };
    const body = { success: true, projects: [good(1, 'Koperasi Maju'), junk, good(2, 'Sekolah Harapan')] };
    const trimmed = preloadProjects(body, ssr.presentableProjects);
    expect(trimmed.projects.map((p: { id: number }) => p.id)).toEqual([1, 2]);
    expect(preloadProjects(undefined, ssr.presentableProjects)).toBeUndefined();
    const withProjects = (projects: unknown) => {
      const preload = fixturePreload('/');
      return { ...preload, api: { ...preload.api, [ssr.PRELOAD_URLS.projects]: projects } };
    };
    const full = await ssr.render('/', withProjects(body));
    const lean = await ssr.render('/', withProjects(trimmed));
    expect(full.errors).toEqual([]);
    expect(lean.html).toBe(full.html);
    expect(full.html).toContain('Koperasi Maju');
    expect(full.html).not.toContain('[TEST verif-ui]');
  }, 30_000);

  it('drops a single presentable project from gn-preload: the home page shows the portfolio fallback instead', async () => {
    const lone = {
      id: 5,
      name: 'Portal Investor Samudra',
      service_type: 'website',
      image: '/assets/dokumen-client/logo/p5.png',
      description: 'Website corporate dan portal investor dengan hosting dedicated dan SLA pemeliharaan 12 bulan.',
    };
    const body = { success: true, projects: [lone] };
    const trimmed = preloadProjects(body, ssr.presentableProjects);
    expect(trimmed).toEqual({ success: true, projects: [] });
    expect(JSON.stringify(trimmed)).not.toContain('Samudra');
    const withProjects = (projects: unknown) => {
      const preload = fixturePreload('/');
      return { ...preload, api: { ...preload.api, [ssr.PRELOAD_URLS.projects]: projects } };
    };
    const full = await ssr.render('/', withProjects(body));
    const lean = await ssr.render('/', withProjects(trimmed));
    expect(full.errors).toEqual([]);
    expect(lean.html).toBe(full.html);
    expect(full.html).not.toContain('Samudra');
  }, 30_000);

  it('builds the seo.php context from the same TypeScript head (Organization/WebSite nodes)', () => {
    const data = ssr.seoDataFromApi(FIXTURE_API, FIXTURE_BUILT_AT);
    const ctx = seoFallbackContext(ssr, data, 'finova', FIXTURE_BUILT_AT);
    expect(ctx.origin).toBe('https://garudanexa.com');
    expect(ctx.globalJsonLd.map((node: { '@type': string }) => node['@type'])).not.toContain('Product');
    expect(ctx.categorySlugs).toContain('kecantikan-klinik');
    expect(ctx.pricingIncludes.length).toBeGreaterThan(0);
  });
});
