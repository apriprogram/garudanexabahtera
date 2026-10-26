// @vitest-environment jsdom
// Jalankan: npx vitest run src/templates/__tests__/site-posts.test.tsx
// Berita & pengumuman template sekolah (docs/platform/SITE-POSTS-SEO-SPEC.md §7): helper bersama (shared/posts/model,
// siteHref), beranda Madani & Cakrawala memakai tulisan dari SiteDataContext atau kembali ke konten CMS PERSIS seperti
// sebelumnya, halaman daftar & tulisan (satu H1, remah roti, tautan <a href> yang bisa dirayapi, foto lazy + ukuran),
// tidak ditemukan / memuat / gagal, tautan section di halaman selain beranda, navigasi tanpa muat ulang, anchor #berita,
// tautan "/path" (halaman situs vs file nyata), penanda section aktif setelah pindah halaman, bingkai foto artikel.
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteRenderer } from '../SiteRenderer';
import { SITE_DATA_DEFAULT, siteHref, type SiteData } from '../shared/siteData';
import { POST_PATH_KEY, postDate, postLinkTarget, postParagraphs, relatedPosts, withPostItems } from '../shared/posts/model';
import { SECTION_ANCHOR, resolveAction, sectionFromAnchor } from '../shared/utils';
import { siteRoutePath } from '../siteRoutes';
import type { SiteContent } from '../types';
import { ANNOUNCEMENTS, NEWS, POST } from './fixtures/sitePosts';

vi.setConfig({ testTimeout: 60_000 });

type Code = 'madani' | 'cakrawala';

const site = (code: Code, data: Partial<SiteData> = {}, content: unknown = null) =>
  render(<SiteRenderer templateCode={code} content={content} data={{ ...SITE_DATA_DEFAULT, ...data }} />).container;
const section = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`[data-tpl-section="${key}"]`)!;
const hrefs = (root: HTMLElement) => Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
const WITH_POSTS: Partial<SiteData> = { posts: { berita: NEWS, pengumuman: ANNOUNCEMENTS } };

