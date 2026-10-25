// Harga domain per ekstensi & biaya perpanjangan (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §1). Tabel yang sama ada
// di backend/modules/domains.php dan domains.js (server selalu menghitung ulang harga); tes memastikan ketiganya sama.
import type { SiteSettings } from '../hooks/useSiteSettings';
import { formatRupiah } from '../types/platform';

export interface DomainTld {
  /** Ekstensi tanpa titik awal, mis. "co.id". */
  tld: string;
  /** Harga per tahun dalam rupiah, sama untuk tahun pertama dan perpanjangan. */
  price: number;
  /** Syarat pendaftaran khusus (null = cukup data pemesan). */
  requirement: string | null;
}

/** Urutan = urutan tampilan (halaman Harga, saran domain). .com/.id/.web.id/.my.id dari pemilik 2026-10-25. */
export const DOMAIN_TLDS: readonly DomainTld[] = [
  { tld: 'com', price: 250_000, requirement: null },
  { tld: 'id', price: 250_000, requirement: null },
  { tld: 'co.id', price: 350_000, requirement: 'Untuk badan usaha: butuh NIB atau akta perusahaan' },
  { tld: 'my.id', price: 50_000, requirement: null },
  { tld: 'web.id', price: 50_000, requirement: null },
  { tld: 'biz.id', price: 100_000, requirement: null },
  { tld: 'net', price: 250_000, requirement: null },
  { tld: 'org', price: 250_000, requirement: null },
  { tld: 'or.id', price: 100_000, requirement: 'Untuk organisasi: butuh akta atau SK organisasi' },
  { tld: 'sch.id', price: 75_000, requirement: 'Untuk sekolah: butuh surat keterangan/NPSN sekolah' },
  { tld: 'ac.id', price: 75_000, requirement: 'Untuk perguruan tinggi: butuh SK pendirian' },
];

/** Harga domain termurah (untuk teks "mulai Rp50.000/tahun"). */
export const DOMAIN_PRICE_FROM = Math.min(...DOMAIN_TLDS.map((t) => t.price));

/** "Rp50.000" (tanpa spasi, gaya teks konten). */
export const rupiahCompact = (value: number) => formatRupiah(value).replace(/^Rp\s/, 'Rp');

/** Biaya hosting & jasa per tahun mulai tahun ke-2 bila setting `template_hosting_renewal_price` belum diisi. */
export const HOSTING_RENEWAL_DEFAULT = 500_000;
export const HOSTING_RENEWAL_SETTING = 'template_hosting_renewal_price';

/** Pilihan masa perpanjangan (tahun) dan batas tanggal berakhir (tahun ke depan), sama dengan backend. */
export const RENEWAL_YEAR_OPTIONS = [1, 2, 3] as const;
export const RENEWAL_MAX_YEARS_AHEAD = 10;

/**
 * Biaya hosting & jasa per tahun dari setting (angka rupiah utuh > 0); kosong/tidak valid → bawaan. Sama dengan
 * pf_hosting_renewal_price() di backend.
 */
export function hostingRenewalPrice(settings: SiteSettings): number {
  const raw = String(settings[HOSTING_RENEWAL_SETTING] ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) return HOSTING_RENEWAL_DEFAULT;
  const value = Math.round(Number(raw));
  return value > 0 && value <= 1e12 ? value : HOSTING_RENEWAL_DEFAULT;
}

/** Normalisasi input domain: huruf kecil, tanpa skema, www., path/port/query, dan titik di akhir. */
export function normalizeDomainInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#:].*$/, '')
    .replace(/\.+$/, '');
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const DOMAIN_FORMAT = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

/** Ekstensi yang dijual untuk domain ini (akhiran terpanjang) dari `tlds` (bawaan: DOMAIN_TLDS), atau null. */
export function domainTld<T extends Pick<DomainTld, 'tld'> = DomainTld>(
  domain: string,
  tlds: readonly T[] = DOMAIN_TLDS as unknown as readonly T[],
): T | null {
  const d = normalizeDomainInput(domain);
  let best: T | null = null;
  for (const t of tlds) {
    if (d.endsWith(`.${t.tld}`) && (!best || t.tld.length > best.tld.length)) best = t;
  }
  return best;
}

export const SUPPORTED_TLDS_TEXT = DOMAIN_TLDS.map((t) => `.${t.tld}`).join(', ');

export const DOMAIN_UNSUPPORTED_MESSAGE = 'Ekstensi domain belum tersedia. Pilih ekstensi dari daftar.';

/** Nama domain tanpa ekstensi: 1–63 huruf kecil/angka/tanda hubung, tidak diawali/diakhiri tanda hubung. */
export const isDomainLabel = (value: string) => LABEL.test(value);

/**
 * Pesan galat untuk domain yang akan dipesan (satu label + ekstensi yang dijual), atau undefined bila valid. Teks sama
 * dengan backend (domain_problem di backend/modules/domains.php). `tlds` = daftar dari get_domain_prices bila sudah
 * dimuat (dengan DewaBiz daftarnya bisa lebih panjang dari tabel bawaan).
 */
export function orderDomainError(value: string, label = 'Domain', tlds: readonly Pick<DomainTld, 'tld'>[] = DOMAIN_TLDS): string | undefined {
  const d = normalizeDomainInput(value);
  if (!d) return `${label} wajib diisi.`;
  if (!d.includes('.')) return 'Tambahkan ekstensi domain, mis. .com atau .id.';
  if (d.length > 253 || !DOMAIN_FORMAT.test(d)) return 'Format domain tidak valid, contoh: namabisnis.com';
  const tld = domainTld(d, tlds);
  const name = tld ? d.slice(0, -(tld.tld.length + 1)) : '';
  if (!tld) return DOMAIN_UNSUPPORTED_MESSAGE;
  if (!LABEL.test(name)) return 'Format domain tidak valid, contoh: namabisnis.com'; // subdomain, '-' di ujung
  return undefined;
}

/** Harga domain per tahun untuk domain ini, atau null bila ekstensinya belum didukung. */
export const domainPrice = (domain: string): number | null => domainTld(domain)?.price ?? null;

/** Nomor nota: "INV-" + nomor pesanan/perpanjangan (sama dengan invoice_number dari server). */
export const invoiceNumberFor = (number: string) => `INV-${number}`;
