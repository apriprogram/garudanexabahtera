// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/site-addons-render.test.tsx
// Fitur berbayar Berita & Pengumuman di tampilan situs (docs/platform/SITE-ADDONS-SPEC.md §6): berita biasa (fitur tidak
// aktif: item CMS, tanpa section profesional & tanpa tautan tulisan, rute /berita… = tidak ditemukan) vs profesional
// (newsroom + papan pengumuman dari tulisan, atau dari item CMS tanpa tautan detail; agenda & toggle section tetap),
// halaman daftar (cari judul, filter, "Muat lebih banyak"), halaman tulisan (waktu baca, bagikan dari URL kanonis,
// "… lainnya"), helper murni, dan demo /demo/{slug}?fitur=berita.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearApiCache } from '../../lib/api';
import TemplateDemo from '../../pages/public/TemplateDemo';
import type { SitePostPublic, SitePostSummary } from '../../types/sitePosts';
import { SiteRenderer } from '../SiteRenderer';
import { POST_THEME as MADANI_THEME } from '../madani/styles';
import { postCanonicalUrl, postReadingMinutes, postShareLinks } from '../shared/posts/model';
import { badgeTone, proDate, proItems, uniqueTags } from '../shared/posts/pro';
import { SITE_DATA_DEFAULT, type SiteData } from '../shared/siteData';
import type { ListItem, SectionContent } from '../types';
import { siteOriginOf, sitePostsEnabled } from '../useSitePublic';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

vi.setConfig({ testTimeout: 60_000 });

type Code = 'madani' | 'cakrawala' | 'bestari';
const CODES: Code[] = ['madani', 'cakrawala', 'bestari'];
const ORIGIN = 'https://smkharapan.sch.id';

const site = (code: Code, data: Partial<SiteData> = {}, content: unknown = null) =>
  render(<SiteRenderer templateCode={code} content={content} data={{ ...SITE_DATA_DEFAULT, ...data }} />).container;
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`);
const hrefs = (root: Element) => Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
const postHrefs = (root: Element) => hrefs(root).filter((h) => /^\/(berita|pengumuman)(\/|$)/.test(h));
const WITH_POSTS: Partial<SiteData> = { posts: { berita: NEWS, pengumuman: ANNOUNCEMENTS } };
const PRO: Partial<SiteData> = { postsEnabled: true };

/** Judul item berita & pengumuman demo/CMS template (tampilan basic). */
const demoTitles = (code: Code) => {
  const root = render(<SiteRenderer templateCode={code} content={null} />).container;
  const titles = (key: string) => Array.from(section(root, key)?.querySelectorAll('h3') ?? []).map((h) => h.textContent ?? '');
  const result = { news: titles('news'), announcements: titles('announcements') };
  cleanup();
  return result;
};

/** n berita: judul "Lomba …" untuk i % 3 = 0, kategori bergantian Kegiatan/Prestasi, tanggal menurun. */
const manyNews = (n: number): SitePostSummary[] =>
  Array.from({ length: n }, (_, i) => ({
    ...NEWS[1],
    id: 100 + i,
    slug: `berita-${i + 1}`,
    title: `${i % 3 === 0 ? 'Lomba' : 'Kegiatan'} sekolah nomor ${i + 1}`,
    category: i % 2 ? 'Prestasi' : 'Kegiatan',
    published_at: `2026-${String(10 - Math.floor(i / 28)).padStart(2, '0')}-${String(28 - (i % 28)).padStart(2, '0')}`,
  }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('helper fitur Berita & Pengumuman', () => {
  it('sitePostsEnabled: template mampu DAN addons.posts true; field tidak ada = tidak aktif', () => {
    expect(sitePostsEnabled({ template_code: 'madani', addons: { posts: true } })).toBe(true);
    expect(sitePostsEnabled({ template_code: 'madani', addons: { posts: false } })).toBe(false);
    expect(sitePostsEnabled({ template_code: 'madani' })).toBe(false);
    expect(sitePostsEnabled({ template_code: 'madani', addons: null })).toBe(false);
    expect(sitePostsEnabled({ template_code: 'corporate-nexa', addons: { posts: true } })).toBe(false);
    expect(sitePostsEnabled(null)).toBe(false);
    expect(siteOriginOf(' SMKHarapan.sch.id ')).toBe(ORIGIN);
    expect(siteOriginOf('localhost')).toBeNull();
    expect(siteOriginOf('evil.example/path')).toBeNull();
    expect(siteOriginOf(undefined)).toBeNull();
  });

  it('proItems, proDate, uniqueTags, badgeTone', () => {
    const items: ListItem[] = [
      { title: 'Satu', date: '2026-10-12', category: 'Prestasi', excerpt: 'Ringkas', image: '/a.webp', post_path: '/berita/satu' },
      { title: '', category: 'Kosong' },
      { title: 'Dua', date: '12/10/2026', badge: 'Wajib', text: 'Isi' },
    ];
    const section: SectionContent = { items };
    expect(proItems(section, 'news').map((i) => [i.title, i.tag, i.excerpt, i.path])).toEqual([
      ['Satu', 'Prestasi', 'Ringkas', '/berita/satu'],
      ['Dua', '', 'Isi', null],
    ]);
    expect(proItems(section, 'announcements')[1]).toMatchObject({ tag: 'Wajib', excerpt: 'Isi', path: null });
    expect(proDate('2026-10-12')).toMatchObject({ iso: '2026-10-12', day: '12', monthShort: 'Okt', label: '12 Oktober 2026' });
    expect(proDate('5-3-2027')?.iso).toBe('2027-03-05');
    expect(proDate('Setiap Senin')).toBeNull();
    expect(proDate('2026-02-30')).toBeNull();
    expect(uniqueTags(['Prestasi', ' prestasi', '', 'Kegiatan', 'Prestási'])).toEqual(['Prestasi', 'Kegiatan']);
    expect(badgeTone('Penting', MADANI_THEME)).toBe(MADANI_THEME.urgent);
    expect(badgeTone('WAJIB', MADANI_THEME)).toBe(MADANI_THEME.warn);
    expect(badgeTone('Info', MADANI_THEME)).toBe(MADANI_THEME.chip);
    expect(MADANI_THEME.warn).not.toBe(MADANI_THEME.urgent);
  });

  it('waktu baca, URL kanonis, tautan bagikan (encodeURIComponent dari URL kanonis)', () => {
    expect(postReadingMinutes('')).toBe(1);
    expect(postReadingMinutes(Array(450).fill('kata').join(' '))).toBe(2);
    expect(postCanonicalUrl(`${ORIGIN}/`, 'berita', 'juara')).toBe(`${ORIGIN}/berita/juara`);
    expect(postCanonicalUrl(null, 'berita', 'juara')).toBeNull();
    const url = `${ORIGIN}/berita/juara`;
    const links = postShareLinks(url, 'Juara & "emas"');
    expect(links.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(`Juara & "emas" ${url}`)}`);
    expect(links.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    expect(links.x).toBe(`https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Juara & "emas"')}`);
  });
});

