// @vitest-environment jsdom
// Jalankan: npx vitest run src/pages/account/projects/__tests__
// /akun/proyek (daftar proyek) dan /akun/proyek/:id (detail proyek) halaman pembeli.
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detail, docSummary, pksDoc, summary } from './fixtures';

configure({ asyncUtilTimeout: 5000 });

const api = vi.hoisted(() => ({
  pdMyProjects: vi.fn(),
  pdMyProject: vi.fn(),
  pdMyDocument: vi.fn(),
  downloadPdFile: vi.fn(),
}));
vi.mock('../../../../features/project-docs/api', () => api);

const engine = vi.hoisted(() => ({ exportPdf: vi.fn(), exportDocx: vi.fn() }));
vi.mock('../../../../features/project-docs/engine', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../features/project-docs/engine')>()),
  ...engine,
}));

import { ApiError } from '../../../../lib/api';
import MyProjectDetail from '../MyProjectDetail';
import MyProjects from '../MyProjects';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/akun/proyek" element={<MyProjects />} />
        <Route path="/akun/proyek/:id" element={<MyProjectDetail />} />
        <Route path="/akun/proyek/:id/dokumen/:docId" element={<p>Halaman dokumen</p>} />
        <Route path="/pesan-custom" element={<p>Pesan custom</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  for (const fn of [...Object.values(api), ...Object.values(engine)]) fn.mockReset();
});
afterEach(cleanup);

