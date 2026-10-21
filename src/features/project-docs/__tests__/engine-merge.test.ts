// Merge fields of the document engine (spec §4.1, §4.3): resolution against MergeData, the derived fields of
// mergeView, fallbacks, and the rule that an empty value is reported like an unknown one.
import { describe, expect, it } from 'vitest';
import { MISSING_FIELD, resolveMerge } from '../engine';
import { mergeView, serviceName, termsText } from '../engine/mergeView';
import type { MergeData } from '../types';
import { fullMerge, personMerge } from './engine-fixtures';

const view = (data: MergeData) => mergeView(data) as Record<string, Record<string, unknown>>;

describe('resolveMerge', () => {
  it('fills known fields, also with spaces and array indexes', () => {
    expect(resolveMerge('{{client.name}} · {{ project.value_rupiah }} · {{milestones.0.title}}', fullMerge())).toEqual({
      text: 'PT Klien Maju · Rp15.000.000 · Analisis & desain',
      missing: [],
    });
    expect(resolveMerge('{{project.value}} {{project.has_maintenance}} {{document.version}}', fullMerge()).text).toBe('15000000 Ya 2');
  });

  it('marks unknown fields once, in order', () => {
    expect(resolveMerge('{{a.b}} {{client.nama}} {{a.b}} {{project}} {{company.bank_accounts}}', fullMerge())).toEqual({
      text: `${MISSING_FIELD} ${MISSING_FIELD} ${MISSING_FIELD} ${MISSING_FIELD} ${MISSING_FIELD}`,
      missing: ['a.b', 'client.nama', 'project', 'company.bank_accounts'],
    });
  });

  it('reports empty values like unknown ones, unless a fallback is given', () => {
    const data = fullMerge({ company: { ...fullMerge().company, npwp: '', address: '  ' } });
    expect(resolveMerge('NPWP {{company.npwp}}, {{company.address}}', data)).toEqual({ text: `NPWP ${MISSING_FIELD}, ${MISSING_FIELD}`, missing: ['company.npwp', 'company.address'] });
    expect(resolveMerge('NPWP {{company.npwp|-}} / {{company.npwp | belum ada }} / [{{company.npwp|}}]', data)).toEqual({ text: 'NPWP - / belum ada / []', missing: [] });
    expect(resolveMerge('{{tidak.ada|tanpa data}}', data)).toEqual({ text: 'tanpa data', missing: [] });
    expect(resolveMerge('{{client.name|cadangan}}', data).text).toBe('PT Klien Maju');
  });

  it('never walks the prototype chain', () => {
    expect(resolveMerge('{{client.constructor}} {{__proto__.x}} {{client.toString}}', fullMerge()).missing).toEqual(['client.constructor', '__proto__.x', 'client.toString']);
  });

  it('leaves text without fields and block directives alone', () => {
    expect(resolveMerge('Biaya {100} dan {{ }} dan {{#termin}}', fullMerge())).toEqual({ text: 'Biaya {100} dan {{ }} dan {{#termin}}', missing: [] });
  });

  it('a merged value is plain text (no markup or nested fields)', () => {
    const data = fullMerge({ client: { ...fullMerge().client, name: '**Evil** {{company.npwp}}' } });
    expect(resolveMerge('{{client.name}}', data)).toEqual({ text: '**Evil** {{company.npwp}}', missing: [] });
  });
});

