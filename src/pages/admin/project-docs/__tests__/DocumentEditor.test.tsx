// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/admin/project-docs/__tests__/DocumentEditor.test.tsx
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocDetail } from '../../../../features/project-docs/types';
import type { DocModel } from '../../../../features/project-docs/engine';
import { brdDraft, merge, settings } from './fixtures';

// Editor + engine render berat; di mesin yang sibuk 1 detik bawaan findBy/waitFor tidak cukup
configure({ asyncUtilTimeout: 5000 });

const api = vi.hoisted(() => ({
  pdDocumentGet: vi.fn(),
  pdSettingsGet: vi.fn(),
  pdDocumentSave: vi.fn(),
  pdDocumentSubmit: vi.fn(),
  pdDocumentWithdraw: vi.fn(),
  pdDocumentChange: vi.fn(),
  pdDocumentComplete: vi.fn(),
  pdDocumentDelete: vi.fn(),
  pdDocumentRestore: vi.fn(),
  pdDocumentSign: vi.fn(),
  pdInvoiceUpdate: vi.fn(),
  pdPaymentRecord: vi.fn(),
  pdPaymentDelete: vi.fn(),
  downloadPdFile: vi.fn(),
}));
vi.mock('../../../../features/project-docs/api', () => api);

const viewer = vi.hoisted(() => ({ current: { id: 1, name: 'Admin', email: 'admin@garudanexa.test', role: 'admin' } }));
vi.mock('../../../../lib/auth', () => ({ getCurrentUser: () => viewer.current }));

// Pratinjau A4 engine diganti daftar judul blok: tes ini memeriksa editor, bukan tata letak halaman
vi.mock('../../../../features/project-docs/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../features/project-docs/engine')>();
  return {
    ...actual,
    DocumentPreview: ({ model }: { model: DocModel }) => (
      <div data-testid="preview">
        {model.blocks.map((b, i) => (b.type === 'heading' ? <p key={i}>{b.text}</p> : null))}
      </div>
    ),
    exportPdf: vi.fn(),
    exportDocx: vi.fn(),
  };
});

import DocumentEditor from '../DocumentEditor';
import { editorPermissions } from '../editor/permissions';
import type { PdNavState } from '../shared/hooks';

/** Pengganti workspace: menampilkan toast yang dibawa editor lewat state navigasi. */
function WorkspaceStub() {
  const toast = (useLocation().state as PdNavState | null)?.toast;
  return (
    <>
      <p>Halaman workspace</p>
      {toast && <p data-testid="nav-toast">{toast.message}</p>}
    </>
  );
}

/** `state` = state navigasi dari halaman sebelumnya (mis. toast dari workspace). */
function renderEditor(state?: PdNavState) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/proyek/3/dokumen/12', state }]}>
      <Routes>
        <Route path="/admin/proyek/:id/dokumen/:docId" element={<DocumentEditor />} />
        <Route path="/admin/proyek/:id" element={<WorkspaceStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Pratinjau muncul satu render setelah draft (useDeferredValue). */
const preview = () => screen.findByTestId('preview');

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.pdSettingsGet.mockResolvedValue({ success: true, ...settings });
  viewer.current = { id: 1, name: 'Admin', email: 'admin@garudanexa.test', role: 'admin' };
});
afterEach(cleanup);

