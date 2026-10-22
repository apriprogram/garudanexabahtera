// Baris fakta perusahaan untuk /tentang dan /kontak: hanya fakta yang sudah pasti dari COMPANY_FACTS + kontak dari
// setting (sama dengan Footer, jadi nomor dan email identik karakter per karakter). Field null (alamat, NIB, PSE, jam
// layanan) TIDAK dirender, juga tidak sebagai placeholder.
import type React from 'react';
import { COMPANY_FACTS, type CompanyFacts } from '../../../lib/companyFacts';
import { displayPhone, getContactEmail, getContactPhone, telHref, useSiteSettings } from '../../../hooks/useSiteSettings';

export interface FactRow {
  label: string;
  value: React.ReactNode;
}

/** Alamat satu baris, atau null. */
export const formatAddress = (facts: CompanyFacts): string | null =>
  facts.address
    ? `${facts.address.streetAddress}, ${facts.address.locality}, ${facts.address.region} ${facts.address.postalCode}`.replace(/\s+/g, ' ').trim()
    : null;

/** Baris fakta yang diketahui (urutan Lampiran B). Fakta null dilewati. */
export function useFactRows(facts: CompanyFacts = COMPANY_FACTS): FactRow[] {
  const { settings } = useSiteSettings();
  const phone = getContactPhone(settings);
  const email = getContactEmail(settings);
  const address = formatAddress(facts);
  const rows: (FactRow | null)[] = [
    { label: 'Nama', value: facts.name },
    { label: 'Badan hukum', value: facts.legalName },
    { label: 'Situs', value: new URL(facts.url).hostname },
    address ? { label: 'Alamat', value: address } : null,
    facts.nib ? { label: 'NIB', value: facts.nib } : null,
    facts.pse ? { label: 'Tanda daftar PSE', value: facts.pse } : null,
    {
      label: 'WhatsApp & telepon',
      value: (
        <a href={telHref(phone)} className="link-site">
          {displayPhone(phone)}
        </a>
      ),
    },
    {
      label: 'Email',
      value: (
        <a href={`mailto:${email}`} className="link-site [overflow-wrap:anywhere]">
          {email}
        </a>
      ),
    },
    facts.serviceHours ? { label: 'Jam layanan', value: facts.serviceHours } : null,
    { label: 'Area layanan', value: facts.areaServed.label },
  ];
  return rows.filter((row): row is FactRow => row !== null);
}
