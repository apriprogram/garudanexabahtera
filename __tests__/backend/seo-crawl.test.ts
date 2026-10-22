// @vitest-environment node
// Crawler access hotfix (docs/platform/SEO-PLAN.md §5.0, WP0):
// - public/robots.txt lets crawlers fetch the public read actions of api.php (pages need that data to render) and keeps
//   the rest of the API, /admin, /login and /auth closed. No bot-specific groups (AI training bots are allowed).
// - Every API response says `X-Robots-Tag: noindex`, on both backends (api.php and server.js via security.js).
// - deploy/cpanel/htaccess: www → apex before the HTTPS rule, /index.html → / for real requests only, a year of
//   caching for text/javascript and immutable hashed build files, cPanel's PHP handler block still last.
//   The rules themselves were also tried on a throwaway Apache config (see the WP0 report); here we pin the structure.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { join, resolve } from 'node:path';

vi.hoisted(() => {
  // security.js reads AUTH_SECRET when it is imported (and complains without one)
  process.env.AUTH_SECRET = 'r'.repeat(16) + Math.random().toString(36).slice(2).padEnd(24, 'b');
});
// Only backend/node_modules has bcryptjs; security.js imports it at the top
vi.mock('bcryptjs', () => ({ default: { hashSync: () => 'dummy', compare: async () => false, hash: async () => 'dummy' } }));

import { securityHeaders } from '../../backend/security.js';

const ROOT = resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');
const ROBOTS = read('public', 'robots.txt');
const HTACCESS = read('deploy', 'cpanel', 'htaccess');
const API_PHP = read('backend', 'api.php');

