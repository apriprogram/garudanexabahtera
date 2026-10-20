// @vitest-environment jsdom
// Jalankan: npx vitest run --dir src/pages/account/cms
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES, resolveContent } from '../../../../templates';
import type { TemplateField } from '../../../../templates/types';
import SiteEditor from '../../SiteEditor';
import { countNewImages } from '../content';
import { isValidLink, validateContent, validateFieldValue } from '../validation';

const field = (type: TemplateField['type'], extra: Partial<TemplateField> = {}): TemplateField => ({ type, key: 'x', label: 'X', ...extra });

describe('validasi field CMS', () => {
  it('kosong selalu valid (semua field opsional)', () => {
    for (const type of ['text', 'textarea', 'url', 'email', 'phone', 'color', 'image'] as const) {
      expect(validateFieldValue(field(type), '')).toBeUndefined();
    }
  });

  it('url', () => {
    for (const ok of ['https://instagram.com/nama', 'http://contoh.co.id', '#kontak', '/situs/1', 'instagram.com/nama', 'mailto:a@b.co', 'tel:+62812345']) {
      expect(isValidLink(ok)).toBe(true);
    }
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'bukan url', 'https://localhost', '//evil.com']) expect(isValidLink(bad)).toBe(false);
    expect(isValidLink('<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>', 'maps_url')).toBe(true);
    expect(isValidLink('<iframe src="https://www.google.com/maps/embed?pb=1"></iframe>', 'instagram')).toBe(false);
  });

  it('email, telepon, warna, panjang maksimal', () => {
    expect(validateFieldValue(field('email'), 'halo@perusahaan.co.id')).toBeUndefined();
    expect(validateFieldValue(field('email'), 'halo@')).toMatch(/email/i);
    expect(validateFieldValue(field('phone'), '(021) 555-0123')).toBeUndefined();
    expect(validateFieldValue(field('phone'), '+62 812-3456-7890')).toBeUndefined();
    expect(validateFieldValue(field('phone'), '12ab')).toMatch(/Nomor/);
    expect(validateFieldValue(field('color'), '#211FFE')).toBeUndefined();
    expect(validateFieldValue(field('color'), '#abc')).toBeUndefined();
    expect(validateFieldValue(field('color'), 'biru')).toMatch(/hex/);
    expect(validateFieldValue(field('text', { maxLength: 5 }), 'enam!!')).toMatch(/Maksimal 5/);
  });

  it('konten bawaan setiap template lolos validasi (bisa langsung disimpan)', () => {
    for (const def of Object.values(TEMPLATES)) {
      expect(validateContent(def, resolveContent(def, null))).toEqual({});
    }
  });

  it('menghitung gambar baru (data-URI) di konten', () => {
    expect(countNewImages({ a: { logo: 'data:image/png;base64,AA', items: [{ image: 'data:image/jpeg;base64,BB' }, { image: '/assets/x.png' }] } })).toBe(2);
  });
});

// ─── SiteEditor dengan API tiruan ─────────────────────────────────────────────

interface MockSite {
  id: number;
  status: 'active' | 'suspended';
  template_code: string;
  content: Record<string, unknown> | null;
}

let site: MockSite;
let saved: unknown;

const siteOut = () => ({
  ...site,
  order_id: 1,
  order_number: 'GN-20261020-ABC123',
  user_id: 9,
  template_id: 1,
  template_name: 'Corporate Nexa',
  domain: 'contoh-usaha.test',
  activated_at: '2026-10-20 10:00:00',
  updated_at: '2026-10-20 10:00:00',
});

