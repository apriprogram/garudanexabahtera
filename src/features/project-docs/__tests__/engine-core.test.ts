// Pure helpers of the document engine (docs/platform/PROJECT-DOCS-SPEC.md §1, §2, §4, §6): numbers in words, rupiah,
// Indonesian dates, roman months, invoice math and the document set.
import { describe, expect, it } from 'vitest';
import { DOC_TYPES, STAGES, calcInvoice, formatRupiahDoc, hari, romawi, tanggalPanjang, terbilang } from '../engine';
import { angkaTerbilang, jumlahHari, persen, roundRupiah, tambahHari, tanggalPendek, waktuPanjang } from '../engine/format';
import type { DocType, InvoiceCalcOptions } from '../types';

describe('terbilang', () => {
  it.each([
    [0, 'nol rupiah'],
    [1, 'satu rupiah'],
    [11, 'sebelas rupiah'],
    [100, 'seratus rupiah'],
    [1_000, 'seribu rupiah'],
    [1_000_000, 'satu juta rupiah'],
    [1_250_500, 'satu juta dua ratus lima puluh ribu lima ratus rupiah'],
    [999_999_999_999, 'sembilan ratus sembilan puluh sembilan miliar sembilan ratus sembilan puluh sembilan juta sembilan ratus sembilan puluh sembilan ribu sembilan ratus sembilan puluh sembilan rupiah'],
  ])('%d → %s (required cases)', (n, words) => {
    expect(terbilang(n)).toBe(words);
  });

  it.each([
    [10, 'sepuluh rupiah'],
    [12, 'dua belas rupiah'],
    [19, 'sembilan belas rupiah'],
    [20, 'dua puluh rupiah'],
    [21, 'dua puluh satu rupiah'],
    [101, 'seratus satu rupiah'],
    [110, 'seratus sepuluh rupiah'],
    [115, 'seratus lima belas rupiah'],
    [200, 'dua ratus rupiah'],
    [999, 'sembilan ratus sembilan puluh sembilan rupiah'],
    [1001, 'seribu satu rupiah'],
    [1100, 'seribu seratus rupiah'],
    [2000, 'dua ribu rupiah'],
    [11_000, 'sebelas ribu rupiah'],
    [100_000, 'seratus ribu rupiah'],
    [111_111, 'seratus sebelas ribu seratus sebelas rupiah'],
    [1_250_000, 'satu juta dua ratus lima puluh ribu rupiah'],
    [15_000_000, 'lima belas juta rupiah'],
    [1_000_000_000, 'satu miliar rupiah'],
    [2_500_000_500, 'dua miliar lima ratus juta lima ratus rupiah'],
    [1e12, 'satu triliun rupiah'],
    [1e15, 'seribu triliun rupiah'],
  ])('%d → %s', (n, words) => {
    expect(terbilang(n)).toBe(words);
  });

  it('rounds to whole rupiah (half up) and handles negatives and non-numbers', () => {
    expect(terbilang(1_250_000.5)).toBe('satu juta dua ratus lima puluh ribu satu rupiah');
    expect(terbilang(0.4)).toBe('nol rupiah');
    expect(terbilang(-1500)).toBe('minus seribu lima ratus rupiah');
    expect(terbilang(Number.NaN)).toBe('');
  });

  it('angkaTerbilang writes plain numbers for "41 (empat puluh satu) hari"', () => {
    expect(angkaTerbilang(41)).toBe('empat puluh satu');
    expect(angkaTerbilang(0)).toBe('nol');
    expect(angkaTerbilang(1000)).toBe('seribu');
    expect(angkaTerbilang(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('formatRupiahDoc / persen / roundRupiah', () => {
  it.each([
    [0, 'Rp0'],
    [999, 'Rp999'],
    [1000, 'Rp1.000'],
    [1_250_000, 'Rp1.250.000'],
    [1e12, 'Rp1.000.000.000.000'],
    [1234.5, 'Rp1.235'],
    [-1000, '-Rp1.000'],
    [-0.4, 'Rp0'],
    [Number.NaN, 'Rp0'],
  ])('%d → %s', (n, text) => {
    expect(formatRupiahDoc(n)).toBe(text);
  });

  it('writes percentages with a decimal comma', () => {
    expect(persen(50)).toBe('50');
    expect(persen(12.5)).toBe('12,5');
    expect(persen(33.333333)).toBe('33,33');
    expect(persen(Number.NaN)).toBe('0');
  });

  it('rounds half away from zero like PHP round()', () => {
    expect(roundRupiah(0.5)).toBe(1);
    expect(roundRupiah(-0.5)).toBe(-1);
    expect(roundRupiah(1.005 * 1000)).toBe(1005);
    expect(Object.is(roundRupiah(-0.2), 0)).toBe(true);
  });
});

describe('dates', () => {
  it('formats real dates in Indonesian', () => {
    expect(tanggalPanjang('2026-10-21')).toBe('21 Oktober 2026');
    expect(tanggalPanjang('2026-01-01 08:00:00')).toBe('1 Januari 2026');
    expect(tanggalPanjang('2024-02-29')).toBe('29 Februari 2024');
    expect(hari('2026-10-21')).toBe('Rabu');
    expect(hari('2024-02-29')).toBe('Kamis');
    expect(hari('2026-08-17')).toBe('Senin');
    expect(tanggalPendek('2026-10-21')).toBe('21 Okt 2026');
  });

  it('returns an empty string for empty or impossible dates', () => {
    for (const bad of ['', 'abc', '2026-02-30', '2026-13-01', '21-10-2026']) {
      expect(tanggalPanjang(bad)).toBe('');
      expect(hari(bad)).toBe('');
      expect(tanggalPendek(bad)).toBe('');
      expect(tambahHari(bad, 1)).toBe('');
    }
  });

  it('adds days and counts inclusive calendar days', () => {
    expect(tambahHari('2026-10-21', 30)).toBe('2026-11-20');
    expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01');
    expect(tambahHari('2024-02-28', 1)).toBe('2024-02-29');
    expect(jumlahHari('2026-10-21', '2026-11-30')).toBe(41);
    expect(jumlahHari('2026-10-21', '2026-10-21')).toBe(1);
    expect(jumlahHari('2026-10-22', '2026-10-21')).toBe(0);
    expect(jumlahHari('', '2026-10-21')).toBe(0);
  });

  it('writes signature timestamps with the time in WIB', () => {
    expect(waktuPanjang('2026-10-22 10:05:00')).toBe('22 Oktober 2026 pukul 10.05 WIB');
    expect(waktuPanjang('2026-10-22')).toBe('22 Oktober 2026');
    expect(waktuPanjang('')).toBe('');
  });
});

describe('romawi', () => {
  it('writes every month', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(romawi)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
  });

  it('handles other numbers and rejects invalid input', () => {
    expect(romawi(2026)).toBe('MMXXVI');
    expect(romawi(0)).toBe('');
    expect(romawi(1.5)).toBe('');
    expect(romawi(4000)).toBe('');
  });
});

describe('calcInvoice', () => {
  const off: InvoiceCalcOptions = { discount: 0, ppn_enabled: false, ppn_rate: 12, dpp_numerator: 11, dpp_denominator: 12, pph23_enabled: false, pph23_rate: 2 };

  it('without taxes: total = base, rates 0', () => {
    expect(calcInvoice([{ description: 'DP 50%', qty: 1, unit_price: 7_500_000 }], off)).toEqual({
      subtotal: 7_500_000, discount: 0, base: 7_500_000, dpp: 7_500_000, ppn_rate: 0, ppn_amount: 0,
      total: 7_500_000, pph23_rate: 0, pph23_amount: 0, amount_due: 7_500_000,
    });
  });

  it('PPN 12% on DPP 11/12 and PPh 23 2% withheld', () => {
    const totals = calcInvoice([{ description: 'Website', qty: 1, unit_price: 10_000_000 }], { ...off, ppn_enabled: true, pph23_enabled: true });
    expect(totals).toEqual({
      subtotal: 10_000_000, discount: 0, base: 10_000_000, dpp: 9_166_667, ppn_rate: 12, ppn_amount: 1_100_000,
      total: 11_100_000, pph23_rate: 2, pph23_amount: 200_000, amount_due: 10_900_000,
    });
  });

  it('rounds each step half up to whole rupiah', () => {
    const items = [
      { description: 'a', qty: 1.5, unit_price: 333 }, // 499.5 → 500
      { description: 'b', qty: 3, unit_price: 333.33 }, // 999.99 → 1000
      { description: 'c', qty: 1.005, unit_price: 1000 }, // float 1004.9999999999999 → 1005
    ];
    expect(calcInvoice(items, off).subtotal).toBe(2505);
    const t = calcInvoice([{ description: 'x', qty: 1, unit_price: 1_000_001 }], { ...off, ppn_enabled: true });
    expect(t.dpp).toBe(916_668); // 916667.58
    expect(t.ppn_amount).toBe(110_000); // 110000.16
    expect(t.total).toBe(1_110_001);
  });

  it('applies the discount before taxes and never goes below zero', () => {
    const t = calcInvoice([{ description: 'x', qty: 2, unit_price: 500_000 }], { ...off, discount: 100_000, ppn_enabled: true });
    expect(t.base).toBe(900_000);
    expect(t.dpp).toBe(825_000);
    expect(t.ppn_amount).toBe(99_000);
    expect(t.total).toBe(999_000);
    expect(calcInvoice([{ description: 'x', qty: 1, unit_price: 1000 }], { ...off, discount: 5000 }).base).toBe(0);
    expect(calcInvoice([{ description: 'x', qty: 1, unit_price: 1000 }], { ...off, discount: -5 }).discount).toBe(0);
  });

  it('PPh 23 is computed on the base (before PPN) and only reduces the amount due', () => {
    const t = calcInvoice([{ description: 'x', qty: 1, unit_price: 3_333_333 }], { ...off, pph23_enabled: true, ppn_enabled: true });
    expect(t.pph23_amount).toBe(66_667); // 66666.66
    expect(t.total).toBe(3_700_000); // 3333333 + round(round(3055555.25) × 12%) = 3333333 + 366667
    expect(t.amount_due).toBe(t.total - t.pph23_amount);
  });

  it('uses the configured PPN rate and DPP fraction; a zero denominator falls back to DPP = base', () => {
    const t = calcInvoice([{ description: 'x', qty: 1, unit_price: 1_000_000 }], { ...off, ppn_enabled: true, ppn_rate: 11, dpp_numerator: 1, dpp_denominator: 1 });
    expect([t.dpp, t.ppn_amount, t.total]).toEqual([1_000_000, 110_000, 1_110_000]);
    const zero = calcInvoice([{ description: 'x', qty: 1, unit_price: 1_000_000 }], { ...off, ppn_enabled: true, dpp_denominator: 0 });
    expect(zero.dpp).toBe(1_000_000);
  });

  it('handles the 1e12 money ceiling exactly and treats bad numbers as zero', () => {
    expect(calcInvoice([{ description: 'x', qty: 1, unit_price: 1e12 }], off).amount_due).toBe(1e12);
    const bad = calcInvoice([{ description: 'x', qty: Number.NaN, unit_price: 5 }, { description: 'y', qty: '2' as unknown as number, unit_price: 5 }], off);
    expect(bad.subtotal).toBe(10);
  });

  it('treats an empty item list as zero', () => {
    expect(calcInvoice([], { ...off, ppn_enabled: true, pph23_enabled: true }).amount_due).toBe(0);
  });
});

describe('DOC_TYPES / STAGES', () => {
  it('matches the document set of the spec', () => {
    const codes = Object.fromEntries(Object.entries(DOC_TYPES).map(([type, info]) => [type, info.code]));
    expect(codes).toEqual({ brd: 'BRD', mou: 'MOU', proposal: 'PRP', pks: 'PKS', timeline: 'TML', uat: 'UAT', bast: 'BAST', invoice: 'INV', receipt: 'KWT', sla: 'SLA' });
    const signed = (Object.keys(DOC_TYPES) as DocType[]).filter((t) => DOC_TYPES[t].parties.length === 2);
    expect(signed).toEqual(['mou', 'pks', 'uat', 'bast', 'sla']);
    expect(DOC_TYPES.mou.required).toBe('mou');
    expect(DOC_TYPES.sla.required).toBe('sla');
    expect(DOC_TYPES.receipt.required).toBe(false);
    expect(DOC_TYPES.invoice.approval).toBe('none');
    expect(DOC_TYPES.receipt.approval).toBe('none');
  });

  it('lists the nine stages in order and every document belongs to one', () => {
    expect(STAGES.map((s) => s.key)).toEqual(['perencanaan', 'penawaran', 'kontrak', 'pengerjaan', 'uji', 'serah_terima', 'pelunasan', 'maintenance', 'selesai']);
    const keys = STAGES.map((s) => s.key);
    for (const info of Object.values(DOC_TYPES)) expect(keys).toContain(info.stage);
  });
});
