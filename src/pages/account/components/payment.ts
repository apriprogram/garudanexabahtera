import { useEffect } from 'react';
import { apiPost } from '../../../lib/api';

/** Link pembayaran hanya diikuti bila berupa URL http(s) (dari server, tetap dicek). */
export const isPaymentUrl = (url: string | null | undefined): url is string =>
  typeof url === 'string' && /^https?:\/\//i.test(url);

/** Buka halaman pembayaran Midtrans (Snap, mode redirect). */
export function goToPayment(url: string) {
  window.location.assign(url);
}

/**
 * Minta link pembayaran untuk pesanan (customer_pay_order) lalu arahkan ke Midtrans.
 * Melempar ApiError bila gagal (mis. pembayaran online belum dikonfigurasi).
 */
export async function payOrder(orderNumber: string): Promise<void> {
  const res = await apiPost<{ payment_url: string | null }>('customer_pay_order', { order_number: orderNumber });
  if (!isPaymentUrl(res.payment_url)) {
    throw new Error('Link pembayaran belum tersedia. Silakan coba lagi beberapa saat lagi.');
  }
  goToPayment(res.payment_url);
}

/** Judul tab browser untuk halaman akun & pemesanan. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} | Garuda Nexa`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/** State navigasi ke /akun/pesanan/:orderNumber tepat setelah pesanan dibuat (dari /pesan/:slug). */
export interface OrderCreatedState {
  justCreated: true;
  /** payment_error dari customer_create_order, mis. "Pembayaran online belum dikonfigurasi." */
  paymentError?: string | null;
}
