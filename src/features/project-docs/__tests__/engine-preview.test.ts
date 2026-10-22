// DocumentPreview (spec §6): A4 sheets with kop, footer "Halaman x dari y", signature row and e-Meterai, zoom
// controls, and the print-only copy. jsdom has no layout, so pagination falls back to explicit page breaks.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentPreview, buildModel, defaultContent } from '../engine';
import { PNG_1X1, fullMerge } from './engine-fixtures';

afterEach(cleanup);

function pks() {
  const data = fullMerge();
  const model = buildModel('pks', defaultContent('pks', data), data);
  model.signatures[0].image_src = PNG_1X1;
  return model;
}

// The first render pays for jsdom + module setup; under a loaded machine that exceeds the 5 s default
describe('DocumentPreview', { timeout: 30_000 }, () => {
  it('renders the kop, the pages, the signatures and the e-Meterai box', () => {
    render(createElement(DocumentPreview, { model: pks() }));
    const article = screen.getByRole('article', { name: 'Pratinjau PERJANJIAN KERJA SAMA PEMBUATAN WEBSITE' });
    // the SOW appendix starts on its own sheet
    const sheets = within(article).getAllByRole('region', { name: /^Halaman \d dari 2$/ });
    expect(sheets).toHaveLength(2);
    expect(within(sheets[0]).getByText('PT Garuda Nexa Bahtera', { selector: 'header p' })).toBeInTheDocument();
    expect(within(sheets[0]).getByText(/Jl\. Merdeka No\. 10, Bandung · Telp\. 0812-0000-0000/)).toBeInTheDocument();
    expect(within(sheets[0]).getByText('Halaman 1 dari 2')).toBeInTheDocument();
    expect(within(sheets[1]).getByText('Halaman 2 dari 2')).toBeInTheDocument();
    expect(within(sheets[0]).getByRole('heading', { name: 'PERJANJIAN KERJA SAMA PEMBUATAN WEBSITE' })).toBeInTheDocument();
    expect(within(sheets[1]).getByRole('heading', { name: /^LAMPIRAN/ })).toBeInTheDocument();
    expect(within(sheets[0]).getByRole('img', { name: 'Tanda tangan Budi Santoso' })).toHaveAttribute('src', PNG_1X1);
    expect(within(sheets[0]).getByText('Ditandatangani secara elektronik pada 22 Oktober 2026 pukul 10.05 WIB')).toBeInTheDocument();
    expect(within(sheets[0]).getByLabelText('Kotak e-Meterai')).toHaveTextContent('e-MeteraiRp10.000');
    // the wings logo uses the brand color token
    expect(sheets[0].querySelector('header svg path')?.getAttribute('d')).toMatch(/^M140 112/);
    expect(sheets[0].querySelector('header svg')?.getAttribute('class')).toContain('text-brand-600');
  });

  it('renders tables with header rows and Pasal headings on two lines', () => {
    render(createElement(DocumentPreview, { model: pks() }));
    const article = screen.getByRole('article');
    const termin = within(article).getAllByRole('table').find((t) => within(t).queryByRole('columnheader', { name: 'Termin' }));
    expect(termin).toBeDefined();
    expect(within(termin!).getAllByRole('row')).toHaveLength(5);
    expect(within(article).getByRole('heading', { name: /^Pasal 5\s+CARA PEMBAYARAN$/ })).toBeInTheDocument();
  });

  it('zooms in and out and returns to the fitted width', () => {
    render(createElement(DocumentPreview, { model: pks() }));
    const zoom = screen.getByRole('toolbar', { name: 'Zoom pratinjau' });
    expect(within(zoom).getByText('100%')).toBeInTheDocument();
    act(() => {
      fireEvent.click(within(zoom).getByRole('button', { name: 'Perkecil' }));
    });
    expect(within(zoom).getByText('90%')).toBeInTheDocument();
    expect(within(zoom).getByRole('button', { name: 'Sesuaikan lebar' })).toHaveAttribute('aria-pressed', 'false');
    act(() => {
      fireEvent.click(within(zoom).getByRole('button', { name: 'Perbesar' }));
      fireEvent.click(within(zoom).getByRole('button', { name: 'Perbesar' }));
    });
    expect(within(zoom).getByText('125%')).toBeInTheDocument();
    act(() => {
      fireEvent.click(within(zoom).getByRole('button', { name: 'Sesuaikan lebar' }));
    });
    expect(within(zoom).getByText('100%')).toBeInTheDocument();
  });

  it('keeps a hidden print copy of the sheets on <body>', () => {
    render(createElement(DocumentPreview, { model: pks() }));
    const portal = document.body.querySelector(':scope > .pd-print-portal');
    expect(portal?.querySelectorAll('.pd-sheet')).toHaveLength(2);
  });

  it('renders every document type without errors', () => {
    const data = fullMerge();
    for (const type of ['brd', 'mou', 'proposal', 'timeline', 'uat', 'bast', 'invoice', 'receipt', 'sla'] as const) {
      const { unmount } = render(createElement(DocumentPreview, { model: buildModel(type, defaultContent(type, data), data) }));
      expect(screen.getAllByText(/Halaman 1 dari \d/).length).toBeGreaterThan(0);
      unmount();
    }
  });
});