let scrolled: (string | null)[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.getAttribute('data-tpl-section') ?? this.tagName.toLowerCase());
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('shared/posts: helper', () => {
  it('tanggal Indonesia dari published_at, paragraf isi, tautan tambahan, tulisan terkait, siteHref', () => {
    expect(postDate('2026-10-12')).toMatchObject({ iso: '2026-10-12', label: '12 Oktober 2026', long: 'Senin, 12 Oktober 2026', monthShort: 'Okt' });
    expect(postDate('2026-02-30')).toBeNull();
    expect(postDate('12/10/2026')).toBeNull();
    expect(postDate(null)).toBeNull();

    expect(postParagraphs('Satu.\r\n\r\nDua\nbaris dua.\n \n\nTiga')).toEqual(['Satu.', 'Dua\nbaris dua.', 'Tiga']);
    expect(postParagraphs('')).toEqual([]);

    expect(postLinkTarget('#ppdb')).toEqual({ kind: 'section', anchor: 'ppdb' });
    expect(postLinkTarget('/pengumuman/jadwal')).toEqual({ kind: 'site', path: '/pengumuman/jadwal' });
    expect(postLinkTarget('https://www.drive.google.com/x')).toEqual({ kind: 'external', href: 'https://www.drive.google.com/x', label: 'drive.google.com' });
    expect(postLinkTarget('mailto:tu@sekolah.sch.id')).toMatchObject({ kind: 'external', label: 'tu@sekolah.sch.id' });
    expect(postLinkTarget('javascript:alert(1)')).toBeNull();
    expect(postLinkTarget('//evil.example')).toBeNull();
    // "/path": halaman situs (garis miring di akhir dirapikan) → navigasi di dalam situs; file nyata / path lain → tautan biasa
    expect(postLinkTarget('/berita/')).toEqual({ kind: 'site', path: '/berita' });
    expect(postLinkTarget('/#kontak')).toEqual({ kind: 'site', path: '/#kontak' });
    expect(postLinkTarget('/assets/sites/7/posts/brosur%20ppdb.pdf')).toEqual({ kind: 'external', href: '/assets/sites/7/posts/brosur%20ppdb.pdf', label: 'brosur ppdb.pdf' });
    expect(postLinkTarget('/berita?hal=2')).toMatchObject({ kind: 'external', href: '/berita?hal=2' });

    expect(relatedPosts(NEWS, NEWS[0].slug).map((p) => p.slug)).toEqual([NEWS[1].slug]);
    expect(relatedPosts(null, 'x')).toEqual([]);

    expect(siteHref('', '/')).toBe('/');
    expect(siteHref('', '/berita/x')).toBe('/berita/x');
    expect(siteHref('/situs/7', '/')).toBe('/situs/7');
    expect(siteHref('/situs/7/', '/#kontak')).toBe('/situs/7/#kontak');
  });

  it('siteRoutePath & resolveAction: URL CMS ke halaman situs → `site`/section (basePath), path lain → tautan biasa', () => {
    expect(['/', '/berita', '/pengumuman/', '/berita/juara#isi', '/#kontak', '/#'].map(siteRoutePath)).toEqual([
      '/',
      '/berita',
      '/pengumuman',
      '/berita/juara#isi',
      '/#kontak',
      '/',
    ]);
    expect(['/assets/x.pdf', '/berita?x=1', '//evil.example', '/agenda', 'berita', '/#a b'].map(siteRoutePath)).toEqual([null, null, null, null, null, null]);
    expect(resolveAction('/berita', null)).toEqual({ kind: 'site', path: '/berita' });
    expect(resolveAction('/pengumuman/jadwal-ujian/', null)).toEqual({ kind: 'site', path: '/pengumuman/jadwal-ujian' });
    expect(resolveAction('/', null)).toEqual({ kind: 'site', path: '/' });
    expect(resolveAction('/#kontak', null)).toEqual({ kind: 'section', target: 'contact' });
    expect(resolveAction('/assets/sites/7/brosur.pdf', null)).toEqual({ kind: 'external', href: '/assets/sites/7/brosur.pdf' });
  });

  it('withPostItems: tanpa tulisan → objek konten yang sama; dengan tulisan → items diganti, judul section tetap', () => {
    const content = { news: { title: 'Kabar sekolah', items: [{ title: 'CMS' }] }, announcements: { items: [{ title: 'CMS' }] } } as unknown as SiteContent;
    expect(withPostItems(content, { berita: null, pengumuman: [] })).toBe(content);
    const merged = withPostItems(content, { berita: NEWS, pengumuman: null });
    expect(merged.news.title).toBe('Kabar sekolah');
    const items = merged.news.items as Record<string, string>[];
    expect(items.map((i) => i[POST_PATH_KEY])).toEqual(['/berita/juara-olimpiade-sains', '/berita/kunjungan-industri-kelas-xi']);
    expect(items[0]).toMatchObject({ title: NEWS[0].title, date: '2026-10-20', category: 'Prestasi', image: NEWS[0].image, url: '' });
    expect(merged.announcements).toBe(content.announcements);
    expect(withPostItems(null as unknown as SiteContent, { berita: null, pengumuman: null })).toBeNull();
    expect(withPostItems(null as unknown as SiteContent, { berita: NEWS, pengumuman: null }).news.items).toHaveLength(2);
    // Masih dimuat (undefined) → section tanpa item, bukan item CMS/demo yang lalu berganti
    const loading = withPostItems(content, { berita: undefined, pengumuman: [] });
    expect(loading.news).toEqual({ title: 'Kabar sekolah', items: [] });
    expect(loading.announcements).toBe(content.announcements);
  });

  it('anchor Indonesia untuk section sekolah', () => {
    expect([SECTION_ANCHOR.news, SECTION_ANCHOR.announcements, SECTION_ANCHOR.agenda]).toEqual(['berita', 'pengumuman', 'agenda']);
    expect(['#berita', 'pengumuman', 'agenda'].map(sectionFromAnchor)).toEqual(['news', 'announcements', 'agenda']);
  });
});

