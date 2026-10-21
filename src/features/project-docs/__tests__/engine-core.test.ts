// Pure helpers of the document engine (docs/platform/PROJECT-DOCS-SPEC.md §1, §2, §4, §6): numbers in words, rupiah,
// Indonesian dates, roman months, invoice math, merge fields, the document set, plus a smoke test of the placeholder
// template/model so the public API keeps working while the engine is built out.
import { describe, expect, it } from 'vitest';
import {
  DOC_TYPES,
  STAGES,
  buildModel,
  calcInvoice,
  defaultContent,
  formatRupiahDoc,
  hari,
  resolveMerge,
  romawi,
  tanggalPanjang,
  terbilang,
} from '../engine';
import type { DocType, InvoiceCalcOptions, MergeData } from '../types';

const merge = (over: Partial<MergeData> = {}): MergeData => ({
  company: {
    name: 'PT Garuda Nexa Bahtera',
    address: 'Jl. Contoh No. 1',
    city: 'Bandung',
    phone: '0812',
    email: 'info@garudanexa.com',
    website: 'https://garudanexa.com',
    npwp: '',
    signatory_name: 'Budi Santoso',
    signatory_title: 'Direktur',
    bank_accounts: [{ bank: 'BCA', number: '123', holder: 'PT Garuda Nexa Bahtera' }],
  },
  client: {
    type: 'perusahaan',
    name: 'PT Klien Maju',
    pic_name: 'Sari',
    pic_title: 'Manajer TI',
    email: 'sari@klien.test',
    phone: '0813',
    address: 'Jl. Klien 2',
    city: 'Jakarta',
    npwp: '',
  },
  project: {
    id: 7,
    code: 'PRJ-2026-001',
    name: 'Website Company Profile',
    service_type: 'website',
    service_label: 'Website',
    description: '',
    scope_summary: 'Website 5 halaman',
    value: 15_000_000,
    value_rupiah: 'Rp15.000.000',
    value_terbilang: 'lima belas juta rupiah',
    start_date: '2026-10-21',
    end_date: '2026-11-30',
    duration_days: 41,
    payment_terms: [],
    has_maintenance: false,
    maintenance_fee: 0,
    maintenance_period: '',
    maintenance_start: '',
    maintenance_end: '',
  },
  milestones: [{ title: 'Desain', description: '', start_date: '2026-10-21', due_date: '2026-10-31', weight: 1, progress: 50, status: 'berjalan' }],
  document: {
    number: '007/PKS/GNB/X/2026',
    type: 'pks',
    title: 'Perjanjian Kerja Sama',
    date: '2026-10-21',
    date_long: '21 Oktober 2026',
    day: 'Rabu',
    version: 1,
    status: 'draft',
  },
  signatures: [],
  ...over,
});