function mockApi(overrides: Partial<Record<string, () => Response>> = {}) {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const action = url.searchParams.get('action') ?? '';
      if (overrides[action]) return overrides[action]!();
      if (action === 'customer_get_site') return json(200, { success: true, site: siteOut() });
      if (action === 'customer_save_site_content') {
        const body = JSON.parse(String(init?.body));
        saved = body.content;
        // Server mengganti data-URI dengan path file
        site = { ...site, content: JSON.parse(JSON.stringify(body.content).replace(/data:image\/[^"]+/g, '/assets/sites/1/img_000000000000.png')) };
        return json(200, { success: true, site: siteOut() });
      }
      return json(404, { error: 'tidak ada' });
    }),
  );
}

const renderEditor = () =>
  render(
    <MemoryRouter initialEntries={['/akun/situs/1']}>
      <Routes>
        <Route path="/akun/situs/:siteId" element={<SiteEditor />} />
        <Route path="/akun" element={<p>Halaman akun</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('SiteEditor', () => {
  beforeEach(() => {
    // jsdom tidak punya API gulir elemen
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    site = { id: 1, status: 'active', template_code: 'corporate-nexa', content: null };
    saved = undefined;
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('memuat situs, mengedit field, pratinjau ikut berubah, lalu menyimpan', async () => {
    mockApi();
    renderEditor();
    expect(await screen.findByRole('heading', { name: 'Kelola konten situs' })).toBeInTheDocument();
    expect(screen.getByText(/masih memakai konten contoh/i)).toBeInTheDocument();

    const save = screen.getByRole('button', { name: /^Simpan$/ });
    expect(save).toBeDisabled();

    const companyName = screen.getByLabelText('Nama perusahaan') as HTMLInputElement;
    fireEvent.change(companyName, { target: { value: 'PT Uji Pratinjau' } });
    expect(save).toBeEnabled();
    expect(screen.getAllByText('Belum disimpan').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByLabelText('Pratinjau situs').textContent).toContain('PT Uji Pratinjau'));

    await act(async () => {
      fireEvent.click(save);
    });
    expect(await screen.findByText(/berhasil disimpan/i)).toBeInTheDocument();
    expect((saved as Record<string, Record<string, unknown>>).brand.company_name).toBe('PT Uji Pratinjau');
    expect(screen.getByRole('button', { name: /^Simpan$/ })).toBeDisabled();
  });

  it('isian tidak valid memblokir simpan dan menampilkan error di bawah field', async () => {
    mockApi();
    renderEditor();
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    fireEvent.change(screen.getByLabelText('Warna aksen'), { target: { value: 'biru' } });
    fireEvent.click(screen.getByRole('button', { name: /^Simpan$/ }));
    expect(await screen.findByText(/Warna harus berformat hex/)).toBeInTheDocument();
    expect(screen.getByText(/isian yang perlu diperbaiki/)).toBeInTheDocument();
    expect(saved).toBeUndefined();
  });

  it('sakelar section menyembunyikan bagian & list bisa ditambah/dihapus', async () => {
    mockApi();
    renderEditor();
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    const toggle = screen.getByRole('switch', { name: /Testimoni/ });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Buka section Layanan lalu tambah item
    fireEvent.click(screen.getByRole('button', { name: /^Layanan/ }));
    const add = screen.getByRole('button', { name: /Tambah layanan/ });
    const before = screen.getAllByRole('button', { name: /^Hapus Layanan/ }).length;
    fireEvent.click(add);
    expect(screen.getAllByRole('button', { name: /^Hapus Layanan/ })).toHaveLength(before + 1);
    fireEvent.click(screen.getAllByRole('button', { name: /^Hapus Layanan/ })[0]);
    expect(screen.getAllByRole('button', { name: /^Hapus Layanan/ })).toHaveLength(before);
    expect(screen.getByRole('button', { name: 'Urungkan' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Urungkan' }));
    expect(screen.getAllByRole('button', { name: /^Hapus Layanan/ })).toHaveLength(before + 1);
  });

  it('situs dinonaktifkan → hanya baca', async () => {
    site.status = 'suspended';
    mockApi();
    renderEditor();
    expect(await screen.findByText('Situs sedang dinonaktifkan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Simpan$/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nama perusahaan')).toBeDisabled();
  });

  it('template tidak dikenal & situs bukan milik sendiri', async () => {
    site.template_code = 'tidak-ada';
    mockApi();
    renderEditor();
    expect(await screen.findByText('Template tidak dikenal')).toBeInTheDocument();
    cleanup();

    mockApi({
      customer_get_site: () =>
        new Response(JSON.stringify({ error: 'Situs tidak ditemukan.', code: 'SITE_NOT_FOUND' }), { status: 404 }),
    });
    renderEditor();
    expect(await screen.findByText('Situs tidak ditemukan')).toBeInTheDocument();
  });
});
