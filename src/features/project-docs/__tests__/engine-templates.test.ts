// Default templates of every document type (spec §6 "Templates"): complete with full MergeData (no unresolved merge
// fields, for companies and private clients and every service type), the required parts per type, editor hints for
// every section, and the size limit of stored content.
import { describe, expect, it } from 'vitest';
import { DOC_TYPES, MISSING_FIELD, SECTION_HINTS, buildModel, defaultContent, type Block, type DocModel } from '../engine';
import type { DocContent, DocType, MergeData, ServiceType } from '../types';
import { fullMerge, personMerge } from './engine-fixtures';

const TYPES = Object.keys(DOC_TYPES) as DocType[];
const SERVICES: ServiceType[] = ['website', 'mobile_app', 'ui_ux', 'other'];

const withService = (data: MergeData, service: ServiceType): MergeData => ({ ...data, project: { ...data.project, service_type: service } });
const headings = (model: DocModel) => model.blocks.filter((b): b is Extract<Block, { type: 'heading' }> => b.type === 'heading').map((b) => b.text);
const text = (model: DocModel) => JSON.stringify(model.blocks);
const ids = (content: DocContent) => content.sections.map((s) => s.id);

describe('template completeness', () => {
  for (const type of TYPES) {
    it(`${type}: every merge field and directive resolves with full data`, () => {
      for (const data of [fullMerge(), personMerge()]) {
        for (const service of SERVICES) {
          const merged = withService(data, service);
          const model = buildModel(type, defaultContent(type, merged), merged);
          expect(model.missing, `${type}/${data.client.type}/${service}`).toEqual([]);
          expect(text(model)).not.toContain(MISSING_FIELD);
          expect(text(model)).not.toMatch(/\{\{|\}\}/);
        }
      }
    });
  }

  it('uses unique section ids, every one with an editor hint', () => {
    for (const type of TYPES) {
      const content = defaultContent(type, fullMerge());
      expect(new Set(ids(content)).size, type).toBe(content.sections.length);
      for (const id of ids(content)) expect(SECTION_HINTS[type][id], `${type}.${id}`).toBeTruthy();
    }
  });

  it('stays far below the 256 KB content limit', () => {
    for (const type of TYPES) expect(JSON.stringify(defaultContent(type, fullMerge())).length, type).toBeLessThan(64 * 1024);
  });

  it('reports missing project data instead of printing blanks', () => {
    const base = fullMerge();
    const empty = fullMerge({
      company: { ...base.company, signatory_name: '', address: '', bank_accounts: [] },
      project: { ...base.project, scope_summary: '', payment_terms: [] },
      milestones: [],
      signatures: [],
    });
    const model = buildModel('pks', defaultContent('pks', empty), empty);
    expect(model.missing).toEqual(
      expect.arrayContaining(['company.address', 'company.signatory_name', 'project.scope_summary', 'project.payment_terms', 'company.bank_accounts', 'milestones']),
    );
  });

  it('works on partial MergeData (an older or incomplete snapshot)', () => {
    const partial = { company: { name: 'PT Garuda Nexa Bahtera' }, client: {}, project: {}, milestones: [], document: { number: '001/BRD/GNB/X/2026', date: '2026-10-21' }, signatures: [] } as unknown as MergeData;
    for (const type of TYPES) expect(() => buildModel(type, defaultContent(type, partial), partial), type).not.toThrow();
  });
});