describe('Editor dokumen', () => {
  it('memuat draft dengan pratinjau langsung dan peringatan data kosong', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    renderEditor();

    expect(await screen.findByRole('heading', { level: 1, name: 'BRD – Dokumen Kebutuhan Bisnis' })).toBeInTheDocument();
    expect(api.pdDocumentGet).toHaveBeenCalledWith({ id: 12 });
    const page = await preview();
    expect(within(page).getByText('BUSINESS REQUIREMENTS DOCUMENT')).toBeInTheDocument();
    expect(within(page).getByText('Latar belakang')).toBeInTheDocument();
    // client.npwp kosong → […] + peringatan dengan tautan ke data klien
    expect(screen.getByText('1 data belum lengkap dan tampil sebagai […]')).toBeInTheDocument();
    expect(screen.getByText('client.npwp')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Data klien:' })).toHaveAttribute('href', '/admin/klien');
    expect(screen.getByRole('button', { name: 'Simpan draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ajukan persetujuan' })).toBeEnabled();
  });

  it('mengubah judul bagian memperbarui pratinjau; Ctrl+S menyimpan versi baru', async () => {
    const saved = brdDraft({
      version: 2,
      updated_at: '2026-10-22 10:00:00',
      content: { ...brdDraft().content, sections: brdDraft().content.sections.map((s, i) => (i === 0 ? { ...s, title: 'Latar belakang bisnis' } : s)) },
    });
    api.pdDocumentGet.mockResolvedValueOnce({ success: true, document: brdDraft() }).mockResolvedValue({ success: true, document: saved });
    api.pdDocumentSave.mockResolvedValue({ success: true, version: 2 });
    renderEditor();

    const title = await screen.findByLabelText('Judul bagian');
    fireEvent.change(title, { target: { value: 'Latar belakang bisnis' } });
    expect(await within(await preview()).findByText('Latar belakang bisnis')).toBeInTheDocument();
    expect(screen.getByText('Belum disimpan')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Catatan perubahan/), { target: { value: 'Judul latar belakang diperjelas' } });

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() => expect(api.pdDocumentSave).toHaveBeenCalledTimes(1));
    const body = api.pdDocumentSave.mock.calls[0][0];
    expect(body).toMatchObject({ id: 12, title: 'BRD – Dokumen Kebutuhan Bisnis', doc_date: '2026-10-21', change_note: 'Judul latar belakang diperjelas' });
    expect(body.content.sections[0].title).toBe('Latar belakang bisnis');
    expect(await screen.findByText('Draft berhasil disimpan (versi 2).')).toBeInTheDocument();
    await waitFor(() => expect(api.pdDocumentGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('Belum disimpan')).not.toBeInTheDocument());
  });

  it('ajukan persetujuan menyimpan perubahan dulu lalu mengajukan ke klien', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    api.pdDocumentSave.mockResolvedValue({ success: true, version: 2 });
    api.pdDocumentSubmit.mockResolvedValue({ success: true, status: 'menunggu_persetujuan', version: 2 });
    renderEditor();

    fireEvent.change(await screen.findByLabelText(/^Judul dokumen/), { target: { value: 'BRD Website Company Profile' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan persetujuan' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Ajukan ke klien?')).toBeInTheDocument();
    expect(within(dialog).getByText(/Masih ada 1 data kosong/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, ajukan' }));

    await waitFor(() => expect(api.pdDocumentSubmit).toHaveBeenCalledWith({ id: 12 }));
    expect(api.pdDocumentSave).toHaveBeenCalledWith(expect.objectContaining({ id: 12, title: 'BRD Website Company Profile' }));
    expect(api.pdDocumentSave.mock.invocationCallOrder[0]).toBeLessThan(api.pdDocumentSubmit.mock.invocationCallOrder[0]);
    expect(await screen.findByText('Dokumen berhasil diajukan ke klien.')).toBeInTheDocument();
  });

  it('judul dokumen kosong tidak disimpan', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    renderEditor();
    fireEvent.change(await screen.findByLabelText(/^Judul dokumen/), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan draft' }));
    expect(await screen.findAllByText('Judul dokumen wajib diisi.')).not.toHaveLength(0);
    expect(api.pdDocumentSave).not.toHaveBeenCalled();
  });

  it('PKS menunggu persetujuan: hanya baca, admin bisa tarik kembali dan menandatangani', async () => {
    const pks: DocDetail = brdDraft({
      doc_type: 'pks',
      number: '001/PKS/GNB/X/2026',
      title: 'PKS + SOW – Perjanjian Kerja Sama & Ruang Lingkup',
      status: 'menunggu_persetujuan',
      submitted_at: '2026-10-21 10:00:00',
      content_hash: 'a'.repeat(64),
      merge: merge({ document: { ...merge().document, type: 'pks', number: '001/PKS/GNB/X/2026', status: 'menunggu_persetujuan' } }),
    });
    api.pdDocumentGet.mockResolvedValue({ success: true, document: pks });
    renderEditor();

    expect(await screen.findByText('Menunggu persetujuan klien')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simpan draft' })).not.toBeInTheDocument();
    expect(screen.queryByText('Isi dokumen')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tarik kembali' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Tandatangani' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Pihak Pertama')).toBeInTheDocument();
    expect(screen.getByText('Pihak Kedua')).toBeInTheDocument();
    // Data terkunci: tidak ada peringatan data kosong untuk dokumen yang sudah diajukan
    expect(screen.queryByText(/data belum lengkap/)).not.toBeInTheDocument();
  });

  it('Developer tidak bisa mengubah dokumen PKS', async () => {
    viewer.current = { id: 2, name: 'Dev', email: 'dev@garudanexa.test', role: 'user' };
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft({ doc_type: 'pks', number: '001/PKS/GNB/X/2026' }) });
    renderEditor();

    expect(await screen.findByText(/Hanya administrator yang bisa mengubah dokumen PKS \+ SOW/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simpan draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajukan persetujuan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ekspor' })).toBeInTheDocument();
  });

  it('menahan navigasi saat ada perubahan yang belum disimpan', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    renderEditor();
    fireEvent.change(await screen.findByLabelText('Judul bagian'), { target: { value: 'Konteks' } });

    fireEvent.click(screen.getByRole('link', { name: /PRJ-2026-003/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Tinggalkan editor?')).toBeInTheDocument();
    expect(screen.queryByText('Halaman workspace')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, tinggalkan' }));
    expect(await screen.findByText('Halaman workspace')).toBeInTheDocument();
  });

  it('hapus kolom, baris, dan tabel bagian ditanya dulu lewat dialog konfirmasi', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Tambah tabel' }));
    expect(screen.getByLabelText('Judul kolom 2')).toHaveValue('Kolom 2');

    // Batal: kolom tetap ada
    fireEvent.click(screen.getByRole('button', { name: 'Hapus kolom 2' }));
    let dialog = await screen.findByRole('dialog', { name: 'Hapus kolom "Kolom 2"?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Judul kolom 2')).toBeInTheDocument();

    // Ya, hapus: kolom hilang
    fireEvent.click(screen.getByRole('button', { name: 'Hapus kolom 2' }));
    dialog = await screen.findByRole('dialog', { name: 'Hapus kolom "Kolom 2"?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('Judul kolom 2')).not.toBeInTheDocument();

    // Judul dialog hapus baris memakai isi sel pertamanya
    fireEvent.change(screen.getByLabelText('Baris 1, Kolom 1'), { target: { value: 'Modul laporan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris 1' }));
    dialog = await screen.findByRole('dialog', { name: 'Hapus baris "Modul laporan"?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, hapus' }));
    expect(await screen.findByText('Tabel belum punya baris.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Hapus tabel' }));
    dialog = await screen.findByRole('dialog', { name: 'Hapus tabel bagian "Latar belakang"?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, hapus' }));
    expect(await screen.findByRole('button', { name: 'Tambah tabel' })).toBeInTheDocument();
    // Hanya draft di layar yang berubah; tidak ada yang dikirim ke server
    expect(api.pdDocumentSave).not.toHaveBeenCalled();
  });

  it('hapus gambar tanda tangan Pihak Pertama ditanya dulu', async () => {
    // jsdom tidak punya kanvas 2D dan pointer capture
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', { value: vi.fn(), configurable: true, writable: true });
    try {
      api.pdDocumentGet.mockResolvedValue({
        success: true,
        document: brdDraft({ doc_type: 'pks', number: '001/PKS/GNB/X/2026', status: 'menunggu_persetujuan', submitted_at: '2026-10-21 10:00:00' }),
      });
      renderEditor();

      fireEvent.click((await screen.findAllByRole('button', { name: 'Tandatangani' }))[0]);
      const sign = await screen.findByRole('dialog', { name: 'Tandatangani sebagai Pihak Pertama' });
      fireEvent.pointerDown(within(sign).getByRole('img', { name: /Area tanda tangan/ }), { pointerId: 1, clientX: 40, clientY: 60 });
      fireEvent.pointerUp(within(sign).getByRole('img', { name: /Area tanda tangan/ }), { pointerId: 1 });
      expect(within(sign).getByRole('button', { name: 'Tandatangani' })).toBeEnabled();

      fireEvent.click(within(sign).getByRole('button', { name: 'Hapus' }));
      const confirm = await screen.findByRole('dialog', { name: 'Hapus gambar tanda tangan?' });
      fireEvent.click(within(confirm).getByRole('button', { name: 'Ya, hapus' }));
      await waitFor(() => expect(within(sign).getByRole('button', { name: 'Hapus' })).toBeDisabled());
      expect(within(sign).getByRole('button', { name: 'Tandatangani' })).toBeDisabled();
      expect(screen.getByRole('dialog', { name: 'Tandatangani sebagai Pihak Pertama' })).toBeInTheDocument();
      expect(api.pdDocumentSign).not.toHaveBeenCalled();
    } finally {
      getContext.mockRestore();
      Reflect.deleteProperty(HTMLCanvasElement.prototype, 'setPointerCapture');
    }
  });

  it('ajukan perubahan yang gagal: pesan tetap di modal dan muncul toast galat', async () => {
    const { ApiError } = await import('../../../../lib/api');
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft({ status: 'disetujui', submitted_at: '2026-10-21 10:00:00', approved_at: '2026-10-22 10:00:00' }) });
    api.pdDocumentChange.mockRejectedValue(new ApiError('Dokumen sedang diproses. Coba beberapa saat lagi.', 409, 'STATE'));
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Aksi lainnya' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Ajukan perubahan' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ajukan perubahan dokumen?' });
    fireEvent.change(within(dialog).getByLabelText(/Alasan perubahan/), { target: { value: 'Klien menambah modul laporan.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, ajukan perubahan' }));

    await waitFor(() => expect(api.pdDocumentChange).toHaveBeenCalledWith({ id: 12, reason: 'Klien menambah modul laporan.' }));
    expect(await screen.findByText('Gagal mengajukan perubahan.')).toBeInTheDocument();
    // Pesan server tampil di modal dan sebagai keterangan toast; modal tetap terbuka
    expect(screen.getAllByText('Dokumen sedang diproses. Coba beberapa saat lagi.')).toHaveLength(2);
    expect(screen.getByRole('dialog', { name: 'Ajukan perubahan dokumen?' })).toBeInTheDocument();
  });

  it('hapus draft ditanya dulu; toast suksesnya dibawa ke workspace', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    api.pdDocumentDelete.mockResolvedValue({ success: true });
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Aksi lainnya' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hapus draft' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hapus draft dokumen?' });
    expect(api.pdDocumentDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, hapus' }));

    await waitFor(() => expect(api.pdDocumentDelete).toHaveBeenCalledWith({ id: 12 }));
    expect(await screen.findByText('Halaman workspace')).toBeInTheDocument();
    // Editor sudah ditutup: toast "berhasil dihapus" tampil di workspace, bukan hilang bersama editor
    expect(screen.getByTestId('nav-toast')).toHaveTextContent('Draft dokumen berhasil dihapus.');
  });

  it('toast dari workspace (dokumen baru dibuat) tampil setelah editor dimuat', async () => {
    api.pdDocumentGet.mockResolvedValue({ success: true, document: brdDraft() });
    renderEditor({ toast: { tone: 'success', message: 'BRD 001/BRD/GNB/X/2026 berhasil dibuat.' } });

    expect(await screen.findByText('BRD 001/BRD/GNB/X/2026 berhasil dibuat.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'BRD – Dokumen Kebutuhan Bisnis' })).toBeInTheDocument();
  });

  it('dokumen tidak ditemukan', async () => {
    const { ApiError } = await import('../../../../lib/api');
    api.pdDocumentGet.mockRejectedValue(new ApiError('Dokumen tidak ditemukan.', 404, 'NOT_FOUND'));
    renderEditor();
    expect(await screen.findByText('Dokumen tidak ditemukan.')).toBeInTheDocument();
  });
});

describe('Hak aksi editor', () => {
  const admin = { isAdmin: true, canEditType: () => true };
  const developer = { isAdmin: false, canEditType: (t: string) => ['brd', 'timeline', 'uat'].includes(t) };

  it('draft bisa diedit, diajukan, dan dihapus selama belum pernah diajukan', () => {
    const p = editorPermissions(brdDraft(), admin);
    expect(p).toMatchObject({ editable: true, canSubmit: true, canDelete: true, canChange: false, canSign: false });
    expect(editorPermissions(brdDraft({ submitted_at: '2026-10-21 10:00:00' }), admin).canDelete).toBe(false);
  });

  it('tanda tangan Pihak Pertama hanya untuk dokumen dua pihak yang sudah diajukan dan belum ditandatangani', () => {
    const pks = brdDraft({ doc_type: 'pks', status: 'disetujui' });
    expect(editorPermissions(pks, admin).canSign).toBe(true);
    expect(editorPermissions({ ...pks, signed_parties: ['pihak_pertama'] }, admin).canSign).toBe(false);
    expect(editorPermissions(brdDraft({ status: 'disetujui' }), admin).canSign).toBe(false);
    expect(editorPermissions(pks, developer).canSign).toBe(false);
  });

  it('Developer: BRD boleh, PKS dan perubahan dokumen tidak', () => {
    expect(editorPermissions(brdDraft(), developer).editable).toBe(true);
    expect(editorPermissions(brdDraft({ doc_type: 'pks' }), developer).editable).toBe(false);
    expect(editorPermissions(brdDraft({ status: 'disetujui' }), developer).canChange).toBe(false);
    expect(editorPermissions(brdDraft({ status: 'disetujui' }), admin)).toMatchObject({ canChange: true, canComplete: true });
  });

  it('invoice dengan pembayaran tidak bisa diajukan perubahan; kuitansi selalu hanya baca', () => {
    const invoice = brdDraft({
      doc_type: 'invoice',
      status: 'disetujui',
      invoice: { payment_status: 'sebagian' } as DocDetail['invoice'],
      payments: [{ id: 1 } as NonNullable<DocDetail['payments']>[number]],
    });
    expect(editorPermissions(invoice, admin)).toMatchObject({ canChange: false, canRecordPayment: true, canWithdraw: false, canCancelInvoice: false });
    expect(editorPermissions(brdDraft({ doc_type: 'receipt', status: 'selesai' }), admin)).toMatchObject({ editable: false, canChange: false, canDelete: false });
  });

  it('invoice tanpa pembayaran bisa dibatalkan admin; yang sudah dibatalkan tidak', () => {
    const issued = (payment_status: 'belum_dibayar' | 'dibatalkan') =>
      brdDraft({ doc_type: 'invoice', status: 'disetujui', invoice: { id: 5, payment_status, amount_paid: 0 } as DocDetail['invoice'], payments: [] });
    expect(editorPermissions(issued('belum_dibayar'), admin)).toMatchObject({ canCancelInvoice: true, canRecordPayment: true });
    expect(editorPermissions(issued('belum_dibayar'), developer).canCancelInvoice).toBe(false);
    expect(editorPermissions(issued('dibatalkan'), admin)).toMatchObject({ canCancelInvoice: false, canRecordPayment: false, canChange: false });
  });
});
