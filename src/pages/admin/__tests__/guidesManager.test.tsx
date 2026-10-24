// @vitest-environment jsdom
// Tab Panduan (Pengaturan website): daftar artikel dari admin_get_guides, form tambah/edit (admin_save_guide), hapus
// dengan konfirmasi (admin_delete_guide), pratinjau draf, dan penolong murni form (slug, validasi).
// Jalankan: npx vitest run src/pages/admin/__tests__/guidesManager.test.tsx
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTHOR_NAME } from '../../../content/authors';
import type { AdminGuide } from '../../../content/panduan/core';
import { GuidesManager } from '../guides/GuidesManager';
import {
  PLACEHOLDER_EXAMPLES,
  cleanSlugInput,
  draftFromGuide,
  inputFromDraft,
  normalizeGuide,
  relinkGuides,
  renameRelated,
  slugify,
  titleKey,
  validateDraft,
  type GuideDraft,
} from '../guides/guideModel';

// Isi pratinjau = GuideBody asli, kecuali bodyCrash.on menyala: render gagal, untuk tes PreviewErrorBoundary
const bodyCrash = vi.hoisted(() => ({ on: false }));
vi.mock('../guides/GuideBody', async (importOriginal) => {
  const { createElement } = await import('react');
  const actual = await importOriginal<typeof import('../guides/GuideBody')>();
  return {
    default: (props: Parameters<typeof actual.default>[0]) => {
      if (bodyCrash.on) throw new Error('Pratinjau rusak (tes)');
      return createElement(actual.default, props);
    },
  };
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// Isi pratinjau dimuat lazy (react-markdown): modulnya dimuat sekali di sini, supaya tes pratinjau tidak bergantung pada
// lama impor pertama di jsdom (bisa > 20 detik saat mesin sibuk)
beforeAll(async () => {
  await import('../guides/GuideBody');
}, 120_000);

const BODY = `## Rincian biaya\n\n${'Biaya website company profile terdiri dari domain, hosting, desain, dan perawatan tahunan. '.repeat(4)}`;

const PUBLISHED: AdminGuide = {
  id: 1,
  slug: 'biaya-website-company-profile',
  title: 'Biaya website company profile 2026',
  description: 'Rincian biaya domain, hosting, desain, dan perawatan website company profile beserta contoh angkanya.',
  body: BODY,
  author: DEFAULT_AUTHOR_NAME,
  datePublished: '2026-10-20',
  dateModified: '2026-10-22',
  reviewed: '2026-10-22',
  cta: 'website',
  sources: ['https://www.bps.go.id/data'],
  related: ['website-klinik-kecantikan'],
  views: 1234,
  createdAt: '2026-10-20 09:00:00',
  updatedAt: '2026-10-22 09:00:00',
};

const DRAFT: AdminGuide = {
  ...PUBLISHED,
  id: 2,
  slug: 'website-klinik-kecantikan',
  title: 'Website klinik kecantikan',
  description: 'Fitur yang dibutuhkan website klinik kecantikan: jadwal, galeri perawatan, dan tombol konsultasi WhatsApp.',
  body: `## Fitur wajib\n\n${'Klinik kecantikan butuh jadwal dokter, galeri sebelum-sesudah, dan tombol WhatsApp. '.repeat(4)}`,
  reviewed: null,
  related: [],
  views: 0,
};

type Body = Record<string, unknown> & { action: string };

/** fetch tiruan: aksi panduan admin + get_templates (pratinjau). `calls` = semua POST, berurutan. */
function mockGuidesApi({
  guides = [PUBLISHED, DRAFT],
  hubViews = 5678,
  list,
  save,
}: {
  guides?: AdminGuide[];
  hubViews?: number;
  list?: () => Response | Promise<Response>;
  save?: (body: Body) => Response | Promise<Response>;
} = {}) {
  const calls: Body[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Body;
      calls.push(body);
      if (body.action === 'admin_get_guides') return list ? list() : json({ success: true, guides, hubViews });
      if (body.action === 'admin_save_guide') {
        if (save) return save(body);
        const { action: _action, published, ...rest } = body;
        void _action;
        return json({
          success: true,
          guide: { ...rest, id: body.id ?? 3, dateModified: '2026-10-24', reviewed: published ? '2026-10-24' : null, views: 0, createdAt: '', updatedAt: '' },
        });
      }
      if (body.action === 'admin_delete_guide') return json({ success: true });
    }
    if (url.includes('get_templates')) return json({ templates: [] });
    return json({ error: 'Aksi tidak dikenal' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

const notify = vi.fn();
const renderManager = () =>
  render(
    <MemoryRouter>
      <GuidesManager notify={notify} />
    </MemoryRouter>,
  );

beforeEach(() => {
  notify.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('penolong form artikel', () => {
  it('slug dari judul: huruf kecil a-z, angka, dan "-"', () => {
    expect(slugify('Biaya Website & Hosting 2026: Rincian Lengkap!')).toBe('biaya-website-hosting-2026-rincian-lengkap');
    expect(slugify('  Kafé  Ünik  ')).toBe('kafe-unik');
    expect(slugify('x'.repeat(200))).toHaveLength(120);
    expect(cleanSlugInput('Biaya Website_Baru--2026?')).toBe('biaya-website-baru-2026');
    expect(cleanSlugInput('biaya-')).toBe('biaya-');
  });

  it('validasi sama dengan GUIDE_LIMITS: wajib, panjang, slug ganda, URL sumber, tanggal', () => {
    const empty = draftFromGuide(null, [], '2026-10-24');
    expect(Object.keys(validateDraft(empty, [], '2026-10-24')).sort()).toEqual(['body', 'description', 'slug', 'title']);

    const draft: GuideDraft = {
      ...draftFromGuide(PUBLISHED, [DRAFT], '2026-10-24'),
      title: 'x'.repeat(61),
      slug: DRAFT.slug,
      description: 'Terlalu pendek.',
      body: 'Pendek.',
      sources: 'https://www.bps.go.id/data\n\nbukan url',
      datePublished: '2026-10-25',
    };
    const errors = validateDraft(draft, [DRAFT], '2026-10-24');
    expect(errors.title).toMatch(/maks\. 60/);
    expect(errors.slug).toBe('Slug ini sudah dipakai artikel lain.');
    expect(errors.description).toMatch(/minimal 50/);
    expect(errors.body).toMatch(/minimal 200/);
    expect(errors.sources).toMatch(/^Baris 3 /);
    expect(errors.datePublished).toBe('Tanggal terbit tidak boleh setelah hari ini.');

    expect(validateDraft(draftFromGuide(PUBLISHED, [DRAFT], '2026-10-24'), [DRAFT], '2026-10-24')).toEqual({});
  });

  it('judul ganda (spasi & huruf besar diabaikan) ditolak, sama dengan TITLE_TAKEN server', () => {
    expect(titleKey('  Website\u00a0 Klinik\tKECANTIKAN ')).toBe('website klinik kecantikan');
    const base = draftFromGuide(PUBLISHED, [DRAFT], '2026-10-24');
    expect(validateDraft({ ...base, title: ' WEBSITE  klinik kecantikan ' }, [DRAFT], '2026-10-24').title).toBe('Judul sudah dipakai artikel lain.');
    // Judul artikel itu sendiri tidak dihitung (others tanpa artikel yang diedit)
    expect(validateDraft(base, [DRAFT], '2026-10-24').title).toBeUndefined();
  });

  it('token data salah di isi ditolak, dengan daftar token yang sah', () => {
    const base = draftFromGuide(PUBLISHED, [DRAFT], '2026-10-24');
    const bodyError = (body: string) => validateDraft({ ...base, body: `${BODY}\n\n${body}` }, [DRAFT], '2026-10-24').body;
    expect(PLACEHOLDER_EXAMPLES).toEqual([
      '{{harga_template_rentang}}',
      '{{harga_template_min}}',
      '{{jumlah_template}}',
      '{{tanggal_harga}}',
      '{{template:slug-template}}',
      '{{harga:slug-template}}',
    ]);
    expect(bodyError('Mulai {{harga_template_minimal}}.')).toBe(
      `Token tidak dikenal: {{harga_template_minimal}}. Token yang sah: ${PLACEHOLDER_EXAMPLES.join(', ')}.`,
    );
    expect(bodyError('Template {{template}}.')).toMatch(/^Argumen token salah: \{\{template\}\}\. /);
    expect(bodyError('Harga {{Harga_Template_Min}}.')).toMatch(/^Ada "\{\{" atau "\}\}" yang bukan token yang sah\. /);
    expect(bodyError('Mulai {{harga_template_min}}, {{harga:aura-studio|lihat katalog}}.')).toBeUndefined();
  });

  it('URL sumber: aturan server (pola tanpa spasi, http(s) huruf kecil, maks. 500 karakter) dengan nomor baris', () => {
    const base = draftFromGuide(PUBLISHED, [DRAFT], '2026-10-24');
    const sourcesError = (sources: string) => validateDraft({ ...base, sources }, [DRAFT], '2026-10-24').sources;
    expect(sourcesError('https://a.id/x\n\nhttps://www.bps.go.id/data (diakses Okt 2026)')).toMatch(/^Baris 3 bukan URL yang sah: .*tanpa spasi/);
    expect(sourcesError('HTTPS://www.bps.go.id/data')).toMatch(/^Baris 1 bukan URL yang sah/);
    expect(sourcesError('https://localhost/data')).toMatch(/^Baris 1 bukan URL yang sah/);
    expect(sourcesError(`https://a.id/${'x'.repeat(500)}`)).toBe('Baris 1 terlalu panjang (maks. 500 karakter).');
    expect(sourcesError(`https://a.id/${'x'.repeat(487)}\n http://b.id/y?q=1 `)).toBeUndefined();
  });

  it('related ikut slug yang diganti atau dihapus (sama dengan renameRelated server)', () => {
    expect(renameRelated(['a', 'b', 'c'], 'b', 'b2')).toEqual(['a', 'b2', 'c']);
    expect(renameRelated(['a', 'b', 'b2'], 'b', 'b2')).toEqual(['a', 'b2']);
    expect(renameRelated(['a', 'b'], 'b', null)).toEqual(['a']);
    const [published, draft] = relinkGuides([PUBLISHED, DRAFT], DRAFT.slug, null);
    expect(published.related).toEqual([]);
    expect(draft).toBe(DRAFT);
  });

  it('isian GuideInput: sumber per baris tanpa baris kosong/ganda, artikel terkait yang sudah dihapus dibuang', () => {
    const draft = draftFromGuide({ ...PUBLISHED, related: ['website-klinik-kecantikan', 'sudah-dihapus'] }, [DRAFT]);
    expect(draft.related).toEqual(['website-klinik-kecantikan']);
    expect(inputFromDraft({ ...draft, sources: ' https://a.id/x \n\nhttps://a.id/x\nhttps://b.id/y', slug: '-slug-baru-' }, 1)).toEqual({
      id: 1,
      slug: 'slug-baru',
      title: PUBLISHED.title,
      description: PUBLISHED.description,
      body: PUBLISHED.body.trim(),
      author: DEFAULT_AUTHOR_NAME,
      cta: 'website',
      sources: ['https://a.id/x', 'https://b.id/y'],
      related: ['website-klinik-kecantikan'],
      datePublished: '2026-10-20',
      published: true,
    });
  });

  it('baris dari PHP dirapikan (angka berupa string, reviewed kosong = draf)', () => {
    expect(normalizeGuide({ ...PUBLISHED, id: '7', views: '42', reviewed: '' })).toMatchObject({ id: 7, views: 42, reviewed: null });
    expect(normalizeGuide({ title: 'tanpa id' })).toBeNull();
  });
});

describe('GuidesManager: daftar', () => {
  it('memuat admin_get_guides: judul, penulis & tanggal, status, jumlah dilihat, dan dilihatnya /panduan', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    expect(screen.getByText('Memuat artikel...')).toBeInTheDocument();

    expect(await screen.findByText('Artikel (2)')).toBeInTheDocument();
    expect(calls[0]).toEqual({ action: 'admin_get_guides' });
    expect(screen.getByText(/Halaman \/panduan dilihat/)).toHaveTextContent('Halaman /panduan dilihat 5.678 kali');

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(PUBLISHED.title)).toBeInTheDocument();
    expect(within(rows[0]).getByText(`${DEFAULT_AUTHOR_NAME} · Diperbarui 22 Oktober 2026`)).toBeInTheDocument();
    expect(within(rows[0]).getByText('Terbit')).toBeInTheDocument();
    expect(within(rows[0]).getByText('1.234 dilihat')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Draf')).toBeInTheDocument();
    expect(within(rows[1]).getByText('0 dilihat')).toBeInTheDocument();

    // Terbit → buka halaman artikel di tab baru; draf → pratinjau di dialog
    const view = within(rows[0]).getByRole('link', { name: `Lihat ${PUBLISHED.title} (tab baru)` });
    expect(view).toHaveAttribute('href', `/panduan/${PUBLISHED.slug}`);
    expect(view).toHaveAttribute('target', '_blank');
    expect(within(rows[1]).getByRole('button', { name: `Lihat pratinjau ${DRAFT.title}` })).toBeInTheDocument();
  });

  it('kosong: "Belum ada artikel"', async () => {
    mockGuidesApi({ guides: [], hubViews: 0 });
    renderManager();
    expect(await screen.findByText('Belum ada artikel')).toBeInTheDocument();
    expect(screen.getByText('Artikel (0)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah artikel' })).toBeEnabled();
  });

  it('gagal muat: pesan server + "Coba lagi" memuat ulang', async () => {
    let fail = true;
    mockGuidesApi({ list: () => (fail ? json({ error: 'Sesi berakhir.' }, 401) : json({ success: true, guides: [PUBLISHED], hubViews: 1 })) });
    renderManager();
    expect(await screen.findByText('Gagal memuat artikel')).toBeInTheDocument();
    expect(screen.getByText('Sesi berakhir.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah artikel' })).toBeDisabled();

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Artikel (1)')).toBeInTheDocument();
  });

  it('pratinjau draf: H1, deskripsi, dan isi Markdown', async () => {
    mockGuidesApi();
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Lihat pratinjau ${DRAFT.title}` }));
    const dialog = await screen.findByRole('dialog', { name: 'Pratinjau artikel' });
    expect(within(dialog).getByRole('heading', { level: 1, name: DRAFT.title })).toBeInTheDocument();
    expect(within(dialog).getByText(DRAFT.description)).toBeInTheDocument();
    // Isi dirender ArticleMarkdown yang dimuat lazy (react-markdown): impor pertama di jsdom bisa lambat
    expect(await within(dialog).findByRole('heading', { level: 2, name: 'Fitur wajib' }, { timeout: 20_000 })).toBeInTheDocument();
    // Isi tanpa "## Sumber": kolom Sumber tampil sebagai bagian Sumber di akhir, sama dengan halaman artikel
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Sumber' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /www\.bps\.go\.id\/data/ })).toHaveAttribute('href', 'https://www.bps.go.id/data');
  }, 30_000);
});

const field = (label: RegExp | string) => screen.getByLabelText(label);
const openCreate = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Tambah artikel' }));
  return screen.findByRole('dialog', { name: 'Tambah artikel' });
};

describe('GuidesManager: tambah & edit', () => {
  it('tambah: slug mengikuti judul, Simpan mengirim admin_save_guide berbentuk GuideInput (tanpa id)', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    await openCreate();

    fireEvent.change(field(/^Judul/), { target: { value: 'Biaya Aplikasi Android & iOS' } });
    expect(field(/^Slug/)).toHaveValue('biaya-aplikasi-android-ios');
    expect(screen.getByText('/panduan/biaya-aplikasi-android-ios')).toBeInTheDocument();
    fireEvent.change(field(/^Deskripsi/), {
      target: { value: 'Kisaran biaya membuat aplikasi Android dan iOS, dari fitur dasar sampai integrasi pembayaran.' },
    });
    fireEvent.change(field(/^Isi artikel/), { target: { value: BODY } });
    fireEvent.change(field('Ajakan di akhir artikel'), { target: { value: 'mobile' } });
    fireEvent.change(field(/^Sumber/), { target: { value: 'https://developer.android.com/distribute\n' } });
    fireEvent.click(screen.getByRole('checkbox', { name: PUBLISHED.title }));
    fireEvent.change(field(/^Tanggal terbit/), { target: { value: '2026-10-23' } });
    fireEvent.click(screen.getByRole('switch', { name: /^Terbitkan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(calls.filter((call) => call.action === 'admin_save_guide')).toHaveLength(1));
    const sent = calls.find((call) => call.action === 'admin_save_guide')!;
    expect(sent).toEqual({
      action: 'admin_save_guide',
      slug: 'biaya-aplikasi-android-ios',
      title: 'Biaya Aplikasi Android & iOS',
      description: 'Kisaran biaya membuat aplikasi Android dan iOS, dari fitur dasar sampai integrasi pembayaran.',
      body: BODY.trim(),
      author: DEFAULT_AUTHOR_NAME,
      cta: 'mobile',
      sources: ['https://developer.android.com/distribute'],
      related: [PUBLISHED.slug],
      datePublished: '2026-10-23',
      published: true,
    });

    // Baris baru di atas, dialog tertutup, notifikasi sukses
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah artikel' })).not.toBeInTheDocument());
    expect(screen.getByText('Artikel (3)')).toBeInTheDocument();
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Biaya Aplikasi Android & iOS')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('success', 'Artikel berhasil ditambahkan.', 'Terbit di /panduan/biaya-aplikasi-android-ios.');
  }, 30_000);

  it('isian belum sah tidak dikirim; error tampil di bawah kolomnya', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    await openCreate();
    fireEvent.change(field(/^Judul/), { target: { value: 'Pendek' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Judul minimal 10 karakter.')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Isi artikel wajib diisi.')).toBeInTheDocument();
    expect(calls.some((call) => call.action === 'admin_save_guide')).toBe(false);
  });

  it('error dari server: pesan umum di atas form, error per kolom di bawah kolomnya', async () => {
    mockGuidesApi({ save: () => json({ error: 'Periksa lagi isian artikel.', errors: { slug: 'Slug sudah dipakai artikel lain.' } }, 422) });
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${DRAFT.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Gagal menyimpan: Periksa lagi isian artikel.')).toBeInTheDocument();
    expect(screen.getByText('Slug sudah dipakai artikel lain.')).toBeInTheDocument();
    expect(field(/^Slug/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('edit: isian terisi, slug tidak ikut judul, id ikut terkirim', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${PUBLISHED.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    expect(field(/^Judul/)).toHaveValue(PUBLISHED.title);
    expect(screen.getByRole('switch', { name: /^Terbitkan/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: /Website klinik kecantikan/ })).toBeChecked();

    fireEvent.change(field(/^Judul/), { target: { value: 'Biaya website company profile terbaru' } });
    expect(field(/^Slug/)).toHaveValue(PUBLISHED.slug);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(calls.some((call) => call.action === 'admin_save_guide')).toBe(true));
    expect(calls.find((call) => call.action === 'admin_save_guide')).toMatchObject({
      id: 1,
      slug: PUBLISHED.slug,
      title: 'Biaya website company profile terbaru',
      published: true,
    });
    expect(await screen.findByText('Biaya website company profile terbaru')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('success', 'Artikel berhasil diperbarui.', `Terbit di /panduan/${PUBLISHED.slug}.`);
  });

  it('menutup form yang sudah diubah ditanya dulu', async () => {
    mockGuidesApi();
    renderManager();
    await openCreate();
    fireEvent.change(field(/^Judul/), { target: { value: 'Judul yang belum disimpan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    expect(await screen.findByText('Buang perubahan?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut menyunting' }));
    await waitFor(() => expect(screen.queryByText('Buang perubahan?')).not.toBeInTheDocument());
    expect(field(/^Judul/)).toHaveValue('Judul yang belum disimpan');

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, buang' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah artikel' })).not.toBeInTheDocument());
  }, 30_000);

  it('artikel baru: slug yang dikosongkan kembali otomatis dari judul (kolom ditinggalkan, atau langsung Simpan)', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    await openCreate();
    fireEvent.change(field(/^Judul/), { target: { value: 'Biaya Aplikasi Android & iOS' } });
    fireEvent.change(field(/^Slug/), { target: { value: '' } });
    expect(field(/^Slug/)).toHaveValue('');
    expect(screen.getByText('/panduan/biaya-aplikasi-android-ios')).toBeInTheDocument();
    fireEvent.blur(field(/^Slug/));
    expect(field(/^Slug/)).toHaveValue('biaya-aplikasi-android-ios');

    fireEvent.change(field(/^Slug/), { target: { value: '' } });
    fireEvent.change(field(/^Deskripsi/), {
      target: { value: 'Kisaran biaya membuat aplikasi Android dan iOS, dari fitur dasar sampai integrasi pembayaran.' },
    });
    fireEvent.change(field(/^Isi artikel/), { target: { value: BODY } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(calls.find((call) => call.action === 'admin_save_guide')).toMatchObject({ slug: 'biaya-aplikasi-android-ios' }),
    );
  });

  it('judul ganda ditolak di form; 409 TITLE_TAKEN dari server tampil di bawah Judul', async () => {
    const taken = 'Judul sudah dipakai artikel lain.';
    const { calls } = mockGuidesApi({ save: () => json({ error: taken, code: 'TITLE_TAKEN', errors: { title: taken } }, 409) });
    renderManager();
    await openCreate();
    fireEvent.change(field(/^Judul/), { target: { value: ` ${PUBLISHED.title.toUpperCase()} ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText(taken)).toBeInTheDocument();
    expect(calls.some((call) => call.action === 'admin_save_guide')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, buang' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tambah artikel' })).not.toBeInTheDocument());

    // Judul yang bentrok baru diketahui server (mis. artikel tab lain): pesan di atas form dan di bawah Judul
    fireEvent.click(screen.getByRole('button', { name: `Edit ${DRAFT.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText(`Gagal menyimpan: ${taken}`)).toBeInTheDocument();
    expect(screen.getByText(taken)).toBeInTheDocument();
    expect(field(/^Judul/)).toHaveAttribute('aria-invalid', 'true');
  }, 30_000);

  it('ganti slug artikel yang ditautkan situs (draf juga): peringatan, dan related artikel lain ikut slug baru', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${DRAFT.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    expect(screen.queryByText(/ditautkan dari halaman \/harga/)).not.toBeInTheDocument();
    fireEvent.change(field(/^Slug/), { target: { value: 'website-klinik-kecantikan-2026' } });
    expect(screen.getByText(/ditautkan dari halaman \/harga, halaman jasa, halaman kategori, dan halaman template/)).toHaveTextContent(
      `/panduan/${DRAFT.slug}`,
    );
    // Draf: belum ada URL terbit yang putus
    expect(screen.queryByText(/Artikel ini sudah terbit/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(calls.some((call) => call.action === 'admin_save_guide')).toBe(true));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit artikel' })).not.toBeInTheDocument());
    expect(notify).toHaveBeenCalledWith('success', 'Artikel berhasil diperbarui.', 'Tersimpan sebagai draf, belum tampil di website.');

    // Artikel yang menautkannya kini menautkan slug baru (server mengganti `related` di transaksi yang sama)
    fireEvent.click(screen.getByRole('button', { name: `Edit ${PUBLISHED.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    expect(screen.getByRole('checkbox', { name: /Website klinik kecantikan/ })).toBeChecked();
  }, 30_000);

  it('artikel terbit: ganti slug atau jadikan draf → notifikasi menyebut halaman lama sampai deploy berikutnya', async () => {
    mockGuidesApi();
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${PUBLISHED.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    fireEvent.change(field(/^Slug/), { target: { value: 'biaya-website-company-profile-2026' } });
    expect(screen.getByText(/Artikel ini sudah terbit/)).toBeInTheDocument();
    expect(screen.getByText(/ditautkan dari halaman \/harga/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'success',
        'Artikel berhasil diperbarui.',
        'Terbit di /panduan/biaya-website-company-profile-2026. Alamat lama /panduan/biaya-website-company-profile masih terlihat oleh ' +
          'mesin pencari dan pengunjung tanpa JavaScript sampai deploy berikutnya.',
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit artikel' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: `Edit ${PUBLISHED.title}` }));
    await screen.findByRole('dialog', { name: 'Edit artikel' });
    fireEvent.click(screen.getByRole('switch', { name: /^Terbitkan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() =>
      expect(notify).toHaveBeenLastCalledWith(
        'success',
        'Artikel berhasil diperbarui.',
        'Tersimpan sebagai draf, tidak lagi tampil di website. Halaman lamanya masih terlihat oleh mesin pencari dan pengunjung ' +
          'tanpa JavaScript sampai deploy berikutnya.',
      ),
    );
  }, 30_000);

  it('pratinjau yang gagal dimuat: pesan + "Coba lagi" di tempatnya, form tetap terbuka dengan isiannya', async () => {
    mockGuidesApi();
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    bodyCrash.on = true;
    try {
      renderManager();
      fireEvent.click(await screen.findByRole('button', { name: `Edit ${DRAFT.title}` }));
      await screen.findByRole('dialog', { name: 'Edit artikel' });
      fireEvent.change(field(/^Judul/), { target: { value: 'Website klinik kecantikan modern' } });
      fireEvent.click(screen.getByRole('tab', { name: 'Pratinjau' }));
      expect(await screen.findByText('Pratinjau gagal dimuat', undefined, { timeout: 20_000 })).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Edit artikel' })).toBeInTheDocument();

      bodyCrash.on = false;
      fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
      // Dicek di dalam waitFor: isi dirender ulang (elemen baru) setelah data template termuat
      await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Fitur wajib' })).toBeInTheDocument(), { timeout: 20_000 });
      expect(screen.queryByText('Pratinjau gagal dimuat')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: 'Tulis' }));
      expect(field(/^Judul/)).toHaveValue('Website klinik kecantikan modern');
    } finally {
      bodyCrash.on = false;
      quiet.mockRestore();
    }
  }, 30_000);
});

describe('GuidesManager: hapus', () => {
  it('Hapus meminta konfirmasi yang menyebut artikelnya, lalu mengirim admin_delete_guide', async () => {
    const { calls } = mockGuidesApi();
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Hapus ${DRAFT.title}` }));

    const dialog = await screen.findByRole('dialog', { name: 'Hapus artikel?' });
    expect(dialog).toHaveTextContent(`“${DRAFT.title}”`);
    // Slug yang ditautkan kode situs (PLANNED_ARTICLE_SLUGS): disebut di konfirmasi
    expect(dialog).toHaveTextContent(`Alamat /panduan/${DRAFT.slug} ditautkan dari halaman /harga`);
    expect(calls.some((call) => call.action === 'admin_delete_guide')).toBe(false);

    // Batal: tidak ada yang dihapus
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hapus artikel?' })).not.toBeInTheDocument());
    expect(calls.some((call) => call.action === 'admin_delete_guide')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: `Hapus ${DRAFT.title}` }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Hapus artikel?' })).getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() => expect(calls.filter((call) => call.action === 'admin_delete_guide')).toEqual([{ action: 'admin_delete_guide', id: 2 }]));
    await waitFor(() => expect(screen.queryByText(DRAFT.title)).not.toBeInTheDocument());
    expect(screen.getByText('Artikel (1)')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('success', 'Artikel berhasil dihapus.', `Draf “${DRAFT.title}” sudah dihapus.`);
  });

  it('hapus artikel terbit: notifikasi menyebut halaman lama sampai deploy berikutnya', async () => {
    mockGuidesApi();
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: `Hapus ${PUBLISHED.title}` }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Hapus artikel?' })).getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'success',
        'Artikel berhasil dihapus.',
        `“${PUBLISHED.title}” tidak lagi tampil di website. Halaman lamanya masih terlihat oleh mesin pencari dan pengunjung ` +
          'tanpa JavaScript sampai deploy berikutnya.',
      ),
    );
  });

  it('gagal hapus: artikel tetap di daftar, notifikasi error dengan pesan server', async () => {
    const { fetchMock } = mockGuidesApi();
    renderManager();
    await screen.findByText('Artikel (2)');
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) =>
      init?.method === 'POST' && String(init.body).includes('admin_delete_guide') ? json({ error: 'Artikel tidak ditemukan.' }, 404) : base(input, init),
    );

    fireEvent.click(screen.getByRole('button', { name: `Hapus ${PUBLISHED.title}` }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Hapus artikel?' })).getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('error', 'Gagal menghapus artikel.', 'Artikel tidak ditemukan.'));
    expect(screen.getByText('Artikel (2)')).toBeInTheDocument();
  });
});
