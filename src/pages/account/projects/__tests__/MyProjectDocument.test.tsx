// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/account/projects/__tests__
// /akun/proyek/:id/dokumen/:docId: pratinjau, unduh PDF/DOCX, setujui (+ tanda tangan Pihak Kedua, hapus gambar dengan
// konfirmasi), minta revisi, toast sukses/gagal.
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocModel } from '../../../../features/project-docs/engine';
import { pksDoc } from './fixtures';

configure({ asyncUtilTimeout: 5000 });

const api = vi.hoisted(() => ({
  pdMyDocument: vi.fn(),
  pdMyDocumentDecide: vi.fn(),
  pdMyProject: vi.fn(),
  downloadPdFile: vi.fn(),
}));
vi.mock('../../../../features/project-docs/api', () => api);

vi.mock('../../../../lib/auth', () => ({ getCurrentUser: () => ({ id: 9, name: 'Sari (akun)', email: 'sari@klien.test', role: 'customer' }) }));

// Pratinjau A4 diganti daftar judul blok + slot tanda tangan: tes ini memeriksa halaman, bukan tata letak kertas
const engine = vi.hoisted(() => ({ exportPdf: vi.fn(), exportDocx: vi.fn() }));
vi.mock('../../../../features/project-docs/engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../features/project-docs/engine')>()),
  ...engine,
  DocumentPreview: ({ model }: { model: DocModel }) => (
    <div data-testid="preview">
      {model.blocks.map((b, i) => (b.type === 'heading' ? <p key={i}>{b.text}</p> : null))}
      {model.signatures.map((s) => (
        <span key={s.party} data-testid={`slot-${s.party}`} data-src={s.image_src ?? ''} />
      ))}
    </div>
  ),
}));

import { ApiError } from '../../../../lib/api';
import type { ProjectNavState } from '../components/projectCopy';
import MyProjectDocument from '../MyProjectDocument';

function renderDoc(path = '/akun/proyek/3/dokumen/20') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/proyek/:id/dokumen/:docId" element={<MyProjectDocument />} />
        <Route path="/akun/proyek/:id" element={<ProjectPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Halaman proyek tiruan yang menampilkan pesan dari state router. */
function ProjectPage() {
  const state = useLocation().state as ProjectNavState | null;
  return (
    <>
      <p>Halaman proyek</p>
      {state?.toast && <p data-testid="nav-toast">{state.toast.message}</p>}
    </>
  );
}

/** Coretan di area tanda tangan (kanvas jsdom tanpa konteks 2D: gambar tidak bisa diproses, tetapi tombol Hapus aktif). */
function scribble(pad: HTMLElement) {
  fireEvent.pointerDown(pad, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 40, clientY: 60 });
  fireEvent.pointerMove(pad, { pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 90 });
  fireEvent.pointerUp(pad, { pointerId: 1, pointerType: 'mouse', clientX: 120, clientY: 90 });
}

