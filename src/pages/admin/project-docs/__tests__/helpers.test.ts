// Jalankan: npx vitest run src/pages/admin/project-docs/__tests__/helpers.test.ts
import { describe, expect, it } from 'vitest';
import { groupMissing } from '../editor/missing';
import { bankAccountUsed, validateBankAccounts, validateTerms } from '../shared/validation';

describe('Peringatan data kosong di editor', () => {
  it('mengelompokkan field per tempat mengisinya, tanggal proyek ke form Project Clients', () => {
    const groups = groupMissing(
      ['company.signatory_name', 'client.npwp', 'project.start_date_long', 'project.duration_text', 'project.scope_summary', 'milestones', 'invoice.notes'],
      17,
    );
    expect(groups).toEqual([
      { label: 'Pengaturan dokumen', to: '/admin/proyek/pengaturan', fields: ['company.signatory_name'] },
      { label: 'Data klien', to: '/admin/klien', fields: ['client.npwp'] },
      { label: 'Data proyek (Project Clients)', to: '/admin/project-clients?edit=17', fields: ['project.start_date_long', 'project.duration_text'] },
      { label: 'Ringkasan proyek', to: '/admin/proyek/17', fields: ['project.scope_summary'] },
      { label: 'Tab Jadwal', to: '/admin/proyek/17?tab=jadwal', fields: ['milestones'] },
      { label: 'Rincian invoice', to: null, fields: ['invoice.notes'] },
    ]);
  });
});

describe('Validasi pengaturan', () => {
  it('rekening yang dipakai wajib punya bank dan nomor; baris kosong (atas nama terisi otomatis) diabaikan', () => {
    const unused = { bank: '', number: '', holder: 'PT Garuda Nexa Bahtera' };
    expect(bankAccountUsed(unused)).toBe(false);
    expect(validateBankAccounts([unused])).toEqual({});
    expect(validateBankAccounts([{ bank: 'BCA', number: '', holder: '' }, { bank: '', number: '12a', holder: '' }])).toEqual({
      'company.bank_accounts.0.number': 'Nomor rekening wajib diisi.',
      'company.bank_accounts.1.bank': 'Nama bank wajib diisi.',
      'company.bank_accounts.1.number': 'Nomor rekening hanya angka.',
    });
  });

  it('termin harus berjumlah 100% (toleransi 0,01)', () => {
    const term = (key: string, percent: number) => ({ key, label: key, percent, trigger: 'manual' as const, due_days: 7 });
    expect(validateTerms([term('dp', 50), term('termin2', 30), term('pelunasan', 20)])).toEqual({});
    expect(validateTerms([term('dp', 33.33), term('termin2', 33.33), term('pelunasan', 33.34)])).toEqual({});
    expect(validateTerms([term('dp', 40), term('termin2', 30), term('pelunasan', 20)])).toEqual({ payment_terms: 'Total persentase termin harus 100%.' });
    expect(validateTerms([term('dp', 50), term('DP', 50)])['payment_terms.1.key']).toBe('Kode termin tidak boleh sama.');
  });
});