describe('mergeView derived fields', () => {
  it('formats project dates, duration, maintenance and terms', () => {
    const p = view(fullMerge()).project;
    expect(p).toMatchObject({
      service_name: 'Website Company Profile',
      start_date_long: '21 Oktober 2026',
      end_date_long: '30 November 2026',
      duration_text: '41 (empat puluh satu) hari kalender',
      maintenance_fee_rupiah: 'Rp750.000',
      maintenance_fee_terbilang: 'tujuh ratus lima puluh ribu rupiah',
      maintenance_period_label: 'Bulanan',
      maintenance_period_unit: 'bulan',
      maintenance_start_long: '1 Desember 2026',
      maintenance_end_long: '30 November 2027',
      payment_terms_text: 'Uang muka (DP) 50%, Termin 2 30%, dan Pelunasan 20%',
    });
  });

  it('computes what the backend may leave empty and blanks what cannot be known', () => {
    const base = fullMerge();
    const data = fullMerge({
      project: { ...base.project, value_rupiah: '', value_terbilang: '', duration_days: 0, start_date: '', maintenance_fee: 0, maintenance_period: '' },
      document: { ...base.document, date_long: '', day: '' },
    });
    const v = view(data);
    expect(v.project).toMatchObject({ value_rupiah: 'Rp15.000.000', value_terbilang: 'lima belas juta rupiah', duration_text: '', maintenance_fee_rupiah: '', maintenance_period_unit: '' });
    expect(v.document).toMatchObject({ date_long: '21 Oktober 2026', day: 'Rabu', valid_until_long: '20 November 2026', warranty_until_long: '19 Januari 2027', year: '2026' });
    expect(resolveMerge('{{project.duration_text}}', data).missing).toEqual(['project.duration_text']);
  });

  it('describes invoices and payments', () => {
    const v = view(fullMerge());
    expect(v.invoice).toMatchObject({
      kind_label: 'Uang muka (DP)',
      term_label: 'Uang muka (DP)',
      term_percent: '50',
      term_description: 'Uang muka (DP) sebesar 50% dari nilai kontrak Rp15.000.000',
      issue_date_long: '22 Oktober 2026',
      due_date_long: '29 Oktober 2026',
      amount_due_rupiah: 'Rp8.175.000',
      amount_due_terbilang: 'delapan juta seratus tujuh puluh lima ribu rupiah',
      remaining_rupiah: 'Rp8.175.000',
      payment_status_label: 'Belum dibayar',
    });
    expect(String(v.invoice.pph23_note)).toContain('PPh Pasal 23 sebesar Rp150.000 (2%) dipotong oleh PT Klien Maju');
    expect(v.payment).toMatchObject({ amount_rupiah: 'Rp8.175.000', paid_at_long: '25 Oktober 2026', method_label: 'Transfer bank' });
    const manual = view(fullMerge({ invoice: { ...fullMerge().invoice!, term_key: null, kind: 'lainnya', pph23_amount: 0 } })).invoice;
    expect(manual).toMatchObject({ term_label: 'Lainnya', term_percent: '', term_description: 'Lainnya', pph23_note: '' });
    const maintenance = view(fullMerge({ invoice: { ...fullMerge().invoice!, term_key: null, kind: 'maintenance' } })).invoice;
    expect(maintenance.term_description).toBe('Biaya pemeliharaan dan dukungan Website');
    expect(view(fullMerge({ invoice: undefined, payment: undefined })).invoice).toBeUndefined();
  });

  it('labels the client type and milestones', () => {
    expect(view(personMerge()).client.type_label).toBe('Perorangan');
    const milestones = mergeView(fullMerge()).milestones as Record<string, unknown>[];
    expect(milestones[0]).toMatchObject({ start_date_long: '21 Oktober 2026', due_date_long: '31 Oktober 2026', status_label: 'Selesai' });
  });

  it('survives partial (older) snapshots', () => {
    const partial = { company: {}, client: {}, project: {}, document: {} } as unknown as MergeData;
    expect(() => mergeView(partial)).not.toThrow();
    expect(resolveMerge('{{project.service_name}} {{milestones.0.title}}', partial).missing).toEqual(['project.service_name', 'milestones.0.title']);
  });

  it('serviceName does not repeat the service', () => {
    expect(serviceName('Website', 'Website Company Profile')).toBe('Website Company Profile');
    expect(serviceName('Website', 'Toko Batik Sekar')).toBe('Website Toko Batik Sekar');
    expect(serviceName('Aplikasi Mobile', 'Aplikasi Kasir')).toBe('Aplikasi Kasir');
    expect(serviceName('Aplikasi Custom', 'Sistem Absensi')).toBe('Aplikasi Custom Sistem Absensi');
    expect(serviceName('', 'Sistem Absensi')).toBe('Sistem Absensi');
    expect(serviceName('Website', '  ')).toBe('');
  });

  it('termsText joins terms in Indonesian', () => {
    const t = (label: string, percent: number) => ({ key: label, label, percent, trigger: 'manual' as const, due_days: 7 });
    expect(termsText([])).toBe('');
    expect(termsText([t('Lunas', 100)])).toBe('Lunas 100%');
    expect(termsText([t('DP', 50), t('Pelunasan', 50)])).toBe('DP 50% dan Pelunasan 50%');
    expect(termsText([t('DP', 40), t('Termin', 32.5), t('Pelunasan', 27.5)])).toBe('DP 40%, Termin 32,5%, dan Pelunasan 27,5%');
  });
});