/** Ringkasan tampilan untuk membandingkan "persis seperti sebelumnya" (id useId berbeda antar-render). */
const snapshot = (root: HTMLElement) => ({
  text: root.textContent,
  hrefs: hrefs(root),
  sections: Array.from(root.querySelectorAll('[data-tpl-section]')).map((s) => `${s.getAttribute('data-tpl-section')}#${s.id}`),
  images: Array.from(root.querySelectorAll('img')).map((img) => img.getAttribute('src')),
});

describe.each(['madani', 'cakrawala'] as const)('%s: beranda', (code) => {
  it('tanpa tulisan (null atau []) → beranda sama persis dengan demo/konten CMS', () => {
    const demo = snapshot(render(<SiteRenderer templateCode={code} content={null} />).container);
    cleanup();
    const empty = snapshot(site(code, { posts: { berita: [], pengumuman: null } }));
    expect(empty).toEqual(demo);
    // Section id berbahasa Indonesia (tautan "/#berita" dari halaman tulisan)
    expect(demo.sections).toEqual(expect.arrayContaining(['news#berita', 'announcements#pengumuman', 'agenda#agenda']));
    expect(demo.hrefs.some((h) => h === '/berita' || h === '/pengumuman')).toBe(false);
  });

  it('dengan tulisan → kartu menaut ke /berita/{slug} & /pengumuman/{slug}, tombol "Lihat semua", satu H1', () => {
    const root = site(code, { ...WITH_POSTS, basePath: '/situs/7' });
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    const news = section(root, 'news');
    expect(news.querySelectorAll('article')).toHaveLength(2);
    const title = within(news).getByRole('link', { name: NEWS[0].title });
    expect(title).toHaveAttribute('href', '/situs/7/berita/juara-olimpiade-sains');
    expect(title.closest('h3')).not.toBeNull();
    expect(within(news).getByRole('link', { name: NEWS[1].title })).toHaveAttribute('href', '/situs/7/berita/kunjungan-industri-kelas-xi');
    // Isi tidak dibuka di tempat, tidak ada tautan keluar
    expect(within(news).queryByRole('button', { name: /Baca selengkapnya/ })).toBeNull();
    expect(news.textContent).toContain('Baca selengkapnya');
    expect(news.textContent).not.toContain('Buka tautan');
    expect(news.querySelector('time')).toHaveAttribute('dateTime', '2026-10-20');
    expect(within(news).getByRole('link', { name: /Lihat semua berita/ })).toHaveAttribute('href', '/situs/7/berita');
    const img = within(news).getByAltText('Siswa memegang piala olimpiade');
    expect(img).toHaveAttribute('src', NEWS[0].image);
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);

    const ann = section(root, 'announcements');
    expect(ann.querySelectorAll('li')).toHaveLength(1);
    expect(within(ann).getByRole('link', { name: ANNOUNCEMENTS[0].title })).toHaveAttribute('href', '/situs/7/pengumuman/jadwal-ujian-akhir-semester');
    expect(within(ann).getByRole('link', { name: /Lihat semua pengumuman/ })).toHaveAttribute('href', '/situs/7/pengumuman');
    expect(ann.textContent).toContain('Penting');
    expect(ann.textContent).not.toContain('Lihat lampiran');
    expect(ann.textContent).not.toContain('Lihat detail');
    // Menu "Berita" tetap ke section di beranda
    expect(within(root.querySelector('header')!).getAllByRole('link', { name: 'Berita' })[0]).toHaveAttribute('href', '#berita');
  });

  it('hanya pengumuman dari tulisan: berita tetap dari konten CMS (fallback per jenis)', () => {
    const root = site(code, { posts: { berita: null, pengumuman: ANNOUNCEMENTS } });
    const news = section(root, 'news');
    expect(within(news).getAllByRole('button', { name: /Baca selengkapnya/ }).length).toBeGreaterThan(0);
    expect(within(news).queryByRole('link', { name: /Lihat semua berita/ })).toBeNull();
    expect(within(section(root, 'announcements')).getByRole('link', { name: /Lihat semua pengumuman/ })).toHaveAttribute('href', '/pengumuman');
  });

  it('section berita disembunyikan di CMS → tulisan tidak memunculkannya', () => {
    const root = site(code, WITH_POSTS, { news: { enabled: false } });
    expect(section(root, 'news')).toBeNull();
  });
});

