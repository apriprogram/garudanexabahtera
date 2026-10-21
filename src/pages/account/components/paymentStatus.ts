// Label & nada status pembayaran untuk pembeli (dipakai kartu pesanan dan tagihan).
import { PAYMENT_STATUS_LABEL, type Order, type OrderStatus } from '../../../types/platform';

/** Label status pembayaran Midtrans (pending → "Menunggu pembayaran"). */
export const paymentStatusLabel = (status: string | null | undefined) =>
  status ? PAYMENT_STATUS_LABEL[status] ?? status : '-';

/**
 * Status pesanan yang hanya dicapai setelah backend menerima pembayaran (settlement, capture + fraud_status accept,
 * atau simulasi). payment_status saja tidak cukup: kartu yang ditahan untuk tinjauan fraud tetap 'capture'
 * sementara pesanan masih menunggu_pembayaran.
 */
const PAID_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['menunggu_approval', 'proses_domain', 'aktif']);
const CLOSED_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['dibatalkan', 'ditolak']);
const SETTLED = new Set(['settlement', 'simulated']);
const FAILED = new Set(['deny', 'cancel', 'expire', 'failure']);
const REFUNDED = new Set(['refund', 'partial_refund']);

type PaymentFields = Pick<Order, 'status' | 'payment_status' | 'paid_at'>;

/** Sudah dibayar menurut status pesanan; `paid_at` menangani pesanan yang ditolak setelah dibayar. */
export const isOrderPaid = (order: Pick<Order, 'status' | 'paid_at'>): boolean =>
  PAID_ORDER_STATUSES.has(order.status) || Boolean(order.paid_at);

/** Pembayaran kartu sudah masuk tetapi ditahan bank/Midtrans untuk tinjauan fraud: belum lunas, jangan bayar ulang. */
export const isPaymentUnderReview = (order: Pick<Order, 'status' | 'payment_status'>): boolean =>
  order.status === 'menunggu_pembayaran' && order.payment_status === 'capture';

/** Dana pesanan sudah dikembalikan (refund/partial_refund dari Midtrans). */
export const isRefunded = (order: Pick<Order, 'payment_status'>): boolean => REFUNDED.has(order.payment_status);

/**
 * Pesanan ditolak yang dananya sudah kami terima tetapi belum dikembalikan: lunas lalu ditolak (`paid_at`), atau
 * pembayaran yang baru masuk setelah ditolak. Keputusan pemilik 2026-10-21: dikembalikan penuh ke metode semula.
 */
export const isAwaitingRefund = (order: PaymentFields): boolean =>
  order.status === 'ditolak' && !isRefunded(order) && (isOrderPaid(order) || SETTLED.has(order.payment_status));

/**
 * Pesanan ditutup (dibatalkan/ditolak) tanpa dana yang pernah masuk: totalnya tidak ditagihkan. Kartu yang tertahan
 * (capture) atau pembayaran yang masuk setelah pesanan ditutup tidak termasuk.
 */
export const isNeverCharged = (order: PaymentFields): boolean => {
  const status = order.payment_status || 'pending';
  return (
    CLOSED_ORDER_STATUSES.has(order.status) &&
    !isOrderPaid(order) &&
    !isRefunded(order) &&
    !SETTLED.has(status) &&
    status !== 'capture'
  );
};

export type PaymentTone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Status pembayaran untuk ditampilkan ke pembeli. "Lunas" diturunkan dari status pesanan, bukan dari payment_status
 * (pesanan batal/ditolak yang belum dibayar → "Tidak dibayar", bukan "Menunggu pembayaran"). Pesanan lunas yang
 * ditolak → "Menunggu pengembalian dana" sampai Midtrans mencatat refund ("Dikembalikan").
 */
export function invoiceStatus(order: PaymentFields): { label: string; tone: PaymentTone } {
  const status = order.payment_status || 'pending';
  if (isRefunded(order)) return { label: paymentStatusLabel(status), tone: 'neutral' };
  if (isAwaitingRefund(order)) return { label: 'Menunggu pengembalian dana', tone: 'warning' };
  if (isOrderPaid(order)) return { label: paymentStatusLabel(status === 'simulated' ? 'simulated' : 'settlement'), tone: 'success' };
  // 'capture' tanpa fraud_status accept: pembayaran kartu sedang ditinjau, pesanan belum diproses
  if (isPaymentUnderReview(order)) return { label: 'Sedang ditinjau bank', tone: 'warning' };
  if (order.status === 'menunggu_pembayaran') return { label: paymentStatusLabel('pending'), tone: 'warning' };
  // Dari sini pesanan sudah ditutup (dibatalkan/ditolak) dan belum dibayar menurut backend
  if (FAILED.has(status)) return { label: paymentStatusLabel(status), tone: 'danger' };
  // Pembayaran masuk setelah pesanan dibatalkan (paid_at tidak diisi backend; ditindaklanjuti manual oleh tim).
  // Yang masuk setelah ditolak sudah tertangani isAwaitingRefund di atas.
  if (SETTLED.has(status)) return { label: 'Dibayar setelah dibatalkan', tone: 'warning' };
  // Kartu masih ditinjau atau sudah diterima (capture + accept) setelah pesanan ditutup: backend tetap menyimpan
  // 'capture' tanpa paid_at dan hanya mencatat catatan refund manual. Jangan klaim lunas, tetapi juga bukan "Tidak dibayar".
  if (status === 'capture') return { label: 'Pembayaran kartu tertahan', tone: 'warning' };
  return { label: 'Tidak dibayar', tone: 'neutral' };
}

export const PAYMENT_TONE_CLASS: Record<PaymentTone, string> = {
  success: 'bg-success-50 text-success-700 ring-success/25',
  warning: 'bg-warning-50 text-warning-700 ring-warning/25',
  danger: 'bg-danger-50 text-danger-700 ring-danger/20',
  neutral: 'bg-alt text-muted ring-line',
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  bank_transfer: 'Transfer bank (virtual account)',
  echannel: 'Mandiri Bill Payment',
  permata_va: 'Permata virtual account',
  credit_card: 'Kartu kredit/debit',
  qris: 'QRIS',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  cstore: 'Gerai retail',
  akulaku: 'Akulaku',
  kredivo: 'Kredivo',
  simulator: 'Simulasi (mode uji)',
  gratis: 'Gratis',
};

/** Metode pembayaran Midtrans → label Indonesia. */
export const paymentTypeLabel = (type: string | null | undefined) =>
  type ? PAYMENT_TYPE_LABEL[type] ?? type.replace(/_/g, ' ') : '-';