beforeEach(() => {
  for (const fn of [...Object.values(api), ...Object.values(engine)]) fn.mockReset();
  // Tanpa kanvas 2D di jsdom: pratinjau tanda tangan ketik jatuh ke teks biasa
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Dokumen proyek (pembeli)', () => {
  it('menampilkan pratinjau, status, dan tombol keputusan untuk dokumen yang menunggu', async () => {
    api.pdMyDocument.mockResolvedValue({ success: true, document: pksDoc() });
    renderDoc();

    expect(await screen.findByRole('heading', { level: 1, name: 'Perjanjian Kerja Sama Pembuatan Website' })).toBeInTheDocument();
    expect(api.pdMyDocument).toHaveBeenCalledWith({ id: 20 });
    expect(screen.getByTestId('preview')).toHaveTextContent('PERJANJIAN KERJA SAMA PEMBUATAN WEBSITE');
    expect(screen.getByText('Dokumen ini menunggu persetujuan Anda')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Setujui & tandatangani|Setujui & tanda tangan/ })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /Minta revisi/ })).toHaveLength(2);
    // Dua slot tanda tangan, keduanya belum ditandatangani
    const card = screen.getByRole('region', { name: 'Tanda tangan' });
    expect(within(card).getAllByText('Belum ditandatangani')).toHaveLength(2);
  });

  it('setujui + tanda tangan: wajib tanda tangan dan centang persetujuan, lalu kirim typed_name', async () => {
    api.pdMyDocument
      .mockResolvedValueOnce({ success: true, document: pksDoc() })
      .mockResolvedValue({ success: true, document: pksDoc({ status: 'disetujui', signed_parties: ['pihak_kedua'] }) });
    api.pdMyDocumentDecide.mockResolvedValue({ success: true, status: 'disetujui', version: 2 });
    renderDoc();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Setujui & tandatangani' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Setujui & tandatangani' });
    // Nama & jabatan bawaan dari PIC klien
    expect(within(dialog).getByLabelText('Nama penanda tangan')).toHaveValue('Sari Wulandari');
    expect(within(dialog).getByLabelText(/Jabatan/)).toHaveValue('Manajer TI');
    expect(within(dialog).getByLabelText('Nama penanda tangan')).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Setujui & tandatangani' }));
    expect(within(dialog).getByText('Bubuhkan tanda tangan dulu: gambar atau ketik nama Anda.')).toBeInTheDocument();
    expect(within(dialog).getByText('Centang persetujuan untuk menandatangani.')).toBeInTheDocument();
    expect(api.pdMyDocumentDecide).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('radio', { name: 'Ketik nama' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Saya menyetujui isi dokumen ini dan menandatanganinya secara elektronik' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Setujui & tandatangani' }));

    await waitFor(() =>
      expect(api.pdMyDocumentDecide).toHaveBeenCalledWith({
        id: 20,
        decision: 'approved',
        signature: { method: 'type', typed_name: 'Sari Wulandari' },
        signer_name: 'Sari Wulandari',
        signer_title: 'Manajer TI',
        // the reviewed version: a document changed meanwhile is refused (409)
        content_hash: 'a'.repeat(64),
      }),
    );
    expect(await screen.findByText('Dokumen disetujui dan ditandatangani')).toBeInTheDocument();
    expect(screen.getByText('Dokumen "Perjanjian Kerja Sama Pembuatan Website" berhasil disetujui dan ditandatangani.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.pdMyDocument).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Menunggu tanda tangan kami', { selector: 'p' })).toBeInTheDocument();
  });

  it('Hapus gambar tanda tangan minta konfirmasi; Esc hanya menutup konfirmasi, dialog tanda tangan tetap', async () => {
    api.pdMyDocument.mockResolvedValue({ success: true, document: pksDoc() });
    renderDoc();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Setujui & tandatangani' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Setujui & tandatangani' });
    scribble(within(dialog).getByRole('img', { name: /Area tanda tangan/ }));
    const clear = within(dialog).getByRole('button', { name: 'Hapus' });
    expect(clear).toBeEnabled();

    clear.focus();
    fireEvent.click(clear);
    const confirm = screen.getByRole('alertdialog', { name: 'Hapus gambar tanda tangan?' });
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Setujui & tandatangani' })).toBeInTheDocument();
    expect(clear).toBeEnabled();
    expect(confirm).not.toBeInTheDocument();

    fireEvent.click(clear);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ya, hapus' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Hapus' })).toBeDisabled();
    // Tombol Hapus nonaktif setelah dihapus: fokus pindah ke pilihan cara tanda tangan, bukan <body>
    expect(document.activeElement).toBe(within(dialog).getByRole('radio', { name: 'Gambar' }));
    expect(api.pdMyDocumentDecide).not.toHaveBeenCalled();
  });

  it('dokumen tanpa tanda tangan disetujui lewat dialog konfirmasi', async () => {
    const brd = pksDoc({ id: 10, doc_type: 'brd', number: '001/BRD/GNB/X/2026', title: 'Dokumen Kebutuhan Bisnis' });
    api.pdMyDocument.mockResolvedValueOnce({ success: true, document: brd }).mockResolvedValue({ success: true, document: { ...brd, status: 'disetujui' } });
    api.pdMyDocumentDecide.mockResolvedValue({ success: true, status: 'disetujui', version: 2 });
    renderDoc('/akun/proyek/3/dokumen/10');

    fireEvent.click((await screen.findAllByRole('button', { name: 'Setujui dokumen' }))[0]);
    const dialog = screen.getByRole('alertdialog', { name: 'Setujui dokumen ini?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, setujui' }));
    await waitFor(() => expect(api.pdMyDocumentDecide).toHaveBeenCalledWith({ id: 10, decision: 'approved', content_hash: 'a'.repeat(64) }));
    expect(await screen.findByText('Dokumen disetujui')).toBeInTheDocument();
    expect(screen.getByText('Dokumen "Dokumen Kebutuhan Bisnis" berhasil disetujui.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tanda tangan' })).not.toBeInTheDocument();
  });

  it('setujui gagal (bukan 409): dialog konfirmasi tetap terbuka dengan pesannya + toast gagal', async () => {
    const brd = pksDoc({ id: 10, doc_type: 'brd', number: '001/BRD/GNB/X/2026', title: 'Dokumen Kebutuhan Bisnis' });
    api.pdMyDocument.mockResolvedValue({ success: true, document: brd });
    api.pdMyDocumentDecide.mockRejectedValue(new ApiError('Server sedang sibuk.', 500));
    renderDoc('/akun/proyek/3/dokumen/10');

    fireEvent.click((await screen.findAllByRole('button', { name: 'Setujui dokumen' }))[0]);
    const dialog = screen.getByRole('alertdialog', { name: 'Setujui dokumen ini?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, setujui' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Gagal menyetujui dokumen: Server sedang sibuk.');
    // Toast gagal halaman (di luar dialog); dialog tidak tertutup sehingga pesannya tidak hilang
    expect(screen.getByText('Gagal menyetujui dokumen.').closest('[role="alert"]')).toHaveTextContent('Server sedang sibuk.');
    expect(screen.getByRole('alertdialog', { name: 'Setujui dokumen ini?' })).toBe(dialog);
    expect(within(dialog).getByRole('button', { name: 'Ya, setujui' })).toBeEnabled();
  });

  it('minta revisi: catatan wajib, lalu kembali ke halaman proyek', async () => {
    api.pdMyDocument.mockResolvedValue({ success: true, document: pksDoc() });
    api.pdMyDocumentDecide.mockResolvedValue({ success: true, status: 'draft', version: 2 });
    renderDoc();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Minta revisi' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Minta revisi' });
    expect(within(dialog).getByLabelText('Catatan revisi')).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim permintaan revisi' }));
    expect(within(dialog).getByText('Catatan revisi wajib diisi.')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Catatan revisi'), { target: { value: 'Ubah jadwal serah terima.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim permintaan revisi' }));
    await waitFor(() => expect(api.pdMyDocumentDecide).toHaveBeenCalledWith({ id: 20, decision: 'rejected', note: 'Ubah jadwal serah terima.', content_hash: 'a'.repeat(64) }));
    expect(await screen.findByText('Halaman proyek')).toBeInTheDocument();
    // Halaman dokumen (dan toast-nya) sudah ditinggalkan: toast sukses dibawa ke halaman proyek lewat state router
    expect(screen.getByTestId('nav-toast')).toHaveTextContent('Permintaan revisi "Perjanjian Kerja Sama Pembuatan Website" berhasil dikirim.');
  });

  it('409: dokumen sudah berubah → pesan dan muat ulang', async () => {
    api.pdMyDocument
      .mockResolvedValueOnce({ success: true, document: pksDoc() })
      .mockResolvedValue({ success: true, document: pksDoc({ status: 'disetujui' }) });
    api.pdMyDocumentDecide.mockRejectedValue(new ApiError('Dokumen ini tidak sedang menunggu persetujuan Anda.', 409, 'STATE'));
    renderDoc();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Minta revisi' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Minta revisi' });
    fireEvent.change(within(dialog).getByLabelText('Catatan revisi'), { target: { value: 'Revisi' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kirim permintaan revisi' }));
    // Pesan di halaman + toast gagal dengan pesan yang sama
    const notice = await screen.findByText('Dokumen sudah berubah');
    expect(notice.closest('[role="alert"]')).toHaveTextContent('Dokumen ini tidak sedang menunggu persetujuan Anda.');
    expect(screen.getByText('Gagal mengirim permintaan revisi.').closest('[role="alert"]')).toHaveTextContent(
      'Dokumen ini tidak sedang menunggu persetujuan Anda.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByRole('button', { name: /Minta revisi/ })).toHaveLength(0));
  });

  it('unduh PDF dan DOCX memakai nomor dokumen dan gambar tanda tangan', async () => {
    const signed = pksDoc({
      status: 'selesai',
      signed_parties: ['pihak_pertama', 'pihak_kedua'],
      signatures: [
        {
          id: 5,
          version: 2,
          party: 'pihak_kedua',
          user_id: 9,
          signer_name: 'Sari Wulandari',
          signer_title: 'Manajer TI',
          method: 'draw',
          content_hash: 'a'.repeat(64),
          image_url: 'pdfile:sig:5',
          ip: null,
          user_agent: null,
          signed_at: '2026-10-22 10:05:00',
        },
      ],
    });
    signed.merge.signatures = [
      { party: 'pihak_kedua', signer_name: 'Sari Wulandari', signer_title: 'Manajer TI', signed_at: '2026-10-22 10:05:00', image_url: 'pdfile:sig:5' },
    ];
    api.pdMyDocument.mockResolvedValue({ success: true, document: signed });
    api.downloadPdFile.mockResolvedValue('blob:sig-5');
    renderDoc();

    await waitFor(() => expect(screen.getByTestId('slot-pihak_kedua')).toHaveAttribute('data-src', 'blob:sig-5'));
    expect(api.downloadPdFile).toHaveBeenCalledWith('pdfile:sig:5');
    expect(screen.getByText(/Ditandatangani secara elektronik/)).toBeInTheDocument();
    expect(screen.queryByText('Dokumen ini menunggu persetujuan Anda')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    await waitFor(() => expect(engine.exportPdf).toHaveBeenCalledTimes(1));
    const [model, name] = engine.exportPdf.mock.calls[0] as [DocModel, string];
    expect(name).toBe('002/PKS/GNB/X/2026');
    expect(model.signatures.find((s) => s.party === 'pihak_kedua')?.image_src).toBe('blob:sig-5');

    fireEvent.click(screen.getByRole('button', { name: 'DOCX' }));
    await waitFor(() => expect(engine.exportDocx).toHaveBeenCalledTimes(1));
  });

  it('dokumen draft / milik orang lain → tidak ditemukan', async () => {
    api.pdMyDocument.mockRejectedValue(new ApiError('Dokumen tidak ditemukan.', 404, 'NOT_FOUND'));
    renderDoc();
    expect(await screen.findByRole('heading', { name: 'Dokumen tidak ditemukan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kembali ke detail proyek' })).toHaveAttribute('href', '/akun/proyek/3');
  });
});