describe('terbilang', () => {
  it.each([
    [0, 'nol rupiah'],
    [1, 'satu rupiah'],
    [10, 'sepuluh rupiah'],
    [11, 'sebelas rupiah'],
    [12, 'dua belas rupiah'],
    [19, 'sembilan belas rupiah'],
    [20, 'dua puluh rupiah'],
    [21, 'dua puluh satu rupiah'],
    [100, 'seratus rupiah'],
    [101, 'seratus satu rupiah'],
    [110, 'seratus sepuluh rupiah'],
    [115, 'seratus lima belas rupiah'],
    [200, 'dua ratus rupiah'],
    [999, 'sembilan ratus sembilan puluh sembilan rupiah'],
    [1000, 'seribu rupiah'],
    [1001, 'seribu satu rupiah'],
    [1100, 'seribu seratus rupiah'],
    [11_000, 'sebelas ribu rupiah'],
    [100_000, 'seratus ribu rupiah'],
    [1_000_000, 'satu juta rupiah'],
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
});

describe('formatRupiahDoc', () => {
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
});

describe('tanggalPanjang / hari', () => {
  it('formats real dates in Indonesian', () => {
    expect(tanggalPanjang('2026-10-21')).toBe('21 Oktober 2026');
    expect(tanggalPanjang('2026-01-01 08:00:00')).toBe('1 Januari 2026');
    expect(tanggalPanjang('2024-02-29')).toBe('29 Februari 2024');
    expect(hari('2026-10-21')).toBe('Rabu');
    expect(hari('2024-02-29')).toBe('Kamis');
    expect(hari('2026-08-17')).toBe('Senin');
  });

  it('returns an empty string for empty or impossible dates', () => {
    for (const bad of ['', 'abc', '2026-02-30', '2026-13-01', '21-10-2026']) {
      expect(tanggalPanjang(bad)).toBe('');
      expect(hari(bad)).toBe('');
    }
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

  it('treats an empty item list as zero', () => {
    expect(calcInvoice([], { ...off, ppn_enabled: true, pph23_enabled: true }).amount_due).toBe(0);
  });
});

describe('resolveMerge', () => {
  it('fills known fields, also with spaces and array indexes', () => {
    expect(resolveMerge('{{client.name}} · {{ project.value_rupiah }} · {{milestones.0.title}}', merge())).toEqual({
      text: 'PT Klien Maju · Rp15.000.000 · Desain',
      missing: [],
    });
    expect(resolveMerge('{{project.value}} {{project.has_maintenance}} {{company.npwp}}|', merge()).text).toBe('15000000 Tidak |');
  });

  it('marks unknown fields once, in order', () => {
    expect(resolveMerge('{{a.b}} {{client.nama}} {{a.b}} {{project}} {{company.bank_accounts}}', merge())).toEqual({
      text: '[…] […] […] […] […]',
      missing: ['a.b', 'client.nama', 'project', 'company.bank_accounts'],
    });
  });

  it('never walks the prototype chain', () => {
    expect(resolveMerge('{{client.constructor}} {{__proto__.x}} {{milestones.length}}', merge()).missing).toEqual(['client.constructor', '__proto__.x']);
  });

  it('leaves text without fields alone', () => {
    expect(resolveMerge('Biaya {100} dan {{ }}', merge())).toEqual({ text: 'Biaya {100} dan {{ }}', missing: [] });
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

describe('defaultContent + buildModel (placeholder smoke test)', () => {
  it('builds a model with resolved fields, markup, e-Meterai and both signature slots', () => {
    const data = merge();
    const content = defaultContent('pks', data);
    expect(content.sections.length).toBeGreaterThan(0);
    content.sections.push(
      { id: 'lingkup', title: 'Ruang lingkup', body: 'Pekerjaan untuk **{{client.name}}**:\n- Desain\n- Pengembangan\n\n1. Satu\n2. Dua\n\n{{tidak.ada}}' },
      { id: 'tersembunyi', title: 'Rahasia', body: 'tidak tampil', hidden: true },
    );
    const model = buildModel('pks', content, data);
    expect(model.meta).toEqual({ number: '007/PKS/GNB/X/2026', title: 'PERJANJIAN KERJA SAMA PEMBUATAN WEBSITE', type: 'pks', date: '2026-10-21' });
    expect(model.kop.company.name).toBe('PT Garuda Nexa Bahtera');
    expect(model.footer.text).toBe('007/PKS/GNB/X/2026');
    expect(model.missing).toEqual(['tidak.ada']);
    expect(JSON.stringify(model.blocks)).not.toContain('Rahasia');
    expect(model.blocks).toContainEqual({ type: 'paragraph', runs: [{ text: 'Pekerjaan untuk ' }, { text: 'PT Klien Maju', bold: true }, { text: ':' }], align: 'justify' });
    expect(model.blocks).toContainEqual({ type: 'list', ordered: false, items: [[{ text: 'Desain' }], [{ text: 'Pengembangan' }]] });
    expect(model.blocks).toContainEqual({ type: 'list', ordered: true, items: [[{ text: 'Satu' }], [{ text: 'Dua' }]] });
    expect(model.blocks.some((b) => b.type === 'meteraiBox')).toBe(true);
    expect(model.signatures.map((s) => [s.label, s.organization, s.signer_name, s.signed_at])).toEqual([
      ['PIHAK PERTAMA', 'PT Garuda Nexa Bahtera', 'Budi Santoso', null],
      ['PIHAK KEDUA', 'PT Klien Maju', 'Sari', null],
    ]);
  });

  it('uses the signature of the current version and skips e-Meterai below Rp5.000.000', () => {
    const data = merge({
      project: { ...merge().project, value: 4_999_999 },
      signatures: [{ party: 'pihak_kedua', signer_name: 'Sari W.', signer_title: 'Direktur', signed_at: '2026-10-22 10:00:00', image_url: 'pdfile:sig:9' }],
    });
    const model = buildModel('bast', defaultContent('bast', data), data);
    expect(model.blocks.some((b) => b.type === 'meteraiBox')).toBe(false);
    expect(model.signatures[1]).toMatchObject({ signer_name: 'Sari W.', signer_title: 'Direktur', signed_at: '2026-10-22 10:00:00', image_ref: 'pdfile:sig:9' });
    expect(buildModel('brd', defaultContent('brd', data), data).signatures).toEqual([]);
  });
});
