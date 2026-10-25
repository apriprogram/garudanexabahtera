// Baris daftar nota (menu Nota, customer_get_invoices): tautan nota resmi dan status bayar yang ditampilkan.
import type { CustomerInvoiceItem } from '../../../types/platform';
import { invoiceStatus, isRefunded, paymentStatusLabel, type PaymentTone } from './paymentStatus';

/** Tautan nota resmi untuk satu baris (/akun/pesanan/:no/nota[/:renewal], AccountInvoice). */
export const invoicePath = (item: Pick<CustomerInvoiceItem, 'order_number' | 'renewal_number'>) =>
  `/akun/pesanan/${encodeURIComponent(item.order_number)}/nota${item.renewal_number ? `/${encodeURIComponent(item.renewal_number)}` : ''}`;

/** Status bayar di nota: sama dengan tagihan pesanan (pembelian) atau lunas/dikembalikan (perpanjangan). */
export function invoiceItemStatus(item: CustomerInvoiceItem): { label: string; tone: PaymentTone } {
  if (item.type === 'pembelian' && item.order_status) {
    return invoiceStatus({ status: item.order_status, payment_status: item.payment_status, paid_at: item.paid_at });
  }
  if (isRefunded(item)) return { label: paymentStatusLabel(item.payment_status), tone: 'neutral' };
  return { label: paymentStatusLabel(item.payment_status === 'simulated' ? 'simulated' : 'settlement'), tone: 'success' };
}
