// Jalankan: npx vitest run src/lib/__tests__/companyFacts.test.ts
// COMPANY_FACTS (docs/platform/SEO-PLAN.md Lampiran B, keputusan default di kepala rencana): kontak sama dengan bawaan
// useSiteSettings, isi paket sama dengan bawaan Pengaturan > Harga, fakta yang belum ada = null, tanpa angka harga.
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTACT_EMAIL, TEMPLATE_PRICE_INCLUDES_DEFAULT, getWhatsappNumber } from '../../hooks/useSiteSettings';
import { COMPANY_FACTS } from '../companyFacts';

describe('COMPANY_FACTS', () => {
  it('nama, badan hukum, situs, dan kontak yang sudah pasti', () => {
    expect(COMPANY_FACTS.name).toBe('Garuda Nexa');
    expect(COMPANY_FACTS.legalName).toBe('PT Garuda Nexa Bahtera');
    expect(COMPANY_FACTS.url).toBe('https://garudanexa.com');
    expect(COMPANY_FACTS.email).toBe('info@garudanexa.com');
    expect(COMPANY_FACTS.whatsapp).toBe('6285188009152');
    expect(COMPANY_FACTS.whatsappDisplay).toBe('+62 851-8800-9152');
  });

  it('kontak sama dengan bawaan website (setting kosong)', () => {
    expect(getWhatsappNumber({})).toBe(COMPANY_FACTS.whatsapp);
    expect(DEFAULT_CONTACT_EMAIL).toBe(COMPANY_FACTS.email);
    expect(COMPANY_FACTS.whatsappDisplay.replace(/\D/g, '')).toBe(COMPANY_FACTS.whatsapp);
  });

  it('isi paket template sama dengan bawaan Pengaturan website > Harga', () => {
    expect([...COMPANY_FACTS.templatePackage.includes]).toEqual([...TEMPLATE_PRICE_INCLUDES_DEFAULT]);
  });

  it('fakta yang belum diberikan pemilik bernilai null (tidak dirender), sameAs kosong', () => {
    expect(COMPANY_FACTS.address).toBeNull();
    expect(COMPANY_FACTS.nib).toBeNull();
    expect(COMPANY_FACTS.pse).toBeNull();
    expect(COMPANY_FACTS.serviceHours).toBeNull();
    expect(COMPANY_FACTS.templatePackage.renewalCost).toBeNull();
    expect(COMPANY_FACTS.templatePackage.activationTime).toBeNull();
    expect(COMPANY_FACTS.ownProducts).toBeNull();
    expect(COMPANY_FACTS.sameAs).toEqual([]);
  });

  it('direksi & titik peta dari pemilik (2026-10-24); alamat tertulis tetap null', () => {
    expect(COMPANY_FACTS.leadership.map((p) => p.name)).toEqual(['Muhammad Fajri, S.T.', 'Dede Apriyansah, S.Kom.']);
    for (const person of COMPANY_FACTS.leadership) expect(person.photo).toMatch(/^\/assets\/team\/[a-z-]+\.webp$/);
    expect(COMPANY_FACTS.location).toEqual({ latitude: -5.1350242, longitude: 105.3194528, mapsUrl: 'https://maps.app.goo.gl/FVNdCXafRWFUFCYD8' });
    expect(COMPANY_FACTS.address).toBeNull();
  });

  it('tanpa angka harga dan tanpa garudanexa.id', () => {
    const text = JSON.stringify(COMPANY_FACTS);
    expect(text).not.toMatch(/Rp\s?\d|\d\.\d{3}\.\d{3}/);
    expect(text).not.toContain('garudanexa.id');
  });
});
