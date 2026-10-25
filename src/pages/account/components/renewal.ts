// Perpanjangan masa aktif (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §4–5): aksi API pembeli, nomor perpanjangan
// dari URL kembali Midtrans, rincian harga per tahun, dan tautan nota.
import { apiPost } from '../../../lib/api';
import { domainTld, rupiahCompact } from '../../../lib/domainPricing';
import type { Order, Renewal } from '../../../types/platform';
import { goToPayment, isPaymentUrl } from './payment';

/** Awalan nomor perpanjangan (GNR-YYYYMMDD-XXXXXX); Midtrans order_id = `<nomor>-<percobaan>`. */
export const RENEWAL_PREFIX = 'GNR-';

/**
 * order_id dari URL kembali Midtrans → nomor perpanjangan: `GNR-20261025-AB12CD-2` → `GNR-20261025-AB12CD`.
 * Bukan perpanjangan (mis. pesanan `GN-…`) → null.
 */
export function renewalNumberFromReturn(orderId: string | null | undefined): string | null {
  const id = (orderId ?? '').trim().toUpperCase();
  if (!id.startsWith(RENEWAL_PREFIX)) return null;
  const match = /^(GNR-\d{8}-[A-Z0-9]+)(?:-\d+)?$/.exec(id);
  return match ? match[1] : null;
}

/** Tagihan perpanjangan yang masih menunggu pembayaran (server menjamin paling banyak satu per pesanan). */
export const pendingRenewal = (renewals: readonly Renewal[]): Renewal | null =>
  renewals.find((r) => r.status === 'menunggu_pembayaran') ?? null;

/** Domain yang diperpanjang: domain final bila sudah ditetapkan, kalau belum domain yang diminta. */
export const renewalDomain = (order: Pick<Order, 'domain' | 'domain_primary'>) => order.domain || order.domain_primary;

/** "Hosting & jasa Rp500.000 + Domain .com Rp250.000" (rincian satu tahun). */
export function renewalBreakdown(hostingPerYear: number, domainPerYear: number | null, domain: string): string {
  const tld = domainTld(domain);
  return `Hosting & jasa ${rupiahCompact(hostingPerYear)} + Domain${tld ? ` .${tld.tld}` : ''} ${rupiahCompact(domainPerYear ?? 0)}`;
}

/** Id kartu masa aktif di detail pesanan; tautan "Perpanjang" dari dashboard menuju ke sana. */
export const ACTIVE_PERIOD_ANCHOR = 'masa-aktif';

export const activePeriodPath = (orderNumber: string) =>
  `/akun/pesanan/${encodeURIComponent(orderNumber)}#${ACTIVE_PERIOD_ANCHOR}`;

/* ─────────────────────────── Nota ─────────────────────────── */

/** Nota tersedia setelah pesanan dibayar (server: invoice_number = "INV-" + nomor bila paid_at ada). */
export const hasOrderInvoice = (order: Pick<Order, 'invoice_number' | 'paid_at'>) => Boolean(order.invoice_number || order.paid_at);

export const orderInvoicePath = (orderNumber: string) => `/akun/pesanan/${encodeURIComponent(orderNumber)}/nota`;

export const renewalInvoicePath = (orderNumber: string, renewalNumber: string) =>
  `${orderInvoicePath(orderNumber)}/${encodeURIComponent(renewalNumber)}`;

/* ─────────────────────────── Aksi API ─────────────────────────── */

export interface CreateRenewalResult {
  renewal: Renewal;
  /** Link Snap Midtrans; null bila pembayaran online belum dikonfigurasi atau gagal dibuat */
  payment_url: string | null;
  payment_error?: string | null;
}

/** Buat tagihan perpanjangan 1–3 tahun. Melempar ApiError (RENEWAL_PENDING, RENEWAL_TOO_LONG, …). */
export const createRenewal = (orderNumber: string, years: number) =>
  apiPost<CreateRenewalResult>('customer_create_renewal', { order_number: orderNumber, years });

/**
 * Minta link pembayaran tagihan perpanjangan lalu arahkan ke Midtrans. Melempar ApiError bila gagal
 * (mis. PAYMENT_NOT_CONFIGURED di lokal).
 */
export async function payRenewal(renewalNumber: string): Promise<void> {
  const res = await apiPost<{ payment_url: string | null }>('customer_pay_renewal', { renewal_number: renewalNumber });
  if (!isPaymentUrl(res.payment_url)) {
    throw new Error('Link pembayaran belum tersedia. Silakan coba lagi beberapa saat lagi.');
  }
  goToPayment(res.payment_url);
}

export const cancelRenewal = (renewalNumber: string) =>
  apiPost<{ renewal: Renewal }>('customer_cancel_renewal', { renewal_number: renewalNumber });

/** Hanya bila get_payment_config.simulator (lokal/uji). */
export const simulateRenewalPayment = (renewalNumber: string) =>
  apiPost<{ renewal: Renewal; order?: Order }>('dev_simulate_renewal_payment', { renewal_number: renewalNumber });
