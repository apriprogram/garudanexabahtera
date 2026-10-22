// @vitest-environment jsdom
// Jalankan: npx vitest run --dir src/pages/account/cms
import { act, cleanup, configure, fireEvent, getConfig, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATES, resolveContent } from '../../../../templates';
import type { TemplateField } from '../../../../templates/types';
import SiteEditor from '../../SiteEditor';
import { countNewImages } from '../content';
import { confirmLeave } from '../useLeaveGuard';
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
      // Pengaturan website publik (nomor WhatsApp untuk tautan bantuan)
      if (action === 'get_settings') return json(200, { footer_whatsapp: '0812-1111-2222' });
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

// Setiap langkah di sini merender ulang seluruh editor + pratinjau template (±1000 elemen jsdom). Sendirian tes terlama
// ±1 dtk, tetapi saat suite penuh berjalan paralel (worker lain, server `php -S`) atau mesin sibuk, memuat situs saja
// terukur 0,5–8 dtk dan satu tes sampai 11 dtk, melewati batas bawaan findBy*/waitFor (1 dtk) dan vitest (5 dtk).
// Batas dilonggarkan hanya untuk blok ini; tes yang benar-benar rusak tetap gagal, hanya lebih lambat.
describe('SiteEditor', { timeout: 30_000 }, () => {
  let defaultAsyncTimeout = 1000;
  beforeAll(() => {
    defaultAsyncTimeout = getConfig().asyncUtilTimeout;
    configure({ asyncUtilTimeout: 10_000 });
  });
  afterAll(() => configure({ asyncUtilTimeout: defaultAsyncTimeout }));

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
    vi.restoreAllMocks();
    localStorage.clear();
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

  it('situs dinonaktifkan → hanya baca, bantuan lewat WhatsApp', async () => {
    site.status = 'suspended';
    mockApi();
    renderEditor();
    expect(await screen.findByText('Situs sedang dinonaktifkan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Simpan$/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nama perusahaan')).toBeDisabled();
    const help = screen.getByRole('link', { name: /Hubungi kami via WhatsApp/ });
    await waitFor(() => expect(help.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
    expect(decodeURIComponent(help.getAttribute('href')!)).toContain('contoh-usaha.test');
    expect(help).toHaveAttribute('target', '_blank');
    // Situs nonaktif tidak menawarkan tautan sementara
    expect(screen.queryByRole('link', { name: /Buka situs sementara/ })).not.toBeInTheDocument();
  });

  it('template tidak dikenal → kembali ke pesanan + bantuan lewat WhatsApp (bukan /#kontak)', async () => {
    site.template_code = 'template-lama';
    mockApi();
    renderEditor();
    expect(await screen.findByText('Template tidak dikenal')).toBeInTheDocument();
    const help = screen.getByRole('link', { name: /Hubungi kami via WhatsApp/ });
    await waitFor(() => expect(help.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281211112222\?text=/));
    expect(decodeURIComponent(help.getAttribute('href')!)).toContain('contoh-usaha.test');
    expect(help).toHaveAttribute('target', '_blank');
    expect(document.querySelector('a[href="/#kontak"]')).toBeNull();
  });

  it('bilah atas HP: status simpan tidak dobel, teks pendek di HP, tautan sementara tanpa path mentah', async () => {
    mockApi();
    renderEditor();
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    // Kelas display ditentukan pemanggil; kelas dasar tanpa inline-flex (dulu mengalahkan `hidden` → status tampil dua kali)
    const statuses = screen.getAllByRole('status').filter((el) => /tersimpan/i.test(el.textContent ?? ''));
    expect(statuses).toHaveLength(2);
    const [desktop, phone] = statuses;
    expect(desktop.className.split(/\s+/)).toEqual(expect.arrayContaining(['hidden', 'md:inline-flex']));
    expect(desktop.className.split(/\s+/)).not.toContain('inline-flex');
    expect(phone.className.split(/\s+/)).toEqual(expect.arrayContaining(['inline-flex', 'md:hidden', 'min-w-0']));
    expect(within(phone).getByText('Tersimpan')).toHaveClass('sm:hidden');
    expect(within(phone).getByText('Semua perubahan tersimpan')).toHaveClass('max-sm:hidden');
    expect(screen.getByRole('button', { name: /Edit konten/ })).toHaveClass('max-sm:h-8');

    const temp = screen.getByRole('link', { name: /Buka situs sementara/ });
    expect(temp).toHaveAttribute('href', '/situs/1');
    expect(screen.queryByText('/situs/1')).not.toBeInTheDocument();

    // Bantuan Logo tidak mengulang format & batas ukuran
    const logoHelp = screen.getByText(/PNG\/SVG berlatar transparan/);
    expect(logoHelp).toHaveTextContent('Gambar besar otomatis diperkecil.');
    expect(logoHelp).not.toHaveTextContent('PNG, JPG, WEBP');
  });

  it('perubahan belum disimpan dicadangkan lokal dan bisa dipulihkan saat editor dibuka lagi', async () => {
    mockApi();
    renderEditor();
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    fireEvent.change(screen.getByLabelText('Nama perusahaan'), { target: { value: 'PT Draf Lokal' } });
    await waitFor(() => expect(localStorage.getItem('cms-draft-1')).toContain('PT Draf Lokal'));

    // Sesi habis / tab tertutup sebelum simpan → buka lagi
    cleanup();
    renderEditor();
    expect(await screen.findByText('Pulihkan perubahan yang belum disimpan?')).toBeInTheDocument();
    expect(screen.getByLabelText('Nama perusahaan')).not.toHaveValue('PT Draf Lokal');
    fireEvent.click(screen.getByRole('button', { name: 'Pulihkan' }));
    expect(screen.getByLabelText('Nama perusahaan')).toHaveValue('PT Draf Lokal');
    expect(screen.getByRole('button', { name: /^Simpan$/ })).toBeEnabled();

    // Setelah tersimpan di server, draf dihapus
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Simpan$/ }));
    });
    expect(await screen.findByText(/berhasil disimpan/i)).toBeInTheDocument();
    expect(localStorage.getItem('cms-draft-1')).toBeNull();
  });

  it('draf bisa dibuang; draf yang sama dengan isi server tidak ditawarkan', async () => {
    localStorage.setItem('cms-draft-1', JSON.stringify({ content: { brand: { company_name: 'PT Lama' } }, savedAt: Date.now() }));
    mockApi();
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Buang' }));
    expect(screen.queryByText('Pulihkan perubahan yang belum disimpan?')).not.toBeInTheDocument();
    expect(localStorage.getItem('cms-draft-1')).toBeNull();
    cleanup();

    const def = TEMPLATES['corporate-nexa'];
    localStorage.setItem('cms-draft-1', JSON.stringify({ content: resolveContent(def, null), savedAt: Date.now() }));
    renderEditor();
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    expect(screen.queryByText('Pulihkan perubahan yang belum disimpan?')).not.toBeInTheDocument();
    expect(localStorage.getItem('cms-draft-1')).toBeNull();
  });

  it('keluar akun dengan perubahan belum disimpan ditanyakan dulu (confirmLeave)', async () => {
    mockApi();
    renderEditor();
    await screen.findByRole('heading', { name: 'Kelola konten situs' });
    const confirm = vi.spyOn(window, 'confirm');
    // Tanpa perubahan: tidak bertanya
    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nama perusahaan'), { target: { value: 'PT Belum Simpan' } });
    confirm.mockReturnValueOnce(false);
    expect(confirmLeave()).toBe(false);
    confirm.mockReturnValueOnce(true);
    expect(confirmLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);

    // Sudah setuju pergi: beforeunload (logout → /masuk) tidak memunculkan dialog kedua
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
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
