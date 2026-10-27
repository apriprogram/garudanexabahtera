import { getWhatsappNumber, whatsappUrl, type SiteSettings } from '../../../hooks/useSiteSettings';
import { formatRupiah, type Order, type OrderLog, type OrderStatus } from '../../../types/platform';

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

/**
 * Keterangan langkah timeline saat belum/sedang/sudah dilalui. Teks `done` tidak mengulang judul langkah; kosong =
 * cukup judul dan waktu.
 */
export const STEP_TEXT: Record<OrderStatus, { waiting: string; current: string; done: string }> = {
  menunggu_pembayaran: {
    waiting: 'Pesanan dibuat dan menunggu pembayaran.',
    current: 'Menunggu pembayaran Anda lewat Midtrans.',
    done: '',
  },
  menunggu_approval: {
    waiting: 'Pembayaran dikonfirmasi otomatis oleh Midtrans.',
    current: 'Pembayaran diterima. Tim kami sedang memeriksa pesanan Anda.',
    done: 'Dikonfirmasi otomatis oleh Midtrans.',
  },
  proses_domain: {
    waiting: 'Tim kami menyetujui pesanan lalu memproses domain.',
    current: 'Pesanan disetujui. Domain Anda sedang kami proses.',
    done: 'Domain didaftarkan dan dihubungkan ke situs Anda.',
  },
  aktif: {
    waiting: 'Situs aktif dan kontennya bisa Anda kelola sendiri.',
    current: 'Situs Anda aktif. Kelola kontennya kapan saja.',
    done: 'Kontennya bisa Anda ubah kapan saja lewat Kelola Situs.',
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

/** Akhiri teks bebas (mis. alasan penolakan dari admin) dengan titik bila belum berakhir dengan tanda baca. */
export const asSentence = (text: string): string => {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/* ─────────────────────────── Pengembalian dana ─────────────────────────── */

/**
 * Pesanan LUNAS yang ditolak (mis. domain tidak tersedia): dana dikembalikan penuh ke metode pembayaran semula paling
 * lambat sekian hari kerja setelah penolakan (keputusan pemilik 2026-10-21, sama dengan /kebijakan-pengembalian-dana).
 */
export const REFUND_WORKING_DAYS = 7;

/** Kalimat pengembalian dana untuk detail pesanan. */
export const refundText = (order: Pick<Order, 'price'>): string =>
  `Pembayaran Anda sebesar ${formatRupiah(order.price)} akan kami kembalikan penuh ke metode pembayaran semula, paling lambat ${REFUND_WORKING_DAYS} hari kerja setelah pesanan ditolak.`;

/** Versi ringkas untuk kartu pesanan di dashboard. */
export const refundHint = (order: Pick<Order, 'price'>): string =>
  `Dana ${formatRupiah(order.price)} dikembalikan penuh ke metode pembayaran semula paling lambat ${REFUND_WORKING_DAYS} hari kerja.`;

export const REFUNDED_TEXT = 'Dana pesanan ini sudah dikembalikan ke metode pembayaran semula.';

/* ─────────────────────────── Bantuan via WhatsApp ─────────────────────────── */

/** Tautan wa.me ke nomor WhatsApp dari pengaturan website, dengan pesan awal. */
export const helpWhatsappUrl = (settings: SiteSettings, message: string): string =>
  whatsappUrl(getWhatsappNumber(settings), message);

export const orderHelpMessage = (orderNumber: string): string =>
  `Halo Admin, saya ingin bertanya tentang pesanan ${orderNumber}.`;

export const siteHelpMessage = (domain: string): string => `Halo Admin, saya butuh bantuan untuk situs ${domain}.`;

/** Pesan bantuan dari halaman akun: menyebut nomor pesanan bila sedang membuka detail pesanan. */
export const accountHelpMessage = (pathname: string): string => {
  const match = /^\/akun\/pesanan\/([^/]+)/.exec(pathname);
  if (match) {
    try {
      return orderHelpMessage(decodeURIComponent(match[1]));
    } catch {
      // nomor pesanan dengan encoding rusak: pakai pesan umum
    }
  }
  return 'Halo Admin, saya butuh bantuan dengan akun Garuda Nexa saya.';
};

/* ─────────────────────────── Riwayat pesanan ─────────────────────────── */

export interface HistoryEntry {
  id: number;
  title: string;
  text?: string;
  time: string;
}

/**
 * Log pesanan → kalimat untuk pembeli. Catatan (note) dari log TIDAK pernah ditampilkan mentah karena berisi catatan
 * internal admin, pesan teknis Midtrans, atau teks mode uji; pengecualiannya alasan penolakan, catatan perpanjangan
 * (renewal_created/paid/cancelled, ACCOUNT-DOMAIN-RENEWAL-SPEC.md §5), dan catatan fitur tambahan
 * (addon_created/paid/cancelled, SITE-ADDONS-SPEC.md §4.1), yang ditulis server khusus untuk pembeli. addon_granted dan
 * addon_revoked tampil tanpa catatannya (catatan internal tim). Log yang hanya berguna untuk tim (catatan admin,
 * pembaruan pembayaran tanpa perubahan status, renewal_payment_*) disembunyikan.
 */
export const customerHistoryEntry = (log: OrderLog): HistoryEntry | null => {
  const base = { id: log.id, time: log.created_at };
  switch (log.event) {
    case 'created':
      return { ...base, title: 'Pesanan dibuat' };
    case 'payment_created':
      return { ...base, title: 'Tagihan pembayaran dibuat' };
    case 'payment_update':
      if (log.to_status === 'menunggu_approval') return { ...base, title: 'Pembayaran diterima' };
      if (log.to_status === 'dibatalkan') {
        return { ...base, title: 'Pesanan dibatalkan otomatis', text: 'Pembayaran tidak diselesaikan atau tidak berhasil.' };
      }
      return null;
    case 'approved':
      return { ...base, title: 'Pesanan disetujui' };
    case 'rejected':
      return { ...base, title: 'Pesanan ditolak', text: log.note?.trim() ? `Alasan: ${asSentence(log.note)}` : undefined };
    case 'domain_set':
      return { ...base, title: 'Domain ditetapkan' };
    case 'activated':
      return { ...base, title: 'Situs diaktifkan' };
    case 'cancelled':
      return {
        ...base,
        title: 'Pesanan dibatalkan',
        text: log.actor_type === 'customer' ? 'Anda membatalkan pesanan ini.' : 'Pesanan dibatalkan oleh tim kami.',
      };
    case 'renewal_created':
      return { ...base, title: 'Perpanjangan dibuat', text: log.note?.trim() || undefined };
    case 'renewal_paid':
      return { ...base, title: 'Masa aktif diperpanjang', text: log.note?.trim() || undefined };
    case 'renewal_cancelled':
      return { ...base, title: 'Perpanjangan dibatalkan', text: log.note?.trim() || undefined };
    // Fitur tambahan Berita & Pengumuman (tagihan GNF-…)
    case 'addon_created':
      return { ...base, title: 'Tagihan fitur tambahan dibuat', text: log.note?.trim() || undefined };
    case 'addon_paid':
      return { ...base, title: 'Fitur Berita & Pengumuman aktif', text: log.note?.trim() || undefined };
    case 'addon_cancelled':
      return { ...base, title: 'Tagihan fitur tambahan dibatalkan', text: log.note?.trim() || undefined };
    case 'addon_granted':
      return { ...base, title: 'Fitur Berita & Pengumuman aktif', text: 'Diaktifkan gratis oleh tim kami.' };
    case 'addon_revoked':
      return { ...base, title: 'Fitur Berita & Pengumuman dinonaktifkan', text: 'Dinonaktifkan oleh tim kami.' };
    default:
      return null;
  }
};

/** Keterangan langkah "Pesanan dibatalkan" di timeline, menurut siapa yang membatalkan. */
export const cancelledText = (log: OrderLog | undefined): string => {
  if (!log) return STEP_TEXT.dibatalkan.current;
  if (log.actor_type === 'customer') return 'Anda membatalkan pesanan ini.';
  if (log.actor_type === 'staff') return 'Pesanan dibatalkan oleh tim kami.';
  return 'Pembayaran tidak diselesaikan, jadi pesanan dibatalkan otomatis.';
};