describe.each(['madani', 'cakrawala'] as const)('%s: halaman daftar & tulisan', (code) => {
  it('/berita: header biasa, remah roti, satu H1, kartu <a href>, tautan menu ke beranda "/#anchor"', () => {
    const root = site(code, { ...WITH_POSTS, route: { kind: 'list', postKind: 'berita' }, total: 2 });
    expect(root.querySelector('[data-site-page="list"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-tpl-section]')).toHaveLength(0);
    const h1s = root.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe('Berita');
    const header = root.querySelector('header')!;
    expect(header.className).not.toContain('h-0');
    const crumbs = within(root).getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Beranda' })).toHaveAttribute('href', '/');
    expect(crumbs.querySelector('[aria-current="page"]')).toHaveTextContent('Berita');
    const cards = within(root.querySelector('main')!).getAllByRole('heading', { level: 2 });
    expect(cards.map((h) => h.textContent)).toEqual(NEWS.map((p) => p.title));
    expect(within(cards[0]).getByRole('link')).toHaveAttribute('href', '/berita/juara-olimpiade-sains');
    const img = root.querySelector('main img')!;
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '1200');
    expect(img).toHaveAttribute('height', '900');
    expect(root.textContent).toContain('2 berita');
    // Tautan section di header & footer menuju beranda
    const nav = within(header).getAllByRole('navigation', { name: 'Menu utama' })[0];
    expect(hrefs(nav).every((h) => h?.startsWith('/#'))).toBe(true);
    expect(within(nav).getByRole('link', { name: 'Profil' })).toHaveAttribute('href', '/#tentang');
    expect(within(header).getByRole('link', { name: /ke awal halaman/ })).toHaveAttribute('href', '/');
  });

  it('/pengumuman: baris pengumuman dengan ubin tanggal & label mendesak', () => {
    const root = site(code, { ...WITH_POSTS, route: { kind: 'list', postKind: 'pengumuman' } });
    expect(root.querySelector('h1')).toHaveTextContent('Pengumuman');
    const card = within(root.querySelector('main')!).getByRole('link', { name: ANNOUNCEMENTS[0].title });
    expect(card).toHaveAttribute('href', '/pengumuman/jadwal-ujian-akhir-semester');
    const article = card.closest('article')!;
    expect(article.querySelector('time')).toHaveAttribute('dateTime', '2026-10-22');
    expect(within(article).getByText('Penting').closest('span[class*="rounded-full"]')!.className).toMatch(/#(9B1C1C|B42318)/);
  });

  it('daftar: memuat → kerangka; kosong → ajakan ke beranda; gagal → Coba lagi', () => {
    let root = site(code, { route: { kind: 'list', postKind: 'berita' } });
    expect(within(root).getByRole('status')).toHaveTextContent('Memuat berita');
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    cleanup();
    root = site(code, { route: { kind: 'list', postKind: 'berita' }, posts: { berita: [], pengumuman: null } });
    expect(root.textContent).toContain('Belum ada berita yang diterbitkan');
    expect(within(root.querySelector('main')!).getByRole('link', { name: /Ke beranda/ })).toHaveAttribute('href', '/');
    cleanup();
    const retry = vi.fn();
    root = site(code, { route: { kind: 'list', postKind: 'berita' }, error: { message: 'Server sibuk.', retry } });
    const alert = within(root).getByRole('alert');
    expect(alert).toHaveTextContent('Server sibuk.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Coba lagi' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('/berita/{slug}: satu H1, tanggal, foto utama segera, isi teks biasa, tautan tambahan, kembali, tulisan lainnya', () => {
    const root = site(code, { route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post: POST, posts: { berita: NEWS, pengumuman: null } });
    const main = root.querySelector('main')!;
    const h1s = root.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(POST.title);
    const crumbs = within(main).getByRole('navigation', { name: 'Breadcrumb' });
    expect(hrefs(crumbs)).toEqual(['/', '/berita']);
    expect(crumbs.querySelector('[aria-current="page"]')).toHaveTextContent(POST.title);
    const time = main.querySelector('article header time')!;
    expect(time).toHaveAttribute('dateTime', '2026-10-20');
    expect(time).toHaveTextContent('Selasa, 20 Oktober 2026');
    const hero = within(main).getByAltText('Siswa memegang piala olimpiade');
    expect(hero).toHaveAttribute('loading', 'eager');
    expect(hero).toHaveAttribute('fetchpriority', 'high');
    expect(hero).toHaveAttribute('width');
    expect(hero).toHaveAttribute('height');
    // Ruang foto disediakan sebelum foto dimuat: bingkai berasio tetap, foto mengisi bingkai (tanpa geser isi di bawahnya)
    expect(hero.closest('figure')!.className).toMatch(/(^| )aspect-\[4\/3\]( |$)/);
    expect(hero.closest('figure')!.className).toContain('w-full');
    expect(hero.className).toMatch(/absolute.*h-full.*w-full/);
    const paragraphs = Array.from(main.querySelectorAll('article > div p')).map((p) => p.textContent);
    expect(paragraphs).toEqual(['Paragraf pertama berita.', 'Paragraf kedua\nbaris kedua.', '<script>alert(1)</script> bukan HTML']);
    expect(root.querySelector('script')).toBeNull();
    const extra = within(main).getByRole('link', { name: /drive\.google\.com/ });
    expect(extra).toHaveAttribute('href', POST.link_url);
    expect(extra).toHaveAttribute('target', '_blank');
    expect(within(main).getByRole('link', { name: /Semua berita/ })).toHaveAttribute('href', '/berita');
    const related = within(main).getByRole('heading', { level: 2, name: 'Berita lainnya' }).closest('section')!;
    expect(hrefs(related)).toEqual(['/berita/kunjungan-industri-kelas-xi']);
  });

  it('tulisan: memuat (tanpa H1), tidak ditemukan, gagal; path tak dikenal', () => {
    const route = { kind: 'post', postKind: 'berita', slug: 'tidak-ada' } as const;
    let root = site(code, { route });
    expect(within(root).getByRole('status')).toHaveTextContent('Memuat tulisan');
    expect(root.querySelector('h1')).toBeNull();
    cleanup();
    // Tulisan lain (sisa halaman sebelumnya) = belum dimuat, bukan ditampilkan
    root = site(code, { route, post: POST });
    expect(root.textContent).not.toContain(POST.title);
    cleanup();
    root = site(code, { route, post: null });
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    expect(root.querySelector('h1')).toHaveTextContent('Berita tidak ditemukan');
    expect(within(root.querySelector('main')!).getByRole('link', { name: 'Lihat semua berita' })).toHaveAttribute('href', '/berita');
    cleanup();
    root = site(code, { route, error: { message: 'Tidak bisa terhubung.', retry: () => undefined } });
    expect(within(root).getByRole('alert')).toHaveTextContent('Tidak bisa terhubung.');
    cleanup();
    root = site(code, { route: { kind: 'notfound' } });
    expect(root.querySelector('h1')).toHaveTextContent('Halaman tidak ditemukan');
    expect(within(root.querySelector('main')!).getByRole('link', { name: /Ke beranda/ })).toHaveAttribute('href', '/');
  });
});

describe('navigasi di dalam situs', () => {
  it('klik kartu / menu memakai navigate (tanpa muat ulang); Ctrl+klik dibiarkan ke browser', () => {
    const navigate = vi.fn();
    const root = site('madani', { ...WITH_POSTS, route: { kind: 'list', postKind: 'berita' }, navigate, basePath: '/situs/7' });
    // Dicatat di document (setelah handler React): sudah dicegah atau belum; lalu dicegah agar jsdom tidak berpindah halaman
    const prevented: boolean[] = [];
    const record = (e: Event) => {
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    };
    document.addEventListener('click', record);
    const card = within(root.querySelector('main')!).getByRole('link', { name: NEWS[0].title });
    expect(card).toHaveAttribute('href', '/situs/7/berita/juara-olimpiade-sains');
    fireEvent.click(card);
    expect(navigate).toHaveBeenLastCalledWith('/berita/juara-olimpiade-sains');
    fireEvent.click(card, { ctrlKey: true });
    expect(navigate).toHaveBeenCalledTimes(1);
    const header = root.querySelector('header')!;
    fireEvent.click(within(header).getAllByRole('link', { name: 'Profil' })[0]);
    expect(navigate).toHaveBeenLastCalledWith('/#tentang');
    document.removeEventListener('click', record);
    expect(prevented).toEqual([true, false, true]);
    expect(scrolled).toEqual([]);
  });

  it('tautan tambahan ke file nyata di situs yang sama → <a href> biasa tanpa basePath, tidak lewat navigate', () => {
    const navigate = vi.fn();
    const post = { ...POST, link_url: '/assets/sites/7/posts/brosur.pdf' };
    const root = site('cakrawala', { route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post, navigate, basePath: '/situs/7' });
    const link = within(root.querySelector('main')!).getByRole('link', { name: /brosur\.pdf/ });
    expect(link).toHaveAttribute('href', '/assets/sites/7/posts/brosur.pdf');
    expect(link).not.toHaveAttribute('target');
    const prevented: boolean[] = [];
    const record = (e: Event) => {
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    };
    document.addEventListener('click', record);
    fireEvent.click(link);
    document.removeEventListener('click', record);
    expect(prevented).toEqual([false]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['madani', 'cakrawala'] as const)('%s: penanda section aktif mengamati ulang section setelah beranda → tulisan → beranda', (code) => {
    // Pengamat section aktif header (rootMargin useActiveSection), bukan pengamat animasi/lengket lain
    const live: Element[][] = [];
    class RecordingObserver {
      private targets: Element[] = [];
      constructor(_callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        if (options?.rootMargin === '-40% 0px -55% 0px') live.push(this.targets);
      }
      observe(el: Element) {
        this.targets.push(el);
      }
      unobserve(el: Element) {
        const at = this.targets.indexOf(el);
        if (at >= 0) this.targets.splice(at, 1);
      }
      disconnect() {
        this.targets.length = 0;
      }
      takeRecords() {
        return [];
      }
    }
    // window.IntersectionObserver di __tests__/setup.ts: writable, tidak configurable (vi.stubGlobal tidak bisa)
    const original = window.IntersectionObserver;
    window.IntersectionObserver = RecordingObserver as unknown as typeof IntersectionObserver;
    try {
      const home = { ...SITE_DATA_DEFAULT, ...WITH_POSTS };
      const view = render(<SiteRenderer templateCode={code} content={null} data={home} />);
      view.rerender(<SiteRenderer templateCode={code} content={null} data={{ ...home, route: { kind: 'post', postKind: 'berita', slug: POST.slug }, post: POST }} />);
      view.rerender(<SiteRenderer templateCode={code} content={null} data={{ ...home }} />);
      const about = view.container.querySelector('[data-tpl-section="about"]');
      expect(about).not.toBeNull();
      // Section beranda yang dipasang lagi (elemen baru) diamati; tidak ada pengamat yang masih memegang section lama
      expect(live.some((targets) => targets.includes(about!))).toBe(true);
      expect(live.flat().every((el) => el.isConnected)).toBe(true);
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it('beranda dibuka dengan "#berita" → gulir ke section Berita', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/#berita');
    site('cakrawala', WITH_POSTS);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(scrolled).toContain('news');
  });
});
