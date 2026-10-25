// @vitest-environment jsdom
// SEO situs di panel akun (/akun/situs/:siteId/seo, docs/platform/SITE-POSTS-SEO-SPEC.md §8): kartu status & alasan,
// pratinjau Google, simpan, kode verifikasi dari tag meta, error per kolom, situs nonaktif, aturan murni seoModel.
// Jalankan: npx vitest run src/pages/account/__tests__/siteSeo.test.tsx
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteIndexReason, SiteSeoResponse, SiteSeoSettings } from '../../../types/sitePosts';
import SiteSeoPage from '../seo/SiteSeoPage';
import { draftFromSeo, inputFromSeoDraft, validateSeoDraft, verificationToken } from '../seo/seoModel';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const DOMAIN = 'sma-nurul-azka.sch.id';
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-xyz';

interface MockSite {
  id: number;
  status: 'active' | 'suspended';
  template_code: string;
}

let site: MockSite;
let seo: SiteSeoSettings;
let reasons: SiteIndexReason[];
let calls: { action: string; body: Record<string, unknown> }[];

const siteOut = () => ({
  ...site,
  content: null,
  order_id: 1,
  order_number: 'GN-20261020-ABC123',
  user_id: 9,
  template_id: 1,
  template_name: 'Madani',
  domain: DOMAIN,
  activated_at: '2026-10-20 10:00:00',
  updated_at: '2026-10-20 10:00:00',
});

const seoOut = (): SiteSeoResponse => ({
  seo,
  status: { indexable: reasons.length === 0, reasons },
  urls: { home: `https://${DOMAIN}/`, sitemap: `https://${DOMAIN}/sitemap.xml`, robots: `https://${DOMAIN}/robots.txt` },
});

function mockApi(overrides: Partial<Record<string, (body: Record<string, unknown>) => Response>> = {}) {
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
      if (action === 'customer_get_site_seo') return json(200, seoOut());
      if (action === 'customer_save_site_seo') {
        const input = body.seo as SiteSeoSettings;
        seo = {
          ...seo,
          ...input,
          og_image: typeof input.og_image === 'string' && input.og_image.startsWith('data:') ? '/assets/sites/1/seo/seo_000000000000.webp' : input.og_image,
          google_verification: verificationToken(input.google_verification) ?? '',
          bing_verification: verificationToken(input.bing_verification) ?? '',
          updated_at: '2026-10-26T10:00:00+07:00',
        };
        reasons = input.index_mode === 'noindex' ? ['manual_noindex'] : input.index_mode === 'index' ? [] : reasons;
        return json(200, seoOut());
      }
      return json(404, { error: 'tidak ada' });
    }),
  );
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/akun/situs/1/seo']}>
      <Routes>
        <Route path="/akun/situs/:siteId/seo" element={<SiteSeoPage />} />
        <Route path="/akun/situs/:siteId" element={<p>Editor konten</p>} />
      </Routes>
    </MemoryRouter>,
  );

const saveCalls = () => calls.filter((call) => call.action === 'customer_save_site_seo');
const snippet = () => screen.getByText('Pratinjau di Google').closest('figure')!;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  site = { id: 1, status: 'active', template_code: 'madani' };
  seo = { title: '', description: '', og_image: null, google_verification: '', bing_verification: '', index_mode: 'auto', schema_type: '', updated_at: null };
  reasons = ['default_content'];
  calls = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('seoModel', () => {
  it('kode verifikasi: token apa adanya atau dari seluruh tag meta', () => {
    expect(verificationToken('')).toBe('');
    expect(verificationToken(`  ${TOKEN} `)).toBe(TOKEN);
    expect(verificationToken(`<meta name="google-site-verification" content="${TOKEN}" />`)).toBe(TOKEN);
    expect(verificationToken(`<meta name='msvalidate.01' content='ABCDEF0123456789'>`)).toBe('ABCDEF0123456789');
    expect(verificationToken('<meta name="google-site-verification">')).toBeNull();
    expect(verificationToken('pendek')).toBeNull();
    expect(verificationToken('ada spasi di dalam kode')).toBeNull();
  });

  it('validasi & isian kirim', () => {
    const draft = draftFromSeo(seo);
    expect(validateSeoDraft(draft)).toEqual({});
    expect(validateSeoDraft({ ...draft, title: 'x'.repeat(71) }).title).toBe('Judul di Google maksimal 70 karakter.');
    expect(validateSeoDraft({ ...draft, description: 'x'.repeat(161) }).description).toBe('Deskripsi di Google maksimal 160 karakter.');
    expect(validateSeoDraft({ ...draft, google_verification: 'salah' }).google_verification).toMatch(/Kode verifikasi Google tidak valid/);
    expect(inputFromSeoDraft({ ...draft, title: '  SMA   Nurul Azka ', og_image: '' })).toMatchObject({ title: 'SMA Nurul Azka', og_image: null });
  });
});

