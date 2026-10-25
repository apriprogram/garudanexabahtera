// Daftar ekstensi domain yang dijual + harga jual per tahun dari server (get_domain_prices: DewaBiz bila dikonfigurasi,
// selain itu tabel bawaan). Render pertama memakai DOMAIN_TLDS supaya HTML prerender dan hidrasi sama; daftar server
// menggantikannya setelah dimuat (satu request untuk semua komponen, lihat SHARED_GET_ACTIONS di api.ts).
import { useEffect, useState } from 'react';
import { apiGet } from './api';
import { DOMAIN_TLDS, type DomainTld } from './domainPricing';

interface DomainPricesResponse {
  source?: 'dewabiz' | 'default';
  domains?: unknown;
}

/** Baris yang valid saja (ekstensi huruf kecil, harga > 0); null bila jawaban server tidak bisa dipakai. */
export function parseDomainPrices(body: DomainPricesResponse | null | undefined): DomainTld[] | null {
  if (!body || !Array.isArray(body.domains)) return null;
  const rows = body.domains
    .filter((row): row is DomainTld =>
      Boolean(row) &&
      typeof row === 'object' &&
      typeof (row as DomainTld).tld === 'string' &&
      /^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test((row as DomainTld).tld) &&
      typeof (row as DomainTld).price === 'number' &&
      (row as DomainTld).price > 0,
    )
    .map((row) => ({ tld: row.tld, price: row.price, requirement: typeof row.requirement === 'string' ? row.requirement : null }));
  return rows.length ? rows : null;
}

export function useDomainPrices(): { domains: readonly DomainTld[]; loaded: boolean } {
  const [state, setState] = useState<{ domains: readonly DomainTld[]; loaded: boolean }>({ domains: DOMAIN_TLDS, loaded: false });
  useEffect(() => {
    let alive = true;
    apiGet<DomainPricesResponse>('get_domain_prices')
      .then((body) => {
        if (alive) setState({ domains: parseDomainPrices(body) ?? DOMAIN_TLDS, loaded: true });
      })
      .catch(() => {
        if (alive) setState({ domains: DOMAIN_TLDS, loaded: true });
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