describe.each(CODES)('%s: berita biasa vs profesional', (code) => {
  it('fitur tidak aktif: section template dari item CMS, tanpa section profesional & tautan tulisan', () => {
    const titles = demoTitles(code);
    const root = site(code, WITH_POSTS);
    expect(root.querySelectorAll('[data-pro-section]')).toHaveLength(0);
    expect(postHrefs(root)).toEqual([]);
    const news = section(root, 'news')!;
    for (const title of titles.news) expect(news.textContent).toContain(title);
    expect(news.textContent).not.toContain(NEWS[0].title);
    expect(section(root, 'announcements')!.textContent).not.toContain(ANNOUNCEMENTS[0].title);
  });

  it('fitur aktif + tulisan: newsroom & papan pengumuman menggantikan section template; agenda tetap; satu H2 per section', () => {
    const root = site(code, { ...PRO, ...WITH_POSTS });
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    const news = section(root, 'news')!;
    expect(news).toHaveAttribute('data-pro-section', 'news');
    expect(news.id).toBe('berita');
    expect(news.querySelectorAll('h2')).toHaveLength(1);
    // Berita utama besar (foto + chip + tanggal + judul + ringkasan) lalu berita berikutnya
    const lead = news.querySelector<HTMLElement>('[data-pro-lead]')!;
    expect(within(lead).getByRole('link', { name: NEWS[0].title })).toHaveAttribute('href', '/berita/juara-olimpiade-sains');
    expect(lead.textContent).toContain('Prestasi');
    expect(lead.textContent).toContain(NEWS[0].excerpt);
    expect(lead.textContent).toContain('Baca selengkapnya');
    expect(lead.querySelector('time')).toHaveAttribute('dateTime', '2026-10-20');
    const photo = within(lead).getByAltText(NEWS[0].image_alt);
    expect(photo).toHaveAttribute('loading', 'lazy');
    expect(photo).toHaveAttribute('width', '1600');
    expect(photo).toHaveAttribute('height', '1000');
    const next = news.querySelector('ul li')!;
    expect(within(next as HTMLElement).getByRole('link', { name: NEWS[1].title })).toHaveAttribute('href', '/berita/kunjungan-industri-kelas-xi');
    expect(within(news).getByRole('link', { name: /Lihat semua berita/ })).toHaveAttribute('href', '/berita');

    const ann = section(root, 'announcements')!;
    expect(ann).toHaveAttribute('data-pro-section', 'announcements');
    expect(ann.id).toBe('pengumuman');
    expect(ann.querySelectorAll('h2')).toHaveLength(1);
    const row = within(ann).getByRole('link', { name: ANNOUNCEMENTS[0].title }).closest('article')!;
    expect(row.querySelector('time')).toHaveAttribute('dateTime', '2026-10-22');
    expect(row.querySelector('time')!.textContent).toMatch(/^22\s*Okt/);
    expect(row.textContent).toContain('Lihat detail');
    expect(within(ann).getByRole('link', { name: /Lihat semua pengumuman/ })).toHaveAttribute('href', '/pengumuman');

    const agenda = section(root, 'agenda')!;
    expect(agenda).not.toBeNull();
    expect(agenda.hasAttribute('data-pro-section')).toBe(false);
    expect(agenda.querySelectorAll('h3').length).toBeGreaterThan(0);
  });

  it('filter kategori newsroom: tombol aria-pressed, berita utama ikut berganti', () => {
    const root = site(code, { ...PRO, ...WITH_POSTS });
    const news = section(root, 'news')!;
    const group = within(news).getByRole('group', { name: 'Saring berita menurut kategori' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Semua', 'Prestasi', 'Kegiatan']);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(buttons[2]);
    expect(within(group).getByRole('button', { name: 'Kegiatan' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(news.querySelector<HTMLElement>('[data-pro-lead]')!).getByRole('link', { name: NEWS[1].title })).toBeInTheDocument();
    expect(news.textContent).not.toContain(NEWS[0].title);
    expect(within(news).getByRole('status')).toHaveTextContent('1 berita kategori Kegiatan');
  });

  it('fitur aktif tanpa tulisan (demo ?fitur=berita / belum menulis): item CMS dalam tata letak profesional tanpa tautan detail', () => {
    const titles = demoTitles(code);
    for (const posts of [SITE_DATA_DEFAULT.posts, { berita: [], pengumuman: [] }]) {
      const root = site(code, { ...PRO, posts });
      const news = section(root, 'news')!;
      const ann = section(root, 'announcements')!;
      expect(news).toHaveAttribute('data-pro-section', 'news');
      expect(ann).toHaveAttribute('data-pro-section', 'announcements');
      expect(news.textContent).toContain(titles.news[0]);
      expect(ann.textContent).toContain(titles.announcements[0]);
      expect(postHrefs(root)).toEqual([]);
      expect(news.textContent).not.toContain('Baca selengkapnya');
      expect(ann.textContent).not.toContain('Lihat detail');
      expect(within(news).queryByRole('link', { name: /Lihat semua berita/ })).toBeNull();
      expect(within(ann).queryByRole('link', { name: /Lihat semua pengumuman/ })).toBeNull();
      for (const img of Array.from(news.querySelectorAll('img'))) {
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
        expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
      }
      cleanup();
    }
  });

  it('fitur aktif, daftar masih dimuat: tidak ada judul CMS/demo sekilas', () => {
    const titles = demoTitles(code);
    const root = site(code, { ...PRO, posts: { berita: undefined, pengumuman: undefined } });
    for (const title of [...titles.news, ...titles.announcements]) expect(root.textContent).not.toContain(title);
    expect(section(root, 'agenda')).not.toBeNull();
  });

  it('toggle section tetap berlaku: berita/pengumuman disembunyikan di CMS → section profesional tidak muncul', () => {
    let root = site(code, { ...PRO, ...WITH_POSTS }, { news: { enabled: false } });
    expect(section(root, 'news')).toBeNull();
    expect(section(root, 'announcements')).toHaveAttribute('data-pro-section', 'announcements');
    cleanup();
    root = site(code, { ...PRO, ...WITH_POSTS }, { announcements: { enabled: false } });
    expect(section(root, 'announcements')).toBeNull();
    expect(section(root, 'agenda')).not.toBeNull();
    expect(section(root, 'news')).toHaveAttribute('data-pro-section', 'news');
  });

  it('label pengumuman berwarna: Penting merah lembut, Wajib kuning tanah, lainnya warna tema', () => {
    const badges = ['Penting', 'Wajib', 'Info'];
    const pengumuman = badges.map((badge, i) => ({ ...ANNOUNCEMENTS[0], id: 30 + i, slug: `p-${i}`, title: `Pengumuman ${badge}`, badge }));
    const root = site(code, { ...PRO, posts: { berita: NEWS, pengumuman } });
    const tones = Array.from(section(root, 'announcements')!.querySelectorAll('[data-pro-badge]')).map((el) => el.className);
    expect(tones).toHaveLength(3);
    expect(tones[0]).toMatch(/#(9B1C1C|B42318)/);
    expect(tones[1]).toContain('#93370D');
    expect(tones[2]).toMatch(/--(md|ck|bs)-tint/);
  });

  it('rute tulisan saat fitur tidak aktif → "Halaman tidak ditemukan" (sama dengan site.php), bukan daftar/tulisan', () => {
    for (const route of [
      { kind: 'list', postKind: 'berita' },
      { kind: 'post', postKind: 'berita', slug: POST.slug },
    ] as const) {
      const root = site(code, { ...WITH_POSTS, route, post: POST });
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')).toHaveTextContent('Halaman tidak ditemukan');
      expect(root.querySelector('[data-site-page="notfound"]')).not.toBeNull();
      expect(root.textContent).not.toContain(POST.title);
      cleanup();
    }
  });
});

describe('halaman daftar (fitur aktif): cari judul, filter, Muat lebih banyak', () => {
  const list = (posts: SitePostSummary[], kind: 'berita' | 'pengumuman' = 'berita') =>
    site('madani', { ...PRO, route: { kind: 'list', postKind: kind }, posts: { berita: kind === 'berita' ? posts : NEWS, pengumuman: kind === 'pengumuman' ? posts : ANNOUNCEMENTS }, total: posts.length });
  const cards = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-site-page="list"] ul > li h2')).map((h) => h.textContent);

  it('12 per langkah; "Muat lebih banyak" menambah 12 dan memindah fokus ke kartu pertama yang baru', () => {
    const posts = manyNews(30);
    const root = list(posts);
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(cards(root)).toHaveLength(12);
    const page = root.querySelector<HTMLElement>('[data-site-page="list"]')!;
    expect(within(page).getByRole('status')).toHaveTextContent('Menampilkan 12 dari 30 berita');
    fireEvent.click(within(page).getByRole('button', { name: 'Muat lebih banyak' }));
    expect(cards(root)).toHaveLength(24);
    expect(document.activeElement).toBe(within(page).getByRole('link', { name: posts[12].title }));
    fireEvent.click(within(page).getByRole('button', { name: 'Muat lebih banyak' }));
    expect(cards(root)).toHaveLength(30);
    expect(document.activeElement).toBe(within(page).getByRole('link', { name: posts[24].title }));
    expect(within(page).queryByRole('button', { name: 'Muat lebih banyak' })).toBeNull();
    expect(root.textContent).toContain('30 berita');
  });

  it('cari judul (tanpa membedakan huruf besar & diakritik) + filter kategori; tidak cocok → hapus pencarian', () => {
    const posts = manyNews(30);
    const root = list(posts);
    const page = root.querySelector<HTMLElement>('[data-site-page="list"]')!;
    const input = within(page).getByRole('searchbox', { name: 'Cari judul berita' });
    expect(within(page).getByRole('search')).toContainElement(input);
    fireEvent.change(input, { target: { value: '  LÓMBA ' } });
    expect(cards(root)).toEqual(posts.filter((p) => p.title.startsWith('Lomba')).map((p) => p.title));
    expect(within(page).getByRole('status')).toHaveTextContent('Menampilkan 10 dari 10 berita yang cocok');
    const group = within(page).getByRole('group', { name: 'Saring berita menurut kategori' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Semua', 'Kegiatan', 'Prestasi']);
    fireEvent.click(within(group).getByRole('button', { name: 'Prestasi' }));
    expect(within(group).getByRole('button', { name: 'Prestasi' })).toHaveAttribute('aria-pressed', 'true');
    expect(cards(root)).toEqual(posts.filter((p) => p.title.startsWith('Lomba') && p.category === 'Prestasi').map((p) => p.title));
    fireEvent.change(input, { target: { value: 'tidak ada judul seperti ini' } });
    expect(cards(root)).toEqual([]);
    expect(page.textContent).toContain('Tidak ada berita yang cocok');
    fireEvent.click(within(page).getByRole('button', { name: 'Hapus pencarian' }));
    expect(input).toHaveValue('');
    expect(within(group).getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(cards(root)).toHaveLength(12);
  });

  it('pengumuman disaring menurut label; berganti jenis → pencarian mulai dari awal', () => {
    const pengumuman = ['Penting', 'Wajib', 'Penting'].map((badge, i) => ({ ...ANNOUNCEMENTS[0], id: 40 + i, slug: `pg-${i}`, title: `Pengumuman ${i + 1}`, badge }));
    const data = { ...SITE_DATA_DEFAULT, ...PRO, posts: { berita: NEWS, pengumuman }, route: { kind: 'list', postKind: 'pengumuman' } as const };
    const view = render(<SiteRenderer templateCode="madani" content={null} data={data} />);
    const page = () => view.container.querySelector<HTMLElement>('[data-site-page="list"]')!;
    const group = within(page()).getByRole('group', { name: 'Saring pengumuman menurut label' });
    fireEvent.click(within(group).getByRole('button', { name: 'Wajib' }));
    expect(Array.from(page().querySelectorAll('ul > li h2')).map((h) => h.textContent)).toEqual(['Pengumuman 2']);
    fireEvent.change(within(page()).getByRole('searchbox'), { target: { value: 'pengumuman' } });
    view.rerender(<SiteRenderer templateCode="madani" content={null} data={{ ...data, route: { kind: 'list', postKind: 'berita' } }} />);
    expect(within(page()).getByRole('searchbox', { name: 'Cari judul berita' })).toHaveValue('');
    expect(page().querySelectorAll('ul > li h2')).toHaveLength(NEWS.length);
  });

  it('satu tulisan saja: tanpa kolom cari & filter', () => {
    const root = list([NEWS[0]]);
    expect(within(root).queryByRole('searchbox')).toBeNull();
    expect(within(root).queryByRole('group')).toBeNull();
    expect(cards(root)).toEqual([NEWS[0].title]);
  });
});

describe('halaman tulisan (fitur aktif): waktu baca, bagikan, … lainnya', () => {
  const article = (data: Partial<SiteData> = {}, post: SitePostPublic = POST) =>
    site('cakrawala', {
      ...PRO,
      route: { kind: 'post', postKind: post.kind, slug: post.slug },
      post,
      posts: { berita: manyNews(5).concat(NEWS), pengumuman: ANNOUNCEMENTS },
      siteOrigin: ORIGIN,
      ...data,
    });

  it('waktu baca di baris meta; tombol bagikan dari URL kanonis di domain pembeli (tab baru)', () => {
    const long = { ...POST, body: Array(620).fill('kata').join(' ') };
    const root = article({ basePath: '/situs/7' }, long);
    const main = root.querySelector('main')!;
    expect(main.querySelector('article header [data-reading-time]')).toHaveTextContent('3 menit baca');
    const canonical = `${ORIGIN}/berita/juara-olimpiade-sains`;
    const share = main.querySelector<HTMLElement>('[data-post-share]')!;
    const links = within(share).getAllByRole('link');
    expect(links.map((a) => a.textContent?.replace(' (bagikan di tab baru)', ''))).toEqual(['WhatsApp', 'Facebook', 'X']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      `https://wa.me/?text=${encodeURIComponent(`${POST.title} ${canonical}`)}`,
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`,
      `https://x.com/intent/post?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(POST.title)}`,
    ]);
    // Alamat pratinjau (/situs/7) tidak pernah dibagikan
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('href')).not.toContain('situs');
    }
    expect(root.querySelectorAll('h1')).toHaveLength(1);
  });

  it('salin tautan → clipboard berisi URL kanonis + pemberitahuan; gagal → URL untuk disalin manual', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const root = article();
    const share = root.querySelector<HTMLElement>('[data-post-share]')!;
    await act(async () => {
      fireEvent.click(within(share).getByRole('button', { name: 'Salin tautan' }));
    });
    expect(writeText).toHaveBeenCalledWith(`${ORIGIN}/berita/juara-olimpiade-sains`);
    await waitFor(() => expect(within(share).getByRole('status')).toHaveTextContent('Tautan disalin.'));
    cleanup();

    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('ditolak')) } });
    const again = article().querySelector<HTMLElement>('[data-post-share]')!;
    await act(async () => {
      fireEvent.click(within(again).getByRole('button', { name: 'Salin tautan' }));
    });
    await waitFor(() => expect(within(again).getByRole('status')).toHaveTextContent(`Salin manual: ${ORIGIN}/berita/juara-olimpiade-sains`));
  });

  it('tanpa domain (siteOrigin kosong) → tanpa tombol bagikan', () => {
    const root = article({ siteOrigin: null });
    expect(root.querySelector('[data-post-share]')).toBeNull();
    expect(root.querySelector('[data-reading-time]')).toHaveTextContent('1 menit baca');
  });

  it('"Berita lainnya" = 3 terbaru selain tulisan ini; pengumuman → "Pengumuman lainnya"', () => {
    const root = article();
    const related = within(root.querySelector('main')!).getByRole('heading', { level: 2, name: 'Berita lainnya' }).closest('section')!;
    const others = manyNews(5).concat(NEWS).filter((p) => p.slug !== POST.slug).slice(0, 3);
    expect(hrefs(related)).toEqual(others.map((p) => `/berita/${p.slug}`));
    cleanup();

    const pengumuman = ['a', 'b', 'c', 'd'].map((s, i) => ({ ...ANNOUNCEMENTS[0], id: 50 + i, slug: `pengumuman-${s}`, title: `Pengumuman ${s}` }));
    const post: SitePostPublic = { ...POST, ...pengumuman[1], body: 'Isi', seo_title: '', seo_description: '', noindex: false };
    const ann = article({ posts: { berita: NEWS, pengumuman } }, post);
    const list = within(ann.querySelector('main')!).getByRole('heading', { level: 2, name: 'Pengumuman lainnya' }).closest('section')!;
    expect(hrefs(list)).toEqual(['/pengumuman/pengumuman-a', '/pengumuman/pengumuman-c', '/pengumuman/pengumuman-d']);
  });
});

