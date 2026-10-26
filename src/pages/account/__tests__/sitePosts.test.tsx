// @vitest-environment jsdom
// Berita & pengumuman di panel akun (docs/platform/SITE-POSTS-SEO-SPEC.md §8): daftar, tulis/edit, simpan, hapus,
// error per kolom dari server, foto SVG ditolak, penjaga perubahan belum disimpan, dan aturan murni postModel.
// Perbaikan tinjauan: simpan ditahan selama foto diproses, isian yang berubah selama simpan tidak ditimpa, fokus setelah
// hapus, tanpa tautan Lihat di situs nonaktif, dan ?jenis=pengumuman ikut di alamat editor.
// Jalankan: npx vitest run src/pages/account/__tests__/sitePosts.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SitePostAdmin, SitePostInput } from '../../../types/sitePosts';
import { prepareImage } from '../cms/image';
import { ImageField } from '../cms/ImageField';
import SitePostEditor from '../posts/SitePostEditor';
import SitePostsPage from '../posts/SitePostsPage';
import { editPostPath, newPostPath, postsListPath } from '../posts/siteLinks';
import {
  draftFromPost,
  inputFromDraft,
  mergeSavedDraft,
  relativeTime,
  slugFromTitle,
  uniqueSlug,
  validatePostDraft,
  viewsLabel,
} from '../posts/postModel';

// prepareImage asli (canvas) tetap dipakai, kecuali tes yang menahannya dengan mockImplementationOnce
vi.mock('../cms/image', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../cms/image')>();
  return { ...actual, prepareImage: vi.fn(actual.prepareImage) };
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Janji yang diselesaikan sendiri oleh tes (foto yang masih diproses, permintaan yang masih berjalan). */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const PHOTO_URI = 'data:image/webp;base64,UklGRg==';
const PHOTO_BUSY = 'Tunggu foto selesai diproses…';
const pngFile = () => new File(['png'], 'foto.png', { type: 'image/png' });
const pickPhoto = (file: File) => fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, { target: { files: [file] } });

const DOMAIN = 'sma-nurul-azka.sch.id';
const HOUR = 3600_000;

const makePost = (overrides: Partial<SitePostAdmin> = {}): SitePostAdmin => {
  const kind = overrides.kind ?? 'berita';
  const slug = overrides.slug ?? 'tulisan';
  return {
    id: 1,
    kind,
    slug,
    title: 'Tulisan',
    excerpt: '',
    category: '',
    badge: '',
    image: null,
    image_alt: '',
    link_url: '',
    published_at: null,
    updated_at: '2026-10-25T09:00:00+07:00',
    body: '',
    seo_title: '',
    seo_description: '',
    noindex: false,
    status: 'draft',
    view_count: 0,
    last_viewed_at: null,
    created_at: '2026-10-25T09:00:00+07:00',
    url: `https://${DOMAIN}/${kind}/${slug}`,
    ...overrides,
  };
};

interface MockSite {
  id: number;
  status: 'active' | 'suspended';
  template_code: string;
  content: Record<string, unknown> | null;
}

let site: MockSite;
let posts: SitePostAdmin[];
let calls: { action: string; body: Record<string, unknown> }[];

const siteOut = () => ({
  ...site,
  order_id: 1,
  order_number: 'GN-20261020-ABC123',
  user_id: 9,
  template_id: 1,
  template_name: 'Madani',
  domain: DOMAIN,
  activated_at: '2026-10-20 10:00:00',
  updated_at: '2026-10-20 10:00:00',
});

const seoOut = () => ({
  seo: { title: '', description: '', og_image: null, google_verification: '', bing_verification: '', index_mode: 'auto', schema_type: '', updated_at: null },
  status: { indexable: false, reasons: ['default_content'] },
  urls: { home: `https://${DOMAIN}/`, sitemap: `https://${DOMAIN}/sitemap.xml`, robots: `https://${DOMAIN}/robots.txt` },
});

/** Simpan tulisan seperti server: id baru 99, slug dari judul, foto data URI → path tersimpan. */
function savePost(body: Record<string, unknown>): Response {
  const input = body.post as SitePostInput;
  const id = input.id ?? 99;
  const slug = input.slug || slugFromTitle(input.title, input.kind);
  const saved = makePost({
    ...input,
    id,
    slug,
    image: typeof input.image === 'string' && input.image.startsWith('data:') ? '/assets/sites/1/posts/post_000000000000.webp' : (input.image ?? null),
    published_at: input.published_at || (input.status === 'published' ? '2026-10-26' : null),
    url: `https://${DOMAIN}/${input.kind}/${slug}`,
  } as Partial<SitePostAdmin>);
  posts = posts.some((p) => p.id === id) ? posts.map((p) => (p.id === id ? saved : p)) : [saved, ...posts];
  return json(200, { post: saved });
}

