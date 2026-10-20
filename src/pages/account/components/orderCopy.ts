import type { Order, OrderStatus } from '../../../types/platform';

/** Keterangan singkat status untuk pembeli (kartu pesanan & timeline). */
export const STATUS_HINT: Record<OrderStatus, string> = {
  menunggu_pembayaran: 'Selesaikan pembayaran agar pesanan bisa kami proses.',
  menunggu_approval: 'Pembayaran diterima. Tim kami sedang memeriksa pesanan Anda.',
  proses_domain: 'Pesanan disetujui. Kami sedang mendaftarkan dan menghubungkan domain Anda.',
  aktif: 'Situs Anda sudah aktif. Kelola kontennya kapan saja.',
  ditolak: 'Pesanan ditolak oleh tim kami.',
  dibatalkan: 'Pesanan dibatalkan.',
};

/** Judul langkah timeline (alur normal ORDER_FLOW). */
export const STEP_TITLE: Record<OrderStatus, string> = {
  menunggu_pembayaran: 'Pesanan dibuat',
  menunggu_approval: 'Pembayaran diterima',
  proses_domain: 'Pesanan disetujui',
  aktif: 'Situs aktif',
  ditolak: 'Pesanan ditolak',
  dibatalkan: 'Pesanan dibatalkan',
};

/** Keterangan langkah timeline saat belum/sedang/sudah dilalui. */
export const STEP_TEXT: Record<OrderStatus, { waiting: string; current: string; done: string }> = {
  menunggu_pembayaran: {
    waiting: 'Pesanan dibuat dan menunggu pembayaran.',
    current: 'Menunggu pembayaran Anda lewat Midtrans.',
    done: 'Pesanan dibuat.',
  },
  menunggu_approval: {
    waiting: 'Pembayaran dikonfirmasi otomatis oleh Midtrans.',
    current: 'Pembayaran diterima. Tim kami sedang memeriksa pesanan Anda.',
    done: 'Pembayaran diterima.',
  },
  proses_domain: {
    waiting: 'Tim kami menyetujui pesanan lalu memproses domain.',
    current: 'Pesanan disetujui. Domain Anda sedang kami proses.',
    done: 'Pesanan disetujui dan domain diproses.',
  },
  aktif: {
    waiting: 'Situs aktif dan kontennya bisa Anda kelola sendiri.',
    current: 'Situs Anda aktif. Kelola kontennya kapan saja.',
    done: 'Situs aktif.',
  },
  ditolak: { waiting: '', current: 'Pesanan ditolak oleh tim kami.', done: '' },
  dibatalkan: { waiting: '', current: 'Pesanan dibatalkan.', done: '' },
};

/** Waktu tiap langkah alur normal (null bila belum terjadi). */
export const stepTime = (order: Order, status: OrderStatus): string | null => {
  switch (status) {
    case 'menunggu_pembayaran':
      return order.created_at;
    case 'menunggu_approval':
      return order.paid_at;
    case 'proses_domain':
      return order.approved_at;
    case 'aktif':
      return order.activated_at;
    case 'dibatalkan':
      return order.cancelled_at;
    default:
      return null;
  }
};

/** Domain yang ditampilkan: domain final bila sudah ditetapkan, kalau belum domain yang diminta. */
export const displayDomain = (order: Order) => ({
  domain: order.domain || order.domain_primary,
  final: Boolean(order.domain),
});