describe('/demo/{slug}?fitur=berita', () => {
  const MADANI = {
    id: 9,
    slug: 'madani',
    name: 'Madani',
    category: 'Sekolah',
    short_description: '',
    description: '',
    features: [],
    price: 2500000,
    preview_image: null,
    gallery: [],
    template_code: 'madani',
    demo_url: null,
    status: 'published',
    sort_order: 1,
  };
  const CORPORATE = { ...MADANI, id: 1, slug: 'corporate-nexa', name: 'Corporate Nexa', template_code: 'corporate-nexa' };
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  beforeEach(() => {
    clearApiCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), 'http://localhost');
        const found = [MADANI, CORPORATE].find((t) => t.slug === url.searchParams.get('slug'));
        if (url.searchParams.get('action') === 'get_template' && found) return json(200, { template: found });
        return json(404, { error: 'Template tidak ditemukan.' });
      }),
    );
  });

  const demo = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/demo/:slug" element={<TemplateDemo />} />
        </Routes>
      </MemoryRouter>,
    ).container;

  it('template mampu + ?fitur=berita → section profesional dari item demo tanpa tautan detail', async () => {
    const root = demo('/demo/madani?fitur=berita');
    await waitFor(() => expect(root.querySelector('[data-pro-section="news"]')).not.toBeNull(), { timeout: 10_000 });
    expect(root.querySelector('[data-pro-section="announcements"]')).not.toBeNull();
    expect(postHrefs(root)).toEqual([]);
    expect(screen.getByRole('link', { name: 'Pesan Template Madani' })).toHaveAttribute('href', '/pesan/madani');
  });

  it('tanpa query (atau nilai lain) = berita biasa; template lain mengabaikan query', async () => {
    for (const path of ['/demo/madani', '/demo/madani?fitur=lain']) {
      const root = demo(path);
      await waitFor(() => expect(root.querySelector('[data-tpl-section="news"]')).not.toBeNull(), { timeout: 10_000 });
      expect(root.querySelectorAll('[data-pro-section]')).toHaveLength(0);
      cleanup();
    }
    const root = demo('/demo/corporate-nexa?fitur=berita');
    await screen.findByRole('link', { name: 'Pesan Template Corporate Nexa' }, { timeout: 10_000 });
    await waitFor(() => expect(root.querySelector('[data-tpl-section]')).not.toBeNull(), { timeout: 10_000 });
    expect(root.querySelectorAll('[data-pro-section]')).toHaveLength(0);
  });
});