describe('template structure', () => {
  it('BRD: required sections, stakeholder table, MoSCoW requirements', () => {
    const content = defaultContent('brd', fullMerge());
    expect(ids(content)).toEqual(['informasi', 'latar_belakang', 'tujuan', 'ruang_lingkup', 'pemangku_kepentingan', 'kebutuhan_fungsional', 'kebutuhan_non_fungsional', 'asumsi', 'kriteria', 'persetujuan']);
    const fr = content.sections.find((s) => s.id === 'kebutuhan_fungsional')!.table!;
    expect(fr.columns).toEqual(['Kode', 'Kebutuhan', 'Prioritas']);
    expect(fr.rows[0][0]).toBe('FR-01');
    for (const row of fr.rows) expect(['Must have', 'Should have', 'Could have', "Won't have"]).toContain(row[2]);
    // the requirements follow the kind of project
    const mobile = defaultContent('brd', withService(fullMerge(), 'mobile_app'));
    expect(JSON.stringify(mobile)).toContain('Google Play');
    // private client: no separate PIC row
    expect(defaultContent('brd', personMerge()).sections.find((s) => s.id === 'pemangku_kepentingan')!.table!.rows).toHaveLength(4);
  });

  it('MoU: articles 1–8 incl. non-binding financing and confidentiality', () => {
    const data = fullMerge();
    const model = buildModel('mou', defaultContent('mou', data), data);
    expect(model.meta.title).toBe('NOTA KESEPAHAMAN (MEMORANDUM OF UNDERSTANDING) TENTANG KERJA SAMA PEMBUATAN WEBSITE');
    expect(headings(model).filter((h) => h.startsWith('Pasal'))).toEqual([
      'Pasal 1\nMAKSUD DAN TUJUAN',
      'Pasal 2\nRUANG LINGKUP KERJA SAMA',
      'Pasal 3\nJANGKA WAKTU',
      'Pasal 4\nPEMBIAYAAN',
      'Pasal 5\nKERAHASIAAN',
      'Pasal 6\nSIFAT KESEPAHAMAN',
      'Pasal 7\nLAIN-LAIN',
      'Pasal 8\nPENUTUP',
    ]);
    expect(text(model)).toContain('bersifat indikatif dan tidak mengikat');
    expect(model.signatures.map((s) => s.label)).toEqual(['PIHAK PERTAMA', 'PIHAK KEDUA']);
    expect(model.blocks.some((b) => b.type === 'meteraiBox')).toBe(false);
  });

  it('Proposal: cost table, payment terms from the project, 30-day validity', () => {
    const data = fullMerge();
    const model = buildModel('proposal', defaultContent('proposal', data), data);
    const tables = model.blocks.filter((b): b is Extract<Block, { type: 'table' }> => b.type === 'table');
    const termin = tables.find((t) => t.columns[1] === 'Termin')!;
    expect(termin.rows.map((r) => r.map((c) => c.map((x) => x.text).join('')).slice(1, 4))).toEqual([
      ['Uang muka (DP)', '50%', 'Rp7.500.000'],
      ['Termin 2', '30%', 'Rp4.500.000'],
      ['Pelunasan', '20%', 'Rp3.000.000'],
      ['Total', '100%', 'Rp15.000.000'],
    ]);
    const biaya = tables.find((t) => t.columns[1] === 'Uraian pekerjaan')!;
    expect(biaya.total).toBe(true);
    expect(biaya.align?.[3]).toBe('right');
    expect(tables.some((t) => t.columns.join() === 'No,Tahapan,Periode,Durasi')).toBe(true);
    expect(text(model)).toContain('sampai dengan ');
    expect(text(model)).toContain('20 November 2026');
  });

  it('PKS + SOW: opening, parties, Pasal 1–14, signatures + e-Meterai, then the SOW on a new page', () => {
    const data = fullMerge();
    const model = buildModel('pks', defaultContent('pks', data), data);
    expect(model.meta.title).toBe('PERJANJIAN KERJA SAMA PEMBUATAN WEBSITE');
    expect(text(model)).toContain('Pada hari ini, ');
    expect(text(model)).toContain('"text":"Rabu"');
    expect(text(model)).toContain('selanjutnya disebut ');
    const pasal = headings(model).filter((h) => h.startsWith('Pasal')).map((h) => h.split('\n')[0]);
    expect(pasal).toEqual(Array.from({ length: 14 }, (_, i) => `Pasal ${i + 1}`));
    expect(headings(model)).toEqual(expect.arrayContaining(['Pasal 4\nNILAI PERJANJIAN', 'Pasal 13\nPENYELESAIAN PERSELISIHAN']));
    expect(text(model)).toContain('Pengadilan Negeri Bandung');
    expect(text(model)).toContain('lima belas juta rupiah');
    const types = model.blocks.map((b) => b.type);
    const sign = types.indexOf('signatures');
    expect(types[sign - 1]).toBe('meteraiBox');
    expect(types[sign + 1]).toBe('pageBreak');
    expect(model.blocks[sign + 2]).toEqual({ type: 'heading', level: 1, text: 'LAMPIRAN – PERNYATAAN LINGKUP KERJA (STATEMENT OF WORK)', align: 'center' });
    for (const part of ['A. Deliverable', 'B. Fitur dan spesifikasi', 'C. Di luar ruang lingkup', 'D. Asumsi dan ketergantungan', 'E. Kriteria penerimaan', 'F. Jadwal dan milestone']) {
      expect(headings(model)).toContain(part);
    }
    // maintenance wording follows the project flag
    expect(JSON.stringify(defaultContent('pks', data))).toContain('merupakan satu kesatuan dengan Perjanjian ini');
    const noMaintenance = fullMerge({ project: { ...data.project, has_maintenance: false } });
    expect(JSON.stringify(defaultContent('pks', noMaintenance))).toContain('dapat disepakati PARA PIHAK');
  });

  it('PKS identifies a private client as a person', () => {
    const data = personMerge();
    const model = buildModel('pks', defaultContent('pks', data), data);
    expect(text(model)).toContain('bertindak untuk dan atas nama diri sendiri');
    expect(model.signatures[1]).toMatchObject({ organization: '' });
  });

  it('Timeline: milestone table with dates, duration, weight and status', () => {
    const data = fullMerge();
    const model = buildModel('timeline', defaultContent('timeline', data), data);
    const table = model.blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table')!;
    expect(table.columns).toEqual(['No', 'Tahapan', 'Mulai', 'Selesai', 'Durasi', 'Bobot', 'Status']);
    expect(table.rows[1].map((c) => c.map((x) => x.text).join(''))).toEqual(['2', 'Pengembangan', '1 Nov 2026', '20 Nov 2026', '20 hari', '62,5%', 'Berjalan']);
  });

  it('UAT: scenario table, summary counted from it, both signatures', () => {
    const data = fullMerge();
    const content = defaultContent('uat', data);
    const scenarios = content.sections.find((s) => s.id === 'skenario')!.table!;
    expect(scenarios.columns).toEqual(['ID', 'Fitur', 'Langkah pengujian', 'Hasil yang diharapkan', 'Hasil aktual', 'Lulus/Gagal', 'Catatan']);
    scenarios.rows[0][5] = 'Lulus';
    scenarios.rows[1][5] = '**Gagal**';
    scenarios.rows[2][5] = 'lulus dengan catatan';
    const model = buildModel('uat', content, data);
    const summary = model.blocks.find((b): b is Extract<Block, { type: 'keyValue' }> => b.type === 'keyValue' && b.rows[0].label === 'Jumlah skenario')!;
    expect(summary.rows.map((r) => [r.label, r.value[0].text])).toEqual([
      ['Jumlah skenario', '9'],
      ['Lulus', '2'],
      ['Gagal', '1'],
      ['Belum diuji', '6'],
      ['Tingkat kelulusan', '22,22%'],
    ]);
    expect(model.signatures).toHaveLength(2);
  });

  it('BAST: parties, hand-over table, warranty date, e-Meterai', () => {
    const data = fullMerge();
    const model = buildModel('bast', defaultContent('bast', data), data);
    expect(model.meta.title).toBe('BERITA ACARA SERAH TERIMA PEKERJAAN');
    const table = model.blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table')!;
    expect(table.rows.map((r) => r[1][0].text)).toEqual(['Domain', 'Hosting/server', 'Kode sumber', 'Akun administrator', 'Dokumentasi', 'Pelatihan']);
    expect(text(model)).toContain('19 Januari 2027');
    expect(text(model)).toContain('baik, lengkap, dan berfungsi');
    expect(model.blocks.some((b) => b.type === 'meteraiBox')).toBe(true);
  });

  it('Invoice: items, totals with taxes, terbilang, bank accounts, status', () => {
    const data = fullMerge();
    const model = buildModel('invoice', defaultContent('invoice', data), data);
    const totals = model.blocks.find((b): b is Extract<Block, { type: 'keyValue' }> => b.type === 'keyValue' && b.variant === 'totals')!;
    expect(totals.rows.map((r) => [r.label, r.value[0].text])).toEqual([
      ['Subtotal', 'Rp7.500.000'],
      ['DPP nilai lain', 'Rp6.875.000'],
      ['PPN 12%', 'Rp825.000'],
      ['Total', 'Rp8.325.000'],
      ['Dipotong PPh Pasal 23 (2%)', '-Rp150.000'],
      ['Jumlah yang harus dibayar', 'Rp8.175.000'],
    ]);
    expect(text(model)).toContain('delapan juta seratus tujuh puluh lima ribu rupiah');
    expect(text(model)).toContain('1234567890');
    expect(text(model)).toContain('Belum dibayar');
    expect(model.signatures).toEqual([]);
    // a partly paid invoice shows what is left
    const paid = fullMerge({ invoice: { ...data.invoice!, amount_paid: 5_000_000, payment_status: 'sebagian' } });
    const paidTotals = buildModel('invoice', defaultContent('invoice', paid), paid).blocks.find((b): b is Extract<Block, { type: 'keyValue' }> => b.type === 'keyValue' && b.variant === 'totals')!;
    expect(paidTotals.rows.slice(-2).map((r) => [r.label, r.value[0].text, r.strong])).toEqual([
      ['Telah dibayar', '-Rp5.000.000', undefined],
      ['Sisa tagihan', 'Rp3.175.000', true],
    ]);
  });

  it('Kuitansi: received from, amount in words (italic), purpose, framed amount, place/date and receiver', () => {
    const data = fullMerge();
    const model = buildModel('receipt', defaultContent('receipt', data), data);
    expect(model.meta.title).toBe('KUITANSI');
    const rows = model.blocks.find((b): b is Extract<Block, { type: 'keyValue' }> => b.type === 'keyValue')!.rows;
    expect(rows.map((r) => r.label)).toEqual(['Telah terima dari', 'Uang sejumlah', 'Untuk pembayaran', 'Tanggal pembayaran', 'Metode pembayaran', 'Referensi']);
    expect(rows[1].value).toEqual([{ text: 'delapan juta seratus tujuh puluh lima ribu rupiah', italic: true }]);
    expect(rows[2].value[0].text).toContain('001/INV/GNB/X/2026');
    expect(model.blocks).toContainEqual({ type: 'paragraph', runs: [{ text: 'Rp8.175.000,-', bold: true }], boxed: true, size: 'large', align: 'left' });
    expect(model.signatures).toEqual([
      expect.objectContaining({ label: 'Penerima,', organization: 'PT Garuda Nexa Bahtera', signer_name: 'Budi Santoso', caption: 'Bandung, 21 Oktober 2026', signed_at: null }),
    ]);
  });

  it('SLA: service hours, uptime and priorities from settings; fee and period from the project', () => {
    const data = fullMerge();
    const settings = { sla_defaults: { support_hours: 'Setiap hari 08.00–20.00 WIB', uptime: '99,9%', priorities: [{ level: 'P1 – Darurat', response: '1 jam', resolution: '4 jam' }] } };
    const model = buildModel('sla', defaultContent('sla', data, settings), data);
    expect(text(model)).toContain('Setiap hari 08.00–20.00 WIB');
    expect(text(model)).toContain('99,9%');
    expect(text(model)).toContain('Rp750.000');
    expect(text(model)).toContain('per bulan');
    expect(text(model)).toContain('1 Desember 2026');
    const priorities = model.blocks.find((b): b is Extract<Block, { type: 'table' }> => b.type === 'table')!;
    expect(priorities.rows.map((r) => r.map((c) => c.map((x) => x.text).join('')))).toEqual([
      ['P1 – Darurat', 'Layanan tidak dapat diakses sama sekali, data hilang, atau terdapat celah keamanan aktif', '1 jam', '4 jam'],
    ]);
    // without settings: the seeded defaults
    const defaults = buildModel('sla', defaultContent('sla', data), data);
    expect(text(defaults)).toContain('Senin–Jumat 09.00–17.00 WIB');
    expect(text(defaults)).toContain('P3 – Normal');
  });
});
