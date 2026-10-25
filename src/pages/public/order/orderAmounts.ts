// Rincian harga & domain pesanan template di /pesan/:slug (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §0–§1):
// total = harga template (setelah diskon pembelian pertama bila ada) + domain tahun pertama yang dipilih & dicek saat
// memesan. Hanya untuk tampilan; server selalu menghitung ulang harga saat pesanan dibuat.
import {
  DOMAIN_PRICE_FROM,
  DOMAIN_TLDS,
  DOMAIN_UNSUPPORTED_MESSAGE,
  domainTld,
  normalizeDomainInput,
  orderDomainError,
  rupiahCompact,
  type DomainTld,
} from '../../../lib/domainPricing';
import { formatRupiah, type DomainCheck, type Template } from '../../../types/platform';

/** Harga untuk akun yang masuk (customer_get_order_quote): diskon otomatis 20% pesanan template pertama. */
export interface OrderQuote {
  list_price: number;
  discount_percent: number;
  discount_amount: number;
  price: number;
}

export const hasDiscount = (quote: OrderQuote | null): quote is OrderQuote => Boolean(quote && quote.discount_amount > 0);

/** Hasil cek yang boleh dipakai memesan: tersedia, atau belum pasti (tim kami memastikannya saat memproses). */
export const isUsableCheck = (check: DomainCheck | null): check is DomainCheck => Boolean(check && check.status !== 'taken');

export interface OrderAmounts {
  /** Harga katalog template (sebelum diskon) */
  listPrice: number;
  /** Potongan diskon pembelian pertama; 0 = tanpa diskon */
  discountAmount: number;
  discountPercent: number;
  /** Harga template yang dibayar (setelah diskon) */
  templatePrice: number;
  /** Domain tahun pertama yang dipilih (tersedia / belum pasti); null = belum dipilih & dicek */
  domain: { name: string; price: number } | null;
  /** Template + domain. Tanpa domain = harga template saja (subtotal, belum termasuk domain) */
  total: number;
  /**
   * Tanpa pembayaran: hanya bila domain sudah dipilih dan totalnya 0. Domain selalu berbayar, jadi sebelum dipilih
   * pesanan dianggap berbayar (juga untuk template gratis).
   */
  free: boolean;
}

export function orderAmounts(template: Template, quote: OrderQuote | null, check: DomainCheck | null): OrderAmounts {
  const catalogPrice = Math.max(0, Number(template.price) || 0);
  const discounted = hasDiscount(quote);
  const templatePrice = discounted ? Math.max(0, Number(quote.price) || 0) : catalogPrice;
  const domain = isUsableCheck(check) ? { name: check.domain, price: Math.max(0, Number(check.price) || 0) } : null;
  const total = templatePrice + (domain?.price ?? 0);
  return {
    listPrice: discounted ? Math.max(0, Number(quote.list_price) || 0) : catalogPrice,
    discountAmount: discounted ? quote.discount_amount : 0,
    discountPercent: discounted ? quote.discount_percent : 0,
    templatePrice,
    domain,
    total,
    free: domain !== null && total <= 0,
  };
}

/** Nominal untuk tampilan: 0 → "Gratis". */
export const moneyLabel = (value: number) => (value <= 0 ? 'Gratis' : formatRupiah(value));

/** "Rp250.000/tahun" */
export const perYear = (price: number) => `${rupiahCompact(price)}/tahun`;

/** "mulai Rp50.000/tahun" (harga domain termurah). */
export const DOMAIN_FROM_TEXT = `mulai ${perYear(DOMAIN_PRICE_FROM)}`;

/** Pesan field saat domain sudah dipakai (sama dengan 409 DOMAIN_UNAVAILABLE dari server). */
export const domainTakenError = (domain: string) => `Domain ${domain} sudah dipakai orang lain. Cek nama lain.`;

/**
 * Isian nama domain + ekstensi dropdown → domain yang dicek. Isian yang sudah berisi ekstensi yang dijual ("Toko.co.id",
 * "https://www.toko.com/") dipecah: ekstensinya menggantikan pilihan dropdown. `error` memakai pesan yang sama dengan
 * server (orderDomainError), kosong → "Nama domain wajib diisi.".
 */
export function splitDomainInput(
  raw: string,
  tld: string,
  tlds: readonly DomainTld[] = DOMAIN_TLDS,
  label = 'Nama domain',
): { name: string; tld: string; domain: string; error?: string } {
  const typed = normalizeDomainInput(raw);
  const own = typed.includes('.') ? domainTld(typed, tlds) : null;
  const name = own ? typed.slice(0, -(own.tld.length + 1)) : typed;
  const ext = own ? own.tld : tld;
  const domain = name ? `${name}.${ext}` : '';
  // Diketik dengan ekstensi yang tidak dijual ("toko.xyz"): pesan ekstensi, bukan format
  const error = !name
    ? `${label} wajib diisi.`
    : typed.includes('.') && !own
      ? DOMAIN_UNSUPPORTED_MESSAGE
      : orderDomainError(domain, label, tlds);
  return { name, tld: ext, domain, error };
}
