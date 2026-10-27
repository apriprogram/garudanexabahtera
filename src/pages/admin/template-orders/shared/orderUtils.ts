// Helper bersama halaman admin "Pesanan Template" (Order Masuk, Input Domain, Kelola Template, Template Aktif)
// dan Dashboard. Label & nada status mengikuti src/types/platform.ts (SPEC §4).
import type { Tone } from '../../../../components/admin/ui';
import { RENEWAL_YEAR_OPTIONS } from '../../../../lib/domainPricing';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  RENEWAL_STATUS_LABEL,
  formatRupiah,
  type Order,
  type OrderLog,
  type OrderStatus,
  type RenewalStatus,
  type Site,
} from '../../../../types/platform';
import {
  SITE_ADDON_STATUS_LABEL,
  type SiteAddonOrder,
  type SiteAddonSource,
  type SiteAddonState,
  type SiteAddonStatus,
} from '../../../../types/siteAddons';

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
  renewal_created: 'Perpanjangan dibuat',
  renewal_payment_created: 'Tagihan perpanjangan dibuat',
  renewal_payment_update: 'Status pembayaran perpanjangan diperbarui',
  renewal_paid: 'Perpanjangan lunas',
  renewal_cancelled: 'Perpanjangan dibatalkan',
  // Fitur tambahan (docs/platform/SITE-ADDONS-SPEC.md §4); granted/revoked = tindakan staf
  addon_created: 'Tagihan fitur tambahan dibuat',
  addon_payment_created: 'Tagihan pembayaran fitur dibuat',
  addon_payment_update: 'Status pembayaran fitur diperbarui',
  addon_paid: 'Fitur tambahan lunas',
  addon_cancelled: 'Tagihan fitur tambahan dibatalkan',
  addon_granted: 'Fitur tambahan diaktifkan gratis',
  addon_revoked: 'Fitur tambahan dinonaktifkan',
};
export const logEventLabel = (event: string) => LOG_EVENT_LABEL[event] ?? event.replace(/_/g, ' ');

const MINT_EVENTS: ReadonlySet<string> = new Set(['approved', 'activated', 'domain_set', 'renewal_paid', 'addon_paid', 'addon_granted']);
const MIST_EVENTS: ReadonlySet<string> = new Set(['cancelled', 'renewal_cancelled', 'addon_cancelled']);