describe('Proyek saya', () => {
  it('menampilkan kartu proyek: kode, tahap, progres, perlu tindakan, tagihan berikutnya', async () => {
    api.pdMyProjects.mockResolvedValue({
      success: true,
      projects: [summary(), summary({ id: 4, code: null, name: 'Aplikasi Kasir', stage: 'selesai', progress: 100, pending_approvals: 0, next_due: null })],
    });
    renderAt('/akun/proyek');

    const card = (await screen.findByRole('heading', { name: 'Website Company Profile' })).closest('article') as HTMLElement;
    expect(within(card).getByText('PRJ-2026-003')).toBeInTheDocument();
    expect(within(card).getByText('Kontrak')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'Progres pengerjaan' })).toHaveAttribute('aria-valuenow', '40');
    expect(within(card).getByText('Perlu tindakan · 1')).toBeInTheDocument();
    expect(within(card).getByText(/Tagihan lewat jatuh tempo/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Tinjau dokumen Website Company Profile' })).toHaveAttribute('href', '/akun/proyek/3');

    const other = screen.getByRole('heading', { name: 'Aplikasi Kasir' }).closest('article') as HTMLElement;
    expect(within(other).getByText('Selesai')).toBeInTheDocument();
    expect(within(other).queryByText(/Perlu tindakan/)).not.toBeInTheDocument();
    expect(screen.getByText('1 dokumen menunggu persetujuan Anda')).toBeInTheDocument();
  });

  it('keadaan kosong mengajak memesan proyek custom', async () => {
    api.pdMyProjects.mockResolvedValue({ success: true, projects: [] });
    renderAt('/akun/proyek');
    expect(await screen.findByRole('heading', { name: 'Belum ada proyek' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pesan Website \/ Aplikasi Custom/ })).toHaveAttribute('href', '/pesan-custom');
  });

  it('gagal memuat menampilkan error dengan Coba lagi', async () => {
    api.pdMyProjects.mockRejectedValueOnce(new ApiError('Server sibuk.', 500)).mockResolvedValue({ success: true, projects: [summary()] });
    renderAt('/akun/proyek');
    expect(await screen.findByText('Server sibuk.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByRole('heading', { name: 'Website Company Profile' })).toBeInTheDocument();
  });
});

describe('Detail proyek', () => {
  it('menampilkan tahapan, perlu persetujuan, dokumen tanpa draft, tagihan, dan kuitansi', async () => {
    api.pdMyProject.mockResolvedValue({ success: true, project: detail() });
    renderAt('/akun/proyek/3');

    expect(await screen.findByRole('heading', { level: 1, name: 'Website Company Profile' })).toBeInTheDocument();
    expect(api.pdMyProject).toHaveBeenCalledWith({ id: 3 });

    // Tahapan: tanpa pemeliharaan = 8 tahap, kontrak tahap ke-3
    const steps = screen.getByRole('list', { name: 'Tahapan proyek' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(8);
    expect(within(steps).getByText('Kontrak').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Desain UI')).toBeInTheDocument();

    // Perlu persetujuan Anda → tombol menuju dokumen
    const pending = screen.getByRole('region', { name: /Perlu persetujuan Anda/ });
    expect(within(pending).getByRole('link', { name: /Tinjau & tandatangani/ })).toHaveAttribute('href', '/akun/proyek/3/dokumen/20');

    // Dokumen proyek: BRD + PKS, tanpa draft, invoice, atau kuitansi
    const docs = screen.getByRole('region', { name: /Dokumen proyek/ });
    expect(within(docs).getByText('Dokumen Kebutuhan Bisnis')).toBeInTheDocument();
    expect(within(docs).getByText('Perjanjian Kerja Sama Pembuatan Website')).toBeInTheDocument();
    expect(within(docs).getByText('Perlu persetujuan Anda')).toBeInTheDocument();
    expect(screen.queryByText('Jadwal Rahasia')).not.toBeInTheDocument();
    expect(within(docs).queryByText('Invoice DP')).not.toBeInTheDocument();

    // Tagihan: hanya yang terbit, dengan status, jumlah, jatuh tempo
    const bills = screen.getByRole('region', { name: /Tagihan/ });
    expect(within(bills).getByText('001/INV/GNB/X/2026')).toBeInTheDocument();
    expect(within(bills).queryByText('002/INV/GNB/X/2026')).not.toBeInTheDocument();
    expect(within(bills).getByText('Lewat jatuh tempo')).toBeInTheDocument();
    expect(within(bills).getByText('Rp 7.500.000')).toBeInTheDocument();
    expect(within(bills).getByText('1 Oktober 2026')).toBeInTheDocument();

    const receipts = screen.getByRole('region', { name: /Kuitansi/ });
    expect(within(receipts).getByText('001/KWT/GNB/X/2026')).toBeInTheDocument();
    expect(screen.getByText('Dokumen dikirim untuk persetujuan')).toBeInTheDocument();
  });

  it('PDF invoice dimuat lewat pd_my_document lalu diekspor', async () => {
    api.pdMyProject.mockResolvedValue({ success: true, project: detail() });
    const inv = pksDoc({ id: 30, doc_type: 'invoice', number: '001/INV/GNB/X/2026', status: 'disetujui' });
    inv.merge.document = { ...inv.merge.document, type: 'invoice', number: '001/INV/GNB/X/2026' };
    api.pdMyDocument.mockResolvedValue({ success: true, document: inv });
    renderAt('/akun/proyek/3');
    fireEvent.click(await screen.findByRole('button', { name: 'Unduh PDF invoice 001/INV/GNB/X/2026' }));
    await waitFor(() => expect(engine.exportPdf).toHaveBeenCalledTimes(1));
    expect(api.pdMyDocument).toHaveBeenCalledWith({ id: 30 });
    expect(engine.exportPdf.mock.calls[0][1]).toBe('001/INV/GNB/X/2026');
  });

  it('pesan dari halaman sebelumnya (state router) tampil sekali', async () => {
    api.pdMyProject.mockResolvedValue({ success: true, project: detail({ documents: [docSummary({ status: 'selesai' })] }) });
    render(
      <MemoryRouter initialEntries={[{ pathname: '/akun/proyek/3', state: { flash: { tone: 'success', title: 'Permintaan revisi terkirim', text: 'Tim kami akan memperbaikinya.' } } }]}>
        <Routes>
          <Route path="/akun/proyek/:id" element={<MyProjectDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Permintaan revisi terkirim')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Perlu persetujuan Anda/ })).not.toBeInTheDocument();
  });

  it('proyek orang lain / tidak ada → tidak ditemukan', async () => {
    api.pdMyProject.mockRejectedValue(new ApiError('Proyek tidak ditemukan.', 404, 'NOT_FOUND'));
    renderAt('/akun/proyek/99');
    expect(await screen.findByRole('heading', { name: 'Proyek tidak ditemukan' })).toBeInTheDocument();
  });
});
