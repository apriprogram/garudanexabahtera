// Statistik kunjungan situs pembeli (CMS /akun/situs/:id/statistik).
// Kontrak lengkap: docs/platform/SITE-STATS-SPEC.md. Bentuk respons PHP (backend/modules/site_stats.php) dan Node
// (site_stats.js) harus sama persis dengan tipe di file ini.

export const SITE_STATS_RANGES = [7, 30, 90, 365] as const;
export type SiteStatsRange = (typeof SITE_STATS_RANGES)[number];
export const SITE_STATS_RANGE_DEFAULT: SiteStatsRange = 30;

/** Grup sumber kunjungan, urutan tetap untuk tampilan. */
export const SITE_VISIT_SOURCES = [
  { key: 'mesin_pencari', label: 'Mesin pencari' },
  { key: 'media_sosial', label: 'Media sosial' },
  { key: 'ai', label: 'Asisten AI' },
  { key: 'lainnya', label: 'Situs lain' },
  { key: 'langsung', label: 'Langsung' },
] as const;
export type SiteVisitSource = (typeof SITE_VISIT_SOURCES)[number]['key'];

export type SiteVisitDevice = 'desktop' | 'mobile' | 'tablet';
export const SITE_VISIT_DEVICE_LABEL: Record<SiteVisitDevice, string> = {
  desktop: 'Komputer',
  mobile: 'HP',
  tablet: 'Tablet',
};

export interface SiteStatsTotals {
  views: number;
  visits: number;
  visitors: number;
}

export interface SiteStatsDay extends SiteStatsTotals {
  /** YYYY-MM-DD (WIB) */
  day: string;
}

export interface SiteStatsResponse {
  range: SiteStatsRange;
  from: string;
  to: string;
  totals: SiteStatsTotals;
  previous: SiteStatsTotals;
  today: SiteStatsTotals;
  daily: SiteStatsDay[];
  pages: { path: string; title: string | null; views: number }[];
  sources: { key: SiteVisitSource; label: string; visits: number }[];
  referrers: { host: string; visits: number }[];
  devices: { key: SiteVisitDevice; label: string; visits: number; visitors: number }[];
  browsers: { name: string; visits: number }[];
  hours: { hour: number; views: number }[];
  tracking_since: string | null;
}

/** Body aksi publik site_visit (dikirim CustomerSite di domain pembeli). */
export interface SiteVisitInput {
  site_id: number;
  path: string;
  referrer: string;
  utm_source: string;
  first: boolean;
}
