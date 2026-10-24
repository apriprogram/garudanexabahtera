// @vitest-environment node
// Jalankan: npx vitest run src/seo
// Aturan kapan SeoManager boleh menerapkan head (clientData.shouldApplyHead): daftar template dan artikel panduan
// dinilai terpisah. get_guides gagal tidak menahan kepala halaman lain, dan tidak pernah menurunkan halaman /panduan milik
// modul ke noindex/404; get_templates tetap menentukan semua halaman publik seperti sebelumnya.
import { describe, expect, it } from 'vitest';
import { clientSeoData, isGuidesPath, shouldApplyHead, type ApplyDecision, type CatalogStatus } from '../clientData';
import { findSeoModule, getHead } from '../routes';
import type { SeoData } from '../types';
import { DATA, TEMPLATES } from './fixtures';

/** Keputusan untuk path ini dengan data uji (kepala dan pemilik dihitung seperti SeoManager). */
const decide = (pathname: string, catalog: CatalogStatus, guides: CatalogStatus, data: SeoData = DATA, settingsLoaded = true): boolean => {
  const decision: ApplyDecision = {
    pathname,
    head: getHead(pathname, data),
    hasOwner: findSeoModule(pathname) !== null,
    settingsLoaded,
    catalog,
    guides,
  };
  return shouldApplyHead(decision);
};

/** Data klien setelah get_guides gagal: tanpa artikel. */
const NO_GUIDES: SeoData = { ...DATA, guides: [] };
const SLUG = DATA.guides![0].slug;

describe('isGuidesPath', () => {
  it('/panduan dan path di bawahnya saja', () => {
    expect(isGuidesPath('/panduan')).toBe(true);
    expect(isGuidesPath(`/panduan/${SLUG}`)).toBe(true);
    expect(isGuidesPath('/panduan/a/b')).toBe(true);
    expect(isGuidesPath('/panduanku')).toBe(false);
    expect(isGuidesPath('/')).toBe(false);
    expect(isGuidesPath('/harga')).toBe(false);
  });
});

describe('shouldApplyHead', () => {
  it('rute aplikasi: selalu, apa pun status datanya', () => {
    expect(decide('/akun', 'loading', 'loading', DATA, false)).toBe(true);
    expect(decide('/akun', 'error', 'error')).toBe(true);
  });

  it('menunggu settings dan daftar template di semua halaman publik', () => {
    expect(decide('/', 'ready', 'ready', DATA, false)).toBe(false);
    expect(decide('/', 'loading', 'ready')).toBe(false);
    expect(decide('/panduan', 'loading', 'ready')).toBe(false);
    expect(decide('/', 'ready', 'ready')).toBe(true);
  });

  it('artikel panduan masih dimuat: hanya path /panduan yang menunggu', () => {
    expect(decide('/', 'ready', 'loading')).toBe(true);
    expect(decide('/harga', 'ready', 'loading')).toBe(true);
    expect(decide('/template/aura-studio', 'ready', 'loading')).toBe(true);
    expect(decide('/panduan', 'ready', 'loading')).toBe(false);
    expect(decide(`/panduan/${SLUG}`, 'ready', 'loading')).toBe(false);
  });

  it('get_guides gagal: kepala index halaman lain tetap diterapkan (daftar template tidak ikut hilang)', () => {
    expect(getHead('/', NO_GUIDES).robots).toBe('index,follow');
    expect(decide('/', 'ready', 'error', NO_GUIDES)).toBe(true);
    expect(decide('/harga', 'ready', 'error', NO_GUIDES)).toBe(true);
    expect(decide('/template/aura-studio', 'ready', 'error', NO_GUIDES)).toBe(true);
  });

  it('get_guides gagal: /panduan dan artikelnya tidak diturunkan ke noindex/404; 404 sungguhan tetap', () => {
    // Tanpa daftar artikel /panduan menjadi noindex dan artikel menjadi kepala 404: keduanya milik modul → ditahan
    expect(getHead('/panduan', NO_GUIDES).robots).toBe('noindex,follow');
    expect(decide('/panduan', 'ready', 'error', NO_GUIDES)).toBe(false);
    expect(getHead(`/panduan/${SLUG}`, NO_GUIDES).robots).toBe('noindex,follow');
    expect(decide(`/panduan/${SLUG}`, 'ready', 'error', NO_GUIDES)).toBe(false);
    // Path tanpa pemilik: 404 tidak bergantung data
    expect(decide('/panduan/a/b', 'ready', 'error', NO_GUIDES)).toBe(true);
    // Kepala index (mis. dari daftar yang sempat dimuat) tetap boleh
    expect(decide(`/panduan/${SLUG}`, 'ready', 'error')).toBe(true);
  });

  it('artikel panduan siap: slug yang tidak terbit mendapat kepala 404', () => {
    expect(decide('/panduan/belum-ada-artikel', 'ready', 'ready')).toBe(true);
    expect(getHead('/panduan/belum-ada-artikel', DATA).robots).toBe('noindex,follow');
  });

  it('get_templates gagal: halaman milik modul tidak diturunkan ke noindex, kepala index tetap', () => {
    const noTemplates: SeoData = { ...DATA, templates: [], templateBySlug: {} };
    expect(decide('/template/aura-studio', 'error', 'ready', noTemplates)).toBe(false);
    expect(decide('/', 'error', 'ready', noTemplates)).toBe(true);
    expect(decide('/halaman-tidak-ada', 'error', 'ready', noTemplates)).toBe(true);
  });
});

describe('clientSeoData', () => {
  it('templateBySlug dari daftar; guides hanya yang diberikan (bawaan [])', () => {
    const data = clientSeoData({}, TEMPLATES, '2026-10-24T00:00:00.000Z');
    expect(Object.keys(data.templateBySlug)).toEqual(TEMPLATES.map((t) => t.slug));
    expect(data.guides).toEqual([]);
    expect(clientSeoData({}, [], '2026-10-24T00:00:00.000Z', DATA.guides).guides).toEqual(DATA.guides);
  });
});