describe('robots.txt', () => {
  it('is exactly the plan 5.0 file: public read actions open, the rest of the API closed', () => {
    expect(ROBOTS).toBe(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /api.php?action=get_settings',
        'Allow: /api.php?action=get_navbar_menus',
        'Allow: /api.php?action=get_templates',
        'Allow: /api.php?action=get_template&',
        'Allow: /api.php?action=get_public_projects',
        'Disallow: /api.php',
        'Disallow: /admin',
        'Disallow: /login',
        'Disallow: /auth',
        '',
        'Sitemap: https://garudanexa.com/sitemap.xml',
        '',
      ].join('\n'),
    );
  });

  it('has one group only, so no crawler loses the * rules', () => {
    expect(ROBOTS.match(/^User-agent:/gim)).toHaveLength(1);
  });

  // Google: the longest matching rule wins (Allow wins a tie). Enough of that to check the intent.
  const allowed = (path: string) => {
    const rules = ROBOTS.split('\n')
      .map((line) => line.match(/^(Allow|Disallow):\s*(\S+)$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .filter((m) => path.startsWith(m[2]))
      .sort((a, b) => b[2].length - a[2].length || (a[1] === 'Allow' ? -1 : 1));
    return rules.length === 0 || rules[0][1] === 'Allow';
  };

  it('lets pages load their data but keeps private actions and the staff area out', () => {
    for (const path of [
      '/', '/template/aura-studio', '/template/kategori/company-profile', '/harga', '/panduan/biaya-website-company-profile',
      '/api.php?action=get_settings', '/api.php?action=get_navbar_menus', '/api.php?action=get_templates',
      '/api.php?action=get_template&slug=aura-studio', '/api.php?action=get_public_projects',
      // app pages stay crawlable so crawlers can read their noindex (WP2)
      '/akun', '/masuk', '/daftar', '/pesan/aura-studio', '/demo/finova',
    ]) {
      expect(allowed(path), path).toBe(true);
    }
    for (const path of [
      '/api.php', '/api.php?action=login', '/api.php?action=customer_get_orders', '/api.php?action=get_site_public',
      '/admin', '/admin/templates', '/login', '/auth', '/auth?type=login',
    ]) {
      expect(allowed(path), path).toBe(false);
    }
  });
});

describe('X-Robots-Tag on API responses', () => {
  it('Node: securityHeaders (every server.js response) sends noindex next to the other headers', () => {
    const headers: Record<string, string> = {};
    const res = { set: (h: Record<string, string>) => Object.assign(headers, h) };
    let nextCalled = false;
    (securityHeaders as unknown as (req: unknown, res: unknown, next: () => void) => void)({}, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(headers).toMatchObject({ 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  });

  it('PHP: api.php sends the header before it loads modules or touches the database', () => {
    const at = API_PHP.indexOf("header('X-Robots-Tag: noindex');");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(API_PHP.indexOf('set_exception_handler('));
    expect(at).toBeLessThan(API_PHP.indexOf('require_once'));
    expect(at).toBeLessThan(API_PHP.indexOf('new mysqli('));
  });
});

// The real api.php under `php -S`, pointed at a database that does not exist: the preflight answer (before any
// database work) and the 500 error answer must both carry the header.
const PHP_AVAILABLE = spawnSync('php', ['-r', 'echo extension_loaded("mysqli") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';

describe.skipIf(!PHP_AVAILABLE)('X-Robots-Tag from the real api.php', () => {
  let php: ChildProcess | null = null;
  let base = '';

  beforeAll(async () => {
    const port = await new Promise<number>((done) => {
      const s = createServer();
      s.listen(0, '127.0.0.1', () => {
        const { port: p } = s.address() as AddressInfo;
        s.close(() => done(p));
      });
    });
    base = `http://127.0.0.1:${port}`;
    php = spawn('php', ['-d', 'display_errors=0', '-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'backend')], {
      // Variables already in the environment win over .env in load_env_file(), so no real database is reached
      env: { ...process.env, MYSQL_HOST: '127.0.0.1', MYSQL_USER: 'gn_seo_test_nobody', MYSQL_PASS: 'x', MYSQL_DB: 'gn_seo_test_missing' },
      stdio: 'ignore',
    });
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(`${base}/robots-probe.txt`);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('php -S did not start');
  }, 20_000);

  afterAll(() => {
    php?.kill();
  });

  it('preflight (OPTIONS) and a failing GET both say noindex', async () => {
    const preflight = await fetch(`${base}/api.php?action=get_templates`, { method: 'OPTIONS' });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('x-robots-tag')).toBe('noindex');

    const failing = await fetch(`${base}/api.php?action=get_templates`);
    expect(failing.status).toBe(500);
    expect(failing.headers.get('x-robots-tag')).toBe('noindex');
    expect(failing.headers.get('content-type')).toContain('application/json');
  }, 20_000);
});

describe('deploy/cpanel/htaccess', () => {
  const pos = (needle: string) => {
    const at = HTACCESS.indexOf(needle);
    expect(at, needle).toBeGreaterThan(-1);
    return at;
  };

  it('keeps the explanation at the top and the cPanel PHP handler block at the very end', () => {
    expect(HTACCESS.startsWith('# garudanexa.com di cPanel')).toBe(true);
    expect(HTACCESS.trimEnd().endsWith('# php -- END cPanel-generated handler, do not edit')).toBe(true);
    expect(HTACCESS.indexOf('# php -- BEGIN cPanel-generated handler')).toBe(HTACCESS.lastIndexOf('# php -- BEGIN'));
  });

  it('sends www to the apex in one hop, before the HTTPS rule', () => {
    const www = pos('RewriteCond %{HTTP_HOST} ^www\\.garudanexa\\.com$ [NC]');
    const wwwRule = pos('RewriteRule ^ https://garudanexa.com%{REQUEST_URI} [R=301,L]');
    const https = pos('RewriteCond %{HTTPS} !=on');
    expect(pos('RewriteEngine On')).toBeLessThan(www);
    expect(www).toBeLessThan(wwwRule);
    expect(wwwRule).toBeLessThan(https);
  });

  it('redirects /index.html to https://garudanexa.com/ for real requests on the main host only, before the SPA rule', () => {
    const block = HTACCESS.match(
      /RewriteCond %\{HTTP_HOST\} \^garudanexa\\\.com\$ \[NC\]\n\s*RewriteCond %\{THE_REQUEST\} \\s\/index\\\.html\[\\s\?\]\n\s*RewriteRule \^index\\\.html\$ https:\/\/garudanexa\.com\/ \[R=301,L\]/,
    );
    expect(block).not.toBeNull();
    expect(HTACCESS.indexOf(block![0])).toBeGreaterThan(pos('RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]'));
    expect(HTACCESS.indexOf(block![0])).toBeLessThan(pos('RewriteRule ^ index.html [L]'));
  });

  it('caches JavaScript for a year whatever its MIME type, and hashed build files as immutable', () => {
    expect(HTACCESS).toMatch(/^\s*ExpiresByType text\/javascript "access plus 1 year"$/m);
    expect(HTACCESS).toMatch(/^\s*ExpiresByType application\/javascript "access plus 1 year"$/m);
    const files = HTACCESS.match(/<FilesMatch "(-\[A-Za-z0-9_-\]\{8\}\\\.\(js\|css\)\$)">\n\s*Header set Cache-Control "public, max-age=31536000, immutable"\n\s*<\/FilesMatch>/);
    expect(files).not.toBeNull();
    const pattern = new RegExp(files![1]);
    for (const name of ['index-BRiQkxTJ.js', 'index-Dk_3-a9Z.css', 'TemplateDetail-C0dE_x-1.js']) expect(pattern.test(name), name).toBe(true);
    for (const name of ['index.html', 'robots.txt', 'app.js', 'site.webmanifest', 'favicon.svg']) expect(pattern.test(name), name).toBe(false);
  });
});