function mockApi(overrides: Partial<Record<string, (body: Record<string, unknown>) => Response | Promise<Response>>> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : Object.fromEntries(url.searchParams);
      calls.push({ action, body });
      const override = overrides[action];
      if (override) return override(body);
      if (action === 'get_settings') return json(200, { footer_whatsapp: '0812-1111-2222' });
      if (action === 'customer_get_site') return json(200, { success: true, site: siteOut() });
      if (action === 'customer_get_site_posts') {
        if (!['madani', 'cakrawala', 'bestari'].includes(site.template_code)) {
          return json(403, { error: 'Template situs ini belum mendukung berita & pengumuman.', code: 'POSTS_UNAVAILABLE' });
        }
        return json(200, { posts, limits: { max_posts: 500 } });
      }
      if (action === 'customer_get_site_seo') return json(200, seoOut());
      if (action === 'customer_save_site_post') return savePost(body);
      if (action === 'customer_delete_site_post') {
        posts = posts.filter((p) => p.id !== body.post_id);
        return json(200, {});
      }
      return json(404, { error: 'tidak ada' });
    }),
  );
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="lokasi">{`${location.pathname}${location.search}`}</p>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/situs/:siteId" element={<p>Editor konten</p>} />
        <Route path="/akun/situs/:siteId/seo" element={<p>Halaman SEO</p>} />
        <Route path="/akun/situs/:siteId/berita" element={<SitePostsPage />} />
        <Route path="/akun/situs/:siteId/berita/:postId" element={<SitePostEditor />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

const location = () => screen.getByTestId('lokasi').textContent;
const saveCalls = () => calls.filter((call) => call.action === 'customer_save_site_post');

beforeEach(() => {
  site = { id: 1, status: 'active', template_code: 'madani', content: null };
  calls = [];
  posts = [
    makePost({
      id: 1,
      slug: 'juara-olimpiade-sains',
      title: 'Juara olimpiade sains',
      category: 'Prestasi',
      status: 'published',
      published_at: '2026-10-20',
      view_count: 12,
      last_viewed_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      image: '/assets/sites/1/posts/post_aaaaaaaaaaaa.webp',
      seo_title: 'Juara Olimpiade Sains 2026',
    }),
    makePost({ id: 2, slug: 'kegiatan-pramuka', title: 'Kegiatan pramuka' }),
    makePost({ id: 3, kind: 'pengumuman', slug: 'libur-semester', title: 'Libur semester ganjil', badge: 'Penting', status: 'published', published_at: '2026-10-22' }),
  ];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('postModel', () => {
  it('slug otomatis sama dengan server (diakritik, batas kata, -2 bila bentrok)', () => {
    expect(slugFromTitle('Juara Olimpiade Sains & Matematika!', 'berita')).toBe('juara-olimpiade-sains-matematika');
    expect(slugFromTitle('Café Ilmu', 'berita')).toBe('cafe-ilmu');
    expect(slugFromTitle('!!!', 'pengumuman')).toBe('pengumuman');
    expect(slugFromTitle(`${'kata '.repeat(40)}akhir`, 'berita').length).toBeLessThanOrEqual(120);
    expect(uniqueSlug('rapat', ['rapat', 'rapat-2'])).toBe('rapat-3');
  });

  it('validasi memakai batas & pesan server', () => {
    const draft = { ...draftFromPost(null), title: '  ab ' };
    expect(validatePostDraft(draft, []).title).toBe('Judul minimal 3 karakter.');
    expect(validatePostDraft({ ...draft, title: '' }, []).title).toBe('Judul wajib diisi.');
    expect(validatePostDraft({ ...draft, title: 'x'.repeat(161) }, []).title).toBe('Judul maksimal 160 karakter.');
    const ok = { ...draft, title: 'Judul sah' };
    expect(validatePostDraft(ok, [])).toEqual({});
    expect(validatePostDraft({ ...ok, slug: 'Bukan Slug' }, []).slug).toMatch(/huruf kecil/);
    expect(validatePostDraft({ ...ok, slug: 'rapat' }, ['rapat']).slug).toBe('Slug sudah dipakai tulisan lain di situs ini.');
    expect(validatePostDraft({ ...ok, link_url: 'javascript:alert(1)' }, []).link_url).toMatch(/harus diawali/);
    for (const link of ['https://drive.google.com/x', 'mailto:tu@sekolah.sch.id', 'tel:+6281234', '/ppdb', '#agenda']) {
      expect(validatePostDraft({ ...ok, link_url: link }, []).link_url).toBeUndefined();
    }
    expect(validatePostDraft({ ...ok, link_url: '//evil.com' }, []).link_url).toBeDefined();
    expect(validatePostDraft({ ...ok, published_at: '2026-02-30' }, []).published_at).toMatch(/tanggal yang valid/);
    expect(validatePostDraft({ ...ok, seo_title: 'x'.repeat(71) }, []).seo_title).toBe('Judul SEO maksimal 70 karakter.');
    expect(validatePostDraft({ ...ok, body: 'x'.repeat(20001) }, []).body).toBe('Isi tulisan maksimal 20.000 karakter.');
  });

  it('isian kirim: spasi dirapatkan, foto kosong = null (hapus), path lama tetap', () => {
    const draft = { ...draftFromPost(null), title: '  Rapat   orang\ttua ', body: 'a\r\n\r\nb  ', image: '' };
    const input = inputFromDraft(draft, 'pengumuman', 'published');
    expect(input).toMatchObject({ kind: 'pengumuman', status: 'published', title: 'Rapat orang tua', body: 'a\n\nb', image: null });
    expect(input.id).toBeUndefined();
    expect(inputFromDraft({ ...draft, image: '/assets/x.webp' }, 'berita', 'draft', 5)).toMatchObject({ id: 5, image: '/assets/x.webp' });
  });

  it('teks jumlah dilihat & waktu relatif', () => {
    expect(viewsLabel(0)).toBe('Belum pernah dilihat');
    expect(viewsLabel(1234)).toBe('Dilihat 1.234 kali');
    const now = Date.parse('2026-10-26T10:00:00+07:00');
    expect(relativeTime('2026-10-26T09:59:30+07:00', now)).toBe('baru saja');
    expect(relativeTime('2026-10-26T07:00:00+07:00', now)).toBe('3 jam yang lalu');
    expect(relativeTime('2026-10-25T10:00:00+07:00', now)).toBe('kemarin');
    expect(relativeTime('2026-08-01T10:00:00+07:00', now)).toBe('1 Agustus 2026');
    expect(relativeTime(null, now)).toBeNull();
  });

  it('mergeSavedDraft: kolom yang berubah selama simpan tetap isian lokal, sisanya salinan server', () => {
    const sent = { ...draftFromPost(null), title: 'Rapat  guru', image: 'data:image/webp;base64,AAA=' };
    const server = { ...sent, title: 'Rapat guru', slug: 'rapat-guru', image: '/assets/sites/1/posts/post_000000000000.webp' };
    // Tidak berubah selama permintaan berjalan → salinan server apa adanya
    expect(mergeSavedDraft(sent, sent, server)).toBe(server);
    expect(mergeSavedDraft(sent, { ...sent }, server)).toEqual(server);
    // Ringkasan & foto berubah selama simpan → tetap isian lokal; judul/slug ikut server
    const current = { ...sent, excerpt: 'Ringkasan baru', image: PHOTO_URI, noindex: true };
    expect(mergeSavedDraft(sent, current, server)).toEqual({ ...server, excerpt: 'Ringkasan baru', image: PHOTO_URI, noindex: true });
  });

  it('alamat editor & daftar membawa ?jenis=pengumuman (berita = tanpa query)', () => {
    expect(editPostPath(1, 5, 'berita')).toBe('/akun/situs/1/berita/5');
    expect(editPostPath(1, 5, 'pengumuman')).toBe('/akun/situs/1/berita/5?jenis=pengumuman');
    expect(newPostPath(1, 'pengumuman')).toBe('/akun/situs/1/berita/baru?jenis=pengumuman');
    expect(postsListPath(1, 'berita')).toBe('/akun/situs/1/berita');
    expect(postsListPath(1, 'pengumuman')).toBe('/akun/situs/1/berita?jenis=pengumuman');
  });
});

describe('ImageField onProcessingChange', () => {
  const renderField = (onProcessingChange: (busy: boolean) => void) =>
    render(
      <ImageField
        field={{ type: 'image', key: 'image', label: 'Foto utama' }}
        path="post.image"
        value=""
        onChange={vi.fn()}
        onProcessingChange={onProcessingChange}
      />,
    );

  it('true saat mulai diproses, false saat selesai', async () => {
    const photo = deferred<string>();
    vi.mocked(prepareImage).mockImplementationOnce(() => photo.promise);
    const busy = vi.fn();
    renderField(busy);
    pickPhoto(pngFile());
    expect(busy.mock.calls).toEqual([[true]]);
    await act(async () => photo.resolve(PHOTO_URI));
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });

  it('gagal diproses juga mengakhiri status sibuk', async () => {
    const photo = deferred<string>();
    vi.mocked(prepareImage).mockImplementationOnce(() => photo.promise);
    const busy = vi.fn();
    renderField(busy);
    pickPhoto(pngFile());
    await act(async () => photo.reject(new Error('Gambar tidak bisa dibaca. Coba file lain.')));
    expect(busy.mock.calls).toEqual([[true], [false]]);
    expect(screen.getByText('Gambar tidak bisa dibaca. Coba file lain.')).toBeInTheDocument();
  });
});

describe('daftar berita & pengumuman', () => {
  it('tab jenis, status, jumlah dilihat, dan Lihat hanya untuk tulisan terbit', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita');
    expect(await screen.findByRole('heading', { level: 1, name: 'Berita & Pengumuman' })).toBeInTheDocument();

    // Navigasi pil situs
    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).getByRole('link', { name: 'Berita & Pengumuman' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Konten' })).toHaveAttribute('href', '/akun/situs/1');
    expect(within(nav).getByRole('link', { name: 'SEO' })).toHaveAttribute('href', '/akun/situs/1/seo');

    const beritaTab = screen.getByRole('tab', { name: /Berita/ });
    expect(beritaTab).toHaveAttribute('aria-selected', 'true');
    expect(beritaTab).toHaveTextContent('2');
    const panel = screen.getByRole('tabpanel');
    const items = within(panel).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const published = items[0];
    expect(within(published).getByText('Juara olimpiade sains')).toBeInTheDocument();
    expect(within(published).getByText('Terbit')).toBeInTheDocument();
    expect(within(published).getByText('Prestasi')).toBeInTheDocument();
    expect(within(published).getByText('20 Oktober 2026')).toBeInTheDocument();
    expect(published).toHaveTextContent('Dilihat 12 kali');
    expect(published).toHaveTextContent('terakhir 2 jam yang lalu');
    const view = within(published).getByRole('link', { name: /^Lihat/ });
    expect(view).toHaveAttribute('href', `https://${DOMAIN}/berita/juara-olimpiade-sains`);
    expect(view).toHaveAttribute('target', '_blank');
    expect(within(published).getByRole('link', { name: /^Edit berita/ })).toHaveAttribute('href', '/akun/situs/1/berita/1');

    const draft = items[1];
    expect(within(draft).getByText('Draf')).toBeInTheDocument();
    expect(draft).toHaveTextContent('Belum bertanggal');
    expect(draft).toHaveTextContent('Belum pernah dilihat');
    expect(within(draft).queryByRole('link', { name: /^Lihat/ })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Tulis berita' })).toHaveAttribute('href', '/akun/situs/1/berita/baru');

    // Tab lain: ?jenis=pengumuman
    fireEvent.click(screen.getByRole('tab', { name: /Pengumuman/ }));
    expect(location()).toBe('/akun/situs/1/berita?jenis=pengumuman');
    expect(within(screen.getByRole('tabpanel')).getByText('Libur semester ganjil')).toBeInTheDocument();
    expect(within(screen.getByRole('tabpanel')).getByText('Penting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tulis pengumuman' })).toHaveAttribute('href', '/akun/situs/1/berita/baru?jenis=pengumuman');
    // Editor pengumuman membawa ?jenis supaya breadcrumb kembali ke tab Pengumuman
    expect(screen.getByRole('link', { name: /^Edit pengumuman .Libur semester ganjil/ })).toHaveAttribute(
      'href',
      '/akun/situs/1/berita/3?jenis=pengumuman',
    );

    // Panah kiri kembali ke tab Berita (pola ARIA tabs)
    fireEvent.keyDown(screen.getByRole('tab', { name: /Pengumuman/ }), { key: 'ArrowLeft' });
    expect(location()).toBe('/akun/situs/1/berita');
    expect(screen.getByRole('tab', { name: /Berita/ })).toHaveFocus();
  });

  it('hapus: konfirmasi dulu, lalu tulisan hilang dari daftar', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita');
    await screen.findByRole('heading', { level: 1, name: 'Berita & Pengumuman' });
    fireEvent.click(screen.getByRole('button', { name: /^Hapus berita .Kegiatan pramuka/ }));
    const dialog = screen.getByRole('alertdialog', { name: 'Hapus berita ini?' });
    expect(dialog).toHaveTextContent('Kegiatan pramuka');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, hapus' }));
    });
    expect(calls.find((call) => call.action === 'customer_delete_site_post')?.body).toMatchObject({ site_id: 1, post_id: 2 });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Kegiatan pramuka')).not.toBeInTheDocument();
    expect(screen.getByText('Berita “Kegiatan pramuka” dihapus.')).toBeInTheDocument();
    // Baris terakhir dihapus → fokus ke Edit baris sebelumnya, bukan jatuh ke <body>
    await waitFor(() => expect(screen.getByRole('link', { name: /^Edit berita .Juara olimpiade sains/ })).toHaveFocus());
  });

  it('hapus baris pertama → fokus ke Edit baris berikutnya', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita');
    await screen.findByRole('heading', { level: 1, name: 'Berita & Pengumuman' });
    const trigger = screen.getByRole('button', { name: /^Hapus berita .Juara olimpiade sains/ });
    trigger.focus();
    fireEvent.click(trigger);
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ya, hapus' }));
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Juara olimpiade sains')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: /^Edit berita .Kegiatan pramuka/ })).toHaveFocus());
  });

  it('hapus ditolak karena situs nonaktif → hanya-baca, fokus ke tautan Buka tulisan itu', async () => {
    mockApi({ customer_delete_site_post: () => json(409, { error: 'Situs sedang dinonaktifkan.', code: 'SITE_SUSPENDED' }) });
    renderAt('/akun/situs/1/berita');
    await screen.findByRole('heading', { level: 1, name: 'Berita & Pengumuman' });
    fireEvent.click(screen.getByRole('button', { name: /^Hapus berita .Kegiatan pramuka/ }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ya, hapus' }));
    });
    expect(await screen.findByText('Situs sedang dinonaktifkan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Hapus/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Lihat/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: /^Buka berita .Kegiatan pramuka/ })).toHaveFocus());
  });

  it('hapus satu-satunya tulisan di tab → fokus ke panel daftar', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita?jenis=pengumuman');
    await screen.findByRole('heading', { level: 1, name: 'Berita & Pengumuman' });
    fireEvent.click(screen.getByRole('button', { name: /^Hapus pengumuman .Libur semester ganjil/ }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ya, hapus' }));
    });
    expect(await screen.findByText('Belum ada pengumuman')).toBeInTheDocument();
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('tabindex', '-1');
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it('gagal menghapus: pesan tampil di dalam dialog', async () => {
    mockApi({ customer_delete_site_post: () => json(500, { error: 'Terjadi kesalahan pada server. Silakan coba lagi.' }) });
    renderAt('/akun/situs/1/berita');
    await screen.findByRole('heading', { level: 1, name: 'Berita & Pengumuman' });
    fireEvent.click(screen.getByRole('button', { name: /^Hapus berita .Kegiatan pramuka/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus' }));
    });
    expect(within(screen.getByRole('alertdialog')).getByRole('alert')).toHaveTextContent('Terjadi kesalahan pada server');
    expect(screen.getByText('Kegiatan pramuka')).toBeInTheDocument();
  });

  it('belum ada tulisan → keadaan kosong dengan ajakan menulis', async () => {
    posts = [];
    mockApi();
    renderAt('/akun/situs/1/berita?jenis=pengumuman');
    expect(await screen.findByText('Belum ada pengumuman')).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'Tulis pengumuman' })) {
      expect(link).toHaveAttribute('href', '/akun/situs/1/berita/baru?jenis=pengumuman');
    }
  });

  it('template tanpa fitur tulisan → penjelasan + tautan ke Konten & SEO', async () => {
    site.template_code = 'corporate-nexa';
    mockApi();
    renderAt('/akun/situs/1/berita');
    expect(await screen.findByText('Template ini belum punya fitur berita')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kelola konten' })).toHaveAttribute('href', '/akun/situs/1');
    expect(screen.getByRole('link', { name: 'Atur SEO' })).toHaveAttribute('href', '/akun/situs/1/seo');
    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).queryByRole('link', { name: 'Berita & Pengumuman' })).not.toBeInTheDocument();
  });

  it('situs nonaktif → hanya-baca: tanpa tombol tulis & hapus', async () => {
    site.status = 'suspended';
    mockApi();
    renderAt('/akun/situs/1/berita');
    expect(await screen.findByText('Situs sedang dinonaktifkan')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tulis berita' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Hapus/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Buka berita/ })).toHaveLength(2);
    // Situs nonaktif tidak bisa dibuka: tulisan terbit pun tanpa tautan Lihat
    expect(screen.getByText('Terbit')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Lihat/ })).not.toBeInTheDocument();
  });

  it('situs bukan milik pembeli → tidak ditemukan', async () => {
    mockApi({ customer_get_site: () => json(404, { error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' }) });
    renderAt('/akun/situs/1/berita');
    expect(await screen.findByText('Situs tidak ditemukan')).toBeInTheDocument();
  });
});

describe('editor tulisan', () => {
  beforeEach(() => {
    // jsdom tidak punya API gulir elemen
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('tulisan baru: judul wajib, terbitkan, lalu URL diganti ke id baru tanpa memasang ulang form', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/baru?jenis=pengumuman');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tulis pengumuman' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Label/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Kategori/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    expect(await screen.findByText('Judul wajib diisi.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Judul')).toHaveFocus());
    expect(saveCalls()).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Libur   akhir semester' } });
    fireEvent.change(screen.getByLabelText(/^Isi pengumuman/), { target: { value: 'Paragraf satu.\n\nParagraf dua.' } });
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Penting' } });
    expect(screen.queryByText('Judul wajib diisi.')).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    });

    expect(saveCalls()).toHaveLength(1);
    expect(saveCalls()[0].body).toMatchObject({
      site_id: 1,
      post: { kind: 'pengumuman', status: 'published', title: 'Libur akhir semester', badge: 'Penting', body: 'Paragraf satu.\n\nParagraf dua.', image: null },
    });
    expect((saveCalls()[0].body.post as SitePostInput).id).toBeUndefined();
    expect(await screen.findByText(/Pengumuman diterbitkan/)).toBeInTheDocument();
    await waitFor(() => expect(location()).toBe('/akun/situs/1/berita/99?jenis=pengumuman'));
    expect(screen.getByRole('heading', { level: 1, name: 'Edit pengumuman' })).toBeInTheDocument();
    // Form yang sama (tidak dipasang ulang): isian dan toast tetap
    expect(screen.getByLabelText('Judul')).toHaveValue('Libur akhir semester');
    expect(screen.getByText(/Pengumuman diterbitkan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan perubahan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jadikan draf' })).toBeInTheDocument();
  });

  it('edit tulisan: nilai termuat, slug ganda ditolak di klien, Jadikan draf mengirim status draft', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit berita' })).toBeInTheDocument();
    expect(screen.getByLabelText('Judul')).toHaveValue('Juara olimpiade sains');
    expect(screen.getByLabelText(/^Kategori/)).toHaveValue('Prestasi');
    expect(screen.getByLabelText(/^Tanggal/)).toHaveValue('2026-10-20');
    expect(screen.getByText('12 kali')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat di situs/ })).toHaveAttribute('href', `https://${DOMAIN}/berita/juara-olimpiade-sains`);

    // Isian SEO sudah ada → bagiannya terbuka; pratinjau Google memakai judul SEO
    const seoToggle = screen.getByRole('button', { name: /SEO \(opsional\)/ });
    expect(seoToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(`https://${DOMAIN}/berita/juara-olimpiade-sains`)).toBeInTheDocument();
    const snippet = screen.getByText('Pratinjau di Google').closest('figure')!;
    expect(snippet).toHaveTextContent('Juara Olimpiade Sains 2026');
    expect(snippet).toHaveTextContent(`${DOMAIN} › berita › juara-olimpiade-sains`);
    // Situs belum tampil di Google (nama sekolah masih contoh)
    expect(screen.getByText('Situs Anda belum tampil di Google')).toBeInTheDocument();

    const slug = screen.getByLabelText(/^Alamat \(slug\)/);
    fireEvent.change(slug, { target: { value: 'Kegiatan Pramuka' } });
    expect(slug).toHaveValue('kegiatan-pramuka');
    expect(screen.getByText(/mengganti alamat membuat tautan lama tidak bisa dibuka lagi/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(await screen.findByText('Slug sudah dipakai tulisan lain di situs ini.')).toBeInTheDocument();
    expect(saveCalls()).toHaveLength(0);

    fireEvent.change(slug, { target: { value: 'juara-olimpiade-sains' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Jadikan draf' }));
    });
    expect(saveCalls()[0].body.post).toMatchObject({
      id: 1,
      kind: 'berita',
      status: 'draft',
      slug: 'juara-olimpiade-sains',
      image: '/assets/sites/1/posts/post_aaaaaaaaaaaa.webp',
    });
    expect(await screen.findByText('Berita dijadikan draf dan tidak tampil lagi di situs.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terbitkan' })).toBeInTheDocument();
  });

  it('error per kolom dari server (SLUG_TAKEN) tampil di bawah kolomnya dan bagian SEO dibuka', async () => {
    mockApi({
      customer_save_site_post: () =>
        json(409, {
          error: 'Slug sudah dipakai tulisan lain di situs ini.',
          code: 'SLUG_TAKEN',
          errors: { slug: 'Slug sudah dipakai tulisan lain di situs ini.' },
        }),
    });
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    const seoToggle = screen.getByRole('button', { name: /SEO \(opsional\)/ });
    expect(seoToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Kegiatan pramuka sabtu' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Terbitkan' }));
    });
    expect(await screen.findByText('Slug sudah dipakai tulisan lain di situs ini.')).toBeInTheDocument();
    expect(seoToggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByLabelText(/^Alamat \(slug\)/)).toHaveFocus());
    expect(screen.getByLabelText(/^Alamat \(slug\)/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('galat server tanpa kolom tampil di atas form', async () => {
    mockApi({ customer_save_site_post: () => json(429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.' }) });
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Kegiatan pramuka sabtu' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Simpan draf' }));
    });
    expect(await screen.findByText('Berita belum tersimpan')).toBeInTheDocument();
    expect(screen.getByText('Terlalu banyak percobaan. Coba lagi dalam 5 menit.')).toBeInTheDocument();
  });

  it('foto SVG ditolak dengan pesan yang jelas', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/baru');
    await screen.findByRole('heading', { level: 1, name: 'Tulis berita' });
    expect(screen.getByText(/SVG tidak untuk foto/)).toBeInTheDocument();
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg', { type: 'image/svg+xml' });
    fireEvent.change(fileInput, { target: { files: [svg] } });
    expect(await screen.findByText('SVG tidak bisa dipakai untuk foto. Gunakan foto JPG, PNG, atau WEBP.')).toBeInTheDocument();
    expect(screen.queryByText('Belum disimpan')).not.toBeInTheDocument();
  });

  it('hapus dari editor → kembali ke daftar dengan pesan', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    fireEvent.click(screen.getByRole('button', { name: 'Hapus berita' }));
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ya, hapus' }));
    });
    await waitFor(() => expect(location()).toBe('/akun/situs/1/berita'));
    expect(await screen.findByText('Berita “Kegiatan pramuka” dihapus.')).toBeInTheDocument();
    expect(screen.queryByText('Kegiatan pramuka')).not.toBeInTheDocument();
    // Tombol Hapus ikut hilang bersama editor: fokus ke pesan "… dihapus." di daftar
    await waitFor(() => expect(document.activeElement).toHaveTextContent('Berita “Kegiatan pramuka” dihapus.'));
    expect(document.activeElement).not.toBe(document.body);
    // Pesan ditutup → fokus ke panel daftar
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pemberitahuan' }));
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });

  it('foto masih diproses: tombol simpan & Ctrl+S ditahan sampai foto selesai', async () => {
    const photo = deferred<string>();
    vi.mocked(prepareImage).mockImplementationOnce(() => photo.promise);
    mockApi();
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Kegiatan pramuka sabtu' } });
    pickPhoto(pngFile());

    expect(await screen.findByText('Memproses gambar...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terbitkan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simpan draf' })).toBeDisabled();
    expect(screen.getByText(PHOTO_BUSY)).toBeInTheDocument();
    // Ctrl+S tidak mengirim apa pun; toast mengulang petunjuknya
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(screen.getAllByText(PHOTO_BUSY)).toHaveLength(2);
    expect(saveCalls()).toHaveLength(0);

    await act(async () => photo.resolve(PHOTO_URI));
    expect(screen.queryByText('Memproses gambar...')).not.toBeInTheDocument();
    expect(screen.getByText('Ada perubahan yang belum disimpan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan draf' })).toBeEnabled();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Simpan draf' }));
    });
    expect(saveCalls()).toHaveLength(1);
    expect(saveCalls()[0].body.post).toMatchObject({ id: 2, title: 'Kegiatan pramuka sabtu', image: PHOTO_URI });
  });

  it('foto gagal diproses: tombol simpan aktif lagi', async () => {
    const photo = deferred<string>();
    vi.mocked(prepareImage).mockImplementationOnce(() => photo.promise);
    mockApi();
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    pickPhoto(pngFile());
    expect(await screen.findByText(PHOTO_BUSY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terbitkan' })).toBeDisabled();
    await act(async () => photo.reject(new Error('Gambar tidak bisa dibaca. Coba file lain.')));
    expect(screen.getByText('Gambar tidak bisa dibaca. Coba file lain.')).toBeInTheDocument();
    expect(screen.queryByText(PHOTO_BUSY)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terbitkan' })).toBeEnabled();
  });

  it('isian yang berubah selama simpan berjalan tidak ditimpa salinan server', async () => {
    const gate = deferred<void>();
    mockApi({ customer_save_site_post: (body) => gate.promise.then(() => savePost(body)) });
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Kegiatan   pramuka sabtu' } });
    fireEvent.change(screen.getByLabelText(/^Ringkasan/), { target: { value: 'Ringkasan lama' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Simpan draf' }));
    });
    expect(saveCalls()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Menyimpan...' })).toBeInTheDocument();

    // Isian berubah selama permintaan berjalan (mis. foto yang selesai diproses belakangan)
    fireEvent.change(screen.getByLabelText(/^Ringkasan/), { target: { value: 'Ringkasan baru' } });
    await act(async () => gate.resolve());

    expect(await screen.findByText('Draf disimpan.')).toBeInTheDocument();
    // Kolom yang tidak berubah memakai salinan server (spasi dirapatkan); yang berubah tetap isian lokal
    expect(screen.getByLabelText('Judul')).toHaveValue('Kegiatan pramuka sabtu');
    expect(screen.getByLabelText(/^Ringkasan/)).toHaveValue('Ringkasan baru');
    expect(screen.getByText('Ada perubahan yang belum disimpan.')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Simpan draf' }));
    });
    expect(saveCalls()).toHaveLength(2);
    expect(saveCalls()[1].body.post).toMatchObject({ id: 2, title: 'Kegiatan pramuka sabtu', excerpt: 'Ringkasan baru' });
    expect(await screen.findByText('Semua perubahan tersimpan.')).toBeInTheDocument();
  });

  it('pengumuman: editor dibuka dengan ?jenis=pengumuman, tombol kembali ke tab Pengumuman', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/3?jenis=pengumuman');
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit pengumuman' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Semua pengumuman/ })).toHaveAttribute('href', '/akun/situs/1/berita?jenis=pengumuman');
  });

  it('perubahan belum disimpan: pindah lewat navigasi situs ditanya dulu', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/2');
    await screen.findByRole('heading', { level: 1, name: 'Edit berita' });
    fireEvent.change(screen.getByLabelText('Judul'), { target: { value: 'Judul baru yang belum disimpan' } });
    fireEvent.click(screen.getByRole('link', { name: 'SEO' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Perubahan belum disimpan' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tetap di sini' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(location()).toBe('/akun/situs/1/berita/2');
  });

  it('tulisan tidak ada → keadaan tidak ditemukan', async () => {
    mockApi();
    renderAt('/akun/situs/1/berita/777');
    expect(await screen.findByText('Tulisan tidak ditemukan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke daftar' })).toHaveAttribute('href', '/akun/situs/1/berita');
  });

  it('situs nonaktif → form hanya-baca', async () => {
    site.status = 'suspended';
    mockApi();
    renderAt('/akun/situs/1/berita/1');
    expect(await screen.findByText('Situs sedang dinonaktifkan')).toBeInTheDocument();
    expect(screen.getByLabelText('Judul')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Simpan perubahan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus berita' })).not.toBeInTheDocument();
    // Tulisan terbit, tetapi situsnya nonaktif: tanpa "Lihat di situs"
    expect(screen.getByText('Berita ini tampil di situs Anda.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Lihat di situs/ })).not.toBeInTheDocument();
  });
});