describe('halaman SEO situs', () => {
  it('status belum tampil di Google + cara memperbaiki, alamat penting, panduan', async () => {
    mockApi();
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'SEO situs' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).getByRole('link', { name: 'SEO' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Berita & Pengumuman' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Situs Anda belum bisa muncul di Google' })).toBeInTheDocument();
    expect(screen.getByText('Nama sekolah masih nama contoh dari template')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buka Kelola konten' })).toHaveAttribute('href', '/akun/situs/1');

    const sitemap = screen.getByRole('link', { name: /Sitemap/ });
    expect(sitemap).toHaveAttribute('href', `https://${DOMAIN}/sitemap.xml`);
    expect(sitemap).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /robots\.txt/ })).toHaveAttribute('href', `https://${DOMAIN}/robots.txt`);
    expect(screen.getByRole('link', { name: /Google Search Console/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('heading', { name: 'Daftarkan situs ke Google' }).closest('section')!.querySelectorAll('ol > li')).toHaveLength(5);

    // Pratinjau: nama sekolah bawaan template (konten masih contoh)
    expect(snippet()).toHaveTextContent('SMA IT Nurul Azka');
    expect(snippet()).toHaveTextContent(DOMAIN);
    expect(screen.getByRole('button', { name: /Simpan pengaturan/ })).toBeDisabled();
  });

  it('ubah judul (pratinjau ikut), tempel tag meta Google, simpan → status & toast diperbarui', async () => {
    mockApi();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'SEO situs' });

    fireEvent.change(screen.getByLabelText(/^Judul di Google/), { target: { value: 'SMA IT Nurul Azka   Bandung' } });
    expect(snippet()).toHaveTextContent('SMA IT Nurul Azka Bandung');
    expect(screen.getByText('Status ini diperbarui setelah perubahan disimpan.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Kode verifikasi Google/), {
      target: { value: `<meta name="google-site-verification" content="${TOKEN}" />` },
    });
    expect(screen.getByText(`Kode yang dipakai: ${TOKEN}`)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Ya, tampilkan/));
    fireEvent.change(screen.getByLabelText(/^Jenis organisasi/), { target: { value: 'HighSchool' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Simpan pengaturan/ }));
    });
    expect(saveCalls()).toHaveLength(1);
    expect(saveCalls()[0].body).toMatchObject({
      site_id: 1,
      seo: {
        title: 'SMA IT Nurul Azka Bandung',
        description: '',
        og_image: null,
        google_verification: `<meta name="google-site-verification" content="${TOKEN}" />`,
        bing_verification: '',
        index_mode: 'index',
        schema_type: 'HighSchool',
      },
    });
    expect(await screen.findByText('Pengaturan SEO disimpan. Situs Anda bisa muncul di Google.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Situs Anda bisa muncul di Google' })).toBeInTheDocument();
    // Kolom memakai nilai dari server (kode saja, bukan seluruh tag)
    expect(screen.getByLabelText(/^Kode verifikasi Google/)).toHaveValue(TOKEN);
    expect(screen.getByRole('button', { name: /Simpan pengaturan/ })).toBeDisabled();
  });

  it('kode verifikasi tidak valid ditahan di klien dan kolomnya difokuskan', async () => {
    mockApi();
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'SEO situs' });
    fireEvent.change(screen.getByLabelText(/^Kode verifikasi Bing/), { target: { value: 'salah' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan pengaturan/ }));
    expect(await screen.findByText(/Kode verifikasi Bing tidak valid/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/^Kode verifikasi Bing/)).toHaveFocus());
    expect(saveCalls()).toHaveLength(0);
  });

  it('error per kolom dari server tampil di bawah kolomnya', async () => {
    mockApi({
      customer_save_site_seo: () =>
        json(400, { error: 'Deskripsi di Google maksimal 160 karakter.', code: 'VALIDATION', errors: { description: 'Deskripsi di Google maksimal 160 karakter.' } }),
    });
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'SEO situs' });
    fireEvent.change(screen.getByLabelText(/^Deskripsi di Google/), { target: { value: 'Sekolah Islam terpadu di Bandung.' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Simpan pengaturan/ }));
    });
    expect(await screen.findByText('Deskripsi di Google maksimal 160 karakter.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Deskripsi di Google/)).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText(/^Deskripsi di Google/)).toHaveFocus());
  });

  it('disembunyikan manual → tombol "Ubah pilihan" memfokuskan pilihan Tampil di Google', async () => {
    seo = { ...seo, index_mode: 'noindex' };
    reasons = ['manual_noindex'];
    mockApi();
    renderPage();
    expect(await screen.findByText('Anda memilih menyembunyikan situs dari Google')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tidak, sembunyikan/)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Ubah pilihan' }));
    await waitFor(() => expect(screen.getByLabelText(/Tidak, sembunyikan/)).toHaveFocus());
  });

  it('template bukan sekolah: teks "perusahaan", tanpa menu Berita', async () => {
    site.template_code = 'corporate-nexa';
    mockApi();
    renderPage();
    expect(await screen.findByText('Nama perusahaan masih nama contoh dari template')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Menu situs' });
    expect(within(nav).queryByRole('link', { name: 'Berita & Pengumuman' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Otomatis (Organisasi atau perusahaan)' })).toBeInTheDocument();
  });

  it('situs nonaktif → hanya-baca', async () => {
    site.status = 'suspended';
    reasons = ['suspended', 'default_content'];
    mockApi();
    renderPage();
    expect(await screen.findByText('Situs sedang dinonaktifkan')).toBeInTheDocument();
    expect(screen.getByText('Situs dinonaktifkan sementara')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Judul di Google/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Simpan pengaturan/ })).not.toBeInTheDocument();
    const help = screen.getByRole('link', { name: /Hubungi kami via WhatsApp/ });
    await waitFor(() => expect(help.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
  });
});
