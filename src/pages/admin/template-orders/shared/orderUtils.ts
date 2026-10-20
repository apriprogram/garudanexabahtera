// Helper bersama halaman admin "Pesanan Template" (Order Masuk, Input Domain, Kelola Template, Template Aktif)
// dan Dashboard. Label & nada status mengikuti src/types/platform.ts (SPEC §4).
import type { Tone } from '../../../../components/admin/ui';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, type OrderLog, type OrderStatus } from '../../../../types/platform';

/** Urutan tab status di Order Masuk. */
export const ORDER_STATUSES: OrderStatus[] = ['menunggu_pembayaran', 'menunggu_approval', 'proses_domain', 'aktif', 'ditolak', 'dibatalkan'];

/** Label pendek untuk tab/filter (pill tetap memakai label lengkap). */
export const ORDER_STATUS_SHORT: Record<OrderStatus, string> = {
  menunggu_pembayaran: 'Menunggu bayar',
  menunggu_approval: 'Perlu approval',
  proses_domain: 'Proses domain',
  aktif: 'Aktif',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
};

const TONE_MAP = { warning: 'warning', brand: 'cobalt', info: 'cobalt', success: 'mint', danger: 'danger', neutral: 'mist' } as const;

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABEL, value);

export const orderTone = (status: string | null | undefined): Tone => (isOrderStatus(status) ? TONE_MAP[ORDER_STATUS_TONE[status]] : 'mist');

export const orderLabel = (status: string | null | undefined, fallback?: string | null) =>
  isOrderStatus(status) ? ORDER_STATUS_LABEL[status] : fallback || status || '-';

/** transaction_status Midtrans → label Indonesia. */
export const paymentLabel = (status: string | null | undefined) => (status ? PAYMENT_STATUS_LABEL[status] ?? status : '-');

export function paymentTone(status: string | null | undefined): Tone {
  switch (status) {
    case 'settlement':
    case 'capture':
    case 'simulated':
      return 'mint';
    case 'pending':
      return 'warning';
    case 'deny':
    case 'failure':
      return 'danger';
    default:
      return 'mist';
  }
}

/** payment_type Midtrans → nama metode yang mudah dibaca. */
const PAYMENT_TYPE_LABEL: Record<string, string> = {
  bank_transfer: 'Transfer bank (VA)',
  echannel: 'Mandiri Bill',
  permata: 'Permata VA',
  gopay: 'GoPay',
  qris: 'QRIS',
  shopeepay: 'ShopeePay',
  credit_card: 'Kartu kredit',
  cstore: 'Gerai retail',
  akulaku: 'Akulaku',
  kredivo: 'Kredivo',
  simulator: 'Simulator (uji coba)',
};
export const paymentTypeLabel = (type: string | null | undefined) => (type ? PAYMENT_TYPE_LABEL[type] ?? type.replace(/_/g, ' ') : '-');

/** Event log order → label. */
const LOG_EVENT_LABEL: Record<string, string> = {
  created: 'Pesanan dibuat',
  payment_created: 'Tagihan pembayaran dibuat',
  payment_update: 'Status pembayaran diperbarui',
  approved: 'Pesanan disetujui',
  rejected: 'Pesanan ditolak',
  domain_set: 'Domain final ditetapkan',
  activated: 'Situs aktif',
  cancelled: 'Pesanan dibatalkan',
  note: 'Catatan',
};
export const logEventLabel = (event: string) => LOG_EVENT_LABEL[event] ?? event.replace(/_/g, ' ');

export const logTone = (event: string): Tone => {
  if (event === 'approved' || event === 'activated' || event === 'domain_set') return 'mint';
  if (event === 'rejected') return 'danger';
  if (event === 'cancelled') return 'mist';
  if (event.startsWith('payment')) return 'warning';
  return 'cobalt';
};

/** Log versi staf: menyertakan payload mentah Midtrans (tanpa data sensitif). */
export type StaffOrderLog = OrderLog & { payload?: unknown };

/** Pola domain sama dengan backend (SPEC §6). */
export const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

/** Rapikan isian domain: huruf kecil, tanpa spasi. */
export const normalizeDomain = (value: string) => value.trim().toLowerCase();

/** Pesan error domain, atau null bila valid. */
export function validateDomain(raw: string): string | null {
  const value = normalizeDomain(raw);
  if (!value) return 'Domain wajib diisi.';
  if (/^[a-z]+:\/\//.test(value) || value.includes('/')) return 'Tulis domain saja, tanpa http://, https://, atau garis miring.';
  if (value.length > 253) return 'Domain maksimal 253 karakter.';
  if (!DOMAIN_PATTERN.test(value)) return 'Format domain tidak valid, mis. namabisnis.com';
  return null;
}

/** Alamat publik situs pembeli. */
export const siteHref = (domain: string) => `https://${domain}`;

/** Pola slug sama dengan backend. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Company Profile Modern!" → "company-profile-modern" */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

/** Angka dari isian rupiah ("1.500.000" → 1500000); kosong → null. */
export const parseRupiahInput = (value: string): number | null => {
  const digits = value.replace(/[^0-9]/g, '');
  return digits === '' ? null : Number(digits);
};

/** Tampilan isian rupiah: 1500000 → "1.500.000"; null → "". */
export const formatRupiahInput = (value: number | null) => (value == null ? '' : value.toLocaleString('id-ID'));