export const logTone = (event: string): Tone => {
  if (MINT_EVENTS.has(event)) return 'mint';
  if (event === 'rejected') return 'danger';
  if (event === 'addon_revoked') return 'warning';
  if (MIST_EVENTS.has(event)) return 'mist';
  if (event.startsWith('payment') || event.startsWith('renewal_payment') || event.startsWith('addon_payment')) return 'warning';
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

/* ------------------------------------------------------------------ */
/* Rincian harga, domain, masa aktif & perpanjangan                     */
/* (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §3–§5)                 */
/* ------------------------------------------------------------------ */

export interface PriceLine {
  label: string;
  /** Rupiah; potongan bernilai negatif */
  amount: number;
  total?: boolean;
}

/**
 * Baris rincian tagihan pesanan: harga template, diskon, domain tahun pertama, total. `price` = jumlah dibayar (template
 * setelah diskon + domain). Tanpa diskon & domain (pesanan lama) cukup baris total.
 */
export function orderPriceLines(
  order: Pick<Order, 'price' | 'list_price' | 'discount_amount' | 'domain_price' | 'domain_primary'>,
): PriceLine[] {
  const domain = Math.max(0, Number(order.domain_price) || 0);
  const discount = Math.max(0, Number(order.discount_amount) || 0);
  const lines: PriceLine[] = [];
  if (domain > 0 || discount > 0) {
    lines.push({ label: 'Harga template', amount: order.list_price ?? order.price - domain + discount });
    if (discount > 0) lines.push({ label: 'Diskon pembelian pertama', amount: -discount });
    if (domain > 0) lines.push({ label: `Domain ${order.domain_primary} (1 tahun)`, amount: domain });
  }
  lines.push({ label: 'Total tagihan', amount: order.price, total: true });
  return lines;
}

/** Hasil cek ketersediaan domain utama saat dipesan (domain_check); null = pesanan lama / tidak dicek. */
export function domainCheckInfo(check: string | null | undefined): { tone: Tone; label: string } | null {
  switch (check) {
    case null:
    case undefined:
    case '':
      return null;
    case 'available':
      return { tone: 'mint', label: 'Tersedia saat dipesan' };
    case 'unknown':
      return { tone: 'warning', label: 'Belum bisa dipastikan saat dipesan — cek manual sebelum mendaftarkan' };
    case 'taken':
      return { tone: 'danger', label: 'Sudah dipakai saat dipesan — konfirmasi domain lain ke pemesan' };
    default:
      return { tone: 'mist', label: check };
  }
}

/** Sisa ≤ 30 hari: kuning; ≤ 7 hari atau lewat: merah (sama dengan halaman akun pembeli). */
export const EXPIRY_WARNING_DAYS = 30;
export const EXPIRY_URGENT_DAYS = 7;
const DAY_MS = 86_400_000;

/** Tanggal database 'YYYY-MM-DD HH:MM:SS' (waktu lokal, dibaca sama seperti formatTanggal) → Date; kosong/tidak valid → null. */
export function parseOrderDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Tambah tahun seperti DATE_ADD MySQL (29 Feb + 1 tahun = 28 Feb). */
export function addYears(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  const month = d.getMonth();
  d.setFullYear(d.getFullYear() + years);
  if (d.getMonth() !== month) d.setDate(0);
  return d;
}

/** "23 Oktober 2027"; null → "-". */
export const tanggalPanjang = (d: Date | null) => (d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');

/** "23 Okt 2027"; null → "-". */
export const tanggalPendek = (d: Date | null) => (d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

export interface ActivePeriod {
  start: Date | null;
  end: Date | null;
  /** Tanggal berakhir belum tercatat (data sebelum migrasi 026): tanggal aktif + 1 tahun, sama dengan backend. */
  estimated: boolean;
}

/** Masa aktif hosting & jasa atau domain; mulai kosong = tanggal aktif. */
export function activePeriod(
  started: string | null | undefined,
  expires: string | null | undefined,
  activatedAt: string | null | undefined,
): ActivePeriod {
  const activated = parseOrderDate(activatedAt);
  const start = parseOrderDate(started) ?? activated;
  const end = parseOrderDate(expires);
  if (end) return { start, end, estimated: false };
  return { start, end: activated ? addYears(activated, 1) : null, estimated: activated != null };
}

export const servicePeriod = (order: Pick<Order, 'service_started_at' | 'service_expires_at' | 'activated_at'>) =>
  activePeriod(order.service_started_at, order.service_expires_at, order.activated_at);

export const domainPeriod = (order: Pick<Order, 'domain_started_at' | 'domain_expires_at' | 'activated_at'>) =>
  activePeriod(order.domain_started_at, order.domain_expires_at, order.activated_at);

/** Masa aktif hosting & jasa situs (dari pesanan induk) untuk daftar Template Aktif. */
export const siteServicePeriod = (site: Pick<Site, 'service_expires_at' | 'activated_at'>) => activePeriod(null, site.service_expires_at, site.activated_at);

export const siteDomainPeriod = (site: Pick<Site, 'domain_expires_at' | 'activated_at'>) => activePeriod(null, site.domain_expires_at, site.activated_at);

export type ExpiryState = 'ok' | 'soon' | 'urgent' | 'expired';

export interface Expiry {
  state: ExpiryState;
  /** Hari penuh tersisa (dibulatkan ke bawah); saat sudah lewat = sudah berapa hari */
  days: number;
  /** Sisa dalam milidetik; ≤ 0 = sudah lewat */
  ms: number;
}

/** Sisa masa aktif sampai `end`; null bila tanggal berakhir tidak diketahui. */
export function expiryOf(end: Date | null, now: Date = new Date()): Expiry | null {
  if (!end) return null;
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(Math.abs(ms) / DAY_MS);
  const state: ExpiryState = ms <= 0 ? 'expired' : days <= EXPIRY_URGENT_DAYS ? 'urgent' : days <= EXPIRY_WARNING_DAYS ? 'soon' : 'ok';
  return { state, days, ms };
}

export const EXPIRY_TONE: Record<ExpiryState, Tone> = { ok: 'mint', soon: 'warning', urgent: 'danger', expired: 'danger' };

/** Perlu perhatian staf: sisa ≤ 30 hari atau sudah lewat. */
export const isExpiring = (expiry: Expiry | null) => expiry != null && expiry.state !== 'ok';

/** "362 hari lagi", "Berakhir hari ini" (sisa/lewat < 1 hari), "Berakhir 3 hari lalu". */
export function expiryLabel(expiry: Expiry): string {
  if (expiry.days === 0) return 'Berakhir hari ini';
  return expiry.state === 'expired' ? `Berakhir ${expiry.days} hari lalu` : `${expiry.days} hari lagi`;
}

/** "1, 2, atau 3" */
const RENEWAL_YEARS_TEXT = `${RENEWAL_YEAR_OPTIONS.slice(0, -1).join(', ')}, atau ${RENEWAL_YEAR_OPTIONS[RENEWAL_YEAR_OPTIONS.length - 1]}`;

/** Pemberitahuan di detail pesanan saat masa aktif hampir/sudah berakhir; null bila masih lama. */
export function expiryNotice(expiry: Expiry | null, end: Date | null): { tone: Tone; title: string; text: string } | null {
  if (!expiry || !end || expiry.state === 'ok') return null;
  const date = tanggalPanjang(end);
  if (expiry.state === 'expired') {
    return {
      tone: 'danger',
      title: 'Masa aktif sudah berakhir',
      text: `Berakhir ${date}. Ingatkan pembeli untuk memperpanjang dari akunnya, atau nonaktifkan situs sementara di Template Aktif.`,
    };
  }
  return {
    tone: expiry.state === 'urgent' ? 'danger' : 'warning',
    title: expiry.days === 0 ? 'Masa aktif berakhir hari ini' : `Masa aktif tinggal ${expiry.days} hari`,
    text: `Berakhir ${date}. Pembeli bisa memperpanjang ${RENEWAL_YEARS_TEXT} tahun sekaligus dari akunnya.`,
  };
}

/** Pemberitahuan untuk pesanan aktif menurut tanggal berakhir terdekat (hosting & jasa atau domain). */
export function orderExpiryNotice(
  order: Pick<Order, 'status' | 'activated_at' | 'service_started_at' | 'service_expires_at' | 'domain_started_at' | 'domain_expires_at'>,
  now: Date = new Date(),
) {
  if (order.status !== 'aktif') return null;
  const ends = [servicePeriod(order).end, domainPeriod(order).end].filter((d): d is Date => d != null);
  if (ends.length === 0) return null;
  const nearest = new Date(Math.min(...ends.map((d) => d.getTime())));
  return expiryNotice(expiryOf(nearest, now), nearest);
}

/** Pesanan punya masa aktif untuk ditampilkan (sudah aktif, atau tanggalnya sudah tercatat). */
export const hasActivePeriod = (
  order: Pick<Order, 'status' | 'service_started_at' | 'service_expires_at' | 'domain_started_at' | 'domain_expires_at'>,
) => order.status === 'aktif' || [order.service_started_at, order.service_expires_at, order.domain_started_at, order.domain_expires_at].some(Boolean);

/** Urutkan menurut tanggal berakhir hosting & jasa, paling cepat berakhir dulu; tanpa tanggal di akhir. Tidak mengubah `sites`. */
export function sortSitesByExpiry<T extends Pick<Site, 'id' | 'service_expires_at' | 'activated_at'>>(sites: readonly T[]): T[] {
  const end = (s: T) => siteServicePeriod(s).end?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...sites].sort((a, b) => end(a) - end(b) || a.id - b.id);
}

const RENEWAL_TONE: Record<RenewalStatus, Tone> = { menunggu_pembayaran: 'warning', lunas: 'mint', dibatalkan: 'mist' };

const isRenewalStatus = (value: unknown): value is RenewalStatus =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(RENEWAL_STATUS_LABEL, value);

export const renewalTone = (status: string | null | undefined): Tone => (isRenewalStatus(status) ? RENEWAL_TONE[status] : 'mist');

export const renewalLabel = (status: string | null | undefined, fallback?: string | null) =>
  isRenewalStatus(status) ? RENEWAL_STATUS_LABEL[status] : fallback || status || '-';

/* ------------------------------------------------------------------ */
/* Fitur tambahan situs (docs/platform/SITE-ADDONS-SPEC.md §4.2, §7)    */
/* ------------------------------------------------------------------ */

const ADDON_SOURCE_LABEL: Record<SiteAddonSource, string> = {
  beli: 'Dibeli pembeli',
  admin: 'Diaktifkan gratis oleh tim',
  migrasi: 'Migrasi (sudah memakai berita sebelum fitur berbayar)',
};

export const addonSourceLabel = (source: string | null | undefined) =>
  source ? (ADDON_SOURCE_LABEL as Record<string, string | undefined>)[source] ?? source : '-';

/** Harga tagihan fitur; 0 = hadiah tim / migrasi. */
export const addonPriceText = (price: number) => (Number(price) > 0 ? formatRupiah(Number(price)) : 'Gratis');

/** Bagian "Fitur tambahan" hanya untuk fitur yang didukung template situsnya; backend lama tanpa `addons` = kosong. */
export const capableAddons = (addons: readonly SiteAddonState[] | null | undefined): SiteAddonState[] =>
  Array.isArray(addons) ? addons.filter((a) => a.capable) : [];

export type AddonStatus = 'active' | 'pending' | 'revoked' | 'locked';

export interface AddonStatusInfo {
  status: AddonStatus;
  label: string;
  tone: Tone;
  /** Tagihan lunas terbaru yang dicabut tim (status revoked) */
  revoked: SiteAddonOrder | null;
}

/**
 * Keadaan satu fitur untuk staf: Aktif; Menunggu pembayaran (ada tagihan berjalan); Dinonaktifkan (pernah aktif lalu
 * dicabut tim); Terkunci (belum pernah aktif). `orders` = addon_orders pesanan itu, terbaru dulu.
 */
export function addonStatus(state: SiteAddonState, orders: readonly SiteAddonOrder[]): AddonStatusInfo {
  if (state.active) return { status: 'active', label: 'Aktif', tone: 'mint', revoked: null };
  if (state.pending) return { status: 'pending', label: 'Menunggu pembayaran', tone: 'warning', revoked: null };
  const revoked = orders.find((o) => o.addon_code === state.code && o.status === 'lunas' && o.revoked_at) ?? null;
  if (revoked) return { status: 'revoked', label: 'Dinonaktifkan', tone: 'warning', revoked };
  return { status: 'locked', label: 'Terkunci', tone: 'mist', revoked: null };
}

const ADDON_ORDER_TONE: Record<SiteAddonStatus, Tone> = { menunggu_pembayaran: 'warning', lunas: 'mint', dibatalkan: 'mist' };

/** Pill status tagihan fitur: tagihan lunas yang dicabut tim tampil "Dinonaktifkan" (barisnya tetap ada untuk nota). */
export function addonOrderBadge(order: Pick<SiteAddonOrder, 'status' | 'status_label' | 'revoked_at'>): { label: string; tone: Tone } {
  if (order.status === 'lunas' && order.revoked_at) return { label: 'Dinonaktifkan', tone: 'warning' };
  const known = Object.prototype.hasOwnProperty.call(SITE_ADDON_STATUS_LABEL, order.status);
  return {
    label: known ? SITE_ADDON_STATUS_LABEL[order.status] : order.status_label || order.status || '-',
    tone: known ? ADDON_ORDER_TONE[order.status] : 'mist',
  };
}
