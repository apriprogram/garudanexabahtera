// @vitest-environment node
// Jalankan: npx vitest run __tests__/seo
// Berkas statis WP3 (docs/platform/SEO-PLAN.md §5.3 langkah 7–9): kartu OG 1200×630 JPEG ≤ 150 KB untuk setiap kartu
// yang dirujuk getHead, ikon (favicon.ico 48, apple-touch-icon 180, 192/512, logo-512), site.webmanifest, dan
// index.html sebagai shell netral untuk domain pembeli (tanpa description/OG/canonical/JSON-LD/manifest Garuda Nexa).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { expectedCards, imageSize } from '../../scripts/seo/og-images.mjs';
import { OG_CARDS } from '../../src/seo/ogCards.generated';
import { TEMPLATES } from '../../src/seo/__tests__/fixtures';

const ROOT = resolve(__dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts));

describe('kartu Open Graph', () => {
  it('daftar kartu (ogCards.generated.ts) sama dengan isi public/og', () => {
    const files = readdirSync(join(PUBLIC, 'og'))
      .filter((f) => f.endsWith('.jpg'))
      .map((f) => f.replace(/\.jpg$/, ''))
      .sort();
    expect([...OG_CARDS].sort()).toEqual(files);
  });

  it.each([...OG_CARDS])('og/%s.jpg: JPEG 1200×630, ≤ 150 KB', (name) => {
    const file = join(PUBLIC, 'og', `${name}.jpg`);
    expect(imageSize(readFileSync(file))).toEqual({ type: 'jpeg', width: 1200, height: 630 });
    expect(statSync(file).size).toBeLessThanOrEqual(150 * 1024);
  });

  it('kartu hub, kategori dan kelima template sudah dibuat', () => {
    for (const name of expectedCards(TEMPLATES)) expect(OG_CARDS, name).toContain(name);
    for (const name of ['default', 'catalog', 'jasa-website', 'jasa-aplikasi', 'harga', 'panduan', 'tentang', 'kontak']) {
      expect(OG_CARDS).toContain(name);
    }
  });
});

describe('ikon & manifest', () => {
  it.each([
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['brand/logo-512.png', 512],
  ])('%s: PNG %i×%i', (file, size) => {
    expect(imageSize(read('public', ...file.split('/')))).toEqual({ type: 'png', width: size, height: size });
  });

  it('favicon.ico berisi 16, 32 dan 48 px', () => {
    const ico = read('public', 'favicon.ico');
    expect(ico.readUInt16LE(2)).toBe(1); // tipe ikon
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + i * 16) || 256);
    expect(sizes).toEqual([16, 32, 48]);
  });

  it('site.webmanifest: nama, bahasa, warna, ikon 192 & 512 yang ada', () => {
    const manifest = JSON.parse(read('public', 'site.webmanifest').toString('utf8'));
    expect(manifest).toMatchObject({ name: 'Garuda Nexa', short_name: 'Garuda Nexa', lang: 'id', start_url: '/', theme_color: '#ffffff' });
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
    for (const icon of manifest.icons) expect(existsSync(join(PUBLIC, icon.src))).toBe(true);
  });

  it('favicon.svg tetap ada (dirujuk dengan ?v=2)', () => {
    expect(existsSync(join(PUBLIC, 'favicon.svg'))).toBe(true);
  });
});

describe('index.html: shell netral', () => {
  const html = read('index.html').toString('utf8');

  it('lang id, charset, viewport, judul "Memuat situs…", favicon dan theme-color', () => {
    expect(html).toContain('<html lang="id">');
    expect(html).toContain('<meta charset="UTF-8" />');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('<title>Memuat situs…</title>');
    expect(html).toContain('href="/favicon.svg?v=2"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('<meta name="theme-color" content="#ffffff" />');
    expect(html).toContain('<div id="root"></div>');
  });

  it('tanpa tag Garuda Nexa yang akan ikut ke domain pembeli', () => {
    expect(html).not.toMatch(/name="description"|property="og:|name="twitter:|rel="canonical"|ld\+json|rel="manifest"|apple-touch-icon|name="robots"/);
    expect(html).not.toMatch(/Garuda Nexa|garudanexa\.com/i);
  });
});
