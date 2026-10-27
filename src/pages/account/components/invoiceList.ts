// Baris daftar nota (menu Nota, customer_get_invoices): tautan nota resmi dan status bayar yang ditampilkan.
import type { CustomerInvoiceItem } from '../../../types/platform';
import { invoiceStatus, isRefunded, paymentStatusLabel, type PaymentTone } from './paymentStatus';

/**
 * Tautan nota resmi untuk satu baris (/akun/pesanan/:no/nota[/:dokumen], AccountInvoice): dokumen = nomor perpanjangan
 * (GNR-…) atau nomor tagihan fitur tambahan (GNF-…, SITE-ADDONS-SPEC §4.3).
 */
export const invoicePath = (item: Pick<CustomerInvoiceItem, 'order_number' | 'renewal_number' | 'addon_number'>) => {
  const doc = item.addon_number || item.renewal_number;
  return `/akun/pesanan/${encodeURIComponent(item.order_number)}/nota${doc ? `/${encodeURIComponent(doc)}` : ''}`;
};

/** Status bayar di nota: sama dengan tagihan pesanan (pembelian) atau lunas/dikembalikan (perpanjangan, fitur). */
export function invoiceItemStatus(item: CustomerInvoiceItem): { label: string; tone: PaymentTone } {
  if (item.type === 'pembelian' && item.order_status) {
    return invoiceStatus({ status: item.order_status, payment_status: item.payment_status, paid_at: item.paid_at });
  }
  if (isRefunded(item)) return { label: paymentStatusLabel(item.payment_status), tone: 'neutral' };
  return { label: paymentStatusLabel(item.payment_status === 'simulated' ? 'simulated' : 'settlement'), tone: 'success' };
}
