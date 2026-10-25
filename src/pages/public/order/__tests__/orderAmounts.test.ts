// Jalankan: npx vitest run src/pages/public/order/__tests__/orderAmounts.test.ts
// Rincian harga pesanan template (template setelah diskon + domain) dan pemecahan isian nama domain + ekstensi.
import { describe, expect, it } from 'vitest';
import { DOMAIN_PRICE_FROM } from '../../../../lib/domainPricing';
import type { DomainCheck, Template } from '../../../../types/platform';
import {
  DOMAIN_FROM_TEXT,
  domainTakenError,
  isUsableCheck,
  moneyLabel,
  orderAmounts,
  perYear,
  splitDomainInput,
} from '../orderAmounts';

const template = (price: number) => ({ id: 1, price }) as Template;
const check = (domain: string, status: DomainCheck['status'], price = 250000): DomainCheck => ({
  domain,
  tld: domain.slice(domain.indexOf('.') + 1),
  status,
  price,
});
const QUOTE_20 = { list_price: 1500000, discount_percent: 20, discount_amount: 300000, price: 1200000 };

describe('orderAmounts', () => {
  it('belum ada domain: subtotal = harga template, tetap dianggap berbayar', () => {
    const a = orderAmounts(template(1500000), null, null);
    expect(a).toMatchObject({ listPrice: 1500000, discountAmount: 0, templatePrice: 1500000, domain: null, total: 1500000, free: false });
  });

  it('domain tersedia: total = template + domain', () => {
    const a = orderAmounts(template(1500000), null, check('tokosaya.com', 'available'));
    expect(a.domain).toEqual({ name: 'tokosaya.com', price: 250000 });
    expect(a.total).toBe(1750000);
  });

  it('diskon pembelian pertama: template setelah diskon + domain', () => {
    const a = orderAmounts(template(1500000), QUOTE_20, check('tokosaya.my.id', 'unknown', 50000));
    expect(a).toMatchObject({ listPrice: 1500000, discountAmount: 300000, discountPercent: 20, templatePrice: 1200000, total: 1250000 });
  });

  it('quote tanpa potongan diabaikan (harga katalog)', () => {
    const a = orderAmounts(template(1500000), { ...QUOTE_20, discount_amount: 0, price: 1500000 }, null);
    expect(a).toMatchObject({ discountAmount: 0, templatePrice: 1500000 });
  });

  it('domain sudah dipakai tidak dihitung', () => {
    expect(isUsableCheck(check('tokosaya.com', 'taken'))).toBe(false);
    expect(orderAmounts(template(1500000), null, check('tokosaya.com', 'taken'))).toMatchObject({ domain: null, total: 1500000 });
  });

  it('template gratis: berbayar karena domain; gratis hanya bila domain dipilih dan total 0', () => {
    expect(orderAmounts(template(0), null, null).free).toBe(false);
    expect(orderAmounts(template(0), null, check('tokosaya.com', 'available')).free).toBe(false);
    expect(orderAmounts(template(0), null, check('tokosaya.com', 'available', 0)).free).toBe(true);
  });
});

describe('splitDomainInput', () => {
  it('nama + ekstensi dropdown; isian dengan ekstensi yang dijual menggantikan pilihan dropdown', () => {
    expect(splitDomainInput('TokoSaya', 'com')).toEqual({ name: 'tokosaya', tld: 'com', domain: 'tokosaya.com', error: undefined });
    expect(splitDomainInput('https://www.Toko.co.id/x', 'com')).toEqual({ name: 'toko', tld: 'co.id', domain: 'toko.co.id', error: undefined });
    expect(splitDomainInput('toko.my.id', 'id')).toMatchObject({ name: 'toko', tld: 'my.id' });
  });

  it('galat sama dengan server: kosong, karakter salah, ekstensi yang tidak dijual', () => {
    expect(splitDomainInput('  ', 'com').error).toBe('Nama domain wajib diisi.');
    expect(splitDomainInput('-toko', 'com').error).toBe('Format domain tidak valid, contoh: namabisnis.com');
    expect(splitDomainInput('toko.xyz', 'com').error).toBe('Ekstensi domain belum tersedia. Pilih ekstensi dari daftar.');
    // Dengan daftar dari server (DewaBiz) .xyz dijual
    const tlds = [{ tld: 'com', price: 250000, requirement: null }, { tld: 'xyz', price: 19000, requirement: null }];
    expect(splitDomainInput('toko.xyz', 'com', tlds)).toEqual({ name: 'toko', tld: 'xyz', domain: 'toko.xyz', error: undefined });
  });
});

describe('teks harga domain', () => {
  it('format rupiah ringkas per tahun dan pesan domain dipakai (sama dengan server)', () => {
    expect(perYear(250000)).toBe('Rp250.000/tahun');
    expect(DOMAIN_FROM_TEXT).toBe(`mulai ${perYear(DOMAIN_PRICE_FROM)}`);
    expect(DOMAIN_FROM_TEXT).toBe('mulai Rp50.000/tahun');
    expect(domainTakenError('tokosaya.com')).toBe('Domain tokosaya.com sudah dipakai orang lain. Cek nama lain.');
    expect(moneyLabel(0)).toBe('Gratis');
    expect(moneyLabel(1750000)).toBe('Rp 1.750.000');
  });
});
